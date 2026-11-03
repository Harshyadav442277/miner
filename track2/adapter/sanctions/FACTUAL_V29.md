# Fixed restoration after source-fit overfitting

V28 improves source-training thin listed34/64 to63/64, aliases16/32 to32/32,
but paired-development thin stays34/48 listed and falls to15/24 aliases. Qualified
prose listed23/48,aliases10/24 fail; both thin membership classes lose>5pp.
Longer optimization mostly fits the128 repair facts while losing broader ability.

V29 has no optimizer. Retain v28's88 attention LoRA tensors; restore parent13's
88 MLP LoRA tensors and two reward-head tensors. Verify all178 exact identities,
source28 checkpoint hash against its result and parent13 hash against frozen inputs.
Save the standard178-tensor PEFT checkpoint, with no inference path modifications.

Same96 paired-development questions, explicitly reused, not an independent test.
Apply original65% per-format/class/primary/alias,5pp thin retention and Cartesian
gates. This is a fixed restoration diagnostic, not proof that knowledge resides in
one module. The95% source-fit requirement was specific to v28's fit-duration test;
v29 does no source fitting. Passing still requires actual-node, binding and balanced
genuine external evidence. No full-corpus run, reserved/removal score or submission.

Completed and rejected: thin listed still loses>5pp; qualified listed27/48,
aliases12/24, early-prose listed27/48 and aliases12/24 fail. All178 tensor mixture
identities verified before scoring. No export or node/reserved score.

```powershell
$env:HF_HOME='C:/Users/hyada/tg-eval/hf'
$env:HF_HUB_OFFLINE='1'
& C:/Users/hyada/tg-eval/.venv/Scripts/python.exe track2/adapter/sanctions/probe_module_restore.py --home C:/Users/hyada/tg-eval --plan track2/adapter/sanctions/evidence/v29-plan --version 29 --source-version 28 --restore mlp_head
```
