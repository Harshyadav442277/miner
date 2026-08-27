# Track 1 — session handoff

**Read this first. Everything Track 1 needs is in this folder.**
Shared protocol facts are in `../docs/`. Do not edit `../track2/` or `../track3-certwatch/`.

Last updated: 2026-08-27 ~08:30 UTC, before epoch 286 (lands ~09:37 UTC).

---

## 1. What needs the operator, right now

**One signature — but on the CORRECTED manifest.** The Codex audit
([codex_audit.md](codex_audit.md), 2026-08-28) found the old 9-intent YAML unsafe to sign: its
NVD `limitations` block counts **node-wide per miner**, which would throttle every intent —
including all three rank-1 paths — to 5 requests per 30 s.

**NEVER sign hash `0xf8eea144…5236803` (the 9-intent version).**

`miner.yaml` is now the **six-intent manifest**: the current four + `LANGUAGE_TRANSLATION` +
`ACADEMIC_SEARCH`. CVE dropped (patchsignal now scores 0.9847 there — the opening closed);
CONTENT_EXTRACTION and NEWS_HEADLINES deferred (below the 3-miner floor even with us). No
`limitations` block. `/cve`, `/extract`, `/headlines` stay deployed but undeclared.

```
hash to expect: 0x50b036adf9c1faa65b1eb55efc3c089e025117028df8dde4ec701a016d07fd8d
```

Go/no-go gates, all passed 2026-08-27 ~19:3x UTC: every declared endpoint has an acceptance
check (verify-deploy, 24 checks green), fresh champion replay — translation mean 0.614, 9/9 wins
(leader mean 0.161); academic 0.028, 19/20 (leader 0.002) — 109 tests + typecheck pass, hash
recorded above. Remaining: **sandbox-validate the exact file at the console, then the user signs.**

integrate.telegraphprotocol.com -> **Connect** (Base Sepolia) -> **Import & Upload** -> upload
`miner.yaml` -> **REQUIRES API KEY toggle OFF** -> **Validate** -> sign.

The console creates a **new registration** rather than editing 236. That is fine for our own slug:
225 went `superseded` when 236 activated. Capture the new `registrationId` and record it here.
Registration 236 stays active and untouched until the replacement is confirmed `active`.

**Claude never signs.** No wallet connect, no transaction, no seed phrase. Prepare and validate;
the operator clicks.

**Second thing that needs a human: X.** 25% of the Track 1 score, judged on quality, consistency
and reach. Drafts in `../docs/X_POSTS.md`. Replying under Telegraph posts reaches an existing
audience; posting cold from a new account does not.

## 2. Live state

```
registration   236     active      wallet 0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e
slug           livecert            id 4433
base_url       https://miner-wine.vercel.app
explorer       https://explorer.telegraphprotocol.com/miners/livecert
repo           https://github.com/Harshyadav442277/miner
```

**Epoch 287 scores** (landed 2026-08-27 ~18:37-19:00 UTC; see `docs/score-history.jsonl`):

```
IP_GEOLOCATION      #1          0.99204   <-- RANK 1 held
SSL_VERIFICATION    #1          0.00973   <-- RANK 1 held
STORM_ALERT         #1          0.01045   <-- RANK 1 held, score up
WEATHER_FORECAST    #4          0.00870   gap 0.00207 to verity (was #6)
```

Epoch 287's weather question moved to New York with explicit lat/lon; the engine sent
`?hours=168&lat=40.7128&lon=-74.0060` (captured live in Vercel logs — the definitive proof of
params-only delivery). The dual-form span fix ("7-day (168-hour) hourly") plus `span_days` is
deployed for epoch 288 (~03:37 UTC).

Epoch 286 was #1/#1/#1 with weather #6 (0.00749).

The explorer's "Top miners" page now lists livecert as **#1 in three intents**. Caveats that keep
this honest: IP_GEOLOCATION has only **2 miners**, below the 3-miner eligibility floor, and every
intent still needs **100+ real Track 3 requests** to pay out. Rank 1 must also *hold* through the
Aug 31 close — spot-checks continue and epoch 287 lands ~18:37 UTC.

Epoch 285 was #2 / #2 / #8 (SSL 0.00745, STORM 0.00635, WEATHER 0.00761); epoch 284 was
#3 / #3 / #7 with storm at 0.0.

