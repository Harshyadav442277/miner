# TASKS.md — execution board

One task = one change = one commit. Work top-down; the ordering encodes dependencies.

**Track 1 closes 2026-08-31** — ~5 days from 2026-08-26. (The Sep 7 countdown is Track 3's.)
The miner must stay live through **2026-09-07** regardless. See [docs/JUDGING.md](docs/JUDGING.md).

**Register as early as possible:** the 7-day grace-period score sets the opening leaderboard
position, so every day of delay shortens the record we are judged on.

---

## Where this stands — 2026-09-03 ~19:50 UTC (post-close, Track 3 window)

- **Track 1 and Track 2 closed 2026-08-31 23:59 UTC.** Registration **402** is `active` with
  thirteen intents; the miner stays untouched through **2026-09-07 23:59 UTC**.
- **Feedback loop, all green today:** typecheck, 182 unit + 67 live tests, `verify-deploy`
  (median 406 ms, p95 1.11 s), `preflight.mjs` 7/7, `watch.mjs --once` against 402, hosted
  manifest hash `7538…7640` intact.
- **Epoch 305:** 6 × #1, 4 × #2, 2 × #3, #6 WALLET; normalized-ratio sum 10.17. Post-close sums
  299–305 range 9.22–10.56 — the epoch-298 level held. `txlens` crossed the SSL cliff and
  `skywire-storm-alert` the storm cliff; not chased during the freeze.
- **The uptime tripwire was red from Sep 1 on the retired id 389 — re-armed (TB.6a, G66).**
- **Open for a human:** TA.6 / T5.2 (X series), the submissions-platform check for 402, G64
  (delete the CertWatch Vercel project), G65 (the public rival-copy repo).

---

## Phase 0 — Decide (blocking; nothing else starts until this closes)

- [x] **T0.1** Fetch live intent occupancy → [track1-miner/docs/INTENT_OCCUPANCY.md](track1-miner/docs/INTENT_OCCUPANCY.md).
      45 canonical intents; 3 at zero. (closes G3; narrows G1)
- [x] **T0.2** Read Intents + Build a Scoring Module. Scoring is a WASM module over three plain
      strings; verbose answers are penalised by word-overlap. (closes G4)
- [x] **T0.3** Read the hackathon rules → [docs/JUDGING.md](docs/JUDGING.md). Found three things that
      changed the plan: Track 1 closes **Aug 31** not Sep 7; scoring is **75% performance + 25% X**;
      and an intent needs **≥100 Track 3 requests** to be prize-eligible. (closes G12, opens G13)
- [x] **T0.4** `example-track1-miner/miner.yaml` is **not** in telegraph-usecases — that repo holds six reference
      Track 3 *applications* (truthwire, trustfilter, scholarguard, adguard, reviewradar,
      supersignal). `telegraph-examples` 404s. Our YAML was validated against the field reference
      instead. (closes G5)
- [ ] **T0.5** Re-read the truncated tails of the YAML-config and registration doc pages. (closes G6)
- [x] **T0.6** D1 = `SSL_VERIFICATION`, D2 = host our own. PRD scope frozen.

## Phase 1 — Prove the upstream

- [x] **T1.1** Runtime spike: Node `tls.connect()` required; Workers cannot read peer certs. (closes G2)
- [x] **T1.2** Built [track1-miner/miner/](track1-miner/miner/) — Node, zero runtime deps. **23 tests passing** (`npm test`),
      covering the target parser and all six verdicts live against badssl.com. Typecheck clean.
- [x] **T1.3** Deployed to Vercel: **https://miner-wine.vercel.app**, and set as `base_url`.
- [x] **T1.4** Measured live via `tools/verify-deploy.mjs`: **median 488ms, p95 1180ms** across all
      six declared endpoints — well inside the ~20s spot-check cadence. Telegraph's own spot checks
      keep the function warm once registered, so cold start is not the operating case.

## Phase 2 — Author the YAML

- [x] **T2.1** `slug: livecert`, `id: 4433` — both verified free against the live 89-miner catalog.
- [x] **T2.2** [track1-miner/miner.yaml](track1-miner/miner.yaml) written; passes a local strict-schema precheck.
- [x] **T2.3** No `limitations[]` needed — we have no third-party upstream, so no account quota
      to declare. This is a direct benefit of D2.
- [x] **T2.4** No `errors` block — our service uses real HTTP status codes, never a liar-200 (A5).
- [x] **T2.5** Both `SSL_VERIFICATION` and `STORM_ALERT` confirmed canonical against the live
      `/engine/v1/intents` set (45 intents). Re-verify with `isCanonicalIntent` before sending —
      one bad string reverts the whole transaction.
- [x] **T2.7** Added `STORM_ALERT` and `WEATHER_FORECAST` after measuring demand →
      [docs/MARKET_DATA.md](track1-miner/docs/MARKET_DATA.md). Three endpoints, **37 tests passing**, YAML
      declares all three intents. `WEATHER_FORECAST` carries the network's highest demand (941
      requests) with all nine incumbents under 0.008.
