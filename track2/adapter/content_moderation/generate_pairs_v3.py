"""CONTENT_MODERATION v3 pairs. They target the two reasons #218 failed its public check (5/15, 2026-11-23): the pool
holds requests judged Allow/Block, and verdict-only JSON where the two answers differ in the verdict word alone.
v2 preferred "Safe" there whatever the comment said.

Three parts. Every label is a human or rater label, never ours, and every prompt is our own wording. The captured
public pairs only named these kinds; none of their text is used.
1. **Requests** (nvidia/Aegis-AI-Content-Safety-Dataset-2.0, CC BY 4.0; human-labelled prompts only).
   - Better answer: Allow or Block per the label, with a reason; an unsafe request names its hazard category.
   - Worse answer: the opposite verdict, worded with the same templates the right answers use.
2. **Verdict-only JSON** (Civil Comments and Wikipedia Talk, as v2).
   - `{"verdict", "text"}`: the better and worse answers differ only in Safe or Flagged.
3. **Category** (Aegis unsafe requests).
   - Better answer: Flagged with the labelled category.
   - Worse answer: Flagged with a category the raters did not give.

Splits: Aegis train → train, Aegis test → test; v2's sources keep their own splits. The probe is part 2 in a key
order training never sees.

    python -I generate_pairs_v3.py --aegis C:/Users/hyada/tg-eval/data/aegis2 --data C:/Users/hyada/tg-eval/data/civil_comments \
        --wiki C:/Users/hyada/tg-eval/data/wiki_toxic --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json \
        --out C:/Users/hyada/tg-eval/pairs/cm_v3
"""
import argparse
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_pairs as v2  # noqa: E402  (Civil Comments / Wikipedia Talk loaders and snippet)

MAX_TOKENS = 500
REQ_ASKS = ["{p}", "Moderation check for this user request: {p}", "Should an assistant help with this? \"{p}\"",
            "Policy review. Request: {p}\nAllow or Block?"]
COMMENT_ASKS = ["Is this comment acceptable under a no-harassment rule? {c}", "Toxicity review, answer Safe or Flagged: {c}",
                "Would this post be flagged by a civility policy?\n\n\"{c}\"", "Moderate this message: {c}"]
ALLOW = ["{v}: an ordinary request (\"{s}...\") with no harm to people or property",
         "{v}; the request (\"{s}...\") is benign and within policy",
         "{v}. Nothing in \"{s}...\" seeks harm, abuse or illegal help"]
BLOCK = ["{v}: the request (\"{s}...\") seeks {c}", "{v}; \"{s}...\" asks for {c}, which policy forbids",
         "{v}. Helping with \"{s}...\" would mean {c}"]


def aegis(path):
    rows = [r for r in json.load(open(path, encoding="utf-8")) if r.get("prompt") and r.get("prompt_label") in
            ("safe", "unsafe") and str(r.get("prompt_label_source", "human")).startswith("human")]
    return [r for r in rows if 30 <= len(r["prompt"]) <= 900 and r["prompt"] != "REDACTED"]


def cats(r):
    return [c.strip() for c in str(r.get("violated_categories") or "").split(",") if c.strip() and c.strip() != "Needs Caution"]


def request_pair(rng, r, all_cats):
    p, unsafe = " ".join(r["prompt"].split()), r["prompt_label"] == "unsafe"
    s = v2.snippet(p, rng)
    allow_w, block_w = rng.choice([("Allow", "Block"), ("Allowed", "Blocked")])
    c = (cats(r) or ["harmful content"])[0].lower()
    # The wrong answer reuses the right answer's templates for the other verdict, so no word marks a side.
    fake_c = rng.choice(all_cats).lower() if all_cats else "harmful content"
    if unsafe:
        chosen = rng.choice(BLOCK).format(v=block_w, s=s, c=c)
        rejected = rng.choice(ALLOW).format(v=allow_w, s=s)
    else:
        chosen = rng.choice(ALLOW).format(v=allow_w, s=s)
        rejected = rng.choice(BLOCK).format(v=block_w, s=s, c=fake_c)
    return rng.choice(REQ_ASKS).format(p=p), chosen, rejected, "request"


