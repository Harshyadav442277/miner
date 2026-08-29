# Track 1 — session handoff

**Read this first. Everything Track 1 needs is in this folder.**
Shared protocol facts are in `../docs/`. Do not edit `../track2/` or `../track3-certwatch/`.

Last updated: 2026-08-29 session 2 — storm advisory hedge deployed, alarm proven, branch clean.

---

## 1. What needs the operator, right now

**The six-intent update is SIGNED AND LIVE — registration 260, `active`, 2026-08-28 ~05:00 UTC.**
Nothing about the manifest needs the operator any more. See section 2 for the verified state and
[docs/SIGNING.md](docs/SIGNING.md) for what was checked.

What still needs a human:

**0. The diverged branch is RECONCILED** (verified `0 0` on 2026-08-29 session 2) and the uptime
alarm now covers all three jobs and has been **proven to fire** (issue #1, a documented drill —
G21). Nothing here needs the operator any more; the divergence check at session start stays until
score-history ownership is settled (G20 prevention half).

**0b. The old item 0 — deploy and re-run acceptance — is CLOSED.** Verified 2026-08-29:
`node track1-miner/tools/verify-deploy.mjs https://miner-wine.vercel.app` exits **0**, all six
routes 200, median 372ms / p95 1172ms, and `/translate` answered live in 808ms. The MyMemory
fallback (`fetchChrome` in `src/translate.ts`) landed in **fd9a27d**, which is an ancestor of
`origin/main`, and Vercel builds `api/index.ts` from source on push — so the fallback is on the
deployed branch. Note the local `dist/` is a stale untracked build artifact and does **not**
contain it; do not read production state from `dist/`.

Stated precisely, because this is the kind of claim G18 punished: the fallback **code** is
deployed and acceptance is green. The fallback **path** has still never been observed firing
against a real production 429 — MyMemory has been healthy every time it has been checked since.

**1. X — 25% of the score, and it is the largest unclaimed block on the board.** **Clarified by
the organizers 2026-08-28:** there is no fixed formula. They weigh *"quality, consistency, reach,
likes, reposts, comments and meaningful engagement"*, they want posts about **both Track 1 and
Track 2** — experiments, results, improvements, journey, learnings, edge cases — and they want
them genuine: *"we mainly want to see the actual work and progress."*

**This retracted two earlier plans.** An earlier Discord message said only the single
highest-engagement post counted; that was wrong, and the one-flagship plan built on it is
withdrawn — **consistency is scored, so a steady series wins.** It also reversed the decision to
hold the offline-scorer and converter-budget findings until Sept 1: judging rewards showing real
work, and those endpoints are public and already described in our own public README.

Thirteen posts, each verified under X's 280-character limit and tagged, roughly two a day
through Aug 31 and continuing into the Track 3 window:
**[../docs/X_POSTS.md](../docs/X_POSTS.md)**. Best post so far is 188 impressions.

**2. One question left for the organizers**, and it decides where the remaining effort goes:
- Track 3 has not opened, so no intent can have its 100 real requests by the Aug 31 close. Is that
  requirement waived, measured later against a post-Track-3 deadline, or binding on Aug 31 — in
  which case no intent qualifies for cash? **Unanswered.**

**3. Eligibility.** `IP_GEOLOCATION` has 2 miners and needs 3. **The operator decided on 2026-08-28
not to register a second miner from another account — do not reopen this.** Registering the
six-intent update already took `LANGUAGE_TRANSLATION` and `ACADEMIC_SEARCH` from 2 miners to 3, so
five of our six intents now clear the miner-count half. The remaining paths are recruiting a real
third IP miner and generating real Track 3 demand → [docs/ELIGIBILITY.md](docs/ELIGIBILITY.md).

Note for anyone re-deriving the rules: the published rules contain **no** ban on one participant
registering multiple miners. The applicable rule is **04**, *"Artificial inflation of metrics or
gaming the system will result in disqualification."*

**Claude never signs.** No wallet connect, no transaction, no seed phrase. Prepare and validate;
the operator clicks.