- [x] **T2.6** Sandbox-validated and registered as **236** (four intents). (A2)
- [x] **T2.8** Six-intent update sandbox-validated and signed 2026-08-28 → registration **260**,
      `active`, all six intents. The sandbox caught a `docs.twitter` parse failure first; field
      removed and re-validated clean. 236 → `superseded`, no serving gap.


## Phase 3 — Register (user drives all wallet steps)

- [x] **T3.1** Wallet funded on Base Sepolia. (closes G7)
- [x] **T3.2** Fee address = the miner address `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. (D4)
- [x] **T3.3** Registered. **1377** rejected; **225** and **236** superseded; **260** is live.
- [x] **T3.4** `registrationId: 260` recorded (was 236). Every lookup uses it, never the slug.
- [x] **T3.5** `activation_status: active`, `rejection_reason: null`. (closes S1)
- [x] **T3.6** Not applicable — `auth: {type: none}`. No API key exists anywhere in this miner, so
      no upstream quota can revoke us.

## Phase 4 — Operate through the grace period

- [x] **T4.1** Uptime watching built two ways: `tools/watch.mjs` (local, `--once` for cron) and
      `.github/workflows/uptime.yml` (every 15 min, opens an issue on failure — survives the laptop
      being closed, which matters given the miner must stay live to Sep 7). (closes G10)
- [x] **T4.1b** `tools/verify-deploy.mjs` — post-deploy acceptance check across all six verdict
      paths plus latency, so a broken deploy is caught *before* the immutable registration.
- [ ] **T4.2** Watch through **2026-09-07** — staying live is a rule, not just scoring. Zero
      revocations so far. **Now doubly load-bearing: the miner wallet's seed is compromised
      (GAPS G19), so the uptime workflow's activation check is the tripwire for a malicious
      `deregisterMiner`.** (S2)
- [x] **T4.5** Hardened the miner to exactly the six registered routes; extended the SSRF guard;
      made query logging opt-in and value-free. Fixed the academic parser refusing two of four real
      questions, and the weather/storm refusals discarding the window the engine did send.
      **123 tests.**
- [x] **T4.6** Measured both new intents offline before their first scored epoch, and both took
      rank 1 exactly as predicted — translation 9/9 wins, academic 19/21.
- [x] **T4.3** Tuned from real scored rows, not from code review: the params-only delivery fix, the
      never-return-4xx rule, echoing the question's own identifiers, and the `/papers` bare-topic
      refusal bug. Every large gain came from a clause going unanswered.
- [x] **T4.4** Ranked and tracked each epoch → `track1-miner/docs/score-history.jsonl`, appended by
      `tools/record-scores.mjs`. **Rank 1 in SSL_VERIFICATION, STORM_ALERT and IP_GEOLOCATION for
      epochs 286, 287 and 288.** (S3, S4)
- [x] **T4.7** **Reconcile the diverged branch before anything else touches git.** Done by
      2026-08-29 session 2: `origin/main...HEAD` measures `0 0`, both epoch-289 lines are in the
      pushed history. The prevention half (who owns `score-history.jsonl`) is still open — run the
      divergence check at session start until it is settled. (G20)
- [x] **T4.8** **Make the uptime alarm cover every job, and prove it fires once.** Done 2026-08-29
      session 2: single `alarm` job with `needs: [check, live-tests, scores]`, explicit
      permissions, npm cache on `live-tests`, honest cadence comment — and **proven live**: a
      forced failure via the new `test_alarm` dispatch input created issue #1, closed as a
      documented drill. (G21)
- [x] **T4.10** **Manifest update SIGNED AND ACTIVE — registration 297, 2026-08-29 ~08:30Z.**
      Done via the docs' manual `cast send updateMiner` path because the console was broken (its
      importer strips the per-endpoint `intents`/`params` keys its own validator requires — worth
      reporting in Discord). YAML hosted as a revision-pinned public gist, hash verified against
      hosted bytes, all six intents canonical-checked before sending, activation ~1 minute with
      no serving gap, `REGISTRATION_ID` repo variable updated to 297 in the same hour. The
      `/translate` contract now REQUIRES `text` + `target_language`; epoch 291+ tests delivery.
- [x] **T4.11** **Weather temperature-first reorder, deployed 2026-08-29 ~09:00Z.** The converter
      dropped the asked-for temperature in epochs 289 AND 290. Temperature now opens the prose,
      source attribution moved to the tail. Raw 0.011418 on epoch 290's question vs the winner's
      converted 0.011638. Epoch 291 is the test.
- [x] **T4.12** **CVE_LOOKUP evaluated and declined 2026-08-29.** Captured intent: the new
      champion scorer (`cve_ms_10.wasm`) scores its author's miner 0.9999, our best 0.24, and
      any enrichment 0.0000. Restoration was reverted; only the translation params survived
      into the manifest. Do not re-enter.
- [x] **T4.9** **Storm advisory hedge, measured and deployed 2026-08-29.** Epoch 289's storm
      question was operational ("what adjustments should miners implement") and the whole field
      answered with forecast numbers — we lost #1 by 0.00023. The engine sends storm only
      coordinates, so a standing guidance sentence was appended to every storm answer: **+36%** on
      the advisory question, **−2 to −3%** on the three forecast questions (winning margins there
      are 11–105%), **+2.7%** mean over the 12-question bench. Deployed via `vercel --prod` and
      verified live; conversion survival unmeasured (G23). Epoch 290+ rows are the test.

- [x] **T4.13** **Epoch 292 autopsy and the restatement fix, 2026-08-30.** SSL lost #1 by 1.75% to a
      competitor that tuned +74% in one epoch; weather back to #5 in a 14-miner field, and the
      seven-epoch series shows epoch 291's weather #1 was the field collapsing, not our reorder
      working. Root cause of both: **every ground truth restates the request before answering it and
      ours did not**, and the champion scorers are a cliff on that resemblance (~0.99 above, ~0.01
      below) that the entire weather field has always been on the wrong side of. Fix shipped as
      `src/restate.ts` + `sendAnswer` in `src/handler.ts`, A/B'd against live production on the live
      champion scorers: **weather 8.10x (12/12), SSL 18.84x (11/12), storm 20.44x (8/12)**; under a
      32-word conversion budget **6.36x / 11.15x / 1.51x (12/12)**. 102/102 tests, typecheck clean.
      Report: `track1-miner/docs/EPOCH_292_AUTOPSY.md`. Caveats: G25 (converter simulated), G24
      (`/scores` no longer returns question/ground_truth/converted_answer).
- [ ] **T4.14** **Deploy the restatement fix and read epoch 293.** `vercel --prod` from
      `track1-miner/miner`, then `node tools/verify-deploy.mjs https://miner-wine.vercel.app`.
      Pushing does not deploy (G22). **Read storm's row first** — it is the one intent where 4 of 12
      bench questions score lower on full prose and we hold rank 1 by 0.7%. Operator drives the
      deploy.
