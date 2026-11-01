# Release 2026-11-01: extraction identifiers (G245) and the bounded field-list match

Owner, 2026-11-01: "Yes, deploy it" (to deploying `b0b2a08`). Deployed `130e16c` instead: the same extraction fix
plus the security review's fix for polynomial backtracking in `requestedFields`, which `b0b2a08` carried.

## Build

| | |
|---|---|
| Build commit | `130e16c` on `codex/rank1-14-intents` |
| Contains | named fields read when the text comes in its own parameter; identifier fields ("invoice number", "Order #…", "PO no. …"); the field-list match runs on whitespace-collapsed input capped at 300 characters |
| Unit tests | 870/870 on the deploy tree at `130e16c` |
| Preview | `miner-n2qforsr7-wukong4.vercel.app`, probes in `preview-probes-130e16c.txt`. The 8,000-space probe returned an empty body through `vercel curl`, inconclusive; on production a 1,500-space query answered HTTP 200 in 0.55 s |
| Production | `miner-rbjurfgjl-wukong4.vercel.app`, `dpl_GCX5n3HBBMDE22tWsSS3o6KvLVKX`, alias `miner-wine.vercel.app` (promote: 409, already current) |
| Rollback target | `miner-htkhwofwv-wukong4.vercel.app` (`a8abbcf`, `dpl_5SRVMZsWNm61QFQn5zeqtjAxVwbo`) |
| Registration | 4829, `active`, unchanged. Nothing signed, nothing pushed. |

## Gates on production (2026-11-01 ~08:10 UTC)

| Gate | Result | Note |
|---|---|---|
| preflight | **7/7** | `preflight.txt` |
| watch | ok | endpoint ok, 376 ms, `activation=active` (`watch.txt`) |
| mission builds | full **9/9**; partial **53 pass, 4 fail, 1 refused** of 58; 15/15 missions | `../missions-2026-10-31/fixtures-all-130e16c.json`. Before: partial 50/58. The 4 failures are `classify_incident` (G244); the refusal is STOCK_PRICE (G230) |

G244 recurred: the first classify call on the fresh deployment missed the 350 ms model deadline (352 ms) and the
keyless fallback answered "operator error"; a minute later the model answered "hardware fault" in 124 ms.
