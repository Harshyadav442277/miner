"""Summarise measure_v2 output against two offline baselines, per set, kind and format.

Baselines: "pick the longer answer" (ties count half) and a bag-of-words logistic regression
trained on the training pairs with the prompt hidden (the kit's surface probe, fitted once on
train and applied to each set). Prints a Markdown table and writes report.json.

    python report_v2.py --measure <dir> --pairs h1=holdout.jsonl --train train.jsonl
"""
import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path

import numpy as np

TOKEN = re.compile(r"[a-z0-9_]+")
HOLDOUT_ONLY = {"nested", "sentence_json"}


def wilson_lower(k, n, z=1.96):
    if not n:
        return None
    p = k / n
    return (p + z * z / (2 * n) - z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / (1 + z * z / n)


def bow_model(train):
    df = Counter()
    for r in train:
        for side in ("chosen", "rejected"):
            df.update(set(TOKEN.findall(r[side].lower())))
    vocab = {w: i for i, (w, _) in enumerate(df.most_common(4000))}

    def vec(texts):
        m = np.zeros((len(texts), len(vocab)), dtype=np.float32)
        for i, t in enumerate(texts):
            for w in TOKEN.findall(t.lower()):
                if w in vocab:
                    m[i, vocab[w]] += 1
        return m / np.maximum(np.linalg.norm(m, axis=1, keepdims=True), 1e-8)

    x = vec([r["chosen"] for r in train] + [r["rejected"] for r in train])
    y = np.concatenate([np.ones(len(train)), np.zeros(len(train))]).astype(np.float32)
    rng, w, b = np.random.default_rng(42), np.zeros(len(vocab), dtype=np.float32), np.float32(0)
    for _ in range(60):
        order = rng.permutation(len(y))
        for s in range(0, len(order), 64):
            sl = order[s:s + 64]
            g = (1 / (1 + np.exp(-(x[sl] @ w + b))) - y[sl]) / len(sl)
            w -= 0.5 * (x[sl].T @ g + 1e-4 * w)
            b -= 0.5 * g.sum()
    return lambda pairs: [float(a) > float(c) for a, c in zip(vec([p["chosen"] for p in pairs]) @ w,
                                                              vec([p["rejected"] for p in pairs]) @ w)]


def frac(hits, n):
    return f"{sum(hits)}/{n} ({100 * sum(hits) / n:.1f}%)" if n else "-"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--measure", type=Path, required=True)
    ap.add_argument("--pairs", action="append", required=True)
    ap.add_argument("--train", type=Path, required=True)
    a = ap.parse_args()
    train = [json.loads(l) for l in a.train.read_text(encoding="utf-8").splitlines()]
    bow = bow_model(train)
    packages = {p.stem.removesuffix("-scores"): json.loads(p.read_text(encoding="utf-8"))
                for p in sorted(a.measure.glob("*-scores.json"))}
    report = {}
    for spec in a.pairs:
        name, path = spec.split("=", 1)
        pairs = [json.loads(l) for l in Path(path).read_text(encoding="utf-8").splitlines() if l.strip()]
        groups = {"all": list(range(len(pairs)))}
        for i, p in enumerate(pairs):
            groups.setdefault("kind:" + str(p.get("kind")), []).append(i)
            fmt = str(p.get("format") or "")
            if fmt:
                unseen = any(f in HOLDOUT_ONLY for f in fmt.split("|"))
                groups.setdefault("formats:" + ("unseen" if unseen else "seen"), []).append(i)
        length = [len(p["chosen"]) > len(p["rejected"]) or (len(p["chosen"]) == len(p["rejected"]) and i % 2 == 0)
                  for i, p in enumerate(pairs)]
        bag = bow(pairs)
        cols = {"length": length, "bag-of-words": bag}
        for pkg, res in packages.items():
            if name in res["sets"]:
                cols[pkg] = [r["win"] for r in res["sets"][name]["rows"]]
        report[name] = {g: {c: {"wins": sum(v[i] for i in idx), "n": len(idx),
                                "wilson95_lower": wilson_lower(sum(v[i] for i in idx), len(idx))}
                            for c, v in cols.items()} for g, idx in groups.items()}
        print(f"\n### {name}\n\n| group | n | " + " | ".join(cols) + " |\n|---|---:|" + "---:|" * len(cols))
        for g, idx in groups.items():
            print(f"| {g} | {len(idx)} | " + " | ".join(frac([v[i] for i in idx], len(idx)) for v in cols.values()) + " |")
    (a.measure / "report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
