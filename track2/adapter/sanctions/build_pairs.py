"""Build SANCTIONS_SCREENING_MATCH preference pairs from the OFAC SDN list (US Treasury, public domain).

A question names a person, company, vessel or aircraft. For a listed name (the primary name, an
a.k.a. from alt.csv, or a one-letter misspelling of either) the better answer reports the match;
for an unlisted name it reports no match. The worse answer is one of:
  flipped        the opposite verdict, same wording
  wrong_match    a match against a listed name unrelated to the query
  contradiction  the verdict disagrees with the answer's own score (NO MATCH at 0.96, MATCH at 0.12)
  wrong_entity   a correct-looking screening of a different name
  refusal        declines or hedges (kept to STYLE_SHARE: it has its own vocabulary)
Unlisted names are recombined from listed individuals' own first and last names (and listed
vessels' and entities' own words), then checked against every listed name and alias, so both
classes come from the same name distribution. The split is by SDN entity: val and test entities
and the names built from them never appear in training.

    python build_pairs.py --sdn sdn.csv --alt alt.csv --out-dir C:/Users/hyada/tg-eval/pairs/sanctions_v1
"""
import argparse
import collections
import csv
import json
import os
import random
import re

STYLE_SHARE = 0.06
SOURCE = "https://sanctionslist.ofac.treas.gov/Home/SdnList"
Q = {
    "any": [
        "Screen '{q}' against the OFAC SDN list and report any matches.",
        "Is {q} on any sanctions list?",
        "Screen {q} against sanctions lists",
        "Run a sanctions check on {q}{ctx}.",
        "Check whether {q} appears on the OFAC SDN or UN consolidated lists, including near-matches.",
        "Sanctions screening request: {q}{ctx}. Report matches with confidence.",
    ],
    "vessel": ["Screen the vessel name {q} against OFAC", "Is the vessel {q} sanctioned?"],
    "aircraft": ["Screen the aircraft {q} against OFAC", "Is the aircraft {q} on a sanctions list?"],
}
PROSE = {
    "match": [
        "Match found: {q} appears on the OFAC SDN list as {listed} (program {prog}), match score {s}.",
        "{q} is sanctioned. OFAC SDN entry: {listed}, program {prog}; confidence {s}.",
        "Positive match. {q} matches the SDN entry {listed} under {prog} with score {s}.",
        "Screening result: MATCH. List: OFAC SDN. Entry: {listed}. Program: {prog}. Score: {s}.",
    ],
    "nomatch": [
        "No match: {q} does not appear on the OFAC SDN list; the closest entry, {listed} ({prog}), scores {s}.",
        "{q} is not sanctioned. Nearest OFAC SDN entry: {listed}, program {prog}; similarity {s}.",
        "Negative. {q} matches no SDN entry; the nearest is {listed} under {prog} at {s}.",
        "Screening result: NO MATCH. List: OFAC SDN. Nearest entry: {listed}. Program: {prog}. Score: {s}.",
    ],
    "refusal": [
        "I can't run sanctions screening on {q}; please consult your compliance team.",
        "{q} may or may not be sanctioned. Check the official OFAC and UN lists yourself.",
        "Sanctions data for {q} is not available right now. Try again later.",
        "I'm unable to determine whether {q} is on a sanctions list.",
    ],
}
_PAREN = re.compile(r"\s*\(.*?\)")


def display(name, kind):
    """'PETROV, Ivan Sergeyevich' -> 'Ivan Sergeyevich PETROV'; entities and vessels unchanged."""
    name = _PAREN.sub("", name).strip()
    if kind == "individual" and ", " in name:
        last, first = name.split(", ", 1)
        return f"{first} {last.title()}"
    return name


def norm(name):
    return " ".join(sorted(re.findall(r"[a-z0-9]+", name.lower())))


def typo(name, rng):
    letters = [i for i, c in enumerate(name) if c.isalpha()]
    if len(letters) < 6:
        return name
    i = rng.choice(letters[1:-1])
    return name[:i] + name[i + 1:]


def load(sdn_path, alt_path):
    rows = {}
    for r in csv.reader(open(sdn_path, encoding="latin-1")):
        if len(r) < 12 or not r[0].strip().isdigit():
            continue
        kind = r[2].strip() if r[2].strip() != "-0-" else "entity"
        rows[r[0]] = {"id": r[0], "name": r[1].strip(), "kind": kind, "prog": r[3].strip().strip("[]") or "SDN",
                      "remarks": r[11], "aliases": []}
    for r in csv.reader(open(alt_path, encoding="latin-1")):
        if len(r) >= 4 and r[0] in rows and r[2].strip() in ("aka", "fka"):
            rows[r[0]]["aliases"].append(r[3].strip())
    return list(rows.values())


def unlisted_names(ents, listed_norms, rng, n):
    """Recombine listed names' own parts, so negatives share the positives' name distribution."""
    firsts, lasts, words = [], [], collections.defaultdict(list)
    for e in ents:
        if e["kind"] == "individual" and ", " in e["name"]:
            last, first = _PAREN.sub("", e["name"]).split(", ", 1)
            firsts.append(first.split()[0])
            lasts.append(last.title())
        else:
            words[e["kind"]].extend(_PAREN.sub("", e["name"]).split())
    out = []
    for _ in range(n * 3):
        kind = rng.choice(["individual"] * 3 + [k for k in words if len(words[k]) > 20])
        if kind == "individual":
            if not firsts:
                continue
            name = f"{rng.choice(firsts)} {rng.choice(lasts)}"
        else:
            name = " ".join(rng.choice(words[kind]) for _ in range(rng.randint(2, 3)))
        if norm(name) not in listed_norms:
            out.append((name, kind))
        if len(out) >= n:
            break
    return out


