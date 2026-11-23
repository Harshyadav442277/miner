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
# v2: the pool's described form (bounties #166): an exact comment, a stated policy, a Safe or Flagged verdict.
POLICY = ["no personal attacks, insults, harassment, slurs or threats",
          "comments must not attack, insult, threaten or demean a person or group",
          "be civil: no name-calling, hate, threats or obscene abuse"]
ASKS_POLICY = ["Discussion policy: {p}.\nIs this comment Safe or Flagged?\n\nComment: \"{c}\"",
               "Under the policy \"{p}\", classify the comment below as Safe or Flagged.\n\n{c}",
               "Moderation check. Policy: {p}. Comment: {c}\nAnswer Safe or Flagged with a reason."]


def load(path):
    import pyarrow.parquet as pq
    return pq.read_table(path).to_pandas()


def load_wiki(path):
    """Wikipedia Talk comments (OxAISH-AL-LLM/wiki_toxic, CC0 1.0): a binary label and no sub-types, so a toxic
    comment's category is general toxicity and no wrong-category pair is built from it."""
    import pandas as pd
    d = pd.read_csv(path, engine="python")
    out = pd.DataFrame({"text": d.comment_text, "toxicity": d.label.astype(float)})
    for k in CATS:
        out[k] = float("nan")
    return out


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


def answer(remove, cat, style, rng, s, safe_vocab=False):
    """The reason quotes part of the comment, so an answer is tied to its comment; the snippet is chosen at random
    and does not reveal the label."""
    if remove:
        reason = rng.choice(REMOVE).format(s=s, c=cat[1])
        word, verdict = ("Flagged", "Flagged") if safe_vocab else ("remove", "Violates guidelines")
    else:
        reason = rng.choice(ALLOW).format(s=s)
        word, verdict = ("Safe", "Safe") if safe_vocab else ("allow", "Does not violate guidelines")
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
        wiki = row[next(iter(CATS))] != row[next(iter(CATS))]  # NaN sub-types: a Wikipedia Talk row
        cat = (GENERAL if wiki else category(row)) if is_toxic else ("none", "")
        style = rng.choice(styles)
        s = snippet(text, rng)
        safe_vocab = rng.random() < 0.5
        chosen = answer(is_toxic, cat, style, rng, s, safe_vocab)
        kind = rng.choices(["flip", "wrong_category", "refusal"], [70, 22 if is_toxic and not wiki else 0, 8])[0]
        if kind == "flip":
            wrong = GENERAL if not is_toxic else ("none", "")
            if not is_toxic and rng.random() < 0.5:
                pick = toxic.iloc[rng.randrange(len(toxic))]
                wrong = GENERAL if pick[next(iter(CATS))] != pick[next(iter(CATS))] else category(pick)
            rejected = answer(not is_toxic, wrong, style, rng, s, safe_vocab)
        elif kind == "wrong_category":
            low = [k for k in CATS if row[k] < 0.1 and k != cat[0]]
            if not low:
                continue
            k = rng.choice(low)
            rejected = answer(True, (k, CATS[k]), style, rng, s, safe_vocab)
        else:
            rejected = rng.choice([f'I cannot make a moderation decision about "{s}...".',
                                   f'Whether "{s}..." breaks the rules depends on the platform, so I cannot say.',
                                   f'Moderating "{s}..." is subjective; please review it manually.'])
        prompt = (rng.choice(ASKS_POLICY).format(p=rng.choice(POLICY), c=text) if safe_vocab
                  else rng.choice(ASKS).format(c=text))
        if max(len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{a}").ids) for a in (chosen, rejected)) > MAX_TOKENS:
            continue
        seen.add(text)
        rows.append(dict(prompt=prompt, chosen=chosen, rejected=rejected, kind=kind, style=style,
                         toxic=bool(is_toxic), category=cat[0]))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--wiki", required=True, help="folder with wiki_toxic validation.csv and test.csv")
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=4000)
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    import pandas as pd
    train_df = pd.concat([load(os.path.join(a.data, "validation-00000-of-00001.parquet")),
                          load_wiki(os.path.join(a.wiki, "validation.csv"))], ignore_index=True)
    test_df = pd.concat([load(os.path.join(a.data, "test-00000-of-00001.parquet")),
                         load_wiki(os.path.join(a.wiki, "test.csv"))], ignore_index=True)
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
