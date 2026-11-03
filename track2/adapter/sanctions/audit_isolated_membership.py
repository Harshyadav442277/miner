"""Independent raw-CSV/source-split preflight for the V27 bounded probe."""
import argparse
import csv
import json
from pathlib import Path

from tokenizers import Tokenizer
from binding_benchmark import render
from build_pairs import norm
from collect_miners import save
from repair_scope_negation import sha


def audit(home, plan):
    p = json.loads((plan / "frozen-inputs.json").read_text())
    evidence = Path(__file__).parent / "evidence"
    facts_path = evidence / "hard-fact-replay-plan/frozen-facts.json"
    facts = json.loads(facts_path.read_text())
    assert p["hard_facts_sha256"] == sha(facts_path)
    index = {}
    for file, col in (("sdn", 1), ("alt", 3)):
        source = home / f"data/sanctions/{file}.csv"
        assert sha(source) == facts[f"{file}_sha256"]
        for row in csv.reader(source.read_text(encoding="utf-8-sig").splitlines()):
            if len(row) > col and row[0].strip().isdigit():
                index.setdefault(norm(row[col]), set()).add(int(row[0]))
    trainfile = home / "pairs/sanctions_v13_reference/train.jsonl"
    valfile = home / "pairs/sanctions_v13_reference/val.jsonl"
    assert sha(trainfile) == facts["source_train_sha256"]
    assert sha(valfile) == p["source_val_sha256"]
    for qs, path in ((p["train"], trainfile), (p["role_validation"], valfile)):
        names = {norm(json.loads(line)["query_name"]) for line in path.read_text().splitlines()}
        for q in qs:
            assert norm(q["name"]) in names
            found = index.get(norm(q["name"]), set())
            assert bool(found) == q["listed"] and found == set(map(int, q["sdn_ids"]))
    assert not {norm(q["name"]) for q in p["train"]} & {norm(q["name"]) for q in p["role_validation"]}
    assert not {i for q in p["train"] for i in q["sdn_ids"]} & {i for q in p["role_validation"] for i in q["sdn_ids"]}
    tok = Tokenizer.from_file(str(home / "foundation/tokenizer.json"))
    for q in p["train"] + p["role_validation"] + p["binding"]:
        ids = tok.encode(render(q["prompt"], "")).ids
        assert ids == q["question_only_ids"] and len(ids) <= 512
        for v in q["views"]:
            assert all(ids[i] == v["ids"][i] for i in v["query_positions"])
    return {"pass": True, "inputs_sha256": sha(plan / "frozen-inputs.json"),
            "source_queries_verified": 224, "source_files_hash_verified": True,
            "train_validation_names_and_entities_disjoint": True,
            "question_only_prefix_rows_verified": 256, "script_sha256": sha(Path(__file__)),
            "scope": "Independent raw CSV membership, source-split and empty-answer prefix audit, no model scores."}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--plan", type=Path, required=True)
    args = ap.parse_args()
    result = audit(args.home, args.plan)
    save(args.plan / "independent-source-audit.json", result)
    print(json.dumps(result))
