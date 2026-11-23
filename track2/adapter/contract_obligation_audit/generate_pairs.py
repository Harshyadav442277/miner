"""Preference pairs for CONTRACT_OBLIGATION_AUDIT (generator v1). Every label is derived from the prompt's own text.

Two sources, mixed:
- synthetic contracts (synth.py): the better answer restates the obligations each clause creates, or their status
  on a stated date. The worse answer is the same answer, in the same style, with one fact wrong (party, figure, date
  or status), one obligation dropped or invented, or it is off-topic data or a refusal;
- CUAD v1 excerpts (CC BY 4.0, The Atticus Project): the better answer quotes the clause that lawyers annotated
  for the category asked. The worse answer quotes another clause in the same excerpt, denies a clause that is
  there, or claims one that is not.

    python -I generate_pairs.py --cuad C:/Users/hyada/tg-eval/data/cuad/CUAD_v1.json \
        --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/coa_v1

Writes train/val (train vocabulary and contracts), test (test-only names, items and CUAD contracts, another seed)
and probe (test split, answers in a markdown-table style training never uses).
"""
import argparse
import copy
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import synth  # noqa: E402

MAX_TOKENS = 500  # the node truncates at 512; keep every text whole
CUAD_CATS = {
    "Minimum Commitment": "minimum purchase or volume commitment", "Revenue/Profit Sharing": "revenue or profit sharing",
    "Audit Rights": "audit or inspection", "Insurance": "insurance", "Non-Compete": "non-compete",
    "Exclusivity": "exclusivity", "Post-Termination Services": "post-termination services",
    "Warranty Duration": "warranty", "Notice Period To Terminate Renewal": "notice to terminate renewal",
    "Termination For Convenience": "termination for convenience", "Liquidated Damages": "liquidated damages",
    "Cap On Liability": "liability cap", "Anti-Assignment": "anti-assignment", "Renewal Term": "renewal term",
    "Volume Restriction": "volume restriction", "No-Solicit Of Employees": "employee non-solicitation",
    "Ip Ownership Assignment": "IP assignment", "License Grant": "licence grant",
}
ASKS = ["Audit the obligations in this contract: {t}",
        "Extract every deliverable, due date and payment obligation from this contract.\n\n{t}",
        "List the obligations each party has under this agreement:\n{t}"]


def statuses(c, as_of, facts):
    out = {}
    delivered = facts.get("delivered")
    for i, o in enumerate(c["obligations"]):
        if o["kind"] == "deliver":
            if delivered:
                out[i] = "met" if delivered <= o["due"] else "late"
            else:
                out[i] = "overdue" if as_of > o["due"] else "not yet due"
        elif o["kind"] == "pay":
            due = (delivered + synth.dt.timedelta(days=o["days"]) if delivered else None) \
                if o.get("after_delivery") else o["due"]
            paid = facts.get("paid")
            if due is None:
                out[i] = "not yet due"
            elif paid:
                out[i] = "met" if paid <= due else "late"
            else:
                out[i] = "overdue" if as_of > due else "not yet due"
        else:
            out[i] = "ongoing"
    return out


def verdict(st):
    if st is None:
        return "Obligations identified"
    return "Overdue obligations" if "overdue" in st.values() else "No overdue obligations"


def render(obls, st, style, c):
    rows = [(o["party"], synth.statement(o), st[i] if st else None) for i, o in enumerate(obls)]
    v = verdict(st)
    if style == "json":
        return json.dumps({"verdict": v, "obligations": [dict(party=p, obligation=s, **({"status": x} if x else {}))
                                                         for p, s, x in rows],
                           "summary": f"{len(rows)} obligations between {c['a']} and {c['b']}."})
    if style == "spans":
        return json.dumps({"verdict": v, "obligations": [dict(party=o["party"], quote=synth.clause(o),
                                                              **({"status": st[i]} if st else {}))
                                                         for i, o in enumerate(obls)]}, indent=1)
    if style == "table":  # probe only
        head = "| Party | Obligation |" + (" Status |" if st else "")
        return f"**{v}**\n\n{head}\n" + "\n".join(f"| {p} | {s} |" + (f" {x} |" if x else "") for p, s, x in rows)
    if style == "numbered":
        return f"{v}:\n" + "\n".join(f"{i}. {s}" + (f" ({x})" if x else "") for i, (p, s, x) in enumerate(rows, 1))
    return f"{v}. " + " ".join(f"{s[0].upper()}{s[1:]}" + (f", which is {x}" if x else "") + "." for p, s, x in rows)


