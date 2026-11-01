"""Score frozen, unmodified miner answers on v3/v4/v5 in the actual node runtime.

Three bounded local workers, stopped in finally. Token-identical inputs are scored once
per package; this changes no pair orderings. Check identity and input_root on every batch.
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
import os
from pathlib import Path
import socket
import struct
import subprocess
import sys
import time
import urllib.request

from tokenizers import Tokenizer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from check_executor import batch_input_root
from score_pairs import render
from collect_miners import now, save

ENGINE_HASH = "77643d6e1176ab8744801cef93ccb844d0136ed32b8daa865d541f37d13292de"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def wilson(hits, total):
    if not total:
        return None
    z, p = 1.96, hits / total
    return (p + z*z/(2*total) - z*math.sqrt(p*(1-p)/total + z*z/(4*total*total))) / (1+z*z/total)


def score(url, chunks, identity):
    scores = {}
    for chunk in chunks:
        root = batch_input_root([list(k) for k in chunk])
        req = {"batch": [{"tokens": list(k)} for k in chunk], **identity, "input_root": root}
        request = urllib.request.Request(url, json.dumps(req).encode(), {"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=600) as response:
            body = json.load(response)
        for k, v in {**identity, "input_root": root}.items():
            if body.get(k) != v:
                raise ValueError(f"identity/root mismatch: {k}")
        if len(body["results"]) != len(chunk):
            raise ValueError("wrong result count")
        for key, result in zip(chunk, body["results"], strict=True):
            if "error" in result:
                raise ValueError(result["error"])
            bits = result["score"]
            value = struct.unpack("<f", struct.pack("<I", bits))[0]
            if not math.isfinite(value):
                raise ValueError("nonfinite score")
            scores[key] = {"bits": bits, "value": value}
    return scores


def run_version(a, version, pairs, keys, all_keys, token_stats):
    run = a.home / "runs-v2" / f"SANCTIONS_SCREENING_MATCH_v{version}"
    pkg = run / "SANCTIONS_SCREENING_MATCH.safetensors"
    manifest = json.loads(pkg.with_suffix(pkg.suffix + ".manifest.json").read_text())
    assert sha(pkg) == manifest["package"]["sha256"]
    identity = {"foundation_hash": manifest["foundation"]["hash"],
                "adapter_hash": manifest["keccak256"].removeprefix("0x"),
                "tokenizer_hash": manifest["tokenizer_hash"]}
    env = dict(os.environ, FOUNDATION_MODEL_PATH=str(a.home / "foundation/foundation_lora_fp32.onnx"),
               FOUNDATION_MODEL_HASH=identity["foundation_hash"],
               FOUNDATION_ENGINE_WASM_PATH=str(a.home / "foundation/foundation_engine.wasm"),
               FOUNDATION_ENGINE_WASM_HASH=ENGINE_HASH)
    processes, logs, commands = [], [], []
    started, started_at = time.time(), now()
    try:
        for port in (18081, 18082, 18083):
            with socket.socket() as probe:
                probe.bind(("127.0.0.1", port))  # never replace an existing server
            log = open(a.capture / f"v{version}-worker-{port}.txt", "w", encoding="utf-8")
            logs.append(log)
            cmd = [str(a.home / "bin-v2/adapterexec.exe"), "-listen", f"127.0.0.1:{port}", "-package", str(pkg)]
            commands.append(cmd)
            processes.append(subprocess.Popen(cmd, env=env, stdout=log, stderr=log,
                                              creationflags=subprocess.CREATE_NO_WINDOW))
        for port, proc in zip((18081, 18082, 18083), processes):
            deadline = time.monotonic() + 90
            while True:
                if proc.poll() is not None:
                    raise RuntimeError(f"worker exited: {proc.returncode}")
                try:
                    with socket.create_connection(("127.0.0.1", port), timeout=1):
                        break
                except OSError:
                    if time.monotonic() > deadline:
                        raise TimeoutError("worker startup")
                    time.sleep(0.5)
        chunks = [all_keys[i:i+8] for i in range(0, len(all_keys), 8)]
        scores = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            futures = [pool.submit(score, f"http://127.0.0.1:{port}/", chunks[i::3], identity)
                       for i, port in enumerate((18081, 18082, 18083))]
            for future in futures:
                scores.update(future.result())
        rows = [{"name": p["name"], "kind": p["kind"], "block_id": p.get("block_id"),
                 "source_id_metadata_only": p.get("source_id_metadata_only"),
                 "chosen": scores[c], "rejected": scores[r],
                 "correct": scores[c]["value"] > scores[r]["value"]}
                for p, (c, r) in zip(pairs, keys, strict=True)]
        names = sorted({r["name"] for r in rows})
        # Conservative uncertainty unit is a name, all comparisons for that name must win.
        name_wins = sum(all(r["correct"] for r in rows if r["name"] == name) for name in names)
        summary = json.loads((a.capture / "label-summary.json").read_text())
        accuracy = sum(r["correct"] for r in rows) / len(rows)
        lower = wilson(name_wins, len(names))
        gate = accuracy >= .8 and lower >= .8 and len(summary["pairs_by_kind"]) >= 2 \
            and summary["longer_answer_baseline"] <= .65 and summary.get("registration_eligible", True)
        result = {"version": version, "started_at": started_at, "finished_at": now(),
                  "seconds": round(time.time()-started, 2),
                  "runtime_commands": commands, "package_sha256": sha(pkg), "identity": identity,
                  "pairs_sha256": sha(a.capture / "pairs.jsonl"), "pairs": len(rows),
                  "accuracy": accuracy, "ties": sum(r["chosen"]["value"] == r["rejected"]["value"] for r in rows),
                  "names": len(names), "all_comparisons_correct_names": name_wins,
                  "name_level_wilson_95_lower": lower, "registration_gate_pass": gate,
                  "gate_note": "Requires >=80% point and name-level lower bound, both labels, length baseline <=65%",
                  "tokens": token_stats, "rows": rows}
        for field in ("kind", "source_id_metadata_only"):
            groups = {}
            for row in rows:
                if row.get(field) is not None:
                    groups.setdefault(row[field], []).append(row["correct"])
            if groups:
                result["by_" + field] = {k: {"pairs": len(v), "accuracy": sum(v)/len(v)}
                                         for k, v in sorted(groups.items())}
        blocks = {}
        for row in rows:
            if row["block_id"] is not None:
                blocks.setdefault(row["block_id"], []).append(row["correct"])
        if blocks:
            wins = sum(all(v) for v in blocks.values())
            result["reversal_blocks"] = {"blocks": len(blocks), "all_comparisons_correct": wins,
                                          "all_correct_fraction": wins/len(blocks),
                                          "wilson_95_lower": wilson(wins, len(blocks))}
        save(a.capture / f"v{version}-node-scores.json", result)
        save(a.capture / f"v{version}-package-manifest.json", manifest)
        print(json.dumps({k: v for k, v in result.items() if k not in ("rows", "runtime_commands", "identity")}), flush=True)
    finally:
        for proc in processes:
            proc.terminate()
        for proc in processes:
            proc.wait(timeout=20)
        for log in logs:
            log.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    ap.add_argument("--home", type=Path, default=Path("C:/Users/hyada/tg-eval"))
    ap.add_argument("--versions", default="3,4,5")
    a = ap.parse_args()
    foundation = json.loads((a.home / "foundation/foundation.json").read_text())
    assert sha(a.home / "foundation/foundation_lora_fp32.onnx") == foundation["foundation_hash"]
    assert sha(a.home / "foundation/foundation_engine.wasm") == ENGINE_HASH
    assert sha(a.home / "foundation/tokenizer.json") == foundation["tokenizer_hash"]
    pairs = [json.loads(l) for l in (a.capture / "pairs.jsonl").read_text(encoding="utf-8").splitlines()]
    if not pairs:
        raise ValueError("no defensible pairs; cannot measure")
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    full_lengths = [len(tok.encode(render(p["prompt"], p[k])).ids) for p in pairs for k in ("chosen", "rejected")]
    tok.enable_truncation(max_length=256)
    keys = [(tuple(tok.encode(render(p["prompt"], p["chosen"])).ids),
             tuple(tok.encode(render(p["prompt"], p["rejected"])).ids)) for p in pairs]
    unique = list(dict.fromkeys(k for pair in keys for k in pair))
    stats = {"max_tokens": 256, "rendered_max_before_truncation": max(full_lengths),
             "texts_truncated": sum(n > 256 for n in full_lengths), "texts": len(full_lengths),
             "unique_token_sequences": len(unique)}
    for v in a.versions.split(","):
        run_version(a, int(v), pairs, keys, unique, stats)


if __name__ == "__main__":
    main()