**WEATHER_FORECAST climb shipped 2026-08-27 ~12:45 UTC — epoch 287 (~18:37 UTC) is the test.**
The scored WF question is the same one per epoch for every miner (a Tokyo "7-day hourly forecast
starting next Monday, temperature in Celsius and precipitation probability" family) and its ground
truth is a refusal that restates the whole question — so overlap with the question's own phrases is
the entire margin. Diagnosis from our epoch-286 answer shape: **the engine sends weather requests
as params only (`location` + `days`), never the question text** — start_time was "now" and the
prose used the no-date branch, while "7-day" arrived as `days=7`. So "next Monday" and the cutoff
are invisible to us and to everyone (the rank-1 answers also started from today).

Fix, all honest facts from the params-only path: prose now states the window in day form
("A 7-day hourly weather forecast"), says "hourly" and "temperature in Celsius", reports
**precipitation probability** (new Open-Meteo hourly variable — the question asks for it by name
and we never fetched it), names the covered dates ("covering August 27 to September 3, 2026"),
attributes the source ("from the Open-Meteo weather service"), and says "wind speed" not "winds".
`end_time`/`hourly_count` restored (size-limit theory long dead). `miner.yaml` untouched.

Measured with the champion WASM (`wf_mini.wasm`, reg 636 — reproduces all 8 epoch-286 reported
scores EXACTLY from converted_answer; re-download from the zkasuran repo commit f009d2d, path
dist/xfmr/wf_mini.wasm):
```
epoch 284: live answer 0.01033 vs rank-1 0.00992 (verity)
epoch 285: live answer 0.01019 vs rank-1 0.00889 (isobar)
epoch 286: live answer 0.01028 vs rank-1 0.00983 (verity)
12-question bench mean: 0.17346 -> 0.25592 (+47%), no regressions
```
Caveat kept honest: conversion historically shaves 4-6% off raw prose, so the live margin over
verity (~5%) is thin — expect ~coin-flip for #1 vs verity in 287, clear gain over everyone else.
109 tests pass; verify-deploy 18/18; replay 34/34.

Epoch 284 was #3 / #3 / #7 with storm at **0.0**, so this was real movement. The storm zero had a
specific cause, in section 7.

**2026-08-27 (session 1 continuation):** registration 236 `active`, verify-deploy 18/18, replay
corpus 34/34. Found and fixed a `/papers` refusal bug before it could cost a scored question: a
bare topic with no question scaffolding (exactly what the engine sends when it fills the declared
`topic` parameter) returned "No research topic was supplied" — a guaranteed zero. `searchTopic`
now falls back to the cleaned input itself; "since/after YYYY" and bare year-pair date windows now
parse; a trailing date clause no longer leaks into the topic. 108 tests, deployed to production,
verified live. `miner.yaml` untouched — the operator package and its hash are unchanged.

**PRE-TUNED THE FIVE UNREGISTERED INTENTS — 2026-08-27 ~18:30 UTC.** Champion WASMs for all five
downloaded and validated (`tools/pretune-intents.mjs` runs the whole loop; set `PRETUNE_DIR` to a
folder with `<name>.wasm` + `scores_<INTENT>.json`). Means over every distinct real recorded
question, deployed code only:

```
CVE_LOOKUP            0.00218 -> 0.32609   150x. Beats patchsignal-cve on 9 of 11 scoreable Qs.
CONTENT_EXTRACTION    1.00000              6/6 perfect vs incumbent 0.0000.
LANGUAGE_TRANSLATION  0.61434              9/9 wins vs the two mymemory incumbents.
ACADEMIC_SEARCH       0.02952              18/19 wins.
NEWS_HEADLINES        0.00626              18/22; stale-GT ceiling — headlines rotated since GT.
```

**THE CVE CHAMPION IS A DIFFERENT REGIME.** It is patchsignal's own scorer (same author as the
rank-1 CVE miner), and unlike the zkasuran salience family it **collapses on detail**: the same
facts scored 0.98 as three compact sentences and 0.009 with the multi-range version list or the
NVD description appended. "Fuller answers score better" does NOT hold there — facts in fields,
answer in prose, and the prose opens in the question's own shape ("The CVSS score for X is 10,
indicating a Critical severity level. Affected versions include Apache Log4j versions before
2.15.0. It is listed in CISA's KEV catalog…"). CVE answers now also carry `affected_versions`
(detailed ranges, description-named product first) and `known_exploited` as fields, and /cve
caches by CVE id so rephrasings cannot burn NVD's 5-per-30s limit.

