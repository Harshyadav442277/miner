# GAPS.md — honesty ledger

What we do not know, have not verified, or have deliberately left undone. Feeds the README's
"Assumptions & Limitations" and stops unknowns from being quietly rounded to "fine."

Status: `OPEN` unresolved · `CHECKING` in progress · `CLOSED` resolved, with the answer

---

## Blocking

### G1 · Which intent to claim — `CLOSED: SSL_VERIFICATION`
Decided on occupancy **and scoring tier** → [track1-track1-miner/miner/docs/INTENT_OCCUPANCY.md](track1-track1-miner/miner/docs/INTENT_OCCUPANCY.md).
Tier A (exact match), 3 incumbents, all three with exploitable weaknesses. The zero-occupancy
intents turned out to be Tier B (LLM-judged) and were rejected for it.


### G2 · Runtime for TLS inspection — `CLOSED: Node, not Workers`
Confirmed by spike: Workers' `fetch` does not expose peer certificates; Node's
`tls.connect()` + `getPeerCertificate()` does, and was verified working against the full
badssl.com suite (valid, expired, self-signed, hostname-mismatch, untrusted-root, unreachable).
Hosting is therefore Node on an always-on machine — `fly.toml` pins `min_machines_running = 1`
precisely because scale-to-zero would read as spot-check failure (A3).

### G3 · Assumption that weather would be crowded — `CLOSED (confirmed)`
`WEATHER_CHECK` 8 miners, `WEATHER_FORECAST` 9 — among the most contested on the board. The
"avoid the docs' example" thesis holds.

Recorded alongside it: the **`ONCHAIN_TX_LOOKUP` suggestion was wrong** — 10 miners, tied
second-most crowded. Picking by domain familiarity would have bought a rank-4 zero. Crypto-native
intents are where crypto-native entrants cluster.

## Unverified protocol facts

### G4 · How answers are scored — `CLOSED (and the original answer was wrong)`
Scoring is a sandboxed WASM module receiving **three plain strings** — `question`, `ground_truth`,
`miner_answer` — and returning an f32 in [0,1]. That much held.

**Both conclusions drawn from it were wrong, and measurement killed them (2026-08-27):**

- *"Verbose answers are penalised, so keep `reason` terse."* Wrong. Fuller answers win, provided
  every added fact was asked for. Naming the ISP in a geolocation answer moved it 0.0103 → 0.9936.
  Trimming the SSL answer on the terseness premise cost 11% and was reverted.
- *"The champion module is not published, so this is inference, not fact."* Wrong. Every intent's
  champion is listed at `/api/wasm` as commit-pinned WASM, and `/scores?intent=X` returns the real
  questions, ground truths and the exact `converted_answer` that was scored. Running the champion
  locally **reproduces the reported score exactly** — we matched all 8 epoch-286 scores. It is now
  fact, and it is our main tool.

One correction that matters more than either: the scorer reads **`converted_answer`**, Telegraph's
prose conversion of our JSON — not the raw JSON and not `label_field`.

Superseded scoring model: `track1-miner/tools/score-sim.mjs` encodes the dead terseness theory. Do
not use it. Use `tools/bench-champion.mjs`.

### G5 · `example-miner.yaml` — `CLOSED (does not exist where the docs say)`
Not in `telegraph-usecases` — that repo contains six reference **Track 3 applications**, not miner
YAMLs. `telegraph-examples`, cited in the scoring-module docs, returns 404. The file may be
private or unpublished.

Mitigated: `miner.yaml` was written against the field reference and passes a local strict-schema
precheck (top-level keys, `endpoints[]` keys, `signal_mapping` keys, slug pattern, base_url scheme).
The authoritative check remains the sandbox at integrate.telegraphprotocol.com before we spend gas.

### G6 · Truncated doc pages — `OPEN`
Both [YAML Configuration] and [Registering as a Miner] were read at a character cap and cut off
mid-section — the tail of the validation-failures table and the troubleshooting table respectively.
Something in the cut region may matter.
**Resolve:** re-read the tails, or pull the markdown from the docs repo.

### G7 · Base Sepolia access — `CLOSED`
Wallet funded (0.005 ETH), registration sent and confirmed, miner active. The console handled RPC,
so no Alchemy key was ever needed.

### ~~G7 (original)~~ — `OPEN`
Registration needs an RPC endpoint (docs show Alchemy) and testnet ETH for gas. Neither exists yet.
Also unverified: whether the web console handles RPC itself, making this moot for the console path.

## Deliberately out of scope

