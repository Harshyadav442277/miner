# Does `confidence` predict correctness? (2026-10-26)

`tools/calibration.mjs` joins the 2026-10-21 audit's verdicts (154 answers graded pass, partial or fail against
primary sources, `table.md`) with the `confidence` each answer carried (`answers-production.json`). A pass
counts 1, a partial 0.5 and a fail 0. Output: `calibration-oct21.txt` and `.json`.

## What it found

| Confidence | Answers | Observed right |
|---|---:|---:|
| 0 | 10 | 0.70 |
| 0.001–0.5 | 2 | 0.75 |
| 0.5–0.7 | 6 | 0.75 |
| 0.7–0.9 | 32 | 0.80 |
| 0.9–0.999 | 74 | 0.79 |
| 1.0 | 30 | **0.72** |

- **Brier score 0.210** (0 is perfect). 24 answers carried confidence ≥ 0.8 and were wrong.
- **Confidence barely separates right from wrong.** The 1.0 answers were the least often right, and the
  answers at 0 were right 70% of the time: they are honest outages, graded partial or pass.
- **The cause is structural.** Most intents emit one fixed value for every answer, for example 1.0 for every SSL,
  storm, forecast, translation, academic-search and extraction answer, and 0.95 for every gas, FX and filings
  answer. It is a per-intent level, not a per-answer judgement.

## What was changed, and why not more

With about four graded answers per intent, re-deriving per-intent values would be fitting noise. One rule was
written down instead, and applied only where answers broke it.

**The rule.** 1.0 is reserved for a direct read of the authoritative record of exactly what was asked.

**Two changes:**
- `translate.ts` now gives 0.9, not 1.0. A machine translation is a model's output; the other model-backed
  answers carry 0.6–0.8. It is not lower because all four audited translations passed.
- `papers.ts` gives a topic search 0.8, not 1.0. The papers are real records, but OpenAlex ranks relevance and
  nothing verifies it; the audited academic fails were relevance or reading errors at 1.0. An exact-title
  match keeps 1.0.

`docs/INTEGRATE_LIVECERT.md` now tells app builders what the number means, and that it is not yet a calibrated
probability.

## Limits

- These are the Oct 21 answers. 22 of the 27 fails were fixed and deployed on 2026-10-23, so a re-run on
  current production would grade differently. The confidence values themselves, apart from the two changes
  above, are unchanged.
- **Next:** grade a fresh, larger set on current production, at least 10 per intent, before claiming a
  calibrated probability.