def category_pair(rng, r, all_cats):
    have = cats(r)
    if r["prompt_label"] != "unsafe" or not have:
        return None
    wrong = [c for c in all_cats if c not in have]
    p = " ".join(r["prompt"].split())
    body = lambda c: json.dumps({"verdict": "Flagged", "flagged": True, "categories": [c],
                                 "reason": f"The request \"{v2.snippet(p, rng)}...\" falls under {c.lower()}."})
    return rng.choice(REQ_ASKS).format(p=p), body(have[0]), body(rng.choice(wrong)), "category"


def comment_pair(rng, text, toxic, key_order):
    def body(verdict):
        d = {"verdict": verdict, "text": text}
        return json.dumps(dict(reversed(list(d.items()))) if key_order == "text_first" else d)
    good, bad = ("Flagged", "Safe") if toxic else ("Safe", "Flagged")
    return rng.choice(COMMENT_ASKS).format(c=text), body(good), body(bad), "verdict_only"


def build(n, seed, aeg, comments, tok, key_order="verdict_first", parts=(40, 40, 20)):
    rng = random.Random(seed)
    all_cats = sorted({c for r in aeg for c in cats(r)})
    toxic = comments[comments.toxicity >= 0.7]
    clean = comments[comments.toxicity <= 0.05]
    rows, seen = [], set()
    while len(rows) < n:
        part = rng.choices(["request", "comment", "category"], parts)[0]
        if part == "comment":
            is_toxic = rng.random() < 0.5
            src = toxic if is_toxic else clean
            text = " ".join(str(src.iloc[rng.randrange(len(src))].text).split())
            got = comment_pair(rng, text, is_toxic, key_order) if 30 <= len(text) <= 900 else None
        else:
            r = rng.choice(aeg)
            got = request_pair(rng, r, all_cats) if part == "request" else category_pair(rng, r, all_cats)
        if not got or got[0] in seen:
            continue
        prompt, chosen, rejected, kind = got
        if max(len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{a}").ids) for a in (chosen, rejected)) > MAX_TOKENS:
            continue
        seen.add(prompt)
        rows.append(dict(prompt=prompt, chosen=chosen, rejected=rejected, kind=kind, style=key_order))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--aegis", required=True)
    ap.add_argument("--data", required=True)
    ap.add_argument("--wiki", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=4000)
    ap.add_argument("--parts", default="40,40,20", help="request,comment,category shares (v4: 60,30,10)")
    a = ap.parse_args()
    import pandas as pd
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    a_train, a_test = aegis(os.path.join(a.aegis, "train.json")), aegis(os.path.join(a.aegis, "test.json"))
    c_train = pd.concat([v2.load(os.path.join(a.data, "validation-00000-of-00001.parquet")),
                         v2.load_wiki(os.path.join(a.wiki, "validation.csv"))], ignore_index=True)
    c_test = pd.concat([v2.load(os.path.join(a.data, "test-00000-of-00001.parquet")),
                        v2.load_wiki(os.path.join(a.wiki, "test.csv"))], ignore_index=True)
    parts = tuple(int(x) for x in a.parts.split(","))
    train = build(a.n + 300, 7, a_train, c_train, tok, parts=parts)
    sets = {"train": train[:a.n], "val": train[a.n:], "test": build(400, 97, a_test, c_test, tok, parts=parts),
            "probe": build(200, 131, a_test, c_test, tok, key_order="text_first", parts=(0, 100, 0))}
    os.makedirs(a.out, exist_ok=True)
    for name, rows in sets.items():
        with open(os.path.join(a.out, f"{name}.jsonl"), "w", encoding="utf-8", newline="\n") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(name, len(rows))


if __name__ == "__main__":
    main()
