# Listed-name recall diagnosis

These are controlled HF float32 diagnostics, not node-runtime or submission scores.
The fixed128 questions comprise32 current primary names,32 aliases and64 exact
absences. Each question is repeated across seven equivalent answer formats.
Every full rendered answer fits256 pinned tokens. No truncation or optimization
occurs in the factorial or wording ablation. Source hashes and exact questions
are in frozen-protocol.json; raw logits, class counts and cross-format comparisons
are retained in each version's factorial JSON.

| Model | Thin listed | Qualified prose listed | Thin absent | Qualified prose absent |
|---|---:|---:|---:|---:|
| V3 |63/64|24/64|5/64|47/64|
| V13 |54/64|34/64|56/64|63/64|
| V15 |52/64|3/64|27/64|63/64|
| V16 bounded repair |54/64|41/64|56/64|60/64|

High listed recall alone can reflect an indiscriminate match prior: V3's thin
format misses59/64 absences. V13 is substantially more balanced in thin JSON,
but aliases remain weaker than primary names (24/32 versus30/32). Source knowledge
coverage is incomplete even before changing representations.

The prose format uses MATCH/NO MATCH followed by a separate identity qualification.
V13's prose margins retain a0.948 correlation with thin margins, but shift towards
NO MATCH (linear-fit intercept-1.234). This is a descriptive diagnostic, never a
score calibration or runtime adjustment. V15 has much stronger representation
instability despite training with multiple answer forms.

The32-question wording ablation conditions on correct v13 thin decisions and
uses8 primary,8 alias and16 absent questions. It changes only capitalization,
wrapper and qualification wording. In the original uppercase prose wrapper:

| Qualification | Listed | Absent |
|---|---:|---:|
| None |15/16|16/16|
| Identity is not established by name alone. |9/16|16/16|
| Identity requires corroborating identifiers beyond this name. |14/16|16/16|

Lowercase results follow the same pattern:16/16,11/16,15/16 listed; absent16/16
throughout. This supports leakage from negated identity scope into the unrelated
membership decision. It does not prove every low-recall error has that cause.
The conditional32 are development anchors, not a population accuracy estimate.
Masked batching agrees with singleton scoring within0.001 on16 checked texts.

Reproduce from the repository root with HF_HOME pointing to tg-eval/hf and
HF_HUB_OFFLINE=1. Use a new output directory; scripts refuse to overwrite the
factorial protocol. The pinned kit/base/model hashes are retained with outputs.

```powershell
& C:/Users/hyada/tg-eval/.venv/Scripts/python.exe track2/adapter/sanctions/diagnose_fact_formats.py --home C:/Users/hyada/tg-eval --out C:/Users/hyada/tg-eval/replay-listed-recall
& C:/Users/hyada/tg-eval/.venv/Scripts/python.exe track2/adapter/sanctions/ablate_verdict_wording.py --home C:/Users/hyada/tg-eval --diagnosis C:/Users/hyada/tg-eval/replay-listed-recall --out C:/Users/hyada/tg-eval/replay-wording.json
```

FACTUAL_V16.md freezes a bounded weight-level repair, using independent source
training questions and generic scope language. The exact diagnosed qualification
remains measurement-only. No captured answer, provider template, inference wrapper
or reserved external scoring is introduced. Both factual classes and thin-format
retention are gates before further training/export.

V16's one32-step trial improves qualified listed prose by7/64 while preserving
thin JSON class counts, but41/64 is64.0625%, below the frozen65% gate. It stops
before export or external scoring. Its limited improvement does not repair the
remaining alias recall or establish benchmark/submission readiness.
