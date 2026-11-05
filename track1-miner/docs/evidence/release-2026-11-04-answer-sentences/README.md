# Release 2026-11-04 ~21:15 UTC (Nov 5 02:45 IST): answer sentences

Owner's authorisation: "i give you permission to take action on all of these" (2026-11-04 UTC), covering the
fixes from the audit replay (`../audit-replay-2026-11-04/`).

| | |
|---|---|
| Build commit | `aa110f8` (merge of `codex/rank1-14-intents` into `claude/winning-tracks-overview-3f735a`; the miner tree is byte-identical to `7b850e2`) |
| Change | Extraction answers every requested kind once and puts the whole extraction in `answer` (rows 29–30). A numbered list stays in the sentence that introduced it, so "Here are 5 papers" lists five (rows 25, 27) |
| Unit | 873/873 in the deploy tree `C:/Users/hyada/tg-deploy/maa110f8` |
| Preview | `https://miner-54l199h9c-wukong4.vercel.app`, probes in `preview-probes.txt` (`/extract`, `/papers` changed; `/ssl-check`, `/convert` unchanged) |
| Production | `https://miner-iwc9rd2yv-wukong4.vercel.app`, `dpl_6wQ4PevtNbDgVKpAPuhKePa8hw5K`; `promote` answered 409 "already the current production deployment", and `vercel inspect miner-wine.vercel.app` names it |
| Rollback target | `https://miner-1aoi3y0wt-wukong4.vercel.app` (`dpl_9wn4LryKUb4MohgLQZ4PhjPJDbD1`, `5939c49`, 2026-11-01) |

## Gates (`preflight.txt`, production, IPv4 first)

| Gate | Result | Note |
|---|---|---|
| unit + live suite | PASS | |
| verify-deploy | PASS | |
| param shapes | PASS | |
| intent answers | PASS | the six `not_licensed` refusals are the known baseline (G230) |
| hostile inputs | PASS | |
| upstream health | PASS | |
| no-regression | PASS | 8 identical, 0 differ |

**7/7.** `watch.txt`: registration 4829 `active`, endpoint ok in 439 ms (2026-11-04 21:18:26 UTC).

## Not checked

The extraction answer for row 30 names the date, the amount and the organisations, but not the "1,200 units"
quantity: the quantity reader does not treat "units" as a unit. Logged, not fixed.
