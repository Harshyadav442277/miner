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

## 2026-08-26 — live scoring reconnaissance

### Request

Improvise beyond the initial review while continuing to document the work in
this folder. Seek a legitimate asymmetric advantage capable of reaching rank
one.

### Work performed

- Downloaded the active, commit-pinned SSL, Storm, and Weather champion WASM
  binaries from the public scorer registry and executed them locally.
- Downloaded public score records and proved that the reported live score is
  computed from `converted_answer`, not the raw miner JSON.
- Measured truthful counterfactual converted answers against the exact
  epoch-284 question, ground truth, and active binary.
- Queried Open-Meteo for the exact Weather dates to reject an apparently
  high-scoring but false "unavailable" shortcut.
- Inspected public paid Storm receipts and replayed one exact coordinate/offset
  request against LiveCert.
- Audited concurrent Storm, SSL, score-history, and CertWatch changes without
  overwriting them.
- Rechecked the canonical CertWatch deployment and workflow history.
- Added `probe-champion.mjs` as a network-free reproduction tool.
- Re-ran validation at current HEAD: miner `73/73` passed; the app's repo-local
  TypeScript compiler passed.

### Main outcomes

- Weather is now the highest measured rank-one lever. LiveCert answers the next
  48 hours instead of the explicitly requested future 48 hours. A truthful,
  date-aware converted summary scored `0.9963806868` offline versus the reported
  `0.0069898367`, a `142.55x` counterfactual improvement.
- A complete but truthful SSL unreachable diagnostic scored `0.0106115844`
  offline versus LiveCert's `0.0044928235` and the epoch leader's
  `0.0060074595`.
- Storm's new replay is structurally green but semantically incomplete: "in 44
  hours" is still evaluated as the maximum "over the next 44 hours." The
  corpus test does not compare the returned weather values with the paid result.
- The direct scorer input is converted prose. Changing `label_field` remains a
  hypothesis, not the first move.
- CertWatch is safe-disabled and empty in production; its in-memory API cap is
  not a global serverless budget, the workflow has not run, and bearer-token
  protection currently has no compatible dashboard flow.

### Recommended execution order

1. Implement the Weather temporal router and preserve the complete hourly
   series plus requested variables through conversion.
2. Enrich SSL explanations from real diagnostic fields.
3. Split Storm point-offset and duration-window semantics, then strengthen the
   real-question fixture.
4. Deploy once and capture the exact output/conversion before changing
   registration metadata.
5. Obtain a written ruling on score aggregation and scorer replacement.
6. Make CertWatch's budget durable and its user flow intentional before funding.

### Mutation and verification boundary

Only files in `docs/codex-worklog` were added or updated. No product code,
deployment, registration, wallet, paid request, or external account was
mutated. See
[`2026-08-26-live-scoring-recon.md`](2026-08-26-live-scoring-recon.md) for the
evidence, exact candidates, integrity boundary, and reproduction procedure.

## 2026-08-28 — protect the Track 1 lead

### Request

Re-audit Track 1 for legitimate asymmetric advantages after the miner reached
live ranks, preserving all active work and continuing the Codex evidence log.

### Main outcomes

- Registration 236 is active and epoch 287 places LiveCert first in SSL, Storm,
  and IP; Weather is fourth.
- The pending nine-intent manifest must not be signed: its NVD 5-per-30-second
  rate limitation applies node-wide to the whole miner.
- Translation and Academic are the two strongest additions because LiveCert's
  prior deployed-code scores clear the current low bars and joining creates the
  third miner. CVE's new 0.9847 leader removes that opening.
- CertWatch durability is not closed: the workflow's history file is ignored by
  `data/`, and the public app remains unfunded with zero requests.
- Scheduled live tests fail before execution because the workflow points at a
  nonexistent `miner` directory; the actual package is `track1-miner/miner`.
- The explicit 25% X term and 100-request Track 3 guardrail now dominate further
  incremental scorer tuning.

### Verification

- TypeScript typecheck passed.
- Full miner suite passed 109/109 with network access.
- Production verification passed 18/18, median 552ms and p95 1219ms.
- All five deployed but unregistered endpoints returned HTTP 200 in smoke tests.

### Mutation boundary

Only audit documentation was added or indexed. Product code, manifest,
workflows, deployment, registration, wallet, X, GitHub, paid requests, and the
concurrent `fable_review_audit.md` change were not modified. See
[`2026-08-28-track1-audit.md`](2026-08-28-track1-audit.md).
