# MEMORY.md — Track 2 session continuity

**Read this first every Track 2 session.** Update at session end.

The Season I log (Aug 27–31: rank_answer slots, calibration, registration 1882) was cut on 2026-10-29. Its modules
and files were deleted on 2026-10-18/23 and its links no longer resolved: `git log -p -- track2/MEMORY.md`.
`claude/wasm-track-2-quality-e21db3` was merged into `codex/rank1-14-intents` on 2026-10-29.

---

## 2026-11-02: factual experiments v9-v13

Old62 genuine comparisons: v3 reference41, v8 31, v9 13, v10 20, v11 35,
v12 4 correct. All miss42/62 actual visible-length baseline; none ready to sign.
V12 preserved all176 encoder tensors. HF float32 reproduces actual-node pair
orderings100%; fixed encoder/head crossovers show no gain. Exact positive training
query coverage in v3 is only2/14 old names and3/15 reserved names.
New capture:128 names,640/640 HTTP200,69 pairs/15 names,all listed; baseline71.74%.
Still unscored. Machine-verdict visibility audit now identifies43/62 old observable
pairs; keep full slice and subset separate, do not silently shorten/drop answers.
V13 explicitly ingests20,891 eligible public SDN organization primary/alias names,
including previously omitted nka aliases, with real GLEIF exact-absent names.
Independent CSV audit passes42,382/800/800 pairs; visible-length baseline50%.
All positive reference facts are training-exposed; synthetic val/test measure known
positive representations, not unseen entities. Captured bodies remain measurement-only.
Frozen v3-parent1epoch/lr0.00005 recipe in FACTUAL_V13.md; no result yet.
Preserve the independent FX_NOW block. No wallet or pool actions.

## 2026-11-02 IST: v8 fixes the target regression; factual quality remains open

- Worktree: `C:/Users/hyada/.codex/worktrees/sanctions-benchmark-v7/Telegraph`, branch
  `codex/sanctions-benchmark-v7`, from `bd03fd1`. Shared Claude worktree untouched.
- V7: 904 new requests on 128 unused public names. Balanced binding development
  v6 33/40, v7 40/40; final v6 36/40, v7 40/40. Each 20 reversal blocks, both
  classes/providers balanced, token visibility invariant, length baselines 50%.
- Old controls v7 19/20, own 3/4. V8 fixes both bank directions: 20/20 controls,
  own 4/4. India margin is modest, 16.084156 vs 15.820303. V8 balanced regression
  40/40; fresh bank stratum 20/20 (v7 also 20/20, so no improvement claimed there).
- Genuine new disagreements 62/14 names, all listed. Node v6 29/62, v7 20/62,
  v8 31/62, length 46/62, constant-match 62/62. G41 remains OPEN; no readiness claim.
  Actual visible-token-length baseline is 42/62 tie-aware. 57/124 factual texts
  truncate; decisive-claim visibility remains unaudited. Raw length/verdict
  baselines are full-response dataset diagnostics, not guaranteed runtime rules.
- Source audit: two v7 training queries have parentheticals stripped, invalidating
  exact-name labels. No such val/test query. Archive preserves it; v8 excludes both
  parent blocks, but inherits v7 weights. First v8 attempt stopped before completion.
- `BENCHMARK_VALIDITY.md`, new generators/audits and exact gz inputs retain failures
  and methods. V8 uses 2,400/400/400 pairs, generic shared words and true computed
  source comparisons; fresh absent-bank cohort separately frozen, no external bodies
  in training. V7 final is now regression evidence. Preserve FX_NOW block below.
- V8 kit test 96.25%; checkpoint selected on synthetic val loss (epoch 0), never
  external scores. All 3,200 new chosen fixtures/source comparisons audit clean;
  query/entity/alias splits have zero overlap; tokenizer parity 6,400/0 differences;
  16 unit tests pass. Exact dataset rebuilding and public-clone replay pass.
