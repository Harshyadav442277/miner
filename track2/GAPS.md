# GAPS — Track 2 honesty ledger

The Season I gaps (G13–G27: rank_answer corpora, calibration thresholds, registration 1882) were cut on 2026-10-29.
The modules they describe are retired: they were deleted from the tree, and the V2 registry no longer lists 1882.
They are in `git log -p -- track2/GAPS.md`.

## G34 — the adapter format changed again: safetensors deltas on a shared Foundation Model (2026-10-31) — `OPEN, blocked on Telegraph`

`/docs/scoring/upgrade-shared-foundation` (updated 2026-10-31): an adapter is a LoRA delta plus a reward head in a
safetensors file; full-model `.wasm` is refused (`legacy_full_model`). Devnode already runs it (seeds 900001–900004
at 16:00 UTC). Our PEFT checkpoints are in `C:\Users\hyada\tg-eval\runs\LLM_OUTPUT_EVALUATION*\adapter\`, so the
docs' `export_adapter` path needs no retraining. **Blocked:** `foundation.json` and the reference executor are "to be
announced", and the runnable endpoint must match the node bit for bit. The family has an incumbent (900002), so a
new adapter must beat it by the replacement margin. Root GAPS G238.

## G33 — the Season II evaluator work predates protocol V2 (2026-10-29) — `PARTLY CLOSED 2026-10-31`

Comparators: checked, V2-valid, served at `livecert-comparator.vercel.app`, and not needed for scoring (root G237
killed). Adapter: superseded by G34. The original text follows.

V2 accepts only float model adapters in WASM, and registers them per family with `registerWasm(hash, url, prefix,
feeAddress, runnableUrl)` (anjoman.ai/docs `whats-new-v2`, updated 2026-10-27). The 31 comparators and the
LLM_OUTPUT_EVALUATION adapter below were built for the earlier formats. Whether either still loads, and which
family each would register on, has not been checked. G28–G32 describe the pre-V2 node and kit.

## G32 — the node runs a different ModernBERT from the one the kit trains (2026-10-22) — `FIXED for our adapter; organisers not yet told`

**Fixed 2026-10-22 ~17:30 UTC.** The retrain against `base-node` measures as follows:

| | value |
|---|---|
| node-architecture accuracy on the 800 test pairs | **96.6%** |
| flip | 93.5% |
| misquote | 98.8% |
| fabricate | 99.1% |

The new package is keccak `0x76f78441…88d02f77`. `verify_wide` in the node's own runtime gave Pearson 1.00000
against float, with every score within 0.04.

**Symptom.** `verify_wide` ran the packaged LLM_OUTPUT_EVALUATION adapter in the node's own runtime. It ordered both
probe pairs correctly, but its scores were far from the float model's:

| probe answer | wasm | float |
|---|---|---|
| pair 0, chosen | 16.49 | 20.72 |
| pair 0, rejected | 15.37 | 8.97 |

Pearson was 0.83. The interpreter took about 300 s per answer.

**Cause.** The converter in kit `992f2650` (`wide_runtime/convert.py` and `hf_helpers._norm_cfg`) reads `rope_theta`.
ModernBERT has no such key; it has `global_rope_theta` 160000 and `local_rope_theta` 10000. So the converter falls
back to 10000 for every layer. It also builds every layer as global attention, where ModernBERT slides a 128-token
window on 2 layers in 3. The package manifest's `Config` field shows theta × 1000 = `10000000`.

**Proof.** In float, with every layer global and theta 10000, the probe answers score 16.496 / 15.356 and
13.48 / −1.27. The wasm gave 16.493 / 15.368 and 13.60 / −1.24. That match is within about 0.1.

**Cost:** pairwise accuracy on the 800 test pairs.

| kind | trained architecture | node architecture |
|---|---|---|
| all | 96.9% | 81.0% |
| flip | 94.1% | 67.4% |
| misquote | 98.8% | 87.3% |
| fabricate | 99.1% | 95.3% |

The package `0xe54abbfe…` is withdrawn from the sign list.

**Fix.** Train against the architecture the node runs:

- `C:\Users\hyada\tg-eval\base-node` holds the same weights, with `global_attn_every_n_layers: 1` and both thetas
  set to 10000.
- Pass it as `--base-model` to training and as `--base` to conversion.
- Measure with [adapter/eval_deployed.py](adapter/eval_deployed.py), which scores 800 pairs in about a minute on
  the GPU.

**Who else it affects.** Every wide adapter built with this kit on ModernBERT. It is worth reporting to the
organisers. Fixing their converter would change the node's architecture back, so ask which architecture they intend
before relying on either.

## G31 — the LLM_OUTPUT_EVALUATION adapter is built; what it has not been tested on (2026-10-22) — `OPEN`

The package exists: 1,205,363,765 bytes, keccak `0xe54abbfe…b067ed89`. The numbers are in
[adapter/llm_output_eval/README.md](adapter/llm_output_eval/README.md). Not yet known:

1. **The hidden pool.** 96.9% is measured on our own template family. The pool's pairs are written by other
   contributors, and they may judge tone, safety or multi-source citations, which our data never teaches. The 70%
   first-canonical floor is the bar that counts, and it has not been measured.
2. **Material.** Nothing is evaluated until the intent's pool has 5 contributors. Pool status cannot be read until
   devnode switches.
3. **Hosting.** 1.2 GB is beyond GitHub raw. A release asset on the public `telegraph-factscore` repo (2 GiB cap) or
   the Hugging Face Hub would work. The node must download it within 30 minutes. This is a public upload and needs
   the operator's yes.
4. **Package fidelity.** `verify_wide` is checking whether the packaged module, run in the node's own runtime,
   orders the probe pairs like the float model. Its result is in the next entry.

## G30 — comparators: built and proved exact; routing and hosting open (2026-10-22) — `OPEN`

What is proved is in [comparator/README.md](comparator/README.md): 234,848 cases through the node's own runtime, 0
mismatches against the network's answer key. Open:

1. **Routing for 22 of the 31 intents.** Only 9 of the intents (FX_NOW, ROUTE_ETA, MACRO_ECONOMIC_INDICATOR,
   LIQUIDITY_DEPTH_VERIFY, MINING_HASHPRICE_VERIFY, GRID_POWER_PRICE, LIVE_SHELF_PRICE, ONCHAIN_METRIC_VERIFY,
   ASSET_RESERVE_ATTESTATION) are wired to the comparator path in the kit's compiled map. The other 22 are "A —
   Deterministic" only in the docs. A registration on an intent the node does not route as deterministic may be
   rejected. The cost is gas only, and that rejection would answer the question.
2. **Rollout.** At 2026-10-21 19:16 UTC devnode had not switched. Register nothing before
   `/api/evalpool/status` answers.
3. **Hosting.** Two candidates:
   - Push `comparator/` to the public `telegraph-factscore` repo and register commit-pinned raw URLs.
   - Push this branch. The working branch is unpushed and far ahead of `origin`, so pushing it publishes a lot of
     other work.

   Either way it is a public push and needs the operator's yes.
4. **What it is worth.** The docs say comparators cannot be better than one another, and a later passing one
   replaces ours. Expect judges to weigh the adapters, not these. That is an inference: the Evaluator judging
   criteria are unpublished.

## G29 — FACT_CHECK cannot be packaged with the published kit (2026-10-21) — `OPEN, needs the organisers`

The FACT_CHECK pairs are built and pass the kit's data gate ([adapter/fact_check/README.md](adapter/fact_check/README.md)).
The packager refuses the intent itself. The kit's compiled class map covers only the 31 judgment and hybrid intents
added on 2026-09-08 (facts and command output in [../docs/TELEGRAPH_FACTS.md](../docs/TELEGRAPH_FACTS.md)), and FACT_CHECK
is not one of them. The intents docs call FACT_CHECK "Judgment", so the node's database may still classify it that
way.

We will not patch the kit to force a class. Its guard exists because a package built for the wrong class is refused
by every node.

- **Question for the organisers:** in Season II, are FACT_CHECK and WEB_SEARCH judgment intents that take a wide
  adapter, and will the kit's class map include them?
- **Proposed while that is open (the operator decides):** move the same method to `LLM_OUTPUT_EVALUATION`, which is
  judgment, packageable and bought by 7 missions. That intent judges a model output's factual fidelity and citation
  support against a source.

## G28 — Season II evaluator path: open questions (2026-10-21) — `OPEN`

The facts are in [../docs/TELEGRAPH_FACTS.md](../docs/TELEGRAPH_FACTS.md), section "Season II evaluators: `rank_answer` is
retired". In short: `rank_answer` modules are retired, deterministic intents take a comparator, and judgment and
hybrid intents take a ModernBERT reward-model package of about 1.2 GB. What is not known:

1. **When devnode switches.** At 06:40 UTC it still ran the Season I gate. Until it switches, nothing in the new
   format can be tested live, and a `rank_answer` upload is wasted the day it does.
2. **Evaluator judging criteria** are unpublished. Comparators cannot be better than one another (docs), so they
   are unlikely to be what the judges weigh. That is an inference.
3. **Can this machine train an adapter? — CLOSED 2026-10-21, yes.** The probe ran the kit's own `build_model` and
   collator, with LoRA r=8, gradient checkpointing and bf16, on the RTX 3050 Laptop. The display holds about 1 GiB,
   leaving 2.91 GiB free. Every sequence was padded to the full 256 tokens, the worst case.

   | batch | peak allocated | peak reserved | seconds per pair |
   |---|---|---|---|
   | 1 | 0.38 GiB | 0.40 GiB | 0.744 |
   | 2 | 0.43 GiB | 0.47 GiB | 0.355 |
   | 4 | 0.53 GiB | 0.59 GiB | 0.175 |
   | 8 | 0.74 GiB | 0.82 GiB | 0.117 |

   At batch 8, 6,000 pairs take about 12 minutes an epoch, so 3 epochs take about 35 minutes. The kit defaults to
   batch 1, which would take about 75 minutes an epoch, so use `--batch-size 8 --grad-accum 2` (effective batch 16,
   the kit's default). Convert and package (each about 1.2 GB) are not yet measured.
4. **Hosting a 1.2 GB package.** GitHub raw and repository files are too small. A release asset (2 GiB cap) or
   the Hugging Face Hub would fit, and the node must download it within 30 minutes. Not tried.
5. **No adapter can be evaluated until 5 contributors have material in the intent's pool.** Pool status per
   intent cannot be read yet (the endpoint returns 404).
6. **Integrity rule, decided now.** We train adapters on pairs that we never upload to the evaluation pool, and
   we disclose that. Pool rows may land in the hidden testing half, and training on them would grade our module
   on what it has already seen.