- [ ] **T4.15** **Decide on the undefended intents.** Six intents have <=2 miners and every
      incumbent scoring 0.0; `assay-miner` (FACT_CHECK) is structurally incapable of ever scoring.
      Recommended order and the honesty constraints per intent:
      `track1-miner/docs/EXPANSION_TARGETS.md`. Any entry is a manifest change and one
      `updateMiner` signature — batch them into a single update, sandbox-validate first.
- [x] **T4.16** **Fix the two non-#1 intents of epoch 294, measured and deployed 2026-08-30.**
      IP_GEOLOCATION: special-range classifier (private/TEST-NET/loopback/… answered
      definitionally), an abuse-history clause on every public answer backed by a live Tor DNSEL
      check, ip-api.com as primary provider (geofeed accuracy; verified on production — G27), and
      operator-first prose; frozen-bench clip32 vs preflight 0.384→0.807, wins 4/21→14/21 (the
      floor — four remaining losses are provider rows the local bench cannot exercise, G27).
      LANGUAGE_TRANSLATION: champion changed to reg 1996 (w1, two-cluster cut); bare-translation
      answers, Google primary/MyMemory failover, restatement skipped — 9/10 crossings vs
      langwire's 8/10 (G26: shape is w1-specific). 173/173 tests, verify-deploy green, epoch 295
      is the live test. Measurement note: score only through track2/harness/wasm-abi.mjs — naive
      WASM loaders corrupt silently (bump allocator wrap).

