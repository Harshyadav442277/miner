"""Compare exact synthetic node scores with previously captured HF float32 scores."""
import argparse
import json
from pathlib import Path

from collect_miners import save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", type=Path, required=True)
    a = ap.parse_args()
    capture = a.plan / "synthetic-node-proof"
    results = {}
    for version, label in ((13, "before"), (17, "after")):
        hf = json.loads((a.plan / f"{label}.json").read_text())["holdout"]["rows"]
        by_name = {r["name"]: r for r in hf}
        node = json.loads((capture / f"v{version}-node-scores.json").read_text())
        differences, disagreements = [], 0
        for r in node["rows"]:
            reference = by_name[r["name"]]["forms"][r["source_id_metadata_only"]]
            differences.extend((abs(r["chosen"]["value"]-reference["correct_score"]),
                                abs(r["rejected"]["value"]-reference["wrong_score"])))
            disagreements += r["correct"] != (reference["correct_score"] > reference["wrong_score"])
        results[str(version)] = {"pairs": len(node["rows"]), "max_abs_logit_difference": max(differences),
                                 "ordering_disagreements": disagreements, "identity": node["identity"],
                                 "package_sha256": node["package_sha256"], "pairs_sha256": node["pairs_sha256"]}
        assert not disagreements and max(differences) < .001
    save(a.plan / "hf-node-fidelity.json", {"pass": True, "models": results,
         "scope": "Deterministic16-name synthetic slice,32 pairs. Export fidelity only; no genuine factual accuracy or registration claim."})
    print(json.dumps(results))


if __name__ == "__main__":
    main()