## 2. Live state

```
registration   260     active      wallet 0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e
slug           livecert            id 4433
base_url       https://miner-wine.vercel.app
explorer       https://explorer.telegraphprotocol.com/miners/livecert
repo           https://github.com/Harshyadav442277/miner
yaml (pinned)  https://gateway.pinata.cloud/ipfs/QmURJomd4AeRBxHoDtGPtZ2Z9kxFVXVdVQC6xvVvPgr4Z8
yaml_hash      e6c5171bf59291e2473d2dfcfb50a7e501300b483121ca0219afa5ee3ce5bb50
tx             0x61440cd683525134...53b64a56
```

**225 and 236 are superseded.** 236 kept serving until 260 activated — there was no gap.

**Six intents registered** as of 2026-08-28: SSL_VERIFICATION, STORM_ALERT, WEATHER_FORECAST,
IP_GEOLOCATION, **LANGUAGE_TRANSLATION**, **ACADEMIC_SEARCH**. Six endpoints: `/ssl-check`,
`/storm-alert`, `/papers`, `/translate`, `/ip-geolocate`, `/weather-forecast`.

Verified after signing, against the pinned IPFS file rather than the local one:
- `sha256(pinned) == on-chain yaml_hash` exactly
- **no `limitations` block** (the P0 that would have throttled every intent node-wide)
- all 14 declared input params survived the console's re-serialization, including `topic` (the one
  ACADEMIC_SEARCH needs) and `query`/`q` (the params-only delivery fix)
- no `output_schema` field dropped
- `auth: {type: none}`, `base_url`, `rate_limit_per_sec`, `cache_ttl_sec` and both circuit settings
  **unchanged from 236**, the configuration this miner has always been accepted under

The console strips documentation keys (`examples`, top-level `description` on input_schema) and
re-serializes everything. That is normal and 236 registered the same way.

**The uptime workflow's `REGISTRATION_ID` repo variable was still `225`** — two registrations
stale, so activation monitoring had been watching a superseded record since before 236. Set to
**260** on 2026-08-28 (`gh variable set REGISTRATION_ID --body 260`). **Whenever a new registration
is signed, update that variable in the same session** — nothing in CI catches it being wrong.

### Session 2, 2026-08-29 (~05:30Z) — the storm advisory hedge, and two structural fixes

**Epoch 290 lands 2026-08-29T06:31Z** (the epoch stretched: 289 landed ~12:55Z on 08-28, so this
one took ~17.5h, not 9 — do not trust the 9h figure for timing decisions). Registration 260
`active`, verify-deploy exit 0 (twice), 124/124 tests, no new entrants in any of our six fields.

