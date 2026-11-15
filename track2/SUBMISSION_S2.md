# Season II Evaluator entry draft: learning what our sanctions judge measures

Status: **research/tooling contribution; registration readiness not established**.
Network: Ethereum Sepolia / Telegraph devnode. The owner also operates LiveCert, a
sanctions miner included in the public captures. That relationship is disclosed; our
calls are not independent adoption, paid demand or ranked-routing evidence.

Telegraph uses an evaluator delta on a pinned shared ModernBERT foundation to order
answers. Each answer is scored alone as `### Task:\n{prompt}\n\n### Answer:\n{answer}`;
a preference pair wins only when chosen > rejected. Our contribution is a reproducible
way to expose when an apparently strong local result measures answer style instead of
correctness, together with the unsuccessful models and their limitations.

The official [Rules](https://hackathon.telegraphprotocol.com/rules) permit useful
evaluation work before activation. We claim tooling and measured failures, not a
canonical adapter, improved network rankings or a bounty award.

## Method and protocol

1. Freeze the US Treasury SDN and alias CSV snapshots; retain compressed bytes, hashes
   and source URL. The original retrieval time was not recorded; this is stated in
   `source-manifest.json`, rather than inventing freshness.
2. Build preference pairs from public primary data, never evaluation-pool material.
   The first five versions used progressively revised synthetic answer templates.
3. Train LoRA rank 8, alpha 32, a reward head, seed 42, max length 256 on the kit's
   ModernBERT base. Export a safetensors delta, copy the pinned tokenizer for export,
   check Stage 1, then score in the actual node runtime.
4. The foundation hash is `0a49b325304bb4cf292e683929689d0457966be264f60bfc94d0072b614bf8e6`;
   engine `77643d6e1176ab8744801cef93ccb844d0136ed32b8daa865d541f37d13292de`;
   tokenizer `67bc76f8b9386efba1a761c1c8e5ad439fd0eaf1c2826e9dd1a205c7af4dc456`.
   The live intent class is judgment; the kit's older hybrid classification is stale.
5. Remote validation of v3 registration #46 failed **7/15 = 46.7%**. The retained node
   response states the rejection. We did not inspect or reconstruct its public or
   hidden evaluation pairs. This run did not touch the wallet or sign a transaction.

The live class and public request schema are frozen in `intent.json`. Current
[adapter documentation](https://anjoman.ai/docs/scoring/build-a-scoring-module) explains
the foundation, format and runtime; the local kit revision is `1ed063e2f006` plus the
existing documented live-class build patch. Full-model WASM is retired.

## Five versions: what changed and why the local score misled us

All artifacts below are in
[`adapter/sanctions/evidence/2026-11-01-miners-r1/historical`](adapter/sanctions/evidence/2026-11-01-miners-r1/historical).
Historical score files retain every score, the kit results/hyperparameters, exact
compressed train/val/test bytes and the builder revision. The recovered `probe48.jsonl`
and `probe80.jsonl` are our synthetic probes, not pool rows. Different probe sizes
must not be treated as one common benchmark.

| Version | Change | Our synthetic out-of-template probe | Interpretation |
|---|---|---|---|
| v1 | Initial SDN templates | 29/48 = 60.4% | Strong own-template test, weak bare-verdict/listed-name behavior |
| v2 | Thin JSON, bare and one-word answers | 46/80 = 57.5% | Detailed answers beat short ones regardless of correctness |
| v3 | Mix answer shapes within pairs | 58/80 = 72.5% | Held-out 200-pair 93% was inflated by name shape; remote check failed 7/15 |
| v4 | Generate absent names with the same name-shape distribution | 48/80 = 60.0% | Removing the shortcut exposed weak factual discrimination |
| v5 | Train on every SDN entity, twice | 43/80 = 53.75% | Kit 93.74% measures recall, not unseen-entity generalization; over-predicts listed |

v1's separate 200-pair own-template node result was 96%; it did not predict the 60.4%
probe result. v3's 93% similarly did not predict remote validation. These results are
not evidence that the local synthetic probe predicts Telegraph's protected pool.

## Measurement on answers we did not write

We froze **32 names before making calls**: 16 exact SDN primary names, stratified over
people/entities, plus 16 real company/person names absent from the exact primary/alias
index. No miner response selected the names. No pool endpoint containing pairs was
queried. Pool metadata and the node's public rejection reason are not training data.

The live catalog listed 15 miners. We retained their YAMLs and detail API responses,
using `external_path`, method and declared parameter mapping to call the real service.
Engine ids differ from registration ids; `/api/miners/<engine-id>` sometimes failed or
returned an unrelated superseded registration. This is retained, not silently treated
as proof of a current registration. Eight static upstreams were probed once; seven
name-queryable services were queried for all 32 names. Total: **232 captured responses**.

Labeling is conservative and rule-based: an exact-name SDN decision is correct or
incorrect against the pinned index. Responses with transport errors, unknown status,
unrelated echoed names, conflicting machine verdicts, other-list scope or unverifiable
record ids abstain. An exact-name absence does not make every fuzzy alert wrong, nor
establish sanctions clearance. These labels assess the decision, not every narrative
claim, date, program, legal implication or coverage statement in a response.

Results: **32 pairs from only 8 distinct names**, all positive/listed cases. Every pair
uses the complete unchanged responses from two miners for the same name. There are no
observed negative-name disagreements that support a defensible pair. Of the four
substantive answer services, comparable decisions agree 100% (26–32 comparable names).
Against the terse OFAC service, agreement is 71.4–75.0% (28–32 comparable names).
`label-summary.json` has each numerator/denominator; `labels.json` explains every abstention.

| Adapter | Node-runtime score on the same frozen 32 pairs | Names with every comparison correct |
|---|---:|---:|
| v3 | 29/32 = 90.625% | 5/8 |
| v4 | 12/32 = 37.5% | 0/8 |
| v5 | 24/32 = 75.0% | 2/8 |
| v6 longer-answer pilot | 22/32 = 68.75% | 4/8 |
| Pick the longer answer | 32/32 = 100% | 8/8 |

All four adapters have zero ties. The token limit is 256; **31 of 64 rendered texts**
are truncated, with a pre-truncation maximum of 993 tokens. Forty unique token sequences
cover all comparisons; repeated inputs are scored once per package. Every batch checks
foundation/adapter/tokenizer identity and input root and retains the exact f32 bits.
The package hashes, worker commands and logs are retained.
This benchmark scores the whole raw JSON response. The exact field extraction used
for ranked judgment-miner responses remains unconfirmed (G37); these results do not
resolve whether that path supplies prose or the full JSON to an adapter.

**This is a diagnostic set, not a sufficient registration gate.** All wrong decisions
come from one short-answer service. Length alone solves it. Repeating four comparisons
for a name does not create four independent facts. Even v3's conservative name-level
95% Wilson lower bound is only 30.6% when every comparison must be correct. There are
no negative pairs or source-balanced failures. The result does not establish a margin
above 80%, an advantage over a baseline, or expected performance on the hidden pool.
Once it informed v6 design, this set also became development evidence rather than an
untouched final test. A future readiness claim needs a new independently authored set.

A second 32-name capture, `2026-11-01-miners-fresh`, was frozen and collected while
the v6 configuration was already fixed. None of its names, SDN ids or primary/alias
groups intersects any v6 split. Responses were not consulted for model selection or
training changes. It adds 232 responses and **24 pairs from 6 names**, again all listed,
again with a 100% longer-answer baseline. Results in the node runtime:

| Adapter | Fresh independent set | Names with every comparison correct |
|---|---:|---:|
| v3, the strongest initial-set baseline | 20/24 = 83.33% | 2/6 |
| v6 | 19/24 = 79.17% | 3/6 |

There are zero ties; 23/48 rendered texts are truncated at 256 tokens, with a maximum
of 1,013 before truncation. Pairwise agreement between the four substantive services is
100% on their comparable 21–32 names; agreement against the terse OFAC service is
73.9–80.6% on 23–31 comparable names. Exact denominators are in the fresh summary.
The fresh set remains too narrow and confounded to support readiness. V6 also misses
the requested 80% point threshold. V3's 83.33% does not establish a margin or beat the
length baseline. No new sanctions registration is justified by these results.

## v6 longer-answer pilot

`build_structured.py` creates public-source synthetic pairs with short/schema JSON,
longer evidence JSON and prose. Formats and extra evidence lengths vary on both sides.
Record ids and source links support inspection. Measured names, aliases sharing them
and their SDN ids are excluded from all splits. Duplicate primary/alias groups and
duplicate query tokens are excluded across splits. No captured answer body is loaded.

The frozen pilot has **5,958 train / 795 validation / 794 test pairs**, with 3,000/400/400
disjoint SDN entity partitions. Exact prompt overlap across splits is zero. Dataset
gate: PASS; unique rejected answers 99.6%, length shortcut 53.3%, held-out negative
overlap 0.4%, bag-of-words probe 60.5%. The model uses validation for checkpoint selection.
This is a small exploratory pilot, not a controlled demonstration that one data change
causes a quality improvement. Its synthetic test remains limited by template families.
Synthetic absent names are checked for exact absence, not exhaustively labeled for
every legitimate fuzzy-alert threshold; these labels are not universal screening judgments.

Training completed with **90.18% on 794 synthetic test pairs** in the kit. Batch 8 and
4 attempts alongside CPU measurement exhausted memory. A serial batch-1 smoke run
made progress; the completed serial retry used batch 4, accumulation 4, evaluation
batch 1 and two epochs. The effective training batch stayed 16. Logs and `result.json`
are retained. The kit exited 1 on its known final-message `NameError: pkg` after writing
the successful result; export and actual node-runtime measurements independently ran.

Tokenization parity: **15,094 rendered texts, zero differences** between the saved
training tokenizer and the pinned tokenizer at 256 tokens. Export and live-class
Stage 1 passed; the package loaded on the foundation and repeated the same bits twice.
All scoring/hosting uses the post-Stage-1 bytes, SHA-256
`71cbf5d1812fbc240dfc3fc604e1f97c527ae45061feccc29850e5f000ac464a`.
The experimental package is published for reproduction, not registration. The kit's
synthetic pass did not transfer to the real-answer gate. This pilot does not isolate
which remaining shortcut or coverage gap causes the failure.

## Provider-format robustness controls

We also made **20 synthetic wrong-query controls across five services**, including
LiveCert. Neither answer body was edited: an answer for a different name was paired
with the current question. Each pair is reversed under the other name's question,
within the same provider. A source/format-only or answer-only preference cannot exceed
50% on these reversed controls. This tests question relevance, not factual verification
or actual miner errors; it is explicitly excluded from registration eligibility.
Twenty-two of 40 rendered control texts are truncated, so this does not isolate semantic
question understanding from every input-length effect.

V6 scores **16/20 = 80%**, zero ties: listed-name controls 10/10, exact-name-absent
controls 6/10. LiveCert-format controls score **3/4**, so one deliberately wrong-query
answer in our own format still wins. Specifically, for the Bank of America question,
the Bank of India response scores 9.643579 versus 3.596127 for the correct response.
The paired raw bodies and f32 bits are retained. This does not mean LiveCert answered
the wrong question during the capture; the mismatch was introduced as a declared control.

This closes no blanket source-independence or robustness claim. A concrete training
coverage gap is visible in `build_structured.py`: its wrong-entity replacements always
use a listed replacement, so swapping two no-match responses was not explicitly taught.
That may contribute to the negative-control failures; it is not established as their
only cause. A further model change would require another untouched final measurement.

## Reproduce and inspect

From the repo root, use the [tutorial](adapter/sanctions/README.md). Key commands:

```powershell
$evalPython = 'C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$capture = 'track2/adapter/sanctions/evidence/2026-11-01-miners-r1'
& $evalPython -m unittest discover -s track2/adapter/sanctions -p test_label_miners.py -v
& $evalPython track2/adapter/sanctions/verify_evidence.py $capture
& $evalPython track2/adapter/sanctions/label_miners.py $capture
& $evalPython track2/adapter/sanctions/measure_miners.py $capture --home C:/Users/hyada/tg-eval
```

The evidence log pastes commands and their outputs. Historical arithmetic can be checked
offline from saved scores and source hashes; to rescore, decompress the relevant JSONL
and use the corresponding package. v3 is pinned at `telegraph-factscore` `1e4733c`;
v4/v5 experimental packages at `43110d0`, historical v1/v2 at `680bfe9` and v6 at
`182737e`, with commit-pinned download/hash checks in the hosting JSON records.
Package publication does not mean registration or activation. A fresh public clone
replayed the historical/current scores with identical evidence hashes even with
Windows `core.autocrlf=true`; this is our replay, not independent activation.

Runtime uses the local CPU and training the local GPU. Captures used direct public HTTP,
not paid Engine routing. No transaction, wallet connection, key access, payment or pool
upload occurred in this work. A future registration requires the owner's signature and
a fresh public executor check plus read-only `cast call` only after the quality gate.
Those steps were deliberately not prepared as ready-to-sign values for these models.

## Submission and growth evidence still needed

The evaluator rubric is 40 validity (minimum 28), 15 integrity, 10 reproducibility,
10 useful coverage, 5 documentation and 20 growth. `WINNING.md` now uses these weights.
There is no self-awarded score. We provide one diagnostic intent measurement, not 31
newly activated intents. A public tutorial and reusable tooling support adoption ease;
they do not prove independent activation.

`OUTREACH_S2.md` contains three proposed dated update milestones and owner-ready drafts.
None has been posted by this run. Three actual separate-date original updates, relevant
external sharing/follow-up, independent reproduction/contribution evidence, the 2–5 minute
demo, participant/contact confirmation and final website submission remain outstanding.
Deadline: December 1, 2026 23:59 UTC (December 2 05:29 IST).
