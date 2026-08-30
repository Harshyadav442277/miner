# MEMORY.md — session continuity

**Read this first every session.** Update it at session end. It is the handoff medium between
sessions and between models.

---

## Where to go, by track

| Working on | Read |
|---|---|
| **Track 1 — miner** | **[track1-miner/MEMORY.md](track1-miner/MEMORY.md)** — the authoritative Track 1 handoff. Current state, what needs the operator, the rules that survived measurement, and the theories that did not. |
| **Track 2 — scorer** | [track2/MEMORY.md](track2/MEMORY.md) |
| **Track 3 — app** | [track3-certwatch/](track3-certwatch/), plus G17/G18 in [GAPS.md](GAPS.md) |
| Anything | [README.md](README.md) for ownership and shared facts, [docs/](docs/) for protocol and rules |

## State at 2026-08-30

**Epoch 292 took back two firsts, and the reason turned out to be the biggest single finding of the
project.** Registration **297** is `active`, healthy, six intents, `https://miner-wine.vercel.app`.

```
SSL_VERIFICATION      #2   0.00885159   lost by 1.75%
WEATHER_FORECAST      #5   0.00908315   field is now 14 miners
STORM_ALERT           #1   0.01003684   held by 0.7%
IP_GEOLOCATION        #1   0.00933759   held
LANGUAGE_TRANSLATION  #1   0.00010760   held
ACADEMIC_SEARCH        -   not scored this epoch
```

**Root cause, shared by both losses:** every ground truth in these intents is an LLM answer that
**restates the request before answering it**, and ours did not. The champion scorers are a cliff on
that resemblance — about 0.99 above it, about 0.01 below — and the whole weather field has always
been on the losing side, which is why its leader changes nearly every epoch.

**Fixed and measured, not yet deployed.** `miner/src/restate.ts` + `sendAnswer` in
`miner/src/handler.ts`. Built miner A/B'd against live production on the same questions and the live
champion scorers: **weather 8.10x, SSL 18.84x, storm 20.44x**; under a 32-word conversion budget
**6.36x / 11.15x / 1.51x**. 102/102 tests pass.

Full autopsy: **[track1-miner/docs/EPOCH_292_AUTOPSY.md](track1-miner/docs/EPOCH_292_AUTOPSY.md)**.
Expansion recon: **[track1-miner/docs/EXPANSION_TARGETS.md](track1-miner/docs/EXPANSION_TARGETS.md)**.

### The three things that need a human, in order

1. **Deploy the restatement fix** — `vercel --prod` from `track1-miner/miner`, then re-run
   `node tools/verify-deploy.mjs https://miner-wine.vercel.app`. Pushing does not deploy (G22).
   Epoch 293 is the measurement.
2. **Post the X series.** 25% of the Track 1 score and the largest unclaimed block. Thirteen posts,
   each verified under 280 characters and tagged: **[docs/X_POSTS.md](docs/X_POSTS.md)**. The
   scorer-cliff finding is genuinely new material and should be posted with the fix.
3. **Ask the organizers** whether the 100-request Track 3 guardrail is waived, measured later, or
   binding on Aug 31 — Track 3 has not opened, so no intent can meet it. Still unanswered.

### Read these before touching anything

- **[GAPS.md](GAPS.md) G24 — the `/scores` feed has stopped returning `question`, `ground_truth`
  and `converted_answer`.** Every real finding in this repo came from that feed. The offline benches
  are now a frozen snapshot that **cannot be refreshed**, and the champion WASM can no longer be
  validated against reported scores.
- **[GAPS.md](GAPS.md) G25** — the restatement's survival through the ~32-word converter is
  simulated, not measured. Storm is the risky one: 4 of 12 questions score lower on full prose and
  we hold storm by 0.7%.
- **[GAPS.md](GAPS.md) G19 — the miner wallet's seed phrase is compromised.** Risk assessed and
  **accepted**, not mitigated. If the miner is ever found deregistered, that is the likely cause.
  Its tripwire is weaker than G19 assumes — see G21.
- **[track1-miner/MEMORY.md](track1-miner/MEMORY.md)** — the authoritative Track 1 handoff.
  Seven scoring theories have now been disproven in this repo. Do not re-derive them.

### Eligibility is still the binding constraint

Five of six intents clear the 3-miner half; `IP_GEOLOCATION` has 4 now but **no intent has its 100
Track 3 requests**, because Track 3 has not opened — `total_requests_served` is **57** for the whole
miner across all six intents, against a floor of **100 per intent**. Rank 1 in an ineligible intent
wins nothing → [track1-miner/docs/ELIGIBILITY.md](track1-miner/docs/ELIGIBILITY.md).

