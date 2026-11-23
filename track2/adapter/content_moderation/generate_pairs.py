"""Preference pairs for CONTENT_MODERATION (generator v1). The content to judge is in the prompt; the label is the
consensus of Civil Comments' crowd raters (google/civil_comments, CC0 1.0), never ours.

A comment is used only when raters agreed strongly: toxic at toxicity >= 0.7, clean at <= 0.05. Borderline
comments are dropped. A toxic comment's category is its highest-rated sub-type at >= 0.5 (insult, identity
attack, threat, obscene, sexually explicit), else general toxicity.

The better answer gives the right decision and category. The worse answer, in the same style and of about the same
length, gives the opposite decision; or the right decision with a category the raters scored under 0.1; or a refusal.

    python -I generate_pairs.py --data C:/Users/hyada/tg-eval/data/civil_comments \
        --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/cm_v1

train/val come from the Civil Comments validation split and test/probe from its test split. The probe uses an
answer style training never sees.
"""
import argparse
import json
import os
import random

MAX_TOKENS = 500
CATS = {"insult": "an insult aimed at a person", "identity_attack": "an attack on a group's identity",
        "threat": "a threat of harm", "obscene": "obscene language", "sexual_explicit": "sexually explicit content"}
GENERAL = ("toxicity", "abusive, toxic language")
ASKS = ["Does this comment violate community guidelines: \"{c}\"?",
        "Moderate this user comment and say whether it should be removed.\n\nComment: {c}",
        "Classify this content for the moderation queue (allow or remove) and give the policy category:\n{c}",
        "Should this post be flagged? \"{c}\""]


def load(path):
    import pyarrow.parquet as pq
    return pq.read_table(path).to_pandas()


def category(row):
    best = max(CATS, key=lambda k: row[k])
    return (best, CATS[best]) if row[best] >= 0.5 else GENERAL


REMOVE = ["read in full (\"{s}...\"), it contains {c}", "the comment (\"{s}...\") crosses the line with {c}",
          "taken as a whole, \"{s}...\" amounts to {c}", "beyond the opinion in \"{s}...\", it contains {c}"]
ALLOW = ["read in full (\"{s}...\"), it states a view without abuse, threats or slurs",
         "the comment (\"{s}...\") is within bounds: no insult, threat or explicit content",
         "taken as a whole, \"{s}...\" is ordinary discussion, not abuse",
         "the tone of \"{s}...\" is critical at most, with no attack on a person or group"]


def snippet(text, rng):
    words = text.split()
    k = min(len(words), rng.randint(5, 9))
    i = rng.randrange(len(words) - k + 1)
    return " ".join(words[i:i + k]).replace('"', "'")


def answer(remove, cat, style, rng, s):
    """The reason quotes part of the comment, so an answer is tied to its comment; the snippet is chosen at random
    and does not reveal the label."""
    if remove:
        reason = rng.choice(REMOVE).format(s=s, c=cat[1])
        word, verdict = "remove", "Violates guidelines"
    else:
        reason = rng.choice(ALLOW).format(s=s)
        word, verdict = "allow", "Does not violate guidelines"
    label = cat[0] if remove else "none"
    if style == "json":
        return json.dumps({"verdict": word, "flagged": remove, "category": label, "reason": reason})
    if style == "line":
        return f"{word.upper()} ({label}): {reason}."
    if style == "table":  # probe only
        return f"| decision | category | why |\n|---|---|---|\n| {word} | {label} | {reason} |"
    return f"{verdict}. The comment should be {'removed' if remove else 'allowed'} because {reason}."


def pairs(df, n, seed, styles, tok):
    rng = random.Random(seed)
    toxic = df[df.toxicity >= 0.7]
    clean = df[df.toxicity <= 0.05]
    rows, seen = [], set()
    while len(rows) < n:
        is_toxic = rng.random() < 0.5
        row = (toxic if is_toxic else clean).iloc[rng.randrange(len(toxic if is_toxic else clean))]
        text = " ".join(str(row.text).split())
        if text in seen or len(text) < 30:
            continue
        cat = category(row) if is_toxic else ("none", "")
        style = rng.choice(styles)
        s = snippet(text, rng)
        chosen = answer(is_toxic, cat, style, rng, s)
        kind = rng.choices(["flip", "wrong_category", "refusal"], [70, 22 if is_toxic else 0, 8])[0]
        if kind == "flip":
            wrong = category(toxic.iloc[rng.randrange(len(toxic))]) if not is_toxic else ("none", "")
            rejected = answer(not is_toxic, wrong, style, rng, s)
        elif kind == "wrong_category":
            low = [k for k in CATS if row[k] < 0.1 and k != cat[0]]
            if not low:
                continue
            k = rng.choice(low)
            rejected = answer(True, (k, CATS[k]), style, rng, s)
        else:
            rejected = rng.choice([f'I cannot make a moderation decision about "{s}...".',
                                   f'Whether "{s}..." breaks the rules depends on the platform, so I cannot say.',
                                   f'Moderating "{s}..." is subjective; please review it manually.'])
        prompt = rng.choice(ASKS).format(c=text)
        if max(len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{a}").ids) for a in (chosen, rejected)) > MAX_TOKENS:
            continue
        seen.add(text)
        rows.append(dict(prompt=prompt, chosen=chosen, rejected=rejected, kind=kind, style=style,
                         toxic=bool(is_toxic), category=cat[0]))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=3000)
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    train_df = load(os.path.join(a.data, "validation-00000-of-00001.parquet"))
    test_df = load(os.path.join(a.data, "test-00000-of-00001.parquet"))
    styles = ["json", "line", "prose"]
    train = pairs(train_df, a.n + 300, 7, styles, tok)
    sets = {"train": train[:a.n], "val": train[a.n:], "test": pairs(test_df, 400, 97, styles, tok),
            "probe": pairs(test_df, 200, 131, ["table"], tok)}
    os.makedirs(a.out, exist_ok=True)
    for name, rows in sets.items():
        with open(os.path.join(a.out, f"{name}.jsonl"), "w", encoding="utf-8", newline="\n") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(name, len(rows))


if __name__ == "__main__":
    main()
