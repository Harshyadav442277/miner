# Smaller update from the earlier source-trained checkpoint

V9 scored 13/62 and v10 scored 20/62 on the old factual development slice. Both
failed the 67.74% visible-length reference. Their fresh-cohort scoring was stopped.
V3, measured as a historical reference, scores 41/62 (66.13%). It is the strongest
measured model on this slice so far, but still below the reference.

V11 starts from v3 and takes a smaller update: one epoch, learning rate 0.00001,
seed 42, rank8/alpha32, max256, batch4/accumulation4/eval1. It uses the exact v10
source-audited 2,400/400/400 inputs. No measured entity, alias or query is added to
the new training pairs. This changes initialization and update size; it does not
isolate which factor explains any gain. The kit still selects on synthetic val loss.

## Inherited knowledge is explicitly disclosed

We reconstructed all three original v3 data splits byte for byte from its original
builder revision and seed. Its public SDN training source entities overlap **50/62
old comparisons and 65/69 fresh comparisons**. This information existed in the
parent checkpoint before these captures; no captured answer is used for training.

Consequently v11 evaluates unseen external answers and representations against
partly known source entities. It is **not an unseen-entity experiment**. The new
data split audit applies only to the new pairs, not inherited model knowledge.
The overlap report is retained at `v11-plan/parent-knowledge-overlap.json`.

The 128-name/640-response capture remains unscored by any model. It was frozen
before the v9/v10 experiments; source labeling yields 69 genuine pairs/15 names,
all listed, with a visible-length reference of 71.74%. Its one-sided source/error
coverage remains a limitation independent of overlap. No registration readiness
is inferred just from beating either reference.

```powershell
$py = 'C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$base = 'track2/adapter/sanctions'
& $py "$base/train_v7.py" --home C:/Users/hyada/tg-eval --version 11 --parent-version 3 --data-dir sanctions_v10_alias_schema --lr 0.00001 --epochs 1
& "$base/measure_v9.ps1" -Version 11 -DataDir sanctions_v10_alias_schema -PlanName v11-plan
```

Use the archived v10 inputs and an unused run directory. The pipeline halts before
fresh scoring if old development accuracy does not beat its actual-input reference.
All scores use the standard packaged adapter in the node runtime. There is no
provider exception, inference-time lookup, ensemble or score calibration wrapper.
