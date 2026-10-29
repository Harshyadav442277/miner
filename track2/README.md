# track2 — Season II evaluators

The Evaluators track: "build or improve how that intelligence is measured … per Intent". Rules and scoring
are in [../RULES_SEASON2.md](../RULES_SEASON2.md); the goal is in [../WINNING.md](../WINNING.md).

Season I's `rank_answer` scorer, its harness, fixtures, recon and release tooling were deleted on
2026-10-23. The node no longer accepts that module kind, and none of it was used by the Season II work.
All of it remains in git history.

## What is here

| Path | What it is |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Season II design decisions: comparators, wide adapters, node-reproduced proof |
| [GAPS.md](GAPS.md), [MEMORY.md](MEMORY.md) | Open gaps and session state |

`calibration/dist/text_authenticity_v2.wasm` (registration 1882, Season I) was deleted on 2026-10-29. Devnode's
V2 `/api/wasm` no longer lists 1882 or TEXT_AUTHENTICITY_CHECK: 7 families, with registration ids restarted.

## Protocol V2 (anjoman.ai/docs, updated 2026-10-27; read 2026-10-29)

- The only format accepted is float model adapters in WASM. "The older formats are refused."
- Registration is `registerWasm(hash, url, prefix, feeAddress, runnableUrl)`. It is per **family** (prefix),
  with a runnable endpoint the node checks first.
- An adapter "replaces the live scorer only when it beats the incumbent on a hidden sample by the replacement
  margin" (Anjoman Eval page).
- On 2026-10-29 devnode `/api/wasm` listed entries for CODE_REVIEW, CONTRACT_OBLIGATION_AUDIT,
  CUSTOMER_TICKET_RESOLUTION, FX_NOW, LLM_OUTPUT_EVALUATION, TASK_EXECUTION_QUALITY and THREAT_INTELLIGENCE.
- The comparators and the adapter below predate V2. Re-check them against `/docs/scoring/*` before any
  registration.

## Where the Season II work is

- **Branch `claude/wasm-track-2-quality-e21db3`:**
  - the 31 comparators (`track2/comparator/`);
  - the LLM_OUTPUT_EVALUATION adapter recipe (`track2/adapter/`);
  - the sign list (`track2/SIGN_S2.md`).
- **Published releases:** in [`telegraph-factscore`](https://github.com/Harshyadav442277/telegraph-factscore),
  branch `season2-evaluators`.
- **Training data, models and builds:** in `C:\Users\hyada\tg-eval\`, outside OneDrive.
