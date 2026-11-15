"""Score preference pairs through a runnable-URL executor, as the node does.

Each answer is rendered with the node's RenderForJudgment template, tokenised with the
pinned ModernBERT tokenizer (truncated to --max-tokens, closing [SEP] kept), and sent to
the executor in one batch per --batch pairs. The executor returns the f32 bits of each
score; a pair is correct when chosen's float is strictly greater than rejected's, the
exact numeric order the node ranks by. Ties count as wrong.

    python score_pairs.py --url http://127.0.0.1:8080/ --tokenizer foundation/tokenizer.json \
        --pairs test.jsonl --limit 100 --max-tokens 256 --out scores.json

Prints pairwise accuracy (overall, and per `kind` and `format` when the rows carry them),
the "pick the longer answer" baseline on the same pairs, and
writes every pair's two float scores to --out so the run can be re-checked.
"""
import argparse
import json
import random
import struct
import sys
import time
import urllib.request

from tokenizers import Tokenizer


def render(prompt, answer):
    return f"### Task:\n{prompt}\n\n### Answer:\n{answer}"


def f32(bits):
    return struct.unpack("<f", struct.pack("<I", bits))[0]


def post(url, batch, timeout):
    body = json.dumps({"batch": [{"tokens": ids} for ids in batch]}).encode()
    req = urllib.request.Request(url, body, {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        reply = json.loads(r.read())
    out = []
    for item in reply["results"]:
        if "error" in item:
            raise RuntimeError(item["error"])
        out.append(f32(item["score"]))
    return out, {k: reply.get(k) for k in ("foundation_hash", "adapter_hash", "tokenizer_hash")}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--pairs", required=True)
    ap.add_argument("--limit", type=int, default=0, help="score a seeded sample of this many pairs")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--max-tokens", type=int, default=512)
    ap.add_argument("--batch", type=int, default=10, help="pairs per request")
    ap.add_argument("--timeout", type=int, default=1800)
    ap.add_argument("--out")
    a = ap.parse_args()

    tok = Tokenizer.from_file(a.tokenizer)
    tok.enable_truncation(max_length=a.max_tokens)
    pairs = [json.loads(line) for line in open(a.pairs, encoding="utf-8") if line.strip()]
    if a.limit and a.limit < len(pairs):
        pairs = random.Random(a.seed).sample(pairs, a.limit)

    rows, identity, start = [], None, time.time()
    for i in range(0, len(pairs), a.batch):
        chunk = pairs[i:i + a.batch]
        batch = []
        for p in chunk:
            batch.append(tok.encode(render(p["prompt"], p["chosen"])).ids)
            batch.append(tok.encode(render(p["prompt"], p["rejected"])).ids)
        scores, identity = post(a.url, batch, a.timeout)
        for j, p in enumerate(chunk):
            rows.append({"chosen": scores[2 * j], "rejected": scores[2 * j + 1], "kind": p.get("kind"),
                         "format": p.get("format"), "longer_is_chosen": len(p["chosen"]) > len(p["rejected"])})
        done = len(rows)
        correct = sum(r["chosen"] > r["rejected"] for r in rows)
        print(f"{done}/{len(pairs)} pairs  accuracy {correct / done:.4f}  {time.time() - start:.0f}s",
              file=sys.stderr, flush=True)

    n = len(rows)
    result = {
        "pairs": n,
        "accuracy": sum(r["chosen"] > r["rejected"] for r in rows) / n,
        "ties": sum(r["chosen"] == r["rejected"] for r in rows),
        "length_baseline": sum(r["longer_is_chosen"] for r in rows) / n,
        "max_tokens": a.max_tokens,
        "source": a.pairs,
        "seed": a.seed,
        "identity": identity,
    }
    for field in ("kind", "format"):
        groups = {}
        for r in rows:
            if r[field] is not None:
                groups.setdefault(r[field], []).append(r["chosen"] > r["rejected"])
        if groups:
            result[f"by_{field}"] = {k: {"pairs": len(v), "accuracy": round(sum(v) / len(v), 4)}
                                     for k, v in sorted(groups.items())}
    print(json.dumps(result))
    if a.out:
        json.dump({**result, "rows": rows}, open(a.out, "w"), indent=1)


if __name__ == "__main__":
    main()
