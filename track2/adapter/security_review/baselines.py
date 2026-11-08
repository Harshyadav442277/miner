"""Answer-only baselines on the frozen holdout and the OOT probe (no model, no prompt).

length: prefer the longer answer. bow: the kit's prompt-blind bag-of-words logistic probe,
fitted on train.jsonl, scoring each answer alone (the same shape as a reward model).

    python baselines.py <kit-v2> <train.jsonl> --eval holdout=... --eval oot=... --out baselines.json
"""
import argparse
import json
import sys
from collections import Counter, defaultdict

import numpy as np


def load(p):
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kit")
    ap.add_argument("train")
    ap.add_argument("--eval", action="append", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    sys.path.insert(0, a.kit)
    from float_runtime.train_adapter import _tokens
    tr = load(a.train)
    df = Counter()
    for r in tr:
        for s in ("chosen", "rejected"):
            df.update(set(_tokens(r[s])))
    vocab = {w: i for i, (w, _) in enumerate(df.most_common(4000))}

    def vec(texts):
        m = np.zeros((len(texts), len(vocab)), dtype=np.float32)
        for i, t in enumerate(texts):
            for w in _tokens(t):
                if w in vocab:
                    m[i, vocab[w]] += 1
        return m / np.maximum(np.linalg.norm(m, axis=1, keepdims=True), 1e-8)
    x = vec([r["chosen"] for r in tr] + [r["rejected"] for r in tr])
    y = np.concatenate([np.ones(len(tr)), np.zeros(len(tr))]).astype(np.float32)
    w, b, rng = np.zeros(len(vocab), dtype=np.float32), 0.0, np.random.default_rng(42)
    for _ in range(60):  # the kit's probe settings: lr 0.5, l2 1e-4, batch 64
        order = rng.permutation(len(y))
        for s in range(0, len(order), 64):
            sl = order[s:s + 64]
            p = 1 / (1 + np.exp(-(x[sl] @ w + b)))
            g = (p - y[sl]) / len(sl)
            w -= 0.5 * (x[sl].T @ g + 1e-4 * w)
            b -= 0.5 * g.sum()
    out = {}
    for spec in a.eval:
        name, path = spec.split("=", 1)
        rows = load(path)
        sc, sr = vec([r["chosen"] for r in rows]) @ w + b, vec([r["rejected"] for r in rows]) @ w + b
        res = {"pairs": len(rows), "length": [len(r["chosen"]) > len(r["rejected"]) for r in rows],
               "bow": list(map(bool, sc > sr))}
        summary = {"pairs": len(rows)}
        for k in ("length", "bow"):
            summary[k] = round(sum(res[k]) / len(rows), 4)
            by = defaultdict(list)
            for r, ok in zip(rows, res[k]):
                by[r.get("kind")].append(ok)
            summary[f"{k}_by_kind"] = {kk: f"{sum(v)}/{len(v)}" for kk, v in sorted(by.items())}
        out[name] = summary
    json.dump(out, open(a.out, "w"), indent=1)
    print(json.dumps({k: {m: v[m] for m in ("pairs", "length", "bow")} for k, v in out.items()}))


if __name__ == "__main__":
    main()
