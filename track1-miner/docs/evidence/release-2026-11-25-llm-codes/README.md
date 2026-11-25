# Release 2026-11-25 — `cc9a51c`: model-error codes and review fingerprints (logging only)

No answer changed. Two log lines gained fields so the next zeros can be explained.

| | |
|---|---|
| Build commit | `cc9a51c` (branch `PR/llm-400-codes-review-sha-2026-11-25`, cut from main `0f85d91`) |
| Commits | `80cbbc5` model calls refused by Groq log `code=<Groq error code> json=<0/1>`; `cc9a51c` review lines carry `sha=<8 hex>` of the input |
| Preview | `https://miner-5odnax0im-wukong4.vercel.app` |
| Production | `https://miner-1hem8iuy0-wukong4.vercel.app`, `dpl_7WxvntGK3GmMuax8RAjz4fzT92En`, alias `miner-wine.vercel.app` (promote answered 409 "already the current production deployment") |
| Rollback | `miner-g5zcew03d` (`66d5ecb`, `dpl_2d2r1xgMJxRbAkbt6NDc6yZKYg5k`) |
| Deploy tree | `C:\Users\hyada\tg-deploy\mcc9a51c` |

## Gates (2026-11-25 ~13:30–13:39 UTC)

| Gate | Result | Note |
|---|---|---|
| Unit tests at `cc9a51c` | 1094/1094 | `npm run test:unit` in the deploy tree; the two new tests pass |
| Preview probes | ok | `/code-review` answers `upstream_unavailable` (previews have no Groq key, as before); `/ssl-check`, `/convert` normal. `preview-probes.txt` |
| Preflight | 7/7 | `preflight.txt` |
| Watch 6126 | endpoint ok, activation active | `watch.txt` |
| New log line on production | seen | 13:40 UTC: `REVIEW /code-review stated=Request changes problem=none served=Request changes top=high bytes=31 lines=2 sha=29c738d5` on `dpl_7Wxvnt…`. No refused model call happened in that window, so the `code=` field is not yet seen in production; its format is unit-tested only |

## Why logging only

The scores for epochs 47–55 are in `epochs-47-55.txt` (`/scores?intent=`, all 44 intents). The zeros could not be
tied to a cause from the logs:

- The scorer scores every miner of an intent at one `scored_at`, so a score is joined to our calls by timing only.
- The request archive has no rows from 2026-11-24 16:30 to 2026-11-25 08:08 UTC: neither the score recorder nor
  the archiver wrote to `record.log` then, so the host was off or asleep. Epochs 50–53 cannot be joined.
- Positive controls contradict a verdict-level cause for RESEARCH_QUERY and EVENT_OUTCOME (GAPS 2026-11-25 block).
- CODE_REVIEW shows one input-dependent pattern (a 179-byte input served `Comment` once, scored 0, and
  `Request changes` once, scored 1), but the model path cannot be exercised before production (the local Groq key
  answers 401; previews have no key), so no review behaviour was changed. The `sha=` field makes the next match exact.
