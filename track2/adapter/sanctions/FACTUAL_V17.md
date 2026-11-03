# Hard source-anchor coverage intervention

V16's bounded32-step repair improves listed qualified prose34/64 to41/64 but
fails65%. The parent already gets25/32 listed training anchors right in the
generic qualified prose form. V17 changes data selection only: focus the same
small optimizer budget on source facts with the specific representation failure.
No continuation, extra epochs, learning-rate search or external-answer training.

Parent13,seed2020261103; same16 final-two-layer LoRA tensors,32 steps,lr0.0001,
four questions/step,fp32,dropout disabled,AdamW weight_decay0,gradient clip1.
Same four answer forms and full-Cartesian pairwise/consistency/teacher objective
as v16, weights1/0.1/0.2. Freeze base/head/other162 saved tensors.
Select16 primary and16 alias source-training questions with parent thin correct
but generic qualified prose wrong. Select32 exact absences with both correct,
lowest minimum margin first. This conditional mining is disclosed; it is not
a factual population estimate. No exact diagnosed identity phrase is trained.

First freeze128 fresh source-test questions (32 primary,32 alias,64 absent),
without model scores. Exclude diagnostic/external query names and entity IDs,
and both previous repair groups. Exclude fresh holdout entities/names from all
candidate anchors. V13 already saw public positive reference facts, so this tests
representations and new negative identities, not unseen positive facts.
Source-verify all questions; every answer fully fits256 pinned tokens.

Evaluate the fixed final step on the fresh holdout and original diagnostic;
retain every per-class/per-format count and raw margin. Fresh holdout requires
65% each class in every format and no more than5pp thin loss. The previous
diagnostic is development only; no selection or reserved-body scoring. Failure
stops before export. Even a pass does not establish real-answer accuracy or
submission readiness. This is a single data-coverage experiment, no full run.

Fixed-step result: fresh holdout passes all10 forms in both membership classes. Qualified prose
listed36/64 to44/64 (56.25% to68.75%), absent63/64 unchanged. Prose primary19/32
to23/32,alias17/32 to21/32. Thin listed54/64 to51/64 (-4.6875pp), absent52/64
to54/64. Original development prose listed34/64 to43/64, absent63/64 to61/64;
thin listed54/64 unchanged, absent56/64 to58/64. Do not hide these tradeoffs.
All counts are HF float32 synthetic diagnostics; genuine factual performance
and broad alias accuracy are still unproven. Source exposure remains disclosed.

Standard256-token export and Stage1 pass; pinned-tokenizer parity is exact on
3,840 generated source-fixture texts. Initial Stage1 invocation omitted the
required LIVE_CLASS_INTENTS environment override and failed the offline hybrid
classification; its log is retained. With the already-established live judgment
classification, Stage1 loads178 tensors and repeats the same float32 score twice.
Historical external development rechecks and a deterministic16-name synthetic
node/HF fidelity slice are separate from the still-unscored reserved cohorts.

Actual-node historical result:22/62 (35.48%) at256, below parent13's27/62 and
42/62 visible-length baseline. Reject as a factual candidate despite synthetic
class pass. Do not proceed to reserved scoring or infer binding retention.
V18 reuses exactly these weights at512 as a context-transfer falsification,
not training. It must match all178 tensors and compare against46/62 length.
