# MEMORY.md — session continuity

## 2026-11-04 IST: v22-v26 rejected; isolated-membership v27 probe running

Completed v21-v26 source probes all fail individual factual/alias/retention gates.
V26 qualified listed25/48,alias11/24,thin listed36/48. No export. Training-only
primary-role head recognizes1,533/1,536 tokens,0/2,334 secondary-negation errors;
membership predictions change across answer formats for82/96 questions. Its
existing head without an answer gets47/48 listed,6/48 absent, mostly a listed prior.
Frozen ridge readouts(parent13/v26,128 source train/96 paired development) give
question-only aliases12/24 and11/24. Readouts are diagnostics, never deployed.
V27 restarts parent13, same128 facts/32 binding controls/32 updates/main178 tensors;
adds training-only question membership BCE and detached query-feature invariance.
Raw CSV/source-split audit passes224 names, prefix annotation audit passes256 rows.
Current log tg-eval/isolated_membership_v27.log; no result yet.31 tests pass Nov4.
No full-corpus run, reserved/removal score, wallet, registry or submission action.

## 2026-11-03 19:44 IST: v21 rejected; v22 ordinary joint-ranking probe

V21 fails absence early JSON28/48,late JSON25/48,late prose31/48, despite late
listed46/48. No export. V22 uses ordinary Cartesian softplus(wrong-correct),
all176 LoRA +existing769 reward-head params trainable jointly, no teacher-score
loss or consistency penalty. Same64 source anchors/32 steps/lr/seed/max512/recovery.
New96 repair-validation questions exclude v20/v21 and prior groups; parent source
validation exposure remains explicit. Independent160-query audit passes.
Current log tg-eval/ranking_v22.log; no result yet, no full-corpus run/reserved score.
Source through52010f9 public, rejected replay artifact12/12 HTTP200/SHA at08ce133.

## 2026-11-03 19:31 IST: v21 direct-margin objective probe running

V20 training-fit diagnosis: thin64/64, late-JSON listed32/32 but absent22/32;
10 absent training failures show underfit even before transfer. V21 changes only
the loss on same64 anchors/teacher targets,176 LoRA tensors,head/base frozen,
same32 steps/seed/lr/max512/recovery: per-format factual-margin MSE against parent
thin margin +0.1 within-truth variance +0.2 Cartesian ranking. No inference change.
New96 repair-validation queries from v13 val exclude v20 and prior groups; parent
validation exposure explicit. Independent160-query source/split audit passes.
Current log tg-eval/margins_v21.log; run active, no result. No full-corpus run,
reserved scores or submission. Twelve rejected replay files HTTP200/SHA verified
at factscore08ce133; portable manifest paths/public JSON hashes corrected.

## 2026-11-03 19:25 IST: v20 completed but still fails absent late-JSON gate

V20 restarted fixed32-step capacity comparison completed. New repair validation
late prose listed19/48 to43/48,alias11/24 to23/24; late JSON listed25/48 to46/48
but absent45/48 to25/48 fails65%. Generic qualified prose primary15/24 also fails.
Thin listed42/48 to44/48,absent42/48 to40/48 within5pp. No export/node/reserved
scoring. All176 LoRA tensors changed, both head tensors unchanged. Recovery saved
178 tensors/176 optimizer states/RNG; restart first20 loss values exactly match.
Training-fit diagnostic now running: tg-eval/training_fit_v20.log, model20, train64,
five forms, not a held-out result. Source through9147c3a pushed feature branch.
Failed replay artifacts/parent13 hosted on factscore branch, portable paths fixed
at08ce133; fresh public SHA checks pending. No full-corpus run or submission.

## 2026-11-03 19:15 IST: v19 fails; v20 capacity test restarted with recovery

V19 rejected before export: late-JSON listed27/48 to46/48 but absent45/48 to9/48;
thin absent40/48 to37/48 exceeds5pp retention loss. Not a valid factual repair.
V20 changes only encoder capacity: same64 anchors/targets,32 steps,all176 LoRA
tensors trainable,head/base frozen; new96 repair-validation questions from v13 val,
explicit parent-validation exposure. Eval/train pre-update logits identical after
training dropout disabled. Original process disappeared afterstep20, no adapter or
result. Archived v20-interrupted. Restarted same inputs/seeds/recipe with atomic
4-step model/optimizer/RNG checkpoints, input-hash bound. Current log:
C:/Users/hyada/tg-eval/capacity_v20.log. Still no full-corpus run or reserved scoring.

## 2026-11-03 IST: short-form repairs fail real answers; bounded distillation running