Headlines answers are now numbered, honor "top N" counts, and frame as "The top 5 business
headlines from Great Britain today, as of <date>, are: 1. …" — the questions' own wording.

## 3. Endpoints — 9 built, all live, all keyless

| Path | Intent | Registered? | Source |
|---|---|---|---|
| `/ssl-check` | SSL_VERIFICATION | yes | live TLS handshake, no upstream |
| `/storm-alert` | STORM_ALERT | yes | Open-Meteo |
| `/weather-forecast` | WEATHER_FORECAST | yes | Open-Meteo |
| `/ip-geolocate` | IP_GEOLOCATION | yes | ipapi + BigDataCloud |
| `/extract` | CONTENT_EXTRACTION | **no** | none, deterministic parsing |
| `/headlines` | NEWS_HEADLINES | **no** | Google News RSS |
| `/translate` | LANGUAGE_TRANSLATION | **no** | MyMemory |
| `/cve` | CVE_LOOKUP | **no** | NIST NVD |
| `/papers` | ACADEMIC_SEARCH | **no** | OpenAlex |

No API key exists anywhere in this miner. That is why `auth.type: none`, and why no upstream quota
can revoke us.

**Why those five:** every one has incumbents that are failing.

```
CONTENT_EXTRACTION    1 miner   0.000 on ALL 6 questions  (URL extractor; questions supply text inline)
LANGUAGE_TRANSLATION  2 miners  best 0.000                (both named after the API we call)
CVE_LOOKUP            3 miners  ALL 0.000 in epoch 285
ACADEMIC_SEARCH       2 miners  0.000 - 0.015
NEWS_HEADLINES        1 miner   0.000 - 0.003
```

On CONTENT_EXTRACTION, **5 of the 6 real questions reproduce the ground truth exactly.**

## 4. The strategy, and the evidence for it

`chainsight-oracle` holds **11 intents and is #1 in four**, winning mostly with small scores in
quiet corners. It won by covering ground, not by answering better. That is the model.

Counter-example worth knowing: `bittensor-sn34-bitmind` is **#1 in three intents with 0.000**. Rank
is assigned even when nobody scores. Probably worthless for prizes, since judging divides by the
intent best score and eligibility needs 100+ real Track 3 requests.

## 5. Rules that survived measurement

The only generalisations that held. Everything else was disproven.

- **Answer every clause of the question.** Naming the ISP in a geolocation answer moved it
  **0.0103 -> 0.9936, a 97x gain**. Every large improvement came from finding a clause going
  unanswered.
- **Echo the identifiers the question used.** Answering "San Francisco" to a question about
  latitude 37.7749 scored 0.0068; including the coordinates scored **0.0135**.
- **Label the answer with the question own terms, where the answer buried them.** SSL
  0.01020 -> 0.01074, storm 0.00835 -> 0.00862. It made **weather worse** (0.01041 -> 0.01014), so
  test per intent rather than applying it blindly.
- **Never return a non-2xx.** The engine records `upstream error`, stores an empty answer, and the
  scorer never reads the body. A 400 is a guaranteed 0. Return 200 with an honest
  "could not determine".
- **Correctness beats the benchmark.** Fixing hemisphere coordinates lowered the storm benchmark
  mean, because two questions previously failed and now resolve. Kept anyway.

## 6. Theories tested and WRONG — do not retry

1. **Terse answers score better.** Wrong. Fuller answers win, provided every added fact was asked
   for. `tools/score-sim.mjs` encodes this dead model — **superseded, do not use it.**
2. **`label_field` drives the score.** Wrong. `txlens` is #1 in SSL with `label_field: status`,
   which is the constant "ok".
3. **There is a response size limit.** Wrong. Conversion fails about 6.7% of the time at **every**
   size: `weatherapi` converts 52,943 bytes fine, `ssllabs` failed at 161. Trimming the SSL answer
   on this false premise cost 11% and was reverted.
4. **A hand-written candidate is a valid measurement.** Wrong, and it fooled me twice. Writing an
   answer while reading the ground truth leaks it — a storm candidate scored 0.614 that way where
   the honest implementation scores 0.0086. **Only measure answers produced by the deployed code.**

