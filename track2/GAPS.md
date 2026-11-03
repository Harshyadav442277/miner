# GAPS — Track 2 honesty ledger

The Season I gaps (G13–G27: rank_answer corpora, calibration thresholds, registration 1882) were cut on 2026-10-29.
The modules they describe are retired: they were deleted from the tree, and the V2 registry no longer lists 1882.
They are in `git log -p -- track2/GAPS.md`.

## G41 — real-answer sanctions measurement exposes source/length confounding (2026-11-01) — `OPEN`

**Nov4 v27 result:** rejected: qualified listed28/48 but late-JSON absent0/48;
the same form is0/64 absent even on source TRAINING examples. Question-only
auxiliary membership34/48 listed,37/48 absent does not rescue main ranking.
Qualified-prose positive primary-token recognition48/192(v26),101/192(v27),
negative288/288 each. Earlier near-perfect role counts apply to training forms,
not this wording. Main diagnostic margins match the ordinary qualified gate.
Source-training fit for simpler v25 is being measured; no new full-corpus run.

V25 source fit subsequently measured thin listed34/64,alias16/32,late absent28/64.
V28 now tests only duration on the same128 source facts, fixed128 updates/four
passes, no development scoring before the final step. Require exact v25 tensor/loss
replay at32 and95% final source-fit strata as well as all original development gates.
This is not a full-corpus run or a factual-success claim; result pending.

**Measurement guard Nov4:** direct measure_miners.py previously ignored the
balanced-block audit, permitting a nonempty1-3-block cohort despite score_allowed
false. It now enforces frozen permission/minimum4/context before model loading.
The existing0-block cohort refuses, no worker/model scores. Five new CLI tests,
36 total pass. Evidence: adapter/sanctions/evidence/scoring-permission-guard.
This closes an execution guard, not the missing balanced factual evidence.

**Nov4 IST:** v20-v26 completed and rejected before export on individual factual,
alias or thin-retention guards. V25 source-error replay yields qualified listed
24/48; v26 training-only factor supervision yields25/48. V26 primary-verdict
auxiliary head gets1,533/1,536 tokens right and0/2,334 secondary-negation role
mistakes, but membership predictions vary across answer forms for82/96 queries.
With the answer removed, that existing head gets47/48 listed,6/48 absent, largely
a listed prior. Frozen parent13/v26 feature/readout diagnosis is ongoing. These
are paired-development diagnostics, not independent factual accuracy or a fix.
No full-corpus run, reserved/removal scores, signing or submission occurred.

**19:15 IST:** v19 late-JSON listed46/48 hides absent9/48 and thin-absent retention
failure; rejected before export. V20 all-LoRA capacity comparison on the same64
anchors/32-step recipe is in progress,head frozen. New96 repair-validation questions
retain parent-validation exposure disclosure. Initial process vanished at20 with no
final adapter; archived and restarted identically with atomic recovery checkpoints.
No new factual success, full-corpus run, reserved score or submission is claimed.

**Real-answer transfer Nov3:** v17 hard-anchor bounded repair passes fresh synthetic
class gates but actual old62 is22/62 at256. V18 exact178 tensor context transfer at512
is14/62 vs46/62 length, all claims visible. Rejected. Old14 question control includes
11 aliases/3 primary names; v13/v17 get12/14 thin decisions right, butv17 wins22/53
real pairs for recognized names,18/37 with both claims visible256. Thus poor factual
recognition/visibility alone is insufficient. HF/node fidelity is exact in ordering
on32 synthetic pairs/model, max logit error<0.00003. V19 bounded32-step source-only
distillation is running with64 anchors/96 new unconditioned source-test questions;
no full training or reserved scoring. Mandatory raw-CSV/split audit passes160 names.

**Listed-recall diagnosis Nov3:** same128 complete questions: v13 listed54/64 in
thin JSON,34/64 in qualified MATCH prose; v15 listed52/64 versus3/64. Scope-negation
ablation on32 known anchors gives listed15/16 without identity clause,9/16 with
negated identity clause, absent16/16 both. HF development evidence only. V13 thin
primary30/32,alias24/32 also shows knowledge weakness. One bounded32-step v16
repair in FACTUAL_V16.md improves listed prose34/64 to41/64, below65% gate; thin
class counts unchanged. No export, further full training or external accuracy claim.
Removal collection is now complete320/320, source hashes stable. Strict labels
give11 pairs (7 absent/4 listed), only3 names; frozen role reversals give0 blocks.
score_allowed=false; all those bodies remain unscored. No relaxed post-hoc filters.

