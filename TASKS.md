# TASKS.md — execution board

One task = one change = one commit. Work top-down; the ordering encodes dependencies.

**Track 1 closes 2026-08-31** — ~5 days from 2026-08-26. (The Sep 7 countdown is Track 3's.)
The miner must stay live through **2026-09-07** regardless. See [docs/JUDGING.md](docs/JUDGING.md).

**Register as early as possible:** the 7-day grace-period score sets the opening leaderboard
position, so every day of delay shortens the record we are judged on.

---

## Phase 0 — Decide (blocking; nothing else starts until this closes)

- [x] **T0.1** Fetch live intent occupancy → [track1-track1-miner/miner/docs/INTENT_OCCUPANCY.md](track1-track1-miner/miner/docs/INTENT_OCCUPANCY.md).
      45 canonical intents; 3 at zero. (closes G3; narrows G1)
- [x] **T0.2** Read Intents + Build a Scoring Module. Scoring is a WASM module over three plain
      strings; verbose answers are penalised by word-overlap. (closes G4)
- [x] **T0.3** Read the hackathon rules → [docs/JUDGING.md](docs/JUDGING.md). Found three things that
      changed the plan: Track 1 closes **Aug 31** not Sep 7; scoring is **75% performance + 25% X**;
      and an intent needs **≥100 Track 3 requests** to be prize-eligible. (closes G12, opens G13)
- [x] **T0.4** `example-track1-track1-miner/miner/miner.yaml` is **not** in telegraph-usecases — that repo holds six reference
      Track 3 *applications* (truthwire, trustfilter, scholarguard, adguard, reviewradar,
      supersignal). `telegraph-examples` 404s. Our YAML was validated against the field reference
      instead. (closes G5)
- [ ] **T0.5** Re-read the truncated tails of the YAML-config and registration doc pages. (closes G6)
- [x] **T0.6** D1 = `SSL_VERIFICATION`, D2 = host our own. PRD scope frozen.

## Phase 1 — Prove the upstream

- [x] **T1.1** Runtime spike: Node `tls.connect()` required; Workers cannot read peer certs. (closes G2)
- [x] **T1.2** Built [track1-miner/miner/](track1-miner/miner/) — Node, zero runtime deps. **23 tests passing** (`npm test`),
      covering the target parser and all six verdicts live against badssl.com. Typecheck clean.
- [ ] **T1.3** *User:* deploy and get the public HTTPS URL. **This is the `base_url`.**
      `fly.toml` + `Dockerfile` are ready; needs a host account. Then update `base_url` in track1-track1-miner/miner/miner.yaml.
- [ ] **T1.4** Measure deployed cold-start and p95 latency against the ~20s cadence (A3).
      Local baseline: ~100ms cold handshake, **12ms cached**.

## Phase 2 — Author the YAML

- [x] **T2.1** `slug: livecert`, `id: 4433` — both verified free against the live 89-miner catalog.
- [x] **T2.2** [track1-track1-miner/miner/miner.yaml](track1-track1-miner/miner/miner.yaml) written; passes a local strict-schema precheck.
- [x] **T2.3** No `limitations[]` needed — we have no third-party upstream, so no account quota
      to declare. This is a direct benefit of D2.
- [x] **T2.4** No `errors` block — our service uses real HTTP status codes, never a liar-200 (A5).
- [x] **T2.5** Both `SSL_VERIFICATION` and `STORM_ALERT` confirmed canonical against the live
      `/engine/v1/intents` set (45 intents). Re-verify with `isCanonicalIntent` before sending —
      one bad string reverts the whole transaction.
- [x] **T2.7** Added `STORM_ALERT` and `WEATHER_FORECAST` after measuring demand →
      [docs/MARKET_DATA.md](docs/MARKET_DATA.md). Three endpoints, **37 tests passing**, YAML
      declares all three intents. `WEATHER_FORECAST` carries the network's highest demand (941
      requests) with all nine incumbents under 0.008.
- [ ] **T2.6** Sandbox-validate at `integrate.telegraphprotocol.com` until every endpoint passes. (A2)

## Phase 3 — Register (user drives all wallet steps)

- [ ] **T3.1** *User:* fund a Base Sepolia wallet with testnet ETH for gas. (closes G7)
- [ ] **T3.2** *User:* decide the fee address. (D4)
- [ ] **T3.3** *User:* connect wallet at the console, pin YAML to IPFS, send `registerMiner`.
- [ ] **T3.4** Capture the `registrationId` from the receipt. Record it in MEMORY.md — every
      lookup from here uses it, never the slug.
- [ ] **T3.5** Confirm `activation_status: active` at `/api/miners/<registrationId>`. (closes S1)
- [ ] **T3.6** If the upstream needs an API key: install it via the EIP-191 challenge flow. Only
      possible after registration. *User signs.*

## Phase 4 — Operate through the grace period

- [x] **T4.1** Uptime watching built two ways: `tools/watch.mjs` (local, `--once` for cron) and
      `.github/workflows/uptime.yml` (every 15 min, opens an issue on failure — survives the laptop
      being closed, which matters given the miner must stay live to Sep 7). (closes G10)
- [x] **T4.1b** `tools/verify-deploy.mjs` — post-deploy acceptance check across all six verdict
      paths plus latency, so a broken deploy is caught *before* the immutable registration.
- [ ] **T4.2** Watch the first 7 days. Grace period gives an equal share of 5% of traffic; the score
      earned here sets the opening leaderboard position. Zero revocations is the target. (S2)
- [ ] **T4.3** Tune latency and correctness from observed spot-check behaviour.
- [ ] **T4.4** Track rank once ranked. (S3, S4)

## Phase 4b — Track 3 application (Aug 31 – Sep 7)

Added to scope 2026-08-26. The eligibility guardrail (G13) means our intent needs ≥100 real
Track 3 requests or it wins nothing regardless of rank. A genuine app that consumes
`SSL_VERIFICATION` is the mitigation — and a second $2,000 prize pool.

- [x] **T4b.1** Built **CertWatch** → [app/](track3-certwatch/). TLS expiry monitor with a dashboard: watchlist,
      verdict, days-remaining, issuer, serving miner, and a link to each answer's on-chain signal.
- [x] **T4b.2** Uses the **auto-routed** `/engine/v1/ask`, not `ask/{minerId}` — so Telegraph's own
      router classifies the query and the demand lands on the *intent*, which is what the guardrail
      counts. x402 payment wired via `@x402/fetch` + `@x402/evm` on Base Sepolia.
- [ ] **T4b.3** *User:* fund a throwaway Base Sepolia wallet with testnet **USDC** and set
      `EVM_PRIVATE_KEY` in `app/.env`. The dashboard already counts `SSL_VERIFICATION`-classified
      requests separately, toward the 100 floor.
- [ ] **T4b.4** *User:* deploy CertWatch publicly. Config ready (`app/Dockerfile`, `app/fly.toml`,
      scale-to-zero is fine here — nothing spot-checks the app). Then get **other people** using it;
      real demand counts for far more than self-generated traffic.

## Phase 5 — Build in public (runs in parallel from day 1, not at the end)

- [ ] **T5.1** Start the X log — see [docs/BUILD_IN_PUBLIC.md](docs/BUILD_IN_PUBLIC.md). Judged on
      every track. (G11)
- [ ] **T5.2** Post at each milestone: intent chosen, endpoint live, registered, first traffic, ranked.
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
