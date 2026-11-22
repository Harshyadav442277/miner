# Release `76b11a1`, 2026-11-22: FINANCIAL_DATA market caps, research and search briefs, result logging

Owner: "improve according to last epochs. then merge and deploy everything" (2026-11-22). PR #47 merged as `76b11a1`.

| | |
|---|---|
| Build commit | `76b11a1` (main), deploy tree `C:\Users\hyada\tg-deploy\m76b11a1` |
| Preview | `miner-bd5j94rpf-wukong4.vercel.app` |
| Production | `miner-ge5ejbder-wukong4.vercel.app` (`dpl_GZSboFBsNoGF8sMYTzv9GEvX4Qke`), aliased ~14:05 UTC |
| Rollback target | `miner-lefeghzyl-wukong4.vercel.app` (`dpl_B4dRAz1D6s2yoevNoty1Uz1fR8eh`, `4f1f852`) |

## Gates

| Gate | Result | Note |
|---|---|---|
| Unit tests on the deploy tree | 1068/1068 | `unit.txt` |
| Preview: FINANCIAL from Vercel | 11/11 right asset | `preview-probes.txt`. "Bitcoin (BTC)" is Bitcoin at $1.22 tn (was a Bitcoin ETF), TRON is the coin, DASH is DoorDash, Visa $725 bn (was $189 bn), Alphabet $3.26 tn (was null), Berkshire $1.26 tn (was $0.5 bn), MicroStrategy is Strategy Inc (was a 3x ETF), Polygon resolves (G347 closed) |
| Preview: other routes | pass | Web Search briefs are whole sentences; ONCHAIN_METRIC tx_count; SSL; crypto price |
| Production: model briefs | 7 of 9 written by the model, all at most 80 characters | `production-briefs.txt`. One papers query fell back to its title; one research query hit an upstream outage and said so |
| Preflight on production | 7/7 | `preflight.txt` |
| Registration watch (6126) | endpoint ok, activation active | `watch.txt`, 14:12 UTC |
| RES log lines | present | `RES /ssl-check verdict=valid`. `/wallet-balance`'s verdict carries the balance, so the line logs a public value (G349) |

Score effect: not yet known. Read FINANCIAL_DATA and the research and search intents in the next epochs (TASKS.md).