---

Everything below this line is **historical** — the day-by-day record of how Track 1 got here. It is
kept because the reasoning is often more useful than the conclusion, but for current Track 1 state
read `track1-miner/MEMORY.md` instead. Registrations **225 and 236 are superseded**; the live one is
**260** (six intents, active 2026-08-28).

---

## 2026-08-27 — TRACK 2 PIVOT


Build focus moved to **Track 2 (Script Authors)** by user directive: rank 1 is the goal, Fable
orchestrates and plans, Opus 5 executes (all security-domain work on Opus). All Track 2 state
lives in [track2/MEMORY.md](track2/MEMORY.md) — read that first when working Track 2. The miner
(registration 225) stays live and untouched; everything below remains true for Track 1 operations.

---

## Where things stand — 2026-08-26

**Day 1.** Planning only. No code, no YAML, no registration. Repo is docs and a fresh `git init`.

### Done
- Hackathon account registered (`harsh.2024a@vitstudent.ac.in`), email verified, **Discord joined**
- **Track 1 (Miner)** chosen
- Protocol mechanics verified against live docs → [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md)
- Planning docs written: PRD, ARCHITECTURE, TASKS, GAPS, BUILD_IN_PUBLIC

### The finding that reframed the project
**`base_url` is the UPSTREAM API being wrapped — not a server we have to write.** Telegraph is
declarative: publish a YAML describing an existing API, nodes proxy to it. A valid miner can be
**pure YAML with zero code**.

An earlier session assumption — that a Cloudflare Worker had to be built and deployed first — was
wrong as a *requirement*. Hosting our own endpoint is now a strategic option (differentiation,
latency control), not a gate. See PRD **D2**.

### Intent decided: `SSL_VERIFICATION` — and why
Chosen on **occupancy × scoring tier** → [track1-miner/docs/INTENT_OCCUPANCY.md](track1-miner/docs/INTENT_OCCUPANCY.md).

Scoring has two tiers. **Tier A = deterministic WASM exact match** (one right answer).
**Tier B = LLM-judge** (open-ended). Tier A is strictly better for winning rank 1 — we can be
exactly right on demand, but cannot guarantee an LLM agrees with us.

The three zero-occupancy intents (`RESEARCH_SYNTHESIS`, `TEXT_AUTHENTICITY_CHECK`,
`TWITTER_SEARCH`) are **all Tier B**, which is why `TEXT_AUTHENTICITY_CHECK` was dropped despite
being the occupancy front-runner.

`SSL_VERIFICATION` is Tier A with **3 incumbents, each with a specific weakness**:
- **TxLens** (9002) — on Render, cold starts against a ~20s spot-check cadence; SSL is 1 of 8 caps
- **certspotter** (10) — answers from **CT logs** = what was *issued*, not what is *deployed*
- **ssllabs** (227) — a full Qualys assessment takes **60–120s** on an uncached host

### Built: `livecert`
[miner/](track1-miner/miner/) — Node, **zero runtime dependencies**, live TLS handshake. All six verdicts
verified against badssl.com (valid / expired / self_signed / hostname_mismatch / untrusted /
unreachable). ~100ms cold, **12ms cached**. Typecheck clean.
[track1-miner/miner.yaml](track1-miner/miner.yaml) written and passing a local strict-schema precheck.
`slug: livecert`, `id: 4433` — both verified free.

**Scoring insight driving the response shape:** the WASM scorer compares *plain strings* and the
reference module scores `matched ÷ total words in the miner's answer`. Verbose answers are
**penalised**. Our `reason` is one tight factual sentence on purpose — and SSL Labs returning a
full grade report is actively hurt by that arithmetic.

### Timeline correction — read this first
**Track 1 closes 2026-08-31**, not Sep 7 → [docs/JUDGING.md](docs/JUDGING.md). Sep 7 is Track 3's
close. **~5 days, not 12.** Registering early also matters because the 7-day grace-period score
sets the opening leaderboard position — every day of delay shortens the record we are judged on.

### Judging is published and explicit
`75 pts` normalized performance (**your score ÷ the best score in your intent** — so rank 1 in any
intent gets full marks) + `25 pts` **X engagement**, tagged `@Telegraphprotoc`.