V17 hard-source-anchor32-step repair passes fresh synthetic class gates: listed
qualified prose36/64 to44/64, absent63/64 unchanged; thin listed54/64 to51/64,
within5pp retention. But actual-node old62 scores22/62 at256 (parent13=27/62),
so rejected. V18 exact same178 tensors at512 scores14/62 vs46/62 length, despite
all claims visible. Neither missing facts nor truncation alone explains failure.
Old14 question control:3 primary/11 aliases; v13/v17 thin12/14 correct. V17
still wins22/53 real pairs for those recognized names,18/37 with visible256 claims.
HF/node fidelity32 synthetic pairs/model passes, max logit error<0.00003.
V19 is a bounded source-only32-step distillation trial, not full training:
parent13,final-two-layer LoRA,512,64 thin-correct source anchors,96 new unconditioned
test questions, truthful source metadata before/after verdict. Exact recipe in
FACTUAL_V19.md. Current run log tg-eval/distill_v19.log, result pending.
Initial CSV audit counted trailing DOS EOF marker; fixed, mandatory bound preflight
passes160 source questions. Aborted pre-optimization attempt retained, inputs
refrozen identically except audit-guard provenance. No source/model fact defect.
Original reserved69 and removal captures remain unscored. No wallet or submission.

## 2026-11-03 IST: listed recall diagnosis; bounded repair in progress

Same128 questions, complete under256 tokens: v13 listed54/64 in thin JSON but
34/64 in qualified MATCH/NO MATCH prose; absent56/64 and63/64 respectively.
V15 falls52/64 to3/64 listed in those forms. Paired wording ablation on32 thin-correct
anchors isolates negated identity scope: v13 listed15/16 without qualification,
9/16 with "Identity is not established by name alone"; absent16/16 in both.
Source recall also weak: v13 thin primary30/32 versus alias24/32. These are HF
development diagnostics, not node scores. No inference correction introduced.
FACTUAL_V16.md freezes one32-step final-two-layer LoRA repair, no full training.
Inputs:64 thin-correct source-training queries,64 entity-disjoint validation,
excluding diagnostic/external entities. Result: prose listed34/64 to41/64, absent
63/64 to60/64; thin54/64 and56/64 unchanged. Fails65% listed gate, no export or
external score. Independent saved-weight audit verifies162 unchanged tensors.

Removal capture completed320/320 HTTP200, unchanged before/after source hashes.
Strict opt-in labels yield11 comparisons (7 absent,4 listed), only3 distinct names.
Frozen source-role reversal matching yields0 blocks, so score_allowed=false.
No model scores from this capture; do not relax filters after seeing this result.

## 2026-11-03 IST: factual failures; removal search historical collection state

V13 actual27/62 rejected at256; v14 unchanged v3 tensors at512 scored33/62 versus
46/62 length, also rejected. V15 trained512 with four response forms per source
query; kit70% but listed58.5% /absent75%, failing the frozen65%-each gate. No v15
export or external score. The original69 reserved bodies remain unscored.
New opt-in source-confirmed removal search:64 frozen queries (32 removed/current
organizations each), matched prefix length, official notices and fresh SDN/ALT
bytes verified. Four of five provider files returned; final source recheck/labels
pending. Legacy labels remain unchanged. Literal on_list false positives require
official removal/current absence, exclusive OFAC SDN and no fuzzy/ownership cues.
31 tests pass. Method: DELISTING_BENCHMARK.md. No model has scored the new capture.
Wallet, FX_NOW, pool upload, registration and submission remain untouched.

## 2026-11-02: factual-accuracy continuation in progress

User asks to beat the factual baseline before submission. V9 cross-format training
regressed to 13/62; v10 alias/boolean/numeric/enum coverage scored 20/62. Both rejected;
fresh model scoring stopped. Old visible-length reference is 42/62 (67.74%).
V3 historical reference scores 41/62; exact original-data reconstruction proves
inherited source-entity overlap in 50/62 old and 65/69 reserved comparisons.
V11 from v3 with one epoch/lr 0.00001 scored35/62 and was rejected. V12 froze
v3's encoder/LoRA and trained only the769-parameter head on v10 inputs (2epochs/lr0.001),
scoring4/62. Rejected. Float32 HF/node orderings agree100%; export is not the cause.
First v12 attempt hit a validation dtype mismatch; training-only input cast fixed,
aborted log retained. Wrapper verifies all176 saved LoRA tensors are unchanged.
V9-v12 new pairs exclude measured entities; inherited knowledge is disclosed.
V13 explicitly changes to full public snapshot knowledge ingestion: all20,891 eligible
ASCII organization primary/aka/fka/nka names plus real GLEIF exact absences. No captured
answer training. Known positive facts are exposed, so no unseen-entity accuracy claim.
42,382/800/800 pairs; independent CSV/source/split audit passes, length baselines50%.
Frozen recipe: v3 parent,1epoch/lr0.00005,batch8/accum2,rank8alpha32,max256.
Completed: synthetic test630/800, actual-node27/62; rejected, no fresh scoring.
V14 fixed-weight context diagnostic is running: exact v3 tensors, standard512-token
package. All62 old machine claims become visible (43 at256); its own length
baseline is46/62. V3 trained at256, so disclose context transfer, not readiness.
Fresh reserved capture: 128 names, 640/640 HTTP200; 69 genuine pairs/15 names, all
listed, visible-length baseline 71.74%. Still unscored; existing conservative labels.
Methods: `track2/adapter/sanctions/FACTUAL_V12.md`, `FACTUAL_V13.md`; runner `measure_v9.ps1`.
No wallet, pool upload or registration; source/results feature branch only.