**Nov3 IST:** v14 context-only512 failed33/62 against46/62 length. V15's stock
70% synthetic aggregate hides listed58.5% /absent75%; frozen per-class guard blocks
export/external scoring. No factual baseline win is claimed. A new64-query removal
search is collecting genuine responses from32 currently listed and32 officially
removed organizations. The legacy rule structurally abstains on every absent-name
positive; an opt-in source-verified literal-membership rule may identify false
positives while fuzzy/other-list alerts still abstain. All historical scores and
labels stay unchanged. No new data has model scores. Final source stability,
opposite-class errors and balanced-source blocks remain unverified.

**V13 result:** full public reference knowledge ingestion failed27/62 (43.55%)
in the actual node, despite630/800 synthetic test. No reserved scores or binding
claims follow. V14 is a fixed-weight context diagnostic: v3 tensors unchanged,
512-token standard package. All62 machine verdicts are visible, versus43 at256;
its own visible-length baseline rises to46/62. No result yet. The parent trained
at256, so longer-context transfer must remain explicit. G41 stays OPEN.

**Factual continuation:** old62 actual-node results v3 41/62, v9 13/62,
v10 20/62,v11 35/62,v12 4/62. None beats42/62 visible length. V12 head-only
updates preserve all176 encoder tensors; float32 HF and node orderings agree100%.
New reserved capture69 genuine pairs/15 names is still unscored, all listed,
71.74% visible-length baseline. Exact positive-query exposure in v3 is2/14 old
names,3/15 reserved. V13 tests full public reference knowledge ingestion with
real GLEIF absences. This explicitly exposes measured positive reference facts;
do not describe its result as unseen-entity accuracy. Captured answers stay out
of training. Source confounding, one-sided errors, truncation and thin independent
name coverage remain unresolved. See FACTUAL_V12.md and FACTUAL_V13.md.

**Nov 2 continuation:** v7's new query-binding final cohort scores 40/40 versus
v6 36/40, with reversal-balanced providers/classes, 50% tie-aware length baselines,
and identical visible answer tokens across reversed questions. This is relevance
only. Genuine new disagreements: 62 pairs/14 queries, all listed; constant-match
baseline 100%, length 74.19%. Factual validity remains unresolved. Old controls
improve 16/20 to 19/20, but our format remains 3/4: the bank error reverses direction.
An independent audit also found two v7 training exact-name labels affected by
parenthetical stripping; both parent blocks are excluded from the next dataset.
Full methods, scores and limitations: `adapter/sanctions/BENCHMARK_VALIDITY.md`.

**V8 result:** the targeted overlapping-name relevance regression passes in both
directions: 20/20 old controls, own format 4/4. Balanced binding regression 40/40;
fresh absent-bank stratum 20/20 (v7 also 20/20). All 3,200 new chosen fixtures pass
the source audit; full primary names are now preserved by the generator. Tokenizer
parity/export/Stage 1 and hosted-byte checks pass. Genuine same-query results:
v6 29/62, v7 20/62, v8 31/62, versus length 46/62 and constant-match 62/62.
Thus query binding is improved, while factual readiness remains **OPEN**. No
pool-derived training, captured-answer training, wallet action or registration.
At the actual token limit, the tie-aware length reference scores 42/62 (67.74%).
57/124 factual texts are truncated. The later machine-verdict audit identifies
43/62 pairs with both complete claims visible: v3 36/43, v11 34/43, v12 3/43,
versus visible length 24.5/43. Report this subset alongside the unchanged full set;
prose-only claims remain unaudited. Full-body length/verdict references may use fields hidden from the
scorer and are explicitly labeled as dataset diagnostics, not runtime implementations.

Evidence: `adapter/sanctions/evidence/2026-11-01-miners-r1/`. Frozen 32-name queries, 15 YAML routes,
232 responses; 32 unchanged answer pairs from 8 listed names. No negative-name pairs can be labeled
defensibly from observed disagreements. LiveCert is our related miner, disclosed throughout.

Node runtime: v3 29/32 (90.625%), v4 12/32 (37.5%), v5 24/32 (75%); length baseline **32/32**. All wrong
decisions come from one short-response OFAC service. V3 wins every comparison on only 5/8 names; its
diagnostic name-level Wilson 95% lower bound is 30.6%. This is not an 80% result with a defensible margin
on a representative set. It cannot justify sanctions registration. The exploratory 24-pair run is separate.

