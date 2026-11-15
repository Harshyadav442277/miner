# track2 — Season II evaluators

The Evaluators track: "build or improve how that intelligence is measured … per Intent". Rules and scoring
are in [../RULES_SEASON2.md](../RULES_SEASON2.md); the goal is in [../WINNING.md](../WINNING.md).

Season I's `rank_answer` scorer, its harness, fixtures, recon and release tooling were deleted on
2026-10-23. The node no longer accepts that module kind, and none of it was used by the Season II work.
All of it remains in git history.

## Current sanctions contribution — 2026-11-01 UTC (Nov 2 IST)

Start with the [honest write-up](SUBMISSION_S2.md) and [reproduction tutorial](adapter/sanctions/README.md).
Two public captures contain 464 responses. V6's synthetic test passes at 90.18%, but it scores 79.17%
on fresh real-answer pairs; v3 scores 83.33%, while the length baseline scores 100%. These narrow,
one-sided samples and the own-format wrong-query failures do not establish readiness. No new sanctions
registration was prepared. Raw captures, exact scores, source hashes, training inputs and experimental
packages are available for review. See G41 and the sanctions section of SIGN_S2. Other families have
their own dated runbook/status; this is not a blanket signing recommendation for them.

## What is here

| Path | What it is |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Season II design decisions: comparators, wide adapters, node-reproduced proof |
| [GAPS.md](GAPS.md), [MEMORY.md](MEMORY.md) | Open gaps and session state |
| [adapter/score_pairs.py](adapter/score_pairs.py) | Scores preference pairs through a runnable-URL executor (the kit's `adapterexec`) exactly as the node orders them; per-type accuracy and the length baseline |
| [adapter/event_outcome/](adapter/event_outcome/) | EVENT_OUTCOME_RESOLUTION training data: Wikidata fetch and the pair builder |
| [adapter/sanctions/](adapter/sanctions/README.md) | Public-source training, real-miner capture/labels, node-runtime measurement and frozen reproducibility artifacts |
| [SUBMISSION_S2.md](SUBMISSION_S2.md), [OUTREACH_S2.md](OUTREACH_S2.md) | Honest entry draft and unsent education/activation plans |

`calibration/dist/text_authenticity_v2.wasm` (registration 1882, Season I) was deleted on 2026-10-29. Devnode's
V2 `/api/wasm` no longer lists 1882 or TEXT_AUTHENTICITY_CHECK: 7 families, with registration ids restarted.

## Protocol V2 — historical snapshot (anjoman.ai/docs, read 2026-10-31)

- Judgment and hybrid families take an **Evaluator adapter as a safetensors delta** (LoRA deltas plus a reward
  head) on the validators' shared Foundation Model; full-model float `.wasm` adapters are refused since the
  2026-10-31 docs (GAPS G34 in [GAPS.md](GAPS.md), root G238). Deterministic families take a **comparator module**
  (`imw_score_deterministic`), unchanged, but the node already holds the reference rule and scores deterministic
  intents without one (root G237 killed). Ours: [comparator/](comparator/), served for V2 by [runnable/](runnable/).
- Registration is `registerWasm(hash, url, prefix, feeAddress, runnableUrl)`. It is per **family** (prefix),
  with a runnable endpoint the node checks first.
- An adapter "replaces the live scorer only when it beats the incumbent on a hidden sample by the replacement
  margin" (Anjoman Eval page).
- On 2026-10-31 18:35 UTC devnode `/api/wasm` listed the same 7 families as on 2026-10-29. Canonical adapters
  (all safetensors): Telegraph seeds 900001–900004 for CONTRACT_OBLIGATION_AUDIT, LLM_OUTPUT_EVALUATION,
  THREAT_INTELLIGENCE and TASK_EXECUTION_QUALITY, and participant registration 25 for CUSTOMER_TICKET_RESOLUTION.
- At that date the adapter needed re-export as a delta (G34). That work is now unblocked and completed for
  several experiments; use current MEMORY and the measured package records above.

## Where the Season II work is

- **In this tree** (branch `claude/wasm-track-2-quality-e21db3`, merged 2026-10-29):
  - the 31 comparators ([comparator/](comparator/README.md));
  - the LLM_OUTPUT_EVALUATION adapter recipe ([adapter/](adapter/llm_output_eval/README.md));
  - the sign list ([SIGN_S2.md](SIGN_S2.md)). Use its dated, family-specific status notes; the sanctions
    adapter remains gated, and historical tables/tunnels are not current signing values.
- **Published releases:** in [`telegraph-factscore`](https://github.com/Harshyadav442277/telegraph-factscore),
  branch `season2-evaluators`.
- **Training data, models and builds:** in `C:\Users\hyada\tg-eval\`, outside OneDrive.
