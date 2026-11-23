"""Preference pairs for TEXT_SUMMARIZATION (generator v1). The source document is in the prompt and is built from a
fact record, so the faithful summary is derived from the record, never written by hand.

Four document genres (earnings note, incident report, study result, policy announcement). Each document states a
main finding, two to three supporting facts and some filler. The better summary states the main finding and the
key facts. The worse one is the same summary in the same style with one figure changed, one entity swapped, the
direction of a change flipped, a claim the document never makes added, or the main finding replaced by a minor
detail.

    python -I generate_pairs.py --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json \
        --out C:/Users/hyada/tg-eval/pairs/ts_v1

A fixed fifth of every name list is test-only (test and probe). The probe uses a one-line "TL;DR" style training
never sees.
"""
import argparse
import copy
import hashlib
import json
import os
import random

MAX_TOKENS = 500
ORGS = ["Northwind Foods", "Calder Robotics", "Bluefin Logistics", "Ostrava Steel", "Lakeshore Health", "Vantor Bank",
        "Meridian Air", "Quillon Software", "Harlow Energy", "Saffron Retail", "Tessel Pharma", "Brightwater Utilities",
        "Corvid Security", "Pallas Mining", "Ironbark Telecom", "Juno Insurance", "Kestrel Motors", "Linden Media"]
PLACES = ["Leeds", "Pune", "Rotterdam", "Denver", "Osaka", "Lyon", "Nairobi", "Monterrey", "Gdansk", "Perth",
          "Halifax", "Porto", "Tucson", "Busan", "Accra", "Tampere"]
PEOPLE = ["Maria Chen", "Tomas Reyes", "Aisha Bello", "Lars Nyberg", "Priya Nair", "Owen Hughes", "Keiko Sato",
          "Daniel Okafor", "Elena Rossi", "Samir Haddad", "Grace Kim", "Pablo Ortiz"]
PCTS = [3, 4, 6, 8, 12, 15, 18, 22, 27, 35]
COUNTS = [40, 120, 300, 850, 1200, 2400, 5000]
MINORS = ["a new logo", "an office move", "a staff award", "a charity drive", "a website redesign"]
FILLER = ["The company did not comment on market rumours.", "A full report will be published next month.",
          "Figures are unaudited.", "The meeting lasted about two hours.", "Analysts had expected a quieter quarter.",
          "Local media covered the event.", "Further details are available on request."]


def pick(rng, items, split):
    pool = [x for x in items if (int(hashlib.sha256(x.encode()).hexdigest(), 16) % 5 == 0) == (split == "test")]
    return rng.choice(pool)


def record(rng, split):
    genre = rng.choice(["earnings", "incident", "study", "policy"])
    r = dict(genre=genre, org=pick(rng, ORGS, split), place=pick(rng, PLACES, split), person=pick(rng, PEOPLE, split),
             up=rng.random() < 0.5, pct=rng.choice(PCTS),
             n=rng.choice(COUNTS), q=rng.choice(["first", "second", "third", "fourth"]),
             year=rng.choice([2024, 2025, 2026]), minor=rng.choice(MINORS), fill=rng.sample(FILLER, rng.randint(1, 3)),
             extra=rng.choice([None, "minor", "minor", "fill"]))
    return r


def doc(r, rng):
    d = "rose" if r["up"] else "fell"
    if r["genre"] == "earnings":
        body = [f"{r['org']} reported that revenue {d} {r['pct']}% in the {r['q']} quarter of {r['year']}.",
                f"Chief executive {r['person']} said the change came mainly from its {r['place']} operations.",
                f"The company employs {r['n']} people there.", f"It also announced {r['minor']}."]
    elif r["genre"] == "incident":
        body = [f"A power failure at {r['org']}'s {r['place']} site in {r['year']} halted work for {r['pct']} hours.",
                f"About {r['n']} customers were affected, the company said.",
                f"Operations manager {r['person']} said backup generators {'started' if r['up'] else 'failed to start'}.",
                f"Separately, the site is preparing {r['minor']}."]
    elif r["genre"] == "study":
        body = [f"A study of {r['n']} adults in {r['place']} found that daily walking {'lowered' if r['up'] else 'did not lower'} "
                f"blood pressure, with an average change of {r['pct']}%.",
                f"The study was led by {r['person']} and funded by {r['org']}.",
                f"It ran through {r['year']}.", f"The team also noted {r['minor']} at the clinic."]
    else:
        body = [f"The city of {r['place']} will {'raise' if r['up'] else 'cut'} parking fees by {r['pct']}% from {r['year']}.",
                f"Council member {r['person']} said the change affects about {r['n']} permit holders.",
                f"The contract for the new meters went to {r['org']}.", f"The council also approved {r['minor']}."]
    body += r["fill"]
    head, rest = body[0], body[1:]
    rng.shuffle(rest)
    return " ".join([head] + rest)


def points(r):
    pts = core(r)
    if r["extra"] == "minor":
        pts.append(f"the text also mentions {r['minor']}")
    elif r["extra"] == "fill":
        pts.append(r["fill"][0][0].lower() + r["fill"][0][1:-1])
    return pts