- [x] **T4.17** **Expansion round measured and decided, 2026-08-31.** All 45 canonical intents swept
      for occupancy AND for whether recorded questions survive to measure with. Entering three:
      **CONTENT_EXTRACTION** (bar 0.0, ours 1.000000 on 6/6 raw and clipped), **NEWS_HEADLINES**
      (bar 0.00262926, ours 0.006447 with all 22 questions above the bar) and
      **WALLET_BALANCE_CHECK** (field ~1e-4, all-time best 0.00747, ours 0.230285 with 3/13
      crossing at 0.99). Code deployed and verified; 190/190 tests; awaiting ONE `updateMiner`
      signature → `track1-miner/docs/ADD_THREE_INTENTS.md`.
      **Rejected on measurement, with reasons recorded so nobody re-opens them:**
      TEXT_AUTHENTICITY_CHECK (uncontested but our honest answer scores 0.000001 — its ground
      truths assert facts absent from the supplied text), CONTENT_VERIFICATION (binary scorer;
      Wikipedia-retrieved answer 0.0), CVE_LOOKUP (re-measured under the new champion: 0.4998, a
      phrasing-keyed coin flip — the same answer scores 0.999 and 0.000 on two phrasings of the
      same CVE), TOKEN_HOLDER_COUNT (no data edge; chainsight reads the same Blockscout numbers),
      FACT_CHECK / IMAGE_VERIFICATION / SPORTS_SCORE (zero recorded questions, unmeasurable).
      **The rule: judging averages our-score-over-best-score, our current average is ~0.72, so an
      intent must beat 0.72 to be worth entering — an uncontested rank 1 at 0.0 does not help.**

## Phase 4b — Track 3 application — MOVED (2026-09-02)

