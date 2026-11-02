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
