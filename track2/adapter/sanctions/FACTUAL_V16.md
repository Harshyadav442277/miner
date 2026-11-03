# Bounded negation and representation repair

The same128 source-verified questions isolate response-format failure without
truncation. V13 listed accuracy falls54/64 to34/64 between thin JSON and a prose
MATCH verdict with an identity qualification. V15 falls52/64 to3/64. V13 still
misses8/32 aliases in thin JSON, so representation is not its only weakness.

On32 v13 thin-correct anchors, the original uppercase prose wrapper scores
listed15/16, absent16/16 without a qualification. Adding the separate statement
"Identity is not established by name alone" gives listed9/16, absent16/16.
An affirmative equivalent gives14/16,16/16. This supports scope-negation leakage
into the exact-membership decision. These observed diagnostics are development
evidence; the phrase is not a hidden test or an inference correction.

Freeze a single small trial before optimization. Parent13, seed1920261103,
64 source-training questions (16 primary,16 alias,32 absent), selected only where
the parent's thin verdict is right. Separate64 validation groups use distinct
source entity IDs and absent names. Exclude every external query and its source
entity, all128 diagnostic query entities/names, and overlapping validation groups.
No external answer body is read. Use generic generated scope qualifications;
the exact diagnosed prose is measurement-only. All answers must fit256 tokens.

Train only16 LoRA tensors in layers20/21. Freeze classifier/base/other LoRA.
AdamW lr0.0001,weight_decay0,32 steps,4 queries/step,gradient clip1,fp32.
Two deterministic passes over64 groups; four answer forms per truth.
Loss: mean softplus(1-correct+wrong) over every within-query format combination,
plus0.1 within-truth score variance and0.2 mean squared thin-answer score drift
from the frozen parent. Dropout disabled during this controlled weight repair.
No checkpoint selection: evaluate the fixed final step; preserve any failure.

Validation and diagnostic gates: every format and class at least65%; thin-format
class recall loses at most5 percentage points from its parent. Report conditional
anchor selection, primary/alias, all original diagnostic questions, full Cartesian
comparisons and cross-class counts. A failure stops before export. A pass still
requires actual-node export agreement and unchanged factual/binding regressions.
No full training, reserved-body scoring, wallet action or submission in this trial.

Result: the fixed32-step repair improves diagnostic qualified prose listed34/64
to41/64 (53.125% to64.0625%), but fails the frozen65% gate. Do not round this into
a pass. Prose absent falls63/64 to60/64; thin JSON is unchanged at54/64 listed,
56/64 absent. Primary prose improves23/32 to26/32; alias11/32 to15/32. Separate
conditional validation passes every format/class; thin32/32 each unchanged.
All16 permitted LoRA tensors changed and the other162 saved tensors are exactly
unchanged in an independent safetensors audit. No export or external score.
This is a partial mechanistic repair, not a fixed factual evaluator. Thirteen
diagnostic listed names still pass thin JSON and fail qualified prose; ten miss
thin JSON, of which eight are aliases. The latter needs genuine source recall,
not merely format consistency. Training-anchor coverage is audited separately.