CertWatch was retired and deleted: never funded, never had a user, and a fresh 5-day sprint should
not carry its serverless-state workarounds. The Track 3 application is now **Morse**, in its own
repository and sibling folder `../telegraph-morse`
(<https://github.com/Harshyadav442277/telegraph-morse>). Its board is `PHASES.md` there.

## Phase 5 — Build in public (runs in parallel from day 1, not at the end)

- [x] **T5.1** X account live and linked to the hackathon account: `@hyadav42774`, 29 posts. Best
      performer so far is **188 impressions**. (G11)
- [ ] **T5.2** **Post the series** → [docs/X_POSTS.md](docs/X_POSTS.md). Thirteen posts, each
      verified under 280 characters and tagged, roughly two a day through Aug 31 and continuing
      through Track 3. Covers both tracks. *Blocked on the operator.*
- [x] **T5.2b** ~~Confirmed by the organizers: the X term is scored on the single
      highest-engagement post, not the sum, and scoring is automated.~~ **Retracted 2026-08-28 —
      this was wrong and it changed the plan.** The organizers later stated there is **no fixed
      formula**: they weigh *"quality, consistency, reach, likes, reposts, comments and meaningful
      engagement"*, they want both tracks covered, and they want the real work shown. **Consistency
      is scored, so a steady series beats one flagship post.** The one-flagship plan built on the
      earlier message is withdrawn; `docs/X_POSTS.md` is the current series.
- [x] **T5.3** README written with an honest Assumptions & Limitations section sourced from GAPS.md.
- [x] **T5.3b** [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) — every item to close,
      in dependency order, with who owns each.
- [ ] **T5.4** Submit Track 1 before **2026-08-31**; Track 3 before 2026-09-07. Do not discover the
      submission format on the last day.

---

## Done

- [x] Verified the protocol mechanics against live docs → [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md)
- [x] Established that `base_url` is the **upstream** API — a miner can be pure YAML, no server
- [x] Hackathon account registered; Discord joined
- [x] Track 1 (Miner) chosen
- [x] Planning docs written

---

## Where this stands — 2026-08-30 (evening)

**Re-verified live this session:** registration **334** `active`, `rejection_reason: null`,
`fetch_attempts: 0`; all seven endpoints 200; **173/173 tests pass**; `verify-deploy.mjs` green
against production after today's deploy (median 487ms, p95 1086ms). Epoch **294** is the
network's latest recorded, scored 2026-08-30 ~11:59Z.

**Rank 1 in five of seven** (epoch 294): SSL_VERIFICATION, STORM_ALERT, WEATHER_FORECAST,
ACADEMIC_SEARCH, AI_TEXT_DETECTION. IP_GEOLOCATION #2 by 5.2% and LANGUAGE_TRANSLATION #2 in a
near-zero field — **both diagnosed, fixed, measured against their champions and DEPLOYED today
(T4.16)**. Epoch 295 is the test of 7/7.

**Open, in priority order:**

1. **Read epoch 295's IP and translation rows** — the T4.16 fixes' live test. If translation is
   still losing, check whether the champion changed again first (G26).
2. **T5.2 — post the X series.** 25% of the score. Operator only.
3. **T4.15 — decide on the undefended intents** (`docs/EXPANSION_TARGETS.md`). One batched
   `updateMiner` signature if yes.
4. **The eligibility question** — `total_requests_served` remains far below the 100-per-intent
   floor with Track 3 not yet open. Ask the organizers whether that half is waived, deferred or
   binding on Aug 31.

---

## Production audit — 2026-08-30 ~21:45 UTC

- [x] **TA.1** Call every route the way the **engine** does, not the way a human does.
      Found six routes discarding their declared subject when `query` paraphrases it: four
      refused (guaranteed zeros), and `/papers` and `/storm-alert` answered **confidently wrong**
      on intents we lead. Fixed with `withSubject`, which is a no-op on verbatim questions so no
      scored surface moves. New guard: `tools/param-shapes.mjs`. (opens+closes G30)
- [x] **TA.2** Bound every route inside Vercel's 15s `maxDuration`. A hung upstream became a 504,
      which Telegraph scores exactly as it scores a 400. Watchdog at 11s answers honestly instead;
      `send()` made idempotent. (opens+closes G31)
- [x] **TA.3** Probe all 23 upstream providers — the organizers made their uptime ours.
      `polygon-rpc.com` is dead (401, "tenant disabled") and was the **primary** for Polygon.
      Replaced and cross-checked. New guard: `tools/upstream-health.mjs`. (opens+closes G32)

### Next, in order

- [x] **TA.4** **Read the epoch-296 rows** (lands 2026-08-31T03:53:43Z). *Done 2026-08-31 — 296
      and 297 are recorded and read in MEMORY § 0000000.* It is the acceptance test
      for four separate changes: the translation payload starve, and TA.1–TA.3. Watch
      `ACADEMIC_SEARCH` specifically — if it returns toward 1.000, the `/papers` subject bug was
      the 295 regression; if it does not, that hypothesis is dead and the cause is elsewhere.
- [x] **TA.5** **Operator: sign the three-intent `updateMiner`** — *signed 2026-08-31 04:01Z as
      registration 389, then extended to thirteen intents as 402 at 21:37Z (TB.6).* Was the largest available
      score lever and only a human can do it. Occupancy re-checked and unchanged; all three routes
      verified live in production. Runbook: [track1-miner/docs/ADD_THREE_INTENTS.md](track1-miner/docs/ADD_THREE_INTENTS.md). (G28)
- [ ] **TA.6** **Operator: post the X series** — 25% of the Track 1 score and still the largest
      unclaimed block. Thirteen drafts, each verified under 280 characters:
      [docs/X_POSTS.md](docs/X_POSTS.md). The subject-dropping bug is genuinely new material.
- [x] **TA.7** Run `param-shapes.mjs` and `upstream-health.mjs` before every future deploy.
      `verify-deploy` passed green through all three defects above and is not sufficient alone.
      *Folded into `tools/preflight.mjs`, which runs both as gates; 7/7 against production on
      2026-09-03.*
- [ ] **TA.8** **After the close, not before:** run one epoch with `LOG_QUERY=on` and read which
      parameters the engine actually fills. It settles GAPS **G35** (`/ip-geolocate` losing its
      restatement when `ip` is filled) and would retire the guesswork behind `withSubject` for
      every route at once. It is the single highest-value unknown left in Track 1.
      *Deferred past 2026-09-07: it needs a production environment change and a redeploy, and the
      miner stays untouched through Track 3 because rankings feed judged routing.*

### Session of 2026-08-31 ~21:30Z — the last hours of Track 1

- [x] **TB.1** **Track 1 was not closed.** The "closed" note in docs/TELEGRAPH_FACTS.md was a
      local-date-vs-UTC error (02:16 IST Sep 1 = 20:46 UTC Aug 31; the close is Aug 31 23:59 UTC).
      Corrected there and in CLAUDE.md, with the UTC rule made explicit. (opens+closes G58)
- [x] **TB.2** Measured all twelve crowded Tier-A intents across every recorded epoch before
      choosing any. GAS_PRICE is closed (incumbent at exactly 1.0), FRAUD_DETECTION saturated at
      ~0.9998, URL_SCAN's leader is 610x the runner-up; and epoch 297's field-wide zeros in
      CVE_LOOKUP / STOCK_PRICE / TOKEN_HOLDER_COUNT are champion rotations, not open doors.
- [x] **TB.3** Fixed `hours=0` being swallowed by a falsy-zero fallback, against our own
      `input_schema` which promises "0 is the current hour". Test added, deployed, verified live.
- [x] **TB.4** Manifest to **thirteen** intents (`WEATHER_CHECK` on the existing forecast endpoint,
      plus the already-built-but-never-registered `FACT_CHECK` and `TELEGRAPH_KNOWLEDGE`).
      Preflight 7/7, 182 unit + 67 live green, `cast call` simulation clean.
- [x] **TB.5** `tools/sign-update.sh` repointed from the retired reg 334 to **389** and thirteen
      intents. It had been left pinned to a registration that no longer exists.
- [x] **TB.6** **Signed and mined 2026-08-31 ~21:37Z — registration is now 402.** Tx
      `0x0e54dcc7b31b7f30b110f77f09e7719267d1179fbac8e4795a9649ff20f27fd3`, status 1. Receipt logs
      decode to id 402, the signed hash, the pinned URL and all thirteen intents. **389 is gone.**
- [x] **TB.6b** Registration 402 confirmed **active** 21:46Z, thirteen intents, preflight 7/7.
      Activation read `unreachable` for ~3 min first (fetch attempt 1 of 5 timed out); that is
      normal and self-heals. `CHECK STATUS` in the console forces a retry; never `DEREGISTER`.
- [x] **TB.9** **Submission is a step separate from registering** — found with ~2h left and
      recorded in docs/TELEGRAPH_FACTS.md. Being registered, active and ranked does not enter you.
      Track 1 takes miner ID **402** plus `track1-miner/miner.yaml`; Track 2 takes the five live
      champions (1882, 2010, 2879, 2882, 2884) with their `.wasm` files.
      **Operator reported both tracks submitted at ~22:20Z.** Claude did not and cannot verify this
      — the submissions site needs a wallet-signed session. An earlier revision of this line
      asserted the submission as done before the operator had said so; that was unverified and is
      corrected here.
- [x] **TB.10** Deleted the root `SUBMIT-THIS-miner.yaml`. It was the stale 10-intent snapshot
      (22,807 bytes, `0x78932fb1...`) and its name invited uploading the wrong manifest to the
      submission form. Byte-identical to the reg-389 manifest, so nothing was lost — recover with
      `git show 74ad4a19f41b922a5183dc26d6f405c8557dc9ba:track1-miner/miner.yaml` if ever needed.
      The manifest to submit is always `track1-miner/miner.yaml`, whose bytes hash to the
      registered `yaml_hash`.
- [x] **TB.6a** **`gh variable set REGISTRATION_ID --body 402`** — *done 2026-09-03 19:46Z.* The
      tripwire had watched 389 since the update and failed every scheduled run from 2026-09-01
      (`activation=deregistered`, G66); dispatch 33798427285 is green on every job and the
      `resolve` job closed issue #5.
- [ ] **TB.6-old** Original signing step, retained for the runbook: `export PATH="$HOME/.foundry/bin:$PATH" && bash
      track1-miner/tools/sign-update.sh` — cast prompts for the key directly; the script never
      sees it. Then read the NEW registration id from the receipt logs (not the API — the indexer
      lags ~4 min), `gh variable set REGISTRATION_ID --body <NEW_ID>`, and re-run preflight.
- [ ] **TB.7** Sandbox validation could **not** be run — the validator 404s from its own backend
      (G60). If it comes back, validate the thirteen-intent manifest retroactively; a rejection
      would need a corrective update, not a rollback. *Re-checked 2026-09-03 19:45Z: still 404.*
- [ ] **TB.8** Confirm whether epoch 298 (starts 23:02Z, inside the window; scored ~00:15Z, outside
      it) counts toward the Track 1 record (G61). Nothing to do about it either way — but it
      determines whether TB.4 mattered for judging or only for Track 3 routing.
