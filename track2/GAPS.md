# GAPS — Track 2 honesty ledger

The Season I gaps (G13–G27: rank_answer corpora, calibration thresholds, registration 1882) were cut on 2026-10-29.
The modules they describe are retired: they were deleted from the tree, and the V2 registry no longer lists 1882.
They are in `git log -p -- track2/GAPS.md`.

## G40 — the first SANCTIONS_SCREENING_MATCH adapter only judged our own answer shapes (2026-11-01) — `OPEN, v3 training`

**v2 (17:30 IST, keccak `0x7cf777b7…562a`, not hosted):** kit test 91.2%, but the probe (now 80 pairs, with
mixed shapes) gave **57.5%**. With one detailed and one short answer it always preferred the detailed one:
right-detailed 100%, right-short 0%. Every v2 pair kept both answers in one shape, and the adapter scores each
answer alone, so it never learned a scale shared across shapes. Bare and one-word verdicts on listed names
stayed at chance (50%, 12.5%): it does not know which names are listed. v3 draws the worse answer's
shape independently in half the pairs (`CROSS_SHARE`; gate PASS, length 52.1%, surface 57.3%).
One `adapterexec` worker died silently mid-run (`exec_8083_died.log`, no error line): the fan-out then answers 502.
Before registering, watch the worker count during the remote check.

v1 (`pairs/sanctions_v1`, keccak `0x23bbe60e…7145`, not hosted or registered) scored 95.1% on the kit test gate and
96.0% on 200 held-out pairs in `adapterexec` (flipped 89.6%, the other kinds 100%). On 48 pairs written in
shapes the builder never produced (`adapter/sanctions/ood_probe.py`: schema JSON with string `matches`,
`{"matched": bool}`, one-word verdicts; 8 SDN-listed and 8 unlisted names) it scored **60.4%**. It preferred
"no match" whenever an answer carried no nearest entry: listed names scored 0% on bare and one-word answers. That
is the 60% that got `0x3035…` rejected on the 15 public pairs. v2 adds those shapes (prose 30%, full JSON 25%,
thin JSON 20%, bare 10%, word 15%; dataset gate PASS, surface 57.9%). On a bare verdict about a name it
never saw, the adapter can only guess: measure held-out and probe results by format before hosting.
The public pairs themselves are not readable from any devnode endpoint tried (`/api/evalpool/status` shows
416 eligible rows from 7 submitters, snapshot `1d53d852…`).

## G39 — no public tunnel for the executor yet (2026-11-01) — `WORKAROUND 14:50 IST`

**Update:** owner chose cloudflared (winget, 2026.10.7, installer hash verified). A quick tunnel has a 100 s
response cap: one `adapterexec` took 126 s on a worst-case 30-text batch (HTTP 524). `track2/adapter/fanout_exec.py`
splits the batch over 3 workers: 74 s, 200. Remaining risks: the quick-tunnel URL is ephemeral (a restart gives a new
one, which would not match a signed registration); 3 workers leave ~1.2 GB RAM free; a larger pool text than 256
tokens is truncated by the node too, so 74 s is the ceiling on this CPU. The original text follows.

The account's one ngrok domain (`grippelike-foliiferous-richie.ngrok-free.dev`) is already online from another
machine, serving "The Archive of Constantinople"; ngrok refuses a second agent (ERR_NGROK_334). Not touched.
Options: install Cloudflare's `cloudflared` for a quick tunnel; stop the other ngrok agent for the registration
window; or a VM. The validator needs a public https URL, no redirect, for about 1.5 h.

## G38 — the EVENT_OUTCOME_RESOLUTION adapter cannot verify facts about events it never saw (2026-11-01) — `OPEN, the main risk`

Node runtime, 200 test pairs from event series held out of training (`runs-v2\EVENT_OUTCOME_RESOLUTION\
node_scores_test200.json`): 75.5% overall, 0 ties, length baseline 0.42. By failure type: contradiction 12/12,
prediction 17/17, unresolved 13/13, wrong_event 61/61, **flipped 51.9% (52), wrong_winner 46.7% (45)**. The kit's
own test gate: 74.7% on 2,566 pairs. So the model checks form, internal consistency and relevance, not who
actually won; a 150M encoder cannot know unseen outcomes. Whether it clears 70% on the hidden pool depends on how
many of the pool's worse answers are factual flips, which we cannot see. Not yet measured: the famous-event
subset (high sitelinks), where pretraining may know the answer. Say this limitation wherever the adapter is
claimed.

## G37 — which text does a judgment adapter see for a ranked miner answer: prose or the response JSON? (2026-11-01) — `OPEN`

The docs say a hybrid adapter sees "the miner's whole response"; for judgment intents they say only "a miner's
answer". Pool rows are contributor prose. Our EVENT_OUTCOME_RESOLUTION data renders 40% of pairs as the intent's
response JSON and 60% as prose, so either reading is covered. Close it by asking Telegraph, or from a ranked
epoch's record if one is ever published.

## G36 — the kit's compiled class list disagrees with the live node (2026-11-01) — `OPEN, workaround in use`

`pkg/scoring/catalog` lists EVENT_OUTCOME_RESOLUTION and SANCTIONS_SCREENING_MATCH as hybrid;
`/engine/v1/intents/<INTENT>_GENERAL` says `judgment` for both, and registration 30 (another author) was rejected
`class_mismatch: class "hybrid", the intent needs "judgment"`. We export with the live class (ARCHITECTURE A1).
Worth reporting to Telegraph: it will cost every adapter author a bond cycle.

## G35 — the tokenizer saved with our October run differs from the pinned one (2026-11-01) — `CLOSED`

`export_adapter` refused `runs/LLM_OUTPUT_EVALUATION/adapter/tokenizer.json` (sha256 `a4285a69…`, pinned
`67bc76f8…`). The only difference is `truncation.max_length` (256 saved by training, 1536 pinned); token ids are
identical on all 22,800 rendered training texts. The pinned file was copied into the export copy
(`C:\Users\hyada\tg-eval\runs-v2\`), not the original run. Export, Stage 1 and the foundation load then passed.

## G34 — the adapter format changed again: safetensors deltas on a shared Foundation Model (2026-10-31) — `UNBLOCKED 2026-11-01`

**Update 2026-11-01:** Telegraph published `telegraphprotocol/telegraph-foundation` release
`modernbert-base-lora16-v1` (2026-10-31 18:19 UTC; all four sha256 checked `OK`) and the reference executor
`cmd/adapterexec` (kit `main` `1ed063e`). Our LLM_OUTPUT_EVALUATION delta is exported and passes Stage 1 and the
foundation load (track2 MEMORY, 2026-11-01). The original text follows.

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
