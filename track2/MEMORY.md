# MEMORY.md — Track 2 session continuity

**Read this first every Track 2 session.** Update at session end.

The Season I log (Aug 27–31: rank_answer slots, calibration, registration 1882) was cut on 2026-10-29. Its modules
and files were deleted on 2026-10-18/23 and its links no longer resolved: `git log -p -- track2/MEMORY.md`.
`claude/wasm-track-2-quality-e21db3` was merged into `codex/rank1-14-intents` on 2026-10-29.

---

## CURRENT — 2026-11-26 ~03:55 UTC (09:25 IST) · PC WAS SHUT DOWN NOV 25; LANES REQUEUED IN ORDER; #245/#246 REJECTED

- **Cause of the 8-hour loss:** a Start-menu shutdown at 2026-11-25 19:40:04 UTC (01:10 IST): event 1074 (Explorer, on
  behalf of the user), then Winlogon log-off. Fast Startup logs it as sleep (event 42, caller winlogon). Lid closed
  again 02:59-03:26 UTC. Same pattern on Nov 24 (16:35, 16:51 UTC). **The trainer has no resume: a shutdown restarts
  the running lane from zero** (G57).
- **`train_queue.py`:** with `--detach` its keep-awake ended at once (fixed: it stays for `--awake-hours`).
- **Lanes requeued 03:44 UTC in a fixed order** on one sequential runner (`train_queue.py --awake-hours 72`, pid
  32228, WMI): es_v2 → cm_v4 → fc_v1 → qa_v4 → sca_v1 → vt_v2. es_v2 holds GPU.lock (started 03:44:20). Estimates at
  ~12 s/step: es_v2 ~7.5 h (ends ~11:15 UTC), cm_v4 ~17 h unless early stopping, then fc ~11 h, qa ~10 h, sca ~7.5 h,
  vt ~7.5 h. If the runner dies, the running lane survives but later lanes do not start: relaunch with the same jobs.
  A no-job keep-awake runner (pid 17488) also holds the PC awake until ~03:30 UTC Nov 27.
- **Registry 03:45 UTC:** #245 and #246 rejected at 00:11 UTC ("remote executor unreachable"). #210 still canonical.
  TEXT_SUMMARIZATION, CONTENT_MODERATION, EMAIL_SECURITY and FACT_CHECK have no champion; `0x8b2247` failed CM 10/15,
  FC 7/15 and ES 57.1% overnight (#247-#249).
- **GENERIC baseline for #210 running** (Idle, 1 worker, ~3 h): `tg-eval/runs-v2/coa_v1/measure-generic.json` for
  GENERIC #900005 (`dc4f8bd5…`, registry-matched) on coa_v1 test (400) + probe (278). Costs cm_v4 ~4%.
- **Written and committed:** SUBMISSION_S2.md rewritten around #210; post 2 draft (OUTREACH_S2.md); READMEs for
  smart_contract_audit and sentiment_analysis; text_summarization README with its node-runtime evidence files.
- **Branch:** `PR/evaluators-status-2026-11-25` (this worktree, `evaluators-plan-2026-11-23-19fbe3`) fast-forwards
  `PR/evaluators-plan-2026-11-23`; the remote branch is pushed to the same head. Worktree `86db5c` needs
  `git merge --ff-only origin/PR/evaluators-plan-2026-11-23`. `main` is 164 commits apart: a merge PR is owed.
- **Next:** add the GENERIC result to SUBMISSION_S2.md §3 and the COA README (copy the file to its evidence folder);
  measure es_v2 when it ends (node runtime + `tg-eval/pairs/public15/es.jsonl`); a TS v1e window between lanes if the
  owner wants it; video and post 3 ~Nov 30; re-read the live rules before submitting.

## 2026-11-25 ~19:40 UTC (Nov 26 01:10 IST) · TRAINING RESUMED; NO EXECUTOR RUNNING; #245 + #246 WILL FAIL

- **Owner, ~19:30 UTC:** #246 "shows inside my same account, so it's okay"; "start training for more evaluators".
  The wallet question is closed: #246's author is `0xdad201…a39e`.
- **Done 19:29-19:31 UTC:** v1e executor stopped (RAM for training); `EXECUTOR.lock` deleted; es_v2 took GPU.lock at
  19:30:50 and trains (step 10/750, no errors). The other five lanes wait on GPU.lock.
- **#245 (v1c) and #246 (v1d) both point at dead quick tunnels** and will be rejected as unreachable. v1e (hosted,
  Stage 1 PASS, sign block in SIGN_S2.md) needs a fresh executor and a new URL before anyone signs it:
  `launch.py --workers 4 --package TEXT_SUMMARIZATION=…/runs-v2/ts_v1e/…`, set AboveNormal, check, then re-lock.
- **Speed (corrected 2026-11-26):** the es_v1 comparison was not like for like (shorter texts). Earlier lanes ran at
  6-12 s/step; cm_v4 runs at 12.2 s/step with the GPU unshared.

## 2026-11-25 ~19:30 UTC (Nov 26 01:00 IST) · v1d SUBMITTED FROM THE WRONG WALLET; v1e READY TO SIGN

- **Owner, ~19:20 UTC:** v1d was submitted from another wallet on the same email, not `0xdAd2…A39e`. BUT `/api/wasm` at 19:31 shows v1d as #246 under author `0xdad201…a39e`, registered 19:26:26, one minute after Claude stopped the v1d executor, so #246 is dead too. Its address
  and tx hash are not yet known; at 19:24 UTC `/api/wasm` showed no v1d registration from any wallet. **Identity
  incident (AGENTS.md):** that registration must be deregistered from the wallet that made it.
- **v1e** (max_tokens 508, keccak `0x89974f9c…`, hosted at `a644c0f`, branch `hosting/ts-v1d`): executor
  `tg-eval/executor-ts6.out`, `dividend-versus-notes-mothers…`. The v1d executor is stopped. Sign block: SIGN_S2.md top.
- **#245 is still pending** under the right wallet with its dead v1c URL; it still needs deregistering.
- **Load:** a training job from the owner's other entry folder runs on this PC. v1e workers are 0.7-1.1 GB resident
  of 3.8 GB and the 30-text batch took 73.0 s (58.9 s at 13:24 with nothing else running). Not touched; the owner's
  call.

## 2026-11-25 ~19:15 UTC (Nov 26 00:45 IST) · #245 (v1c) SIGNED ON A DEAD URL; v1d READY TO SIGN

- **#245 = v1c**, signed 18:09 UTC, stage `awaiting_compatible_material`. Its tunnel had died at 15:46:49 UTC: a
  network drop (cloudflared DNS timeout), then "Unauthorized: Tunnel not found" on every reconnect. The worker
  processes kept running, so only a probe of the PUBLIC URL shows this. Nothing probed it between 13:27 and 19:05.
- **Rule:** probe the public runnable URL right before handing sign values over and every minute until the
  registration is decided; a quick tunnel does not survive a network blip.
- **v1d** (max_tokens 509, keccak `0xff635217…`, hosted at `a89b4b4` on telegraph-factscore branch `hosting/ts-v1d`):
  executor `tg-eval/executor-ts5.out`, port 18390, `wholesale-demographic-coast-but…`. Owner: deregister #245, register
  v1d (SIGN_S2.md top). Stage 1 needs `LIVE_CLASS_INTENTS=TEXT_SUMMARIZATION` for `adapterbuild-live.exe`.