**The biggest risk is the eligibility guardrail:** an intent needs ≥3 active miners *and* **≥100
real requests from Track 3 applications** to be eligible for cash prizes. `SSL_VERIFICATION` meets
the first (4 miners once we register) but the second is outside our control — we could rank 1 and
win nothing if no Track 3 app checks certificates. Mitigation: **build a Track 3 app ourselves
that genuinely consumes it** (a real TLS expiry monitor, not a request generator — rule 04 forbids
artificial inflation). That also competes for a second $2,000 pool.

### Also built
- `track1-miner/tools/watch.mjs` — uptime + routing-revocation watcher. `--once` mode for cron; exits non-zero
  on failure or terminal rejection.
- [SETUP.md](SETUP.md) — the two manual steps, written out precisely.
- [docs/X_POSTS.md](docs/X_POSTS.md) — 8 drafts. Posts 1–3 are postable now (they are insights,
  not status updates, which is what actually earns reach). Post 7 targets Track 3 builders before
  Aug 31 and is doing eligibility work, not marketing.
- Root [README.md](README.md) with an honest limitations section.

### Major correction: demand, not just occupancy → now serving TWO intents
Live data from `/api/miners` (89 miners, exposes `total_requests_served` + `scores`) →
[track1-miner/docs/MARKET_DATA.md](track1-miner/docs/MARKET_DATA.md).

**The whole network has served 1,574 requests. `SSL_VERIFICATION` has 17.**
`STORM_ALERT` has **334** with the same 3-miner field and the same near-zero top score (0.0066).

The original analysis optimised for low occupancy alone. But G13 needs **≥100 Track 3 requests to
the intent** — ranking first in a dead intent pays nothing. The miner now serves **both**
`SSL_VERIFICATION` and `STORM_ALERT` from one deployment (`/ssl-check`, `/storm-alert`): one Fly
app, one registration, two eligibility paths. TxLens proves one miner can rank in several intents.

**Live SSL_VERIFICATION leaderboard, epoch 283:** txlens 0.0063 (rank 1), ssllabs 0.0042,
certspotter 0.0000. The bar is extremely low. Notably `ssllabs` maps `label_field: host` and
`txlens` maps `label_field: status` (value `"ok"`) — neither is a verdict. Ours maps
`label_field: verdict`. Possible real edge, but inference about an unpublished scorer, not fact.

**We were wrong about something and fixed it:** we claimed TxLens was beatable on Render cold
starts. Measured 675ms cold / 324ms warm — **no cold start**, because ~20s spot checks keep it
permanently warm. TxLens also does a real TLS handshake. Claim retracted in docs and in the draft
X post before it was posted.

### Why the two chosen intents are winnable
Judging normalizes: **75 pts × (your score ÷ best score in your intent)** — so rank 1 gets the full
75 *regardless of absolute score*. The only number that matters is the bar in our own intent:

```
WEATHER_FORECAST  beat 0.0080   941 network requests, 9 miners — all under 0.008
STORM_ALERT       beat 0.0066   334 requests, 3 miners (leader maps label_field: model)
SSL_VERIFICATION  beat 0.0063   17 requests,  3 miners (leader maps label_field: status = "ok")
```

**The miner serves all three from one deployment** — `/ssl-check`, `/storm-alert`,
`/weather-forecast`. One Fly app, one registration, three eligibility paths against G13.
`WEATHER_FORECAST` was added last: highest demand on the whole network, and all nine incumbents
score under 0.008. 37 tests passing.

Both are the **lowest bars on the board**. Compare WEATHER_CHECK (0.768) or
WALLET_BALANCE_CHECK (0.992), where a real incumbent already answers well.

83% of all network scores are below 0.05. And shape is not the driver: `chainsight-oracle` uses one
mapping across 11 intents and scores 0.990 in one, ~0.00–0.07 in the other ten. Also note
`skywire-storm-alert` maps a sensible `label_field: level` and still scores 0.0000 — **a sensible
mapping is not sufficient**. Our edge is a reasoned bet, not a measured result.

### DEPLOYED: `CertWatch` — `https://app-five-blond-45.vercel.app`
Live on Vercel. Dashboard renders, `/api/state` returns 200, `keyConfigured: false` correctly
reported until an EVM key is set. Vercel project renamed `app` → `certwatch`, but the stable
public alias stays `app-five-blond-45.vercel.app` (`certwatch.vercel.app` is taken by someone else).

Two serverless adaptations were needed, both real bugs that would only have appeared in production:
- **Read-only filesystem.** State now falls back to `/tmp` on Vercel and `save()` swallows write
  failures, so a read-only FS cannot take the dashboard down. `WATCH_DOMAINS` (comma-separated)
  seeds the watchlist since `/tmp` does not survive cold starts.
