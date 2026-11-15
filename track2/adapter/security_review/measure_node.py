"""Score pair files with packages in the node runtime (the kit's adapterexec), as a validator does.

Each answer is rendered with RenderForJudgment, tokenised with the pinned tokenizer, truncated
to the package's own max_tokens (closing [SEP] kept), and scored by local adapterexec workers
that load the released foundation and engine. Identity echo and input_root are checked on every
batch; f32 bits are kept per pair. A pair is correct when chosen > rejected (ties are wrong).

    python measure_node.py --home C:/Users/hyada/tg-eval --package name=path.safetensors ... \
        --pairs holdout=path.jsonl --pairs oot=path.jsonl --out results.json [--workers 4]
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

from tokenizers import Tokenizer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_executor import batch_input_root  # noqa: E402
from keccak import keccak256  # noqa: E402

ENGINE_HASH = "77643d6e1176ab8744801cef93ccb844d0136ed32b8daa865d541f37d13292de"


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def metadata(p):
    b = Path(p).read_bytes()
    n = struct.unpack("<Q", b[:8])[0]
    return json.loads(b[8:8 + n])["__metadata__"]


def wilson(k, n, z=1.96):
    p = k / n
    c = (p + z * z / (2 * n)) / (1 + z * z / n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return [round(c - h, 4), round(c + h, 4)]


def score_chunk(url, chunk, ident):
    root = batch_input_root([list(k) for k in chunk])
    req = {"batch": [{"tokens": list(k)} for k in chunk], **ident, "input_root": root}
    r = urllib.request.Request(url, json.dumps(req).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=1800) as resp:
        body = json.load(resp)
    for k in ("foundation_hash", "adapter_hash", "tokenizer_hash"):
        if str(body.get(k, "")).lower() != ident[k]:
            raise ValueError(f"identity echo mismatch: {k} {body.get(k)}")
    if body.get("input_root") and body["input_root"].lower() != root:
        raise ValueError("input_root mismatch")
    out = {}
    for key, res in zip(chunk, body["results"], strict=True):
        if "error" in res:
            raise ValueError(res["error"])
        v = struct.unpack("<f", struct.pack("<I", res["score"]))[0]
        if not math.isfinite(v):
            raise ValueError("non-finite score")
        out[key] = res["score"]
    return out


def run_package(a, name, pkg, pair_sets, tok_path, foundation):
    meta = metadata(pkg)
    max_tokens = int(meta["max_tokens"])
    tok = Tokenizer.from_file(tok_path)
    tok.enable_truncation(max_length=max_tokens)
    keys, texts = {}, 0
    for set_name, pairs in pair_sets.items():
        keys[set_name] = [tuple(tuple(tok.encode(f"### Task:\n{p['prompt']}\n\n### Answer:\n{p[s]}").ids)
                                for s in ("chosen", "rejected")) for p in pairs]
        texts += 2 * len(pairs)
    unique = list(dict.fromkeys(k for ks in keys.values() for pair in ks for k in pair))
    env = dict(os.environ, FOUNDATION_MODEL_PATH=str(a.home / "foundation/foundation_lora_fp32.onnx"),
               FOUNDATION_MODEL_HASH=foundation["foundation_hash"],
               FOUNDATION_ENGINE_WASM_PATH=str(a.home / "foundation/foundation_engine.wasm"),
               FOUNDATION_ENGINE_WASM_HASH=ENGINE_HASH)
    ports = [a.base_port + i for i in range(a.workers)]
    procs, logs = [], []
    started = time.time()
    try:
        for port in ports:
            with socket.socket() as s:
                s.bind(("127.0.0.1", port))  # refuse to share a port with another server
            log = open(a.out.with_name(f"{a.out.stem}-{name}-worker-{port}.log"), "w")
            logs.append(log)
            procs.append(subprocess.Popen([str(a.home / "bin-v2/adapterexec.exe"), "-listen", f"127.0.0.1:{port}",
                                           "-package", str(pkg)], env=env, stdout=log, stderr=log,
                                          creationflags=subprocess.CREATE_NO_WINDOW))
        for port, p in zip(ports, procs):
            deadline = time.monotonic() + 120
            while True:
                if p.poll() is not None:
                    raise RuntimeError(f"worker {port} exited {p.returncode}")
                try:
                    socket.create_connection(("127.0.0.1", port), timeout=1).close()
                    break
                except OSError:
                    if time.monotonic() > deadline:
                        raise TimeoutError("worker start")
                    time.sleep(0.5)
        # the adapter hash a validator sends is the registered keccak256 of the file
        ident = {"foundation_hash": foundation["foundation_hash"], "adapter_hash": keccak256(Path(pkg).read_bytes()),
                 "tokenizer_hash": foundation["tokenizer_hash"]}
        chunks = [unique[i:i + 6] for i in range(0, len(unique), 6)]
        bits = {}
        with concurrent.futures.ThreadPoolExecutor(len(ports)) as pool:
            futs = [pool.submit(lambda cs, u: [score_chunk(u, c, ident) for c in cs], chunks[i::len(ports)],
                                f"http://127.0.0.1:{port}/") for i, port in enumerate(ports)]
            for f in futs:
                for d in f.result():
                    bits.update(d)
    finally:
        for p in procs:
            p.terminate()
        for p in procs:
            p.wait(timeout=30)
        for log in logs:
            log.close()
    f32 = lambda b: struct.unpack("<f", struct.pack("<I", b))[0]
    result = {"package": str(pkg), "package_sha256": sha(pkg), "adapter_hash_echo": ident["adapter_hash"],
              "metadata": {k: meta[k] for k in ("intent", "class", "rank", "max_tokens") if k in meta},
              "texts": texts, "unique_texts": len(unique), "seconds": round(time.time() - started, 1), "sets": {}}
    for set_name, pairs in pair_sets.items():
        rows = []
        for p, (c, r) in zip(pairs, keys[set_name]):
            rows.append({"id": p.get("id"), "kind": p.get("kind"), "category": p.get("category"), "format": p.get("format", "unseen-oot"),
                         "chosen_bits": bits[c], "rejected_bits": bits[r], "correct": f32(bits[c]) > f32(bits[r]),
                         "truncated": len(c) >= max_tokens or len(r) >= max_tokens})
        k = sum(x["correct"] for x in rows)
        by_kind = {}
        for x in rows:
            by_kind.setdefault(x["kind"], []).append(x["correct"])
        result["sets"][set_name] = {"pairs": len(rows), "correct": k, "accuracy": round(k / len(rows), 4),
                                    "wilson95": wilson(k, len(rows)), "truncated_pairs": sum(x["truncated"] for x in rows),
                                    "by_kind": {kk: f"{sum(v)}/{len(v)}" for kk, v in sorted(by_kind.items())},
                                    "by_format": {f: f"{sum(x['correct'] for x in rows if x['format'] == f)}/{sum(x['format'] == f for x in rows)}" for f in sorted({x['format'] for x in rows})},
                                    "rows": rows}
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, default=Path("C:/Users/hyada/tg-eval"))
    ap.add_argument("--package", action="append", required=True, help="name=path")
    ap.add_argument("--pairs", action="append", required=True, help="name=path")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--base-port", type=int, default=18181)
    a = ap.parse_args()
    foundation = json.loads((a.home / "foundation/foundation.json").read_text())
    assert sha(a.home / "foundation/foundation_lora_fp32.onnx") == foundation["foundation_hash"]
    assert sha(a.home / "foundation/foundation_engine.wasm") == ENGINE_HASH
    assert sha(a.home / "foundation/tokenizer.json") == foundation["tokenizer_hash"]
    pair_sets, sources = {}, {}
    for spec in a.pairs:
        n, p = spec.split("=", 1)
        pair_sets[n] = [json.loads(l) for l in Path(p).read_text(encoding="utf-8").splitlines() if l.strip()]
        sources[n] = {"path": p, "sha256": sha(p), "pairs": len(pair_sets[n]),
                      "longer_is_chosen": round(sum(len(x["chosen"]) > len(x["rejected"]) for x in pair_sets[n])
                                                / len(pair_sets[n]), 4)}
    out = {"pairs": sources, "foundation_hash": foundation["foundation_hash"], "engine_hash": ENGINE_HASH,
           "packages": {}}
    for spec in a.package:
        n, p = spec.split("=", 1)
        out["packages"][n] = run_package(a, n, Path(p), pair_sets, str(a.home / "foundation/tokenizer.json"), foundation)
        a.out.write_text(json.dumps(out, indent=1), encoding="utf-8")
        print(n, {s: (v["accuracy"], v["by_kind"]) for s, v in out["packages"][n]["sets"].items()}, flush=True)
    for n, s in sources.items():
        print("length baseline", n, s["longer_is_chosen"])


if __name__ == "__main__":
    main()
