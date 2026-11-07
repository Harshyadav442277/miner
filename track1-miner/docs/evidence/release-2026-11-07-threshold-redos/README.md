# Release 2026-11-07 ~03:20 UTC (08:50 IST): temperature-threshold regex without quadratic backtracking — `3f33508`

The owner said "Yes, deploy it" (2026-11-07) for `3f33508`, the fix for a finding from the push security review.

| | |
|---|---|
| Build commit | `3f33508` on `codex/rank1-14-intents` (pushed). Against the previous release `bee3f6a`, the only miner change is in `src/threshold.ts` |
| Change | The temperature pattern `\s*(?:°\|º\|degrees?\s*\|deg\s*)?\s*` had adjacent space runs. It is now `\s*(?:(?:°\|º\|degrees?\|deg)\s*)?`, and the question is capped at 500 characters before matching. Locally, "above 5" followed by 32,000 spaces took 331 ms before and 0 ms after; 128,000 spaces take 0 ms even without the cap |
| Unit | 914/914 in the deploy tree `C:/Users/hyada/tg-deploy/m-nonsdn` |
| Preview | `https://miner-hca0cm0t1-wukong4.vercel.app`, `dpl_3iVLmV88n2aaP59D6xBk75moQ3iV`. `preview-probes.txt`: Riyadh 40°C and Chicago 32 F threshold answers; the 600-space question returns 200 in 1.17 s; `/onchain-metric` and `/ssl-check` unchanged |
| Production | `https://miner-eh2uav8mu-wukong4.vercel.app`, `dpl_5tARoxt3vuzowzZ98skdve4kBtJF`. `promote` answered 409 "already the current production deployment", and `vercel inspect miner-wine.vercel.app` names this deployment |
| Rollback target | `https://miner-beo9nyatq-wukong4.vercel.app` (`dpl_BzBqpAUR5YJTNwdp78YFaGekwGe2`, `bee3f6a`) |

## Gates (`preflight.txt`, production)

First run: 6 of 7 passed. Intent answers was marked FAIL, but its truncated output ended "39/39 intents answering
correctly", so the failing check is not visible. Re-run alone, the gate passed 39/39 with exit 0
(`intent-answers-rerun.txt`). Its honesty-only checks are the known baseline (G230). The other gates passed: unit
and live suite, verify-deploy, param shapes, hostile inputs, upstream health, and no-regression (8 identical,
0 differ).

`watch.txt`: registration 4829 is `active`, endpoint ok in 357 ms (03:26:47 UTC). `availability.jsonl`: 34 of 34
routes up against this branch's manifest.

## Not checked

- What the first intent-answers run failed on: preflight printed only the tail.
- The 3,000-space preview probe: `vercel curl` produced no output for that 9,000-character URL on Windows.
  The 600-space probe and the local timings stand in for it.
