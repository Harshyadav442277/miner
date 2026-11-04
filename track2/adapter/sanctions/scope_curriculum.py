"""Source-only, counterbalanced claim/scope grammar and frozen fresh repair validation."""
import json
from pathlib import Path
import random

from tokenizers import Tokenizer
from binding_benchmark import render
from build_pairs import load, norm
from collect_miners import save, snapshot_index
from distill_source_representations import ALL_FORMS, evaluate, token_key
from hf_reward_diagnostics import score_keys
from repair_scope_negation import sha

CLAIMS = (
    ("Lookup status for {name}: ", "."),
    ("The OFAC SDN snapshot returns ", " for the queried name {name}."),
    ("For the requested name {name}, exact-name membership is ", "."),
    ("OFAC SDN decision [", "] on the exact spelling {name}."),
    ("Exact result: ", ". Screened name: {name}."),
    ("Name entry {name} has result ", " in the OFAC SDN source."))
SCOPES = ("", "Name matching does not prove that the identities are the same.",
          "An exact overlap is not sufficient for identity verification.",
          "This lookup does not establish ownership-based or all-list clearance.",
          "Identity verification requires identifiers beyond the name.",
          "A separate identifier check is required to resolve identity.",
          "Ownership and other lists require separate checks.")
UNUSED = (
    ("OFAC SDN name record check: {name}. Outcome => ", ". Determining whether the subject is the same entity requires further evidence."),
    ("The exact query string {name} has lookup classification ", ". This name check is not an identity confirmation."),
    ("Screened spelling {name}; source verdict ", ". The result does not resolve ownership or other-list checks."),
    ("", " is the snapshot lookup outcome for {name}. Additional identifiers remain necessary."))


def varied_view(tok, q, hit, number, variant, neutral):
    lead, tail = CLAIMS[(number+3*variant) % len(CLAIMS)]
    lead, tail = lead.format(name=q["name"]), tail.format(name=q["name"])
    value = "MATCH" if hit else "NO MATCH"
    clause = SCOPES[(number+2*variant) % len(SCOPES)]
    prefix, suffix = ((clause+" " if clause else ""), "") if number % 2 else ("", " "+clause if clause else "")
    metadata = dict(neutral) if variant else {}
    # Trim metadata for BOTH verdicts together, keeping the same content in each.
    while True:
        meta = "Source information: "+json.dumps(metadata)+" " if metadata else ""
        if max(len(tok.encode(render(q["prompt"], meta+prefix+lead+v+tail+suffix)).ids)
               for v in ("MATCH", "NO MATCH")) <= 500:
            break
        assert metadata
        metadata.pop(next(reversed(metadata)))
    before = meta+prefix+lead
    body = before+value+tail+suffix
    text = render(q["prompt"], body)
    enc = tok.encode(text)
    offset = len(render(q["prompt"], ""))+len(before)
    primary = [i for i,(s,e) in enumerate(enc.offsets) if e>s and e>offset and s<offset+len(value)]
    assert tok.decode([enc.ids[i] for i in primary]).strip() == value
    positions = q["views"][0]["query_positions"]
    assert all(enc.ids[i] == q["views"][0]["ids"][i] for i in positions)
    return {"ids": enc.ids, "primary_positions": primary, "query_positions": positions,
            "claimed_match": hit, "is_correct": hit == q["listed"], "format": f"varied_prose_{variant}",
            "grammar_index": (number+3*variant)%len(CLAIMS), "scope_index": (number+2*variant)%len(SCOPES)}


def fresh_validation(home, evidence):
    sdn, alt = [home/f"data/sanctions/{n}.csv" for n in ("sdn", "alt")]
    entries = {e["id"]: e for e in load(str(sdn), str(alt))}
    _, index = snapshot_index(sdn.read_bytes(), alt.read_bytes())
    names, ids = set(), set()
    def exclude(qs):
        for q in qs:
            names.add(norm(q["name"])); ids.update(index.get(norm(q["name"]), [])); ids.update(q.get("sdn_ids", []))
    old16 = json.loads((evidence/"v16-plan/frozen-inputs.json").read_text())
    for v in (16, 17, 19):
        for qs in json.loads((evidence/f"v{v}-plan/frozen-inputs.json").read_text())["queries"].values(): exclude(qs)
    for v in (20, 21, 22):
        p = json.loads((evidence/f"v{v}-plan/frozen-inputs.json").read_text())
        exclude(p["train"]); exclude(p["validation"])
    hard = json.loads((evidence/"hard-fact-replay-plan/frozen-facts.json").read_text())
    exclude(hard["hard_errors"]); exclude(hard["correct_replay"])
    exclude(json.loads((evidence/"listed-recall-diagnosis/frozen-protocol.json").read_text())["queries"])
    for rel in old16["external_query_files"]: exclude(json.loads((evidence/rel.replace('\\','/')).read_text()))
    rows = [json.loads(line) for line in (home/"pairs/sanctions_v13_reference/val.jsonl").read_text().splitlines()]
    random.Random(3120261104).shuffle(rows)
    selected = {"primary": [], "alias": [], "absent": []}
    for r in rows:
        n = norm(r["query_name"]); found = set(index.get(n, []))
        assert bool(found) == r["listed"]
        if n in names or found&ids or len(found)>1: continue
        kind = "absent" if not found else "primary" if n == norm(entries[r["sdn_entity_id"]]["name"]) else "alias"
        if len(selected[kind]) == (48 if kind == "absent" else 24): continue
        q = {"name": r["query_name"], "prompt": r["prompt"], "listed": r["listed"],
             "source_form": kind, "sdn_ids": sorted(found), "provenance": r["provenance"]}
        selected[kind].append(q); exclude([q])
    assert [len(selected[k]) for k in ("primary", "alias", "absent")] == [24, 24, 48]
    return sum(selected.values(), [])


