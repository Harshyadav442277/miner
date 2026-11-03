"""Source-training fit of the ordinary HF reward scorer, no optimization."""
import argparse
import json
from pathlib import Path

from collect_miners import save
from distill_source_representations import TRAIN_FORMS, token_key
from hf_reward_diagnostics import load_model, score_keys
from repair_scope_negation import sha


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--plan", type=Path, required=True)
    ap.add_argument("--version", type=int, required=True)
    a = ap.parse_args()
    p = json.loads((a.plan / "frozen-inputs.json").read_text())
    model, tok, identity = load_model(a.home, a.version)
    qs = p["train"]
    keys = {(i, fmt, claim): token_key(tok, q, claim, fmt, p["neutral_metadata"])
            for i, q in enumerate(qs) for fmt in TRAIN_FORMS for claim in (True, False)}
    scores = score_keys(model, keys.values(), batch_size=4)
    groups = {}
    rows = []
    for i, q in enumerate(qs):
        margins = {}
        for fmt in TRAIN_FORMS:
            margin = scores[keys[i, fmt, q["listed"]]] - scores[keys[i, fmt, not q["listed"]]]
            margins[fmt] = margin
            strata = ["listed" if q["listed"] else "absent", q["curriculum"]]
            if q["listed"]:
                strata.append(q["source_form"])
            for kind in strata:
                group = groups.setdefault(fmt, {}).setdefault(kind, {"queries": 0, "correct": 0})
                group["queries"] += 1
                group["correct"] += margin > 0
        rows.append({"name": q["name"], "listed": q["listed"], "curriculum": q["curriculum"], "margins": margins})
    result = {"identity": identity, "inputs_sha256": sha(a.plan / "frozen-inputs.json"),
              "script_sha256": sha(Path(__file__)), "by_format": groups, "rows": rows,
              "scope": "Source TRAINING fit, ordinary HF scorer. No model updates, independent-test, node score or readiness claim."}
    save(a.plan / "source-training-fit.json", result)
    print(json.dumps(groups), flush=True)


if __name__ == "__main__":
    main()
