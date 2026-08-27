# Adversarial strategy review — 2026-08-26

## Decision

Do not expand intent breadth yet. First make the currently registered intents
answer the exact shapes visible in paid public traffic.

The public Signal Explorer is a legitimate shadow acceptance corpus: it exposes
questions that buyers actually paid to ask. Replaying one of those questions
found a deterministic failure that the local test suite missed.

## Decisive live finding

Public signal:

<https://explorer.telegraphprotocol.com/signal/0xab5ed4c57e8c8d840fa7fd9ff126351103c5edc36b440cd46b0d0c42e3a0001e>

The question asks for storm risk at explicit latitude and longitude, 44 hours
ahead, including wind speed, gusts, precipitation, and an overall risk between
0 and 1. Replaying it against LiveCert returned an unknown verdict and no
resolved location.

Relevant implementation evidence:

- `miner/src/extract.ts:53-77` — strings passed to `RegExp` use single
  backslashes for `\s`, `\b`, and `\d`; JavaScript string parsing corrupts the
  intended regular expressions.
- `miner/src/storm.ts:76` — coordinate parsing recognizes only a bare
  `lat,lon` value.
- `miner/src/storm.ts:17` and `miner/src/storm.ts:172-195` — the response is a
  maximum over a fixed 48-hour window rather than the requested point in time.
- The result exposes a categorical verdict but no requested 0–1 storm-risk
  value.

Passing local tests therefore does not demonstrate compatibility with live
tournament questions.

## Scoring and multi-intent conclusion

The live node and official integration types show one rank record per
miner-intent pair. A weak intent does not reduce the miner's rank in another
intent.

The hackathon rules nevertheless combine four incompatible phrases without
defining an aggregation operator:

- independent leaderboards by intent;
- performance relative to a specific intent;
- every miner scored out of 100;
- winners selected by total normalized scores across all intents.

There is no backend overall leaderboard. Consequently, best-of, arithmetic
mean, sum, and separate miner-intent entries are all unsupported guesses for the
cash-prize calculation.

Organizer question to preserve verbatim:

> For one registration declaring intents A/B/C, is the 75-point performance
> term calculated as max, mean, sum, or three separate miner-intent entries? Is
> the 25-point X score applied once or per entry? Can one registration occupy
> multiple prize positions? Are ineligible intents excluded? Do both
> direct-targeted and auto-routed paid calls count toward the 100 Track-3-request
> guardrail?

Do not change the registration solely to add or remove intents until this is
answered.

## Demand-data correction

`/api/miners.total_requests_served` is a lifetime total for the miner. It is not
partitioned by supported intent. Assigning the same total to every intent served
by a multi-intent miner duplicates traffic.

Therefore the current claims that Storm has 334 attributable requests or 20
times SSL demand are not established by the available field. Additionally,
traffic before Track 3 opens cannot satisfy the rule requiring real requests
from Track 3 applications.

## Track 2 legitimacy boundary

Official material permits submitting a miner, an evaluation script, or both.
The live registry also accepts overlapping miner/scorer ownership.

A legitimate scorer must:

- encode general intent correctness;
- treat equivalent JSON and prose answers fairly;
- include neutral and adversarial fixtures;
- avoid miner slug, wallet, field-name, schema, or phrase fingerprints;
- publish enough source and reasoning for manual robustness review.

Tailoring a scorer to LiveCert's output would risk Rule-04 disqualification.
Track 2 also has lower expected value than originally assumed: the production
baseline is not the tutorial word-overlap scorer, and the current SSL and Storm
champions have strong benchmark margins.

## Track 3 application state

At review time, CertWatch's public state returned:

- no domains;
- no requests;
- no SSL requests;
- no payer;
- `keyConfigured: false`.

Architectural blockers:

- `app/src/store.ts:27-35` stores Vercel state in ephemeral `/tmp`;
- `app/src/server.ts:102-109` disables background sweeps on Vercel;
- `app/src/server.ts:53-83` exposes unauthenticated operations that can trigger
  paid work once a wallet is funded.

Do not fund the public deployment until authentication, rate limits, spending
caps, persistence, and reliable scheduling exist.

## Intent portfolio

The eligibility sweet spot is an intent with exactly two active incumbents:
joining makes LiveCert the required third miner. A one-incumbent intent remains
ineligible after LiveCert joins.

`CVE_LOOKUP` is the most coherent next expansion because it reinforces the
security-monitoring product. Sports can cover `SPORTS_SCORE` and `GAME_RESULT`
with one adapter but requires more time and trustworthy live data. Media
authenticity intents should not be attempted with superficial metadata checks.

No breadth move outranks repairing current paid-query failures.

## Distribution strategy

Telegraph already maintains an official MCP server. The higher-conversion move
is a five-minute starter recipe using the official integration, followed by
hands-on Discord support and verifiable example receipts.

X updates should be evidence-led:

1. A paid-question failure and verified before/after correction.
2. A precise protocol or scoring discovery useful to other builders.
3. Real CertWatch users, use cases, and receipts.
4. Uptime and rank evidence with honest uncertainty boundaries.

Avoid claiming routed calls are free, historical request totals are Track 3
adoption, or an intent is rank one before the live score exists.

## Verification completed

- Miner tests: 65 passed.
- App TypeScript compilation: passed.
- Miner health endpoint: responsive during review.
- Registration 225: active and declares `SSL_VERIFICATION`, `STORM_ALERT`, and
  `WEATHER_FORECAST`.
- No LiveCert score existed at the reviewed epoch.
- Only a manual successful uptime workflow run was observed; scheduled uptime
  execution remained unproven.

## Remaining unknowns

- Hackathon aggregation across multiple intents.
- Whether direct-targeted and auto-routed calls are treated identically for the
  Track 3 request guardrail.
- Whether a registration update resets any hackathon evaluation or practical
  grace state.
- Actual LiveCert rank after the first scored epoch.
- Exact evaluator behavior for the currently registered intents.

