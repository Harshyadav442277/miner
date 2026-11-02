# Public snapshot knowledge experiment

V9–v12 all missed the 42/62 visible-length reference. V3 reaches41/62; exact
positive-query exposure covers only2/14 development names. Runtime and training
rankings agree, so this experiment changes factual reference coverage.

Before training: freeze seed1320261102, v3 initialization, one epoch, learning
rate0.00005, rank8/alpha32, max256, batch8/accumulation2 (effective16, same as
earlier batch4/accumulation4), standard kit objective/checkpoint selection.
Ingest every distinct normalized ASCII organization primary/alias name of3–160
characters from the frozen public SDN snapshot. This deliberately exposes the
positive reference facts used in the development and reserved benchmarks.

GLEIF pages7–50 supply real legal-name candidates. The initial7–86 plan hit the
API's documented-in-response10,000-result pagination cap at page51; before any
training, reduce to the full successfully fetched contiguous7–50 range. This is
an API constraint, not selection by model or miner results. Preserve failed logs.
The initial case audit found62.11% truth prediction from uppercase alone. Training
had already failed its dataset gate before model initialization: reused absent
answers caused18.6% internal random-split leakage. Canonicalize
GLEIF names to uppercase (retaining the exact source spelling) before token
matching; do not claim arbitrary-case robustness. Preserve earlier input builds.
Cap training absent-name reuse at8 and choose response forms without replacement
per absent name; use each validation/test absent name once. Preserve the stock
dataset gate. No skip-gate flag or unique meaningless text is introduced.
The cap3 pretraining build left28% of names outside exact token strata. Raise the
cap to the8 distinct semantic forms available; rejected answer bodies stay unique.
Record the resulting distances rather than claiming every block exactly matches.
Exclude all exact primary/alias
members of the complete SDN snapshot and all measured query names. Split negative
names before pairing (400 validation,400 test, remainder training). Pair every
positive with an absent query from the nearest prompt-token-length stratum. In
each block both truth classes use the same response format; chosen/rejected
verdicts reverse, balancing any unconditional match preference. Archive exact
inputs, source records, label checks, token-distance/reuse counts and visible
length baselines. Retain600 source-derived wrong-query pairs from v10 training.

Synthetic validation/test use distinct generic response forms and known positive
facts; they measure representation transfer, not unseen-positive-fact accuracy.
No captured miner answer, provider template/id, or evaluation-pool row enters
training. Positive-source overlap is an explicit methodological change from v9–12,
recorded in ARCHITECTURE before data building. It cannot be described as an
entity-held-out benchmark. Source differences between SDN and GLEIF remain a risk.

Measure the fixed exported package in the actual node. Stop on a failed old
development gate, preserving the reserved69 pairs. If development exceeds67.74%,
run unchanged binding regressions, then score the reserved answer bodies against
their own71.74% baseline. Neither one-sided capture can establish broad factual
validity or readiness to register. No wallet/submission action is authorized here.

Replay: collect_reference_negatives.py, build_reference_knowledge.py, train_v7.py
with --version13 --parent-version3 --data-dir sanctions_v13_reference --epochs1
--lr0.00005 --batch-size8 --grad-accum2, then measure_v9.ps1 -Version13 -DataDir sanctions_v13_reference
-PlanName v13-plan. All paths/arguments and original outputs are retained beside
the experiment; use fresh locations rather than overwriting evidence.
