# Release 2026-11-16: sentiment score, storm fields, news relevance and budget, gas freshness

Builds `3d4d51b` (production `miner-cr0iiimd4`, deployed 2026-11-15 ~20:30 UTC) and `f3ba9f4` (production
`miner-2yrp4fuh8`, `dpl_C34UEGsqutYsi7deeVKCpaAgXpdm`, 2026-11-16 08:15 UTC). Rollback target: `miner-712vfn5wr`
(`7182410`). Registration 5232 and `miner.yaml` unchanged.

## Scores (source: `/api/miners`, slug livecert)

| Intent | Before | After | Build scored | Scored at (UTC) |
|---|---|---|---|---|
| FACT_CHECK_GENERAL | 0.8432, rank 11/19 (epoch 2099, 69afe87) | **0.9871, rank 4** (epoch 2103) | 3d4d51b (fact-check rating from 7182410) | 2026-11-16 05:20 |
| STORM_ALERT_GENERAL | 0.8835, rank 12/17 (2099) | **0.9633, rank 7** (2103) | 3d4d51b | 05:44 |
| SENTIMENT_ANALYSIS_GENERAL | 0.5446 (2093) → 0.7464 (2099) | 0.7632, rank 14 (2103) | 3d4d51b | 04:23 |
| NEWS_SEARCH_GENERAL | 0.7293 (2093) → 0.9217 (2099) | 0.9176, rank 11 (2103) | 3d4d51b | 04:55 |
| GAS_PRICE_GENERAL | 0, rank 11/26 (2103; RPC miners 0.79–1.0) | not yet scored | f3ba9f4 | — |

One epoch per intent: the field also moves between epochs, so a single reading is evidence, not proof.

## What changed

- `prose-phrase.ts`: the model also returns a score (-1 to 1); the served `score` agrees with the label (model's,
  else the word list's when it fits, else the label's midpoint). Tones that contradict the label are dropped.
  Before: "Five stars, would buy again" went out Positive with score 0 and tone "frustrated".
- `storm.ts`, `intent-fields.ts`: `risk_level` is the grade the reason states (Miami at 0.27 said "graded low"
  beside MODERATE); `precipitation_mm` is the window's total; `window` is the hours asked for, noting when 6-hour
  forecast steps cover more.
- `newssearch.ts`: one 9.5 s budget for both search passes and the brief (was 8 + 8 + 2.5 s, past the 11 s
  watchdog); a subject with a capitalised name needs that name in the headline ("Tesla recall" served two Nio
  articles).
- `handler.ts`: a gas reading is reused for 5 s, not 60 s. Ethereum `eth_gasPrice` moved 7.5% within one minute
  (publicnode, sampled every 6 s). After deploy, 8 paired reads of ours and publicnode's matched to 0.00%.
- `scores.yml`, `record-scores.mjs`: six attempts an hour plus one after each uptime run; each epoch's whole
  leaderboard is kept as an artifact.

## Gates

Unit 1020/1020, tsc clean (deploy tree, `f3ba9f4`). Preflight: see `preflight.txt`. On `3d4d51b` it was 6/7; the
failing gate was the checker's own Blockscout reference (block lookup timed out after 15 s and the tx lookup
answered 500 when called directly from here), not a miner answer.

## Latency (production, 6 distinct requests per route, median / max ms)

| Route | 69afe87–7182410 | 3d4d51b |
|---|---|---|
| /sentiment | 888 / 933 | 969 / 1155 |
| /fact-check | 1133 / 1635 | 976 / 1371 |
| /news-search | 1532 / 8102 | 1786 / 2484 |
| /event-outcome | 1211 / 2172 | 1038 / 1463 |
| /storm-alert | 329 / 627 | 422 / 568 |

Medians did not move beyond noise. The news-search worst case is now capped by the budget; the 8.1 s outlier was
not reproduced, so the cap is what changed, not a measured median.

## Not verified

- GAS_PRICE's next score, and whether its 0 came from staleness (the inference) or from something else.
- The scorer's tolerance for any deterministic intent.
- GitHub's schedule: runs at 21:00, 00:10, 00:58, 06:37 and 07:55 UTC, so gaps of up to 5.6 h remain. A local
  30-minute task was prepared (`C:\Users\hyada\tg-deploy\scores\record.cmd`) but registering it was refused by the
  permission check; the owner can register it.