## 2026-11-02 IST: sanctions v8 target regression fixed; factual gate remains open

Branch `codex/sanctions-benchmark-v7` uses a managed worktree outside the shared
Claude checkout. See `track2/adapter/sanctions/BENCHMARK_VALIDITY.md` for exact
results: v8 old query controls 20/20 (v6 16/20), own format 4/4; balanced binding
regression 40/40; fresh bank stratum 20/20 (v7 also 20/20). Genuine factual slice
v6 29/62, v7 20/62, v8 31/62; length 46/62 and constant-match 62/62. Not ready to sign.
Independent source audit caught two v7 training labels affected by stripped
parentheticals. V8 excludes those blocks; generator now preserves complete names.
All 3,200 v8 fixtures pass source/split audits; no captured-response training.
16 tests, 6,400-text tokenizer parity, node checks, public-clone replay and hosted
package hashes pass. Source/results branch and experimental packages are published.
FX_NOW and all wallet flows remain separate. Next gap: valid genuine factual coverage.

## 2026-11-01 19:13 UTC (Nov 2 IST): sanctions Evaluator measurements complete

On `claude/evaluators-status-a51518`: 232 public responses, 32 pairs; node v3/v4/v5 90.625%/37.5%/75%.
V6 completed: kit 90.18% on synthetic test; node initial 68.75%, fresh 79.17% (v3 fresh 83.33%).
Two captures total 464 responses. The 100% length baseline and one-sided samples prevent readiness.
Wrong-query controls v6 16/20, own format 3/4. Rubric reconciled to 40/15/10/10/5/20; write-up/tutorial,
frozen data, exact scores, public packages and command logs in track2. G41 remains open.
Another session concurrently owns the FX_NOW flow and recorded #46 deregistration in SIGN_S2; preserved.
This sanctions run performed no wallet action, new registration, miner deployment or message send.

## 2026-10-31 ~19:50 UTC (01:20 IST Nov 1): CURRENT — all 102 mission builds graded; G245 fixed on a preview

Owner: "Partial workflow tests".

