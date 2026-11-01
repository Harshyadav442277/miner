"""Out-of-template probe: answer shapes the training builder never produced (bare schema JSON, string matches,
one-word verdicts). Listed names are checked against the SDN csv before use; unlisted ones are absent from it.

    python ood_probe.py sdn.csv probe.jsonl   # then score_pairs.py --pairs probe.jsonl
"""
import json
import sys

LISTED = ["Bank Melli Iran", "Kim Jong Un", "HAMAS", "Islamic Revolutionary Guard Corps", "Joaquin Guzman Loera",
          "Hezbollah", "Banco Nacional de Cuba", "Korea Kwangson Banking Corp"]
UNLISTED = ["Microsoft Corporation", "Jane Smith", "Toyota Motor Corporation", "Maria Garcia Lopez",
            "Nestle S.A.", "Ahmed Khan", "Siemens AG", "Olivia Brown"]
PROMPTS = ["Is {q} on any sanctions list?", "Screen {q} against sanctions lists", "{q}"]


def shapes(q, hit):
    yes = {"name": q, "matched": True, "matches": [q], "lists": ["OFAC SDN"], "match_score": 1.0}
    no = {"name": q, "matched": False, "matches": [], "lists": ["OFAC SDN", "UN"], "match_score": 0.0}
    good, bad = (yes, no) if hit else (no, yes)
    yield json.dumps(good), json.dumps(bad), "schema_json"
    yield json.dumps({"matched": good["matched"]}), json.dumps({"matched": bad["matched"]}), "bare_bool"
    w = lambda m: "Match" if m else "No match"
    yield w(good["matched"]), w(bad["matched"]), "one_word"
    # mixed shapes, as hand-written pool rows tend to be: one detailed answer against one short one
    rich = (lambda m: f"{q} matches an OFAC SDN entry ({q}); block the transaction and escalate for review." if m
            else f"Screened {q} against the OFAC SDN and UN consolidated lists: no entries found.")
    yield rich(good["matched"]), w(bad["matched"]), "rich_vs_short"
    yield w(good["matched"]), rich(bad["matched"]), "short_vs_rich"


sdn = open(sys.argv[1], encoding="latin-1").read().upper()
out = open(sys.argv[2], "w", encoding="utf-8")
for i, q in enumerate(LISTED + UNLISTED):
    hit = q in LISTED
    probe = q.upper().split()[-1] if hit else q.upper()
    if hit and probe not in sdn:
        sys.exit(f"not in SDN: {q}")
    if not hit and q.upper() in sdn:
        sys.exit(f"unexpectedly in SDN: {q}")
    for c, r, kind in shapes(q, hit):
        out.write(json.dumps({"prompt": PROMPTS[i % 3].format(q=q), "chosen": c, "rejected": r,
                              "kind": f"{kind}:{'listed' if hit else 'unlisted'}", "format": kind}) + "\n")
