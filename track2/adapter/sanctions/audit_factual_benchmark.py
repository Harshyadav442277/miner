"""Expose unsupported factual-readiness claims without replacing observed miner errors."""
import argparse
import collections
import json
from pathlib import Path
import sys

from tokenizers import Tokenizer

from collect_miners import save

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from score_pairs import render


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    ap.add_argument("--tokenizer", type=Path)
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
    raw_length_baseline = sum((len(p["chosen"]) > len(p["rejected"])) + .5*(len(p["chosen"]) == len(p["rejected"]))
                              for p in pairs)/len(pairs) if pairs else None
    runtime = None
    if a.tokenizer:
        full = Tokenizer.from_file(str(a.tokenizer))
        lengths = [(len(full.encode(render(p["prompt"], p["chosen"])).ids),
                    len(full.encode(render(p["prompt"], p["rejected"])).ids)) for p in pairs]
        shown = [(min(c, 256), min(r, 256)) for c, r in lengths]
        runtime = {"max_tokens": 256, "texts": 2*len(pairs),
                   "texts_truncated": sum(n > 256 for pair in lengths for n in pair),
                   "visible_token_length_baseline_tie_aware": sum((c > r)+.5*(c == r) for c, r in shown)/len(shown) if shown else None,
                   "visible_length_tied_pairs": sum(c == r for c, r in shown),
                   "decisive_verdict_visibility": "not audited within truncated responses"}
    reasons = []
    if not membership["True"] or not membership["False"]:
        reasons.append("observed errors do not cover both membership classes")
    if match_baseline is not None and max(match_baseline, 1-match_baseline) > .65:
        reasons.append("full-response labels admit a constant-verdict shortcut")
    if raw_length_baseline is not None and raw_length_baseline > .65:
        reasons.append("full-body character length confounds the dataset")
    if runtime and runtime["visible_token_length_baseline_tie_aware"] is not None and runtime["visible_token_length_baseline_tie_aware"] > .65:
        reasons.append("visible-token-length preference exceeds 65%")
    if rejection_only:
        reasons.append("some providers occur only on the rejected side")
    if len(query_names) < 30:
        reasons.append("fewer than 30 distinct disagreement queries")
    if runtime is None or runtime["texts_truncated"]:
        reasons.append("decisive-claim visibility within the token budget is not fully audited")
    result = {"pairs": len(pairs), "distinct_queries": len(query_names), "membership_counts": dict(membership),
              "always_prefer_match_baseline": match_baseline,
              "always_prefer_no_match_baseline": 1-match_baseline if match_baseline is not None else None,
              "length_baseline": summary.get("longer_answer_baseline"),
              "full_body_character_length_baseline_tie_aware": raw_length_baseline,
              "baseline_note": "Raw character length and full-response verdict preference are dataset diagnostics; they may use fields outside the scorer token window",
              "runtime_visibility": runtime,
              "source_roles": {k: dict(v) for k, v in source_roles.items()},
              "factual_readiness_supported": not reasons, "blocking_reasons": reasons,
              "scope": "observed exact-SDN decisions only; no fabricated errors or global clearance claims"}
    save(a.capture / "factual-validity-audit.json", result)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