The snapshot proves exact-name membership/absence, not identity or all-list/fuzzy clearance. Labels
assess a decision only; narrative/evidence fields are not comprehensively verified. Other-list/fuzzy
positive alerts, transport errors, unknown status, wrong echoed names and conflicting verdicts abstain.
Raw responses, labels and agreement denominators are replayable. Engine ids differ from registration
ids; some detail API responses are missing or unrelated. Routing uses the catalog YAML's external_path
and parameter mapping. v4/v5 are now hosted as experimental packages, not ready-to-sign candidates.

V6 pilot completed: longer synthetic formats, 5,958/795/794 pairs, measured names/ids excluded, entity,
alias and query splits audited. Kit test 90.18% on 794 pairs; export/Stage 1 PASS. Actual node runtime:
22/32 (68.75%) on the initial set; 19/24 (79.17%) on a fresh 32-name capture (6 names contribute pairs).
V3 scores 20/24 (83.33%) there, but length alone scores 24/24. Both sets remain one-sided/source-confounded.
Since the initial capture informed v6 design, its results are development evidence. The fresh capture
was frozen while v6's configuration was fixed, with no training/model changes from its answers.
A readiness claim needs new independent answers, more names, both labels and source/length-balanced
mistakes. Synthetic exact-absence labels also do not ground-truth every fuzzy-alert threshold.

Wrong-query controls: v6 16/20 (80%), listed 10/10, absent 6/10; our LiveCert-format controls 3/4.
For the Bank of America question, a deliberately paired Bank of India response outranks the correct
answer (9.643579 vs 3.596127). This is a synthetic relevance failure, not an actual miner mistake.
The v6 builder's wrong-entity negatives always use listed replacements, leaving two-no-match swaps
untaught. No causal claim is established. These controls are not training or a registration gate.
No v6 claim of robust factual discrimination, safe own-style rejection or readiness is supported.

Concurrent session commit `33b692a` records owner deregistration of #46 and a released bond unlock at
2026-11-03 18:36:48 UTC. This measurement run did not independently repeat that chain read. Preserve
the current SIGN_S2 FX_NOW flow; this gap applies to sanctions adapters only.

## G40 — the first SANCTIONS_SCREENING_MATCH adapter only judged our own answer shapes (2026-11-01) — `OPEN: v3 REJECTED at 7/15`

**Registration 46 (v3) rejected, 16:25:59 UTC:** "at its runnable URL the adapter ordered 7 of 15 public pairs
correctly (46.7%), below the 70% floor". The node sent one batch of 30 texts, the longest 279 tokens; we answered in
54.4 s with the right identity, so the infrastructure worked and the judgement failed. **Our 72.5% probe did not
predict the pool**: we wrote the probe ourselves, so it shares our assumptions. Pool texts run longer than anything
we trained on (training p99 154 tokens, pool max 279). `0x3035…` scored 9/15 on the same check. Do not register
again on a self-written probe. First get a measurement whose answers we did not write: real sanctions miners'
responses, or another public source. Bond 4.835 MACHINA stays locked until the owner deregisters 46.

**v4 and v5 (not hosted):**
- **v4** (name-shape cue removed) scored 60.0% on the probe.
- **v5** (every SDN entity, twice, 77,936 pairs; keccak `0xddfdfcd0…a43e`) scored a 93.7% kit test. That is recall,
  since every test entity is in training. Its probe score was **53.75%**: it calls nearly every name listed
  (listed 87.5%, real unlisted names 12.5–37.5%).

None of v1–v5 is fit to register. **Sanctions is paused** until a measurement exists on answers we did not write.

**v3 (18:51 IST, keccak `0x49de4107…f2f0`, not hosted):** probe **72.5%** (80 pairs; one cell still 0/8: an
unlisted name's detailed "no entries found" lost to a bare "Match"); held-out 200 pairs 93.0%, 0 ties, length
50.5%. But bare verdicts on never-seen names scored 8/8, which knowledge cannot explain: name shape alone (word
count, capitals) predicted "listed" 71.7% on the v3 test set, because unlisted people were built as 2-word
names. v4 builds every unlisted name from a listed template, word for word, and gives both classes the same
25% typo rate. The words+caps+length rule now predicts listed 58.3% (the remainder is aliases); gate PASS.
v3's 93% is not a judgement number.

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
