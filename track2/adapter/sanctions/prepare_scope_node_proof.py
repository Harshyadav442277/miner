"""Deterministic synthetic export-fidelity slice, never a genuine miner capture."""
import argparse
import json
from pathlib import Path

from collect_miners import save
from repair_scope_negation import response, FORMS, sha
from diagnose_fact_formats import FORMATS


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", type=Path, required=True)
    a = ap.parse_args()
    p = json.loads((a.plan / "frozen-inputs.json").read_text())
    assert json.loads((a.plan / "repair-result.json").read_text())["pass"]
    out = a.plan / "synthetic-node-proof"
    out.mkdir(exist_ok=False)
    selected = []
    for kind, count in (("primary", 4), ("alias", 4), ("absent", 8)):
        selected.extend([q for q in p["queries"]["holdout"] if q["source_form"] == kind][:count])
    def pair(q, fmt):
        return {"prompt": q["prompt"], "name": q["name"], "listed": q["listed"],
                "chosen": response(q["name"], q["listed"], fmt),
                "rejected": response(q["name"], not q["listed"], fmt), "format": fmt,
                "source_id_metadata_only": fmt,
                "kind": "listed" if q["listed"] else "exact_name_absent"}
    pairs = [pair(q, fmt) for q in selected for fmt in ("thin_json", "heldout_prose")]
    (out / "pairs.jsonl").write_text("".join(json.dumps(r)+"\n" for r in pairs), encoding="utf-8")
    save(out / "label-summary.json", {"registration_eligible": False, "pairs_by_kind": {"listed": 16, "exact_name_absent": 16},
         "longer_answer_baseline": sum(len(r["chosen"]) > len(r["rejected"]) for r in pairs)/len(pairs),
         "scope": "Synthetic export fidelity only; no captured miner response or registration claim"})
    save(out / "selection-manifest.json", {"rule": "First4 primary,4 alias,8 absent in frozen fresh holdout; two forms each, no score-conditioned selection",
         "pairs_sha256": sha(out / "pairs.jsonl"), "parent_inputs_sha256": sha(a.plan / "frozen-inputs.json"),
         "models": [13, 17], "scope": "HF/node agreement only, not a new factual accuracy benchmark"})
    fixture = [pair(q, fmt) for qs in p["queries"].values() for q in qs for fmt in tuple(dict.fromkeys((*FORMS, *FORMATS))) ]
    (a.plan / "all-tokenizer-fixtures.jsonl").write_text("".join(json.dumps(r)+"\n" for r in fixture), encoding="utf-8")
    print(json.dumps({"node_pairs": len(pairs), "tokenizer_fixture_pairs": len(fixture)}))


if __name__ == "__main__":
    main()