- **`Invalid export found in module server.js`.** Vercel used `package.json` `main` as the
  entrypoint and found no default export. Fixed with `export default app` (an `http.Server`, which
  Vercel accepts); `listen()` is skipped when `process.env.VERCEL` is set.
- The dashboard HTML is now **inlined** into `src/dashboard.ts` rather than read from disk —
  serverless bundlers do not reliably ship sibling asset directories. Generated by
  `npm run build:dashboard` from `public/index.html`, escaped via `JSON.stringify` (a template
  literal was a bug farm: the dashboard's own client script contains backticks and `${...}`).

### Built: `CertWatch` (Track 3 app)
[app/](track3-certwatch/) — TLS expiry monitor. ESM Node + viem + `@x402/fetch`/`@x402/evm`, dashboard tested
and rendering. Uses the **auto-routed** `/engine/v1/ask` so Telegraph's router classifies the
query and demand lands on the *intent* (what the G13 guardrail counts), not on our miner directly.
Counts `SSL_VERIFICATION`-classified requests separately.

**Gotcha worth remembering:** the Telegraph docs are **drifted from their own SDK**. Docs say
`createSigner` from `@x402/evm`; the shipped 2.23.0 exports `toClientEvmSigner(account, publicClient)`
and wants an `x402Client.fromConfig({schemes})`. Read the `.d.ts`, not the page.

### DEPLOYED 2026-08-26 — `https://miner-wine.vercel.app`
Live on Vercel, **all 18 acceptance checks pass** (`node track1-miner/tools/verify-deploy.mjs <url>`).
Median 482ms, p95 1200ms. TLS handshake works from serverless — that was the main technical risk.

Fly.io was tried first and rejected: it now demands a payment method before placing any machine.
Vercel needs no card, and the live Telegraph miner `amanat-weather-risk` already runs there.
The miner was refactored for it — routing lives in `src/handler.ts`, shared by `src/server.ts`
(local) and `api/index.ts` (serverless), so neither target has a divergent copy. Fly config stays
committed if a card is ever added.

`track1-miner/miner.yaml` now points at the deployed URL and re-passes the schema precheck. Re-verified
2026-08-26: all three intents canonical, `id 4433` and `slug livecert` both still free.

### Repo + monitoring live — 2026-08-26
`https://github.com/Harshyadav442277/livecert` — **PRIVATE**. Created private deliberately:
publishing is the user's call, and `track1-miner/docs/MARKET_DATA.md` contains competitive analysis of other
hackathon entrants' weaknesses. Publishing that under their name mid-competition is a judgement
they should make, not me.

Repo variable `MINER_BASE_URL` is set, and the **uptime workflow ran successfully from GitHub's
runners: all 18 checks pass, median 267ms, p95 1013ms**. Add `REGISTRATION_ID` as a repo variable
once registered so it also watches `activation_status`.

**Caveat if it stays private:** free-tier private repos get 2000 Actions minutes/month; a 15-minute
cadence is ~2900/month. Either make the repo public (unlimited Actions) or widen the cron.

Secrets scan before the push came back clean — no `.env` tracked, no key-shaped strings, no
password in history.

### REGISTERED ON-CHAIN — 2026-08-26 ~20:20 IST
```
registrationId   225
tx               0x55b4d8e736c9625e…503348bc   (Base Sepolia, CONFIRMED)
slug             livecert
id               4433
base_url         https://miner-wine.vercel.app
fee address      0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e
floor price      0.01 USDC
intents          SSL_VERIFICATION, STORM_ALERT, WEATHER_FORECAST
IPFS             QmWmgbY7pbUdWo1ZPVHEh7Bbq1hGQGwVCCcyLxZToEzW2c
```
Registered via the console's **Import & Upload** path (card 02), not the from-scratch wizard —
it takes the existing track1-miner/miner.yaml, sandbox-tests every endpoint, and pins to Pinata.

Sandbox results: all three endpoints green. `/ssl-check` reported HTTP 405 because the probe used
OPTIONS (not GET as labelled); real GET traffic returns 200. Hardened anyway — the server now
answers OPTIONS with 204 + Allow. That redeploy does **not** change base_url or the pinned hash,
so it did not disturb the registration.

`REGISTRATION_ID=225` is set as a repo variable, so the uptime workflow now watches
`activation_status` as well as the endpoint.

**`activation_status: active` confirmed 2026-08-26 14:51 UTC.** Present in all three intent
listings: SSL_VERIFICATION 3→4 miners, STORM_ALERT 3→4, WEATHER_FORECAST 10→11. Network 90→91.

**Routed queries cost $0.01 USDC (x402, Base Sepolia).** `/engine/v1/ask` returns 402 without
payment. The wallet holds **0 USDC** — so CertWatch cannot yet generate the routed demand that the
eligibility guardrail (G13) requires. ~$1.00 buys the 100-request floor. Needs: testnet USDC from
faucet.circle.com, and `EVM_PRIVATE_KEY` set as a Vercel env var by the **user** (Claude never
handles keys).

**Free-text input handling added 2026-08-26 (important).** The engine classifies a
natural-language question and may hand the miner the raw sentence. Before the fix,
`?query=Is the SSL certificate for expired.badssl.com valid?` returned **HTTP 400** — a scored
question answered with an error is a zero. Now all three endpoints extract the parameter from
free text (`src/extract.ts`), while still rejecting typo'd fragments like `"exa mple.com"`.
57 tests pass; p95 latency improved 1136ms → 523ms.

**Scoring intelligence (2026-08-26)** → [track1-miner/docs/SCORE_INTELLIGENCE.md](track1-miner/docs/SCORE_INTELLIGENCE.md).
Three things settled by live data:
1. **Multi-intent miners are scored independently per intent** — `txlens` holds rank 1 in three
   intents and rank 5 in another simultaneously. Breadth is free upside; a weak intent cannot drag
   down a strong one.
2. **Only rank matters, not absolute score.** Rank 1 gets the full 75 whether the score is 0.99 or
   0.006. The bars to beat: SSL **0.00627648**, STORM **0.00657676**, FORECAST **0.00800136**.
3. **Refusing natural language scores zero, not badly.** `chainwire` (0.992) parses a whole
   question from `?query=`; `txlens` (0.000, same intent) returns an error object. The scorer
   compares text and an error shares no vocabulary with the ground truth. We had this exact bug
   until today.

**Answer shape measured, not assumed.** `track1-miner/tools/score-sim.mjs` runs our live answers through the
documented reference scorer against the incumbents' answer shapes: **ours 0.9453**, certspotter-style
0.0569, ssllabs-style 0.0385, txlens-style 0.0238. Live bar to beat is 0.0063. Removing a
`(35 days remaining)` parenthetical from the prose — while keeping `days_remaining` as a field —
moved the mean 0.7697 → 0.9453. Rule: facts in fields, answer in prose, nothing in the prose the
question did not ask for.

**Telegraph devnode was DOWN at 2026-08-26 ~15:45 UTC** — three consecutive 20s timeouts on
`devnode.telegraphprotocol.com` while our miner answered in 0.5s and the wider internet was fine.
Not our outage. While it lasts: no scoring, no catalog reads, and the registration console likely
cannot complete an `updateMiner`. Re-check before assuming anything is wrong on our side.

**Codex review landed 2026-08-26** → `track1-miner/docs/codex-worklog/`. It found two real defects that local
tests could not: (1) the natural-language regexes were built from strings, so `\s` `\d` `` were
corrupted and the scaffolding stripper was dead — now regex literals; (2) real *paid* storm
questions ask for coordinates in prose with a stated window and a 0–1 risk, and we returned
`unknown` — now handled, with the hourly series actually truncated to the requested window.

It also corrected two of our claims: `total_requests_served` is per **miner**, not per intent, so
the demand attribution in MARKET_DATA was unsound; and the cross-intent prize aggregation is
genuinely undefined in the rules, so **do not `updateMiner` to add intents** until the organisers
answer. The IP_GEOLOCATION endpoint is built and deployed but that intent is NOT registered.

**Do not fund CertWatch's wallet** until G18 is closed — its endpoints are now authenticated
(G17) but state is still ephemeral and sweeps do not run on Vercel.

**FIRST SCORED EPOCH 284 (2026-08-26)** → [track1-miner/docs/EPOCH_284.md](track1-miner/docs/EPOCH_284.md)
```
SSL_VERIFICATION   rank 3 of 4    0.00449282   (rank 1 txlens 0.00601)
STORM_ALERT        rank 3 of 4    0.00000000   (rank 1 amanat  0.00651)
WEATHER_FORECAST   rank 7 of 11   0.00698984   (rank 1 verity  0.00992)
```
**`track1-miner/tools/score-sim.mjs` was wrong.** It predicted 0.9453 for us vs 0.02–0.06 for the incumbents;
reality has txlens ahead of us. It used the documented *reference* scorer and ground truths written
by hand — neither is what runs. Do not make decisions from it.

**Focus `STORM_ALERT`.** Three of four miners there scored exactly 0.0. It is the only one of our
intents with real recurring demand (15 real questions in 72h; SSL had **zero**). Our zero is
plausibly stale — the coordinate/window fixes landed around the 15:52 scoring time and `"right now"`
after it. We now answer 15/15 of the real corpus. **Epoch 285 is the test.**

**EPOCHS ARE 9 HOURS LONG.** `/api/epoch` on the explorer: `epoch_duration: 9h0m0s`. Scoring lands
~3× a day, not every few minutes — the landing-page ticker misleads. Epoch 285 lands
**2026-08-27T00:36:55Z**. Do not poll for score changes shortly after deploying; verify with
`track1-miner/tools/replay-corpus.mjs` instead, which answers in seconds.

**HOW SCORING ACTUALLY WORKS** (Codex recon, `track1-miner/docs/codex-worklog/2026-08-26-live-scoring-recon.md`)
The score API exposes `question`, `ground_truth`, `miner_answer`, **`converted_answer`**, and
`score`. Running the live champion WASM locally reproduces the reported score **exactly** from
`converted_answer` — the natural-language conversion of our JSON, not the raw JSON and not
`label_field`. That kills the label-field hypothesis for good and gives a real offline loop:
pin the champion binaries and iterate without waiting 9 hours.

**Two gates now:** the endpoint must return the right structure, AND Telegraph's converted prose
must retain every requested fact.

**Codex's P0 queue, with measured leverage:**
1. `WEATHER_FORECAST` — **DONE.** Questions name an explicit **start date** ("48 hourly values starting
   2026-09-01T06:00Z"); we return "next N hours from now". Truthful date-aware candidate scored
   **0.996 vs our 0.0070 — 142x**, and 100x the epoch leader. Now parsed and sliced by timestamp,
   with the full hourly series and precipitation in both structure and prose. The live answer's
   temperature range (24.5–30.5°C) matches Codex's independently measured values exactly.
2. `SSL_VERIFICATION` — **DONE.** Answers now carry the dimensions the questions ask about,
   rendered from real fields: chain length and completeness (walked via `issuerCertificate`),
   Subject Alternative Names, hostname validation, trust path. An unreachable host no longer
   stops at "DNS failed" — it names what could not be established and how to establish it.
**THE STORM ZERO'S ROOT CAUSE** — the `/scores` API gives the actual record. The engine called us
with `location=""` (present but empty); our `??` chain does not fall through on an empty string, so
we never read `query`, never saw the question, and returned **400**. The engine treats any 4xx as a
failed call: empty `miner_answer`, no `converted_answer`, score **0**. A well-shaped 400 body is
worthless because it is never read. Fixed: empty params treated as absent, and **no endpoint
returns 4xx any more** — an unanswerable request gets an honest 200.

3. `STORM_ALERT` — **DONE.** "in 44 hours" is a *point* offset, not a window; we returned the
   44-hour maximum (gusts 70.9) where the paid responder returned the value at hour 44 (49.7).
   Now `time_mode` point/window with `valid_at`, and the replay harness checks `valid_at` lands
   near the hour asked rather than just echoing a number.

**OFFLINE SCORING LOOP EXISTS.** Champion scorers are public commit-pinned WASM (24 MB each, from
`/api/wasm`), and `track1-miner/docs/codex-worklog/probe-champion.mjs` runs them. Measured on the epoch-284 storm
question: what actually scored **0.0** (our 400), terse **0.00658**, full answer **0.00753**, plus
reverse-geocoded place name **0.00819** — against a leader of **0.00651**, so **1.26x**.
**Fuller answers score better**, disproving the terse-answer theory. Trust the champion binary, not
`track1-miner/tools/score-sim.mjs`.

**ALL THREE INTENTS NOW MEASURE ABOVE THE EPOCH-284 LEADER** (real champion WASM, real questions):
```
SSL_VERIFICATION   0.00449 -> 0.01061   leader 0.00601   1.77x
STORM_ALERT        0.00000 -> 0.00819   leader 0.00651   1.26x
WEATHER_FORECAST   0.00699 -> 0.99482   leader 0.00992    100x
```
Weather needed three bugs fixed: the whole question was being geocoded (resolved Tokyo to
**Guangzhou**), question openers like "Can" passed as proper nouns, and "48-hour" did not parse
because a hyphen is not whitespace. All found by measuring, none by reading code.

**BENCHMARKED OVER 12 REAL QUESTIONS PER INTENT** (`track1-miner/tools/bench-champion.mjs`, real champions):
`SSL 0.00913 · STORM 0.00938 · WEATHER 0.17346`. Single-question results were misleading — weather
scored 0.99 on the one question it was written against and ~0.008 on eleven others, because
"7-day"/"five-day"/"next Monday"/"September 1, 2026" did not parse. Fixed via `resolveDateRequest`.

**NEVER RETURN NON-2XX.** The engine treats any non-2xx as a failed call: empty answer, no
conversion, score 0. A transient Open-Meteo rate limit was returning **502** and costing whole
questions. All upstream failures now return 200 with an honest "temporarily unavailable" answer.

**Coordinates with hemisphere letters** (`39.6438° N, 104.8669° W`) now parse, including the
mangled `Â°` and U+FFFD forms real traffic carries. W/S are negative — reading `104.8669° W` as
positive answers for China instead of Colorado. The storm benchmark mean dipped slightly
(0.00938 -> 0.00912) because two questions previously *failed* and now resolve; correctness beats
the benchmark, so this was kept.

**Weekday/month names are no longer treated as places.** "New York City starting next Monday"
resolved to **Munḏay**, a real town — a confident forecast for the wrong continent. Fixed.

**Do not chase the low weather scores by declining to answer.** Most of those ground truths
themselves say "I cannot provide the exact forecast", so a refusal would score higher. That is
gaming the scorer rather than answering the buyer (Rule 04). The one question with a real ground
truth is the one we score 0.99 on.

**THE RULE THAT SURVIVED EVERY MEASUREMENT: answer every clause of the question; keep in fields
what was not asked.** Naming the ISP in a geolocation answer moved it **0.01027 -> 0.99362 (97x)**.
Every large gain today came from finding a clause going unanswered — storm threshold, weather
period and place, SSL chain/hostname, geolocation ISP. Every attempt to tune phrasing instead
(terse vs verbose, label_field, word-overlap) failed.

**MEASUREMENT TRAP:** a candidate answer written by hand while reading the ground truth leaks that
ground truth. A storm candidate scored 0.614 that way; the honest implementation scores 0.0086
(+4.7%, still kept). **Only measure answers produced by the deployed code.**

**TWO STRUCTURAL FINDINGS FROM EPOCH 285:**
1. **The engine sends only declared parameters, never the question.** #1 weather declares `q`,
   #1 storm declares `lat`/`lon`; we declared neither and failed exactly those question types.
   Code now accepts them; **the YAML change needs an updateMiner (wallet action, pending).**
2. **Prose conversion has a size limit.** Our epoch-285 SSL answer was 862 bytes and
   `converted_answer` came back **EMPTY** — every miner that converts is under ~430. Trimmed to
   509-638 bytes; measured score barely moved (0.00949/0.01064 vs txlens 0.00826). A test pins
   the response under 650 bytes.

**THERE IS NO CONVERSION SIZE LIMIT — that theory was wrong.** Across 480 scored answers,
conversion fails ~6.7% of the time at **every** size: `weatherapi` converts 52,943 bytes fine,
`ssllabs` failed at 161 bytes. Our 862-byte empty conversion was intermittency, not a threshold.
Trimming the SSL answer on that false premise cost **11%** (0.01061 -> 0.00949); restored.
The storm period breakdown stays removed on its own measurement (0.00892 with, 0.00902 without).

**ECHO THE QUESTION'S OWN IDENTIFIERS.** Resolving `37.7749,-122.4194` to "San Francisco" and
answering with only the place name dropped the identifier the caller used. Adding the coordinates
back **doubled** the score (0.00676 -> 0.01347); with a u-component note, 0.01456. Deployed answer
now scores **0.01327 vs zeus 0.00802 — 1.65x the rank-1 storm miner.** Also added metres per second
and prevailing wind direction: `10u`/`100u` are the *directional* components of the wind vector, so
a scalar speed answers a different question.

**LABEL THE ANSWER WITH THE QUESTION'S OWN TERMS.** SSL questions ask for "certificate validity,
chain trust, hostname verification"; storm questions say "Report wind speed, gusts, precipitation
and an overall risk between 0 and 1". Answering under those exact labels, same facts:
SSL **0.01020 -> 0.01074**, storm **0.00835 -> 0.00862**. Same family as echoing coordinates — an
answer that visibly addresses each clause reads as answering it.

**GitHub throttles scheduled workflows.** The uptime/score-recording cron was set to `*/10` and
actually ran **once every 2-3 hours**. Changed to hourly, which is honest and ample against
9-hour epochs. Do not trust a sub-hourly GitHub cron to fire.

**BREADTH IS THE STRATEGY** — `chainsight-oracle` holds **11 intents and is #1 in four**, mostly
with small scores in quiet corners. It won by covering ground, not by answering better. We went
3 -> 4 (registration 236, live) and the YAML now declares **6**.

**FIVE new endpoints, every one targeting an intent whose incumbents are failing:**
- `/extract` -> `CONTENT_EXTRACTION` (1 miner, **0.000 on all 6**; it is a URL extractor and the
  questions supply text inline). Deterministic regex; **5 of 6 reproduce the ground truth exactly.**
- `/translate` -> `LANGUAGE_TRANSLATION` (2 miners, **best 0.000**). MyMemory, keyless — the same
  API both incumbents are named after. Russian comes back exact, Mandarin off by one character.
- `/cve` -> `CVE_LOOKUP` (3 miners, **all 0.000**). NVD, authoritative and deterministic.
  Its 5-req/30s limit is declared in `limitations`.
- `/papers` -> `ACADEMIC_SEARCH` (2 miners, 0.000-0.015). OpenAlex, keyless.
- `/headlines` -> `NEWS_HEADLINES` (1 miner, 0.000-0.003). Google News RSS, keyless.

**Gotchas found building these:**
- Google News RSS returns an **empty channel** if you pass `hl`/`gl`/`ceid`. Drop them.
- OpenAlex sorted by `cited_by_count` returns a 6G survey for a blockchain query. Use default
  relevance.
- **SPORTS_SCORE was deliberately skipped**: the free sports API returned a friendly against AC
  Milan when asked for the most recent Premier League meeting. A confidently wrong score is worse
  than not serving the intent.

**Grace period runs ~7 days from activation** — unranked during it, sharing 5% of routed traffic
equally with other new miners. The score earned there sets the opening leaderboard position.

### Next action
2. **Create an EVM wallet + Base Sepolia testnet ETH** — user has no wallet yet. Claude cannot do
   this: no wallet creation, no seed phrases, no signing. Steps are in SETUP.md.

Once the URL exists: put it in `track1-miner/miner.yaml`, sandbox-validate at integrate.telegraphprotocol.com,
then the **user** sends `registerMiner`. Capture `registrationId` into the table below.

---

## Key numbers

| | |
|---|---|
| **Track 1 (ours) closes** | **2026-08-31** — ~5 days. NOT Sep 7. |
| Track 3 (Applications) | 2026-08-31 → 2026-09-07 |
| Miner must stay live until | **2026-09-07** (rule: live throughout Track 3) |
| Prize | Miner track **$2,000** ($1000/$600/$400). App track $2,000. Script $1,000. |
| Scoring | **75% normalized performance + 25% X engagement** |
| Eligibility guardrail | intent needs **≥3 miners AND ≥100 Track 3 requests** |

| Chain | **Base Sepolia** (testnet — gas only, no bond, no stake) |
| Diamond | `0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8` |
| Routing | 70% / 20% / 10% to ranks 1/2/3, **nothing to 4th** |
| Grace period | 7 days, unranked, equal share of 5% of traffic |
| Spot checks | ~every 20s; >20% score drop ⇒ immediate Routing Revocation |
| Registrants | 300+ as of 2026-08-26 |

## Open decisions

**D1 intent** · **D2 own endpoint vs. pure proxy** · **D3 slug + numeric id** · **D4 fee address**
All four are unresolved and detailed in [PRD.md](PRD.md). D1 blocks the rest.

## Standing context

- **Wallet operations are the user's.** Claude does not connect wallets, sign messages, or send
  transactions. Claude drafts; the user clicks.
- **Verify protocol facts against live docs, never memory.** The canonical intent set changes
  on-chain. Record what was checked and when.
- Registration is effectively immutable; a rejected registration **releases its slug immediately**.
  Always sandbox-validate first.
- Judging weights **X posts and engagement** on every track — see
  [docs/BUILD_IN_PUBLIC.md](docs/BUILD_IN_PUBLIC.md). Easy to neglect, scored anyway.

## Not this project

The **Midnight / Brainwave** hackathon (NightSeal, ZK firmware attestation) is a **separate,
unrelated project** in a different folder. Do not conflate the two — an earlier session in this
conversation carried Midnight's deadline over by mistake.

## After registration, record here

```
registrationId   —      (use this for every lookup, never the slug)
intentId         —
slug             —
numeric id       —
base_url         —
fee address      —
IPFS YAML URL    —
```
