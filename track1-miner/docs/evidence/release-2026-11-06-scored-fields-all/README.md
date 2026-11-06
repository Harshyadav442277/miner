# Release 2026-11-06 ~16:09 UTC (21:39 IST): every intent's scored field, current temperature, all-forms filing count

Owner's authorisation: "dont worry about outreach. and about other things, take required actions" (2026-11-05),
given after the red-flag list that named these fixes; then "Try again" on 2026-11-06.

| | |
|---|---|
| Build commit | `7301474`. The miner diff against the previous release `e501a57` is `src/intent-fields.ts`, `src/handler.ts`, `src/currentweather.ts`, `src/filings.ts` and their tests only |
| Change | (1) `sendAnswer` adds each intent's scored field by path, copied from a value the route already states, never over a field the route sets: `certificate_valid`, `gas_price_gwei`, `converted_amount`, `holders_count`, `price_usd`, `block_number`, `balance`, `resolved_yes`, `safe`, `detections`, `temperature_c`. (2) "What is the temperature in X?" is answered with the current reading, not a 24-hour range. (3) `filing_count` counts every EDGAR form unless a form is asked, as zk-filing does |
| Unit | 906/906 in the deploy tree `C:/Users/hyada/tg-deploy/m7301474` |
| Preview | `https://miner-3vdz9kaxs-wukong4.vercel.app`, `dpl_CdrR1SAZGGJTg1oDwSfLRshj8ZY1`; `preview-probes.txt`, 15/15 routes carry their scored field with a value |
| Production | `https://miner-qbdf1756n-wukong4.vercel.app`, `dpl_GpEmJonx142NQZfeGTHNeVcNqGyt`; `promote` answered 409 "already the current production deployment", and `vercel inspect miner-wine.vercel.app` names it |
| Rollback target | `https://miner-mzapr28vo-wukong4.vercel.app` (`dpl_3rEwsNuVz6tkfnjQ4p5KAUy2qQJw`, `e501a57`, the fact-check release) |

## Gates (`preflight.txt`, production, ~16:10–16:15 UTC)

**7/7 on the first run**: unit + live suite, verify-deploy, param shapes, intent answers, hostile inputs,
upstream health, no-regression (8 identical, 0 differ). `watch.txt`: registration 4829 `active`, endpoint ok in
336 ms (2026-11-06 16:15:52 UTC).

## The change, on production

- `audit-production-7301474.json`: 24 of 26 routes that answered the audit question carry every scored field
  of their intent. Before (`../scored-fields-2026-11-05/audit-production-77e1141.json`) 11 did not. The two left
  are deliberate: FRAUD_DETECTION's `risk_score` (no number behind the verdict) and FINANCIAL_DATA's
  `market_cap_usd` (refused on its licence).
- Apple, last 12 months: `filing_count` 91 on the preview (2025-11-06 to 2026-11-06); zk-filing's public endpoint
  gave 91 for the same window at the same time (`../scored-fields-2026-11-05/zk-filing-aapl.json` holds the
  first comparison, 89 = 89 on 2026-11-05).
- "What is the temperature in Lagos?" → `temperature_c` 29.1, `window_hours` 0; a 24-hour forecast question
  still gets the range and `temperature_c: null`.

## Before (`epochs-before.json`, read ~16:20 UTC)

| Intent | Last four epochs before this release (rank, score) |
|---|---|
| REGULATORY_FILING_MONITOR_GENERAL | 10th 0.8749, 12th 0.8154, 10th 0.9063, 13th 0.8701 (third place 0.9935–0.9981) |
| WEATHER_CHECK_TEMPERATURE | 10th 0.608, 8th 0.675, 2nd 0.5625, 9th 0.600 |
| ONCHAIN_TX_LOOKUP_GENERAL | 2nd 0.5697, 2nd 0.6674, 3rd 0.5594, 1st 0.8624 |
| SSL_VERIFICATION_CERT | 3rd at each: 0.9928, 0.9807, 0.9898, 0.996 |
| CRYPTO_PRICE_USD | 10th 0.973 at 2021; **no score for us at 2022, 2024, 2026** while 46–48 miners were scored |

## Not checked

- Whether the scores move: read the next epochs with `tools/epoch-history.mjs` against this table.
- Why CRYPTO_PRICE_USD stopped scoring us after epoch 2021 (GAPS G264).
