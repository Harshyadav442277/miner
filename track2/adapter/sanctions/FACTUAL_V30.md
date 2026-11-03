# Local primary-claim quality with preserved MLP and reward head

V28 largely fits its128 facts but loses broader listed/alias performance. V29
restoring the MLP/head still fails retention and qualified aliases12/24. V26 role
labels represented asserted polarity, not fact/claim correctness, and failed on
qualified positive tokens. Test correctness supervision directly at the primary
decision tokens while preserving the original factual MLP/head weights.

Parent13,64 original thin-correct source replay facts,32 balanced updates over two
passes,lr0.0001,fp32,max512,AdamW/no decay,clip1,seed2120261103,dropout off,recovery.
Train only88 attention LoRA tensors(811,008 parameters), freeze MLP88/head2.
Keep ordinary full-answer Cartesian softplus(wrong-correct). Add0.5 of the same
ranking loss from primary-decision token pooling through the SAME frozen prediction
head/dropout/classifier. Correctness includes the query, not merely claimed MATCH.
One same-source binding row per step has weight0.25,16 absent/16 listed, reversed
and prefix-matched. No newly initialized heads or teacher-confidence loss.

Primary pooling is used exclusively in training loss. Ordinary inference, input
rendering and the178 exported tensors remain unchanged. No runtime parser or
score wrapper. Verify all MLP/head saved tensors remain exactly parent13. Source
and primary-span annotations are hash-bound to previous independently verified
fixtures; new binding spans are independently decoded. No captured or pool bodies.

Same96 paired-development questions, with parent exposure disclosed, not an
independent test. Keep original65% every format/class/primary/alias and Cartesian
guards plus5pp thin retention. Fixed final step. Any pass still needs actual-node,
binding and balanced genuine external proof. No full-corpus run or submission.

```powershell
$env:HF_HOME='C:/Users/hyada/tg-eval/hf'
$env:HF_HUB_OFFLINE='1'
$py='C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$plan='track2/adapter/sanctions/evidence/v30-plan'
& $py track2/adapter/sanctions/probe_primary_quality.py prepare --home C:/Users/hyada/tg-eval --plan $plan
# Require source-annotation-audit.json pass and matching input hash before run.
& $py track2/adapter/sanctions/probe_primary_quality.py run --home C:/Users/hyada/tg-eval --plan $plan
```