- V8 Stage 1 and actual node checks pass. Final SHA-256
  `6dcf705b5f0550a0904d793fd71a6073c29ea024bba38cc2266794cbce778f4c`, keccak
  `0x083cd65e298ac96b2a79804890c00e79dda968734b1d8cee93ea5a0f69851976`.
  Experimental package hosted at factscore `4e2c76a`, v7 at `0b177f7`; both downloaded
  and hash-checked. Source/results on `codex/sanctions-benchmark-v7`; protocol freeze
  `4e81b5e`. No live sanctions executor/tunnel left running, wallet or pool action.
  The next step is valid factual coverage and cross-format factual discrimination,
  not another registration based on relevance controls.

## CURRENT FX_NOW and funding — 2026-11-01 18:45 UTC (Nov 2 00:15 IST), Claude session

Runs alongside the Codex sanctions session (block below), in the same worktree. The two sessions commit only their own paths.

- **FX_NOW comparator, READY except funding (SIGN_S2 top, commits 9483970 and 322e087).**
  - Runnable `https://livecert-comparator.vercel.app/FX_NOW/runnable`: production, live-check 600/600.
  - File: telegraph-factscore `2825b06…`, `season2/comparator/dist/FX_NOW.wasm`, keccak `0xa92fd576…13ca`.
  - Fee: the owner's wallet.
  - Dry run at 18:38 UTC fails only on balance: the wallet holds **3.547 MACHINA** and the bond is **4.477**.
    The allowance (5.165) already covers it.
  - To fund it: the faucet reopens around 08:05 UTC Nov 2 (+5), or a swap. A fork test showed 6 test USDC → 5.479
    MACHINA, after which the register call simulates as id 51. The owner has not chosen yet. I advised no need
    to ask Ahmed, because the docs state the USDC mint-and-swap route.
  - **Next:** after funding, the owner publishes on Anjoman Evaluators (file URL, `FX_NOW`, fee, runnable URL).
    Then follow `/api/wasm` to `canonical`.
- **Why comparators:** another author's WEATHER_CHECK comparator (#45) went canonical in about an hour on the
  node's exact-match gate (1,120 cases, 0 mismatches). There are 6 deterministic families. 5 are taken:
  WEATHER_CHECK #45, and CRYPTO_PRICE #47, CURRENCY_EXCHANGE #48, STOCK_PRICE #49, SSL_VERIFICATION #50 by
  `0xd4c73e99…` at 16:08–16:14 UTC. An exact comparator ties the incumbent and cannot gain the +2 margin, so
  **FX_NOW is the only target.**
- **#46 deregistered by the owner** (nonce 6, plus contribution rewards claimed). `releasedMinerBond` shows
  4.835 MACHINA locked until **2026-11-03 18:36:48 UTC**. After that: My registrations → Released bond →
  Withdraw bond. Anjoman's Deregister needs a second click on "Confirm deregister?" within 4 s; the first
  attempt sent nothing.
- **Open-family scan, ~18:50 UTC:** 124 families; 14 have ≥ 5 eligible pool submitters. **Only
  SANCTIONS_SCREENING_MATCH lacks a champion among them.** About 30 judgment families with no champion have
  only 1–3 submitters, so a registration there waits as "awaiting material". Weakest incumbent:
  SECURITY_REVIEW, 71.43%. Mass registrations to "see which works" are not useful: one family, a 15-pair noisy
  gate, and a bond locked about 50 h each.
- **MACHINA/USDC pool:** 662 MACHINA / 740 USDC. Do not mass-swap: the pool prices every bond, and it is shared.
- **No real money:** everything is on Sepolia (test ETH, test MACHINA, test USDC). Real money is only prizes.
- **Live Evaluator rubric:** 40/15/10/10/5 plus growth 20 (RULES_SEASON2.md, commit 6b09093).

## CURRENT sanctions work — 2026-11-01 19:13 UTC (Nov 2 IST): measurements complete; no ready adapter

