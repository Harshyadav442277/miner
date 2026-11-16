"""Minimal-pair bias probes for a QUESTION_ANSWERING package, built from the v1 VAL split only (never the holdout).

    python -I bias_probes.py C:/Users/hyada/tg-eval/pairs/question_answering_v1 --out probes-dir

Uses val rows of kinds wrong_entity / wrong_number_or_date (their meta has the gold answer `gold_text` and the
wrong answer `r_ans`). Writes five 60-pair sets; score them with harness/measure.py. A wording-neutral scorer
should land near 0.5 on A1/A2 together and on B1/B2 together; a scorer that knows the fact scores high on all.
  A1  chosen "It is not {wrong}."          rejected "It is {wrong}."          (true negation vs false claim)
  A2  chosen "It is {gold}."               rejected "It is not {gold}."       (true claim vs false negation)
  B1  chosen "{gold}"                      rejected "The answer to "{q}" is {wrong}."
  B2  chosen "The answer to "{q}" is {gold}."   rejected "{wrong}"
  C   chosen "{gold}"                      rejected "{wrong}"                 (knowledge only)
"""
import argparse
import json
import random
import sys
from pathlib import Path

N, SEED = 60, 20261116


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pairs_dir", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    rows = [json.loads(l) for l in (a.pairs_dir / "val.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    meta = [json.loads(l) for l in (a.pairs_dir / "val.meta.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    pool = [(r["prompt"], m["gold_text"], m["r_ans"]) for r, m in zip(rows, meta)
            if m.get("kind") in ("wrong_entity", "wrong_number_or_date") and m.get("gold_text") and m.get("r_ans")
            and m["gold_text"].strip().lower() != str(m["r_ans"]).strip().lower()]
    rng = random.Random(SEED)
    rng.shuffle(pool)
    pool = pool[:N]
    sets = {
        "A1": [(q, f"It is not {w}.", f"It is {w}.") for q, g, w in pool],
        "A2": [(q, f"It is {g}.", f"It is not {g}.") for q, g, w in pool],
        "B1": [(q, g, f'The answer to "{q}" is {w}.') for q, g, w in pool],
        "B2": [(q, f'The answer to "{q}" is {g}.', w) for q, g, w in pool],
        "C": [(q, g, w) for q, g, w in pool],
    }
    a.out.mkdir(parents=True, exist_ok=True)
    for name, pairs in sets.items():
        with open(a.out / f"{name}.jsonl", "w", encoding="utf-8", newline="\n") as fh:
            for q, c, r in pairs:
                fh.write(json.dumps({"prompt": q, "chosen": c, "rejected": r, "kind": name, "format": "probe",
                                     "source": "question_answering_v1 val split"}, ensure_ascii=False) + "\n")
    print(json.dumps({"pool": len(pool), "sets": {k: len(v) for k, v in sets.items()}}))


if __name__ == "__main__":
    sys.exit(main())
