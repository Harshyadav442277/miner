# Release `8a631d5`, 2026-11-23 ~23:20 UTC (2026-11-24 IST): classify, question-answering and holder-count zeros

Owner: "take the decision as per your recommendation. all i want is to win" (2026-11-24 IST). PR #56 (the other
session's `36e4e13`, already live) and PR #57 merged into main first, so main and production match.

| | |
|---|---|
| Build commit | `8a631d5` (main), deploy tree `C:\Users\hyada\tg-deploy\m8a631d5` |
| Preview | `miner-mwtkp115r-wukong4.vercel.app` |
| Production | `miner-3udefsmw1-wukong4.vercel.app` (`dpl_iBtj3VqNELw7JMhhLRQqpSJeN82K`) |
| Rollback target | `miner-1by7eu4j6-wukong4.vercel.app` (`dpl_GZ6oFR8b4ZxgnCVbM5AJS2g2eTt8`, `36e4e13`) |

## What the RES log showed, 2026-11-23

| Intent and epoch | Logged answer before the zero | Change |
|---|---|---|
| TEXT_CLASSIFICATION, epoch 46 (0 after 0.996) | `ambiguous error=degraded`, category empty, twice at ~22:28 UTC | The model gets a second 2.5 s reading when its 350 ms one missed; nothing is guessed (G244) |
| QUESTION_ANSWERING, epoch 46 (0 after 0.974) | `not_in_sources`, 22:37 UTC | A question with no passage gets a general-knowledge answer that says so |
| TOKEN_HOLDER_COUNT | `upstream_unavailable` on Base and Polygon, four times. Their Blockscout serves a Cloudflare challenge | For one named chain, GeckoTerminal's count, named as the source |

## Gates

| Gate | Result | Note |
|---|---|---|
| Unit tests on the deploy tree | 1090/1090 | `unit.txt` |
| Preview probes | pass | `preview-probes.txt`. Base USDC 12,642,959 holders and Polygon USDC 5,180,439, each "read from GeckoTerminal's token index"; classify, answer, NVDA market cap, web search and SSL correct |
| Preflight on production | 6/7, then 44/44 | `preflight.txt`. The intent-answers gate expected `upstream_unavailable` whenever Base Blockscout shed. With the gate updated to check a GeckoTerminal-served count against GeckoTerminal (commit `4ad5189`), production passes 44/44 (`intent-answers-rerun.txt`) |
| Registration watch (6126) | endpoint ok, activation active | `watch.txt`, 23:24 UTC |

Not fixed: NEWS_HEADLINES scored 0 in epoch 45 after Google News answered `upstream_unavailable`. The news source is
the owner's decision (G326). RESEARCH_QUERY, EVENT_OUTCOME and CODE_REVIEW zeros: their RES lines were not kept by the
archiver, so the cause is not established.