User supplied the handoff and authorized feature-branch commits/pushes. Work remains in
`claude/evaluators-status-a51518`, `.claude/worktrees/evaluators-status-a51518`. Another active session
added FX_NOW work and recorded #46 deregistration in SIGN_S2; preserve it. This session owns the
sanctions measurement and documentation, not that session's wallet/funding/FX_NOW flow.

- **Pushed `50abf15`:** public catalog/YAML/routing captures, 232 responses to 32 frozen names,
  conservative labels and 9 passing label tests. Evidence: `adapter/sanctions/evidence/2026-11-01-miners-r1/`.
  No pool rows queried, inferred, downloaded or trained on.
- **Final node measurement:** 32 pairs, only 8 distinct listed names; v3 29/32 (90.625%), v4 12/32
  (37.5%), v5 24/32 (75%). Zero ties; 31/64 rendered texts exceed 256 tokens. Length baseline **100%**;
  all wrong responses come from one short-response service. No model establishes readiness or a margin.
- **Agreement:** four substantive services agree on comparable decisions (26–32 names). Against the
  terse OFAC service, 71.4–75%. Eight static sources are probed once. Abstentions are explicit.
  LiveCert is related-party. Engine ids are not registration ids; per-id lookup anomalies are retained.
- **Tooling:** collect_miners, label_miners, measure_miners and verify_evidence. Runtime checks every identity
  and input root, stores exact bits, uses isolated ports 18081–18083 and stops its own workers.
  Historical train/val/test bytes, builders, probe inputs and scores recovered, including v1 29/48.
- **v4/v5 hosted for reproduction**, not registration: `telegraph-factscore` `season2-adapters-v2`
  `43110d0`; both pinned downloads HTTP 200, 6,776,916 bytes, SHA-256 equal to manifests.
- **v6 exploratory pilot:** longer synthetic answers from public SDN data, no captured response bodies;
  measured names/ids excluded. Disjoint entities/query strings; 5,958/795/794 pairs, gate PASS
  (length 53.3%, surface 60.5%, negative overlap 0.4%). Data:
  `C:/Users/hyada/tg-eval/pairs/sanctions_v6_pilot_r1`; builder `build_structured.py`.
- Batch 8 and 4 failed alongside CPU measurement. Serial batch-1 smoke reached step 10. With measurement
  workers stopped, batch 4 / accumulation 4 / eval batch 1 progresses at ~2 s/optimizer step, 744 planned
  steps/two epochs. Log `C:/Users/hyada/tg-eval/train_sanctions_v6.log`; two OOM logs retained.
  **Completed:** kit test 90.18% (794 synthetic pairs), export/Stage 1 PASS. Node runtime v6 initial
  22/32 (68.75%); fresh 19/24 (79.17%). Experimental package at `telegraph-factscore` `182737e`,
  SHA-256 `71cbf5d1812fbc240dfc3fc604e1f97c527ae45061feccc29850e5f000ac464a`; pinned download equal.
  Kit's known final-message `NameError: pkg` caused exit 1 after result/checkpoint completion; independent
  export, foundation load and actual runtime scoring passed. No misleading CLI-success claim.
- `WINNING.md` and ARCHITECTURE now use 40/15/10/10/5/20. `SUBMISSION_S2.md` is the honest draft;
  `OUTREACH_S2.md` contains unsent update plans. No posts or independent activation claimed.
- This session performed no wallet action, new registration, public tunnel, cast dry run or message send.
  The other session's #46/FX_NOW changes are separately documented in SIGN_S2 and preserved.
- Fresh capture: another 232 responses, 24 pairs/6 listed names. V3 20/24 (83.33%), v6 19/24 (79.17%),
  length baseline 100%. No negative pairs. Names/ids/aliases/query strings are disjoint from all v6 splits.
  No model/design changes from fresh responses; labeling and scoring followed training completion.
- Wrong-query controls: v6 16/20 (80%); listed 10/10, absent 6/10; own LiveCert format 3/4. A deliberately
  wrong Bank of India response beats the correct Bank of America response for that question. This is a
  synthetic context swap, not an actual miner error. G41 remains open; no readiness/factual robustness claim.
