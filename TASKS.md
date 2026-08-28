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
- [x] **T5.2b** Confirmed by the organizers: the X term is scored on the **single
      highest-engagement post**, not the sum, and scoring is automated.
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

## Where this stands — 2026-08-28

**Rank 1 in four of six intents** (epoch 289): SSL_VERIFICATION, IP_GEOLOCATION,
LANGUAGE_TRANSLATION, ACADEMIC_SEARCH. Storm #2 by 0.00023, Weather #3 by 0.00027.

**Open, in priority order:**

1. **T5.2 — post the X series.** 25% of the score, currently near zero. Operator only.
2. **Track 2 registration** — one signature, see `track2/REGISTRATION.md`. Operator only.
3. **The eligibility question** — Track 3 has not opened, so the 100-request half is zero
   everywhere. Ask the organizers whether it is waived, deferred or binding.
4. **T4b.3/T4b.4 — CertWatch.** Durable history is fixed (G18) but no sweep has yet written a
   record through the real path, and it has no outside users. Do not fund before that is proven.
5. **A third IP_GEOLOCATION miner** must come from an independent party, or that intent stays
   ineligible. `track1-miner/docs/ELIGIBILITY.md` has a working keyless YAML to hand out.

**Do not retry:** shortening answers toward the converter's ~32-word budget, reordering `reason`
to front-load asked-for variables, or any of the six disproven scoring theories in
`track1-miner/MEMORY.md` §6. All measured worse than what is deployed.
