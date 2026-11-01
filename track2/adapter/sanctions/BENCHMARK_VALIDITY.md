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
& $py "$base/measure_miners.py" "$base/evidence/v7-binding-final" --home C:/Users/hyada/tg-eval --versions '6,7'
```

Replay in a copy to preserve original logs. Exact input JSONL files are gzip
archived in `evidence/v7-plan/training-inputs`; their manifest records hashes.
Training: `train_v7.py --home C:/Users/hyada/tg-eval` after restoring inputs to
`pairs/sanctions_v7_binding`. `measure_v7.ps1` records export/Stage 1/runtime
commands, foundation hashes, identities, input roots and f32 bits. Stage 1
canonicalizes package bytes; use its final package manifest when checking hashes.

Nothing here authorizes or performs wallet actions, corpus uploads or registration.