def prepare_inputs(a):
    evidence = Path(__file__).parent/"evidence"
    original = evidence/"v30-plan/frozen-inputs.json"
    p = json.loads(original.read_text())
    audit = json.loads((original.parent/"source-annotation-audit.json").read_text())
    assert audit["pass"] and audit["inputs_sha256"] == sha(original)
    tok = Tokenizer.from_file(str(a.home/"foundation/tokenizer.json"))
    counters = {True: 0, False: 0}
    for q in p["train"]:
        number = counters[q["listed"]]; counters[q["listed"]] += 1
        original_views = q["views"]
        q["views"] = [next(v for v in original_views if v["format"] == fmt and v["claimed_match"] == hit)
                      if fmt in ("thin_json", "json_early", "json_late") else
                      varied_view(tok, {**q,"views":original_views}, hit, number, int(fmt[-1]), p["neutral_metadata"])
                      for hit in (q["listed"], not q["listed"])
                      for fmt in ("thin_json", "json_early", "json_late", "varied_prose_0", "varied_prose_1")]
    assert counters == {True: 32, False: 32}
    p["validation"] = fresh_validation(a.home, evidence)
    p["v30_inputs_sha256"] = sha(original)
    p.pop("baseline_sha256", None)
    p["grammar"] = {"claims": CLAIMS, "scopes": SCOPES, "unused_validation": UNUSED,
                    "scope": "Template/scope/placement assignment identical by index in each membership class; both claims per query."}
    deps = ("probe_scope_curriculum.py", "scope_curriculum.py", "factual_role_annotations.py", "hf_reward_diagnostics.py", "distill_source_representations.py")
    p["dependencies"] = {n: sha(Path(__file__).parent/n) for n in deps}
    p["scope"] = "V31 varied grammar, same64 facts/32 steps/88 attention tensors. Fresh96 repair questions frozen before scores; parent source-validation exposure disclosed. Four unused paraphrases also frozen."
    a.plan.mkdir(exist_ok=False)
    save(a.plan/"frozen-inputs.json", p)
    print(json.dumps({"train":64,"fresh_repair_validation":96,"unused_paraphrases":4}), flush=True)


def evaluate_suite(model, tok, qs, neutral):
    result = evaluate(model, tok, qs, neutral)
    keys = {(i, j, h): tuple(tok.encode(render(q["prompt"], lead.format(name=q["name"])+( "MATCH" if h else "NO MATCH")+tail.format(name=q["name"]))).ids)
            for i,q in enumerate(qs) for j,(lead,tail) in enumerate(UNUSED) for h in (True,False)}
    assert max(map(len, keys.values())) <= 256
    scores = score_keys(model, keys.values(), batch_size=4)
    forms = [*ALL_FORMS, *(f"unused_scope_{j}" for j in range(4))]
    for i,row in enumerate(result["rows"]):
        for j in range(4):
            row["forms"][f"unused_scope_{j}"] = {"correct_score":scores[keys[i,j,row["listed"]]],"wrong_score":scores[keys[i,j,not row["listed"]]]}
    for fmt in forms:
        result["by_format"][fmt] = {}
        for kind in ("listed", "absent", "primary", "alias"):
            part = [r for r in result["rows"] if (r["listed"] if kind=="listed" else not r["listed"] if kind=="absent" else r["source_form"]==kind)]
            wins = sum(r["forms"][fmt]["correct_score"] > r["forms"][fmt]["wrong_score"] for r in part)
            result["by_format"][fmt][kind] = {"queries":len(part),"correct":wins,"accuracy":wins/len(part)}
    for kind, hit in (("listed",True),("absent",False)):
        part = [r for r in result["rows"] if r["listed"] == hit]
        wins = sum(r["forms"][good]["correct_score"] > r["forms"][bad]["wrong_score"] for r in part for good in forms for bad in forms)
        total = len(part)*len(forms)**2
        result["cross_format"][kind] = {"pairs":total,"correct":wins,"accuracy":wins/total}
    return result