## 7. How scoring actually works

- The scorer reads **`converted_answer`**, Telegraph prose conversion of the miner JSON. Not the
  raw JSON, not `label_field`. Running the champion WASM on `converted_answer` reproduces the
  reported score exactly.
- **The engine sends only the parameters a miner declares** in `input_schema`, never the raw
  question unless `q`/`query` is declared. This caused the storm 0.0 in epoch 284: a coordinate
  question arrived as `location=""` and we answered "no location was provided". Fixed in
  registration 236, which declares `q`, `query`, `lat`, `lon`, `latitude`, `longitude`, `days`,
  `forecast_days`, `forecast_hours`, `hours`, `domain`, `location`, `ip`.
- **Epochs are 9 hours.** Scoring lands about 3x a day. The landing-page ticker counts down in
  minutes and misleads. Never poll for a score after deploying; use the offline loop.
- **Champion scorers are public**, commit-pinned WASM, about 24MB each, listed at `/api/wasm`.
  `/scores?intent=X` returns real questions with `ground_truth` and the `converted_answer` that was
  scored. `docs/codex-worklog/probe-champion.mjs` runs one locally.

## 8. Tools

```bash
# acceptance — must exit 0 before any registration
node tools/verify-deploy.mjs https://miner-wine.vercel.app

# replay the 34 real paid questions from the public feed
node tools/replay-corpus.mjs
node tools/replay-corpus.mjs --refresh

# score live answers against an intent real champion
node tools/bench-champion.mjs --wasm champ_ssl.wasm --bench ssl_bench.json --path ssl-check

# record this epoch (idempotent; hourly CI runs it)
node tools/record-scores.mjs

# uptime and routing revocation
node tools/watch.mjs --base-url https://miner-wine.vercel.app --registration-id 236 --once
```

Windows note: Git Bash rewrites a leading slash argument into a Windows path, so pass `ssl-check`
not `/ssl-check`, or prefix the command with `MSYS_NO_PATHCONV=1`.

## 9. Gotchas that cost real time

- **Google News RSS returns an empty channel** if you pass `hl`/`gl`/`ceid`. Drop them.
- **OpenAlex sorted by `cited_by_count`** returns a 6G survey for a blockchain query. Use default
  relevance.
- **`new RegExp` with escaped strings is broken** — in a JS string `\d` is `d`, `\s` is `s`, and
  `\b` is a backspace character. Regexes in this codebase were silently dead once because of it.
  Use regex literals or `String.raw`.
- **Deploy AFTER tests pass, not alongside.** Chaining them in one command hid two failing tests.
- **SPORTS_SCORE was deliberately skipped.** The free API returned a friendly against AC Milan when
  asked for the most recent Premier League meeting. A confidently wrong score is worse than not
  serving the intent.
- **Do not `git add -A`.** Other agents write into this repo incrementally; a blanket add captured
  Track 2 half-written files once. Stage explicit paths. Leave `../fable_review_audit.md` alone.

## 10. Deadlines and the eligibility risk

```
Track 1 closes                2026-08-31
Miner must stay live through  2026-09-07   (a rule, not just scoring)
Judging                       75% normalized performance + 25% X engagement
```

**The eligibility guardrail is the biggest unmitigated risk.** An intent needs 3+ active miners AND
**100+ real requests from Track 3 applications** to be prize-eligible. `SSL_VERIFICATION` had
**zero** real questions in 72 hours. Rank 1 in a silent intent may win nothing.

Breadth is the hedge. `../track3-certwatch/` is the other half of it and is **not funded** — do not
fund it until its durable-budget story is closed (see `../GAPS.md` G17/G18).

## 11. First actions for a fresh session

1. `node tools/record-scores.mjs` — has a new epoch landed? Compare against section 2.
2. `curl -s https://devnode.telegraphprotocol.com/api/miners/236 | jq .miner.activation_status`
   — still `active`? If a newer registration exists, that id supersedes 236 everywhere.
3. `node tools/verify-deploy.mjs https://miner-wine.vercel.app` — must exit 0.
4. If a new epoch landed, read what actually scored:
   `curl -s "https://devnode.telegraphprotocol.com/scores?intent=SSL_VERIFICATION&limit=100"`
   and look at our `converted_answer` and `failure_reason`. That is where every real defect was
   found — not by reading code.
