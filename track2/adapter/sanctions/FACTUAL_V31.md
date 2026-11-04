# Varied scope grammar with fresh repair questions

V30 passes every original guard except qualified prose listed31/48 and primary
14/24. Alias17/24 and thin retention pass; all90 MLP/head tensors stay unchanged.
That narrow wording failure motivates grammar variation without adding more facts
or changing the primary-quality loss. V30 remains rejected, no export or node score.

V31 restarts parent13 and keeps the same64 source facts,32 updates,88 attention
tensors,lr0.0001,fp32,max512,no decay,clip1,seed2120261103,dropout off,recovery and
32 binding controls. Keep thin/early/late JSON token IDs exactly. Replace two prose
forms with six generic primary-claim frames and seven scope clauses, including
negated and affirmative identity qualifications. One prose view is short, one has
truth-independent reference metadata. Scope placement varies before/after the
claim. Assign identical grammar/scope/claim counts in listed and absent groups;
trim metadata jointly for both claimed verdicts. No exact old heldout identity
clause, provider fingerprint, captured body or pool material is trained.

Freeze96 fresh repair-validation questions from parent13's validation source,
24 primary/24 alias/48 absent, seed3120261104, excluding all previous experimental
and external query names/entities. Exclude ambiguous multi-ID names before scores.
Parent source-validation exposure is disclosed; these are fresh repair questions,
not pristine parent-held-out facts. Four additional unused paraphrases are frozen
before any model score. Evaluate all15 forms with65% per-class/primary/alias,
5pp thin retention and full Cartesian65% guards, fixed final step only.

Independent raw-CSV/source-split/span audit verifies160 facts,640 training views,
balanced grammar assignments, original JSON IDs, unchanged quality-loss AST,
max496 standard-validation tokens and142 in the unused forms. Training-only
primary pooling and unchanged standard178-tensor inference follow v30. No full
corpus, reserved/removal scores or submission; actual-node/binding/balanced external
proof remains required after any local pass.

V31 completed with one failure. Qualified-prose listed accuracy rose from 29/48
to 36/48, primary names from 14/24 to 16/24, and aliases from 15/24 to 20/24.
All four unused paraphrases and both thin-retention checks passed. Late-JSON
absent accuracy fell from 44/48 to 30/48, below the required 32/48. V32 targets
this failure using separate source examples and the final global attention layer.

```powershell
$env:HF_HOME='C:/Users/hyada/tg-eval/hf'
$env:HF_HUB_OFFLINE='1'
$py='C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$plan='track2/adapter/sanctions/evidence/v31-plan'
& $py track2/adapter/sanctions/probe_scope_curriculum.py prepare --home C:/Users/hyada/tg-eval --plan $plan
& $py track2/adapter/sanctions/audit_scope_curriculum.py --home C:/Users/hyada/tg-eval --plan $plan
# Require source-annotation-audit.json pass and matching frozen-input hash.
& $py track2/adapter/sanctions/probe_scope_curriculum.py run --home C:/Users/hyada/tg-eval --plan $plan
```
