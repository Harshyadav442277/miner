# Release 2026-11-06 ~16:48 UTC (22:18 IST): OFAC non-SDN Consolidated list in sanctions screening

Owner's authorisation: "Yes, deploy it" (2026-11-06), for the sanctions fix from the intent push (TASKS P1a).

| | |
|---|---|
| Build commit | `192aecc`, the cherry-pick of `76823a5` (branch `claude/task-breakdown-prioritize-e2b048`) onto `66cd023`. One conflict in `parseOfac`, resolved by keeping both changes: the `list` parameter and `7301474`'s website aliases. Miner diff against the previous release `7301474`: `src/sanctions-lists.ts`, `src/sanctions.ts` and three sanctions test files only |
| Change | `CONS_PRIM.CSV` + `CONS_ALT.CSV` from OFAC's Sanctions List Service are screened as "OFAC Consolidated (non-SDN)" (486 parties on 2026-11-05). Fewer than 100 parties or no aliases counts as an unread list, and an unread list is never a clearance. Answers name all three lists with their editions |
| Unit | 907/907 in the deploy tree `C:/Users/hyada/tg-deploy/m-nonsdn` (906 before, plus the non-SDN test) |
| Preview | `https://miner-nqytaz2sj-wukong4.vercel.app`, `dpl_CnLKXorgRPjsNfDRyn1eYDChti9S`; `preview-probes.txt`: four sanctions questions, `/ssl-check` and `/gas-price` answer. The `/gas` probe in that file used a wrong path (404 by design); `/gas-price` was re-probed below it |
| Production | `https://miner-p429gtksx-wukong4.vercel.app`, `dpl_6JPiQ4ErcYzrrmQMRmSg9mWd1dgJ`; `promote` answered 409 "already the current production deployment", and `vercel inspect miner-wine.vercel.app` names it |
| Rollback target | `https://miner-qbdf1756n-wukong4.vercel.app` (`dpl_GpEmJonx142NQZfeGTHNeVcNqGyt`, `7301474`, the scored-fields release) |

## Gates (`preflight.txt`, production)

First run 6/7: unit + live suite, verify-deploy, param shapes, hostile inputs, upstream health, no-regression
(8 identical, 0 differ) passed. Intent answers failed only SANCTIONS_SCREENING_MATCH with "both lists were not
screened": the gate required exactly two lists, and the answer now names three. The gate
(`tools/intent-answers.mjs`) now requires OFAC SDN, OFAC non-SDN and UN by name and checks ABU TEIR → `match`
9640. Re-run alone against production: **40/40** (`intent-answers-rerun.txt`). So 7/7, one gate after a check
update that matches this change.

`watch.txt`: registration 4829 `active`, endpoint ok in 728 ms (2026-11-06 16:49:43 UTC).

## The change, on production (`prod-probes.txt`, 16:49 UTC)

| Question | Before (production, ~16:15 UTC) | After (`192aecc`) |
|---|---|---|
| Is Mohammed Abu Tair on a sanctions list? | `no_match`, screened OFAC SDN and UN only | `match`: ABU TEIR, Mohammed, OFAC Consolidated (non-SDN), NS-PLC, ref 9640 |
| Is Vladimir Putin sanctioned? | `match`, OFAC SDN 35096 (read earlier the same afternoon, time not recorded) | `match`, OFAC SDN 35096; three lists named |

## Not checked

- Whether the devnode sanctions rank moves (rank 8 at 0.9827, epoch 2026). The scorer ranks constant metadata
  above real screens (GAPS G265), so a rank change is not expected to track this fix.
- Cold-start latency with the two extra downloads (0.34 MB in parallel with the 9 MB already read).
