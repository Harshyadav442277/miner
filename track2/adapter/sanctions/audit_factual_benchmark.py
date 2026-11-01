"""Expose unsupported factual-readiness claims without replacing observed miner errors."""
import argparse
import collections
import json
from pathlib import Path

from collect_miners import save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    a = ap.parse_args()
    labels = {(r["capture"], r["row"]): r for r in json.loads((a.capture / "labels.json").read_text(encoding="utf-8"))}
    pairs = [json.loads(l) for l in (a.capture / "pairs.jsonl").read_text(encoding="utf-8").splitlines()]
    membership, preferred_match, source_roles, query_names = collections.Counter(), [], collections.defaultdict(collections.Counter), set()
    for p in pairs:
        good, bad = labels[tuple(p["chosen_capture"])], labels[tuple(p["rejected_capture"])]
        assert good["decision_label"] == "correct" and bad["decision_label"] == "incorrect"
        assert good["name"] == bad["name"] == p["name"]
        membership[str(good["expected"])] += 1
        preferred_match.append(float(good["claim"] > bad["claim"]))
        source_roles[good["miner_id"]]["chosen"] += 1
        source_roles[bad["miner_id"]]["rejected"] += 1
        query_names.add(p["name"])
    summary = json.loads((a.capture / "label-summary.json").read_text(encoding="utf-8"))
    match_baseline = sum(preferred_match)/len(pairs) if pairs else None
    rejection_only = sorted(k for k, v in source_roles.items() if v["rejected"] and not v["chosen"])
    reasons = []
    if not membership["True"] or not membership["False"]:
        reasons.append("observed errors do not cover both membership classes")
    if match_baseline is not None and max(match_baseline, 1-match_baseline) > .65:
        reasons.append("constant verdict preference solves too many pairs")
    if summary.get("longer_answer_baseline", 1) > .65:
        reasons.append("length-only preference solves too many pairs")
    if rejection_only:
        reasons.append("some providers occur only on the rejected side")
    if len(query_names) < 30:
        reasons.append("fewer than 30 distinct disagreement queries")
    result = {"pairs": len(pairs), "distinct_queries": len(query_names), "membership_counts": dict(membership),
              "always_prefer_match_baseline": match_baseline,
              "always_prefer_no_match_baseline": 1-match_baseline if match_baseline is not None else None,
              "length_baseline": summary.get("longer_answer_baseline"),
              "source_roles": {k: dict(v) for k, v in source_roles.items()},
              "factual_readiness_supported": not reasons, "blocking_reasons": reasons,
              "scope": "observed exact-SDN decisions only; no fabricated errors or global clearance claims"}
    save(a.capture / "factual-validity-audit.json", result)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
