# Release `66d5ecb`, 2026-11-24 ~02:00 UTC (07:30 IST): full request archive and review logging

Standing authorisation: the owner said "take the decision as per your recommendation. all i want is to win".
This release changes no answer. It makes the next zero readable: each archived request keeps its RES line, and
CODE_REVIEW and SMART_CONTRACT_AUDIT log which check a model review failed.

| | |
|---|---|
| Build commit | `66d5ecb` (branch `PR/archive-res-lines-2026-11-24`, from main `75c77f9`); deploy tree `C:\Users\hyada\tg-deploy\m66d5ecb` |
| Preview | `miner-35q9939r8-wukong4.vercel.app` (`dpl_6WkMkfHovmCtPyrBaCvG3f9rxUZQ`) |
| Production | `miner-g5zcew03d-wukong4.vercel.app` (`dpl_2d2r1xgMJxRbAkbt6NDc6yZKYg5k`). `promote` answered 409: already current |
| Rollback target | `miner-3udefsmw1-wukong4.vercel.app` (`dpl_iBtj3VqNELw7JMhhLRQqpSJeN82K`, `8a631d5`) |

## Commits

| Commit | Change |
|---|---|
| `e0134a3` | `archive-requests.mjs` keeps `lines`, every log line of an invocation (G362) |
| `f248de6` | The archiver reads 65 minutes, not 40, so one missed 30-minute run leaves no hole |
| `66d5ecb` | `REVIEW <route> stated= problem= served= top= bytes= lines=` per model review, categories only (G363) |

## What the logs showed

- **G362 cause, verified:** `vercel logs --json` gives one row per invocation. `message` is one of its log lines,
  and the rest are in a `logs` array the archiver dropped. After the fix, 106 of 106 invocations in a 65-minute read
  had their RES line. Before it, 356 RES lines were kept in 11,768 rows. The fixed script is installed in
  `C:\Users\hyada\tg-deploy\scores` and backed up as `archive-requests.mjs.bak-2026-11-24`.
- **CODE_REVIEW, epoch 46 (0, scored 01:21:41 UTC):** we answered `verdict=Comment` at 01:20:08
  (`code-review-scored-window.txt`). Four miners scored 1. The same deployment, `5f28505`, scored 1 in epoch 39 and
  0 in epoch 41, and no commit touched the review path between them. So the cause is `NOT ESTABLISHED`: one scored
  call cannot separate "Comment is wrong" from "the review is wrong".
- **CODE_REVIEW `invalid_model_response`:** a three-line JS loop answered `unknown` three times at 01:44 UTC (our
  probes, not a scored call). It answered `Request changes` at ~01:58 UTC. The failing check was not logged before
  this release. It is now.
- **EVENT_OUTCOME (23:59:41), FINANCIAL_DATA (00:25:27), GAS_PRICE (00:02:45), RESEARCH_QUERY (21:53:39):** the
  archive holds REQ lines before each but no RES, and the 23:00–23:50 UTC window was never archived. Causes `NOT
  ESTABLISHED`. No answer was changed for them.

## Gates

| Gate | Result | Note |
|---|---|---|
| Unit tests on the deploy tree | 1093/1093 | `unit.txt` |
| Preview probes | pass | `preview-probes.txt`. Previews have no model key, so reviews answer `upstream_unavailable`. SSL and convert are correct |
| Production log line | pass | Two `/code-review` probes logged `REVIEW /code-review stated=Request changes problem=none served=Request changes top=high bytes=61 lines=3`, between REQ and RES |
| Preflight on production | 7/7 | `preflight.txt` |
| Registration watch (6126) | endpoint ok, activation active | `watch.txt`, 02:02 UTC |

Scores read for epochs 45–47: `epoch-45-47-scores.txt`. Epoch 47 had begun at ~01:58 UTC; four intents were scored
by 02:05 UTC.
