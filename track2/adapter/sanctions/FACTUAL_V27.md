# Question-only factual supervision and answer-context invariance

V26 fails qualified listed25/48 and thin retention. Its training-only role head
recognizes primary decisions, while membership predictions vary with the answer.
Frozen ridge readouts fitted only on128 source training facts get question-only
parent13 listed30/48, absent38/48, alias12/24; v26 listed28/48, absent38/48,
alias11/24. These paired-development linear probes do not prove knowledge absence.
They do not establish a useful fact representation or constitute evaluator scores.

V27 restarts parent13. Keep the exact128 facts,32 binding controls,10 answer
views/query,32 balanced updates,seed2120261103,fp32,max512,AdamW/no decay,clip1,
main lr0.0001,auxiliary lr0.001,dropout off and atomic recovery. Train the same
176 LoRA tensors and769-parameter main head; external query/role heads add3,076
training parameters and remain outside the178 exported tensors.

Retain the complete v26 main correctness/ranking/membership/role objective. Add
0.5 question-only membership BCE at the query-name span, using source labels.
Add0.5 MSE between layer-normalized full-answer query-name features and detached
question-only features. Both claim polarities map to the same factual reference.
No labels, verdict, source-record metadata or answer tokens enter that reference.
Layer normalization is per768-vector. The question-only branch exists solely
during training. Standard inference remains one unmodified full-answer forward.

Reuse hash-bound v26 annotation/source audit, verify every question-only name
token ID matches its full-context position, and verify source train/development
names and entity IDs remain disjoint. Same96 paired-development questions, with
parent source-validation exposure disclosed. Keep65% per format, membership,
primary/alias and Cartesian guards plus5pp thin retention. Fixed final step only.
No full-corpus training, reserved/removal scores, signing or submission.

```powershell
$env:HF_HOME='C:/Users/hyada/tg-eval/hf'
$env:HF_HUB_OFFLINE='1'
$py='C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$plan='track2/adapter/sanctions/evidence/v27-plan'
& $py track2/adapter/sanctions/probe_isolated_membership.py prepare --home C:/Users/hyada/tg-eval --plan $plan
& $py track2/adapter/sanctions/audit_isolated_membership.py --home C:/Users/hyada/tg-eval --plan $plan
# Inspect and require a passing hash-bound annotation-audit.json before run.
& $py track2/adapter/sanctions/probe_isolated_membership.py run --home C:/Users/hyada/tg-eval --plan $plan
```
