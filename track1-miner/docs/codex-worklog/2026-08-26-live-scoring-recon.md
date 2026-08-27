# Live scoring reconnaissance — 2026-08-26

## Decision

Do not add another intent and do not spend the remaining window on a Track 2
scorer. The strongest legitimate path to rank one is to make the existing
answers obey the exact temporal and diagnostic contracts already present in
public scoring questions.

The priority order is now:

1. `WEATHER_FORECAST`: parse and answer the requested dates, not "the next N
   hours."
2. `SSL_VERIFICATION`: preserve a complete, truthful diagnostic explanation
   through answer conversion.
3. `STORM_ALERT`: distinguish a point offset ("in 44 hours") from a duration
   window ("over the next 44 hours").

This supersedes the earlier conclusion in `docs/EPOCH_284.md` that Weather is
not worth optimizing. That conclusion used ranks alone. It did not yet have the
active production WASM, public ground truth, or exact converted answer.

## Score snapshot

Epoch 284 is LiveCert's first scored epoch:

| Intent | LiveCert | Rank | Epoch leader | LiveCert / leader |
|---|---:|---:|---:|---:|
| `SSL_VERIFICATION` | 0.0044928235 | 3 / 4 | 0.0060074595 | 74.8% |
| `STORM_ALERT` | 0 | tied 3 / 4 | 0.00651 | 0% |
| `WEATHER_FORECAST` | 0.0069898367 | 7 / 11 | 0.009923598 | 70.4% |

Registration 225 was created at `2026-08-26T14:50:12Z` and received scores in
the same epoch. Whatever the documented seven-day grace period controls, it did
not block scoring or leaderboard inclusion.

At capture time the Explorer reported epoch 284, a nine-hour epoch, with the
next boundary at `2026-08-27T00:36:55Z` (`06:06:55` IST). Recheck this live
before using it as a deployment deadline.

Sources:

- [LiveCert registration](https://devnode.telegraphprotocol.com/api/miners/225)
- [SSL scores](https://devnode.telegraphprotocol.com/scores?intent=SSL_VERIFICATION&limit=100)
- [Weather scores](https://devnode.telegraphprotocol.com/scores?intent=WEATHER_FORECAST&limit=500)
- [Storm scores](https://devnode.telegraphprotocol.com/scores?intent=STORM_ALERT&limit=300)
- [Epoch clock](https://explorer.telegraphprotocol.com/api/epoch)

## The real scorer boundary

The active scorer binaries are publicly registered, commit-pinned WASM files.
They expose the standard `memory`, `alloc`, `dealloc`, and `rank_answer` ABI and
can be executed locally without a network call.

Most importantly, a score record contains all of:

- `question`;
- `ground_truth`;
- `miner_answer` (the raw JSON response);
- `converted_answer` (natural-language conversion);
- final `score`.

Running the active SSL WASM locally produced:

```text
reported live score       0.0044928235
raw miner_answer score    0.004906285...  (not the reported value)
converted_answer score    0.004492823500186205
```

The same equality held for Weather:

```text
reported live score       0.0069898367
converted_answer score    0.006989836692810059
```

Therefore the scorer's actual answer input is `converted_answer`. A YAML
`label_field` may influence conversion, but the scorer is not simply reading and
ranking that raw field. This is stronger evidence than the current label-field
hypothesis.

The practical consequence is a two-gate acceptance test:

1. The endpoint must return the correct structured result.
2. Telegraph's converted prose must retain every requested semantic fact.

Local endpoint tests cover only the first gate. Epoch scores are too slow and
too noisy to be the development loop, so the public converted answers and
champion binaries should become pinned offline regression fixtures.

## Rank-one lever 1: temporal Weather correctness

The epoch-284 request asked for:

```text
Tokyo, 48 hourly values, starting 2026-09-01T06:00:00Z,
temperature in Celsius, precipitation in millimeters.
```

LiveCert instead returned the first 48 hours from "now" and the converter
omitted precipitation:

```text
The forecast for Tokyo over the next 48 hours predicts drizzle, with
temperatures ranging from 22.7°C to 33.9°C, and maximum wind speeds of 7.2 km/h.
```

The implementation explains the mismatch:

- `miner/src/forecast.ts` receives a location and count, not a requested start;
- it slices the provider arrays at index zero;
- `miner/src/handler.ts` reads only an `hours` query parameter;
- the prose does not guarantee every requested variable survives conversion.

### Integrity check

A phrase closely copying the published ground truth and claiming the forecast
was unavailable scored approximately `0.992`, but that would be an invalid
shortcut for this question. A read-only Open-Meteo query confirmed that the
requested period was inside the provider horizon and returned all 48 hours.

The legitimate candidate is date-aware and truthful. For the captured model
run, the requested series ranged from `24.5–30.5°C` and `0.0–0.3 mm` hourly
precipitation. This converted summary scored against the exact active champion:

```text
A 48-hour hourly model forecast is available for Tokyo starting
2026-09-01T06:00:00Z, with the complete hourly temperature and precipitation
series included. Temperatures range from 24.5 to 30.5 degrees Celsius and hourly
precipitation ranges from 0.0 to 0.3 millimeters. Recheck the Japan
Meteorological Agency closer to the cutoff because forecasts change.
```

```text
current converted answer  0.0069898367
truthful candidate         0.9963806868
factor                     142.55x
epoch-284 leader           0.009923598
candidate / leader         100.41x
```

This is an offline counterfactual, not a live score. It becomes actionable only
if the full 48-point response is correct and Telegraph conversion preserves the
tested summary.

### Required implementation contract

- Parse explicit start, end/cutoff, horizon, timezone, and requested variables.
- Fetch the provider interval containing the requested period.
- Slice by timestamp, not array position from the current hour.
- Return the complete hourly series plus a concise summary.
- Include temperature and precipitation in both structure and prose.
- For a past period, use a historical source or say it is unavailable.
- For a period beyond the provider horizon, give a request-specific, truthful
  unavailability response and an authoritative source to check later.
- Never blanket-refuse forecast questions merely because that can match one
  ground truth.

## Rank-one lever 2: complete SSL diagnostic prose

The epoch question asked about chain completeness and hostname validation for
`api.example.com`. The host was unreachable. LiveCert truthfully said DNS
failed, but its converted answer dropped every requested diagnostic dimension.

The following remains truthful while directly answering what can and cannot be
established:

```text
api.example.com is unreachable, so its TLS/SSL certificate configuration cannot
be analyzed currently. Certificate chain completeness and hostname validation
cannot be verified. When reachable, run openssl s_client -connect
api.example.com:443 -showcerts. Verify the server presents leaf and intermediate
certificates to build a complete trust path. Inspect Subject Alternative Name
and confirm DNS:api.example.com. Use SSL Labs Server Test to confirm certificate
chain, hostname validation, and overall grade.
```

Exact offline result:

```text
current converted answer  0.0044928235
truthful candidate         0.0106115844
factor                     2.36x
epoch-284 leader           0.0060074595
candidate above leader     76.64%
```

This does not fabricate a certificate result. It states the failed observation,
names the unresolved checks, and gives the verification method. The same pattern
should be rendered from real fields for reachable domains rather than emitted as
a domain-specific hardcoded phrase.

## Rank-one lever 3: point versus window Storm semantics

The committed replay corpus currently reports `15/15` because it checks:

- a non-unknown verdict;
- a numeric risk;
- the echoed `window_hours`;
- consistency between risk and category.

It does not compare LiveCert's meteorological values with the paid response, so
"answered correctly" is too strong.

One public paid question asks:

```text
What is the storm risk at latitude 14.6042, longitude 120.9822 in 44 hours?
Report wind speed, gusts, precipitation and an overall risk between 0 and 1.
```

The paid responder interpreted this as a point offset and returned values at
`2026-08-28T10:00Z`: wind `18.5`, gusts `49.7`, precipitation `1.2`, and risk
`0.552`.

LiveCert's replay at `2026-08-26T16:16:36Z` interpreted the same text as a
duration and returned maxima anywhere in the next 44 hours: wind `26.9`, gusts
`70.9`, precipitation `2.4`, risk `0.78`, and `peak_at 2026-08-28T07:00`.

Both answers can be internally consistent; only the first answers "in 44
hours." This is the remaining contract defect.

[Public paid receipt](https://explorer.telegraphprotocol.com/signal/0xab5ed4c57e8c8d840fa7fd9ff126351103c5edc36b440cd46b0d0c42e3a0001e)

The parser should produce an explicit time mode:

| Wording | Mode | Evaluation |
|---|---|---|
| `right now`, `currently` | point | nearest current hourly row |
| `in N hours`, `N hours ahead`, `at <time>` | point | nearest requested timestamp |
| `over/within/during the next N hours` | window | aggregate only that interval |
| ambiguous `next N hours` | window | aggregate and label maxima |

Point responses need `valid_at` and point values. Window responses need
`window_start`, `window_end`, aggregation labels, and `peak_at`. Add a fixture
that compares values at the selected index, not just response shape.

## CertWatch state after concurrent hardening

The recent commits materially improve safety and durability, but Track 3 is not
yet an adoption advantage.

At capture time the canonical deployment returned:

```json
{
  "domains": ["github.com", "cloudflare.com", "expired.badssl.com", "vercel.com", "telegraphprotocol.com"],
  "latest": [],
  "totals": {"requests": 0, "spentUsd": 0, "sslVerificationRequests": 0},
  "historySource": "instance",
  "payer": null,
  "keyConfigured": false,
  "writesEnabled": false,
  "paidCallsToday": 0,
  "paidCallsPerDayCap": 0
}
```

No `certwatch.yml` workflow run existed yet. The committed history was still
empty.

Residual issues:

- The browser dashboard sends no bearer token, while every paid write endpoint
  now requires one. Enabling writes does not create a usable self-service flow.
- The API daily counter and rate limiter are process memory. Serverless cold
  starts reset them, so they do not prove a global worst-case spending cap.
- The scheduled sweep bypasses `guardPaid`; it is limited to ten domains per
  run but has no durable daily budget. Manual workflow dispatches can repeat it.
- Committing runtime history to `main` creates push races and noisy product-code
  history. The workflow should use `npm ci`, bot attribution, and conflict-safe
  persistence if this design is retained.
- `historySource: instance` proves the public deployment had not yet loaded the
  committed record at capture time. Recheck after deployment propagation.

Do not fund the app until a durable budget boundary and an intentional user
flow exist. A protected admin-only demo can be safe, but it cannot also be
presented as genuine user adoption.

## Execution queue before the next scored epoch

| Priority | Move | Expected leverage | Acceptance gate |
|---:|---|---|---|
| P0 | Weather temporal router and full hourly series | Largest measured score delta | Exact epoch question returns Sep 1–3 rows; converted prose retains start, temp, precip |
| P0 | SSL diagnostic renderer | Low-risk, measured above current leader | Unreachable and reachable fixtures cover chain, trust, SAN, expiry without invented facts |
| P0 | Storm point/window parser | Fixes a real paid contract and only active-demand intent | Public point question selects hour 44; window question still aggregates |
| P0 | Pin scorer binaries and public score fixtures | Deterministic local iteration | Raw/converted/reported comparison reproduced with `probe-champion.mjs` |
| P1 | Deploy, then replay exact public questions | Separates local green from live truth | Deployment SHA recorded; output and conversion captured |
| P1 | Ask organizers the aggregation question | Prevents optimizing the wrong objective | Written answer saved in docs |
| P2 | Repair CertWatch user/budget model | Needed for real Track 3 requests | Durable cap, scheduled run, funded test, real external user receipt |

Do not change registration metadata merely to test `label_field` before these
content fixes. The score API proves conversion is the direct scorer input; an
`updateMiner` adds lifecycle risk without first exhausting the no-registration
changes.

## Organizer question that changes strategy

The rules say Track 1 uses an average Canonical Score but do not define the
aggregation window. Ask verbatim:

> For Track 1 normalized performance, exactly which canonical scores and time
> window are averaged: latest epoch, all epochs after registration, the Aug
> 17–Sep 7 period, or a final judging snapshot? When the champion scorer changes,
> are scores produced by superseded scorers recomputed, excluded, or retained?
> For a miner serving multiple intents, are normalized scores averaged, summed,
> or treated as separate prize entries, and can one registration occupy multiple
> prize slots?

Until answered, use latest-epoch rank as the operational feedback signal but do
not call it the final hackathon formula.

## Reproduction

Active champion records:

- [SSL registry](https://devnode.telegraphprotocol.com/api/wasm?intent=SSL_VERIFICATION) — registration 631, commit-pinned `SSL_VERIFICATION.wasm`.
- [Storm registry](https://devnode.telegraphprotocol.com/api/wasm?intent=STORM_ALERT) — registration 453, commit-pinned `storm_rpen.wasm`.
- [Weather registry](https://devnode.telegraphprotocol.com/api/wasm?intent=WEATHER_FORECAST) — registration 636, commit-pinned `wf_mini.wasm`.
- [Champion source repository](https://github.com/zkasuran/telegraph-salience-scorer).

Example offline workflow:

```powershell
Invoke-WebRequest '<champion wasm_url>' -OutFile "$env:TEMP\champion.wasm"
Invoke-WebRequest 'https://devnode.telegraphprotocol.com/scores?intent=WEATHER_FORECAST&limit=500' -OutFile "$env:TEMP\scores.json"
node docs/codex-worklog/probe-champion.mjs --wasm "$env:TEMP\champion.wasm" --scores "$env:TEMP\scores.json" --miner livecert --epoch 284
node docs/codex-worklog/probe-champion.mjs --wasm "$env:TEMP\champion.wasm" --scores "$env:TEMP\scores.json" --miner livecert --epoch 284 --answer-file docs/codex-worklog/epoch284-weather-candidate.txt
```

The helper makes no network requests. Keep the download URL, registry response,
epoch, and candidate text with every claimed counterfactual; a scorer can be
replaced later.

## Verification and mutation boundary

- Current miner suite: `73/73` passed, including live checks.
- App TypeScript compiler: passed directly with the repo-local compiler. A
  simultaneous `npm run typecheck` attempt first failed in the local npm launcher
  before TypeScript ran; this was an environment failure, not a source failure.
- Read-only live checks covered the scorer registry, public score records, epoch
  clock, public paid receipts, Open-Meteo, miner replay, CertWatch state, and
  GitHub workflow history.
- This reconnaissance changed only `docs/codex-worklog`. It did not change
  miner/app product code, registrations, deployments, wallets, social accounts,
  or paid protocol state.
