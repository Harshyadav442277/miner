# Query binding and factual accuracy are separate measurements

The v7 benchmark fixes the length/source shortcuts in the older wrong-query
controls. It establishes a narrow relevance result, not sanctions registration
readiness. All scores below use the node's actual executor and f32 comparison.

## Frozen v7 measurements

128 previously unused public names were selected before miner calls: 64 exact
SDN members and 64 GLEIF legal-entity names absent from the exact-name index.
Development/final cohorts have 32 of each class. GLEIF names are CC0; the public
evidence contains selected names, LEIs, source URLs and hashes, not full records.
The SDN snapshot retrieval time was not recorded originally; no freshness is claimed.

904 requests across the declared public routes produced genuine same-query
disagreements and a separate counterfactual query-binding benchmark. The latter
uses **unchanged correct answer bodies**, swapped between questions. These swaps
are deliberate controls, not mistakes that the services actually made.

Each 40-pair binding cohort contains 20 reversal blocks, 40 distinct questions,
20 listed/20 exact-absent cases, and 8 pairs from each of five providers. Both
questions in a block have equal tokenizer prefix lengths. Every answer has the
same visible token sequence under reversal at the 256-token limit. Names must be
visible and unambiguous. No model scores influence selection.

| Measurement | v6 | v7 | Length baseline |
|---|---:|---:|---:|
| New development, 40 pairs | 33/40 | 40/40 | 50% |
| New final, 40 pairs | 36/40 | 40/40 | 50% |
| Old development controls, 20 pairs | 16/20 | 19/20 | See original controls |
| Own-format subset of old controls | 3/4 | 3/4 | Not a factual gate |

Final v7: 20/20 reversal blocks pass in both directions, no ties; the diagnostic
Wilson 95% lower bound over blocks is 83.89%. Blocks remain selected from one
snapshot and a few services; this interval does not establish population accuracy.
A simple question/name-overlap rule reaches 100% by construction. An answer-only
rule, character length, and visible token length each have a tie-aware ceiling of
50% on reversed pairs. This benchmark checks binding, not factual knowledge.

The original Bank of America failure changes direction in v7: America is right,
but the Bank of India question prefers the America response (12.102983 vs
5.984970). The known bank regression is **unresolved in v7**. The v7 final set
becomes a regression set for subsequent models.

## The factual gap remains open

The new real-answer capture yields 62 genuine disagreement pairs from only 14
distinct questions, **all listed**. Length scores 46/62 (74.19%). Always preferring
the positive match verdict scores 62/62. Several services appear only or mostly
on one side. These data fail `audit_factual_benchmark.py`; they cannot support a
factual-readiness claim or be pooled with counterfactual controls to inflate it.
Labels check scoped decisions, not every narrative or similarity field. Exact
absence does not mean all-list, fuzzy, ownership or identity clearance.

## Training provenance and a discovered defect

V7 warm-starts our v6 adapter, verifying all 178 adapter/head tensors. New
synthetic data teach no-match/no-match swaps and use no captured miner answers or
pool material. Kit test: 95.5% on 400 synthetic pairs. Tokenizer parity: 7,600
rendered texts, zero differences. Export and live-judgment Stage 1 pass.

A later independent source audit found **two v7 training queries** incorrectly
called normalized exact matches after the display helper removed parenthetical
text: `VIC DEL INC.` and `RAYYAN SHIPPING PRIVATE LIMITED`. Validation/test had
zero such cases. V7's archived inputs preserve this defect for reproducibility;
do not describe them as wholly source-clean. The hard-binding continuation
excludes both affected parent blocks. Its warm-start still inherits v7's weights.
The current generator preserves full source names; historical v7 replay must use
the archived JSONL inputs, not a regeneration with this correction.

## Replay

From the repository root, with the documented kit/foundation and package files
installed outside OneDrive:

```powershell
$py = 'C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$base = 'track2/adapter/sanctions'
& $py -m unittest discover -s $base -p 'test_*.py' -v
& $py "$base/verify_evidence.py" "$base/evidence/v7-miner-capture"
& $py "$base/verify_evidence.py" "$base/evidence/v7-binding-development"
& $py "$base/verify_evidence.py" "$base/evidence/v7-binding-final"
& $py "$base/verify_binding.py" "$base/evidence/v7-binding-development" "$base/evidence/v7-binding-final" "$base/evidence/v8-bank-final"
& $py "$base/measure_miners.py" "$base/evidence/v7-binding-final" --home C:/Users/hyada/tg-eval --versions '6,7'
```

Replay in a copy to preserve original logs. Exact input JSONL files are gzip
archived in `evidence/v7-plan/training-inputs`; their manifest records hashes.
Training: `train_v7.py --home C:/Users/hyada/tg-eval` after restoring inputs to
`pairs/sanctions_v7_binding`. `measure_v7.ps1` records export/Stage 1/runtime
commands, foundation hashes, identities, input roots and f32 bits. Stage 1
canonicalizes package bytes; use its final package manifest when checking hashes.

## Hard-bank continuation protocol