**STORM (#2, gap 0.00023): a standing operational-guidance sentence now ends every storm answer.**
Epoch 289's question asked what adjustments a mine site should make ahead of high winds; the
ground truth is a personnel/equipment safety checklist, and the entire field — including the
rank-1 — answered with forecast numbers. The engine sends this endpoint **only coordinates**
(verified across all six scored epochs: every answer used the 48h default window whatever the
question said), so the guidance cannot be conditional on being asked. Measured with the storm
champion (`storm_rpen.wasm`, reg 453, reproduces all five epoch-289 reported scores exactly):

```
epoch 289 (advisory):  base 0.004233 -> +guidance 0.005767   +36%, leader amanat 0.004279
epoch 288 (forecast):  -3.2%    epoch 287: +2.2%    epoch 286: -1.9%
12-question bench:     mean 0.00944 -> 0.00969   +2.7%, no per-question collapse
```

Variants that LOST, do not retry: advisory-first prose (+81% on 289 but −5 to −14% on forecast
questions), an even longer guidance with evacuation-route detail (+11% only — over-stuffing
dilutes), trimmed medium/short tails (+21%/+9%). The deployed sentence is the T2 variant in
`describe()` in `src/storm.ts`. **Conversion survival is unmeasured (GAPS G23)** — the converter
drops tails, so the likeliest outcomes are "no effect" on forecast questions and "partial gain" on
advisory ones. Read the epoch 290+ storm rows before concluding anything.

**WEATHER (#3, gap 0.00027): nothing further was changed.** The temperature-first reorder from
session 1 is live and untested by any epoch yet; the current live answer measures **0.010713**
against epoch 289's Q/GT vs the leader's converted 0.010033 (+6.8% raw, ~coin-flip after the
usual conversion haircut). Epoch 290 is its test. Three rewordings already lost this week.

**DEPLOYS ARE MANUAL — pushing to `main` deploys NOTHING (GAPS G22).** Production was 23h stale
while `main` carried the storm change; there is no GitHub→Vercel integration. Deploy with
`vercel --prod` from `track1-miner/miner` (CLI authenticated, team `wukong4`), then re-run
verify-deploy against production. MEMORY's earlier "Vercel builds on push" claim was wrong.

**The uptime alarm is real now.** One `alarm` job (`needs: [check, live-tests, scores]`,
`if: contains(needs.*.result, 'failure')`) opens/extends the `uptime` issue for any failing job;
permissions explicit; `live-tests` uses `npm ci` + cache to conserve the Actions quota that is
the suspected cause of the 9–13h cron gaps. Proven live with the `test_alarm` dispatch input →
issue #1, closed as a drill. (T4.8, G21)

### Re-verified live 2026-08-29 (UTC 2026-08-28T18:4xZ)

Everything below was measured this session, not carried forward:

```
registration 260   active   rejection_reason null   fetch_attempts 0   retrying false
six endpoints      all 200, 0.33s - 1.28s
verify-deploy      exit 0   median 372ms   p95 1172ms
test suite         123/123 pass (offline + live)
epoch 289          still the network's latest, 5.8h old against a ~9h epoch — on schedule
total_requests_served  42   (all six intents combined, lifetime)

SSL_VERIFICATION      #1  0.01014868                                   field 4
IP_GEOLOCATION        #1  0.01000050                                   field 2
LANGUAGE_TRANSLATION  #1  0.00899709                                   field 3
ACADEMIC_SEARCH       #1  0.00654745                                   field 3
STORM_ALERT           #2  0.00405170  gap 0.00022750 amanat-weather-risk   field 5
WEATHER_FORECAST      #3  0.00976552  gap 0.00026778 onlookout-weather     field 11
```

`WEATHER_FORECAST`'s field is now **12 active miners** — it was 9 when we entered it. That intent
carries the network's highest demand and is attracting entrants accordingly; the 0.00027 gap is
being contested by more people each epoch.

**Monitoring is weaker than it reads.** The uptime cron is honoured far less often than hourly —
observed gaps of **9h 17m** and **13h 06m** — and only the `check` job opens an issue, so
`live-tests` and `scores` failures are silent. The repository has never had an issue created, so
the alarm half of this has never been seen to work. This is the tripwire G19's accepted risk
depends on. (GAPS G21, TASKS T4.8)

**Weather tuning after epoch 289 — three variants tested, all lost. Nothing was changed.**
Scored against the WEATHER_FORECAST champion (`wf_mini.wasm`, reg 636) on epoch 289's own question
and ground truth:

```
deployed prose            58w   0.010514   <-- best, kept
temperature reordered first 57w 0.010448
short                     29w   0.010035
shorter                   22w   0.007708
our converted answer                0.009766   (leader onlookout 0.010033)
```

Two hypotheses died here, and both are worth not retrying:

1. **Reordering `reason` so the asked-for variables come first** — motivated by the real
   observation that epoch 289's conversion kept wind speed and cut the temperature range. Measured
   *worse*. What the converter keeps is not controlled by our ordering, and we cannot run the
   converter offline to test it, so this is unfalsifiable from here.
2. **Writing to the converter's ~32-word budget** — measurably wrong. Shortening cost score
   monotonically (0.0105 -> 0.0100 at 29 words -> 0.0077 at 22). The converter lands at ~32 words
   whatever we send, but that is *not* a reason to send 32 words. Fuller prose still scores better.

The ~32-word budget finding stands as an observation. The advice people would naturally draw from
it — write shorter — is false, at least here. Conversion costs us about 7% (0.010514 prose ->
0.009766 scored) and no wording change tested recovers it.

**Epoch 289 scores** (recorded 2026-08-28 via `tools/record-scores.mjs`) — **RANK 1 IN FOUR**:

```
SSL_VERIFICATION      #1   0.01014868   <-- held
IP_GEOLOCATION        #1   0.01000050   <-- held
LANGUAGE_TRANSLATION  #1   0.00899709   <-- NEW, first epoch scored
ACADEMIC_SEARCH       #1   0.00654745   <-- NEW, first epoch scored
STORM_ALERT           #2   0.00405170   gap 0.00022750 to amanat
WEATHER_FORECAST      #3   0.00976552   gap 0.00026778 to onlookout
```

**Both newly registered intents took rank 1 on their first scored epoch**, which is what the
offline replay predicted (translation 9/9 wins, academic 19/21). The academic parser fixes shipped
hours earlier — two of the four newest questions had been answered "no research topic was supplied".

**WEATHER climbed from 0.00678 to 0.00977 and the gap fell from 0.00311 to 0.00027** — the
refusal/window fix worked, and the intent is now within 2.7% of rank 1.

**STORM fell to #2, and it was not a regression.** Our answer was a normal forecast, not a refusal,
so today's refusal change was not involved. The question changed shape: it asked what *operational
adjustments* an open-pit mine should make ahead of high winds, and the ground truth is a personnel
and equipment safety checklist. We answered with wind, gust and precipitation figures; so did the
leader, 0.00428 to our 0.00405. Both are answering a different question from the one asked.

**What the epoch-289 weather row shows, and it is the general lesson:** the question asked for
temperature and precipitation. Our `reason` contained both — but the ~32-word conversion kept the
**wind speed**, which nothing had asked for, and cut the **temperature range**, which the question
named. Ordering inside `reason` is therefore load-bearing: what the converter reaches last is what
it drops. Temperature and precipitation now lead that sentence; condition and source attribution
moved to the tail.

Also confirmed on that row: our code *does* parse "starting from September 1st, 2026" correctly
when it receives the question, but the engine sent only `location` and `days`, so we forecast from
today. `isobar-weather` answered September 1-7, so the engine gave *them* the question text. Param
filling differs per miner and we cannot force it.

**Epoch 288 scores** (landed 2026-08-28 ~03:50 UTC — recorded via `tools/record-scores.mjs`):

```
STORM_ALERT         #1          0.01061   <-- RANK 1 held, score up again
IP_GEOLOCATION      #1          0.00976   <-- RANK 1 held
SSL_VERIFICATION    #1          0.00935   <-- RANK 1 held
WEATHER_FORECAST    #3          0.00678   leader amanat-weather-risk 0.00989
```

Three epochs of rank 1 in three intents (286, 287, 288). Weather climbed #6 -> #4 -> #3 but the
leader changed (verity -> amanat) and our gap widened to 0.00311, so the epoch-287 read that we
were near coin-flip for #1 was too optimistic. **IP_GEOLOCATION fell 0.992 -> 0.00976 on the
question changing, not on anything we did** — it is the least durable of the three firsts, which
matters for the eligibility argument in `docs/ELIGIBILITY.md`.

Worth reading before chasing SSL score: in epoch 288 the ground truth for `api.shopify.com` claimed
a DigiCert certificate valid to January 2028. The host actually serves Google Trust Services,
expiring 2026-10-17, which is what we reported. **We are being scored against a stale ground
truth**, which is why every SSL score in the field sits near 0.009. Correctness and score diverge
here; do not "fix" the miner toward the wrong answer.

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

## 2b. The two new intents — measured, not assumed (2026-08-28)

Both were scored offline against their own champion WASM before epoch 289, using
`tools/pretune-intents.mjs`-style replay over every distinct real recorded question.

**LANGUAGE_TRANSLATION — 9/9 wins, mean 0.61434. Champion reproduces 55/55 reported scores
exactly, so this is trustworthy.**

```
best incumbent per question: 0.000, 0.066, 0.000, 0.150, 0.333, 0.025, 0.264, 0.589, 0.023
ours:                        0.918, 0.190, 0.034, 0.150, 0.979, 0.965, 1.000, 0.996, 0.298
```

Crucially our translation answers are **1-9 words**, so the converter's ~32-word budget never
binds — clipping to 32 words changes nothing. That is why `reason` is the bare translation and
must stay that way: anything wrapped around it dilutes the only text being compared.

**ACADEMIC_SEARCH — mean 0.00953, 19/21 above the best incumbent score.** The champion only
reproduces 3/4 here, so treat these as indicative. Four real defects were found by replaying the
questions, all fixed and deployed:

1. **A mid-sentence date clause deleted the subject.** The scaffolding strip ended in `.*$`, so
   "papers published in 2025 in the field of quantum computing" lost everything after the year and
   `searchTopic` returned null — the endpoint refused with "No research topic was supplied", a
   guaranteed near-zero. **Two of the four newest questions hit this.** This is the second time
   this endpoint has refused an answerable question; there are now regression tests over the real
   question strings.
2. **"between January 1, 2025 and June 30, 2026" did not parse** — the day number was not allowed,
   so a question scoped to 2025-2026 was answered with a paper from **2002**.
3. **The requested count and ordering were ignored.** Questions say "limited to 10 results" and
   "sorted by citation count" by name; we returned 5 in relevance order.
4. **Named databases and query syntax leaked into the topic** ("Semantic Scholar for recent…",
   `Humans[Mesh]`), and three questions returned **zero papers**. Sources are stripped, relative
   windows ("last 5 years") resolve, and an empty result now retries on the leading terms.

Relevance stays the **default** ordering — sorting by citations unasked still returns a highly
cited survey on the wrong subject. Only an ordering the question names is honoured.

## 3. Endpoints — 6 registered; code now matches the manifest

| Path | Intent | Registered? | Source |
|---|---|---|---|
| `/ssl-check` | SSL_VERIFICATION | yes | live TLS handshake, no upstream |
| `/storm-alert` | STORM_ALERT | yes | Open-Meteo |
| `/weather-forecast` | WEATHER_FORECAST | yes | Open-Meteo |
| `/ip-geolocate` | IP_GEOLOCATION | yes | ipapi + BigDataCloud |
| `/translate` | LANGUAGE_TRANSLATION | yes | MyMemory + failover |
| `/papers` | ACADEMIC_SEARCH | yes | OpenAlex |

No API key exists anywhere in this miner, so `auth.type: none`. Keyless upstreams can still impose
shared-IP quotas: the post-registration MyMemory 429 is the concrete example, and Translation now
has a tested failover for it.

Content, News, and CVE were measured candidates, not registered strategy. Their source and routes
were removed after registration 260 to eliminate dead surface. The historical measurements above
remain only to explain how the candidate decision evolved.

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
   for. The superseded `tools/score-sim.mjs` was deleted in the hardening pass.
2. **`label_field` drives the score.** Wrong. `txlens` is #1 in SSL with `label_field: status`,
   which is the constant "ok".
3. **There is a response size limit.** Wrong. Conversion fails about 6.7% of the time at **every**
   size: `weatherapi` converts 52,943 bytes fine, `ssllabs` failed at 161. Trimming the SSL answer
   on this false premise cost 11% and was reverted.
4. **A hand-written candidate is a valid measurement.** Wrong, and it fooled me twice. Writing an
   answer while reading the ground truth leaks it — a storm candidate scored 0.614 that way where
   the honest implementation scores 0.0086. **Only measure answers produced by the deployed code.**

## 7. How scoring actually works

- **The converter is a ~32-word budget, and it is the real bottleneck. Measured 2026-08-28 over
  all 16 of our scored rows across four intents.** `converted_answer` is an LLM summary of our
  whole JSON, and it lands at 32.1 words on average whatever we send: it **expands** short reasons
  (12 -> 32, 17 -> 22, 25 -> 35 words) and **compresses** long ones (69 -> 33, 68 -> 32, 64 -> 37).
  Median ratio 0.79.

  So writing a 69-word `reason` does not produce a 69-word scored answer. It produces a 33-word
  summary in which **the converter, not us, chose what survived.**

  What that cost, concretely — SSL epoch 286, `api.example.com` (unreachable host, and a ground
  truth that is a generic "how to analyse a TLS chain" essay):

  ```
  our reason (64 w), scored directly with the champion   0.992301
  the converted_answer that was actually scored (37 w)   0.009730     100x loss
  ```

  Our reason named `openssl s_client`, Subject Alternative Name, SSL Labs, and leaf/intermediate
  chain building — all of it in the ground truth. The converter cut every one of those and wrote
  "The system suggests running a command to verify the certificate chain."

  **This qualifies rule 1 in section 5.** "Answer every clause" is right, but only inside the
  converter's budget. Past roughly 35 words you are not adding scored content, you are handing a
  summariser the choice of what gets scored. The hypothesis worth testing is to write `reason` at
  the converter's own budget with the question's vocabulary front-loaded, so there is nothing to
  cut — **not yet tested live**, and note the confounder: our two 0.99 scores are both
  IP_GEOLOCATION, whose ground truth is short and factual, while SSL's is a long essay.

  Reproduce with `../../scratchpad/conversion-loss.mjs` (see the codex worklog) or by pulling
  `/scores` and comparing `json.loads(miner_answer).reason` against `converted_answer`.

  **We cannot run the converter offline.** That is the gap that makes this hard to tune: the
  champion scorer is public, the converter is not. Do not rewrite answer generation on theory
  three days from the close — the repo's own rule is that only deployed-code answers count as
  measurement, and here even that only tells us the result, not the mechanism.

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
node tools/watch.mjs --base-url https://miner-wine.vercel.app --registration-id 260 --once
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

**Measured 2026-08-29, and neither half is moving:**

```
intent                 active miners   3-miner half
SSL_VERIFICATION             5          OK
STORM_ALERT                  6          OK
WEATHER_FORECAST            12          OK
IP_GEOLOCATION               2          FAILS   livecert + iplocate only
LANGUAGE_TRANSLATION         3          OK
ACADEMIC_SEARCH              3          OK

total_requests_served, all six intents combined, lifetime:   42
```

Two things worth stating plainly. The **42** is the whole miner's lifetime total, while the floor
is **100 per intent** — so the shortfall is not 58 requests, it is on the order of 600, two days
before the close, with Track 3 not yet open. And `IP_GEOLOCATION` fails the *miner-count* half
outright, so a rank 1 there is worth nothing regardless of demand.

Breadth is the hedge. `../track3-certwatch/` is the other half of it and is **not funded** — do not
fund it until its durable-budget story is closed (see `../GAPS.md` G17/G18).

## 11. First actions for a fresh session

0. `git fetch origin && git rev-list --left-right --count origin/main...HEAD` — **do this first.**
   The `scores` CI job pushes to `main` on its own, so the branch can be diverged before you have
   typed anything. Reconcile by rebase, never by force-push. (G20)
1. `node tools/record-scores.mjs` — has a new epoch landed? Compare against section 2.
2. `curl -s https://devnode.telegraphprotocol.com/api/miners/260 | jq .miner.activation_status`
   — still `active`? If a newer registration exists, that id supersedes 260 everywhere.
3. `node tools/verify-deploy.mjs https://miner-wine.vercel.app` — must exit 0.
4. If a new epoch landed, read what actually scored:
   `curl -s "https://devnode.telegraphprotocol.com/scores?intent=SSL_VERIFICATION&limit=100"`
   and look at our `converted_answer` and `failure_reason`. That is where every real defect was
   found — not by reading code.
