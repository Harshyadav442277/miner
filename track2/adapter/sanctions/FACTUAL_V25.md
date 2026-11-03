# Source factual-error correction with balanced replay

Previous repairs selected only parent-thin-correct facts. That could address form
sensitivity but omitted direct correction of the parent's factual failures.
The new source scan finds99 primary,84 alias and115 absent failures among its
fixed candidate pools. Select16 primary,16 alias,32 absent errors, excluding all
prior repair/validation/external groups; retain the original64 correct replay.
Independent raw-CSV/source-split audit verifies128 questions,64 per membership
class, no teacher-score ties, maximum thin length149. Canonical record fields are
provenance only and are not automatically included as answer truth cues.

V25 uses parent13, ordinary Cartesian softplus(wrong-correct), all176 LoRA plus
existing769 reward-head parameters,lr0.0001,fp32,max512,no decay,clip1,dropout off,
training seed2120261103 and atomic recovery. Same32 optimizer steps/128 query
presentations as before, now128 distinct facts once. Every update has one hard
listed,hard absent,replay listed,replay absent question. No teacher-score loss.

Reuse unchanged v22 validation as paired DEVELOPMENT evidence, not a new independent
test. It is disjoint from all128 training queries/entities; parent13 source-validation
exposure stays explicit. Keep65% each format/membership/primary/alias,thin-retention
5pp and Cartesian65% guards. Fixed final step only. Passing still needs actual-node
and independent factual/binding evidence; no full-corpus run or submission here.

Completed and rejected: thin listed36/48 fails retention; late-JSON absent24/48,
qualified-prose listed24/48 and alias11/24 fail. More direct source-error coverage
alone has not fixed transfer. No export, node/reserved score or full-corpus run.

Read-only source TRAINING fit: thin listed34/64,alias16/32; early-prose listed34/64;
late-JSON absent28/64. The32-step budget has not fitted these facts. This is not
only a development-transfer failure. V28 freezes a duration-only four-pass control
on exactly these128 facts, with first32 tensor/loss reproduction required.
