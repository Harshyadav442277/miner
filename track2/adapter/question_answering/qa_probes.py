"""Answer-only shortcut probes for QUESTION_ANSWERING pairs. Each probe scores one answer
alone, as the reward model does, and a pair counts as solved when score(chosen) >
score(rejected); a tie counts half (a coin flip), as the kit's length check does.

  length   prefer the longer (or shorter) answer, by characters
  bow      the kit's bag-of-words logistic probe (its _tokens, L2-normalised counts, lr 0.5,
           l2 1e-4, 60 epochs, batch 64), fitted on train, never seeing the prompt
  format   the same logistic regression on format fields only: format name, JSON inner body,
           length bucket, JSON key set and each key, confidence bucket, citation count
"""
import math
from collections import Counter, defaultdict

import numpy as np

FORMAT_GROUPS = ["format", "inner", "length", "keyset", "keys", "confidence", "citations"]


def pair_acc(sc, sr):
    sc, sr = np.asarray(sc, dtype=np.float64), np.asarray(sr, dtype=np.float64)
    if len(sc) == 0:
        return float("nan")
    return float(((sc > sr).sum() + 0.5 * (sc == sr).sum()) / len(sc))


def length_baselines(rows):
    lc = [len(r["chosen"]) for r in rows]
    lr = [len(r["rejected"]) for r in rows]
    longer = pair_acc(lc, lr)
    return {"longer": round(longer, 4), "shorter": round(1 - longer, 4), "n": len(rows)}


def length_by(rows, key):
    groups = defaultdict(list)
    for r in rows:
        groups[r[key]].append(r)
    return {k: length_baselines(v) for k, v in sorted(groups.items())}


def _fit(x, y, seed=42, epochs=60, lr=0.5, l2=1e-4, bs=64):
    rng = np.random.default_rng(seed)
    w, b = np.zeros(x.shape[1], dtype=np.float32), np.float32(0.0)
    for _ in range(epochs):
        order = rng.permutation(len(y))
        for s in range(0, len(order), bs):
            sl = order[s:s + bs]
            p = 1.0 / (1.0 + np.exp(-(x[sl] @ w + b)))
            g = (p - y[sl]) / len(sl)
            w -= lr * (x[sl].T @ g + l2 * w)
            b -= lr * g.sum()
    return w, b


class BowProbe:
    def __init__(self, train_rows, tokens, max_feats=4000):
        self.tokens = tokens
        df = Counter()
        for r in train_rows:
            for s in ("chosen", "rejected"):
                df.update(set(tokens(r[s])))
        self.vocab = {w: i for i, (w, _) in enumerate(df.most_common(max_feats))}
        x = self.vec([r["chosen"] for r in train_rows] + [r["rejected"] for r in train_rows])
        y = np.concatenate([np.ones(len(train_rows)), np.zeros(len(train_rows))]).astype(np.float32)
        self.w, self.b = _fit(x, y)

    def vec(self, texts):
        m = np.zeros((len(texts), len(self.vocab)), dtype=np.float32)
        for i, t in enumerate(texts):
            for w in self.tokens(t):
                j = self.vocab.get(w)
                if j is not None:
                    m[i, j] += 1.0
        return m / np.maximum(np.linalg.norm(m, axis=1, keepdims=True), 1e-8)

    def acc(self, rows):
        sc = self.vec([r["chosen"] for r in rows]) @ self.w + self.b
        sr = self.vec([r["rejected"] for r in rows]) @ self.w + self.b
        return pair_acc(sc, sr)

    def top_features(self, n=12):
        inv = {i: w for w, i in self.vocab.items()}
        order = np.argsort(self.w)
        return {"chosen": [inv[i] for i in order[::-1][:n]], "rejected": [inv[i] for i in order[:n]]}


def side_features(meta, text, groups):
    f = []
    if "format" in groups:
        f.append("format=" + meta["format"])
    if "inner" in groups:
        f.append("inner=" + str(meta.get("inner")))
    if "length" in groups:
        f.append(f"len={int(math.log2(max(1, len(text))))}")
    if "keyset" in groups:
        f.append("keyset=" + "|".join(meta.get("keys", [])))
    if "keys" in groups:
        f += ["key=" + k for k in meta.get("keys", [])]
    if "confidence" in groups:
        c = meta.get("confidence")
        f.append("conf=" + ("none" if c is None else str(int(c * 10))))
    if "citations" in groups:
        f.append(f"ncit={meta.get('n_cit', 0)}")
    return f


class FormatProbe:
    def __init__(self, train_rows, train_meta, groups):
        self.groups = groups
        feats = [side_features(m["chosen"], r["chosen"], groups) for r, m in zip(train_rows, train_meta)] + \
                [side_features(m["rejected"], r["rejected"], groups) for r, m in zip(train_rows, train_meta)]
        self.vocab = {f: i for i, f in enumerate(sorted({f for fs in feats for f in fs}))}
        x = self.mat(feats)
        y = np.concatenate([np.ones(len(train_rows)), np.zeros(len(train_rows))]).astype(np.float32)
        self.w, self.b = _fit(x, y)

    def mat(self, feats):
        m = np.zeros((len(feats), len(self.vocab)), dtype=np.float32)
        for i, fs in enumerate(feats):
            for f in fs:
                j = self.vocab.get(f)
                if j is not None:
                    m[i, j] = 1.0
        return m

    def acc(self, rows, metas):
        fc = [side_features(m["chosen"], r["chosen"], self.groups) for r, m in zip(rows, metas)]
        fr = [side_features(m["rejected"], r["rejected"], self.groups) for r, m in zip(rows, metas)]
        return pair_acc(self.mat(fc) @ self.w + self.b, self.mat(fr) @ self.w + self.b)

    def top_features(self, n=6):
        inv = {i: f for f, i in self.vocab.items()}
        order = np.argsort(self.w)
        return {"chosen": [inv[i] for i in order[::-1][:n]], "rejected": [inv[i] for i in order[:n]]}
