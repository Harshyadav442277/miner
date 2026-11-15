"""Join the benchmark pairs and the labelled miner pairs into the gated holdout and a report-only set.

    python build_holdout.py <holdout_miners.jsonl>

Rules, fixed on 2026-11-15 before any candidate adapter existed:

- Gated set (`holdout.jsonl`): all benchmark pairs, plus ONE miner pair per question, `format: text`
  (the extracted answer), drawn with a fixed seed from the pairs that do not involve our own miner.
  One row per question keeps rows independent, so the Wilson interval and the 30-pair resampling
  in the harness mean what they say.
- Report-only set (`holdout_report.jsonl`): every other miner pair, including the `body` rows (whole
  response bodies, where the service's own JSON layout can give the label away) and every pair that
  involves LiveCert (`related_party`). These are measured and reported by stratum, never gated.
"""
import json
import random
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
SEED = 20261115
KEEP = ("prompt", "chosen", "rejected", "kind", "format", "source", "related_party")


def load(path):
    return [json.loads(ln) for ln in Path(path).read_text(encoding="utf-8").splitlines() if ln.strip()]


def dump(path, rows):
    Path(path).write_bytes("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows).encode("utf-8"))


def main():
    miners = load(sys.argv[1])
    bench = load(HERE / "benchmarks.jsonl")
    rng = random.Random(SEED)
    by_q = {}
    for r in miners:
        if r["format"] == "text" and not r["related_party"]:
            by_q.setdefault(r["prompt"], []).append(r)
    picked = [rng.choice(by_q[q]) for q in sorted(by_q)]
    ids = {id(r) for r in picked}
    gated = [{k: r[k] for k in KEEP} for r in bench + picked]
    report = [{**{k: r[k] for k in KEEP}, "systems": r["systems"]} for r in miners if id(r) not in ids]
    dump(HERE / "holdout.jsonl", gated)
    dump(HERE / "holdout_report.jsonl", report)
    summary = {
        "seed": SEED, "gated_rows": len(gated), "report_rows": len(report),
        "gated_by_source": dict(Counter(r["source"] for r in gated)),
        "gated_miner_system_pairs": dict(Counter(r["systems"] for r in picked)),
        "gated_longer_chosen": {s: [sum(len(r["chosen"]) > len(r["rejected"]) for r in gated if r["source"] == s),
                                    sum(r["source"] == s for r in gated)] for s in ("truthfulqa", "halueval", "miners")},
        "report_by_format": dict(Counter(r["format"] for r in report)),
        "report_related_party": sum(r["related_party"] for r in report),
    }
    (HERE / "holdout.summary.json").write_text(json.dumps(summary, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
