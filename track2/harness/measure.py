"""Score pair files with adapter packages in the node runtime (the kit's adapterexec), as a validator does.

Family-agnostic version of ../adapter/security_review/measure_node.py. Each answer is rendered
"### Task:\\n{prompt}\\n\\n### Answer:\\n{answer}", tokenised with the pinned tokenizer, truncated to the
package's own max_tokens, and scored alone by adapterexec workers that this script starts on free
loopback ports and always stops. Identity echo and input_root are checked on every batch; the f32
bits of every score are kept. A pair is correct when score(chosen) > score(rejected); ties are wrong.
The answer-only baselines longer-answer-wins and shorter-answer-wins are computed on the same pairs.

Run with the tg-eval venv (it has `tokenizers`):
    C:/Users/hyada/tg-eval/.venv/Scripts/python.exe measure.py --home C:/Users/hyada/tg-eval \\
        --package ours=path.safetensors --package champion=path.safetensors \\
        --pairs holdout=holdout.jsonl --out results.json [--workers 4] [--limit 150]
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
import os
import socket
import struct
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "adapter"))
sys.path.insert(0, str(HERE.parent / "adapter" / "security_review"))
from check_executor import batch_input_root  # noqa: E402
from compare import wilson  # noqa: E402
from fetch_champion import read_header_file  # noqa: E402
from keccak import keccak256  # noqa: E402

ENGINE_HASH = "77643d6e1176ab8744801cef93ccb844d0136ed32b8daa865d541f37d13292de"
CHUNK = 6


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def f32(bits):
    return struct.unpack("<f", struct.pack("<I", bits))[0]


def pair_key(p):
    return hashlib.sha256(json.dumps([p["prompt"], p["chosen"], p["rejected"]]).encode()).hexdigest()[:16]


def field(p, name, default=None):
    """kind/format may sit at the top level or under meta."""
    v = p.get(name)
    if v is None and isinstance(p.get("meta"), dict):
        v = p["meta"].get(name)
    return default if v is None else str(v)


def breakdown(rows, key):
    out = {}
    for r in rows:
        out.setdefault(r[key], []).append(r["correct"])
    return {str(k): f"{sum(v)}/{len(v)}" for k, v in sorted(out.items(), key=lambda kv: str(kv[0]))}


def summarise(correct, ties=0):
    n, k = len(correct), sum(correct)
    return {"n": n, "correct": k, "accuracy": round(k / n, 4) if n else 0.0, "ties": ties,
            "wilson95": wilson(k, n)}


def length_baselines(pairs):
    longer = [len(p["chosen"]) > len(p["rejected"]) for p in pairs]
    shorter = [len(p["chosen"]) < len(p["rejected"]) for p in pairs]
    ties = sum(len(p["chosen"]) == len(p["rejected"]) for p in pairs)
    return {"longer": {**summarise(longer, ties), "correct": longer, "correct_count": sum(longer)},
            "shorter": {**summarise(shorter, ties), "correct": shorter, "correct_count": sum(shorter)}}


def score_chunk(url, chunk, ident):
    root = batch_input_root([list(k) for k in chunk])
    req = {"batch": [{"tokens": list(k)} for k in chunk], **ident, "input_root": root}
    r = urllib.request.Request(url, json.dumps(req).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=1800) as resp:
        body = json.load(resp)
    for k in ("foundation_hash", "adapter_hash", "tokenizer_hash"):
        if str(body.get(k, "")).lower() != ident[k]:
            raise ValueError(f"identity echo mismatch: {k} {body.get(k)}")
    if not body.get("input_root") or body["input_root"].lower() != root:
        raise ValueError(f"input_root mismatch: sent {root}, got {body.get('input_root')}")
    out = {}
    for key, res in zip(chunk, body["results"], strict=True):
        if "error" in res:
            raise ValueError(res["error"])
        if not isinstance(res.get("score"), int) or not math.isfinite(f32(res["score"])):
            raise ValueError(f"bad score {res.get('score')!r}")
        out[key] = res["score"]
    return out


def free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def stop(procs):
    for p in procs:
        if p.poll() is None:
            p.terminate()
    for p in procs:
        try:
            p.wait(timeout=30)
        except subprocess.TimeoutExpired:
            p.kill()
            p.wait(timeout=30)


def start_workers(a, name, pkg, env, log_dir):
    procs, logs, ports = [], [], []
    try:
        for _ in range(a.workers):
            port = free_port()
            log = open(log_dir / f"{a.out.stem}-{name}-worker-{port}.log", "w")
            logs.append(log)
            ports.append(port)
            procs.append(subprocess.Popen([str(a.home / "bin-v2/adapterexec.exe"), "-listen", f"127.0.0.1:{port}",
                                           "-package", str(pkg)], env=env, stdout=log, stderr=log,
                                          creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)))
        for port, p in zip(ports, procs):
            deadline = time.monotonic() + 180
            while True:
                if p.poll() is not None:
                    raise RuntimeError(f"worker {port} exited {p.returncode}; see its log in {log_dir}")
                try:
                    socket.create_connection(("127.0.0.1", port), timeout=1).close()
                    break
                except OSError:
                    if time.monotonic() > deadline:
                        raise TimeoutError(f"worker {port} did not listen within 180 s")
                    time.sleep(0.5)
    except BaseException:
        stop(procs)
        for log in logs:
            log.close()
        raise
    return procs, logs, ports


def run_package(a, name, pkg, pair_sets, foundation):
    from tokenizers import Tokenizer
    meta = read_header_file(pkg).get("__metadata__", {})
    max_tokens = int(meta["max_tokens"])
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    tok.enable_truncation(max_length=max_tokens)
    keys = {s: [tuple(tuple(tok.encode(f"### Task:\n{p['prompt']}\n\n### Answer:\n{p[side]}").ids)
                      for side in ("chosen", "rejected")) for p in pairs] for s, pairs in pair_sets.items()}
    unique = list(dict.fromkeys(k for ks in keys.values() for pair in ks for k in pair))
    env = dict(os.environ, FOUNDATION_MODEL_PATH=str(a.home / "foundation/foundation_lora_fp32.onnx"),
               FOUNDATION_MODEL_HASH=foundation["foundation_hash"],
               FOUNDATION_ENGINE_WASM_PATH=str(a.home / "foundation/foundation_engine.wasm"),
               FOUNDATION_ENGINE_WASM_HASH=ENGINE_HASH)
    # the adapter hash a validator sends is the registered keccak256 of the file
    ident = {"foundation_hash": foundation["foundation_hash"], "adapter_hash": keccak256(Path(pkg).read_bytes()),
             "tokenizer_hash": foundation["tokenizer_hash"]}
    started = time.time()
    procs, logs, ports = start_workers(a, name, pkg, env, a.out.parent)
    try:
        chunks = [unique[i:i + CHUNK] for i in range(0, len(unique), CHUNK)]
        bits = {}
        with concurrent.futures.ThreadPoolExecutor(len(ports)) as pool:
            futs = [pool.submit(lambda cs, u: [score_chunk(u, c, ident) for c in cs], chunks[i::len(ports)],
                                f"http://127.0.0.1:{port}/") for i, port in enumerate(ports)]
            for fut in futs:
                for d in fut.result():
                    bits.update(d)
    finally:
        stop(procs)
        for log in logs:
            log.close()
    result = {"package": str(pkg), "package_sha256": sha(pkg), "adapter_keccak": ident["adapter_hash"],
              "metadata": meta, "unique_texts": len(unique), "seconds": round(time.time() - started, 1),
              "sets": {}}
    for s, pairs in pair_sets.items():
        rows = []
        for i, (p, (c, r)) in enumerate(zip(pairs, keys[s])):
            sc, sr = f32(bits[c]), f32(bits[r])
            rows.append({"index": i, "pair_key": pair_key(p), "id": p.get("id"), "kind": field(p, "kind"),
                         "format": field(p, "format"), "chosen_bits": bits[c], "rejected_bits": bits[r],
                         "correct": sc > sr, "tie": sc == sr,
                         "truncated": len(c) >= max_tokens or len(r) >= max_tokens})
        summary = summarise([x["correct"] for x in rows], sum(x["tie"] for x in rows))
        result["sets"][s] = {**summary, "truncated_pairs": sum(x["truncated"] for x in rows),
                             "by_kind": breakdown(rows, "kind"), "by_format": breakdown(rows, "format"),
                             "rows": rows}
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, default=Path("C:/Users/hyada/tg-eval"))
    ap.add_argument("--package", action="append", required=True, help="name=path.safetensors")
    ap.add_argument("--pairs", action="append", required=True, help="set=path.jsonl")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--limit", type=int, help="score only the first N pairs of each set")
    a = ap.parse_args()
    foundation = json.loads((a.home / "foundation/foundation.json").read_text())
    for f, h in (("foundation_lora_fp32.onnx", foundation["foundation_hash"]), ("foundation_engine.wasm", ENGINE_HASH),
                 ("tokenizer.json", foundation["tokenizer_hash"])):
        if sha(a.home / "foundation" / f) != h:
            sys.exit(f"foundation file {f} does not match its pinned sha256")
    pair_sets, sources, baselines = {}, {}, {}
    for spec in a.pairs:
        n, p = spec.split("=", 1)
        rows = [json.loads(line) for line in Path(p).read_text(encoding="utf-8").splitlines() if line.strip()]
        pair_sets[n] = rows[:a.limit] if a.limit else rows
        sources[n] = {"path": str(Path(p).resolve()), "sha256": sha(p), "file_rows": len(rows),
                      "pairs": len(pair_sets[n]), "limit": a.limit, "pair_keys": [pair_key(x) for x in pair_sets[n]]}
        baselines[n] = length_baselines(pair_sets[n])
    out = {"pairs": sources, "baselines": baselines, "foundation_hash": foundation["foundation_hash"],
           "engine_hash": ENGINE_HASH, "packages": {}}
    for spec in a.package:
        n, p = spec.split("=", 1)
        out["packages"][n] = run_package(a, n, Path(p), pair_sets, foundation)
        a.out.write_text(json.dumps(out, indent=1), encoding="utf-8")
        for s, v in out["packages"][n]["sets"].items():
            print(f"{n} [{s}] {v['correct']}/{v['n']} = {v['accuracy']} wilson95={v['wilson95']} ties={v['ties']} "
                  f"by_kind={v['by_kind']} ({out['packages'][n]['seconds']} s)", flush=True)
    for s, b in baselines.items():
        print(f"length baselines [{s}] longer={b['longer']['accuracy']} shorter={b['shorter']['accuracy']} "
              f"equal-length={b['longer']['ties']}")


if __name__ == "__main__":
    main()
