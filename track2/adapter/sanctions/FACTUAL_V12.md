# Frozen encoder, learned reward head

The old factual development results are v8 31/62, v9 13/62, v10 20/62 and v11
35/62. The v3 reference reaches 41/62, still below the 42/62 tie-aware visible-length
reference. Full adapter updates have not improved this slice. No model has scored
the reserved 69-pair capture yet.

V12 loads v3 and freezes every base and LoRA parameter. Only the existing
769-parameter linear reward head trains. It uses the same source-audited v10
inputs, stock pairwise loss and optimizer, seed42, two epochs and learning rate
0.001. Selection remains synthetic validation loss. This changes the parameter
mask and learning rate, so causal claims remain limited.

All 178 parent adapter/head tensors are verified after loading. At completion the
wrapper must additionally verify that all 176 saved LoRA tensors are bit-identical
to v3. The inference package is the standard adapter delta and reward head. There
is no provider exception, external lookup or calibration wrapper.

The first attempt failed during validation because the frozen base emitted bf16
while the trainable head was fp32. No valid result was produced. Its log is retained
as `v12-plan/aborted-dtype-training.txt`. The rerun casts only the head's training-time
input to the head dtype, including validation. This does not change the loss or
insert an inference-time operation; the actual node runtime uses fp32.

V3's inherited public source-entity exposure overlaps 50/62 development comparisons
and 65/69 reserved comparisons, as established by exact historical data rebuilding.
New training pairs still exclude every measured entity/alias/query. Results can
test unseen external answers and representations, not unseen-entity generalization.
The parent exposure report remains beside the run.

The pipeline advances beyond the old factual slice only if its accuracy exceeds
67.74%. A subsequent fresh result must be compared with its own 71.74% visible-length
reference. Both slices still have only listed-name errors; beating length alone
does not establish broad factual validity or registration readiness.

```powershell
$py = 'C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$base = 'track2/adapter/sanctions'
& $py "$base/train_v7.py" --home C:/Users/hyada/tg-eval --version 12 --parent-version 3 --data-dir sanctions_v10_alias_schema --lr 0.001 --epochs 2 --head-only
& "$base/measure_v9.ps1" -Version 12 -DataDir sanctions_v10_alias_schema -PlanName v12-plan
```

Restore the exact archived v10 inputs first; use fresh output locations when
replaying so original evidence is preserved. Model/checkpoint hashes and actual
node f32 scores are retained for verification. No wallet or pool action occurs.

Result: synthetic test 333/400 (83.25%), actual-node development 4/62 (6.45%).
Rejected; the 69 reserved pairs remain unscored. All 176 saved encoder/LoRA tensors
are bit-identical to v3. The head-only intervention did not help.

Float32 fidelity checks used the exact pinned-tokenizer IDs on 66 unique inputs.
V3 reproduces 41/62 and v12 reproduces 4/62, with 100% pair-order agreement between
HF and the actual node; maximum absolute score differences are 0.000133 and
0.000082 respectively. Export/pooling mismatch does not explain these failures.
Fixed encoder/head crossovers give no HF-screen gain (v3 encoder:41/62 with either
head, v8 encoder:31/62 with either head). They were not exported as candidates.

Exact historical reconstruction further shows only 2/14 development and 3/15
reserved names appeared as exact positive training queries. Entity exposure does
not establish alias coverage. This audit does not rule out strings appearing in
other response fields. See the three diagnostic JSON files in `evidence/v12-plan`.
