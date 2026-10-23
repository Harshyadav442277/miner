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
| `calibration/dist/text_authenticity_v2.wasm` | Kept only because registration 1882 is still the TEXT_AUTHENTICITY_CHECK champion on devnode (rule 5 in [CLAUDE.md](CLAUDE.md)). Delete it once that registration is retired |

## Where the Season II work is

- **Branch `claude/wasm-track-2-quality-e21db3`:**
  - the 31 comparators (`track2/comparator/`);
  - the LLM_OUTPUT_EVALUATION adapter recipe (`track2/adapter/`);
  - the sign list (`track2/SIGN_S2.md`).
- **Published releases:** in [`telegraph-factscore`](https://github.com/Harshyadav442277/telegraph-factscore),
  branch `season2-evaluators`.
- **Training data, models and builds:** in `C:\Users\hyada\tg-eval\`, outside OneDrive.
