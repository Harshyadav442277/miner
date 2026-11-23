"""Preference pairs for SENTIMENT_ANALYSIS (generator v1). The text to judge is in the prompt; the label is the
reviewer's own star rating (fancyzhx/amazon_polarity, Apache-2.0 on its card: 1–2 stars Negative, 4–5 Positive).

The pool is described as review sentences from the UCI Amazon/IMDb/Yelp set (bounties #152). This generator
deliberately uses a different source, so no pool sentence can be in training.

The better answer gives the right polarity with a reason that quotes part of the review. The worse answer, in the same
style and of about the same length, gives the opposite polarity, or calls a clearly polar review neutral. LiveCert
serves this intent. That is disclosed, and nothing here names or formats a LiveCert answer (ARCHITECTURE A7).

    python -I generate_pairs.py --data C:/Users/hyada/tg-eval/data/amazon_polarity/test.parquet \
        --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/sa_v1

The split is by row hash (a fixed fifth is test-only). The probe uses an answer style training never sees. The file
is read in batches, to keep memory low.
"""
import argparse
import hashlib
import json
import os
import random

MAX_TOKENS = 500
ASKS = ["What sentiment does this review express?\n\n\"{t}\"", "Classify the sentiment of this sentence as Positive or Negative: {t}",
        "Is the following customer review positive or negative?\n{t}", "Sentiment analysis. Text: {t}\nLabel and explain."]
POS = ["the reviewer is satisfied: \"{s}...\"", "praise dominates, e.g. \"{s}...\"", "the tone is approving (\"{s}...\")"]
NEG = ["the reviewer is dissatisfied: \"{s}...\"", "complaints dominate, e.g. \"{s}...\"", "the tone is critical (\"{s}...\")"]
NEU = ["the text is matter-of-fact (\"{s}...\") with no clear opinion", "it describes rather than judges: \"{s}...\""]


def load(path, limit):
    import pyarrow.parquet as pq
    rows = []
    for batch in pq.ParquetFile(path).iter_batches(batch_size=5000, columns=["title", "content", "label"]):
        for t, c, l in zip(batch.column("title").to_pylist(), batch.column("content").to_pylist(),
                           batch.column("label").to_pylist()):
            text = " ".join(f"{t}. {c}".split()) if t else " ".join(c.split())
            if 60 <= len(text) <= 700:
                rows.append((text, int(l)))
        if len(rows) >= limit:
            break
    return rows


def snippet(text, rng):
    w = text.split()
    k = min(len(w), rng.randint(5, 9))
    i = rng.randrange(len(w) - k + 1)
    return " ".join(w[i:i + k]).replace('"', "'")


def answer(label, style, s, rng):
    reason = rng.choice({"Positive": POS, "Negative": NEG, "Neutral": NEU}[label]).format(s=s)
    if style == "json":
        return json.dumps({"sentiment": label, "reason": reason})
    if style == "word":
        return f"{label}. {reason[0].upper()}{reason[1:]}."
    if style == "line":  # probe only
        return f"label={label.lower()} ; why: {reason}"
    return f"The sentiment is {label.lower()}: {reason}."


def build(rows, n, seed, split, styles, tok):
    rng = random.Random(seed)
    pool = [r for r in rows if (int(hashlib.sha256(r[0].encode()).hexdigest(), 16) % 5 == 0) == (split == "test")]
    out, seen = [], set()
    while len(out) < n:
        text, label = rng.choice(pool)
        if text in seen:
            continue
        right = "Positive" if label == 1 else "Negative"
        wrong = rng.choices(["Negative" if label == 1 else "Positive", "Neutral"], [85, 15])[0]
        style, s = rng.choice(styles), snippet(text, rng)
        chosen, rejected = answer(right, style, s, rng), answer(wrong, style, s, rng)
        prompt = rng.choice(ASKS).format(t=text)
        if max(len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{a}").ids) for a in (chosen, rejected)) > MAX_TOKENS:
            continue
        seen.add(text)
        out.append(dict(prompt=prompt, chosen=chosen, rejected=rejected, kind="flip" if wrong != "Neutral" else "neutral",
                        style=style, label=right))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=4000)
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    rows = load(a.data, 40000)
    styles = ["json", "word", "sentence"]
    train = build(rows, a.n + 300, 7, "train", styles, tok)
    sets = {"train": train[:a.n], "val": train[a.n:], "test": build(rows, 400, 97, "test", styles, tok),
            "probe": build(rows, 200, 131, "test", ["line"], tok)}
    os.makedirs(a.out, exist_ok=True)
    for name, rs in sets.items():
        with open(os.path.join(a.out, f"{name}.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
            for r in rs:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(name, len(rs))


if __name__ == "__main__":
    main()