def perturb(rng, c, st, kind, split):
    obls, st2 = copy.deepcopy(c["obligations"]), dict(st) if st else None
    i = rng.randrange(len(obls))
    o = obls[i]
    if kind == "party":
        o["party"], o["other"] = o.get("other", c["b"] if o["party"] == c["a"] else c["a"]), o["party"]
    elif kind == "figure":
        key = next(k for k in ("qty", "amount", "pct", "days", "years") if k in o)
        o[key] = rng.choice(["97", "95", "99"]) if isinstance(o[key], str) else o[key] * rng.choice([2, 3, 10])
    elif kind == "date":
        if "due" not in o:
            return None
        o["due"] = o["due"] + synth.dt.timedelta(days=rng.choice([-45, -21, -9, 9, 21, 45]))
    elif kind == "omit":
        if len(obls) < 3:
            return None
        del obls[i]
        st2 = {j: st2[k] for j, k in enumerate(k for k in sorted(st2) if k != i)} if st2 else None
    elif kind == "invent":
        extra = synth.new_contract(rng, split)["obligations"][0]
        extra["party"], extra["other"] = c["a"], c["b"]
        if synth.clause(extra) in {synth.clause(x) for x in obls}:
            return None
        obls.insert(rng.randrange(len(obls) + 1), extra)
        st2 = ({j: ("ongoing" if j == obls.index(extra) else st2[j - (j > obls.index(extra))]) for j in range(len(obls))}
               if st2 else None)
    elif kind == "status":
        keys = [k for k, x in (st2 or {}).items() if x != "ongoing"]
        if not keys:
            return None
        k = rng.choice(keys)
        st2[k] = rng.choice([x for x in ("met", "late", "overdue", "not yet due") if x != st2[k]])
    return obls, st2


def offtopic(rng):
    names = ["Office of Rural Grants", "Bureau of Port Works", "Federal Seed Board", "Agency for Coastal Data"]
    return json.dumps({"results": [{"agency_name": rng.choice(names), "fiscal_year": "2026",
                                    "obligated_amount": round(rng.random() * 1e7, 2)} for _ in range(rng.randint(2, 4))],
                       "count": rng.randint(100, 9000)})


def synthetic_pair(rng, split, styles):
    c = synth.new_contract(rng, split)
    text = synth.contract_text(c, rng)
    st, prompt = None, rng.choice(ASKS).format(t=text)
    if rng.random() < 0.4 and any(o["kind"] in ("deliver", "pay") for o in c["obligations"]):
        as_of = c["start"] + synth.dt.timedelta(days=rng.randrange(30, 400))
        facts, said = {}, []
        d = next((o["due"] for o in c["obligations"] if o["kind"] == "deliver"), None)
        if d and rng.random() < 0.65:
            facts["delivered"] = min(as_of, d + synth.dt.timedelta(days=rng.randrange(-20, 25)))
            said.append(f"delivery was made on {synth.date_text(facts['delivered'])}")
        elif d:
            said.append("nothing has been delivered")
        if rng.random() < 0.5:
            facts["paid"] = as_of - synth.dt.timedelta(days=rng.randrange(0, 20))
            said.append(f"payment was received on {synth.date_text(facts['paid'])}")
        else:
            said.append("no payment has been made")
        st = statuses(c, as_of, facts)
        prompt = (f"{text}\n\nAs of {synth.date_text(as_of)}, {' and '.join(said)}. "
                  f"Which obligations are met, late, overdue or not yet due?")
    style = rng.choice(styles)
    chosen = render(c["obligations"], st, style, c)
    kind = rng.choices(["party", "figure", "date", "omit", "invent", "status", "offtopic", "refusal"],
                       [16, 18, 14, 14, 14, 16 if st else 0, 4, 4])[0]
    if kind == "offtopic":
        rejected = offtopic(rng)
    elif kind == "refusal":
        rejected = rng.choice([
            f"Unclear. The obligations in the {c['title']} between {c['a']} and {c['b']} cannot be assessed from "
            f"the text provided.",
            f"I cannot provide legal advice on the {c['title']}. {c['a']} and {c['b']} should consult a lawyer.",
            f"The {c['title']} dated {synth.date_text(c['start'])} needs its schedules before any obligation can "
            f"be identified."])
    else:
        got = perturb(rng, c, st, kind, split)
        if got is None:
            return None
        rejected = render(got[0], got[1], style, c)
    return dict(prompt=prompt, chosen=chosen, rejected=rejected, source="synthetic", kind=kind, style=style)


