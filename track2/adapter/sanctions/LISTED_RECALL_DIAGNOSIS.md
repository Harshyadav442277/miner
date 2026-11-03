# Why listed-name accuracy is low

The model is sensitive to how a decision is expressed, with an additional alias
recall weakness. Adding more source names or exposing more answer tokens did not
resolve real-answer ranking. No factual candidate is ready for submission.

## Controlled findings

The same128 questions, all complete within256 tokens, isolate representation:
v13 listed54/64 in thin JSON versus34/64 in qualified MATCH/NO MATCH prose.
Absent56/64 versus63/64 shows a shift toward NO MATCH, not uniform degradation.
On32 thin-correct anchors, adding a separate negated identity qualification drops
listed15/16 to9/16, absent16/16 unchanged. This supports leakage of unrelated scope
negation into the exact-membership decision. V13 also misses8/32 aliases in thin
JSON, versus2/32 primary names, so source recall is incomplete.

The historical real-answer questions include11 aliases and3 primary names.
V13/v17 recognize12/14 in thin JSON, yetv17 wins only22/53 actual-node real-answer
comparisons for those recognized names,18/37 when both claims are visible256.
Thus missing facts and truncation alone do not explain the real-answer failure.
These conditional subsets are diagnostics; the original62-pair benchmark remains.

V18 exposes512 tokens with exactly v17's178 tensors and all machine claims visible.
It falls from22/62 at256 to14/62 at512, against46/62 length. The parent trained256,
so this is context transfer, not matching-context training. HF/node synthetic
agreement is32/32 orderings per model forv13/v17, maximum logit difference<0.00003.
Export mismatch is not the measured cause.

## Repairs and guards

| Probe | Intervention | Result |
|---|---|---|
| V16 |32 steps, final two LoRA layers, format consistency|Listed prose34/64 to41/64; fails65% guard|
| V17 |Same budget, source anchors with known format errors|Fresh prose36/64 to44/64, absent63/64 unchanged; actual22/62, rejected|
| V19 |Distill thin scores into complete source-metadata answers|Late-JSON listed46/48 but absent9/48; rejected before export|
| V20 |Same anchors/loss, all encoder LoRA layers|Late prose19/48 to43/48; late-JSON absent25/48 and qualified-primary15/24 fail|
| V21 |Distill factual margins rather than absolute scores|Late prose listed46/48, but absent late JSON25/48,early JSON28/48,late prose31/48 fail|
| V22 |Ordinary joint encoder/head pairwise ranking|Thin listed41/48 to34/48; qualified prose26/48 and alias12/24 fail|
| V23 |Restore parent head on v22 encoder, no optimization|Thin listed35/48; qualified prose26/48; fails|
| V24 |Restore parent MLP/head on v22 attention, no optimization|Thin listed39/48; qualified prose26/48 and alias12/24 fail|
| V25 |64 source errors plus64 correct replay,32 joint-ranking steps|Late-JSON absent24/48, qualified prose listed24/48; fails|
| V26 |Same128 facts plus training-only membership/verdict heads and binding replay|Qualified prose listed25/48 and alias11/24; thin retention fails|

V20's training check gets thin64/64, but only22/32 absent late-JSON cases right.
The remaining failure includes underfit on the repair examples. V21 therefore
targets the correct-minus-wrong margin directly, retaining the same source facts,
capacity, seed, step budget and inference path. Its fresh repair-validation cohort
excludes previous groups; parent13's original source-validation exposure remains
explicit. None is claimed a pristine parent-held-out factual test.

Every probe uses source facts and generic generated representations. No captured
answer body, provider fingerprint, hidden-pool row, inference wrapper or score
correction is trained. Source splits/hashes and individual class counts are kept.
Both membership classes, primary/alias strata, thin retention and Cartesian
comparisons must pass before export. A synthetic pass still needs actual-node
factual and binding gates. The original reserved69 and removal capture stay unscored.

The genuine removal search found11 pairs across3 names but0 frozen source-role
reversal blocks, so it cannot establish balanced factual validity. Even beating
the historical length baseline would not by itself establish submission readiness.

V26's training-only role head correctly identifies1,533/1,536 primary-decision
tokens and labels all2,334 secondary-negation tokens as background. These are
correlated-token development diagnostics, not evaluator accuracy. Its membership
head gets287/480 listed and369/480 absent views right; predictions change across
answer forms for82/96 questions, despite identical factual membership. Query-name
token positions exclude the answer, but bidirectional attention can still encode
answer context. Removing the answer yields47/48 listed and6/48 absent correct
with that existing auxiliary head. This context shift therefore mostly induces a
listed prior, not reliable factual retrieval. Auxiliary heads are never deployed.

The completed diagnostic fits fixed ridge readouts on frozen question-name features,
with source labels from the128 training facts and no development fitting. It
compares parent13 and26, question-only versus all-answer-view feature fitting.
This tests linear accessibility and context dependence, not a deployable repair;
poor readout accuracy alone cannot prove that factual knowledge is absent.
Question-only readouts get parent13 listed30/48,absent38/48,alias12/24 versus
v26 listed28/48,absent38/48,alias11/24. Parent training fits listed60/64,absent61/64,
so its source fit does not establish alias transfer. The name-token-length control
gets only41/96 development questions right. Full-view fitting yields stable
predictions across all11 development contexts for44/96(parent13),45/96(v26).
The10-view fit repeats correlated source facts and uses the same absolute ridge
penalty, so differences between readouts are not a controlled causal attribution
to context coverage alone. No encoder/checkpoint changed during this diagnostic.

V27 now tests training-only question membership and normalized query-feature
invariance, preserving the same128 facts/32 updates and standard inference path.
It is a bounded probe; no result or repair claim yet. See FACTUAL_V27.md.

Frozen dependency hashes use raw script bytes. Git attributes now preserve those
bytes, including v21's original CRLF source; no code behavior changed in that
preservation. Verify published source with `python track2/adapter/sanctions/verify_probe_sources.py`.
All17 dependency references forv21,v22,v25,v26,v27 match staged Git blobs.

Recipes: FACTUAL_V16.md, FACTUAL_V17.md, FACTUAL_V19.md, FACTUAL_V20.md,
FACTUAL_V21.md, FACTUAL_V22.md, FACTUAL_V25.md, FACTUAL_V26.md. Raw results: evidence/listed-recall-diagnosis,
evidence/old-query-form-diagnosis and each version's plan. Regression suite:
31 tests pass on2026-11-03. Source feature branch and rejected replay artifacts
are public; no registration or submission action was taken.
