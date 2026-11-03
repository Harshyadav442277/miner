# Training-only fact membership and primary-verdict roles

V25 still fails absence late JSON24/48 and qualified-prose listed24/48. The new
source-correct hard/replay coverage is retained. V26 adds direct supervision for
two necessary factual factors: source membership and what the answer asserts.
Query relevance remains a separate requirement. This is a hypothesis, not a fix.

Same128 source facts, parent13,32 balanced updates,lr0.0001,fp32,max512,no decay,
clip1,seed2120261103,dropout-off checkpointing/recovery. Main model trains its
standard176 LoRA tensors and769-parameter reward head. Two external training-only
linear heads read final token features:768-to1 from query-name pooling predicts
source membership;768-to3 token classifier predicts background,primary MATCH,
primary NO MATCH. They add3,076 training parameters and are never exported.
Existing model lr is0.0001; freshly initialized auxiliary heads use0.001.

Annotation derives exact query and primary-decision spans from generated source
fixtures. Both asserted polarities occur for every query, with constant factual
membership. Nonprimary negation tokens and sampled answer tokens are background,
including identity/scope qualifications. Exact token IDs must equal the original
renderer; every full text fits512. No gold labels are inserted into model input.

Loss: main binary correctness BCE +Cartesian pairwise softplus(wrong-correct)
+0.5 membership BCE +0.5 token-role CE. Role CE balances primary tokens and sampled
background within each view. Source membership comes from verified CSVs, asserted
polarity from the generated claim, correctness from equality of those factors.
No teacher-confidence targets, inference parser, retrieval or score correction.

Replay32 source-only wrong-query controls from the same128 facts,16 listed and
16 absent. Prefix lengths match and both pair directions are included. Both
responses retain the same truthful verdict, including no-match/no-match, but the
off-topic response has correctness0. One control per update contributes0.25 of
the same supervised loss. Membership/claim roles remain independently correct;
this prevents equating factual polarity agreement with complete answer quality.
These are declared counterfactual controls, not observed miner errors.

Auxiliary modules remain outside the PEFT model, are saved separately for replay,
and are discarded for standard178-tensor export. Same v22 paired DEVELOPMENT cohort,
not new independent validation. All class/alias/primary65%,thin-retention5pp and
Cartesian65% guards remain. Auxiliary metrics cannot override main-model failures.
No full-corpus training, reserved scores, wallet, registry or submission action.

Completed and rejected: thin listed36/48 loses5/48 from parent; early-prose
listed28/48, late-prose30/48, qualified-prose25/48 and alias11/24 fail. Standard
main checkpoint contains178 tensors, no auxiliary modules; it was not exported.

Training-only diagnostics on96 paired-development queries: primary-decision
role1,533/1,536 tokens correct; secondary-negation role2,334/2,334 background.
Membership listed287/480 and absent369/480 correlated views correct, stable
across all10 answer views only14/96 queries. The same head on question-only
features gets47/48 listed but6/48 absent correct. This is context sensitivity
and a listed prior, not a successful fact classifier. It does not prove absence
of knowledge or establish a deployed parser fix. Raw files: auxiliary-diagnostics.json
and query-only-membership.json. All original main-model gates still apply.
