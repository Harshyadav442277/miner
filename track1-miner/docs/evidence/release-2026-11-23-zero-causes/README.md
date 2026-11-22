# Release `8ef874f`, 2026-11-22 ~19:10 UTC (2026-11-23 IST): epoch-39 zero causes, registry jurisdiction, filing windows

Owner: "Build and deploy" the five fixes (2026-11-23 IST). PRs #50 (`c7b27fa`, deployed at ~18:55 UTC as
`miner-aubhcq1me`) and #51 (`8ef874f`, a gap found on that production) merged into main.

| | |
|---|---|
| Build commit | `8ef874f` (main), deploy tree `C:\Users\hyada\tg-deploy\m8ef874f` |
| Previews | `miner-3gfy6hjti` (`c7b27fa`), `miner-l5b5sjl6y` (`8ef874f`) |
| Production | `miner-bk9insot7-wukong4.vercel.app` (`dpl_BfJXp7P13QwEgh7fD1hUtaCo6ozS`) |
| Rollback target | `miner-ge5ejbder-wukong4.vercel.app` (`dpl_GZSboFBsNoGF8sMYTzv9GEvX4Qke`, `76b11a1`) |

## Gates

| Gate | Result | Note |
|---|---|---|
| Unit tests on the deploy tree | 1074/1074 | `unit.txt` |
| Preview probes | pass | `preview-probes.txt`: Apple Inc. in US-DE is `not_found`, in US-CA `found`. Apple's filings for August 2026: 4, the same four EDGAR lists. lodash@4.17.15: Insecure, 5. A bare "lodash" is `unknown` with no model on the preview, never Secure. On-chain tx_count 5970; bitcoin $1.22 tn; SSL valid |
| Production, model paths | pass | "lodash" and "a login form that builds SQL queries from user input" are each reviewed (Insecure, 1 finding). The exercise synthesis brief is "Yes, regular exercise reduces depression symptoms." The `single_source` gap found here was fixed in #51 |
| Preflight on production | 6/7, then 7/7 | `preflight.txt`. The failing gate was one live test: the Uniswap V2 router's creation transaction against Blockscout ("count null implausible"). It passed alone on re-run (`preflight-rerun.txt`: 1200/1202 in the full re-run, then the test alone passed). The tx-lookup code is unchanged since `76b11a1` |
| Registration watch (6126) | endpoint ok, activation active | `watch.txt`, 19:14 UTC |

Not fixed: Nasdaq's quote API answered "Error while calling vendor" at 18:55 UTC. Visa's market cap is null when it
fails and the cache is cold (GAPS G353). Score effect: read the next epochs.