def ctx_for(e, rng):
    m = re.search(r"DOB (\d{1,2} \w{3} )?(\d{4})", e.get("remarks", "")) if e else None
    return f", DOB {m.group(2)}" if m and rng.random() < 0.5 else ""


def render(side, fmt, t):
    if fmt == "prose":
        ts = PROSE[side["say"]]
        return ts[t % len(ts)].format(**side)
    say, s = side["say"], float(side["s"])
    if say == "refusal":
        return json.dumps({"name": side["q"], "matched": None, "matches": [], "lists": [], "match_score": None})
    # Screening tools list the nearest candidate with its score whether or not it is a match.
    hit = {"name": side["listed"], "list": "OFAC SDN", "program": side["prog"], "score": s}
    return json.dumps({"name": side["q"], "matched": say == "match", "matches": [hit], "lists": ["OFAC SDN"],
                       "match_score": s}, ensure_ascii=False)


def make_pair(q, kind, entity, pool, rng):
    """entity: the SDN entry q matches, or None for an unlisted q. pool: listed entries of this split."""
    other, near = rng.choice(pool), rng.choice(pool)
    o_listed = display(other["name"], other["kind"])
    n_listed = display(near["name"], near["kind"])

    def hi():
        return f"{rng.uniform(0.86, 1.0):.2f}"

    def lo():
        return f"{rng.uniform(0.05, 0.45):.2f}"

    if entity:
        listed = display(entity["name"], entity["kind"])
        good = {"say": "match", "q": q, "listed": listed, "prog": entity["prog"], "s": hi()}
    else:
        good = {"say": "nomatch", "q": q, "listed": n_listed, "prog": near["prog"], "s": lo()}
    if rng.random() < STYLE_SHARE:
        bad, how = {**good, "say": "refusal"}, "refusal"
    else:
        how = rng.choice(["flipped", "flipped", "wrong_match", "contradiction", "wrong_entity"])
        if how == "flipped":
            bad = ({"say": "nomatch", "q": q, "listed": n_listed, "prog": near["prog"], "s": lo()} if entity else
                   {"say": "match", "q": q, "listed": q, "prog": other["prog"], "s": hi()})
        elif how == "wrong_match":
            bad = {"say": "match", "q": q, "listed": o_listed, "prog": other["prog"], "s": hi()}
        elif how == "contradiction":
            # the verdict disagrees with the answer's own score
            bad = {**good, "say": "nomatch", "s": hi()} if entity else {**good, "say": "match", "s": lo()}
        else:
            bad = {"say": "match", "q": o_listed, "listed": o_listed, "prog": other["prog"], "s": hi()}
    qkind = kind if kind in ("vessel", "aircraft") and rng.random() < 0.6 else "any"
    question = rng.choice(Q[qkind]).format(q=q, ctx=ctx_for(entity, rng))
    return how, question, good, bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sdn", required=True)
    ap.add_argument("--alt", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--json-frac", type=float, default=0.4)
    a = ap.parse_args()
    rng = random.Random(a.seed)

    ents = load(a.sdn, a.alt)
    listed_norms = {norm(display(n, e["kind"])) for e in ents for n in [e["name"], *e["aliases"]]}
    listed_norms |= {norm(n) for e in ents for n in [e["name"], *e["aliases"]]}
    rng.shuffle(ents)
    n = len(ents)
    splits = {"val": ents[: n // 10], "test": ents[n // 10: n // 5], "train": ents[n // 5:]}

    os.makedirs(a.out_dir, exist_ok=True)
    stats = collections.Counter()
    for split, part in splits.items():
        rows = []
        for e in part:
            names = [e["name"]] + e["aliases"][:2]
            q = display(rng.choice(names), e["kind"])
            if rng.random() < 0.25:
                q = typo(q, rng)
            rows.append((q, e["kind"], e))
        rows += [(q, k, None) for q, k in unlisted_names(part, listed_norms, rng, len(part))]
        rng.shuffle(rows)
        with open(os.path.join(a.out_dir, f"{split}.jsonl"), "w", encoding="utf-8") as f:
            for q, kind, e in rows:
                how, question, good, bad = make_pair(q, kind, e, part, rng)
                fmt = "json" if rng.random() < a.json_frac else "prose"
                t = rng.randrange(1000)
                chosen, rejected = render(good, fmt, t), render(bad, fmt, t)
                if chosen == rejected:
                    continue
                f.write(json.dumps({"prompt": question, "chosen": chosen, "rejected": rejected,
                                    "label_kind": "preference_pair", "kind": how, "listed": e is not None,
                                    "format": fmt, "provenance": {"source_kind": "dataset" if e else "synthetic",
                                                                  "source_url": SOURCE}}, ensure_ascii=False) + "\n")
                stats[split] += 1
                stats[f"{split}:{how}"] += 1
    json.dump(dict(sorted(stats.items())), open(os.path.join(a.out_dir, "stats.json"), "w"), indent=1)
    print(json.dumps(dict(sorted(stats.items()))))


if __name__ == "__main__":
    main()
