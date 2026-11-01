# Release 2026-11-01: classification answers ambiguous without the model (G244)

Owner, 2026-11-01: "Answer ambiguous", then "Yes, deploy it".

## Build

| | |
|---|---|
| Build commit | `e63df93` on `codex/rank1-14-intents`; differs from `130e16c` only in `src/classify.ts` (+22 lines) |
| Contains | with a model key set and no model reading, the word list labels alone only at margin ≥ 3; otherwise `ambiguous` |
| Unit tests | 871/871 on the deploy tree at `e63df93` |
| Preview | `miner-nehxfrl9g` — has no model key, so it cannot show the new branch (by design unchanged without a key) |
| Production | `miner-jyh9t9upq-wukong4.vercel.app`, `dpl_EbNUVhNrFJw1EsNBiZXZB4Kr5ie7`, alias `miner-wine.vercel.app` (promote: 409, already current) |
| Rollback target | `miner-rbjurfgjl-wukong4.vercel.app` (`130e16c`, `dpl_GCX5n3HBBMDE22tWsSS3o6KvLVKX`) |
| Registration | 4829, `active`, unchanged. Nothing signed, nothing pushed. |

## Checks on production (2026-11-01 ~09:20–09:40 UTC)

| Check | Result | Note |
|---|---|---|
| first classify call on the fresh deployment | **ambiguous**, 0.3 | the model reply came at the 350 ms deadline and was dropped; before this release the same case answered "operator error" (`classify-prod-e63df93.txt`) |
| warm classify call (+62 s) | hardware fault, 0.7 | model 207 ms |
| mission builds | full **9/9**; partial **57 pass, 0 fail, 1 refused** of 58; 15/15 missions | `../missions-2026-10-31/fixtures-all-e63df93.json`; the instance was already warm, so the classify step passed on the model |
| watch | ok, 369 ms, `activation=active` | `watch.txt` |
| preflight | **5/7** | `preflight.txt`: verify-deploy and intent answers failed, every failure an SSL check on a badssl.com host answering `unreachable` |
| intent answers, re-run alone | **PASS, 40/40** | `intent-rerun.txt` |
| verify-deploy, re-run alone twice | FAIL (1, then 3 checks) | a different badssl.com host `unreachable` each run (`verify-rerun*.txt`) |

**The two preflight failures are not this release (GAPS G246).** The previous deployment (`130e16c`, same SSL
code) also answered `unreachable` for `expired.badssl.com` at 09:3x UTC, while every badssl host answered HTTP 200
from this machine. A rollback would not change it, so none was done.
