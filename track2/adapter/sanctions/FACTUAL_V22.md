# Ordinary pairwise ranking with joint reward-head learning

V21 improves listed decisions but fails absent early JSON28/48,late JSON25/48
and late prose31/48. Reject before export. V22 tests a standard ranking recipe
without teacher-confidence targets or a frozen reward head. It combines those
changes and cannot attribute any gain to just one of them.

Same64 source-verified thin-correct anchors, parent13, five source-only formats,
32 steps,lr0.0001,training seed/order,max512,fp32,AdamW no decay,clip1 and recovery.
Train all176 LoRA tensors and existing769 reward-head parameters jointly; base
foundation stays frozen. Average softplus(wrong-correct) over every within-query
format combination, the ordinary pairwise logistic objective. No MSE, teacher
margin targets, consistency penalty, score wrapper or inference calibration.

Freeze96 new repair-validation questions from parent13 val,seed2420261103,
24 primary/24 alias/48 absent, excluding v20/v21 and all prior groups. Parent
used the original source split for checkpoint validation; disclose that exposure.
Teacher values remain provenance of source-anchor selection and are not loss
targets. All per-format/class/primary/alias65%,thin-retention5pp and Cartesian65%
guards apply before export. Fixed final step only, no checkpoint selection.
This is a64-example bounded probe, not a full-corpus run or submission.

Completed and rejected: thin listed41/48 to34/48 exceeds5pp loss; qualified
prose listed26/48, alias12/24. No export or actual-node score. V23 restores the
original head with no optimization: thin35/48, qualified26/48. V24 restores the
original MLP/head: thin39/48, qualified26/48. Both still fail. These fixed module
restorations use the same paired-development cohort and cannot localize factual
knowledge to a module. Full results in evidence/v22-plan through v24-plan.
