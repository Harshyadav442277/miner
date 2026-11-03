# Bounded encoder capacity comparison

V19's final-two-layer distillation improves listed decisions by introducing a
late-JSON MATCH bias: absent accuracy falls45/48 to9/48. It fails before export.
V20 tests whether that restricted encoder capacity is the limitation. This is
a hypothesis, not a proven cause or a full-corpus training run.

Keep exactly v19's64 source anchors, frozen parent thin targets, metadata forms,
MSE+0.2 Cartesian softplus loss,32 steps,lr0.0001,AdamW no decay,clip1,fp32,
four questions/step and training seed2120261103. Only change trainable encoder
capacity from16 to176 LoRA tensors. Parent13,rank8/alpha32; classifier/base frozen.
Use activation checkpointing and explicitly disable training-only dropout.
Verify eval/train forward equality within0.001 before any optimizer update.
No score wrapper, inference lookup or runtime correction is introduced.

Freeze96 new repair-validation questions from the v13 val split before scores,
seed2220261103:24 primary,24 alias,48 absent. Exclude all prior repair/diagnostic/
external entities/names. Parent13 used the original source split for checkpoint
validation; this is new repair validation, not a pristine parent-held-out test.
Public positive facts were already training knowledge in parent13. Preserve that
exposure disclosure. Original v19 test is paired development evidence only.

Evaluate the fixed final step, no checkpoint selection. Fresh repair validation
requires65% in each format's listed/absent/primary/alias groups, thin membership
losses<=5pp and Cartesian class accuracy>=65%. Verify all176 encoder tensors and
both classifier tensors explicitly. A failure stops before export. Passing still
needs actual-node factual/binding gates, never implies submission readiness.
No reserved external bodies, full-corpus training, wallet or submission action.

Recovery: the original process disappeared after step20 without a final adapter
or result. Its log/inputs are retained in evidence/v20-interrupted. No quality
result is inferred from the interrupted run. Restart uses identical training and
validation questions, targets, metadata, seeds and optimizer recipe; only source
provenance changes for atomic recovery checkpoints every4 steps. Checkpoints bind
the input hash and persist all178 adapter/head tensors, optimizer, RNG and completed
step logs. A resume restores exactly that state. No new checkpoint selection or
additional optimization steps beyond the fixed32-step trajectory are introduced.
