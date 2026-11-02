# Source aliases and general verdict representations

V10 starts from v8, not the rejected v9 checkpoint. It retains v9's independent
format sampling and equal membership balance, and adds two general data variants:

- Use an actual SDN alias for half of alias-eligible positive source entries;
  otherwise use the complete primary name. A valid alias can point to a different
  canonical name. Both are verified by the frozen source index. Training includes
  227 alias queries and 673 primary queries among 900 positive factual examples.
- Sample general boolean, integer 0/1 and string-enum verdicts, independently of
  truth. Fields span `matched`, `match`, `on_list`, `sanctioned` and `verdict`.
  No provider-specific field bundle, source label, text template or identity is
  copied. The JSON source audit checks the same semantics and source records.

The output remains a standard adapter delta. No decoding rule, provider detector,
external lookup or score wrapper is inserted into the runtime. These data changes
are hypotheses; their effects are not causally isolated.

Data: 2,400/400/400 pairs; training has 1,800 factual pairs and 600 whole binding
reversals. All 3,200 chosen fixtures and the entity/alias/query split audits pass.
Character-length training reference: 49.65%. Seed 42, two epochs, learning rate
0.00005, rank 8/alpha 32, max 256, batch4/accumulation4/eval1. Checkpoint selection
uses synthetic validation loss only. Exact inputs are gzip-archived in `v10-plan`.

The 128-name cohort frozen for v9 remains unused for model selection. All 640
declared HTTP calls succeeded. Conservative labels yield 69 genuine pairs from
15 distinct names, all listed. Its actual visible-length reference is **71.74%**;
the one-sided errors and provider roles prevent a readiness claim. V8 and the
next fixed passing candidate will be scored on the same unchanged responses.

The measurement script now stops a candidate after the old factual slice if it
does not beat that slice's 67.74% visible-length reference. This preserves the new
cohort from repeated tuning. Passing the development threshold is necessary, not
a submission gate. Source/class coverage, query regressions and the new result
still have to be assessed. No wallet, pool or registration action is authorized here.

```powershell
$py = 'C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$base = 'track2/adapter/sanctions'
& $py "$base/train_v7.py" --home C:/Users/hyada/tg-eval --version 10 --parent-version 8 --data-dir sanctions_v10_alias_schema
& "$base/measure_v9.ps1" -Version 10 -DataDir sanctions_v10_alias_schema -PlanName v10-plan
```

Restore the archived inputs to the named external directory before replay, use a
fresh run directory, and preserve original evidence. The generic builder flags
are `--alias-fraction 0.5 --vary-claims --seed 1120261102`. All earlier measured
queries and the reserved fresh cohort must be passed with `--exclude-queries`.

V10 was rejected at **20/62 (32.26%)** on the old factual development slice.
Its synthetic test was 88.75%; both tokenizer parity and Stage 1 passed, but the
actual factual threshold did not. `v10-plan/development-gate.json` records the
failure. The pipeline automatically stopped before fresh-cohort model scoring.
