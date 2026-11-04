# Source-only late-JSON correction in the final global attention layer

V31 fixes qualified listed29/48 to36/48 and aliases15/24 to20/24; all four unused
paraphrases pass. Only late-JSON absent30/48 fails65%. It is rejected without export.

Mine new source facts only: fixed pools256 primary/256 alias/256 absent, seed3220261104,
excluding every previous experimental/external name/entity. Pick16 primary/16 alias
thin-and-late-correct controls,32 absent thin-correct/late-wrong cases with0.0001
margin buffer. Add unchanged64 v31 replay facts and binding controls. Source labels
come from CSVs. Teacher correctness is used solely to choose format errors and to
preserve already correct source-format logits; it is not factual ground truth.

Start v31, train only final global layer21's four attention LoRA tensors(36,864
parameters);174 other saved tensors remain identical.32 balanced steps,lr0.000025,
fp32,max512,AdamW/no decay,clip1,seed2120261103,dropout off,atomic recovery. Keep
global Cartesian ranking+0.5 primary-quality ranking and0.25 binding control.
Add0.1 MSE on teacher logits only when BOTH views in a source format have a correct
teacher ordering; incorrect preferences are never retained. No runtime correction,
parser, retrieval or head change. Ordinary178-tensor inference remains unchanged.

Same96 v31 questions/15 forms are now explicitly paired DEVELOPMENT. Original
65% per-format/class/primary/alias,5pp thin retention against parent13 and Cartesian
65% guards remain. Fixed final step. Raw-CSV/source split/mining/span/retention-mask
audit required before optimizer. No full corpus, reserved/removal score, wallet
or submission. Actual-node/binding/balanced genuine external proof still required.

```powershell
$env:HF_HOME='C:/Users/hyada/tg-eval/hf'
$env:HF_HUB_OFFLINE='1'
$py='C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$plan='track2/adapter/sanctions/evidence/v32-plan'
& $py track2/adapter/sanctions/prepare_late_json_patch.py --home C:/Users/hyada/tg-eval --plan $plan
& $py track2/adapter/sanctions/audit_late_json_patch.py --home C:/Users/hyada/tg-eval --plan $plan
# Require a passing input-hash-bound audit before run.
& $py track2/adapter/sanctions/probe_late_json_patch.py run --home C:/Users/hyada/tg-eval --plan $plan
```

V32 completed. Late-JSON absent rose from 30/48 to 31/48. Thin listed fell
from 40/48 to 39/48 against the original parent baseline of 42/48. Qualified
prose stayed at 36/48 listed and 20/24 aliases. Both failing gates block export.

V33 restarts V31 with the same audited source facts and four trainable tensors.
It applies direct ranking to late JSON and weight-1 score retention to other
source formats with correct teacher orderings. Binding replay is unchanged.
The 32-step budget and all 15 development gates remain in force.

V33 finished at 31/48 late-JSON absent and 40/48 thin listed. V34 doubled
absent late-JSON correction weight and retained correct teacher scores in all
formats. It reached 33/48 late-JSON absent and 39/48 thin listed. Qualified
prose stayed at 36/48 listed and 20/24 aliases in both runs. V33 fails the
late-JSON gate. V34 fails the original thin retention gate. All counts come
from the same paired development cohort. Both adapters remain unexported.
