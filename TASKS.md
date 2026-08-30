# TASKS.md — execution board

One task = one change = one commit. Work top-down; the ordering encodes dependencies.

**Track 1 closes 2026-08-31** — ~5 days from 2026-08-26. (The Sep 7 countdown is Track 3's.)
The miner must stay live through **2026-09-07** regardless. See [docs/JUDGING.md](docs/JUDGING.md).

**Register as early as possible:** the 7-day grace-period score sets the opening leaderboard
position, so every day of delay shortens the record we are judged on.

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

## Phase 4b — Track 3 application (Aug 31 – Sep 7)

Added to scope 2026-08-26. The eligibility guardrail (G13) means our intent needs ≥100 real
Track 3 requests or it wins nothing regardless of rank. A genuine app that consumes
`SSL_VERIFICATION` is the mitigation — and a second $2,000 prize pool.

- [x] **T4b.1** Built **CertWatch** → [app/](track3-certwatch/). TLS expiry monitor with a dashboard: watchlist,
      verdict, days-remaining, issuer, serving miner, and a link to each answer's on-chain signal.
- [x] **T4b.2** Uses the **auto-routed** `/engine/v1/ask`, not `ask/{minerId}` — so Telegraph's own
      router classifies the query and the demand lands on the *intent*, which is what the guardrail
      counts. x402 payment wired via `@x402/fetch` + `@x402/evm` on Base Sepolia.
- [x] **T4b.5** Fixed the durable-history path: root `.gitignore` matched
      `track3-certwatch/data/`, so the sweep's commit was a silent no-op and the app stayed on
      ephemeral state. Negated and tracked; the raw URL now resolves once pushed. (reopens/closes G18)
- [ ] **T4b.3** *User:* fund a throwaway Base Sepolia wallet with testnet **USDC** and set
      `EVM_PRIVATE_KEY` in `app/.env`. The dashboard already counts `SSL_VERIFICATION`-classified
      requests separately, toward the 100 floor. **Do not fund before T4b.5 is proven end to end
      through a real sweep** — that was the whole point of the durability gate.
- [ ] **T4b.4** *User:* deploy CertWatch publicly. Config ready (`app/Dockerfile`, `app/fly.toml`,
      scale-to-zero is fine here — nothing spot-checks the app). Then get **other people** using it;
      real demand counts for far more than self-generated traffic.

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
