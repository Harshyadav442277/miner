# Release 2026-11-07 ~21:40 UTC (Nov 8 03:10 IST): every intent's schema fields under its own names — `1f43311`

The owner said "Yes, deploy it" for `3f136ac`. `1f43311` adds one fix the preview showed: EVENT_OUTCOME's
`resolved_yes` was `null` beside `outcome: "yes"`. Both commits change only `src/intent-fields.ts`.

| | |
|---|---|
| Build | `1f43311` on branch `claude/n1-v2-ids`. The registered YAML is unchanged since `8b6e4d3`, so registration 5135 needs no new signature |
| Previous production | `8b6e4d3`, `miner-l6uql9dui` |
| Previews | `3f136ac`: `miner-hxta9vcy2`. `1f43311`: `dpl_Aqq3y4rRRFMZzyKPNqf7SkNzAZiB` |
| Production | **`https://miner-7bo22h7r8-wukong4.vercel.app`** (`dpl_9WvUyyb7o9uBqYpsXLSDz5dXjzTU`). `promote` answered 409 "already current", and `vercel inspect` confirmed the alias |
| Rollback target | `https://miner-l6uql9dui-wukong4.vercel.app` (`dpl_HZoxe8XB3iU2m1tWkXu1wGNejeHZ`, `8b6e4d3`) |
| Unit | 924/924 |

## Schema conformance (`tools/schema-sweep.mjs`: each endpoint's own example question, fields checked against `/engine/v1/intents/<id>`)

| | ok | scored-field miss | minor |
|---|---|---|---|
| Before (`8b6e4d3`, `schema-sweep-before-8b6e4d3.txt`) | 11 | 22 | 9 |
| After (`1f43311`, production, `schema-sweep.txt`) | 25 | 6 | 11 |

The six left are probe artefacts, not field gaps:
- Two example questions use a `0x…` placeholder (tx lookup, fraud).
- A forecast question was sent to WEATHER_CHECK_TEMPERATURE, which scores a current reading.
- The filings example asks about one 10-Q.
- The onchain-metric example is a receipt question; `balance_gwei` belongs to a balance question.
- /generate failed once and answered on re-probe (60 words).

The mappings for these are unit-tested.

Preview probes (`preview-probes.txt`):

| Field | Value |
|---|---|
| fact check | `verdict` "False" (`verdict_detail` "contradicted") |
| event outcome | `outcome` "yes", `resolved_yes` true, `winner` "Seattle Seahawks" |
| stock price | `price_usd` 342.37 |
| financial data | `market_cap_usd` 52,489,583,708 |
| macro | `rate_pct` 4.1 |
| storm | `risk_level` LOW |
| DNS | `has_record` true |
| fraud | `verdict` "LOW", `risk_score` 0.05 |
| token supply | `total_supply` as a number, `total_supply_exact` as a string |
| sanctions, no match | `match_score` 0 |

## Gates

| Gate | First run | Re-run alone |
|---|---|---|
| unit + live suite | FAIL: the Routescan count was null (G281) | the test passed |
| hostile inputs | FAIL: 1 of 162, `/papers` "fetch failed" (no answer reached this machine) | 162/162 clean (`hostile-inputs-rerun.txt`) |
| verify-deploy, param shapes, intent answers, upstream health, no-regression | PASS | — |

`watch.txt`: registration 5135 is `active`, 497 ms. `availability.jsonl`: 41 of 41 routes up on the re-run. The first
sweep's `/macro (TypeError)` was this machine's fetch failing; three probes answered 200 in 0.4–0.6 s.

## Not checked

Whether these fields move any score. Stock price ranked 2nd without `price_usd`. Read the epochs after 21:40 UTC.
