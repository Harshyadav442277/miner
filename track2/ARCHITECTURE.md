# ARCHITECTURE.md — Track 2 design decisions (Season II evaluators)

Code must conform to this. **Update this file before deviating from it**, not after.

**Rewritten 2026-10-23.** Season I's decisions pinned the `rank_answer` module kind: its ABI, gate, portfolio
and harness. The node no longer accepts that kind (docs, 2026-10-21), so those decisions and the code built
on them were deleted; they remain in git history. Protocol facts with their sources are in
`../docs/TELEGRAPH_FACTS.md`, "Season II evaluators". Scoring is in `../RULES_SEASON2.md`: validity 40,
with a minimum of 28; integrity 15; reproducibility 10; coverage 10; docs 5; growth 20
(live Rules page, rechecked 2026-11-01).

## A1 — Two module kinds, chosen by the intent's class

- **Deterministic intents get a comparator.**
  - It exports `imw_score_deterministic(truth: i64, miner: i64, spec_ptr: i32) -> i64` (basis points,
    0–10000), plus `imw_alloc` and `imw_free`.
  - It must reproduce the network's reference rule exactly; the docs say there is no "better" comparator.
  - So the work is correctness, proved: a line-for-line port, checked in the node's own runtime against the
    reference on every edge case and on a large seeded random set.
