# Distill known facts into complete source-only answer representations

V17's short-form synthetic repair fails actual old62 at22/62. V18 uses exactly
the same tensors at512, with all machine claims visible, and falls to14/62.
Old-question controls show v13/v17 recognize12/14 names in thin JSON; v17 still
wins22/53 real comparisons for those recognized names,18/37 with visible256 claims.
Thus source recall and visibility alone cannot explain the remaining failure.
V13 andv17 HF/node rankings agree on32 synthetic pairs each, max logit error<0.00003.

Freeze one bounded distillation test: parent13,seed2120261103,max512,32 steps,
four questions per step,AdamW lr0.0001,weight_decay0,clip1,fp32,dropout disabled.
Only16 LoRA tensors in layers20/21 are trainable; classifier and other162 saved
tensors remain unchanged. Train64 source facts (16 primary,16 alias,32 absent),
selected only when parent thin decision is right. No captured response is trained.

Five train forms: thin JSON, JSON verdict before/after neutral source metadata,
prose verdict before/after that metadata. Compute truthful counts, hashes, scope
and official file URLs from the already audited v15 metadata manifest. Metadata
is identical across truth changes and independent of membership. Remove trailing
neutral fields only to fit512 fully; never truncate a verdict or change truth.
This is generic source information, with no provider schema/template or engine id.

For each source fact, freeze the parent's two thin scores. Optimize mean squared
error between every equivalent response and its corresponding thin target, plus
0.2 mean softplus(1-correct+wrong) across all format combinations. The forward
model/inference and standard exported adapter are unchanged; no score correction.

First freeze96 new test questions (24 primary,24 alias,48 absent), without scores.
Exclude every previous repair/diagnostic/external question and source entity from
the new holdout and anchors. Source-test absent identities are held out from repair;
positive public knowledge exposure in parent13 is explicitly retained.
Evaluate the fixed final step on these questions in all five train forms plus
the existing seven generic diagnostic forms. Require65% each listed/absent and
primary/alias stratum in every form; thin class losses no more than5pp. Preserve
every failure; no checkpoint selection, full run, reserved scoring or submission.
Passing synthetic gates only permits actual historical factual/binding checks.

Result: rejected before export. Late-JSON listed27/48 to46/48, but absent45/48
to9/48. Thin absent40/48 to37/48 exceeds5pp loss. Late prose listed31/48 fails65%,
alias15/24 fails65%; generic qualified prose alias15/24 also fails. Full Cartesian
listed improves66.12% to84.02%, absent78.46% to76.84%, but those aggregates cannot
override the per-format false-positive collapse. All16 permitted tensors changed;
162 saved tensors remain unchanged. No actual-node or reserved score for v19.
An initial independent raw-CSV count included Treasury's trailing DOS EOF marker.
That attempt was stopped before any optimizer step, archived, and the audit fixed.
Refreeze keeps questions, teacher scores, metadata and source bytes identical;
only mandatory audit-guard provenance changes. The corrected160-query audit passes.
