# MEMORY.md — Track 2 session continuity

**Read this first every Track 2 session.** Update at session end.

The Season I log (Aug 27–31: rank_answer slots, calibration, registration 1882) was cut on 2026-10-29. Its modules
and files were deleted on 2026-10-18/23 and its links no longer resolved: `git log -p -- track2/MEMORY.md`.
`claude/wasm-track-2-quality-e21db3` was merged into `codex/rank1-14-intents` on 2026-10-29.

---

## CURRENT — 2026-10-29 · V2 IS LIVE; THE EVALUATOR WORK MUST BE RE-CHECKED AGAINST IT

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
