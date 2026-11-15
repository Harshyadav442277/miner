"""Score frozen pair sets on adapter packages in the actual node runtime (adapterexec).

For each package: start three local adapterexec workers on the pinned foundation and engine,
check the keccak256 the runtime itself reports on load against --expect, render each pair with
the node's RenderForJudgment, tokenise with the pinned tokenizer truncated to the package's own
max_tokens, and score every unique token sequence once. Every reply's identity echo and
input_root are checked and the exact f32 bits are kept. The kit's DefaultVerifyInput is scored
too, so the bits can be compared with adapterbuild's score_hex. Workers are stopped in finally.
Run it only while holding GPU.lock (shared node-runtime rule).

    python measure_v2.py --pairs h1=holdout.jsonl --pairs probe=probe.jsonl \
        --package generic=<path>=<keccak> --package v2=<path>=<keccak> --out <dir>
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
import os
import re
import socket
import struct
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from tokenizers import Tokenizer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from node_root import batch_input_root  # noqa: E402

HOME = Path("C:/Users/hyada/tg-eval")
ENGINE_HASH = "77643d6e1176ab8744801cef93ccb844d0136ed32b8daa865d541f37d13292de"
VERIFY_INPUT = [50281, 4118, 17526, 27, 187, 18658, 436, 13814, 1818, 50282]  # adapterbuild DefaultVerifyInput
PORTS = (18181, 18182, 18183)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def render(prompt, answer):
    return f"### Task:\n{prompt}\n\n### Answer:\n{answer}"


def header(path):
    raw = Path(path).read_bytes()
    return json.loads(raw[8:8 + struct.unpack("<Q", raw[:8])[0]])["__metadata__"]


def score_chunks(url, chunks, identity):
    out = {}
    for chunk in chunks:
        root = batch_input_root([list(k) for k in chunk])
        body = {"batch": [{"tokens": list(k)} for k in chunk], **identity, "input_root": root}
        req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=1200) as r:
            reply = json.load(r)
        for k, v in {**identity, "input_root": root}.items():
            if str(reply.get(k, "")).lower() != v.lower():
                raise ValueError(f"identity/root mismatch on {k}")
        if len(reply["results"]) != len(chunk):
            raise ValueError("wrong result count")
        for key, res in zip(chunk, reply["results"]):
            if "error" in res:
                raise ValueError(res["error"])
            value = struct.unpack("<f", struct.pack("<I", res["score"]))[0]
            if not math.isfinite(value):
                raise ValueError("non-finite score")
            out[key] = {"bits": res["score"], "value": value}
    return out


def run_package(name, path, expect, sets, tok_path, out):
    meta = header(path)
    max_tokens = int(meta["max_tokens"])
    identity = {"foundation_hash": meta["foundation_hash"], "adapter_hash": expect.removeprefix("0x").lower(),
                "tokenizer_hash": meta["tokenizer_hash"]}
    tok = Tokenizer.from_file(str(tok_path))
    tok.enable_truncation(max_length=max_tokens)
    keyed = {s: [(tuple(tok.encode(render(p["prompt"], p["chosen"])).ids),
                  tuple(tok.encode(render(p["prompt"], p["rejected"])).ids)) for p in pairs] for s, pairs in sets.items()}
    unique = list(dict.fromkeys([tuple(VERIFY_INPUT)] + [k for ks in keyed.values() for pair in ks for k in pair]))
    env = dict(os.environ, FOUNDATION_MODEL_PATH=str(HOME / "foundation/foundation_lora_fp32.onnx"),
               FOUNDATION_MODEL_HASH=meta["foundation_hash"], FOUNDATION_ENGINE_WASM_PATH=str(HOME / "foundation/foundation_engine.wasm"),
               FOUNDATION_ENGINE_WASM_HASH=ENGINE_HASH)
    procs, logs, started = [], [], time.time()
    try:
        for port in PORTS:
            with socket.socket() as probe:
                probe.bind(("127.0.0.1", port))  # refuse to replace a server someone else runs
            log_path = out / f"{name}-worker-{port}.log"
            logs.append(log_path)
            procs.append(subprocess.Popen([str(HOME / "bin-v2/adapterexec.exe"), "-listen", f"127.0.0.1:{port}",
                                           "-package", str(path)], env=env, stdout=open(log_path, "w"),
                                          stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW))
        for proc, log_path in zip(procs, logs):
            deadline = time.monotonic() + 120
            while "listening" not in log_path.read_text(encoding="utf-8", errors="replace"):
                if proc.poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError(log_path.read_text(encoding="utf-8", errors="replace"))
                time.sleep(0.5)
            loaded = re.search(r"keccak256 0x([0-9a-f]{64})", log_path.read_text(encoding="utf-8", errors="replace"))
            if not loaded or loaded.group(1) != identity["adapter_hash"]:
                raise RuntimeError(f"runtime loaded keccak {loaded and loaded.group(1)}, expected {identity['adapter_hash']}")
        chunks = [unique[i:i + 6] for i in range(0, len(unique), 6)]
        scores = {}
        with concurrent.futures.ThreadPoolExecutor(len(PORTS)) as pool:
            futures = [pool.submit(score_chunks, f"http://127.0.0.1:{port}/", chunks[i::len(PORTS)], identity)
                       for i, port in enumerate(PORTS)]
            for f in futures:
                scores.update(f.result())
    finally:
        for proc in procs:
            proc.terminate()
        for proc in procs:
            proc.wait(timeout=30)
    result = {"package": name, "path": str(path), "sha256": sha(path), "keccak256": identity["adapter_hash"],
              "runtime_reported_keccak": True, "max_tokens": max_tokens, "identity": identity,
              "verify_input_bits": "0x%08x" % scores[tuple(VERIFY_INPUT)]["bits"], "unique_texts": len(unique) - 1,
              "seconds": round(time.time() - started, 1), "sets": {}}
    for s, pairs in sets.items():
        rows = []
        for p, (c, r) in zip(pairs, keyed[s]):
            rows.append({"kind": p.get("kind"), "format": p.get("format"), "chosen": scores[c], "rejected": scores[r],
                         "win": scores[c]["value"] > scores[r]["value"], "tie": scores[c]["bits"] == scores[r]["bits"],
                         "chosen_at_limit": len(c) == max_tokens, "rejected_at_limit": len(r) == max_tokens})
        result["sets"][s] = {"pairs": len(rows), "wins": sum(r["win"] for r in rows), "rows": rows}
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", action="append", required=True, help="name=path.jsonl")
    ap.add_argument("--package", action="append", required=True, help="name=path=keccak256")
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    foundation = json.loads((HOME / "foundation/foundation.json").read_text())
    assert sha(HOME / "foundation/foundation_lora_fp32.onnx") == foundation["foundation_hash"]
    assert sha(HOME / "foundation/foundation_engine.wasm") == ENGINE_HASH
    assert sha(HOME / "foundation/tokenizer.json") == foundation["tokenizer_hash"]
    sets = {}
    for spec in a.pairs:
        name, path = spec.split("=", 1)
        sets[name] = [json.loads(l) for l in Path(path).read_text(encoding="utf-8").splitlines() if l.strip()]
    record = {"started_at": datetime.now(timezone.utc).isoformat(), "argv": sys.argv,
              "pairs_sha256": {s.split("=", 1)[0]: sha(s.split("=", 1)[1]) for s in a.pairs},
              "foundation_hash": foundation["foundation_hash"], "engine_hash": ENGINE_HASH, "packages": {}}
    for spec in a.package:
        name, path, expect = spec.split("=", 2)
        res = run_package(name, Path(path), expect, sets, HOME / "foundation/tokenizer.json", a.out)
        (a.out / f"{name}-scores.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
        record["packages"][name] = {k: v for k, v in res.items() if k != "sets"}
        record["packages"][name]["wins"] = {s: f"{v['wins']}/{v['pairs']}" for s, v in res["sets"].items()}
        print(name, record["packages"][name]["wins"], res["seconds"], "s", flush=True)
    record["finished_at"] = datetime.now(timezone.utc).isoformat()
    (a.out / "measure-record.json").write_text(json.dumps(record, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