def cuad_index(path, split):
    out = []
    for doc in json.load(open(path, encoding="utf-8"))["data"]:
        test = int(hashlib.sha256(doc["title"].encode()).hexdigest(), 16) % 5 == 0
        if test != (split == "test"):
            continue
        p = doc["paragraphs"][0]
        spans = {q["id"].split("__")[-1]: q["answers"] for q in p["qas"]}
        out.append((p["context"], spans))
    return out


def window(ctx, start, end, rng):
    a = ctx.rfind(". ", 0, max(0, start - rng.randrange(150, 450)))
    b = ctx.find(". ", end + rng.randrange(150, 450))
    return " ".join(ctx[a + 2 if a >= 0 else 0: b + 1 if b >= 0 else len(ctx)].split())


def cuad_pair(rng, docs):
    ctx, spans = rng.choice(docs)
    have = [k for k in CUAD_CATS if spans.get(k)]
    if not have:
        return None
    anchor_cat = rng.choice(have)
    ans = rng.choice(spans[anchor_cat])
    if len(ans["text"]) > 400:
        return None
    exc = window(ctx, ans["answer_start"], ans["answer_start"] + len(ans["text"]), rng)
    inside = [(k, " ".join(a["text"].split())) for k in CUAD_CATS for a in spans.get(k, [])
              if " ".join(a["text"].split()) in exc and len(a["text"]) <= 400]
    positive = rng.random() < 0.5
    absent = [k for k in CUAD_CATS if not spans.get(k)]
    cat = anchor_cat if positive else (rng.choice(absent) if absent else None)
    if cat is None:
        return None
    phrase = CUAD_CATS[cat]
    others = [t for k, t in inside if k != cat and t not in {u for kk, u in inside if kk == cat}]
    if not others:
        sentences = [s.strip() + "." for s in exc.split(". ") if 40 < len(s) < 300]
        others = [s for s in sentences if all(s[:-1] not in u for _, u in inside if _ == cat)]
    if not others:
        return None
    art = "an" if phrase[0] in "aeiouAEIOU" else "a"
    prompt = f"Does this contract excerpt create {art} {phrase} obligation? If so, quote it.\n\n{exc}"
    style = rng.choice(["json", "prose"])

    def say(quote, nearest=None):
        """A "no" names the clause it read instead, so no two "no" answers are the same text."""
        if style == "json":
            body = {"found": quote is not None, "category": phrase, "quote": quote}
            return json.dumps(body if quote else {**body, "closest_clause": nearest, "about": "another matter"})
        if quote is None:
            return f'No. The excerpt contains no {phrase} clause; the closest text, "{nearest}", is about another matter.'
        return f'Yes. The excerpt creates {art} {phrase} obligation: "{quote}"'

    a, b = rng.sample(others, 2) if len(others) > 1 else (others[0], others[0])
    if positive:
        quote = " ".join(ans["text"].split())
        chosen = say(quote)
        kind = rng.choice(["wrong_clause", "deny"])
        rejected = say(a) if kind == "wrong_clause" else say(None, a)
    else:
        chosen, kind = say(None, a), "claim_absent"
        rejected = say(b)
    return dict(prompt=prompt, chosen=chosen, rejected=rejected, source="cuad", kind=kind, style=style)


def build(n, seed, split, cuad, tok, styles):
    rng = synth.new_rng(seed)
    docs = cuad_index(cuad, split)
    rows, seen = [], set()
    while len(rows) < n:
        r = cuad_pair(rng, docs) if rng.random() < 0.4 else synthetic_pair(rng, split, styles)
        if not r or r["chosen"] == r["rejected"] or r["prompt"] in seen:
            continue
        lens = [len(tok.encode(f"### Task:\n{r['prompt']}\n\n### Answer:\n{r[k]}").ids) for k in ("chosen", "rejected")]
        if max(lens) > MAX_TOKENS:
            continue
        seen.add(r["prompt"])
        rows.append(r)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cuad", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=3000)
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    os.makedirs(a.out, exist_ok=True)
    styles = ["json", "spans", "numbered", "prose"]
    train = build(a.n + 300, 7, "train", a.cuad, tok, styles)
    sets = {"train": train[:a.n], "val": train[a.n:], "test": build(400, 97, "test", a.cuad, tok, styles),
            "probe": [r for r in build(400, 131, "test", a.cuad, tok, ["table"]) if r["source"] == "synthetic"]}
    for name, rows in sets.items():
        with open(os.path.join(a.out, f"{name}.jsonl"), "w", encoding="utf-8", newline="\n") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(name, len(rows))


if __name__ == "__main__":
    main()
