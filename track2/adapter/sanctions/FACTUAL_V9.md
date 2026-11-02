# Factual discrimination continuation

V8 scored 31/62 on the old genuine same-query slice. The actual visible-input
length reference scores 42/62 (67.74%, ties half-credit). Full-body character
length scores 46/62; always preferring the match verdict solves every pair because
all observed errors are false negatives. These are separate diagnostics, not a
representative factual benchmark or grounds for registration.

The machine-claim visibility audit finds both complete verdict fields visible in
43/62 pairs, spanning all 14 names. V8 scores 15/43 there. This excludes neither
understandable prose nor the original rows: the original 62 remain unchanged.
The parser uses exact JSON spans and pinned-tokenizer offsets. No response is
shortened, rewritten or injected with reference facts for node measurement.

## Frozen v9 experiment

- Warm-start our v8 weights; verify all 178 adapter/head tensors after loading.
- Source-derived synthetic pairs: 2,400 train, 400 validation, 400 test. Training
  has 1,800 factual verdict comparisons and 600 complete query-binding reversals.
- Factual chosen/rejected formats are sampled independently. Both exact members
  and exact absences have 900 factual training examples. Retention also balances
  membership. This changes class balance as well as cross-format coverage; effects
  are not causally isolated. No provider identifiers or captured answers in training.
- Seed 42, learning rate 0.00005, 2 epochs, rank 8/alpha 32, max length 256,
  batch 4/gradient accumulation 4/eval batch 1. Select on synthetic validation loss.
- Chosen facts and source comparisons audit clean; entities/aliases/query strings
  do not intersect measured queries. Character-length training baseline: 48.79%.
- Current OFAC SDN/alias exports were downloaded on Nov 2 and exactly match the
  frozen source hashes (`evidence/v9-plan/source-freshness.json`).
- Fresh 128-name cohort: 64 exact members/64 GLEIF exact-absent legal names,
  all final, frozen before calls and excluded from every new synthetic split.
  Sources, seed, exclusions and query hash are in `v9-plan/selection-manifest.json`.
- Query five declared public services, chosen for supported scoped decisions in
  prior captures. These are direct public calls, not independent paid adoption.
  No model scores inform response selection or labeling.

`measure_v9.ps1` waits for GPU training before CPU node execution, verifies
tokenizer parity, exports and runs live-judgment Stage 1. It scores the original
factual slice and all v8 query-binding regression sets. It then labels the fresh
capture by the existing conservative rule and measures unchanged v8/v9 on the
same new pairs. Full-response and visible-claim results stay separate.

Beating the visible-length baseline on old development data is necessary, but
does not establish readiness. A credible submission additionally needs a fresh
result, defensible labels, class/provider coverage and uncertainty. Any one-sided
fresh disagreement set remains explicitly insufficient, even at 100% accuracy.
No wallet action, registration or pool upload is part of this experiment.

## Replay

Restore archived `v9-plan/training-inputs/*.jsonl.gz` to the external directory
`<home>/pairs/sanctions_v9_crossformat`. Use an unused run directory and the
documented kit, foundation, v8 checkpoint and executables:

```powershell
$py = 'C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$base = 'track2/adapter/sanctions'
& $py "$base/train_v7.py" --home C:/Users/hyada/tg-eval --version 9 --parent-version 8 --data-dir sanctions_v9_crossformat
& "$base/measure_v9.ps1"
```

Exact generated inputs, source/split audits, command logs, package identities and
f32 scores are retained alongside the results. The script refuses absent training
results or occupied executor ports. Historical evidence must be preserved when
replaying; rerun measurements in a copy.
