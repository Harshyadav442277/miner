# SENTIMENT_ANALYSIS adapter lane (opened 2026-11-23, stopped 2026-11-24)

**Stopped: not to be registered.** #216 (`0xfec66e…`) became champion at 100% (`/api/wasm`, 2026-11-24 and
2026-11-25). A challenger has to beat the incumbent's win rate, and 100% cannot be beaten.

**Related party:** LiveCert serves this intent. That is disclosed, and nothing here names or formats a LiveCert answer
(ARCHITECTURE A7).

## Data: [generate_pairs.py](generate_pairs.py) (v1)

- **Source:** `fancyzhx/amazon_polarity`, Apache-2.0 on its card; the label is the reviewer's own star rating (1–2
  Negative, 4–5 Positive). The pool is described as UCI Amazon/IMDb/Yelp review sentences (bounties #152), so a
  different source was chosen and no pool sentence can be in training.
- **Better answer:** the right polarity, with a reason quoting part of the review.
- **Worse answer:** the same style at about the same length, with the opposite polarity, or "neutral" for a clearly
  polar review.
- Split by row hash (a fixed fifth is test-only); `probe.jsonl` uses an answer style training never sees.

## Result

sa_v1 (rank 8, alpha 32, 3 epochs, lr 1e-4, 4,000 pairs), from `tg-eval/runs-v2/sa_v1/result.json`:

| Check | Value |
|---|---|
| Kit pairwise accuracy, test (400) | 95.75% |
| Kit length baseline | 53.0% |
| Dataset gate | PASS: unique negatives 100%, largest negative 0.03%, length shortcut 59.7%, held-out leak 0%, surface probe 57.0% |
| Node-runtime measurement | not run: the family closed before it was needed |

**LiveCert self-check (G56):** LiveCert's own sentiment endpoint refused 10 of 60 frozen texts as "no text" and called
clearly polar reviews "Neutral"; 12 such wrong answers are kept as pairs with LiveCert's answer as the worse one. They
were never used, because the lane closed first.
