"""Passage-grounded preference pairs for QUESTION_ANSWERING (v3). The passage is in the prompt, so the label comes from
it. This replaces the v1/v2 world-knowledge holdouts (G42, G47): the pool is described as passage-grounded
(bounties #109: questions "plus the passage it must be answered from"; a SQuAD 2.0 development subset).

The source is SQuAD 2.0's **train** split (rajpurkar/squad_v2, CC BY-SA 4.0). The pool's SQuAD rows are from the
development split, so no question is shared.

**Answerable question.** The better answer is the crowdworkers' span. The worse answer, in the same style, is one of:
- another question's answer from the same passage (plausible, present in the text, wrong for this question);
- a number in the span changed;
- a claim that the passage does not say.

**Unanswerable question.** The better answer says the passage does not answer it. The worse answer gives a span from
the passage as if it did.

The split is by article title: a fixed fifth of the titles is test-only. The probe uses an answer style training never
sees.

    python -I generate_passage_pairs.py --squad C:/Users/hyada/tg-eval/data/squad_v2/train.parquet \
        --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/qa_v3
"""
import argparse
import hashlib
import json
import os
import random
import re

MAX_TOKENS = 500
ASKS = ["Answer the question using only this passage.\n\nPassage: {c}\n\nQuestion: {q}",
        "Context: {c}\nQ: {q}",
        "Based on the text below, {ql}\n\n{c}",
        "Read the passage and answer. If the passage does not contain the answer, say so.\n\n{c}\n\nQuestion: {q}"]


def sentence_of(ctx, span):
    i = ctx.find(span)
    if i < 0:
        return span
    a = ctx.rfind(". ", 0, i)
    b = ctx.find(". ", i + len(span))
    return ctx[a + 2 if a >= 0 else 0: b + 1 if b >= 0 else len(ctx)].strip()


def say(style, q, title, ctx, span, rng):
    if span is None:
        text = rng.choice([f"The passage does not say {q[0].lower()}{q[1:].rstrip('?')}.",
                           f"The passage about {title} does not answer this question.",
                           f"This cannot be answered from the passage: it never states {q[0].lower()}{q[1:].rstrip('?')}."])
        if style == "json":
            return json.dumps({"answer": None, "answerable": False, "note": text})
        return text
    if style == "json":
        return json.dumps({"answer": span, "answerable": True, "evidence": sentence_of(ctx, span)})
    if style == "bare":
        return span
    if style == "line":  # probe only
        return f"Answer: {span} | Source: passage"
    return f"According to the passage, {span}."


def bump_number(span, rng):
    m = list(re.finditer(r"\d[\d,]*", span))
    if not m:
        return None
    x = rng.choice(m)
    v = int(x.group().replace(",", ""))
    w = v + rng.choice([1, 2, 3, 10, -1]) * max(1, v // 10 if v > 100 else 1)
    return span[:x.start()] + str(max(0, w)) + span[x.end():] if w != v else None


def build(rows, n, seed, split, styles, tok):
    rng = random.Random(seed)
    test_title = lambda t: int(hashlib.sha256(t.encode()).hexdigest(), 16) % 5 == 0
    pool = [r for r in rows if test_title(r["title"]) == (split == "test")]
    by_ctx = {}
    for r in pool:
        if r["answers"]:
            by_ctx.setdefault(r["context"], set()).add(r["answers"][0])
    out, seen = [], set()
    while len(out) < n:
        r = rng.choice(pool)
        ctx, q, title = r["context"], r["question"].strip(), r["title"].replace("_", " ")
        if r["id"] in seen or len(ctx) > 1600 or len(q) < 8:
            continue
        style = rng.choice(styles)
        others = sorted(s for s in by_ctx.get(ctx, ()) if not r["answers"] or s != r["answers"][0])
        if r["answers"]:
            gold = r["answers"][0]
            kinds = (["other_span"] * 3 if others else []) + ["claim_unanswerable"] * 2 + \
                (["number"] if re.search(r"\d", gold) else [])
            kind = rng.choice(kinds)
            if kind == "other_span":
                bad = rng.choice([s for s in others if s.lower() not in gold.lower() and gold.lower() not in s.lower()] or [None])
            elif kind == "number":
                bad = bump_number(gold, rng)
            else:
                bad = "UNANSWERABLE"
            if bad is None:
                continue
            chosen = say(style, q, title, ctx, gold, rng)
            rejected = say(style, q, title, ctx, None if bad == "UNANSWERABLE" else bad, rng)
        else:
            if not others:
                continue
            kind = "answer_unanswerable"
            chosen = say(style, q, title, ctx, None, rng)
            rejected = say(style, q, title, ctx, rng.choice(others), rng)
        if chosen == rejected:
            continue
        prompt = rng.choice(ASKS).format(c=ctx, q=q, ql=q[0].lower() + q[1:])
        if max(len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{a}").ids) for a in (chosen, rejected)) > MAX_TOKENS:
            continue
        seen.add(r["id"])
        out.append(dict(prompt=prompt, chosen=chosen, rejected=rejected, kind=kind, style=style))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--squad", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=4000)
    a = ap.parse_args()
    import pyarrow.parquet as pq
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    df = pq.read_table(a.squad).to_pandas()
    rows = [dict(id=i, title=t, context=c, question=q, answers=list(ans["text"]))
            for i, t, c, q, ans in zip(df.id, df.title, df.context, df.question, df.answers)]
    styles = ["json", "bare", "sentence"]
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
