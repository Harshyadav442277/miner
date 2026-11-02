# Public snapshot knowledge experiment

V9–v12 all missed the 42/62 visible-length reference. V3 reaches 41/62; exact
positive-query exposure covers only 2/14 development names. Runtime and training
rankings agree, so this experiment changes factual reference coverage.

Before training: freeze seed 1320261102, v3 initialization, one epoch, learning
rate 0.00005, rank 8/alpha 32, max 256, batch 8/accumulation 2 (effective 16, same as
earlier batch 4/accumulation 4), standard kit objective/checkpoint selection.
Ingest every distinct normalized ASCII organization primary/alias name of 3–160
characters from the frozen public SDN snapshot. This deliberately exposes the
positive reference facts used in the development and reserved benchmarks.

GLEIF pages 7–50 supply real legal-name candidates. The initial 7–86 plan hit the
API's 10,000-result pagination cap at page 51, as recorded in its error response.
Before training, reduce to the full successfully fetched contiguous 7–50 range. This is
an API constraint, not selection by model or miner results. Preserve failed logs.
The initial case audit found 62.11% truth prediction from uppercase alone. Training
had already failed its dataset gate before model initialization: reused absent
answers caused 18.6% internal random-split leakage. Canonicalize
GLEIF names to uppercase (retaining the exact source spelling) before token
matching; do not claim arbitrary-case robustness. Preserve earlier input builds.
Cap training absent-name reuse at 8 and choose response forms without replacement
per absent name; use each validation/test absent name once. Preserve the stock
dataset gate. No skip-gate flag or unique meaningless text is introduced.
The cap 3 pretraining build left 28% of names outside exact token strata. Raise the
cap to the 8 distinct semantic forms available; rejected answer bodies stay unique.
Record the resulting distances rather than claiming every block exactly matches.
Exclude all exact primary/alias
members of the complete SDN snapshot and all measured query names. Split negative
names before pairing (400 validation, 400 test, remainder training). Pair every
positive with an absent query from the nearest prompt-token-length stratum. In
each block both truth classes use the same response format; chosen/rejected
verdicts reverse, balancing any unconditional match preference. Archive exact
inputs, source records, label checks, token-distance/reuse counts and visible
length baselines. Retain 600 source-derived wrong-query pairs from v10 training.

Final inputs contain 42,382/800/800 train/validation/test pairs and 20,891 positive
reference names, including aka/fka/nka aliases. The independent CSV audit caught
the historical loader's omission of nka; historical builders remain unchanged.
The source audit passes. Actual visible-length baselines are 50%; 19,530/20,891
training blocks have exact prompt-token-length matches (93.49%). Residual
distances remain reported. The stock dataset gate passes: 100% unique rejected
answers, 0% internal rejected-answer leakage and surface probe 49.9%.
Rebuilding from archived references reproduces all three JSONL byte hashes.
The separate name-only membership audit fits thresholds on training only: character
count scores 54.30% train /60.63% validation /59.38% test, word count 53.23% /
58.75% /56.25%, and prompt-token count 51.55% /51.88% /51.75%. Residual shape
differences remain. These classify membership, not external-answer preferences;
they are not interchangeable with the answer-only surface probe or length baseline.

Synthetic validation/test use distinct generic response forms and known positive
facts; they measure representation transfer, not unseen-positive-fact accuracy.
No captured miner answer, provider template/id, or evaluation-pool row enters
training. Positive-source overlap is an explicit methodological change from v9–12,
recorded in ARCHITECTURE before data building. It cannot be described as an
entity-held-out benchmark. Source differences between SDN and GLEIF remain a risk.

Measure the fixed exported package in the actual node. Stop on a failed old
development gate, preserving the reserved 69 pairs. If development exceeds 67.74%,
run unchanged binding regressions, then score the reserved answer bodies against
their own 71.74% baseline. Neither one-sided capture can establish broad factual
validity or readiness to register. No wallet/submission action is authorized here.

Exact compressed inputs, source references, manifests and audits are archived in
`evidence/v13-plan/training-inputs`. Restore those JSONL bytes or rebuild from the
archived reference records; live GLEIF pagination can change. `exact-data-replay.json`
records the matching hashes. Use fresh replay locations to preserve evidence.

The exact v3 PEFT parent is publicly hosted and downloaded/hash-checked;
`parent-hosting.json` pins its URL/SHA-256. Its adjacent `adapter_config.json` is
also archived. Restore both into the expected v3 parent directory. The cached HF
base revision is `8949b909ec900327062f0ebf497f51aef5e6f0c8`; kit revision is
`1ed063e2f0066cfaf0e124d66ec6a17b7a6121fd` with the documented live-class patch.

Original commands from the repository root:

```powershell
$py = 'C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$base = 'track2/adapter/sanctions'
$env:HF_HOME = 'C:/Users/hyada/tg-eval/hf'
$env:HF_HUB_OFFLINE = '1'
$env:LIVE_CLASS_INTENTS = 'SANCTIONS_SCREENING_MATCH'
& $py "$base/train_v7.py" --home C:/Users/hyada/tg-eval --version 13 --parent-version 3 --data-dir sanctions_v13_reference --lr 0.00005 --epochs 1 --batch-size 8 --grad-accum 2
& "$base/measure_v9.ps1" -Version 13 -DataDir sanctions_v13_reference -PlanName v13-plan
```

Completed run directories are intentionally protected. Choose fresh version,
data and plan locations when replaying an already completed experiment.

## Result

Synthetic validation 673/800 (84.125%); test 630/800 (78.75%), both source-exposed
positive facts. Actual-node old factual development: **27/62 (43.55%)**, versus
42/62 visible length and v3's 41/62. Rejected. This intervention did not improve
external answer ranking; broader source coverage alone was insufficient in this run.
The reserved 69 pairs remain unscored. Binding regressions were not reached by the
fixed pipeline after the failed factual gate. No readiness or query-binding claim.

All 178 parent tensors restored; 87,964 rendered-text tokenizer checks have zero
differences. Stage 1 passes. Post-Stage-1 package SHA-256
`fd0e0cd3eeb9e9b1e25ac269f625e7de342182dd9b0c7b00573cf02ad8d69a27`,
keccak `0xbd38052393dec527d3fe5d048b3139ff275b72bbb3caa97b9fa7c61f88b8ade1`.
Training, export, node scores and the failed development gate are archived.