- **Restart trap:** killing run_local's pwsh does not kill its adapterexec workers. The 13:20 v1c workers held
  18391-18394, so the first v1d relaunch at 19:09 fronted v1c workers. Kill the `adapterexec` processes by
  command line and check the ports are free before relaunching.
- EXECUTOR.lock stays; the six lanes still wait on it. Nothing else is ready to sign.

## 2026-11-25 ~13:30 UTC (19:00 IST) · PC CRASHED NOV 24; v1c EXECUTOR RESTARTED; SIX LANES RELAUNCHED

- **The PC crashed at 2026-11-24 15:39 UTC** (System event 41, unclean) and was then powered off from the Start menu
  at 16:35 and 16:51 UTC (event 1074, user account). No update restart is pending. Every executor, tunnel and
  training lane died. Nothing trained from Nov 24 06:16 to Nov 25 13:25 UTC: the lanes waited on EXECUTOR.lock, then
  died with the PC.
- **v1c was never registered** (no `0x1c22378e…` in `/api/wasm`, 13:18 UTC). Its executor was restarted through
  `executor/launch.py --workers 4`, port 18390, output `tg-eval/executor-ts4.out`:
  `https://humanities-jerusalem-vote-inspiration.trycloudflare.com/TEXT_SUMMARIZATION`.
  - Workers set to AboveNormal (3.8 GB private each; 4.9 GB RAM free with nothing else running).
  - `check_executor.py`: PASS, public = loopback, item 0 `0x3fbc8682`. The node's 30-text batch replayed in 58.9 s.
  - A new quick-tunnel name is NXDOMAIN for about 30 s after cloudflared registers; this machine's resolver then
    cached the miss until `ipconfig /flushdns`. Not a tunnel fault.
- **EXECUTOR.lock stays** until v1c is decided. TEXT_SUMMARIZATION still has no champion (#208, #217, #222, #228
  and #173 all rejected for executor faults).
- **Lanes relaunched at 13:25 UTC** (`train_queue.py --detach --awake-hours 12`, WMI), all waiting on the lock. The
  exact job strings, so the next relaunch does not have to guess:

  | Job | Source of the hyperparameters |
  |---|---|
  | `EMAIL_SECURITY:es_v2:es_v2` | queue defaults (rank 8, alpha 32, 3 epochs, lr 1e-4), as es_v1 |
  | `CONTENT_MODERATION:cm_v4:cm_v4:8:32:4:0.0002` | epochs and lr from the 03:40 block; rank is the default |
  | `QUESTION_ANSWERING:qa_v4:qa_v4:16:32:4:0.0003` | qa_v4's own train.log |
  | `VULNERABILITY_TRIAGE:vt_v2:vt_v1:16:32:4:0.0003` | the 03:15 block |
  | `SMART_CONTRACT_AUDIT:sca_v1:sca_v1` | queue defaults; not recorded before |
  | `FACT_CHECK:fc_v1:fact_check_v1` | queue defaults; not recorded before |

- **#210 stays canonical with a dead runnable URL** since 2026-11-23 22:50: #219 and #234 (registered 2026-11-24
  16:59, after the crash) both lost to it. Observed, not a documented guarantee (G53).
- **No finished adapter to measure:** sa_v1 is barred by #216 (100%); cm_v3 failed the public15 screen (10/15).
- **LiveCert 6126:** active, YAML `f47f018`. Epoch 54 (44 intents): 7 rank-1 (two are 0.000 ties: CROSS_CHAIN_STATE,
  FINANCIAL_DATA), 22 top-3, 9 zeros (CROSS_CHAIN_STATE, FINANCIAL_DATA, IP_GEOLOCATION, GAS_PRICE,
  CRYPTO_TRANSFER_VERIFY, RESEARCH_SYNTHESIS, FRAUD_DETECTION, TOKEN_TOTAL_SUPPLY, EVENT_OUTCOME). Epochs 52/53: 5/7
  rank-1, 16/20 top-3, 12/8 zeros.
- **Next:** owner signs v1c (SIGN_S2.md top) → watch for the check (~2 h after the first boundary after
  registration) → when decided, delete `tg-eval/EXECUTOR.lock` → measure each lane as it finishes (node runtime +
  public15 screen where one exists).

## 2026-11-24 ~06:25 UTC (11:55 IST) · TS v1c READY TO SIGN; TRAINING PAUSED FOR ITS WINDOW

- **#222 was rejected with Cloudflare 524 three times.** Its 30-text batches took 164-263 s because the workers (3.4 GB
  private each) were paged out under training load. **Rule:** while a registration awaits its check, training stops
  (`tg-eval/EXECUTOR.lock`; `train_package.ps1` waits on it), and the executor runs 4 workers at AboveNormal.
  Remove the lock once the registration is decided.
- **ts_v1c** (max_tokens 510, keccak `0x1c22378e…`, hosted at `13a7900a`): its executor is on port 18390
  (`kelly-their-deleted-mechanical…`). The node's own 30-text batch replays in 58.2 s.
