# Track 1 audit evidence — 2026-08-28

This is the evidence log for [`../../codex_audit.md`](../../codex_audit.md). It records current verification separately from older handoffs and does not claim that wallet, social, submission, or Track 3 gates have passed.

## Mutation boundary

- Product source, manifests, workflows, deployments, registrations, wallets, and external accounts were not changed.
- Existing work in `fable_review_audit.md` was preserved.
- Read-only public API, deployed endpoint, GitHub, rules, and documentation checks were performed.
- Only this audit documentation was added or indexed.

## Repository state at start

```text
HEAD 40a3977 (main, origin/main)
M fable_review_audit.md
```

The modified Fable audit belongs to concurrent/user work and was not edited or staged.

## Current official rules

Verified at [the live rules page](https://hackathon.telegraphprotocol.com/rules):

- Track 1 closes August 31; miners must remain operational throughout Track 3 to September 7.
- 75% is normalized performance within an intent.
- 25% is public X engagement and transparency.
- An intent needs at least three active miners and 100 real Track 3 application requests.
- Winners are described as having the highest total normalized scores across intents.
- Artificial metric inflation or gaming is disqualifying.

The exact multi-intent/X aggregation operator and treatment of ineligible intents are not stated.

## Live registration

Read-only response from `GET /api/miners/236`:

```text
registration_id    236
slug               livecert
activation_status  active
supported_intents  SSL_VERIFICATION, STORM_ALERT, WEATHER_FORECAST, IP_GEOLOCATION
yaml_hash           a09261a312610e2d1dc266f149078e41386eedb2a2524947fdbdd9f2318eb82d
rejection_reason    null
retrying            false
```

The pinned active YAML has `rate_limit_per_sec: 20` and no `limitations` rate entry.

## Epoch 287

Exact public score-feed snapshot:

```text
SSL_VERIFICATION
  livecert     #1  0.009729808
  txlens       #2  0.006509437
  ssllabs      #3  0.005040838

STORM_ALERT
  livecert     #1  0.010451338
  zeus         #2  0.0050844015
  amanat       #3  0.003264374

WEATHER_FORECAST
  verity       #1  0.010762119
  onlookout    #2  0.009585084
  isobar       #3  0.009568645
  livecert     #4  0.008696965

IP_GEOLOCATION
  livecert     #1  0.9920414
  iplocate     #2  0 (undeclared endpoint failure)
```

The latest Storm converted answer truthfully reported Denver, a 48-hour window, wind, gust, precipitation, and risk. The latest IP record illustrates provider disagreement: LiveCert returned San Jose/Cisco OpenDNS while the benchmark expected likely Ashburn and an abuse-history statement.

## Current intent counts

Read-only `GET /engine/v1/intents` reported 45 canonical intents. Relevant counts:

```text
SSL_VERIFICATION      4
STORM_ALERT           5
WEATHER_FORECAST     11
IP_GEOLOCATION        2
LANGUAGE_TRANSLATION  2
ACADEMIC_SEARCH       2
CVE_LOOKUP            3
CONTENT_EXTRACTION    1
NEWS_HEADLINES        1
```

Joining Translation or Academic creates the third miner. Joining Content or News does not.

## Candidate leaderboard correction

Epoch-287 public leaders:

```text
LANGUAGE_TRANSLATION  0.0035030427
ACADEMIC_SEARCH       0 (both miners failed calls)
CONTENT_EXTRACTION    0
NEWS_HEADLINES        0 (upstream parameter failure)
CVE_LOOKUP            0.9847427
```

Stored deployed-code pre-tuning from the Track 1 handoff:

```text
LANGUAGE_TRANSLATION  0.61434, 9/9 prior wins
ACADEMIC_SEARCH       0.02952, 18/19 prior wins
CONTENT_EXTRACTION    1.00000, 6/6
NEWS_HEADLINES        0.00626, 18/22
CVE_LOOKUP            0.32609, 9/11 versus the then-current field
```

The CVE target materially changed after those measurements.

## Pending-manifest blocker

Current `track1-miner/miner.yaml` SHA-256:

```text
f8eea144c2a4f10a0e347caeb2a503a9590274b011fa4444ddca7982b5236803
```

It declares nine intents and a top-level NVD limitation of 5 requests per 30 seconds. The [official YAML docs](https://docs.telegraphprotocol.com/docs/miners/yaml-config) state that declared rate limits are counted node-wide per miner, not per caller. No endpoint scope exists on this entry. The file must not replace the healthy registration in this form.

## Validation

Local npm could not launch because the machine's global npm shim points at a missing `npm-cli.js`. The repo-local TypeScript compiler and Node runner were invoked directly instead.

```text
TypeScript typecheck      PASS
Full miner test suite     109/109 PASS
Production verification  18/18 PASS
Production latency        median 552ms, p95 1219ms
Registration 236          active
```

The first sandboxed `test:unit` run showed two network-denied failures, revealing that suites not named `(live)` still call GitHub and Open-Meteo. With documented network access, 76/76 of that selection passed.

Five unregistered endpoint smoke tests:

```text
/extract     HTTP 200  0.318s  correct email/phone extraction
/translate   HTTP 200  1.030s  "Good morning" -> "Bonjour"
/cve         HTTP 200  0.439s  Log4Shell CVSS/affected/KEV result
/papers      HTTP 200  0.925s  five relevant OpenAlex results
/headlines   HTTP 200  0.806s  six current technology headlines
```

These do not replace sandbox validation or scorer replay.

## Workflow evidence

Latest public uptime run: [33102814026](https://github.com/Harshyadav442277/miner/actions/runs/33102814026).

- `check`: success, including live acceptance.
- `scores`: success.
- `live-tests`: failed at `npm install`; tests never ran.

Cause: uptime workflow uses `working-directory: miner`; actual path is `track1-miner/miner`.

The ordinary CI workflow was green in the latest inspected runs.

## CertWatch blocker

The workflow writes `track3-certwatch/data/history.json`, but `.gitignore:6` ignores `data/`. The file exists locally but is not tracked, and `git check-ignore` identifies the root rule. Consequently the advertised git-backed durable store cannot currently publish a record.

Public state at capture:

```json
{
  "latest": [],
  "totals": {"requests": 0, "spentUsd": 0, "sslVerificationRequests": 0},
  "historySource": "instance",
  "payer": null,
  "keyConfigured": false,
  "writesEnabled": false,
  "paidCallsPerDayCap": 0
}
```

Scheduled CertWatch runs show success because the missing key gate exits without spending.

## Public surface

At capture, [the repository](https://github.com/Harshyadav442277/miner) was public with:

```text
stars 0 · forks 0 · watchers 0 · issues 0
description empty · homepage empty
```

Root README showed epoch 285 and Track 2 as planning. Track-specific READMEs reported 103 and 23 tests rather than the verified 109. No verifiable X post URL was found in repository documentation; the drafts report an initial attempt at roughly 11 impressions.

## Security observations

- The SSRF guard approves one DNS resolution, then `tls.connect({host})` resolves again. This is a DNS-rebinding time-of-check/time-of-use gap.
- The request handler logs the complete URL and query string by default. General-purpose extraction/translation inputs can place user-supplied content or PII into provider logs.
- The global cache is bounded to 500 entries and production endpoint behavior was healthy; no source change was made.

## Verification boundary

No on-chain update, sandbox submission, paid Telegraph request, X post, GitHub mutation, deployment, wallet use, or third-party message was performed. All strategic numbers are either linked live snapshots or explicitly identified handoff measurements requiring refresh before registration.
