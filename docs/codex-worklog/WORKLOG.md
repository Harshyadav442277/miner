# Worklog

## 2026-08-26 — adversarial strategy review

### Request

Identify legitimate structural advantages capable of producing a rank-one
Telegraph Hackathon result. Review the strategy prompt in
`docs/CODEX_REVIEW_PROMPT.md`; do not implement fixes during the review.

### Work performed

- Read the repository's protocol facts, judging notes, intent occupancy,
  market data, gap register, source, tests, deployment configuration, app, and
  submission material.
- Verified registration 225 and current intent support against Telegraph's live
  node API.
- Compared the official hackathon rules, miner registration/routing documents,
  scoring-module guide, integration source, live leaderboards, live scorer
  registry, and public signal feed.
- Replayed representative natural-language requests against the deployed
  miner, including an exact public paid `STORM_ALERT` question.
- Audited CertWatch's deployed state, persistence model, scheduler behavior,
  paid-call endpoints, and current adoption counters.
- Ran the miner test suite: 65 tests passed.
- Ran the app TypeScript check successfully.
- Inspected the GitHub uptime workflow history. Only a manual successful run was
  observed at review time; scheduled execution was not yet demonstrated.

### Main outcomes

- The highest-priority defect is a mismatch between real tournament questions
  and the deployed Storm input/output contract. A public coordinate-and-time
  question replayed against LiveCert returned `verdict: unknown`.
- The natural-language place regexes contain incorrectly escaped patterns.
- Storm processing accepts only bare `lat,lon`, uses a fixed 48-hour maximum,
  and does not provide the requested numeric 0–1 risk.
- Protocol ranking is independently maintained per miner and intent. The
  hackathon's cross-intent cash-prize aggregation remains unspecified.
- `total_requests_served` is per miner rather than per intent. Existing demand
  tables duplicate multi-intent miner totals and cannot prove Storm has 334
  attributable requests.
- Pre-Track-3 traffic cannot satisfy the rule requiring at least 100 real
  requests from Track 3 applications.
- CertWatch currently has no configured key, domains, requests, or persistent
  serverless state. Its public paid-call triggers need authentication, rate
  limiting, and a spending cap before funding.
- Same-participant miner and scorer submissions appear permitted, provided the
  scorer is miner-agnostic. A scorer tailored to LiveCert's schema or wording
  would create Rule-04 gaming risk.
- Current SSL and Storm scorer champions have strong benchmark margins, making
  Track 2 lower expected value than fixing the miner and establishing genuine
  Track 3 adoption.
- Building another MCP server is unnecessary because Telegraph already
  publishes an official MCP implementation.

### Recommended execution order

1. Build a replay corpus from public paid signals and repair the existing three
   intent contracts.
2. Ask organizers to define multi-intent prize aggregation and eligible request
   counting in writing.
3. Make CertWatch persistent, scheduled, abuse-resistant, and genuinely useful
   before funding it.
4. Recruit real Track 3 users and publish evidence-led X updates.
5. Verify scheduled uptime and reconcile stale submission documentation.
6. Consider `CVE_LOOKUP` only after the existing intents pass real-question
   replays.
7. Attempt a fair SSL scoring module only if the higher-EV work is complete.

### Mutation and verification boundary

The strategy review itself was read-only. No source, deployment, registration,
wallet, social account, or external service was changed. This worklog folder is
the first repository mutation resulting from the review.

See [`2026-08-26-strategy-review.md`](2026-08-26-strategy-review.md) for detailed
evidence and unresolved questions.