- **SENTIMENT_ANALYSIS now has a 100% champion (#216)**, which cannot be beaten. sa_v1 (kit 95.75%) is not to be
  registered.
- The training lanes (fc, qa_v4, vt_v2, sca, es_v2, cm_v4) are relaunched and wait on EXECUTOR.lock. qa_v4 restarts
  from scratch.

## 2026-11-24 ~03:40 UTC (09:10 IST) · #210 DEFENDED; #221 REJECTED 8/15; es_v2 QUEUED

- **cm_v3:** kit 81%, Stage 1 PASS (`0x80972315…`). The offline pool screen gives **10/15**, against v2's 6 and the
  node's floor of 11.
  - The verdict-only comments are now right.
  - Still missed: nuanced requests (an academic thesis on propaganda, health misinformation, a home address).
  - Not offered for signing: this family's probe was spent on #218.
  - **cm_v4** is queued: 5,000 pairs, 60% requests, 4 epochs, lr 2e-4.

- **#219 (Truvian's challenger) rejected:** "win rate 86.21% did not beat the incumbent (registration 210)". Our #210
  scored about 86% on that round's sample, and keeps the seat.
- **#221 EMAIL_SECURITY rejected at the remote check, 8/15.** The decoded public pairs hold three kinds:
  1. posture reports with no evidence in the prompt; the posture must follow from the answer's own SPF and DMARC
     fields;
  2. supplied DoH captures worded with a reference time and source URL;
  3. phishing scenarios (brand display name against a lookalike sender).
- **es_v2** ([v2_cases.py](adapter/email_security/v2_cases.py)) covers all three, 50/50 with v1. The kit gate
  PASSES (leak 0.8%, bag-of-words probe 58.8%). It is queued (detached).
- **Offline screen file:** `tg-eval/pairs/public15/es.jsonl`.
- **Executor:** #221's (port 18290) can be stopped now that #221 is decided. #222's must stay up.

## 2026-11-24 ~03:15 UTC (08:45 IST) · #221 + #222 AWAITING; SIX LANES QUEUED ON GPU.lock

- **#222 TEXT_SUMMARIZATION v1b** (`0x51b0f844…`) was registered by the owner at 01:39 UTC. Its executor runs through
  `executor/launch.py` (port 18390, `why-detroit-tucson-locally…`); its run_local pwsh (29928) holds the PC
  keep-awake.
- **The train_queue.py runners died** (cause unknown; no error log), but each lane's pwsh survived in its own process
  group.
  - Every job is now started with `train_queue.py --detach`, one detached pwsh per lane, ordered by GPU.lock.
  - Jobs: cm_v3 (training), sa_v1, fc_v1, qa_v4, vt_v2 (vt_v1 data, rank 16, lr 3e-4, 4 epochs), sca_v1 (new:
    SMART_CONTRACT_AUDIT challenger, generated contracts).
- **Owner, 2026-11-24:** "Train for 8, 9, 10 hours. It's okay."

## 2026-11-24 ~01:30 UTC (07:00 IST) · #217 LOST TO A DEAD EXECUTOR; vt_v1 FAILED; USAGE LIMIT HIT

- **#217 TEXT_SUMMARIZATION was rejected:** "gave up after 3 failed evaluation attempts: remote executor unreachable".
  It had passed the public check 15/15 at 22:16, but **the node calls the executor again later**, and that executor
  died at the 22:50 session restart.
  - **Rule:** keep every executor up until its registration is canonical or rejected.
  - **Next:** re-export ts_v1 at max_tokens 511 (a new hash; same-hash re-registration is refused, bounties #213).
    Run Stage 1, host it, start a durable executor, then the owner registers it.
- **#221 EMAIL_SECURITY:** the executor was alive at 01:28 UTC (port 18290, `rocks-territory-light-zen…`). **Do not
  stop it.**
- **vt_v1 FAILED the kit gate at 50%:** chance; the loss never moved. Ordering numbers is not learned at rank 8 /
  1e-4. Rethink before retrying: it needs explicit score comparisons in the text.
- **Queue:** runner 1 continues with sa_v1, fc_v1, qa_v4; runner 2 has cm_v3. Check each `runs-v2/<run>/chain.log`.
- **To make executors durable:** start them like `train_queue.py` does, in their own hidden console and new process
  group (`CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP`), launched through WMI. Not yet done for run_local.

## 2026-11-23 ~23:55 UTC (05:25 IST Nov 24) · #221 EMAIL v1b REGISTERED; QUEUE ON train_queue.py

- **#221 EMAIL_SECURITY (v1b, `0x35de4143…`)** was registered at 23:11 UTC with a live URL; #220 is deactivated. Its
  executor is up (`executor-es3.out`); its pwsh supervisor died to the Ctrl+C, but the workers, router and tunnel
  still serve.
- **Post 1 (four-post thread) was posted by the owner on 2026-11-23.** The URL is not yet recorded; ask for it.
- **The queue died a second time:** a console Ctrl+C hit every console-attached process at about 23:20 UTC.
  - It now runs as `adapter/train_queue.py`, started by WMI. It ignores Ctrl+C and starts each lane in its own hidden
    console and new process group (a no-console pwsh exits silently). It keeps the PC awake for 12 h.
  - Runner 1: vt_v1, then sa_v1, fc_v1 and qa_v4 (rank 16, lr 3e-4, 4 epochs, contexts ≤ 900 characters). Runner 2:
    cm_v3.
- **qa_v3 FAILED the kit gate at 56.25%:** the loss barely moved. qa_v4 is the retry.
- **cm_v3** ([generate_pairs_v3.py](adapter/content_moderation/generate_pairs_v3.py)): Aegis 2.0 requests
  (Allow/Block), verdict-only JSON, and categories. The kit gate PASSES.
- **Offline public-pair check:** `tg-eval/pairs/public15/{cm,ts,coa}.jsonl`, rebuilt from the decoded captures (first
  answer = better). It reproduces the node to within 1 pair: cm_v2 6/15 against the node's 5/15, coa_v1 15/15. Use
  it only to screen a version before signing; never train on it.

## 2026-11-23 ~23:10 UTC (04:40 IST Nov 24) · #217 PASSED 15/15; #218 REJECTED; #220 NEEDS REPLACING

- **The session restarted about 22:50 UTC and killed every executor and tunnel** (no reboot). The URLs of #210, #217 and
  #220 are dead.
  - **Executors now start detached:** WMI `Win32_Process.Create` with `cmd /c pwsh -File run_local.ps1 …`; WMI cannot
    launch the Store `pwsh` alias directly. They survive session restarts.
- **#217 TEXT_SUMMARIZATION:** the remote check was at 22:16 UTC, and the adapter ordered all 15 public pairs (118th
  bills, NASA, one Wikipedia). It now awaits the hidden round, which the node runs itself.
- **#218 CONTENT_MODERATION: rejected, 5/15.** The pool holds:
  - Allow/Block policy questions ("Can I post someone's address?");
  - verdict-only JSON `{"verdict","text","source"}`, where cm_v2 preferred "Safe" even on abuse.

  A v3 needs verdict-only answers and a licensed safe/unsafe prompt set (e.g. Aegis, CC BY 4.0; check). Score it
  offline on the captured 15 pairs, without training on them.
- **#219:** Truvian challenges our #210 CONTRACT_OBLIGATION_AUDIT seat (registered 22:12 UTC).
- **#220 EMAIL_SECURITY** (owner, 23:04 UTC) points at a dead URL. Its replacement is es_v1b: re-exported at max_tokens
  480, the same Stage 1 bits, keccak `0x35de4143…`, hosted at `03693028`, executor at
  `rocks-territory-light-zen…`. Same-hash re-registration is refused (bounties #213). The owner deregisters #220 and
  registers v1b (SIGN_S2.md top).

## 2026-11-23 ~21:05 UTC (02:35 IST Nov 24) · 3 REGISTERED (#210 canonical, #217, #218); 5 MORE TRAINING

- **Owner, 2026-11-24:** "just build them". The ban on intents LiveCert serves is lifted on disclosure and
  score-down terms (ARCHITECTURE A7).
- **GPU queue** (each waits on GPU.lock; the order is whoever polls first):

  | Run | Family | Data | Kit gate |
  |---|---|---|---|
  | es_v1 | EMAIL_SECURITY | DoH JSON and headers | PASS |
  | vt_v1 | VULNERABILITY_TRIAGE | CVSS, KEV, exposure | PASS |
  | qa_v3 | QUESTION_ANSWERING | passage-grounded, SQuAD 2.0 train, CC BY-SA | PASS |
  | sa_v1 | SENTIMENT_ANALYSIS | amazon_polarity, Apache-2.0; challenger to #207 at 83.3%, needs ≥ 85.3% | PASS |
  | fc_v1 | FACT_CHECK | FEVER pairs from October | PASS (no probe set) |

- **LiveCert self-check** for qa, sa and fc (A7 condition 2):
  - 60 frozen queries each are in `tg-eval/captures/livecert-selfcheck-20261124/`; the capture with
    `--only livecert` is running.
  - Next: label LiveCert's answers against the `.truth.json` files, build pairs of right answer vs LiveCert's wrong
    answer, and measure each adapter on them before offering it for signing.
- **Memory:** 15.6 GB RAM. Run measurements only when an executor can be spared, and at Idle priority.

## 2026-11-23 ~20:25 UTC (01:55 IST Nov 24) · TS v1 + CM v2 READY TO SIGN; EMAIL + VULN LANES TRAINING

- **The owner signed both:**
  - **#217 TEXT_SUMMARIZATION** (ts_v1), at 20:17 UTC;
  - **#218 CONTENT_MODERATION** (cm_v2, a probe), at 20:24 UTC.
  - The hashes match `0x3f3ad908…` and `0x0e0014f3…`. Their executor is on port 18190 (URL in
    `tg-eval/executor-ts_cm.out`); keep it up.
  - Expected check: about 2 h after the 23:10 UTC epoch boundary.
  - A background watch (7 h) reports stage changes.
- **New lanes** (owner, 2026-11-23: "improve them and make more"). Comparators cannot be won; the node refuses them.
  - **EMAIL_SECURITY** (es_v1): DoH JSON and headers in the prompt; the kit gate PASSES at a bag-of-words probe of 64.6%,
    just under the 65% bar, after three fixes.
  - **VULNERABILITY_TRIAGE** (vt_v1): CVSS, KEV and exposure in the prompt; the kit gate PASSES with the probe at 49.7%.
  - Both families have no champion, and LiveCert serves neither. The pool forms come from bounties #119 and #89.
  - Training: es_v1 is on the GPU now; vt_v1 is queued.
- **ts_v2:** kit 99%. Its node measurement **failed with out of memory**: 15.6 GB of RAM, with 9 executor workers and GPU
  training running. **Do not run measure.py while both executors are up.** Measure ts_v2, es_v1 and vt_v1 once the
  executors can shrink.

## 2026-11-23 ~18:30 UTC (00:00 IST Nov 24) · #210 IS CANONICAL (first CONTRACT_OBLIGATION_AUDIT champion)

- **#210 CONTRACT_OBLIGATION_AUDIT v1: canonical at 18:18 UTC**, "82.76% on 29 pairs (floor 70%)". This is our first
  Season II evaluator seat. Evidence and the public-pair kinds are in the
  [lane README](adapter/contract_obligation_audit/README.md).
  - **Disclosed:** the pool also draws on CUAD.
  - The capture is at `tg-eval/executor-logs/20261123T150348Z/capture/` (outside the repo).
- **The executor still runs**, at the same URL. Whether the node calls the champion's runnable again is unknown (G55).
  Keep it up while the laptop is on. If it dies, the URL cannot be restored; record that, but do not re-register
  without the owner.
- **ts_v1 on 400 real-bill pairs:** 360/400 = 90.0% (Wilson 86.7–92.6; shorter-wins 60.25%). Weak kind: flipped
  duties, 63/98.
  - Hosted at `telegraph-factscore` `fe080f33` `season2/adapter/TEXT_SUMMARIZATION/v1/`; the keccak `0x3f3ad908…ead5`
    matches the URL.
  - Its own test and probe in the node runtime are measuring now; cm_v2 is next in the same chain.
- **cm_v2:** kit 84.75%, Stage 1 PASS; node runtime pending.
- **ts_v2:** training since 17:52 UTC.

## 2026-11-23 ~17:35 UTC (23:05 IST) · #210 REGISTERED (owner signed), CHECK EXPECTED 19–21 UTC

- **#210 CONTRACT_OBLIGATION_AUDIT v1 was registered by the owner at 15:36 UTC.** Every field matches the sign block.
  - It is `awaiting_seed_epoch`; expect the check around 19:00–21:00 UTC (G55).
  - Its executor is still running (`tg-eval/executor-coa_v1.out`, pid file beside it). The capture folder is in the
    logs path that file names.
  - **When the check lands:**
    1. decode the capture (`adapter/decode_capture.py`);
    2. record the kinds of pair the pool holds;
    3. score coa_v1 and coa_v2 offline on those texts;
    4. then stop the executor.
- **coa_v2 is not better** (G55): node runtime 76.75% test / 88.3% probe. Do not offer it for signing.
- **ts_v2 data:** 8,193 real short bills (CC0, 116th–117th Congress) plus synthetic; the kit gate passes. Queued behind
  cm_v2, which has been training since 16:20 UTC.
- **ts_v1 on 400 real-bill pairs:** measuring at Idle priority (`runs-v2/ts_v1/measure-bills.json`).
- **Comparators are retired by the node** (#199). The 422 question in ORGANISER_REPORT §1 is partly answered; update
  it before sending.

## 2026-11-23 ~15:10 UTC (20:40 IST) · COA v1 READY TO SIGN AS A PROBE; v2s TRAINING

- **coa_v1:**
  - Kit 82.25%. Node runtime: test 322/400 = 80.5%; probe (unseen table style) 249/278 = 89.6%.
  - Weak kinds: party swap 52/78 (all misses on test-only names); status 9/21; CUAD claim_absent 40/63, deny 12/21.
  - Evidence: `tg-eval/runs-v2/coa_v1/measure.json`.
  - Hosted at `telegraph-factscore` branch `season2-adapters-v3` commit `4298d6d`. The keccak `0xbf759737…60e8` matches
    the URL.
- **The probe rule was added to A7 on advice:** register below the bar once, as a disclosed information-buying
  attempt, only with capture on.
  - `fanout_exec.py --capture` and `decode_capture.py` were proved end to end at 14:14 UTC.
  - `run_local.ps1` keeps the PC from idle sleep while it runs.
- **The executor for coa_v1 is RUNNING detached** (pid in `tg-eval/executor-coa_v1.pid`, URL in
  `tg-eval/executor-coa_v1.out`); it was checked PASS at 15:04 UTC. The sign block is at the top of SIGN_S2.md.
  - Stop it only after `/api/wasm` shows the registration past the remote check, or when the owner declines.
- **Bonds are test USDC on the new Diamond** (G54). The budget is not a constraint.
- **GPU queue:**
  - ts_v1 is done: kit 100% (synthetic, meaningless), Stage 1 PASS, keccak `0x3f3ad908…ead5`. Not measured on real
    text.
  - coa_v2 is training: 4,500 pairs, ~600 generated names, status stated relative to the deadline, CUAD 45%.
  - cm_v2 is queued: Civil Comments + Wikipedia Talk, Safe/Flagged policy prompts.
  - cm_v1 was stopped at step 10 (superseded), and its lock removed.
- **Next:**
  1. when the owner signs, watch `/api/wasm` for the registration and decode the capture;
  2. measure coa_v2 and cm_v2;
  3. build the TEXT_SUMMARIZATION real-genre holdout (117th-Congress bills via govinfo, NASA releases).

## 2026-11-23 ~11:10 UTC (16:40 IST) · EXECUTOR BUILT; CONTRACT LANE DATA PASSES; TRAINING QUEUED

- **Owner, 2026-11-23:** "i am okay with the best option until it's free". The executor goes on a free Hugging Face
  Docker Space ([executor/](executor/README.md)).
  - Not yet created. It needs the owner's HF account under `hyadav42774@gmail.com` and a write token, saved as
    `HF_TOKEN` in `C:\Users\hyada\tg-eval\.env.local`.
  - The free tier sleeps after idle time, so the Space needs a keep-alive. This is unverified; add it once it exists.
  - **HF is not free for this (2026-11-23 11:25 UTC).** `POST /api/repos/create` (docker space) answered: "hosting Gradio
    and Docker Spaces on free cpu-basic requires a PRO subscription". Nothing was created. The owner said
    "until it's free", so the next free option is this laptop behind a stable tunnel URL; the owner chooses.
  - **The ngrok account on this machine is not usable (re-checked 11:30 UTC).** Its one free domain
    `grippelike-foliiferous-richie.ngrok-free.dev` is online from another machine, serving "The Archive of
    Constantinople" (as in G39). It was not touched; the local `ngrok.yml` was left as it is.
  - **Free options left:**
    1. a second ngrok account under `hyadav42774@gmail.com`: its own permanent domain, run with a separate config
       file (recommended);
    2. a Cloudflare quick tunnel (`cloudflared` is installed): no account needed, but the URL dies on restart.
    Both need the laptop awake through each remote check.
  - **The second ngrok token (11:50 UTC) is the same account:** the same domain, the same ERR_NGROK_334. It was
    removed from `.env.local`, and the separate config was deleted.
  - **Working host, 11:53 UTC: this laptop + Cloudflare quick tunnel**, via [executor/run_local.ps1](executor/run_local.ps1).
    The test used package #46 (keccak `0x49de4107…`), 3 workers:
    - `check_executor.py` PASS through the public trycloudflare URL;
    - the bits are identical to a direct worker;
    - the identity hashes are echoed;
    - the worst-case 30 × 512-token batch takes 64.7 s (Cloudflare cuts at 100 s);
    - `run_local.ps1` itself was tested: it printed the URL, GET answered, and its processes were stopped.
    **The URL changes every run.** Register while it runs, keep the laptop awake (request keep-awake), and stop only
    after `/api/wasm` shows the registration past the remote check.
  - **Exception granted 2026-11-23 ("Use college email"), recorded in AGENTS.md.**
  - **Account, created by the owner 2026-11-23:** HF user `harsh442277`, for hosting the evaluator executor Space.
    - `whoami-v2` (11:20 UTC) shows email `harsh.2024a@vitstudent.ac.in`, NOT the required `hyadav42774@gmail.com`
      (AGENTS.md). **No Space was created.** It waits for the owner to change the account email or grant an explicit
      exception.
    - The write token is in `tg-eval/.env.local` as `HF_TOKEN`. It was pasted into the chat transcript, so rotate it
      once the Space runs.
- **Executor:**
  - `fanout_exec.py` now routes `/<FAMILY>` to each adapter's workers.
  - Local rehearsal 2026-11-23 10:50 UTC (EVENT_OUTCOME package `0xc23ad1c6…`, 2 workers): `check_executor.py` PASS;
    the router and a direct worker gave identical bits; an unknown family gives 404.
  - The Linux cross-build of `adapterexec` compiles.
  - The Docker image itself has not been built: there is no Linux Docker engine here.
- **CONTRACT_OBLIGATION_AUDIT v1** ([adapter/contract_obligation_audit/](adapter/contract_obligation_audit/README.md)):
  - 3,000 / 300 / 400 pairs + 278 probe; the kit dataset gate PASSES.
  - `train_package.ps1` started at 10:56 UTC (pid 23956). It waits for the GPU, which another job outside
    GPU.lock holds at 1.4 GB. Log: `tg-eval/runs-v2/coa_v1/chain.log`.
- **Owner, 2026-11-23: "Train alongside".**
  - coa_v1 was restarted at 11:57 UTC: batch 1 × accumulation 16, waiting only for other jobs under 2000 MiB. It
    trains next to the other GPU job, at 1.6 GB total, about 6.5 s a step over 561 steps.
- **CONTENT_MODERATION v1** ([adapter/content_moderation/](adapter/content_moderation/README.md)):
  - Civil Comments (CC0) with crowd-consensus labels; the kit dataset gate PASSES.
  - Training is queued behind coa_v1 on GPU.lock (log `tg-eval/runs-v2/cm_v1/chain.log`).
- **Owner, 2026-11-23: "prepare all of them also. give those which are ready for the submission".**
  - **Lane 3** is now TEXT_SUMMARIZATION, not the CODE_PATCH_VERIFY challenge: #208 was rejected for an unreachable
    executor, so the family is evaluable with no champion.
  - Its synthetic data passes the kit gate ([adapter/text_summarization/](adapter/text_summarization/README.md)), and
    training is queued third.
  - The owner checklist in [SIGN_S2.md](SIGN_S2.md) is rewritten with what is ready now:
    1. post 1 (rewritten);
    2. the DNS and validator truth uploads (hashes re-checked; sources HTTP 200);
    3. the organiser report (rewritten).
- **Next (Claude):** when `chain.log` says `chain end`:
  1. `harness/measure.py` on test and probe;
  2. if it clears 85% held out / 70% per style, host the package at a pinned commit;
  3. add it to `executor/adapters.txt`;
  4. stand up the Space (owner's token).
  Then CONTENT_MODERATION generator v1.

## 2026-11-23 ~11:00 UTC (16:30 IST) · WE HOLD NOTHING; FINAL PLAN WRITTEN

Branch `PR/evaluators-plan-2026-11-23`, cut from `085e06d`, the tip of this Track 2 lineage. Main's `track2/` is the
Oct 31 version. Nothing was signed, registered or trained this session.

- **Registry (epoch 43):** 12 of our registrations, 0 active.
  - 6 comparators scored 1.0 and were superseded by identical later registrations.
  - 5 comparators were rejected with 422; the inferred cause is a module-kind mismatch (G53).
  - No adapter has been registered since #46.
- **Plan:** [PLAN_2026-11-23.md](PLAN_2026-11-23.md).
  - Causes: we gated on real miner answers, but the network judges pool pairs; and we picked families whose truth is
    outside the prompt.
  - A7 is amended to correct-by-construction pairs plus the 15-public-pair loop that Truvian used to win
    SMART_CONTRACT_AUDIT.
  - Lanes, in order: CONTRACT_OBLIGATION_AUDIT, then CONTENT_MODERATION, then a CODE_PATCH_VERIFY challenge (or
    TEXT_SUMMARIZATION). FACT_CHECK, TRANSLATION, WEB_SEARCH, QA and SMART_CONTRACT_AUDIT are excluded because
    LiveCert serves them.
- **The bounties star is done:** 204 on 2026-11-23.
- **Next (Claude):** licence check of CUAD; build and rehearse the executor host; CONTRACT_OBLIGATION_AUDIT generator v1.
- **Owner decision:** the executor host. The recommended option is a Hugging Face Space under `hyadav42774@gmail.com`.
- **Owner, now:** the first growth post (OUTREACH_S2.md).

## 2026-11-17 ~08:00 UTC (13:30 IST) · REVIEWED, CORRECTED, VIDEO BUILT; DEVNODE REGISTRY RESET (G51)

Branch `PR/track2-email-security-evaluator-303326`, pushed to `origin/PR/cranky-euler-d201bb`. The owner asked for
"prepare everything, Fable as advisor".

- **Fable review (2026-11-17)** of submission, posts, tutorial, video and material, all applied:
  - 2,716 → 2,700 responses;
  - the DNS "wrong reference" claim softened (it may be call failures);
  - 45 comparator registrations in 30 families;
  - the QA holdout described accurately (300 benchmark + 62 miner pairs; no scorer beats shorter-wins);
  - **the 144 LANGUAGE_TRANSLATION rows are uploaded, eligible and attested since 2026-11-04**, claimed in
    SUBMISSION §5/§7;
  - the EMAIL_SECURITY pairs are NOT to be uploaded (they fail our identity bar);
  - fuller related-party disclosure;
  - non-resolver services anonymised in the video.
- **Deliverables:**
  - `TUTORIAL.md` (steps 2–4 run 2026-11-16 UTC: 54 answers);
  - `OUTREACH_S2.md` (3 drafts; the owner posts);
  - `demo/make_video.py`, which builds `C:/Users/hyada/tg-eval/demo/track2-demo.mp4`: 10 slides, 168 s, offline
    narration. Not committed (binary); the owner uploads it.
- **G51: devnode registry reset, observed 2026-11-17 07:22 UTC.**
  - The node reports epoch 0 and an empty `/api/wasm`, and miners are being re-registered (count stopped at 1,395).
  - id 4433 is now another miner. **No miner from our wallet `0xdAd2…` was present at ~08:00 UTC.** Track 1 must
    check whether LiveCert needs re-registering. That is the owner's signature.
  - Pools are intact.
- **Owner actions** (SIGN_S2.md top):
  - the reset check;
  - star the bounties repo;
  - sign the DNS and validator truth uploads;
  - send the organiser report (now leads with the reset);
  - publish the video and the 3 posts on separate dates;
  - submit the form by Dec 1 23:59 UTC.

## 2026-11-16 ~18:30 UTC (Nov 17 00:00 IST) · TRACK 2 PREPARED END TO END; ONLY OWNER ACTIONS REMAIN

Branch `PR/cranky-euler-d201bb` (pushed; continues `PR/track2-email-security-evaluator-303326` at `634880d`).
Nothing signed, uploaded, registered or sent.

- **Owner checklist:** [SIGN_S2.md](SIGN_S2.md), top section, one sitting:
  1. star the bounties repo;
  2. upload the DNS and validator truth sources;
  3. optionally, the EMAIL_SECURITY pairs;
  4. send `material/ORGANISER_REPORT.md`;
  5. submit the H2 form.
- **Prepared this session:**
  - `material/validator_truth/` (`8146571`): PublicNode Beacon REST, sha256 `bfcdb813…3e10`;
  - `SUBMISSION_S2.md`, rewritten (`32a0f86`);
  - the organiser report draft (`5fd82fd`).
  The DNS truth sources were prepared earlier (`634880d`).
- **Live re-check 2026-11-16 18:19 UTC:**
  - 45 comparator registrations in 30 families still wait on a "no published snapshot". 28 have a snapshot under
    `_GENERAL`.
  - DNS_RECORD_LOOKUP_GENERAL was last scored at epoch 2019, VALIDATOR_PERFORMANCE_VERIFY_GENERAL at 2032. The
    newest epoch is 2107.
- **Next for Claude, after the owner acts:**
  - read the row states in `/api/evalpool/status` and the post-upload score epochs in `/api/miners`;
  - fill SUBMISSION_S2 §7;
  - claim nothing without that evidence.

## 2026-11-16 ~18:30 UTC · OPPORTUNITY REVIEW: NO REGISTRATION IS SUPPORTED

Owner asked (2026-11-16) for a critical review of both Sonnet lanes, the reasons for every failure, and a ranking of what
is left by realistic chance of beating a champion. Evidence: registry `wasm-20261116T163719Z.json`, `/api/miners`,
`/api/evalpool/status`, and the docs note [research/](research/docs-comparator-truth-2026-11-16.md).

**Why every adapter lane failed (G40–G48):** two causes, both seen on real miner answers.
1. Wrong answers come from one to three services, so service identity predicts the label. This held for EMAIL_SECURITY
   (61 of 69 from verity), WEATHER (3 services), VULN (only the champion author's miner is right where CNA ≠ NVD) and
   ROUTE (no wrong answers at all). A real-answer holdout cannot show that a scorer reads content.
2. Where pairs do turn on content (QA's TruthfulQA and HaluEval), they turn on world facts that a ModernBERT-base head with
   a rank-8 adapter does not hold. v1 and v2 stayed at 42–43% against the champion's 45%. Our own test splits passed
   every time and predicted nothing.

**Ranking, ordinal, by evidence:**
1. **None of the adapter families is an opening.** All seven champions under 0.90 have been tried: QA 0.70, WEATHER 0.70,
   EMAIL 0.714, ROUTE 0.733, SANCTIONS 0.786, VULN 0.793, SECURITY_REVIEW 0.815. The rest sit at ≥ 0.93. Champion-less
   judgment families wait on 5 contributors. Do not train again without a new kind of evidence.
2. **Comparators: no measurable advantage by design** (G49). Exact comparators tie, and scoring runs without them. The
   `_GENERAL` snapshot mismatch blocks about 30 registrations. Reporting it is the owner's send and earns, at most, a
   canonical label.
3. **Best remaining lead: the DNS_RECORD_LOOKUP_GENERAL reference** (G50). The intent has been unranked for about 11 days,
   and its last table looks like a wrong reference. It is measurable on the network (`last_scored_epoch` moves after an
   upload), but three reads are outstanding, our livecert serves the intent (related party), and an upload needs the
   owner's signature.
4. **Material:** real, DNS-labelled EMAIL_SECURITY pairs that catch verity's NXDOMAIN-as-success error (65 pairs,
   `adapter/email_security/evidence/`). An owner-signed upload. Credit is recorded per signer, but there is no public
   endpoint for it.

## 2026-11-16 ~10:05 UTC (15:35 IST) · QA v2 FAILS THE GATE; NO ADAPTER LANE IS OPEN

- **QUESTION_ANSWERING v2: FAIL** (G47). 157/362 = 43.4% vs champion 164; PASS needed 271. Both iterations are used,
  and the lane is closed. The val probes show the negation bias shrank (A1 1 → 22/60), but TruthfulQA did not move.
- Every adapter lane tried in Season II has now failed its gate or stopped before training: sanctions, URL Scan,
  SECURITY_REVIEW, EVENT_OUTCOME, QA (G42, G47), EMAIL_SECURITY (G46), WEATHER (G44), VULN (G45).
- **Owner decisions owed:**
  - star github.com/telegraphprotocol/bounties (required for every track);
  - whether A7 needs rethinking, since real-answer holdouts in these families are identity-confounded or need world
    knowledge a base-size reward head lacks;
  - what the five Track 2 entries become: comparators, material, or the measurement findings themselves.
- Still owed: SUBMISSION_S2.md, growth posts.

## 2026-11-16 ~03:30 UTC (09:00 IST) · QUESTION_ANSWERING v2 (LAST ITERATION) TRAINING

Owner chose the last QA iteration (2026-11-16). Design and thresholds committed before any data was built (`b0e7168`).
- Cause found on the v1 val split, not the holdout (`bias_probes.py`): v1 prefers the non-negated statement 1/60 and
  60/60. v2 adds balanced `true_negation` and `false_negation` kinds. Audit PASS (`c3eac33`), negation probe 0.54.
- **Detached chain** `C:/Users/hyada/tg-eval/runs-v2/qa_v2/run-chain.ps1` (log `chain.log`; rerun skips finished
  steps): train `QUESTION_ANSWERING_v2` (rank 8, alpha 32, 384), finish, then measure V2 on the holdout and the probes.
- **Then:** merge with `qa_holdout/holdout-QA301.json` and `holdout-GENERIC.json` (`harness/merge_results.py`), run
  `compare.py` and `gate.py`, and paste the output verbatim. PASS needs ≥ 172 (champion + 2), ≥ 206 (shorter + 5) and
  ≥ 271/362 (Wilson). A PASS would still need a fresh frozen set, because v1's holdout results informed v2.
- v1's gate output is now in G42 (FAIL on 6 rules). `compare.py` and `gate.py` work end to end.

## 2026-11-16 ~02:00 UTC (07:30 IST) · THREE LANES CLOSED BEFORE TRAINING (G44, G45, G46); NO EVALUATOR READY

Branch `PR/track2-email-security-evaluator-303326`, nothing pushed, signed or registered.

- **EMAIL_SECURITY (G46): stopped by rule 6.**
  - 300 frozen queries; 2,716 real answers; only 69 wrong, 61 of them from verity, which reports NXDOMAIN as
    `lookup_ok: true`.
  - 65 gated pairs (bar 100), identity probe 0.954 (bar 0.65). No training.
  - Report-only: champion 73.8% / 67.7%, GENERIC 67.7% / 90.8% (two renderings, 65 pairs).
- **WEATHER_FORECAST_VERIFY (G44, Sonnet lane): stopped at B.**
  - 56 pairs; identity probe 0.696, shape probe 0.786.
  - Wrong answers come from 3 services.
- **VULNERABILITY_TRIAGE (G45, Sonnet lane): stopped at B.**
  - On CNA≠NVD queries, only the champion author's miner is right.
  - 12 miners serve the CNA score instead of NVD's.
- **Common cause:** in these families, wrong real answers come from one to three services. A7's real-answer holdout
  cannot separate quality from service identity. A redraw cannot fix this; the miners are what they are.
- `capture.py` now fills query, body and path params from structured queries (`99c7d93`, `e5e6af9`). Tests: 20 OK.
- **Still owed:**
  - star github.com/telegraphprotocol/bounties (owner, required for every track);
  - SUBMISSION_S2.md;
  - growth posts;
  - a choice of the next lane. QUESTION_ANSWERING's last iteration is the only open adapter lane with a frozen holdout.
- **Agent branches**, each lane folder already copied here:
  - `claude/weather-forecast-verify-lane` (`eddd6d1`);
  - `claude/vulnerability-triage-lane` (`5607126`).
  Their worktrees are `.claude/worktrees/agent-a08450d7f4d55c4f2` and `agent-aae807d93b70ba28b`.

## 2026-11-15 ~20:30 UTC (Nov 16 02:00 IST) · EMAIL_SECURITY LANE BUILDING THE HOLDOUT; TWO SONNET LANES RUNNING

Branch `PR/track2-email-security-evaluator-303326` (worktree `.claude/worktrees/track2-email-security-evaluator-303326`),
reset onto `e181b96` (the `PR/evaluator-submission-track-2-4d21b7` tip; that branch had no commits of its own here).
Nothing pushed, signed or registered.

- Rules re-read 2026-11-15 ~19:50 UTC (`2b27a17`): Evaluator rubric unchanged; **new: star
  github.com/telegraphprotocol/bounties, required for every track**. `Harshyadav442277` has not starred it (owner's action).
- `harness/capture.py` sends structured request params (`99c7d93`): YAML query/body params filled by name or alias.
- EMAIL_SECURITY: gating rules fixed in [adapter/email_security/README.md](adapter/email_security/README.md)
  (`77ed687`), before any answer. Champion #315 fetched (keccak matches). Truth = NextDNS + DNS.SB (non-miners).
  Candidates in `C:/Users/hyada/tg-eval/data/email_security/`. Next: select + freeze queries, 3-query pilot, capture.
- Owner asked (2026-11-15 ~20:00 UTC) for two more evaluators trained by Sonnet agents with Opus as advisor: lanes
  WEATHER_FORECAST_VERIFY (champion #445, 0.70) on `claude/weather-forecast-verify-lane` and VULNERABILITY_TRIAGE
  (champion #367, 0.793) on `claude/vulnerability-triage-lane`, each in its own agent worktree from `2b27a17`. They
  stop at checkpoints A–D (`CHECKPOINT.md` in their lane folder) for review. They share `tg-eval/GPU.lock`.

## 2026-11-15 ~17:10 UTC (22:40 IST) · QUESTION_ANSWERING: v1 TRAINED AND FAILS THE GATE (42.0% vs champion 45.3%)

Branch `PR/evaluator-submission-track-2-4d21b7`, nothing pushed, signed or registered.

- **Holdout frozen and committed (`3658ecd`), before any training:** `adapter/question_answering/holdout/`.
  - Gated `holdout.jsonl`, 362 rows: 150 TruthfulQA, 150 HaluEval (length-stratified), 62 real-answer pairs (one
    `text` pair per question, no LiveCert pairs).
  - Report-only `holdout_report.jsonl`, 334 rows: `body` rows, related-party rows, extra system pairs.
  - Known weakness: in the 62 miner pairs the shorter answer is right 55 times, and 36 are zk-text over a1-preflight.
    Read that stratum next to the shorter-wins baseline, never alone.
  - Labels: 460 answers read by a Sonnet subagent against the NQ gold (`review.tsv`, `review-auto.tsv`,
    `review-notes.md`); I spot-checked 19. A model's reading, not a person's.
- **Champion #301 on the 300 benchmark pairs (node runtime): 127/300 = 42.3%** (HaluEval 41/150, TruthfulQA 86/150).
  `C:/Users/hyada/tg-eval/runs-v2/qa_holdout/benchmarks-QA301.json`.
- **Detached chain** `C:/Users/hyada/tg-eval/runs-v2/qa_holdout/run-chain.ps1` (progress in `chain.log`): waits for
  the GENERIC benchmark run, then `train.ps1` (rank 8, alpha 32, 384 tokens), `finish.ps1`, then measures QA301,
  GENERIC and OURS on `holdout.jsonl` and `holdout_report.jsonl` (`holdout-<name>.json`, `report-<name>.json`).
  Rerunning it skips finished steps. Only rank 8 is trained; no variant was selected on the holdout.
- **RESULT 2026-11-15 19:04 UTC: v1 FAILS the gate.** Gated holdout, node runtime, 362 pairs
  (`C:/Users/hyada/tg-eval/runs-v2/qa_holdout/holdout-*.json`; package keccak `0xa3880bf3…7443`, Stage 1 passed):

  | Scorer | All 362 | TruthfulQA 150 | HaluEval 150 | Miner pairs 62 |
  |---|---|---|---|---|
  | OURS v1 (rank 8) | 152 = 42.0% | 46 | 50 | 56 |
  | Champion #301 | 164 = 45.3% | 86 | 41 | 37 |
  | GENERIC #900005 | 159 = 43.9% | 58 | 74 | 27 |
  | Longer / shorter answer wins | 46.1% / 51.7% | | | shorter wins 55 of 62 |

  No scorer beats chance on the benchmark pairs, and ours is well below it (96/300): on bare short answers it
  prefers the wrong one. Its 56/62 on miner pairs is not evidence: "prefer shorter" scores 55/62 there. The
  training `result.json` says PASS on our own test split, which again did not predict text we did not write.
  `compare.py` and `gate.py` were not run (the point estimates already fail every rule). The report-set
  measurement (`report-*.json`) was still running at 19:23 UTC.
- **Report-only set (334 rows, finished 19:35 UTC):** ours 294 (88.0%), champion 93, GENERIC 117; shorter-answer-wins
  77.3%. Not independent and includes LiveCert pairs: recorded in GAPS G42, not a claim.
- **Reading (mine, not measured):** telling a right bare answer from a plausible wrong one needs the fact itself;
  a ModernBERT reward head has no evidence to check it against (same as G38). One iteration is left under the
  two-iteration rule. Do not register v1.
- **Tree cleaned 2026-11-15:** the URL Scan, SECURITY_REVIEW and EVENT_OUTCOME pipeline scripts are removed (each
  README names the commit that holds them); `check_tokenizer_parity.py` moved to `adapter/`. Harness tests 19 OK.
- **Next action:** owner chooses between the last QUESTION_ANSWERING iteration (train on answers with their
  supporting evidence) and starting EMAIL_SECURITY (champion #315 at 71.43%; truth is checkable from DNS). Reuse
  `harness/` and the `adapter/question_answering/` layout for the new lane. Still owed: `SUBMISSION_S2.md` for the
  five entries, the growth posts and tutorial, a rules-page re-read (last 2026-11-06).
- **After QUESTION_ANSWERING:** EMAIL_SECURITY (champion #315, 71.43%), FACT_CHECK, then the closed-lane
  pipeline deletion and `SUBMISSION_S2.md` for the five entries.

## 2026-11-15 ~02:00 UTC (07:30 IST) · NO ACTIVE EVALUATOR; BRANCHES CONSOLIDATED; HARNESS FIRST

Branch `PR/evaluator-submission-track-2-4d21b7` (worktree `.claude/worktrees/evaluator-submission-track-2-4d21b7`).
Deadline Dec 1 23:59 UTC (Dec 2 05:29 IST). Owner's goal: submit five evaluators and win the track.

- **Live registry** (`/api/wasm`, read 2026-11-15 ~00:40 UTC; table in [SIGN_S2.md](SIGN_S2.md)):
  - our comparators #267, #268, #269 passed the gate and were superseded by identical-scoring re-registrations;
  - #273 to #278 are `pending`, `awaiting_compatible_material`, since 2026-11-08;
  - sanctions #46 is deregistered. **We hold no champion.**
  - `0x8b2247…` (zkasuran) holds 19 of 25 champions from 276 registrations.
- **Every adapter lane so far failed on answers we did not write:** sanctions 7/15 at the remote check (G40, G41);
  URL Scan V3 lost to GENERIC on real answers ([adapter/url_scan/](adapter/url_scan/README.md)); SECURITY_REVIEW v2
  failed its training gate ([adapter/security_review/](adapter/security_review/README.md)); EVENT_OUTCOME_RESOLUTION
  lost the first-canonical race to #39. LLM_OUTPUT_EVALUATION is closed: the built-in #900002 scores 100% there.
- **Consolidated here on 2026-11-15:** merged `claude/high-demand-comparators` (contains `comparator-validity`),
  `claude/url-scan-adapter`, `claude/security-review-adapter`, `claude/sanctions-pool-measured`. From
  `claude/evaluators-status-a51518`: the docs, the V2 adapter tools and the miner-capture tools, **not** its 29 MB
  of sanctions evidence (289 files; they stay on that branch). `codex/sanctions-benchmark-v7` is not merged
  (1,266 files; sanctions v7 to v34, baseline never beaten).
- **Deleted:** the full-model WASM adapter tooling (`verify_wide`, `eval_deployed.py`, `export_tokens.py`, the
  LLM_OUTPUT_EVALUATION recipe and manifest) and the superseded sign-list sections. All in git history.
- **The five entries (owner asked for five; picks proposed 2026-11-15, not yet confirmed one by one):**
  1. the comparator pack (9 families) with its adversarial suite ([comparator/evaluation/](comparator/evaluation/README.md));
  2. a QUESTION_ANSWERING adapter (champion #301 at 70.00%, the floor; pool open, 6 submitters);
  3. an EMAIL_SECURITY adapter (champion #315 at 71.43%; 10 submitters);
  4. a FACT_CHECK adapter plus material (no champion; 2 of 5 submitters; FEVER pairs in `tg-eval/pairs/fact_check_v1`);
  5. LANGUAGE_TRANSLATION material ([material/](material/README.md); pool had 3 submitters and 338 rows).
- **Method change:** no registration without the gate in [harness/](harness/README.md): a holdout of answers we did
  not write, frozen before training, on which the candidate beats the champion's own file and the length
  baselines in the node runtime.
- **What `zkasuran/telegraph-catalog-miners` shows (read 2026-11-15 by a subagent; nothing run from it):**
  - It hosts built files only: 94 adapter deltas, 102 comparators, ~360 miner YAMLs. No training code, no pair
    data, no runnable server, no registration or pool scripts. Its licence (source-available, no derivatives)
    allows reading and benchmarking and forbids copying or redeploying: take methods, never files.
  - Adapter headers (82 parsed): almost all `max_tokens` 384, not the kit's 512; rank 8 or 16; alpha 32 or 64;
    3 to 17 variants per family. No hold-out, data source or score history is visible.
  - Three FX_NOW comparator versions differ only in the bytes of a version string; the logic is identical. Its
    FX_NOW, CRYPTO_PRICE and WEATHER_CHECK files were re-committed about every 12 h on Nov 4 to 8. Why is not
    stated; the effect is that an identical module takes the champion slot again.
  - The trainer its manifest names is the organiser kit's `float_runtime/train_adapter.py`, which we already use.
    Its dataset gate (length baseline ≤ 0.65, bag-of-words probe ≤ 0.65, unique negatives) is the same idea as A7.
  - To try in our lanes: `max_tokens` 384 in both training and the package; a rank 8/16 and alpha 32/64 sweep
    judged on the frozen holdout.
- **Not verified:** the rules page since 2026-11-06; whether the translation material was ever signed; why #273
  to #278 stay blocked while their `_GENERAL` pools have snapshots.
- **Next:** freeze the QUESTION_ANSWERING query set and capture real miner answers (`harness/capture.py`), label
  them from a primary source, fetch champion #301, then build pairs and train. One GPU job at a time (`GPU.lock`).

## FX_NOW and funding — 2026-11-01 18:45 UTC (Nov 2 00:15 IST), Claude session

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

## Sanctions work — 2026-11-01 19:13 UTC (Nov 2 IST): measurements complete; no ready adapter

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

## 2026-11-01 ~07:15 UTC · V2 PIPELINE PROVEN; EVENT_OUTCOME_RESOLUTION ADAPTER TRAINING

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
