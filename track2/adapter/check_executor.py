"""Send a runnable-URL executor the batch request a validator sends, and check the reply.

A port of telegraph-examples evaluator-adapter/check-executor.ts (2026-11-01): the same batch
shape, identity fields and input_root, the same checks on the reply (status, no redirect, one
f32-bit score per item, deterministic bits, identity echo). The adapter keccak256 is passed in
(adapterbuild prints it) instead of recomputed.

    python check_executor.py --url https://host/run --keccak 0x... \
        --foundation foundation/foundation.json [--compare http://127.0.0.1:8081/]

--compare sends the same batch to a second executor and requires identical bits, e.g. the public
URL against the loopback one.
"""
import argparse
import hashlib
import http.client
import json
import struct
import sys
import time
import urllib.parse

TOKENIZER_HASH = "67bc76f8b9386efba1a761c1c8e5ad439fd0eaf1c2826e9dd1a205c7af4dc456"
# [CLS] "### Task:\n..." style token lists; item 2 repeats item 0 to test determinism.
BATCH = [
    [50281, 4118, 17526, 27, 187, 18658, 436, 13814, 1818, 50282],
    [50281, 4118, 17526, 27, 187, 7942, 3187, 253, 9850, 32, 50282],
    [50281, 4118, 17526, 27, 187, 18658, 436, 13814, 1818, 50282],
]


def sha256_hex(s):
    return hashlib.sha256(s.encode()).hexdigest()


def encode_input(ids):
    """runtime.EncodeFloatInput."""
    return '{"input_ids":[%s],"attention_mask":[%s]}' % (",".join(map(str, ids)), ",".join("1" for _ in ids))


def batch_input_root(batch):
    leaves = sorted(f"{i}:{sha256_hex(encode_input(ids))}" for i, ids in enumerate(batch))
    return sha256_hex("\n".join(leaves))


def post(url, body):
    u = urllib.parse.urlsplit(url)
    conn = (http.client.HTTPSConnection if u.scheme == "https" else http.client.HTTPConnection)(u.netloc, timeout=600)
    path = (u.path or "/") + (f"?{u.query}" if u.query else "")
    start = time.time()
    conn.request("POST", path, json.dumps(body), {"Content-Type": "application/json"})
    r = conn.getresponse()  # http.client never follows redirects, like a validator
    return r.status, r.read().decode("utf-8", "replace"), time.time() - start


def check(url, ident):
    status, text, secs = post(url, {"batch": [{"tokens": t} for t in BATCH], **ident})
    print(f"{url}: status {status} in {secs:.1f}s")
    problems, bits = [], []
    if 300 <= status < 400:
        problems.append("a redirect: validators do not follow it")
    elif status != 200:
        problems.append(f"status {status}")
    if len(text) > 64 * 1024:
        problems.append(f"reply is {len(text)} bytes; a validator reads at most 64 KiB")
    body = {}
    try:
        body = json.loads(text)
    except ValueError:
        problems.append("reply is not JSON")
    results = body.get("results")
    if not isinstance(results, list) or len(results) != len(BATCH):
        problems.append(f"expected {len(BATCH)} results, got {results!r:.200}")
    else:
        for i, r in enumerate(results):
            s = r.get("score")
            if "error" in r or not isinstance(s, int) or not 0 <= s <= 0xFFFFFFFF:
                problems.append(f"item {i}: {r}")
                continue
            f = struct.unpack("<f", struct.pack("<I", s))[0]
            print(f"  item {i}: 0x{s:08x} ({f})")
            bits.append(s)
        if len(bits) == 3 and bits[0] != bits[2]:
            problems.append("the same tokens gave different bits")
    for k in ("foundation_hash", "adapter_hash", "tokenizer_hash"):
        if str(body.get(k, "")).lower() != ident[k]:
            problems.append(f"echoed {k} {body.get(k)!r}, sent {ident[k]!r}: identity echo mismatch")
    if body.get("input_root") and body["input_root"].lower() != ident["input_root"]:
        problems.append("input_root echo mismatch")
    return problems, bits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--keccak", required=True, help="the package keccak256 adapterbuild printed")
    ap.add_argument("--foundation", required=True, help="foundation.json")
    ap.add_argument("--compare", help="a second executor that must return the same bits")
    a = ap.parse_args()
    ident = {
        "foundation_hash": json.load(open(a.foundation))["foundation_hash"].lower(),
        "adapter_hash": a.keccak.lower().removeprefix("0x"),
        "tokenizer_hash": TOKENIZER_HASH,
        "input_root": batch_input_root(BATCH),
    }
    problems, bits = check(a.url, ident)
    if a.compare:
        p2, bits2 = check(a.compare, ident)
        problems += p2
        if bits != bits2:
            problems.append(f"bits differ between {a.url} and {a.compare}")
    for p in problems:
        print("FAIL:", p)
    print("PASS" if not problems else "FAIL")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
