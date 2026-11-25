# Release 2026-11-25 — `1cbd7f4`: cross-chain reference shape (logging only)

No answer changed. `/cross-chain` logs `XCHAIN no_reference ref=<shape> chains=<n> proof=<0/1>` when it answers
`no_reference`, the shape never the value (G369).

| | |
|---|---|
| Build commit | `1cbd7f4` (branch `PR/xchain-shape-archiver-2026-11-25`, from main `72564a5`) |
| Miner commits | `256b841` shape log; `1cbd7f4` hex without 0x labelled `hex<n>`. Tools only: `c0a18c1` archiver, `8ce6dae` epoch-history |
| Preview | `https://miner-c5w5dx9fa-wukong4.vercel.app` (and `miner-ijeytr8am` at `8ce6dae`) |
| Production | `https://miner-a3k2j7mfd-wukong4.vercel.app`, `dpl_2iZdZvzi22bdyufsbq6XEp2dUdA8`; promote answered 409 (already current) |
| Rollback | `miner-1hem8iuy0` (`cc9a51c`, `dpl_7WxvntGK3GmMuax8RAjz4fzT92En`) |
| Deploy tree | `C:\Users\hyada\tg-deploy\m8ce6dae`, checked out at `1cbd7f4` |

## Gates (2026-11-25 14:00–14:18 UTC)

**Not a clean 7/7 run.** The first preflight passed 3/7. Each failing gate was re-run alone (`preflight-reruns.txt`):

| Gate | First run | Re-run alone | Cause of the first failure |
|---|---|---|---|
| Unit tests at `1cbd7f4` | — | 1095/1095 (`npm run test:unit`) | — |
| unit + live suite | FAIL | `currentfacts.test.js` 13/13 | one live current-facts test got an empty reply |
| verify-deploy | FAIL (p95 8.5 s) | PASS (p95 4.5 s) | one slow call |
| param shapes | FAIL 53/54 | PASS 54/54 | `/headlines` `upstream_unavailable` |
| intent answers | 43/44 | 40/44, 41/44, 42/44 | Groq `429 rate_limit_exceeded` from this release's own gate burst; Google News; Blockscout |
| hostile, upstream health, no-regression | PASS | — | — |
| Watch 6126 | endpoint ok 450 ms, activation active | | `watch.txt` |

The failing routes are identical in code to the rollback target. After the burst, single production calls answered:
`/generate` and `/chat` (model text), `/headlines?query=technology`, `/news-search?query=nvidia earnings`. The 429s
were per-minute, not the daily quota: the same routes answered a minute later.

## Observed on production with the new fields

- `cc9a51c`'s `code=` field, 13:50–14:20 UTC (two overlapping log reads, so no counts): `HTTP 429
  code=rate_limit_exceeded` on gpt-oss-120b and qwen, `json=0` and `json=1`; `HTTP 400 code=json_validate_failed
  json=1` on qwen and gpt-oss-20b. Every 400 seen was a JSON-mode validation failure, which `salvage400` already
  handles. No `json=0` 400 was seen yet; the archived ones on /event-outcome, /research and /fact-check are unexplained.
- Preview: `XCHAIN no_reference ref=hex64 chains=2 proof=0` for a 64-hex `tx_hash` without `0x`, which
  `references()` does not read. Whether the scorer sends that shape is not known yet.