- **Production `a8abbcf`:** full builds 9/9 (SEC now cross-checked under the miner's own identity); partial builds
  50/58 on LiveCert's part; **15/15 missions** have a passing build. Evidence `fixtures-all-a8abbcf.json`.
- **G245 extraction** (invoice number never read; 3 builds) fixed in code, unit 869/869, preview `miner-ipk9a60l8`
  checked. **Not on production: the owner's yes covered `a8abbcf` only.**
- **G244 classification** (4 builds): intermittent model deadline miss; owner's trade-off, not changed.
- Tools: `tools/mission-steps.mjs` (steps, references, FAMILY_STEPS), `tools/mission-fixtures.mjs` (runner).

## 2026-10-31 ~19:30 UTC (01:00 IST Nov 1): G241–G243 fixes LIVE on production; workflows 7/9, 0 fail

Owner: "Yes, deploy it". Release record: track1-miner/docs/evidence/release-2026-10-31-mission-fixes/.

- **Production** `miner-htkhwofwv` (`a8abbcf`), alias miner-wine.vercel.app. Rollback `miner-h0lnck8v6` (`330f2af`).
- **Verified:** unit 866/866; preflight 7/7; watch `active`, 380 ms; mission workflows **7 pass, 0 fail, 2 unchecked**
  (SEC steps need `SEC_USER_AGENT`). Before: 3 pass, 4 fail.
- **Not pushed; nothing signed.** Deploy tree `C:\Users\hyada\tg-deploy\mc75190b` is detached at `a8abbcf`.
- **Next, Claude:** fixtures for the partial workflows (S1); E1 truth-source experiment brief; S3 client recipes.
- **Next, owner:** H2 registration before Nov 1 00:00 UTC; Ahmed question (TASKS); push yes.

## 2026-10-31 ~19:00 UTC (00:30 IST Nov 1): strategy rewritten; workflow fixtures 3/9 on production (superseded above)

Owner: "yes start. building. but before create a plan, asymmetrical strategies … use leverage over others".

- **WINNING.md §4 rewritten** (S1–S9) and **§4b experiments** (E1–E6) with kill rules. Leverage refused: extra
  wallets, own traffic as demand, scorers that know our miner.
- **Matrix:** 102 example builds; all 15 missions touched; **9 builds buy only families we serve**.
  TASK_EXECUTION_QUALITY and LLM_OUTPUT_EVALUATION (ranked today) are each the one missing family in 3 builds (S5).
- **Fixtures on production:** 3/9 workflows pass, 4 fail (G241 fact-check, G242 sentiment, G243 election
  phrasing), 2 unchecked (SEC). Evidence `track1-miner/docs/evidence/missions-2026-10-31/`.
- **G241–G243 fixed in code** (owner: "Yes, fix them"): unit 866/866; local fixtures plus preview `miner-d881p4yiz` show every failing step passing. **Not on production**: deploy needs the owner's yes, then re-run the fixtures on production. Deploy tree `C:Usershyada	g-deploymc75190b` is at `5a3dba0` plus the fix files (detached).

## 2026-10-31 ~18:50 UTC (00:20 IST Nov 1): CURRENT — docs re-read; comparator registration withdrawn

Owner: "update the documentation again, because Telegraph have updated them … what's the status … I want to
participate in all the tracks; apps and agents I will take care of later".

- **Docs re-read:** all 37 anjoman.ai/docs pages (25 updated Oct 30–31) and /rules with every tab. Facts:
  docs/TELEGRAPH_FACTS.md top section. Rules substance unchanged; prize-payment terms still unpublished (G218).
- **G237 killed:** FX_NOW is scored with no registered comparator. The CRYPTO_PRICE registration is withdrawn
  (track2/SIGN_S2.md top). Do not fund the wallet for it.
- **G235 revised:** judgment/hybrid intents need a canonical adapter and 5 pool contributors (ours: none, 0–1);
  CRYPTO_PRICE_USD's intent is `ready: false` ("no decimals"); WEATHER_CHECK_TEMPERATURE's cause is unknown. The
  question to Telegraph in TASKS is rewritten.
- **Adapters are now safetensors LoRA deltas (G238):** ours can be re-exported without retraining once Telegraph
  publishes `foundation.json` and the reference executor.
- **Epochs are 1 hour** since this afternoon (G239).
- **4829:** `active`, 36 intents, unchanged. Miner production `330f2af`, unchanged this session.
- **Not done:** G236 `cast` check (`cast` not installed). Nothing pushed, signed or registered.
- **Next, the owner's:** register for H2 before Nov 1 00:00 UTC (05:30 IST); send the TASKS question to Ahmed;
  say yes to the push; choose licensed news and stock sources.
- **Next, Claude's:** mission × intent matrix and fixtures (Nov 1–13); evaluation material for our intents
  (owner signs uploads); G207; `licensing` in openapi.json; first weekly audit.

## 2026-10-31 ~17:00 UTC (22:30 IST): CURRENT — CRYPTO_PRICE comparator ready; owner funds and signs

Owner: "Yes, pick a family". Details: [track2/MEMORY.md](track2/MEMORY.md), runbook [track2/SIGN_S2.md](track2/SIGN_S2.md).

- Picked CRYPTO_PRICE. Its evaluator is our existing, verified comparator (keccak `0x30dd31e3…cd9a3`).
- Runnable endpoint live: `https://livecert-comparator.vercel.app/CRYPTO_PRICE/runnable` (new Vercel project
  `livecert-comparator`). Tests 6/6, live 600/600.
- The wallet `0xdAd2…A39e` has 0 Sepolia ETH and 0 MACHINA: fund, approve, simulate, register (owner).
- G237: that a live comparator makes the family scored is a hypothesis. The draft question to Telegraph is in TASKS.

## 2026-10-31 ~16:15 UTC (21:45 IST): CURRENT — licence gates LIVE on production; not pushed, nothing signed

Owner: "i dont see livecert listed on rankings. update our miner and make it ready for the hackathon".

- **Why LiveCert is not on the rankings (G235):** on V2 only families with an evaluator are scored. 71 of 1,875
  registrations are scored, all in 7 families; none of our 36 families has an evaluator, so no miner at all is
  ranked in them. 4829 is `active`, the watch is green. Nothing in the miner changes this.
- **V2 moved to Ethereum Sepolia (G236):** Diamond `0x3624…b99b`. RULES_SEASON2, README and WINNING corrected.
- **Released `330f2af`** (licence gates, G200 qualifier, G217 holders, plus two fixes found on the preview:
  off-topic `/stock-price` questions get `no_subject` before the licence refusal; "What's the news on X" no longer
  leaves "'s" in the subject). Production `miner-h0lnck8v6`; rollback `miner-6kvt9zv2p` (`4af4ebd`).
- **Gates changed** to grade an honest `not_licensed` as correct; upstream-health no longer probes the nine
  sources production stopped calling, and probes MET Norway + Nominatim through production.
- **Verified:** unit 854/854; preflight 7/7 exit 0; intent answers 40/40 (34 answered, 6 honest refusals);
  watch `activation=active`. Evidence: `track1-miner/docs/evidence/release-2026-10-31-licence-gates/`.
- **Live consequence:** STOCK_PRICE, NEWS_HEADLINES, NEWS_SEARCH refuse everything; WEB_SEARCH loses current
  news; IP_GEOLOCATION answers reserved ranges only; FINANCIAL_DATA answers SEC figures only. Licensed sources
  are the owner's call (TASKS).
- **Branches:** `codex/rank1-14-intents` fast-forwarded to the docs commit after `330f2af`; not pushed.
  Deploy tree `C:\Users\hyada\tg-deploy\mc75190b` (detached, `npm ci` done).
- **Next, the owner's:** register for H2 before Nov 1 00:00 UTC (05:30 IST) if not done; G235 decision; push.

## 2026-10-29 ~18:00 UTC (23:30 IST): licensed-sources MERGED (deployed 2026-10-31, above)

Owner: "Merge it" (claude/licensed-sources).

- **Code conflicts resolved by keeping both sides:**
  - `handler.ts`: the receipt envelope plus the `licensing` field;
  - `currency.ts`: the 10-minute ECB hold plus the Frankfurter fallback;
  - `geo.ts`: DNS read-notes plus the licence gates.
- **Gaps renumbered:** the branch's G208–G212 collided with codex's, so they are now **G230–G234**. The docs
  session holds G221/G222 and was told G230–G234 are taken.
- **Ledger brought up to date with codex's routes:**
  - `/dns`, `/token-supply`, `/keywords` and `/vuln-triage` added;
  - CISA KEV and FIRST EPSS registered as unread (G233);
  - URLhaus removed;
  - a new test fails when an endpoint lacks a ledger entry.
- **Holders test rewritten** for the gated path: unlisted symbols go through Blockscout search, never GeckoTerminal.
- **Verified:** unit tests 852/852 and `tsc --noEmit` clean, from a clean `dist-test`. Not deployed.
- **Behaviour on the next deploy:**
  - `/stock-price`, `/headlines` and `/news-search` refuse everything;
  - `/ip-geolocate` answers reserved ranges only;
  - `/financial` answers SEC figures only;
  - `/event-outcome` searches Polymarket only;
  - unlisted holder symbols are likely `unknown` from Vercel.

  The release gates still expect the old answers: update them first (TASKS).
- **Branch `claude/licensed-sources` deleted** after the merge; it is in the 2026-10-29 bundle. Its worktree
  `winners-github-repo-88c231` (idle session "Winner's GitHub repo") is detached.

## 2026-10-29 ~17:30 UTC (23:00 IST): branches merged and pruned (licensed-sources merged since, above)

Owner: "merge or fix branches as well so things dont get complicated. remove useless branches"

- **Backup first:** `C:\Users\hyada\telegraph-backups\branches-2026-10-29.bundle` (`--all`, verified; every one of
  the 18 refs in `refs-2026-10-29.txt` is in it at its old commit). Restore a branch with
  `git fetch <bundle> refs/heads/<name>:refs/heads/<name>`.
- **Merged into `codex/rank1-14-intents`:**
  - `main` (`b5bc712`): 63 scheduled score commits plus c90e4b9. The tree is unchanged; this branch already had
    `uptime.yml` byte for byte, and its academic deploy check supersedes main's.
  - `claude/miner-s2-conformance` (`db17364`): the G200 RESEARCH_QUERY qualifier fix. **Not deployed.**
  - `claude/wasm-track-2-quality-e21db3` (`0684fa1`): comparators, pair generators, adapter recipe, `SIGN_S2.md`.
    The track2 ledgers keep G28–G32 under the V2 entry and G33; Season I log dropped.
- **Verified:** unit tests 822/822 (was 816; +6 qualifier tests) and `tsc --noEmit` clean, on `0684fa1` in worktree
  `gallant-allen-3589e4`. Not run on Vercel; nothing deployed.
- **Deleted, all contained in codex or patch-equivalent:**
  - `claude/g208-intent-swap`, `claude/miner-s2-conformance`, `claude/wasm-track-2-quality-e21db3`,
    `claude/miner-s2-improve`;
  - the five branches parked at c90e4b9 (`morse-repair-dbb423`, `miner-improvements-0de1a5`,
    `project-improvement-strategy-5ff8d8`, `winners-github-repo-88c231`, `youthful-nightingale-1c5936`).
  - Their idle sessions' clean worktrees were **detached, not removed**: project-improvement-strategy,
    morse-repair, youthful-nightingale and wasm-track-2-quality. Archiving those sessions removes the folders.
- **Kept:**
  - `claude/licensed-sources` (owner decision, TASKS);
  - `claude/hackathon-rules-docs-update-0eb075` (the live session's worktree);
  - `claude/gallant-allen-3589e4` (this session's worktree).
  - Local `main` was fast-forwarded to codex. **origin/main is untouched:** updating it needs a PR and the owner's
    yes.
- **licensed-sources, trial merge then aborted:** 5 conflicts, 3 in code. Each side added something the other
  lacks:
  - `handler.ts`: receipts against the `licensing` field;
  - `currency.ts`: the 10-minute ECB hold against the Frankfurter fallback;
  - `geo.ts`: `noteRead` against `permitted`.

  Merging it makes `/stock-price`, `/headlines` and `/news-search` refuse every request. It bars GeckoTerminal,
  which `/token-holders` still falls back to, as well as ip-api, ipwho.is, IPinfo, Yahoo, Nasdaq, CoinGecko,
  Google News and Manifold.
- **Not done, owner's call:**
  - delete remote `origin/codex/livecert-manifest-19` (Season I);
  - remove the 3 detached deploy worktrees in `C:\Users\hyada\tg-deploy\` (check node_modules links first);
  - archive the idle sessions above.

## 2026-10-29 ~17:00 UTC (22:30 IST): Season II rules re-read; V2 docs moved to anjoman.ai; docs updated

Owner: "new hackathon has appeared. update the rules what is required. https://anjoman.ai/ new website as well.
update all the documentation. remove non useful things"

- **Branch `claude/hackathon-rules-docs-update-0eb075`**, moved to `codex/rank1-14-intents` @ `af568e1` before any edit.
  `main` was 223 commits behind, and this branch had no commits of its own. Docs only, no code. Committed as
  `62e4e9c` and fast-forwarded onto `codex/rank1-14-intents` on the owner's yes. Not pushed: 14 commits ahead
  of origin. Not deployed, and there is nothing to deploy.
- **The rules changed (read 2026-10-29, `RULES_SEASON2.md`):**
  - the final deadline is **Dec 1 23:59 UTC** for every track (no longer Dec 20);
  - judging runs Dec 2–8, with provisional results from Dec 9;
  - prizes: $7,000 main, plus $3,000 for separate December challenges with their own rules;
  - /judging returns 404, and the pages agree, so G203 is closed;
  - starting early is allowed; event evidence must come from the event period.
- **New site:** anjoman.ai is Telegraph's consumer front end and the new home of the V2 docs (also at
  docs.telegraphprotocol.com). Its dashboard needs the owner's sign-in.
- **V2 facts that touch us:**
  - intents are families, so register `X_SUFFIX` / `X_GENERAL`, never a prefix;
  - spot checks run about hourly per intent;
  - evaluators: float WASM adapters only, `registerWasm(..., prefix, ..., runnableUrl)`.
- **Registration 4829:** `active` on V2 with 36 suffixed intents. All 36 families are on the site's 134-intent
  catalogue (G208 closed). Its `registered_at` reads 2026-10-25 00:48 UTC (G220).
- **New gaps:** G218 prize-payment terms unpublished; G219 USDC vs MACHINA wording; G220 grace period after
  the import.
- **Removed:** superseded MEMORY entries for 2026-10-14 → 2026-10-25 17:30 and 2026-10-26 10:50/12:30 (their
  facts are in GAPS; `git log -p -- MEMORY.md`); done and past-dated TASKS items.
- **Next, the owner's:**
  - register before Nov 1 00:00 UTC (05:30 IST);
  - read the payment terms;
  - send the two WINNING.md §8 questions;
  - push;
  - deploy G217.

## 2026-10-27 ~18:45 UTC (28-10 00:15 IST): CURRENT — G217 holder fixes COMMITTED; not deployed, not pushed

Owner: "Yes: change the outage verdict to unknown and make /token-holders use KNOWN_TOKENS before GeckoTerminal,
with tests, committed locally. Don't deploy yet."

- **Done:**
  - Holder-count outages answer `unknown`, not `not_found`. A partial outage with no chain named does too, and
    names the chains that did not answer.
  - `/token-holders` reads `KNOWN_TOKENS` first. The table moved to `src/known-tokens.ts`, shared with
    `/token-supply`.
- **Verified:**
  - Unit tests 816/816.
  - Local build against live upstreams: `evidence/g217-holder-sources-2026-10-27/local-probes.json`.
  - The gate's outage check (`upstream_unavailable` plus the "index outage" sentence) still holds.
- **Not verified:** on Vercel. No deploy, by instruction.
- **Next:**
  - Owner: deploy on a yes; use the release-miner skill, preview first.
  - Owner: the Blockscout Pro key (TASKS Owner).
  - Owner: push `codex/rank1-14-intents`.

## 2026-10-27 ~15:45 UTC (21:15 IST): G217 investigated; no code changed

Owner: "Investigate G217 … propose a second holder-count source with measured agreement before changing anything."

- **From Vercel's egress:** Blockscout's Base, Arbitrum and Polygon hosts return 403; Ethereum and Optimism return
  200. Read from production receipts.
- **Candidates measured on 26 tokens:**
  - GeckoTerminal is fast to reach but unreliable and disagrees (−9% to +20%);
  - Ethplorer's freekey is for development only;
  - Routescan was already ruled out.
- **Recommended:** a free Blockscout Pro API key, which keeps the same index on all chains. The owner creates it.
- **Two small fixes proposed and not made:**
  - the outage verdict `not_found` should be `unknown`;
  - `/token-holders` should use `KNOWN_TOKENS` before GeckoTerminal.
- Evidence: `track1-miner/docs/evidence/g217-holder-sources-2026-10-27/`; GAPS G217.

## 2026-10-27 ~14:55 UTC (20:25 IST): CURRENT — G213 release LIVE on production; not pushed, not registered

- **Owner's yes, 2026-10-27:** "deploy codex/rank1-14-intents at 4af4ebd (preview first, then production), run the
  gates and re-measure token-supply latency. Don't push or sign."
- **Production:** `miner-6kvt9zv2p` (`4af4ebd`). Rollback target `miner-9ozpb4kgh`.
- **Gates at baseline:**
  - unit + live PASS;
  - intent answers 39/40 (the IP Tokyo pin);
  - upstream health: the two known failures;
  - registration 4829 active.

  Evidence: `track1-miner/docs/evidence/release-2026-10-27-g213/`.
- **Token supply on production:**
  - table symbols 8/8 within 500 ms (83–277 ms);
  - addresses 137–162 ms;
  - symbols outside the table 657–731 ms.
- **New: G217.** TOKEN_HOLDER_COUNT (registered) answers "index did not answer" on production, because Blockscout is
  not answering. This predates the release.
- **Next, all the owner's:**
  1. push;
  2. send the Ahmed message and the G32 report;
  3. the G205 choice;
  4. publishing the named field results;
  5. whether to fix G217 with a second holder index.

## 2026-10-27 ~14:10 UTC (19:40 IST): the 2026-10-26 recommendations worked through (superseded above)

Owner: "complete this work", referring to the recommendations of 2026-10-26: the six ideas and the tools.

**Status of each:**

1. **G208 intent swap.** Live since 2026-10-26. G213 is fixed in code (`11f6306`):
   - a verified table of 21 token contracts;
   - the Polygon `polygon_pos_` resolver bug, which also affected `/token-holders`.

   **Not deployed.** Push, console validation (G212) and signing (G206) are the owner's.
2. **Validators as the uptime record: not possible for free (G205).**
   - Vercel logs keep about 1 h, and only invocations that printed something.
   - Vercel metrics need Observability Plus, a paid Pro feature.
   - Devnode and the explorer publish no liveness history.

   The owner picks: the uptime workflow, Vercel Pro, or a store.
3. **Replayable receipts: `tools/verify-answer.mjs`** (`2cb4049`, hardened `7f60ec2`).
   - It runs on the caller's machine, not as a miner endpoint, to avoid SSRF.
   - Documented in `docs/INTEGRATE_LIVECERT.md`.
   - `/vuln-triage` receipts now name a KEV catalog held in memory.
4. **Field check: `tools/field-check.py`** (`d8fa299`). Evidence: `field-check-2026-10-27/`.
   - Service endpoints that pass: DNS 3/5, token supply 2/5, triage 2/9. LiveCert passes all three.
   - Raw public APIs registered as endpoints pass 1 of 22.
   - **Named results stay outside the repo** (`C:\Users\hyada\tg-deploy\field-2026-10-27\`). Publishing them is the
     owner's call.
5. **MCP server: closed.** Telegraph already ships Telegraph-MCP (TELEGRAPH_FACTS 2026-10-27).
6. **G32 report: drafted in WINNING.md §9, not sent.** It asks whether v2 reuses the converter.

**Tools:**
- `.claude/skills/release-miner/SKILL.md` is written.
- Vercel MCP: used for the metrics check above.
- Playwright demo video: **not started.** It is low urgency; submission is in December.

**Commits on `claude/g208-intent-swap`:** `11f6306`, `2cb4049`, `7f60ec2`, `d8fa299`, plus this record. The main
branch is fast-forwarded and **not pushed**.

**Next, all the owner's:**
- a yes to deploy `11f6306`+ (G213 and the Polygon fix) and measure;
- a yes to push;
- send the Ahmed message (G206, G208, G212) and the G32 report;
- the G205 choice;
- whether to publish the named field results.

## 2026-10-26 ~05:20 UTC (10:50 IST): CURRENT — item 2, answer receipts, DEPLOYED and pushed

- Production `miner-mz9gh2afy`, rollback `miner-l5taibkkl`.
- All 36 intents carry receipts on production, with no secret-like values.
- Gates are at baseline after `no-regression.mjs` learned to ignore `receipt`.
- Evidence: `track1-miner/docs/evidence/release-2026-10-26-receipts/`.
- **Owner said "keep working, give prompt to yourself"** (2026-10-26). Self-set order:
  1. item 3, calibrated confidence, from labelled answers;
  2. item 5, nightly self-check;
  3. item 6, OpenAPI spec.

  Build, test and commit each locally. Pause only for deploy, push, keys or `updateMiner`.

- **The confidence rule and OpenAPI are DEPLOYED and pushed (2026-10-26 ~05:47 UTC):** production `miner-ccy6bq1ee`,
  rollback `miner-mz9gh2afy`, gates at baseline. Evidence: `release-2026-10-26-confidence/`.
- **Item 3, confidence (now deployed):**
  - On the Oct 21 audit, answers at confidence 1.0 were right only 72% of the time; Brier score 0.210.
  - Confidence is a fixed level per intent, not a per-answer judgement.
  - Too few labels to re-tune per intent. One rule was written down instead: 1.0 only for a direct
    authoritative read. Under it, translation is now 0.9 and academic topic search 0.8.
  - Evidence: `track1-miner/docs/evidence/calibration-2026-10-26/`.
  - The real fix is a fresh graded set of at least 10 per intent on current production.

- **Item 5, nightly self-check: blocked on the owner.** A scheduled job against production is like the `uptime`
  workflow the owner turned off (G205).
- **Item 6, OpenAPI (committed, not deployed; it is a repo doc):** `docs/openapi.json`, 35 operations, generated by
  `tools/openapi.py`.
  - Every field production returns is documented: 0 undocumented on the re-check.
  - Found G211: the registered `output_schema` omits 101 returned fields.

- **G200, RESEARCH_QUERY (committed, NOT deployed):**
  - `src/research.ts` now searches the name together with the question's qualifier.
  - It requires the qualifier in a trial's title or conditions (with a small clinical-synonym map).
  - Drug codes go first; bare company words are dropped.
  - Concept papers need every word.
  - A state's political decision is declined.
  - Replay of 100 questions (`tools/research-replay.mjs`): the 3 audit fails are fixed, 47 leads changed
    (read by hand), 4 still weak. Unit tests 804/804.

### Earlier the same morning


- **Every answer now ends with a `receipt`:** the upstream requests actually made, with credentials redacted, the
  status, the time, `from_cache` and the deployment. Code: `src/receipt.ts`.
  - `fetch` is wrapped once and each request runs in its own AsyncLocalStorage context.
  - TLS, DNS, the redirect walk and Quad9's HTTP/2 queries are noted by their modules.
- **Checked locally on all 36 intents:** every one has a receipt and none holds a secret-like value.
  Unit tests 798/798. Evidence: `track1-miner/docs/evidence/receipts-2026-10-26/`. The receipt is documented in
  `docs/INTEGRATE_LIVECERT.md`.
- **Next:**
  1. The owner's yes to land and deploy, then re-run `tools/receipt-check.mjs` against production.
  2. Item 3, calibrated confidence.

## 2026-10-25 ~18:00 UTC (23:30 IST): Ahmed answered — miners carry over to v2; listed-intents question pending

- **Registration 4829 carries over to v2** with no re-registration (TELEGRAPH_FACTS item 10).
- **On unlisted intents (G208), Ahmed said "let us check".** Pending; nothing is re-registered until the answer.
- **G206 (does an update restart the grace period?) is still unanswered.**

## Durable facts (true across sessions; re-verify protocol facts against live docs)

**Identity.**
- Hackathon signup: `harsh.2024a@vitstudent.ac.in`. X: `@hyadav42774`.
- Miner, fee and Track 2 script wallet: `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. Wallet operations
  are the owner's: Claude drafts and validates, the owner signs.
- Chain: Base Sepolia testnet, Diamond `0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8` (V2 docs, 2026-10-27).
  Season II rules: `RULES_SEASON2.md` (re-read 2026-10-29). Protocol docs: anjoman.ai/docs.

**Registration.**
- Look up by registrationId, never by slug. The catalog's `id` is not a registrationId either
  (`/api/miners/4433` is someone else's miner).
- Sandbox-validate at integrate.telegraphprotocol.com first; a rejection releases the slug.
- The YAML is served from a commit-pinned raw GitHub URL, so push before signing. The registered hash is
  the SHA-256 of the hosted bytes.

**Deploy (read GAPS G70).**
- Only from a clean `git worktree` at the release commit: `vercel deploy` uploads the working directory.
- Preview first, then `--prod`. After a `vercel rollback` the alias is pinned and `--prod` does not move it:
  run `vercel promote <url>`. Then `preflight.mjs`.
- Deploy new code only after a registration change it depends on is mined.

**Working here.**
- The tree is shared between sessions: commit with explicit pathspecs, never `git add -A`.
- Git Bash: run `manifest-diff.mjs` with `MSYS_NO_PATHCONV=1`; use `curl -4` (IPv6 hangs); files are CRLF.
- `tools/watch.mjs`: `--once` goes last. The explorer feed labels miners by display name; use
  `routing.subnet_id`. `git worktree remove` can hit a Windows lock; run `git worktree prune` after.

**Elsewhere.** Track 2 (WASM scorer): `track2/`. Track 3 app Morse: `../telegraph-morse`, its own repo.
The Midnight / NightSeal hackathon is a different, unrelated project.

**Older history** (Season I sessions, Aug 26 – Oct 13) was cut on 2026-10-17, and Oct 14 – Oct 25 was cut on
2026-10-29, to keep this file short: `git log -p -- MEMORY.md`.
