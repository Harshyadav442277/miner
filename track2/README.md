# track2 — Season II evaluators

The Evaluators track: "build or improve how that intelligence is measured … per Intent". Rules and scoring
are in [../RULES_SEASON2.md](../RULES_SEASON2.md); the goal is in [../WINNING.md](../WINNING.md).

Season I's `rank_answer` scorer, its harness, fixtures, recon and release tooling were deleted on
2026-10-23. The node no longer accepts that module kind, and none of it was used by the Season II work.
All of it remains in git history.

## Current state (2026-11-15)

No module of ours is active on the network. Nothing is registered until it passes the gate in
[harness/](harness/README.md), because earlier adapters passed tests we wrote ourselves and then failed on
answers we did not write. The first lane run under that rule, QUESTION_ANSWERING v1, **failed the gate**
(42.0% on the frozen holdout against the champion's 45.3%) and was not registered:
[adapter/question_answering/](adapter/question_answering/README.md). [MEMORY.md](MEMORY.md) has the registry
read, the five planned entries and the next action.

## What is here

| Path | What it is |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Season II design decisions: comparators, adapter deltas, node-reproduced proof, the pre-registration gate |
| [GAPS.md](GAPS.md), [MEMORY.md](MEMORY.md) | Open gaps and session state |
| [harness/](harness/README.md) | The pre-registration gate: freeze a holdout, capture real miner answers, fetch the champion's file, measure in the node runtime, compare, decide |
| [comparator/](comparator/README.md), [comparator/evaluation/](comparator/evaluation/README.md) | The exact comparators and the frozen adversarial suite that checks them against the champions and the kit reference |
| [runnable/](runnable/) | The V2 runnable endpoint serving nine comparator families (`livecert-comparator.vercel.app`) |
| [material/](material/README.md) | Evaluation material: 144 LANGUAGE_TRANSLATION preference pairs and the pool row checker |
| [adapter/question_answering/](adapter/question_answering/README.md) | QUESTION_ANSWERING lane: pair builder, shortcut audit, train and export scripts, and the frozen holdout (`holdout/`) with its labels. v1 failed the gate |
| [adapter/fact_check/](adapter/fact_check/README.md) | FACT_CHECK pair generator from FEVER (hard negatives, split by article) |
| [adapter/score_pairs.py](adapter/score_pairs.py), [adapter/check_executor.py](adapter/check_executor.py), [adapter/fanout_exec.py](adapter/fanout_exec.py), [adapter/check_tokenizer_parity.py](adapter/check_tokenizer_parity.py), [adapter/live_class/](adapter/live_class/) | V2 adapter tools: pair scoring through an executor, the validator-style executor check, the batch fan-out, the live-class shim for `adapterbuild` |
| [adapter/url_scan/](adapter/url_scan/README.md), [adapter/security_review/](adapter/security_review/README.md), [adapter/sanctions/](adapter/sanctions/README.md), [adapter/sanctions_pool/](adapter/sanctions_pool/README.md) | Closed lanes: the result record and evidence only; pipeline scripts are in git history |
| [SIGN_S2.md](SIGN_S2.md) | What is registered and what is ready to sign (nothing) |
| [SUBMISSION_S2.md](SUBMISSION_S2.md), [OUTREACH_S2.md](OUTREACH_S2.md) | The Nov 2 entry draft (sanctions only; to be rewritten for the five entries) and unsent outreach plans |

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

- **In this tree:** see the table above. Sanctions evidence (289 files) is on `claude/evaluators-status-a51518`.
- **Published releases:** in [`telegraph-factscore`](https://github.com/Harshyadav442277/telegraph-factscore),
  branch `season2-evaluators`.
- **Training data, models and builds:** in `C:\Users\hyada\tg-eval\`, outside OneDrive.
