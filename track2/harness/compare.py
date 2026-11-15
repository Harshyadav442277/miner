"""Paired comparison of two scorers measured on the same pairs (pure Python, seeded).

    python compare.py results.json --candidate ours --baseline champion [--set holdout] [--out cmp.json]

A scorer name is a package in results.json, or one of the answer-only baselines `@longer` and
`@shorter` (computed by measure.py on the same pairs). When a package named GENERIC is present the
candidate is also compared against it.

Per set:
- both_right / both_wrong / candidate_only / baseline_only: the 2x2 table of per-pair outcomes;
- mcnemar_p: exact two-sided McNemar (binomial on the discordant pairs, p = 0.5);
- diff and diff_ci95: candidate accuracy minus baseline accuracy, with a paired bootstrap interval
  (BOOT_DRAWS resamples of the pairs, fixed seed);
- p_pass_30: on SAMPLE_PAIRS pairs drawn with replacement from the measured pairs, the share of
  PASS_DRAWS draws where the candidate reaches MIN_RATE and beats the baseline by MARGIN, which is the
  network's promotion rule applied to a sample the size of its hidden round.
"""
import argparse
import json
import math
import random
import sys

SEED = 20261115
BOOT_DRAWS = 10_000
PASS_DRAWS = 10_000
SAMPLE_PAIRS = 30
MIN_RATE = 0.70
MARGIN = 0.02
GENERIC = "GENERIC"


def wilson(k, n, z=1.96):
    if n == 0:
        return [0.0, 1.0]
    p = k / n
    c = (p + z * z / (2 * n)) / (1 + z * z / n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return [round(c - h, 4), round(c + h, 4)]


def mcnemar_exact(b, c):
    """Exact two-sided McNemar p-value from the two discordant counts."""
    n = b + c
    if n == 0:
        return 1.0
    tail = sum(math.comb(n, i) for i in range(min(b, c) + 1)) / 2 ** n
    return min(1.0, 2 * tail)


def bootstrap_diff(cand, base, draws=BOOT_DRAWS, seed=SEED):
    """Paired percentile bootstrap 95% interval for mean(cand) - mean(base)."""
    n = len(cand)
    rng = random.Random(seed)
    d = [int(x) - int(y) for x, y in zip(cand, base)]
    stats = sorted(sum(d[rng.randrange(n)] for _ in range(n)) / n for _ in range(draws))
    return [round(stats[int(0.025 * draws)], 4), round(stats[min(draws - 1, int(0.975 * draws))], 4)]


def p_pass(cand, base, draws=PASS_DRAWS, k=SAMPLE_PAIRS, min_rate=MIN_RATE, margin=MARGIN, seed=SEED):
    """Share of k-pair resamples where cand >= min_rate and cand - base >= margin."""
    n = len(cand)
    rng = random.Random(seed)
    wins = 0
    for _ in range(draws):
        idx = [rng.randrange(n) for _ in range(k)]
        a = sum(cand[i] for i in idx) / k
        b = sum(base[i] for i in idx) / k
        if a >= min_rate - 1e-12 and a - b >= margin - 1e-12:
            wins += 1
    return round(wins / draws, 4)


def vector(results, name, set_name):
    """Per-pair correctness of a package or answer-only baseline on a set, plus the pair keys."""
    s_pairs = results["pairs"][set_name]
    if name.startswith("@"):
        b = results["baselines"][set_name][name[1:]]
        return b["correct"], s_pairs["pair_keys"]
    pkg = results["packages"][name]["sets"][set_name]
    return [r["correct"] for r in pkg["rows"]], [r["pair_key"] for r in pkg["rows"]]


def paired(results, cand_name, base_name, set_name):
    cand, ck = vector(results, cand_name, set_name)
    base, bk = vector(results, base_name, set_name)
    if ck != bk:
        raise ValueError(f"{cand_name} and {base_name} were not measured on the same pairs in {set_name}")
    n = len(cand)
    both_r = sum(a and b for a, b in zip(cand, base))
    both_w = sum((not a) and (not b) for a, b in zip(cand, base))
    c_only = sum(a and not b for a, b in zip(cand, base))
    b_only = sum(b and not a for a, b in zip(cand, base))
    acc_c, acc_b = sum(cand) / n, sum(base) / n
    return {"set": set_name, "candidate": cand_name, "baseline": base_name, "n": n,
            "candidate_accuracy": round(acc_c, 4), "baseline_accuracy": round(acc_b, 4),
            "candidate_wilson95": wilson(sum(cand), n), "baseline_wilson95": wilson(sum(base), n),
            "both_right": both_r, "both_wrong": both_w, "candidate_only": c_only, "baseline_only": b_only,
            "mcnemar_p": round(mcnemar_exact(c_only, b_only), 6), "diff": round(acc_c - acc_b, 4),
            "diff_ci95": bootstrap_diff(cand, base), "p_pass_30": p_pass(cand, base)}


def line(r):
    return (f"[{r['set']}] {r['candidate']} {r['candidate_accuracy']:.4f} {r['candidate_wilson95']} vs "
            f"{r['baseline']} {r['baseline_accuracy']:.4f} {r['baseline_wilson95']} n={r['n']} | "
            f"both_right={r['both_right']} both_wrong={r['both_wrong']} cand_only={r['candidate_only']} "
            f"base_only={r['baseline_only']} | McNemar p={r['mcnemar_p']} | diff={r['diff']:+.4f} "
            f"CI95={r['diff_ci95']} | P(pass on {SAMPLE_PAIRS} pairs)={r['p_pass_30']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("results")
    ap.add_argument("--candidate", required=True)
    ap.add_argument("--baseline", required=True)
    ap.add_argument("--set", action="append", help="default: every set in results.json")
    ap.add_argument("--out")
    a = ap.parse_args()
    results = json.load(open(a.results, encoding="utf-8"))
    sets = a.set or list(results["pairs"])
    against = [a.baseline]
    if GENERIC in results["packages"] and GENERIC not in (a.baseline, a.candidate):
        against.append(GENERIC)
    against += ["@longer", "@shorter"]
    out = []
    for s in sets:
        for b in against:
            try:
                r = paired(results, a.candidate, b, s)
            except (KeyError, ValueError) as exc:
                print(f"[{s}] {a.candidate} vs {b}: cannot compare: {exc!r}", file=sys.stderr)
                continue
            out.append(r)
            print(line(r))
    if a.out:
        json.dump(out, open(a.out, "w", encoding="utf-8"), indent=1)


if __name__ == "__main__":
    main()