def core(r):
    d = "rose" if r["up"] else "fell"
    if r["genre"] == "earnings":
        return [f"{r['org']}'s revenue {d} {r['pct']}% in Q{['first','second','third','fourth'].index(r['q']) + 1} {r['year']}",
                f"{r['person']} credited the {r['place']} operations"]
    if r["genre"] == "incident":
        return [f"a power failure stopped {r['org']}'s {r['place']} site for {r['pct']} hours in {r['year']}",
                f"about {r['n']} customers were affected and the backup generators {'started' if r['up'] else 'did not start'}"]
    if r["genre"] == "study":
        return [f"in a study of {r['n']} adults in {r['place']}, daily walking {'lowered' if r['up'] else 'did not lower'} "
                f"blood pressure ({r['pct']}% average change)", f"it was led by {r['person']} and funded by {r['org']}"]
    return [f"{r['place']} will {'raise' if r['up'] else 'cut'} parking fees by {r['pct']}% from {r['year']}",
            f"about {r['n']} permit holders are affected, and {r['org']} supplies the new meters"]


def render(pts, style):
    if style == "json":
        return json.dumps({"summary": pts[0][0].upper() + pts[0][1:] + ".", "key_points": [p[0].upper() + p[1:] for p in pts]})
    if style == "bullets":
        return "Summary:\n" + "\n".join(f"- {p[0].upper()}{p[1:]}." for p in pts)
    if style == "tldr":  # probe only
        return "TL;DR: " + "; ".join(pts) + "."
    return " ".join(f"{p[0].upper()}{p[1:]}." for p in pts)


def perturb(rng, r, kind, split):
    w = copy.deepcopy(r)
    if kind == "figure":
        key = rng.choice(["pct", "n"]) if r["genre"] != "earnings" else "pct"
        w[key] = rng.choice([x for x in (PCTS if key == "pct" else COUNTS) if x != r[key]])  # same number set
    elif kind == "entity":
        key = rng.choice(["org", "place", "person"])
        # Any other name is wrong; the full list is used because a split's share can hold a single name.
        w[key] = rng.choice([x for x in {"org": ORGS, "place": PLACES, "person": PEOPLE}[key] if x != r[key]])
    elif kind == "direction":
        w["up"] = not r["up"]
    pts = points(w)
    if kind == "added":
        # A claim from the same vocabulary as the true extras, which this document does not make.
        absent = ([f"the text also mentions {m}" for m in MINORS if m != r["minor"]]
                  + [f[0].lower() + f[1:-1] for f in FILLER if f not in r["fill"]])
        pts = pts + [rng.choice(absent)]
    elif kind == "main_missed":
        pts = [f"the text also mentions {r['minor']}", pts[1]]
    return pts


def build(n, seed, split, styles, tok):
    rng = random.Random(seed)
    rows, seen = [], set()
    while len(rows) < n:
        r = record(rng, split)
        text = doc(r, rng)
        if text in seen:
            continue
        prompt = rng.choice(["Summarize this text in two or three sentences:\n\n{t}", "Give a concise executive summary:\n{t}",
                             "TL;DR this for me: {t}", "Summarise the key facts of the following report.\n\n{t}"]).format(t=text)
        style = rng.choice(styles)
        kind = rng.choice(["figure", "entity", "direction", "added", "main_missed"])
        chosen, rejected = render(points(r), style), render(perturb(rng, r, kind, split), style)
        if chosen == rejected:
            continue
        if max(len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{a}").ids) for a in (chosen, rejected)) > MAX_TOKENS:
            continue
        seen.add(text)
        rows.append(dict(prompt=prompt, chosen=chosen, rejected=rejected, kind=kind, style=style, genre=r["genre"]))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=3000)
    ap.add_argument("--bills", help="v2: short bills from filter_bills.py; about half of each set becomes bill pairs")
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    styles = ["json", "bullets", "prose"]
    train = build(a.n + 300, 7, "train", styles, tok)
    sets = {"train": train[:a.n], "val": train[a.n:], "test": build(400, 97, "test", styles, tok),
            "probe": build(200, 131, "test", ["tldr"], tok)}
    if a.bills:
        import sys
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script folder
        import bill_pairs
        bills = bill_pairs.load(a.bills)
        test_ids = {b["id"] for b in bills if int(hashlib.sha256(str(b["id"]).encode()).hexdigest(), 16) % 5 == 0}

        def bill_set(n, seed, split):
            rng = random.Random(seed)
            pool = [b for b in bills if (b["id"] in test_ids) == (split == "test")]
            rows, used = [], set()
            for _ in range(n * 20):
                if len(rows) >= n:
                    break
                b = rng.choice(pool)
                r = bill_pairs.pair(rng, b, pool, tok, MAX_TOKENS)
                if r and (b["id"], r["kind"]) not in used:
                    used.add((b["id"], r["kind"]))
                    rows.append(r)
            return rows

        tb, testb = bill_set(a.n + 300, 11, "train"), bill_set(400, 97, "test")
        rng = random.Random(5)
        sets["train"] = sets["train"][:a.n - a.n // 2] + tb[:a.n // 2]
        rng.shuffle(sets["train"])
        sets["val"] = sets["val"][:150] + tb[a.n // 2:a.n // 2 + 150]
        sets["test"] = sets["test"][:200] + testb[:200]
        sets["bills_test"] = testb
    os.makedirs(a.out, exist_ok=True)
    for name, rows in sets.items():
        with open(os.path.join(a.out, f"{name}.jsonl"), "w", encoding="utf-8", newline="\n") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
        print(name, len(rows))


if __name__ == "__main__":
    main()