### G8 · Track 2 and Track 3 — `CLOSED (excluded)`
Script Author and Application tracks are not being attempted in H1. Recorded so the choice reads as
a decision rather than an oversight. Track 3 opens Aug 31 and needs live miners; revisit for H2.

### G9 · `on_chain` block omitted — `CLOSED (excluded)`
Per ARCHITECTURE A9. Cost: our miner **cannot be targeted by ERC-8183 on-chain jobs at all** — the
node has no way to build the call without `on_chain.request`. We serve HTTP and WebSocket traffic
only. Accepted for H1; this is a real capability we are giving up, not a no-op.

### G10 · Monitoring — `CLOSED`
`tools/watch.mjs` polls both our endpoint and `/api/miners/<registrationId>`; exits non-zero on a
terminal rejection. `.github/workflows/uptime.yml` runs it every 15 minutes from outside our
machine and opens an issue on failure — the rules require the miner live through Sep 7, and a
closed laptop is not a monitoring strategy. `tools/verify-deploy.mjs` gates registration on a full
acceptance pass.

**Residual:** 15-minute polling against a ~20s spot-check cadence means a revocation can still go
unnoticed for up to 15 minutes. Acceptable, but not instant.

## Process risks

### G11 · Judging weights social reach, and we have no plan yet — `OPEN`
Every track lists "Progress updates posted on X" and "Engagement & reach on those posts" as
criteria. Track 1 additionally counts "number of applications built on your Miner" and "total
requests served" — both demand-side, neither controlled by code quality.
[docs/BUILD_IN_PUBLIC.md](docs/BUILD_IN_PUBLIC.md) sketches a cadence; it is not being executed yet.
**Honest read:** this is the part most likely to be neglected and it is weighted like the rest.

### G12 · Hackathon rules — `CLOSED` → [docs/JUDGING.md](docs/JUDGING.md)
Worth having read early: it corrected our deadline by a week (Track 1 closes **Aug 31**, not Sep 7),
revealed the exact scoring split (**75% performance / 25% X**), and surfaced G13 below.

### G13 · Intent may not be prize-eligible — `OPEN, mitigated two ways` · **highest-severity risk**

