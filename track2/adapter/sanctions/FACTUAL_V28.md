# Fixed source-fit duration control

V25's ordinary-ranking probe is not fitted to its128 source facts after32 updates:
thin listed34/64, alias16/32, late-JSON absent28/64. V27's added invariance losses
collapse late-JSON absent to0/64 even on source training. Test optimization duration
with the simpler v25 objective before changing the loss again.

V28 restarts parent13 with the exact v25 data, five forms, ordinary Cartesian
softplus(wrong-correct),178 trainable main tensors,lr0.0001,fp32,max512,AdamW/no
decay,clip1,seed2120261103,dropout off and atomic recovery. Freeze128 total updates,
four balanced passes over the SAME128 source facts, not the full42,382-pair corpus.
Every update has hard-listed,hard-absent,replay-listed,replay-absent queries. Shuffle
each group per epoch using the same seeded RNG. No auxiliary head or new objective.

After update32, require all178 saved tensor values and the loss trajectory to match
v25 exactly. Stop if reproduction fails. This makes the additional96 updates a
duration control. Source data/audit hashes are bound, exact query identity matches
v27's independently verified224 source questions, and all current source hashes
are rechecked. No new facts, captured bodies, pool data or provider cues enter.

No development measurement or checkpoint selection during training. Evaluate only
fixed update128. Require95% in every trained-format source-training membership,
primary and alias stratum; keep original65% development per-format/class/alias,
5pp thin retention and Cartesian guards. The same96 questions are paired DEVELOPMENT,
with parent source-validation exposure disclosed. Any pass still needs actual-node,
binding and balanced genuine external evidence. No full-corpus run or submission.

Update32 replay passed: all178 tensors exactly equal v25; maximum loss difference
0 across all32 steps. Additional duration is running; no final result yet.

```powershell
$env:HF_HOME='C:/Users/hyada/tg-eval/hf'
$env:HF_HUB_OFFLINE='1'
$py='C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$plan='track2/adapter/sanctions/evidence/v28-plan'
& $py track2/adapter/sanctions/probe_fit_duration.py prepare --home C:/Users/hyada/tg-eval --plan $plan
# Require source-audit.json pass and matching frozen-inputs SHA before run.
& $py track2/adapter/sanctions/probe_fit_duration.py run --home C:/Users/hyada/tg-eval --plan $plan
```