- Tokenizer parity: 15,094 rendered texts, zero token-id differences. Public shallow-clone replay passed
  with core.autocrlf=true and identical pair hashes. All raw hashes/route mappings/score arithmetic pass;
  local measurement ports 18081–18083 have zero listeners after cleanup. Author replay is not activation.

## CURRENT — 2026-11-01 ~07:15 UTC · V2 PIPELINE PROVEN; EVENT_OUTCOME_RESOLUTION ADAPTER TRAINING

Owner: "start building whatever this track requires. do the work in phases". Worktree branch
`claude/evaluators-status-a51518`, moved to `codex/rank1-14-intents` HEAD `130e16c` before any edit.

- **Unblocked (G34):** foundation `modernbert-base-lora16-v1` published 2026-10-31 18:19 UTC; files in
  `C:\Users\hyada\tg-eval\foundation\`, all four `sha256sum -c` OK. Kit `main` `1ed063e` cloned to `tg-eval\kit-v2`,
  binaries in `tg-eval\bin-v2\`. Docs re-read 2026-11-01 (all four scoring pages "Updated November 1, 2026").
- **Phase 1 done — LLM_OUTPUT_EVALUATION re-exported**, no retraining: `tg-eval\runs-v2\LLM_OUTPUT_EVALUATION\
  LLM_OUTPUT_EVALUATION.safetensors`, 6,776,916 B, keccak `0x01f177bc3a87af7c52ae900464c274dd668bb041f05391931844446b9c949839`,
  max_tokens 256. Stage 1 PASS; loaded on the foundation and scored twice to the same bits. **Node runtime
  (`adapterexec` + `track2/adapter/score_pairs.py`): 98/100 held-out pairs, 0 ties, length baseline 0.41**
  (`node_scores_test100.json`). Our test set only, not the hidden pool. **Not registering it:** seed 900002
  holds the family and we cannot measure the +2-point margin. Tokenizer fix: G35.
- **Target chosen from live data (2026-11-01 ~06:50 UTC):** judgment intents we serve with ≥ 5 pool
  contributors and no canonical adapter: EVENT_OUTCOME_RESOLUTION (5), SANCTIONS_SCREENING_MATCH (6),
  VULNERABILITY_TRIAGE (6); URL_SCAN_VERDICT is hybrid (5). Author `0x3035…` registered adapters on all of them
  at 05:21–05:28 UTC; each was rejected (class_mismatch, or 60% on the 15 public pairs). First to 70% wins
  `first_canonical`; after that a challenger needs +2 points.
- **Phase 2 in progress — EVENT_OUTCOME_RESOLUTION:** live class `judgment` (G36). Data: 31,214 settled events
  and elections from Wikidata (CC0, ≥ 3 sitelinks, 1990–2025, two years partly lost to a parse error since
  fixed) → `tg-eval\pairs\event_outcome_v1\` 19,291 / 2,589 / 2,566 pairs, split by event series; dataset gate
  PASS (surface 58.2%, length 50.2%, leak 0.4%). Builder `track2/adapter/event_outcome/`. Rendering covers prose
  and response JSON (G37). Training run `tg-eval\runs-v2\EVENT_OUTCOME_RESOLUTION`, log `train_event_outcome_v1.log`.
- **Phase 2 trained and checked:** kit gate PASS, 74.7% on 2,566 unseen-series test pairs (length 0.507).
  Exported from the adapter folder (the HF-cache tokenizer `9fd55…` gives identical ids to the pinned one on
  75,738 texts; G35's method). Package `runs-v2\EVENT_OUTCOME_RESOLUTION\EVENT_OUTCOME_RESOLUTION.safetensors`,
  6,776,916 B, keccak `0xc23ad1c6268d27f1a33de975c39b547844fef14e95868b5158f3e020e5b5e9e0`, class judgment,
  max_tokens 256. Stage 1 PASS and foundation load with `bin-v2\adapterbuild-live.exe` (the kit plus
  `track2/adapter/live_class/live_class.go`; the stock build refuses judgment, G36). **Node runtime, 200 pairs:
  75.5%; structural types 100%, factual flips at chance (G38).**
- **Phase 3 (owner: "Yes, set it up"):** package pushed to `telegraph-factscore` branch `season2-adapters-v2`
  `1d455d4` (cut from the pushed `season2-evaluators`; local `d82ff64`, the retired full-model adapter, stays
  unpushed). Raw URL re-downloaded and re-hashed equal. Executor (`adapterexec`, task in this session) serves the
  hosted bytes on 127.0.0.1:8081; `track2/adapter/check_executor.py` PASS. Runbook: [SIGN_S2.md](SIGN_S2.md), top.
- **Tunnel (owner: "Install cloudflared"):** `https://favourite-prohibited-rebate-treasure.trycloudflare.com/` →
  `fanout_exec.py` :8090 → `adapterexec` ×3 (:8081–8083). PASS through the tunnel; worst-case batch 74 s. All four
  processes are background tasks of this Claude session: they stop if the session or the app stops, and the URL
  changes on restart (G39). Keep-awake requested until the session goes idle.