- **Judgment and hybrid intents get an adapter delta (rewritten 2026-11-01).**
  - It is a ModernBERT-base LoRA reward model (rank ≤ 16 on Wqkv/Wo/Wi plus a one-number head), exported
    with the kit `telegraph-wasm-baseline` `main` as a safetensors delta of ~6.8 MB for the shared Foundation
    Model `modernbert-base-lora16-v1`. Full-model `.wasm` is refused (`legacy_full_model`).
  - The class in the package must be the **live** class from `/engine/v1/intents/<INTENT>_GENERAL`, not the
    kit's compiled list: EVENT_OUTCOME_RESOLUTION and SANCTIONS_SCREENING_MATCH are listed hybrid in the kit
    and judgment on the node (another author's registration 30 was rejected for this, 2026-11-01).
  - The node first scores 15 public pairs at our runnable URL (≥ 70% to pass), re-scores them itself bit for
    bit, then runs the hidden round. The first canonical needs ≥ 70%; a challenger must beat the incumbent by
    2 points. Nothing is evaluated before an intent's pool holds material from 5 contributors.
  - Training data comes only from public primary sources we may use (Wikidata CC0, US-government data), with
    the source URL on every row; never from pool rows, ranking-half questions or another author's weights.
  - Validation and test splits are by event series (or the intent's equivalent), so the reported accuracy is
    on items the model never saw. Results are reported per failure type, not only overall.

## A2 — A number counts only if the node reproduces it

Every claim is measured as the node computes it: the node's runtime, the node's model architecture, and the
bytes hosted at the registered URL (keccak re-hashed from the URL). An adapter that scored 96.9% in the kit
and 81.0% on the node was withdrawn for this reason (GAPS G32).

## A3 — Measure what an answer asserts (the thesis, carried over from Season I)

Correctness lives in what an answer asserts: verdicts, figures with units, identifiers and dates. Training
pairs and evaluation material therefore follow these rules:

1. A refusal, an echo of the question or an empty answer loses to a real answer.
2. A fabricated, flipped or misquoted fact loses to the correct one, however fluent it is.
3. Keyword stuffing, length and the right vocabulary around a wrong value never win.
4. Wording is a tie-breaker at most.

## A4 — The legitimacy boundary

General intent correctness only. A module must not fingerprint any miner in either direction: no slug,
wallet, field name, schema or phrasing. Our own miner's answer style must be scored down when it is
factually wrong. Train only on pairs we never upload to the evaluation pool. Disclose that we also run a
miner.

## A5 — The proof is part of the product

Reviewers score validity, integrity and reproducibility, so each module ships with:
- a one-command check in the node runtime;
- the hosted-hash check;
- the training or derivation recipe;
- robustness results on adversarial pairs.

## A6 — Conventions

Boring, explicit code; files under ~300 lines; one task = one change = one commit; no secrets anywhere.
Large training runs and model files live outside OneDrive, in `C:\Users\hyada\tg-eval\`.

## A7 — Benchmark validity and query binding (2026-11-02 IST)

- Keep two measurements separate: factual decisions on genuine same-query miner disagreements, and
  declared counterfactual wrong-query tests using unchanged public miner answer bodies. Neither a
  synthetic control nor a one-sided/source-confounded disagreement set can establish registration readiness.
- Query-binding tests use reversed pairs within provider and membership class. Questions must have equal
  pinned-tokenizer prefix lengths; verify the visible answer token sequences are identical across reversal.
  Reject invisible/identical or ambiguous name echoes. Balance listed/exact-name-absent cases and provider
  roles. Report tie-aware character/token-length baselines, block counts and query-echo reference accuracy.
- Freeze new public query cohorts before calls. Reserve their entities, aliases and query strings from all
  training/validation. Older Bank of America/India controls are regression/development evidence only.
- V7 uses our v6 checkpoint and new source-faithful synthetic data. Both listed and absent wrong-query
  replacements must retain their original verdict; no-match/no-match swaps are explicitly taught. Chosen
  answers may claim only verified exact membership/absence; no invented nearest candidates or random scores.
- Fix configuration before final external evaluation; select checkpoints on synthetic validation only.
  Keep no provider ids, brands, wallets or distinctive provider templates in training or scoring logic.
  Run unchanged v6 and v7 on the same held-out external-answer benchmark in the actual node runtime.
- A query-binding improvement is a narrow robustness result. Factual validity, hidden-pool performance,
  canonical status and registration readiness require their own evidence. No wallet action is part of this work.
- If an overlapping-name regression persists, add generic hard shared-word training fixtures, excluding
  the named bank regression itself. Candidate metadata must be computed from the public snapshot, never
  invented or copied from miner answers. A separate absent-name bank stratum may isolate this failure;
  report it separately from the balanced corpus. Previously evaluated v7 sets then become regression sets.

## A8 — Factual discrimination continuation (2026-11-02 IST)

- V9 addresses cross-format factual comparisons with source-derived synthetic fixtures. Correct and
  incorrect same-query answers choose their format independently; balance exact members/absences and
  short/long preferences. Preserve query-binding training and measure the v8 regressions unchanged.
- This is a hypothesis about a training coverage gap, not a proven cause of factual errors. Keep
  captured answer bodies, provider identifiers and provider-specific templates out of training.
- Audit machine-verdict visibility using exact JSON value spans and pinned tokenizer offsets. Report
  the observable subset separately; do not silently edit, shorten or drop the original 62 pairs.
- Reserve all prior measured queries/entities and a newly frozen external cohort from new data.
  Select the checkpoint on synthetic validation only. The old 62-pair slice is development evidence.
- Beating the actual visible-input length baseline is necessary, not sufficient for submission.
  Retain class/source/truncation limitations; a constant-positive shortcut cannot establish factual
  correctness. Do not register, upload pool material or touch wallets as part of this work.
- V9 regressed on development facts and is rejected before scoring the fresh cohort. V10 may start
  again from v8 and add source-verified alias queries plus generic boolean/numeric/enum verdict
  coverage. No external provider templates are copied. Preserve the rejected v9 data/results and
  evaluate the next fixed model on the still-unscored reserved cohort.
- V10 also failed development facts. V11 may use the older v3 checkpoint with a smaller update
  (one epoch, learning rate 0.00001). Exact reconstruction proves v3 inherited public SDN-entity
  exposure overlaps 50/62 old and 65/69 reserved comparisons. Exclude those entities from all NEW
  pairs, but disclose inherited knowledge: these results test unseen responses/representations,
  not unseen entities. Do not relabel the cohort or claim an entity-held-out result for v11.
- V11 also missed the development baseline. V12 freezes every encoder/base/LoRA parameter of v3
  and fits only the existing 769-parameter reward head on the same source-audited data. Preserve
  the original pairwise objective and node runtime. Verify all 176 saved LoRA tensors are exactly
  unchanged, and retain the inherited-source-knowledge disclosure. No score wrapper is introduced.
- V12 also failed (4/62). Float32 training-model rankings exactly match actual-node rankings;
  export fidelity is not the observed cause. Exact positive training-query coverage in v3 is
  only 2/14 old and 3/15 reserved names, despite broader source-entity overlap.
- V13 may ingest the complete ASCII organization primary/alias vocabulary of the public SDN
  snapshot as factual knowledge, with public GLEIF legal names checked absent from that snapshot.
  This explicitly supersedes the entity/query holdout for POSITIVE REFERENCE FACTS in A7/A8.
  Captured answer bodies remain measurement-only; exclude measured absent queries from negatives.
  Disclose this as known-snapshot factual discrimination on unseen external answer bodies, never
  unseen-entity generalization. Do not call source-exposed validation a held-out factual test.
- Pair listed and real absent names in equal tokenizer-length strata, independently balance
  verdicts/formats, and retain binding examples. Freeze the recipe before training: v3 parent,
  one epoch, learning rate 0.00005, stock objective, rank8/alpha32, max256. Select only on synthetic
  validation loss. Preserve all v9-v12 failures. Passing length still cannot establish submission
  readiness without genuine errors in both classes and stronger independent name coverage.

## A9 — Context visibility experiment (2026-11-02 IST)

- The pinned official kit allows 512 tokens; 256 is our training/package choice,
  not the protocol maximum. Preserve every historical 256-token result and v13's
  frozen recipe. Do not silently change tokenizer limits or overwrite baselines.
- A source-independent visibility audit of the unchanged old62 pairs exposes both
  complete machine verdicts in43 pairs at256, all62 at512. The visible-length
  baseline changes from42/62 to46/62. These are input diagnostics, not model scores.
- Freeze v14 before any reserved model scores: re-export the exact v3 weights with
  max_tokens512, no optimization, no answer/pair editing. Verify all178 package
  tensors exactly equal v3 after Stage1; measure in the actual node at512, against
  its own baseline. This isolates the context effect for these deterministic scores.
- V3 was trained at256. V14 is explicitly a context-transfer diagnostic, not a claim
  of matching training/inference context or registration readiness. Any deployment
  candidate still needs suitable training, binding checks and genuine two-class
  factual evidence. No provider exceptions or inference wrappers are introduced.
- Keep score/audit joins bound to pair hashes and matching runtime token limits.
  Nondefault visibility reports require separate output paths. No pool rows are read.

## A10 — Repeated factual representations at the full context (2026-11-02 IST)

- V13 scores27/62, v14 fixed-weight512 scores33/62; both rejected. V13's float32
  synthetic diagnostic has listed233/400, absent392/400. Do not use its aggregate
  score to imply strong listed recall. No model has scored the reserved69 bodies.
- Freeze v15: v3 parent, stock loss/optimizer,1epoch,lr0.00001,rank8alpha32,
  max512,batch2/accum8. Keep original256 and fixed-weight512 baselines distinct.
- New training uses600 source queries from v10 (300 listed/300 absent), each in
  four formats, plus its600 binding pairs. Val/test each use100 source queries in
  four formats plus100 binding pairs. Keep v10 entity/query exclusions and splits.
- Render generic source metadata only from the frozen CSVs, including real counts,
  hashes and lookup limitations. Vary metadata order independently of truth and
  put machine decisions before/after it. Every factual text must fit512 fully.
  No provider templates, captured answers or invented source facts enter training.
- Checkpoint selection stays validation loss. Capture per-class evaluation outputs
  without changing loss/forward operations. Both synthetic factual classes must
  reach65% before export. Old real answers must exceed their512 length baseline
  (46/62), and binding regressions must retain their previous perfect scores,
  before reserved scoring. Preserve failures; no registration readiness inference.

## A11 — Bounded listed-recall repair (2026-11-03 IST)

- V15 fails its listed class gate. Before any further full training, use same-query
  factorial diagnostics to distinguish source recall, verdict format and truncation.
  These are HF diagnostics, not actual-node factual scores or calibration rules.
- The v13 paired ablation isolates an unrelated negated identity qualification:
  listed15/16 without it,9/16 with it; absent16/16 in both. Retain the separate
  primary/alias knowledge weakness. Never compensate with inference score shifts.
- Permit one bounded v16 repair from v13:64 source-training query groups,32 AdamW
  steps,lr0.0001,only encoder LoRA layers20/21 trainable. Freeze base, classifier
  and all other LoRA tensors; verify identity after saving. Max256,fp32,dropout off.
- Use four generic equivalent answer forms per truth, full Cartesian pairwise loss,
  within-truth consistency and thin-answer teacher retention. No captured answer
  bodies, provider fingerprints, pool rows or diagnostic query entities in repair.
  Freeze all inputs and recipe before optimization; no hyperparameter sweep.
- Evaluate separate64 source-training query groups and the existing128-query
  diagnostic. Require65% per class in every form and no more than5 percentage
  points loss in thin-format class recall before any node/export check. Even a
  pass only justifies a local repair claim; old factual/binding and genuine balanced
  evidence gates still apply. Do not score the reserved69 or submit this trial.

## A12 — Hard source-anchor coverage intervention (2026-11-03 IST)

- V16 improves listed qualified prose34/64 to41/64 but fails65%; preserve it.
  Its parent already gets25/32 listed repair anchors right in qualified prose.
  Test the data-coverage hypothesis with v17, not more steps or a parameter sweep.
- Keep v13 parent and v16's32-step optimizer/loss/frozen-layer recipe exactly.
  New64 source anchors:16 primary/16 alias with parent thin correct but generic
  qualified prose wrong;32 verified absences with both correct, weakest joint
  margin first. Use no measured queries, captured answers or diagnostic phrases.
- Freeze a fresh128-query synthetic holdout from v13 test before anchor selection;
  exclude its entities/names, prior repair groups, diagnostic and external queries.
  Parent knowledge exposure remains explicit. No conditioning holdout on scores.
- Require every holdout form/class>=65% and thin class loss<=5pp. Report original
  diagnostic separately as development, not checkpoint selection. One fixed final
  step; no new full training, registration or reserved/new external-body scoring.
  After a synthetic pass, standard export and frozen historical development/binding
  rechecks are permitted to verify the repair in the actual runtime.

## A13 — Repaired weights, context-only falsification (2026-11-03 IST)

- V17 passes fresh synthetic class gates but actual old62 scores22/62 at256,
  below parent13's27/62 and42/62 length. Reject it as a factual candidate.
- V18 is not training: export exactly v17's178 tensors at512 using A9's unchanged
  context-transfer procedure, and verify tensor identity. V17 trained256; label
  v18 accordingly. Score only unchanged historical old62 against46/62 length.
  No reserved capture, new model fitting, provider exceptions or submission.

## A14 — Distill known decisions into complete source-only answers (2026-11-03 IST)

- V18 context-only512 fails14/62. Old14 generic-question control shows v13/v17
  recognize12/14 names in thin JSON; v17 wins22/53 real pairs for those recognized
  names,18/37 when both claims are visible256. Missing facts/truncation alone do
  not explain the remaining format failure. HF/node export fidelity passes.
- V19 is one further bounded32-step test, not full-corpus training. Parent13,
  final-two-layer16 LoRA tensors only,head/base/others frozen,fp32,lr0.0001,
  AdamW no decay,gradient clip1,four questions/step,max512,dropout disabled.
- Distill each verified thin-correct training question's two frozen parent logits
  into five equivalent generic forms, including truthful neutral source metadata
  before/after JSON and prose verdicts. Objective: mean squared score error across
  every form plus0.2 full-Cartesian pairwise softplus(1-correct+wrong). This is a
  training objective, never an inference calibration, adapter wrapper or lookup.
- Freeze96 new unconditioned source-test queries (24 primary,24 alias,48 absent)
  before parent scores. Exclude all prior diagnostic/external/repair query groups
  and entity IDs from new training/holdout. Parent public-source knowledge exposed.
  Train64 source-training questions (16 primary,16 alias,32 absent), thin-correct
  anchors only. Neutral metadata comes unchanged from audited v15 source counts.
- Every rendered answer must fit512 completely. Require>=65% in each membership,
  primary and alias stratum for every fresh synthetic format, thin class loss<=5pp,
  before export. No checkpoint/parameter sweep, reserved scoring or full training.
  Actual historical512 factual/binding gates still determine whether it is usable.

## A15 — Bounded encoder-capacity counterfactual (2026-11-03 IST)

- V19 fails: JSON-late listed27/48 to46/48 but absent45/48 to9/48; thin absent
  loses3/48, exceeding5pp. No export. Higher listed recall alone is rejected.
- V20 changes only trainable encoder capacity: all176 LoRA tensors instead of
  final16. Keep v19's64 anchors, teacher targets, neutral text, objective, lr,
  training seed/order and32-step budget. Head/base stay frozen. It is not a
  full-corpus run. Checkpoint activations; disable training-only dropout and verify
  unchanged eval/train forward scores before optimization. Ordinary inference.
- Freeze96 new repair-validation queries from v13 val (24 primary,24 alias,48 absent),
  excluding all prior groups/external IDs, before scores. Parent13 previously used
  this source split for checkpoint validation; disclose it as repair validation,
  not a pristine parent-held-out test. Original v19 test is paired development
  evidence only. Gate fresh repair validation with the same per-format/class,
  primary/alias, thin-retention and cross-format guards. No parameter sweep,
  reserved-body scores, full-corpus training or submission.

## A16 — Direct factual-margin repair (2026-11-03 IST)

- V20 fails late-JSON absent25/48. It also misses10/32 absent training cases in
  that form, while thin training is64/64. Diagnose underfit, not just transfer.
- Freeze v21: same64 anchors, parent13,176 encoder LoRA tensors,head/base frozen,
  same32 steps/lr/seed/order/max512/checkpointing. Change only training objective:
  mean squared error of each form's correct-minus-wrong margin against the frozen
  parent's thin margin, plus0.1 within-truth score variance and0.2 Cartesian
  softplus(1-correct+wrong). No raw-score MSE or inference correction.
- Fresh96 repair-validation queries use seed2320261103 and exclude v20 validation
  as well as prior groups. Parent-validation exposure remains explicit. Retain
  all original class/alias/primary/retention/Cartesian gates and fixed final step.
  No full-corpus run, reserved scores, wallet, registration or submission.

## A17 — Bounded direct ranking with the standard trainable reward head

- V21 fails absence: early JSON28/48,late JSON25/48,late prose31/48. Reject it.
- V22 uses the same64 verified source anchors, source-only five representations,
  parent13,32 steps/lr/seed/max512 and recovery. Train all176 encoder LoRA tensors
  plus the existing769-parameter head jointly. Objective is ordinary pairwise
  softplus(wrong-correct), averaged across within-query Cartesian format pairs.
  Remove teacher raw/margin MSE and consistency penalties. This tests a combined
  ordinary-ranking recipe, not a causal attribution to either head or objective.
- Freeze96 new repair-validation questions with seed2420261103 excluding v20/v21
  and all prior groups. Retain parent-validation exposure disclosure and all class,
  primary/alias, retention and Cartesian gates. No larger corpus, reserved scores,
  inference changes, wallet or submission.

## A18 — Fixed original-head restoration diagnostic

- V22 preserves absent decisions but thin listed falls41/48 to34/48 and multiple
  listed/alias forms fail. Reject it. Test head drift without more optimization:
  v23 uses exactly v22's176 encoder tensors and parent13's two classifier tensors.
- Verify all tensor identities and evaluate on unchanged v22 repair validation,
  explicitly paired development evidence, not a new independent test. Retain all
  class/alias/primary/retention/Cartesian gates. No model fitting, source lookup,
  score wrapper, reserved scoring, full-corpus run or submission.

## A19 — Fixed MLP/head restoration diagnostic

- V23 restoring only the head fails listed/alias guards. V24 tests one narrower
  encoder contribution: v22's88 attention LoRA tensors, parent13's88 MLP LoRA
  tensors and two head tensors. Verify every identity before measurement.
- Same unchanged v22 paired-development cohort and gates, no optimization or
  independent-test claim. This tests whether MLP changes contribute to source-fact
  forgetting; it does not presume where knowledge resides. No reserved/full run.

## A20 — Correct source factual errors instead of filtering them out

- V22-v24 fail listed/alias guards. Source alias controls show parent13 can recover
  11/11 aliases with canonical-name/echo reference, versus9/11 thin. Every previous
  repair anchor was parent-thin-correct, excluding direct factual-error correction.
- Freeze v25 data:64 source-verified parent errors (16 primary,16 alias,32 absent)
  plus unchanged64 correct replay. Teacher error labels come from source, never
  model belief. Independent raw-CSV/split audit passes128 queries, no ties.
- Same parent13, ordinary joint pairwise objective,178 trainable adapter/head
  tensors,lr/seed/max512/recovery and32 steps. Present128 queries once, one hard
  listed/hard absent/replay listed/replay absent per update. No teacher loss.
- Reuse v22's disjoint cohort as paired DEVELOPMENT evidence, explicitly not a new
  independent validation. All class/alias/primary/retention/Cartesian guards apply.
  Canonical record fields remain provenance, not automatically rendered truth cues.
  No full-corpus run, reserved scores, inference changes, wallet or submission.

## A21 — Training-only factual and primary-verdict supervision

- V25 hard replay fails late-JSON absent24/48 and qualified-prose listed24/48.
  Correct source coverage alone has not resolved entangled membership/verdict roles.
- V26 retains128 facts, balanced32-step schedule, parent13, ordinary178 exported
  tensors,lr/seed/max512 and recovery. Add independent training-only linear heads:
  query-name pooled features predict source membership; token features distinguish
  primary MATCH/NO MATCH tokens from background, including identity negation.
- Main loss is binary correctness BCE plus Cartesian pairwise logistic ranking,
  with0.5 membership BCE and0.5 balanced primary/background token-role CE. Claims
  are labeled from generated assertions, membership from raw source; both claim
  polarities occur for every query. No model-belief labels or inference lookup.
- Auxiliary heads are external to the deployed model and discarded for export.
  Verify standard178 tensors and unchanged forward graph. All exact annotation
  spans/token IDs must audit before optimization. Same paired-development cohort,
  no independent-test claim. All factual/alias/retention/Cartesian guards remain;
  no larger corpus, reserved scores, registration or submission.
- New auxiliary heads use lr0.001; existing model lr0.0001. Add32 counterfactual
  same-membership binding rows derived from the same facts,16 absent/16 listed,
  prefix-matched and reversed. One binding row per update has loss weight0.25;
  correctness includes aboutness, while membership/claimed-polarity labels stay
  unchanged. No-match/no-match swaps are explicitly negative controls.

## A22 — Frozen membership-feature diagnosis (2026-11-04 IST)

- V26 main reward model fails factual/retention gates. Its training-only role
  head recognizes1,533/1,536 primary tokens, but membership predictions vary by
  answer format for82/96 queries. The same head on question-only inputs gets
  listed47/48,absent6/48, suggesting context shift plus a listed prior.
- Freeze readout diagnosis, not another encoder training trial: compare parent13
  and26 final query-name hidden features. Train fixed ridge readouts(lambda1,
  training-only centering/scaling) on128 source hard/replay facts, either question
  only or all10 answer views. Evaluate unchanged96 paired-development queries in
  all11 contexts. Also fit one-feature name-token-length control. No parameter
  sweep, development fitting, checkpoint selection, encoder updates or export.
- Store feature caches outside source repo, record hashes/identities and assert
  original checkpoint hashes unchanged. This tests linear accessibility only;
  failure does not prove facts are absent. All previous factual gates remain.

## A23 — Bounded question-only supervision and query-feature invariance

- Frozen readouts do not establish reliable alias retrieval: question-only
  listed/absent parent13=30/48,38/48; v26=28/48,38/48. Aliases12/24 and11/24.
  Contextual membership training has not yielded an invariant source-fact feature.
- Freeze v27 before optimization: restart parent13; keep v26's128 source facts,
 32 binding controls,10 views/query,32 balanced steps,optimizer/lrs/seed,max512,
  trainable178 main tensors and two training-only heads. No additional corpus.
- Add a training-only empty-answer forward per query. Membership BCE at the query
  name span uses only source truth. Add0.5 of that BCE to the unchanged v26 loss.
  Also add0.5 MSE between layer-normalized full-answer query-name features and a
  detached question-only reference. Normalize each768-vector, not across queries.
  Main scores and primary-role supervision remain ordinary full-answer forwards.
- No empty-answer branch, parser or auxiliary head is deployed. Both new branches
  are training losses only. Save optimizer/RNG/auxiliary-loss recovery. Audit prefix
  tokens, original annotation/source input hashes and entity disjointness before
  optimization. Same paired-development96 and all prior gates, fixed final step.
  No full-corpus training, reserved/removal scores, wallet, registry or submission.

## A24 — Fixed source-fit duration control after failed auxiliary repair

- V27 fails late-JSON absent0/48, including0/64 on source TRAINING. Its qualified
  positive primary-role tokens101/192 still fail to transfer from training forms.
  V26 is48/192 on this exact form despite near-perfect training-form role counts.
  Neither auxiliary result establishes general role parsing or main-score validity.
- V25 ordinary-ranking source fit is also weak: thin listed34/64,aliases16/32;
  late-JSON absent28/64. Many32-step repairs were not fitted even to their128 facts.
  Test duration before inventing more losses: v28 keeps v25's exact128 source facts,
  parent13,ordinary Cartesian objective,178 trainable tensors,lr/seed/max512,
  optimizer/checkpointing/dropout and same96 paired-development cohort.
- Freeze128 total updates, four balanced source passes. Rerun first32 and require
  all178 tensors and the loss trajectory to reproduce v25 exactly before further
  updates. Reuse the hash-bound independent224-query source audit with exact query
  identity/current source-file hash checks. No new corpus or auxiliary objective.
- No development scoring/checkpoint selection during optimization; evaluate only
  the fixed final step. Record final source-training fit and require95% per trained
  format/class/primary/alias, plus all original development/retention/Cartesian
  gates. Passing these still needs actual-node/binding and balanced external proof.
  This is a128-fact fit control, not full-corpus training or a submission action.

## A25 — Enforce frozen balanced-cohort permission at measurement entry

- The capture finisher checked score_allowed, but direct measure_miners.py ignored
  balanced-block-audit.json. A nonempty1-3-block cohort could therefore be scored
  through that entry point despite its frozen prohibition. The actual removal
  cohort has0 blocks/0 pairs and has never been model-scored.
- Read the frozen audit before foundation/model loading. Require score_allowed
  literally true, at least4 blocks(or a stricter declared minimum), and the same
  frozen token limit. Legacy diagnostic cohorts without this audit retain their
  existing narrow measurement path. This does not establish balanced validity.
- Five CLI regression cases cover frozen refusal, insufficient blocks despite a
  true flag, changed context, legacy behavior and permitted four-block preflight.
  All36 tests pass; existing zero-block cohort refuses before any worker starts.

## A26 — Fixed MLP/head restoration after source-fit overfitting

- V28 largely fits training(thin listed63/64,aliases32/32) but fails development:
  thin listed34/48,aliases15/24; qualified listed23/48,aliases10/24, and both thin
  membership classes lose>5pp. Extra duration alone is not a transferable repair.
- Freeze v29 without optimization: retain exactly v28's88 attention LoRA tensors;
  restore parent13's88 MLP LoRA tensors and two head tensors. Verify every saved
  value plus source/parent checkpoint hashes. Ordinary178-tensor forward only.
- Same96 paired-development questions and original per-class/alias/retention/
  Cartesian gates; no independent-test claim. This checks whether the fixed
  restoration recovers broad source facts while retaining changed attention.
  It cannot localize knowledge or prove a training recipe. No full-corpus run,
  reserved/removal scores, wallet or submission. Actual-node proof still required.

## A27 — Training-only primary-claim quality with frozen MLP/head

- V29 restoration still fails thin retention and qualified aliases12/24. Source
  fitting alone and post-training restoration have not repaired interpretation.
- Freeze v30: parent13,64 original thin-correct replay facts,32 balanced updates,
  lr0.0001,fp32,max512,no decay,clip1,seed2120261103,dropout off/recovery. Train only
  88 attention LoRA tensors(811,008 parameters); preserve MLP88/head2 exactly.
- Standard full-answer Cartesian ranking remains. Add0.5 Cartesian ranking using
  the existing frozen head at the mean primary-decision token features. Labels
  are correctness(source membership plus query binding), not asserted polarity.
  This targets local fact/claim interaction and avoids creating a polarity parser.
- The extra pooling/head application is training-only; ordinary178-tensor inference
  stays unchanged. No new head, feature lookup, runtime parser or score wrapper.
  One binding control per step,weight0.25, from the same64 facts(16 absent/16 listed).
  Primary spans are inherited exact-token annotations and independently decoded;
  source audit is a hash-bound subset of previously verified224 source questions.
- Same96 paired-development questions and original65% class/alias/primary,5pp thin
  retention/Cartesian guards. Fixed final step, verify at least90 untouched tensors.
  No full-corpus run, reserved/removal score, wallet or submission. Actual-node and
  balanced external evidence remain required after any synthetic pass.
