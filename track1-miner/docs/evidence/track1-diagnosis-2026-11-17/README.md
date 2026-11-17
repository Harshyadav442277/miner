# Track 1 diagnosis, 2026-11-16 18:20–19:00 UTC (Nov 17 IST)

Owner brief (2026-11-16): diagnose every weak or unscored intent from the network's own view; fix or remove; batch
manifest changes into one signed `updateMiner`. Checked by Claude; nothing signed or posted.

## State at the start

| Claim | Evidence | Checked at |
|---|---|---|
| Registration **5292** active: `livecert`, wallet `0xdad2…a39e`, YAML `04c0e9f`, SHA-256 `3cf18081…5fb13d`, 44 intents, no rejection | `registration-5292.json` (`GET /api/miners/5292`) | 18:29 UTC |
| 5232 is `superseded` | `GET /api/miners/5232` | 18:22 UTC |
| `REGISTRATION_ID` repository variable = 5292 | `gh variable list -R Harshyadav442277/miner` | 18:30 UTC |
| The 96,353-byte YAML was accepted (closes G320) | 5292 carries its hash | 18:29 UTC |
| `claude/n1-v2-ids` is fully merged: 0 ahead of and 67 behind `origin/main`. Current work is `main`, not that branch | `git rev-list --left-right --count` | 18:20 UTC |

## The "14 unscored" were mostly not unscored

`/api/miners` shows only each miner's latest scored epoch, and the node does not test every intent in every epoch.
From the saved leaderboards (epochs 2099, 2103, 2105 and 2107, `C:\Users\hyada\tg-deploy\scores\leaderboards`), only
three of the brief's 14 lack a LiveCert score:

- **DNS_RECORD_LOOKUP:** dormant network-wide. No miner has been scored on it since epoch 2019.
- **WEB_SEARCH:** dormant network-wide. No miner has been scored on it since epoch 2097.
- **REGULATORY_FILING_MONITOR:** the field was scored in 2107 and we were not.

The other 11 have scores; see `before/intent-table.md`. Build the table with:
`node track1-miner/tools/intent-table.mjs <leaderboards-dir> <out> missions/matrix.json`.

## Before table

The full table is in `before/intent-table.md`. "Missions" is the number of the 15 missions whose pages name the
family (`missions/matrix.json`, read 18:30 UTC). Every score below is from 5232; 5292 has no score yet.

| Intent | Missions | Epoch | Score | Rank | Top | Decision |
|---|---|---|---|---|---|---|
| REGULATORY_FILING_MONITOR | 7 | — | unscored | — | 0.5 (5 tied) | **Fixed in `14b6d98`.** A non-registrant entity now gets a Federal Register count. 5292 also maps `period`. Watch |
| EVENT_OUTCOME_RESOLUTION | 4 | 2107 | 0.0024 | 21/38 | 0.4082 (F1 scoreboard) | **Remove at the next YAML** unless a licence-clean results source is proven first. We answer honestly ("no market found, none guessed"); the node asks about game results we cannot source |
| GAS_PRICE | 1 | 2107 | 0 | 10/11 | 0.4973 | **Cause unknown (G310).** Our value equals `eth_gasPrice` to the wei (0x9cfe2ec = 0.164618988 gwei, 18:27 UTC). No `/gas-price`-shaped line (`[chain,__path]`) is among the log lines returned for 17:33–18:14 UTC. That is not proof of absence: the 18:05–18:10 window returned exactly the CLI's 50-line cap, and the shape is a guess at the route. The log now records the route and `chain`. Decide after two epochs under 5292: fix from the logs, or remove |
| SENTIMENT_ANALYSIS | 3 | 2105 | 0.6751 | 14/21 | 0.996 | **Hold.** 5292 adds `score` and `reason` outputs and maps `text`. Read two epochs before touching it |
| CRYPTO_TRANSFER_VERIFY | 5 | 2107 | 0.3765 | 2/25 | 0.5 | Field-wide low; rank 2. Watch |
| URL_SCAN_VERDICT | 0 | 2107 | 0.5406 | 6/8 | 0.5879 | Field-wide ~0.54. The schema has `true_when` and no `false_when`. No Track 2 conflict: that adapter lane was closed under its kill rule (`claude/url-scan-adapter`, `7bae3d4`). **Removal candidate**, since no mission buys it |
| RESEARCH_QUERY | 1 | 2107 | 0.7778 | 10/28 | 0.9996 | One-epoch drop from 0.972. Watch |
| QUESTION_ANSWERING | 13 | 2107 | 0.921 | 9/17 | 0.9943 | One-epoch drop from 0.995. It is the highest-demand gap, so read the next epoch first |
| STORM_ALERT | 0 | 2107 | 0.8801 | 11/19 | 0.9932 | Watch |
| WEATHER_FORECAST | 0 | 2107 | 0.9071 | 12/26 | 0.9829 | Watch |
| NEWS_SEARCH | 0 | 2107 | 0.8708 | 12/20 | 0.9992 | Watch |
| CVE, SANCTIONS, CODE_REVIEW, CORPORATE_REGISTRY, MACRO, CURRENCY | — | 2107 | 1.0 | — | 1.0 | **Ties at the top**, not rank gaps: the rank only orders the tie |
| SECURITY_REVIEW | 2 | — | new in 5292 | — | 0.9864 | First score pending. No Track 2 conflict (`claude/security-review-adapter` lane closed, `1b93a9a`) |

## Reliability, capacity, cost

- **Availability** (`availability.md`): 45 sweeps, 2026-11-04 to 2026-11-16. 43/45 sweeps had every endpoint up, and
  1649/1653 calls (99.76%) were answered.
  - The record is thin: the `uptime` workflow is scheduled every 30 minutes, but GitHub ran it 45 times in 12 days (G311).
  - p50 and p90 per endpoint are in the report. p95 is not computed.
- **Capacity** (`capacity-ssl-c10-60s.json`): 10 concurrent callers for 60 s on `/ssl-check`.
  - 1,691 requests, 0 errors, 28.2 requests a second.
  - p50 301 ms, p99 1,385 ms. Uncached: 540 calls, p90 495 ms.
  - These are our own direct calls: capacity evidence, never use.
- **Upstream cost per request: $0.** Three free keys have quotas that can run dry under load: Groq (chat, sentiment,
  translate), OpenAlex (daily meter) and NVD (rate limit). The report names them per endpoint.

## Request log

Vercel keeps about an hour of request logs on this plan: the oldest line was 17:33 UTC when read at 18:30. The CLI
returns at most 50 lines a call.

- `14b6d98` logs the values of `__path`, `chain`, `record_type`, `type`, `period`, `form`, `target_language` and
  `window_hours`. Every other param is logged by name only.
- `track1-miner/tools/archive-requests.mjs` keeps the lines past the hour, to `C:\Users\hyada\tg-deploy\scores\requests.jsonl`.
- Wiring the archiver into the 30-minute recorder (`record.cmd`) was refused twice by the permission check, so it is
  the owner's step.

## Not verified

- Every score effect: 5292 is 40 minutes old and unscored.
- Why GAS_PRICE scores 0.
- What the node's REGULATORY_FILING tests ask.
- Whether a licence-clean sports-results source exists. None was checked for terms.