- **Race lost on EVENT_OUTCOME_RESOLUTION (checked ~09:30 UTC):** `0x3035…` registration 39 became first
  canonical at 93.33% on 30 hidden pairs (registered 06:51 UTC). Replacing it needs ≥ 95.33%; ours is at chance on
  factual flips, so **do not register ours** (recommendation). The same author holds first canonical on every
  ≥ 5-contributor intent except SANCTIONS_SCREENING_MATCH (their try: 60% on the public pairs). Weakest incumbent:
  SECURITY_REVIEW 71.43% on 21 pairs. Incumbents score 83–100%, so the hidden pools look easy (mostly structural
  negatives), which favours our data design. Wallet at the owner's "Done": still 0 ETH, 5.0 MACHINA on-chain.
- **Anjoman (owner's screenshots, 2026-11-01):** Activity shows 4829 with 3.3128 MACHINA claimable from $1.96 of
  paid calls (two $0.98 periods) and 2750 with 0.0391; the claim was "rejected in wallet" (0 Sepolia ETH). The payer
  is unidentified: not demand evidence until shown independent. The Evaluate page registers an adapter by URL and
  takes signed material uploads from the connected wallet. Tokenomics: evaluators get 50% of emissions, per intent
  30% to the ranking adapter and 70% to material contributors.
- **Found in passing, not Track 2:** CRYPTO_PRICE_USD is now scored (27 miners, epoch 1957), so the
  "no decimals" blocker in root G235 is gone; 4829 is `active` with `scores: []` all the same. SSL_VERIFICATION_CERT
  and WEATHER_CHECK_TEMPERATURE are `ready` with pool material and score nobody: truth sources alone do not make an
  intent scored (E1 answered no, for now).
- **Owner, blocking registration:** wallet `0xdAd2…A39e` has 0 Sepolia ETH and 0 MACHINA (one $5 adapter bond
  needs ~6–7 MACHINA plus gas); Foundry `cast` is not installed. Later yeses: push the package to a fixed URL, an
  ngrok tunnel for the executor (laptop on ~1.5 h per registration), the `registerWasm` signature.
- **Nothing committed, pushed, signed or registered.**

## 2026-10-31 18:45 UTC · COMPARATOR REGISTRATION WITHDRAWN; ADAPTER FORMAT CHANGED

- **Withdrawn:** the CRYPTO_PRICE comparator registration. FX_NOW is scored with no registered comparator; CRYPTO_PRICE_USD
  is blocked by its intent definition ("price_usd has no decimals"). Root GAPS G237 killed, G235 revised.
- **Adapter format changed (G34):** safetensors LoRA deltas on a shared Foundation Model; full-model `.wasm` refused.
  Our PEFT checkpoints exist, so no retraining. Blocked on Telegraph publishing `foundation.json` and the reference
  executor.
- **Available now without either:** evaluation material for intents LiveCert serves (signed upload, no gas). TASKS.
- Nothing signed or registered. The endpoint `livecert-comparator.vercel.app` stays up.

## 2026-10-31 · CRYPTO_PRICE COMPARATOR READY FOR REGISTRATION (withdrawn the same evening, above)

Owner: "Yes, pick a family" (an evaluator so LiveCert can be ranked; root GAPS G235, G237).

- **Picked CRYPTO_PRICE** (deterministic): 5 ranking-half truth sources, RelTol 1% spec, LiveCert serves
  CRYPTO_PRICE_USD from a licensed source. The evaluator is the existing comparator; comparators are still the V2
  format for deterministic families.
- **Built and deployed** the V2 runnable endpoint, [runnable/](runnable/): `https://livecert-comparator.vercel.app/<FAMILY>/runnable`
  (Vercel project `livecert-comparator`, wukong4; deploy copy `C:\Users\hyada\tg-deploy\runnable`). Serves
  CRYPTO_PRICE and WEATHER_CHECK from the exact hosted bytes.
- **Verified:** tests 6/6 (BigInt reference port, ~40k cases per family, twice; two mutants caught); live
  600/600 per family equal to the local scorer; hosted keccak equals the manifest; reference rule unchanged at kit
  HEAD `5fa5d68b`.
- **Blocked on the owner:** the wallet has 0 Sepolia ETH and 0 MACHINA. Runbook: [SIGN_S2.md](SIGN_S2.md), top.
- **Not verified:** that a live comparator makes the family scored (G237 is a hypothesis from one family).

## 2026-10-29 · V2 IS LIVE; THE EVALUATOR WORK MUST BE RE-CHECKED AGAINST IT

- **V2 docs (anjoman.ai/docs, updated 2026-10-27):**
  - Only float model adapters in WASM are accepted. "The older formats are refused."
  - `registerWasm(hash, url, prefix, feeAddress, runnableUrl)`, registered per family, with a runnable endpoint.
- **Devnode `/api/wasm`, 2026-10-29:** 7 families. Registration ids restarted, and 1882 is gone. Its Season I
  artifact, `calibration/dist/text_authenticity_v2.wasm`, was deleted from the tree the same day.
- **State carried from 2026-10-25 (below):**
  - Nothing is registered or signed.
  - The comparators and recipe are public in `telegraph-factscore` `season2-evaluators`.
  - The adapter package was never pushed.
  - Local kit and runs (~5 GB) are in `C:\Users\hyada\tg-eval\`; delete them only on the owner's say-so.
- **Next:** read `/docs/scoring/build-a-scoring-module`, `train-a-scoring-adapter` and `contribute-evaluation-data`
  on anjoman.ai. Then decide whether the comparators (`comparator/`) and the adapter (`adapter/`) port to V2, before
  any registration (G33). Deadline: Dec 1 23:59 UTC ([../RULES_SEASON2.md](../RULES_SEASON2.md)).

## 2026-10-25 · WASM WORK STOPPED: THE ORGANISERS SAY THE CURRENT WASM SYSTEM IS DEPRECATED IN DAYS

**What was said.** Ahmed Ali (Telegraph), on Discord, relayed by the operator in a screenshot: "i'd hold off on that
for now, as the current wasm system will be deprecated in couple of days". The operator: "no need to work on wasm".

**State left behind:**

- Nothing is registered or signed.
- **Public:** `telegraph-factscore` branch `season2-evaluators` at `2825b06`. It holds the comparators and the
  training recipe, with no adapter package.
- **Never pushed:**
  - adapter commit `d82ff64`, in `C:\Users\hyada\tg-eval\factscore`;
  - release `s2-evaluators-v1`, which was never created.
- **Why the last push failed:** `gh`'s active account had become `0xsaroj001`, and git uses `gh` as its login helper.
- **Local only, in `C:\Users\hyada\tg-eval\`:**
  - the kit and venv;
  - FEVER and the pairs;
  - both adapter runs, about 5 GB including two 1.2 GB packages;
  - `base-node`;
  - the built tools.
- **Delete `tg-eval` only on the operator's say-so.**

**What carries forward**, whatever replaces the WASM system:

- the pair generators (FEVER hard negatives, data gate passed);
- G32: the kit converts a different ModernBERT from the one it trains. The organisers have not been told.
- the exactness and fidelity checking approach.

**Next action:** none on WASM. Re-read the evaluator docs when the organisers announce the replacement.

## 2026-10-22 17:40Z · ADAPTER RETRAINED AND VERIFIED · RELEASE COMMIT d82ff64 AWAITS THE OPERATOR'S PUSH

- **Adapter.** Retrained in the node's architecture.
  - It scores 96.6% as the node computes it, and `verify_wide` PASS with Pearson 1.00000.
  - The package is `tg-eval/runs/LLM_OUTPUT_EVALUATION_node/LLM_OUTPUT_EVALUATION.wasm`, keccak
    `0x76f78441…88d02f77`.
- **Release clone.** The adapter is committed at `d82ff64`, on top of the pushed `2825b06`.
  - The operator runs step 1b of [SIGN_S2.md](SIGN_S2.md): `git push`, then `gh release create`, in PowerShell.
  - After that, hash the release-asset URL with `cmptool.exe hash`. The check is whether the hash matches row 1 and
    whether the URL follows GitHub's redirect.
- **Still blocked on devnode** for any registration.
- **Not yet done:** telling the organisers about G32 (the kit converts a different ModernBERT from the one it
  trains). That needs an operator-approved message.

## 2026-10-22 16:40Z · COMPARATORS PUBLISHED AND HOSTED-HASH VERIFIED · ADAPTER RETRAINING

- **Published.** The operator pushed `telegraph-factscore` branch `season2-evaluators` at `2825b06`. It holds the
  comparators, their check and the training recipe, with no adapter package. All 31 hosted comparator URLs were
  re-hashed at 16:38 UTC: 31 of 31 match [SIGN_S2.md](SIGN_S2.md) rows 2–32.
- **Not registered.** Devnode `/api/evalpool/status` still returned 404 at 16:36 UTC.
- **Adapter.** The first package `0xe54abbfe…` is withdrawn: it scores 81.0% as the node runs it (G32).
  - The retrain against `tg-eval/base-node`, which uses the node's architecture, restarted at 22:05 IST. Its log is
    `tg-eval/train_loe_node2.log`. The first retrain attempt died mid-epoch with exit 4; the cause is unknown.
  - Next: `eval_deployed.py` on the retrained adapter. Then convert with `--base base-node`, adapterbuild,
    `verify_wide`, a second release commit plus `gh release`, and row 1 of the sign list.

## 2026-10-22 ~08:00Z · 32 WASMs BUILT · RELEASE PREPARED, NOT PUSHED · WAITING ON DEVNODE

- **LLM_OUTPUT_EVALUATION adapter:**
  - 96.9% on 800 held-out test pairs.
  - The package is 1,205,363,765 bytes, keccak `0xe54abbfe…b067ed89`. Two builds are identical and the kit's
    node-load check passed.
  - Recipe: [adapter/llm_output_eval/](adapter/llm_output_eval/README.md).
  - Built files live in `C:\Users\hyada\tg-eval\runs\LLM_OUTPUT_EVALUATION\`.
- **Comparators:** 31, one per mission-bought deterministic intent. They score 234,848 cases exactly through the
  node's runtime. See [comparator/](comparator/README.md).
- **Release prepared** in `C:\Users\hyada\tg-eval\factscore`:
  - branch `season2-evaluators`, commit `421e071`, 53 files under `season2/`;
  - **not pushed**;
  - the operator approved preparing it and asked to see the commands first.
- **Sign list:** [SIGN_S2.md](SIGN_S2.md), with 32 rows. Every row's keccak was re-hashed from the release files.
  Nothing has been signed.
- **Blocked on:**
  - devnode switching: `/api/evalpool/status` still returned 404 at 07:45 UTC;
  - the operator's push;
  - `verify_wide`, the packaged adapter running in the node runtime. It was restarted at 13:11 IST with a live log
    in `tg-eval/verify_wide2.log`. The first overnight run was killed: the laptop slept and its output was
    buffered.
- **Tool:** `C:\Users\hyada\tg-eval\cmptool.exe hash <url|file>` prints keccak256, following redirects.

## 2026-10-21 ~09:00Z · FACT_CHECK PAIRS BUILT AND PASSING · THE KIT REFUSES TO PACKAGE FACT_CHECK

The operator chose the FACT_CHECK wide adapter. What happened:

- **Kit set up outside OneDrive** in `C:\Users\hyada\tg-eval\`.
  - `kit/` is `telegraph-wasm-baseline` at `feature/v2-integration` `992f2650`.
  - `.venv` is Python 3.12, with torch cu126 installing.
  - `adapterbuild.exe` was built with Go 1.26.3.
  - `data/fever_gold/` holds FEVER, and `pairs/fact_check_v1/` holds the output.
- **Pairs built and the data gate passed:** 6000/800/800, split by article, 50/50 labels. Generator and numbers are
  in [adapter/fact_check/](adapter/fact_check/README.md).
- **Blocker, G29:** `adapterbuild` refuses FACT_CHECK and WEB_SEARCH. The kit only classifies the 31 judgment and
  hybrid intents added on 2026-09-08. Proposed instead: LLM_OUTPUT_EVALUATION (judgment, 7 missions, packageable).
  The question for the organisers is in G29.
- **VRAM test passed (G28.3):** 0.74 GiB peak at batch 8, about 35 minutes for 3 epochs of 6,000 pairs.
  - The venv's torch is `2.14.1+cu126`. uv timed out twice on the 2.4 GB wheel, so it was fetched with
    resumable `curl -4` into `tg-eval/wheels/` and installed from there.
  - Set `HF_HOME=C:\Users\hyada\tg-eval\hf` so the model cache stays off OneDrive.
- **Next action:** the operator chooses between moving the method to LLM_OUTPUT_EVALUATION and waiting for the
  organisers' answer on FACT_CHECK. Nothing has been trained, uploaded or registered.

## 2026-10-21 ~07:00Z · SEASON I SCORERS CANNOT BE UPLOADED ANY MORE · WAITING ON THE OPERATOR'S PATH CHOICE

The operator asked for "more WASM, high quality, win Track 2 again". The checks below change that request.

- **We placed 2nd in Season I Track 2.** zkasuran was 1st and BangDropID 3rd (`/winners`, read today). "Again"
  is therefore not accurate.
- **Our scorer kind is retired.** The docs updated today say `rank_answer` modules are rejected on registration,
  so nothing in `scorer/` and none of the Season I recipes can be uploaded.
- **Season II modules come in two kinds.** Deterministic intents take an exact-rule comparator, a few KB.
  Judgment and hybrid intents take a ModernBERT reward-model package of about 1.2 GB, which competes on a hidden
  evaluation pool of 200 pairs and needs a 70% win rate to become the first canonical module.
- **Devnode has not switched yet.** Full facts are in
  [../docs/TELEGRAPH_FACTS.md](../docs/TELEGRAPH_FACTS.md), and the open questions are in [GAPS.md](GAPS.md) G28.
- **The open ground is large.** 61 of the 76 intents the Season II missions buy have no scorer of any kind. The
  biggest judgment targets are WEB_SEARCH 15, FACT_CHECK 14, TASK_EXECUTION_QUALITY 10 and LLM_OUTPUT_EVALUATION 7.
- **The carry-over idea** is the Season I thesis, grade what an answer asserts and not its wording. In Season II
  it becomes training data: preference pairs whose rejected answer is plausible and about as long, but wrong in a
  figure, an entity, a date or a verdict. The kit's data checks require exactly that.
- **Next action:** get the operator's choice of path, then start with the adapter kit's `--check-data` and a
  VRAM test on the RTX 3050 (4 GB).
- **Nothing was registered, uploaded or signed this session.**

---
