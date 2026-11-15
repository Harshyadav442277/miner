"""The registration gate: PASS only if a candidate adapter clearly beats the champion on a frozen holdout.

    python gate.py --results results.json --freeze holdout.freeze.json --candidate ours --champion champion
    python gate.py --results results.json --freeze holdout.freeze.json --candidate ours   # no champion: GENERIC

Prints PASS or FAIL with every reason; exit code 0 on PASS, 1 on FAIL. Every rule is a constant below.
When the family has no champion, omit --champion: the candidate is held to the same rules against the
package named GENERIC in results.json, and the output says so.
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import compare  # noqa: E402
import freeze as freezer  # noqa: E402

MIN_PAIRS = 100           # fewer pairs cannot separate a 2-point margin from noise at all
MARGIN = 0.02             # the network's replacement margin: beat the champion by 2 points
MIN_WILSON_LOW = 0.70     # the network's floor, on the lower end of the 95% interval, not the point
LENGTH_MARGIN = 0.05      # must beat longer-wins and shorter-wins by 5 points
MAX_LONGER_BASELINE = 0.65  # above this the holdout is length-confounded and proves nothing
MIN_P_PASS_30 = 0.60      # resampled chance of passing a 30-pair hidden round against this champion
GENERIC = "GENERIC"


def evaluate(results, frozen, candidate, champion, set_name):
    """Return (reasons_failed, notes). Empty reasons_failed means PASS."""
    fails, notes = [], []
    if champion is None:
        champion = GENERIC
        notes.append("no champion given for this family: comparing against the GENERIC baseline package")
    src = results["pairs"].get(set_name)
    if src is None:
        return [f"set {set_name!r} not in results"], notes
    if src["sha256"] != frozen["sha256"]:
        fails.append(f"holdout hash {src['sha256']} != frozen {frozen['sha256']}")
    if src.get("limit") and src["pairs"] < src.get("file_rows", src["pairs"]):
        notes.append(f"only the first {src['pairs']} of {src['file_rows']} frozen rows were measured")
    for name in (candidate, champion):
        if name not in results["packages"]:
            fails.append(f"package {name!r} not in results")
    if fails:
        return fails, notes
    try:
        r = compare.paired(results, candidate, champion, set_name)
    except ValueError as exc:
        return fails + [str(exc)], notes
    n, acc, base = r["n"], r["candidate_accuracy"], r["baseline_accuracy"]
    notes.append(compare.line(r))
    if n < MIN_PAIRS:
        fails.append(f"n = {n} pairs < {MIN_PAIRS}")
    if acc < base + MARGIN - 1e-9:
        fails.append(f"candidate {acc:.4f} < {champion} {base:.4f} + {MARGIN}")
    if r["candidate_only"] <= r["baseline_only"]:
        fails.append(f"candidate-only-right {r['candidate_only']} <= {champion}-only-right {r['baseline_only']}")
    if r["candidate_wilson95"][0] < MIN_WILSON_LOW:
        fails.append(f"candidate Wilson lower bound {r['candidate_wilson95'][0]} < {MIN_WILSON_LOW}")
    longer = results["baselines"][set_name]["longer"]["accuracy"]
    shorter = results["baselines"][set_name]["shorter"]["accuracy"]
    notes.append(f"length baselines: longer-wins {longer:.4f}, shorter-wins {shorter:.4f}")
    if longer > MAX_LONGER_BASELINE:
        fails.append(f"holdout unusable: longer-answer-wins scores {longer:.4f} > {MAX_LONGER_BASELINE} "
                     "(length alone separates the pairs)")
    for label, b in (("longer-answer-wins", longer), ("shorter-answer-wins", shorter)):
        if acc < b + LENGTH_MARGIN - 1e-9:
            fails.append(f"candidate {acc:.4f} < {label} {b:.4f} + {LENGTH_MARGIN}")
    if r["p_pass_30"] < MIN_P_PASS_30:
        fails.append(f"P(pass a {compare.SAMPLE_PAIRS}-pair round vs {champion}) = {r['p_pass_30']} < {MIN_P_PASS_30}")
    return fails, notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True)
    ap.add_argument("--freeze", required=True)
    ap.add_argument("--candidate", required=True)
    ap.add_argument("--champion", help="package name of the family's champion; omit when there is none")
    ap.add_argument("--set", default=None, help="results set measured on the frozen holdout (default: the only set)")
    a = ap.parse_args()
    results = json.load(open(a.results, encoding="utf-8"))
    fails, notes = [], []
    try:
        frozen = freezer.verify(a.freeze)
    except freezer.FreezeError as exc:
        frozen = json.loads(Path(a.freeze).read_text(encoding="utf-8")) if Path(a.freeze).exists() else None
        fails.append(f"freeze check failed: {exc}")
    set_name = a.set
    if set_name is None:
        sets = list(results["pairs"])
        set_name = sets[0] if len(sets) == 1 else None
        if set_name is None:
            fails.append(f"several sets in results ({sets}); pass --set")
    if frozen and set_name:
        f2, notes = evaluate(results, frozen, a.candidate, a.champion, set_name)
        fails += f2
    for n in notes:
        print("note:", n)
    for f in fails:
        print("FAIL:", f)
    print("PASS" if not fails else "FAIL")
    sys.exit(0 if not fails else 1)


if __name__ == "__main__":
    main()