The continuation was frozen at commit `4e81b5e` before scoring v8 on external
answers. It warm-starts v7 and selects the checkpoint on synthetic validation
loss only. It uses 2,400/400/400 pairs: shared-word absent-name reversals plus
retained whole v7 listed/absent/verdict-flip blocks. Both invalid source-label
blocks are excluded. Candidate names, ids and programs are real public records;
word-set Jaccard scores are computed and explicitly described as comparisons,
not identity probabilities, global nearest searches or positive alerts. A source
audit checks all chosen fixtures. Rebuilding all three splits is byte-identical.

64 unused GLEIF names containing `bank` were frozen separately. All 192 requests
across three services returned HTTP200; 183 scoped decisions are correct, nine
abstain, and no genuine disagreement pair is defensible. The binding selection
retains 20 pairs/10 reversed blocks from two services, with at least 0.25 name-token
Jaccard overlap. The third lacks enough disjoint pairs passing the invariants.
This is an **absent-only bank stratum**, not a replacement for both-class factual
testing. The old bank example is development evidence, never an untouched test.

To replay training, restore `evidence/v8-plan/training-inputs-r2/*.jsonl.gz` to
`<home>/pairs/sanctions_v8_hard_binding_r2`; `training-inputs` records the first,
aborted attempt and must not be substituted. With the v7 checkpoint installed:

```powershell
& $py "$base/audit_synthetic_sources.py" --sdn C:/Users/hyada/tg-eval/data/sanctions/sdn.csv --alt C:/Users/hyada/tg-eval/data/sanctions/alt.csv --data C:/Users/hyada/tg-eval/pairs/sanctions_v8_hard_binding_r2 --out C:/Users/hyada/tg-eval/source-audit-replay.json
& $py "$base/train_v7.py" --home C:/Users/hyada/tg-eval --version 8 --parent-version 7 --data-dir sanctions_v8_hard_binding_r2
& "$base/measure_v8.ps1"
```

Use an unused output run directory to retrain; the wrapper refuses to overwrite
a completed run. CPU node measurements wait for GPU training to finish to avoid
memory pressure. Exact export and scoring commands are retained alongside results.

## V8 measured results

| Query-binding measurement | v6 | v7 | v8 |
|---|---:|---:|---:|
| Original development controls | 16/20 | 19/20 | **20/20** |
| Own-format subset of those controls | 3/4 | 3/4 | **4/4** |
| Balanced v7 final, now regression | 36/40 | 40/40 | **40/40** |
| Fresh absent-bank stratum | Not measured | 20/20 | **20/20** |

V8 has no ties on these sets. Both Bank of America/India directions pass. For
the harder Bank of India question, the unchanged correct answer scores 16.084156
versus 15.820303 for the wrong America answer, a modest margin of 0.263853. This
fixes that measured development regression; it does not establish arbitrary-prompt
robustness or a causal explanation for the change. The new bank set demonstrates
no regression, **not an improvement over v7**, which already solves it.

V8 passes all 20 balanced regression blocks and all 10 fresh bank blocks. Their
diagnostic Wilson 95% lower bounds are 83.89% and 72.25%, respectively. Do not pool
these with the old controls to manufacture an independent sample size or factual
accuracy estimate. The bank stratum covers only exact-absent names and two services.

The v8 kit test is 96.25% on 400 synthetic pairs. All 178 warm-start tensors were
verified; the checkpoint was chosen on synthetic validation loss (epoch 0).
Tokenizer parity: 6,400 rendered texts, zero differences. Stage 1 passes and the
commit-pinned public download matches the exact measured package:
SHA-256 `6dcf705b5f0550a0904d793fd71a6073c29ea024bba38cc2266794cbce778f4c`,
keccak `0x083cd65e298ac96b2a79804890c00e79dda968734b1d8cee93ea5a0f69851976`.
`evidence/v8-plan/hosting.json` records the URL and check. The v7 artifact is also
hosted for historical replay, explicitly labeled with its known training defect.

A fresh public clone with Windows line-ending conversion enabled replayed source
hashes, request routes and binding invariants. This is our reproducibility check,
not an independent developer activation or growth claim.

The genuine 62-pair factual slice was also scored without modifying the models:

| Genuine same-query disagreements | Correct | Accuracy |
|---|---:|---:|
| v6 | 29/62 | 46.77% |
| v7 | 20/62 | 32.26% |
| v8 | 31/62 | 50.00% |
| Full-body character length | 46/62 | 74.19% |
| Visible token length, tie-aware | 42/62 | 67.74% |
| Prefer match, using full-response labels | 62/62 | 100% |

V8 is above v6/v7 on this diagnostic slice, but still below the visible-length
reference. Full-body character length and verdict preference are dataset
diagnostics and may use fields outside the scorer's input window. Of 124 rendered
texts, 57 truncate at 256 tokens; visibility of every decisive claim within those
truncated responses has not been comprehensively audited. This is a further
factual-benchmark limitation. It wins every comparison for only 1 of the 14 contributing names;
v6 wins all for 2 names and v7 for 1. Repeated pairs are not independent trials.
These data neither establish factual improvement in the population nor clear
registration. The next factual gate needs genuinely observed mistakes in both
classes and balanced provider roles; external captures stay measurement-only.
**No v7/v8 registration is justified by this work.**

Nothing here authorizes or performs wallet actions, corpus uploads or registration.
