# Correctness audit — 2026-10-21

Every one of the 36 registered intents, 154 questions in all: routed ones verbatim from
`tools/routed-questions.json` (marked "routed") and realistic ones written for the audit. Each answer
was compared with the primary source read directly, not through the miner.

| | |
|---|---|
| Production | `https://miner-wine.vercel.app` (`miner-q5qepqluk`), read 2026-10-21 08:20–08:45 UTC, one request at a time |
| Branch | `claude/correctness-audit-2026-10-21`, local server on the compiled branch, replayed 2026-10-21 ~19:05–19:35 UTC |
| Result, production | **110 pass, 17 partial, 27 fail** |
| Fixed on the branch | 22 of 27 fails, and one partial; unit 771 → 787, all green |
| Logged, not fixed | 5 fails and the remaining partials: GAPS G200–G202 |
| Removed | none: every fail is a reading or retrieval defect, not an intent that cannot be answered |

Files:
- `answers-production.json` — every production request URL, status, latency and full body.
- `answers-branch.json` — the same questions against the branch (built before `a0b2847`, the storm label).
- `source-met-norway.json` — MET Norway's own forecast for the weather places, fetched beside the production run.
- `table.md` — the per-intent tally and the full table: intent | question | our answer | source value |
  verdict | evidence | after.

Verdicts: **pass** = the answer agrees with the source and answers the question; **partial** = right
figures, but the question asked is not fully answered or an honest outage; **fail** = a wrong value, a
wrong subject, or an answer to a different question. Translations, sentiment and classification labels
were judged by the auditor; there is no primary source for them.

## Not checked

- Prices and gas moved between the miner's read and the source read (seconds to two minutes); agreement
  within that drift is a pass.
- Counts the source itself does not publish here were not re-derived: Routescan's transaction count for the
  Uniswap router, the explorer's 1,229 incoming transactions, NVD's 52,275-record survey, Tesla's XBRL revenue.
- STOCK_PRICE answers for TSLA and Reliance were compared with nothing but Yahoo, their own source; AAPL was
  checked against Nasdaq.
- The branch replay ran from this machine, where Polymarket and ip-api sometimes time out; where a branch
  answer is an outage, the fix is shown by its unit test instead.
- Licence questions (G189) are out of scope here.
