# Learn factual margins instead of absolute response scores

V20 misses10/32 absent training cases in late JSON, despite64/64 thin training
decisions. Its late-JSON absent repair-validation score is25/48. The loss can
reduce raw score differences between formats without learning the needed verdict
contrast. This diagnosis motivates a bounded objective change, not a full run.

V21 retains exactly v20's64 source anchors/teacher targets, parent13,176 encoder
LoRA tensors, frozen classifier/base,32 steps,lr0.0001,training seed/order,
fp32,max512,dropout-off checkpointing and atomic recovery. It changes the loss to
mean squared error of per-format correct-minus-wrong margins against the parent's
frozen thin margin, plus0.1 within-truth score variance and0.2 mean Cartesian
softplus(1-correct+wrong). Forward/inference remains unchanged; no calibration.

Freeze96 new repair-validation questions from parent13 val before any scores,
seed2320261103,24 primary/24 alias/48 absent. Exclude v20 validation and every prior
group/entity. Parent used this source split for checkpoint validation; disclose
that exposure and do not claim pristine parent-held-out factual accuracy.
All earlier per-format/class/primary/alias65%,thin-retention5pp and Cartesian
65% guards apply. Evaluate only the fixed final step, preserve every failure.
No reserved external scores, full-corpus training, registration or submission.