**Sharpened 2026-08-26 by live data:** `SSL_VERIFICATION` has **17 lifetime requests** across the
whole network. The 100-request floor is not a formality there — it is most likely unreachable
without manufacturing the traffic ourselves. Mitigated by breadth: the miner now also serves **`STORM_ALERT`** (334 requests, 3 miners) and
**`WEATHER_FORECAST`** (941 requests — the network's highest — 9 miners, all scoring under 0.008),
giving three independent eligibility paths instead of one. See [docs/MARKET_DATA.md](docs/MARKET_DATA.md).

> An Intent must have at least 3 active Miners **and receive at least 100 real requests from
> Track 3 applications** to be eligible for global cash prizes.

`SSL_VERIFICATION` clears the first condition (4 miners once we register). The second is
**entirely outside our control**: it depends on other people choosing to build applications that
check SSL certificates. We can hold rank 1 with a flawless score and win nothing.

**Mitigation built:** [app/](track3-certwatch/) — CertWatch, a TLS expiry monitor. It uses the **auto-routed**
engine endpoint so Telegraph's own router classifies each query, meaning demand lands on the intent
rather than being aimed at our miner. It counts `SSL_VERIFICATION`-classified requests separately.
Bounded honestly per rule 04: a certificate monitor has a real reason to check certificates
repeatedly, and being routed to a competitor is an accepted outcome.

**Residual risk:** 100 requests may still not be reachable from one app used by one person, and
**self-generated demand is the weakest kind** — the rules say requests must come "from Track 3
applications", which we satisfy literally, but the spirit is real adoption. Getting other people to
use CertWatch (T4b.4) matters more than running it ourselves. We also still cannot verify the
current per-intent count — no public counter has been found. This remains the single most likely
way the project produces excellent work and zero prize.

### G15 · We published a wrong competitive claim internally — `CLOSED (retracted)`
We asserted across three documents and a draft X post that the rank-1 incumbent was beatable
because Render cold-starts. Measurement: **675ms cold, 324ms warm — no cold start**, because
validators spot-check every ~20s and keep it warm. The competitor also does a real TLS handshake,
so our "handshake vs CT logs" edge applies to `certspotter`, not to them.

Retracted everywhere. Recorded because the failure mode is the point: it was an inference stated
as a fact, repeated until it felt established, and one `curl` disproved it. Measure claims about
competitors **before** they reach a public post.

### G14 · x402 docs are drifted from the shipped SDK — `CLOSED (worked around)`
The docs show `createSigner` from `@x402/evm`; the published package (2.23.0) exports
`toClientEvmSigner(account, publicClient)` instead, and `wrapFetchWithPayment` takes an
`x402Client` built via `x402Client.fromConfig({schemes:[...]})` rather than a bare signer. Also
needs `viem`, which is ESM-only — so the app is ESM while the miner stays CommonJS.
Resolved by reading the shipped `.d.ts` files rather than the docs. Worth remembering: **the
Telegraph docs lag their own SDK**, so verify against the package, not the page.

### G16 · The protocol node is a single point of failure for us — `OPEN`
`devnode.telegraphprotocol.com` was fully unreachable for at least three consecutive 20s probes on
2026-08-26 while our own miner served normally. Everything we depend on for *observability* —
activation status, catalog, intents, scores — runs through that one host, and so does the
registration console.

Implications we cannot engineer away:
- A node outage during the grace period may cost us scored epochs through no fault of ours.
- `updateMiner` (the pending IP_GEOLOCATION addition) cannot be executed while it is down.
- Our uptime workflow polls `activation_status` through the same host, so a node outage will look
  like a miner problem in our own alerting. Worth distinguishing in `tools/watch.mjs` if it recurs.

### G17 · CertWatch paid endpoints were unauthenticated — `CLOSED`
Found by the Codex review: `POST /api/check` and `POST /api/domains` triggered paid Telegraph
calls with no authentication, so a funded wallet was a public drain button.

Three independent layers now, because each fails differently: a constant-time `ADMIN_TOKEN`
check stops strangers; a fixed-window rate limiter stops a loop from whoever holds the token; and
`MAX_PAID_CALLS_PER_DAY` bounds the worst case regardless. **The cap defaults to 0**, so a
deployment without a deliberate budget cannot spend anything at all.

Verified in production: all three paid routes return 503 while `ADMIN_TOKEN` is unset, and
`/api/state` now publishes `writesEnabled`, `paidCallsToday`, `paidCallsPerDayCap`.

### G18 · CertWatch state is ephemeral and sweeps do not run on Vercel — `CLOSED (reopened 2026-08-28, then actually closed)`
Fixed by moving both responsibilities out of the serverless app rather than adding a database.
The sweep runs in `.github/workflows/certwatch.yml` on a 6-hourly cron and **commits its results
to `app/data/history.json`** — git is the durable record, Actions is the scheduler, and neither can
silently lose a paid result. The app now reads that committed file over HTTP and reports
`historySource: "committed" | "instance"` so it is obvious which it is showing.

The workflow gates on `EVM_PRIVATE_KEY` being present as a repository secret and exits cleanly when
it is not, so an unfunded repo does not fail a scheduled run every six hours.

**Reopened 2026-08-28 — the above was true of the design and false of the deployment.** Root
`.gitignore` contained a bare `data/`, which matches `track3-certwatch/data/` at any depth. So the
committed-history mechanism could never have worked: `git add` silently refused the file,
`git diff --quiet` saw no tracked change and the workflow logged "no change" on every run. The file
was never pushed, `raw.githubusercontent.com/.../track3-certwatch/data/history.json` returned
**404**, `loadCommittedHistory()` fell through to `null`, and production reported
`historySource: "instance"` — ephemeral, exactly the condition G18 claimed to have fixed. The
workflow was green only because no wallet is configured and it skips the paid work entirely.

A green CI check and a closed gap are not the same thing. This one was closed on the strength of
the design without a read-back through the real path.

**Actually fixed 2026-08-28:** `.gitignore` now negates the path (`!track3-certwatch/data/` then
`!track3-certwatch/data/history.json` — the directory must be re-included first or the file
negation cannot apply), and `history.json` is tracked, so the raw URL resolves. Verified: the file
is staged as `A`, where before the same `git add` was a no-op.

**Still open, and it is the part that matters:** no sweep has yet written a record through the real
path, because `EVM_PRIVATE_KEY` is unset and CertWatch has no outside users. The mechanism is
proven; the demand is not. See `track1-miner/docs/ELIGIBILITY.md` §4.

### ~~G18 (original)~~
Also from the Codex review. `track3-certwatch/src/store.ts` writes to `/tmp`, which a serverless instance does
not keep, and `track3-certwatch/src/server.ts` disables the background sweep loop under Vercel because a frozen
instance never fires an interval. So CertWatch currently has no durable history and no scheduler.
**Fix:** move state to a real store and drive sweeps from a scheduled GitHub Action hitting the
authenticated endpoint, rather than an in-process timer.
