# Track 1 Codex Audit — Protect the Lead, Make It Pay

Captured: 2026-08-28 (Asia/Calcutta)
Scope: live registration, current leaderboards, pending intent expansion, miner reliability, public proof, X, and Track 3 eligibility.
Evidence log: [`docs/codex-worklog/2026-08-28-track1-audit.md`](docs/codex-worklog/2026-08-28-track1-audit.md)

## Remediation update — later on 2026-08-28

Registration 260 is now active with the six-intent manifest. The dangerous
node-wide NVD limitation is absent, all six endpoints have release checks, and
the live-test workflow path and DNS TOCTOU issue were fixed before this pass.

The subsequent hardening pass removed the three undeclared implementations,
made logs private by default, blocked IPv4-mapped IPv6 SSRF bypasses, aligned
routes with the manifest, and added cache coverage. Its acceptance run also
found a new production blocker: MyMemory returned 429 from Vercel for the now
registered Translation endpoint. A later retry passed after the quota recovered;
a tested failover is implemented locally but must still be deployed and
re-verified. See
[`docs/codex-worklog/2026-08-28-track1-hardening.md`](docs/codex-worklog/2026-08-28-track1-hardening.md).

Everything below is the point-in-time pre-registration audit; resolved findings
remain for provenance rather than as current instructions.

## Executive decision

Track 1 is no longer primarily a miner-quality problem. Registration 236 is active and epoch 287 confirms rank 1 in `SSL_VERIFICATION`, `STORM_ALERT`, and `IP_GEOLOCATION`. The main risk is winning leaderboards that do not become prize-eligible, while leaving the explicit 25% X term nearly unused.

**Do not sign the pending nine-intent `miner.yaml` as written.** It places NVD's 5-requests-per-30-seconds quota in the top-level `limitations` block. Telegraph's official YAML documentation says rate limitations are counted **node-wide per miner**, not per endpoint. That would throttle every intent, including the three current rank-1 paths. Registration 236's pinned YAML does not contain this limitation.

The highest-EV route is:

1. Keep registration 236 active until a corrected update is fully gated.
2. Prepare a six-intent update: the current four plus `LANGUAGE_TRANSLATION` and `ACADEMIC_SEARCH`; omit CVE and remove the global NVD quota.
3. Repair the eligibility application and monitoring workflows before funding anything.
4. Turn the two eligible rank-1 intents—SSL and Storm—into 100+ genuine Track 3 requests each.
5. Execute X distribution now; another scorer-tuning day is worth less than the unclaimed social quarter.

## Live position

Sources: [official rules](https://hackathon.telegraphprotocol.com/rules), [registration 236](https://devnode.telegraphprotocol.com/api/miners/236), public score feeds, and [LiveCert Explorer](https://explorer.telegraphprotocol.com/miners/livecert).

| Intent | LiveCert epoch 287 | Leader | Miner floor | Cash-prize readiness |
|---|---:|---|---:|---|
| `SSL_VERIFICATION` | **#1 · 0.009729808** | LiveCert | 4 | Miner-count ready; needs 100 Track 3 requests |
| `STORM_ALERT` | **#1 · 0.010451338** | LiveCert | 5 | Miner-count ready; needs 100 Track 3 requests |
| `IP_GEOLOCATION` | **#1 · 0.9920414** | LiveCert | 2 | Ineligible until a third miner joins; also needs 100 requests |
| `WEATHER_FORECAST` | #4 · 0.008696965 | 0.010762119 | 11 | Miner-count ready; about 80.8% of the current leader |

The live rules give 75% to normalized performance within an intent and 25% to X engagement. They say winners have the highest “total normalized scores across all intents,” but do not define how the X term is applied across multiple intent entries or whether ineligible intents are excluded from the total. Obtain that ruling in writing; do not pretend the missing operator is settled.

Track 3 has not opened yet, so none of today's traffic can satisfy its 100-request guardrail. Performance is banked; eligibility is not.

## Candidate-intent decision

Current occupancy and epoch-287 bars:

| Candidate | Miners now / after us | Current leader | Local deployed-code evidence | Decision |
|---|---:|---:|---|---|
| `LANGUAGE_TRANSLATION` | 2 / **3** | 0.003503 | 0.61434 mean; 9/9 prior wins | **Add after fresh scorer replay** |
| `ACADEMIC_SEARCH` | 2 / **3** | 0; both failed latest calls | 0.02952 mean; 18/19 prior wins | **Add after fresh scorer replay** |
| `CONTENT_EXTRACTION` | 1 / 2 | 0 | 6/6, five exact GT reproductions | Do not spend update risk yet; remains below miner floor |
| `NEWS_HEADLINES` | 1 / 2 | 0 | 18/22 prior wins | Below miner floor and stale-ground-truth ceiling |
| `CVE_LOOKUP` | 3 / 4 | **0.9847427** | Local prior mean 0.32609 | **Drop from update**; opening disappeared |

The CVE recommendation in the handoff is stale. The new `patchsignal-cve` result changes the target from an easy zero-score field to a near-saturated one.

## Findings ordered by rank risk

### P0 — The pending YAML can throttle every winning intent

`miner.yaml:274-279` declares:

```yaml
limitations:
  - property: rate
    value_num: 5
    window_seconds: 30
```

The [official YAML reference](https://docs.telegraphprotocol.com/docs/miners/yaml-config) says rate counts are node-wide per miner because all traffic shares one upstream allowance. This is not scoped to `/cve`. A successful update could therefore turn a CVE safety measure into a global 0.167-request/second ceiling during the exact week when the project needs demand.

**Gate:** omit CVE and the limitation from the competition manifest, or isolate CVE in a different registration after organizer confirmation. Never sign the current hash `f8eea144...`.

### P0 — CertWatch's claimed durable history is still ignored

`certwatch.yml` writes `track3-certwatch/data/history.json` and then tries to commit it. Root `.gitignore` contains `data/`, so that exact file is ignored. `git diff --quiet` sees no tracked change and the workflow exits “no change”; `git add` would also refuse it.

Live evidence confirms the result:

```text
historySource: instance
requests: 0
sslVerificationRequests: 0
keyConfigured: false
writesEnabled: false
```

The scheduled workflow is green only because no key is configured and it skips paid work. G18 is not closed in production.

**Gate before funding:** move history to an unignored path or add a narrow negation, track an initial file, prove one workflow-written record appears at the raw GitHub URL, and prove the deployment reports `historySource: committed`.

### P0 — Eligibility is the binary multiplier

An intent without three active miners and 100 real Track 3 application requests cannot win cash, even at rank 1. SSL and Storm are the only present LiveCert victories that already clear the miner-count half.

The rank-1 strategy must produce genuine usage:

- CertWatch provides a coherent recurring SSL need, but it needs a durable record, funded test wallet, and real users.
- Publish a Storm integration recipe and recruit an actual Track 3 weather, travel, logistics, or field-operations app.
- A compact `StormRelay` pattern—monitor a real location, assess Storm, and translate the alert into the user's selected language—could create legitimate demand for both Storm and Translation if built for real users, not as a request counter.
- Recruit a third IP miner openly. Competition that makes the intent eligible is legitimate; sockpuppet registration is disqualifying.

### P1 — Scheduled live testing is red

The latest public `uptime` run failed. The health, acceptance, and score jobs succeeded; `live-tests` failed before tests because `.github/workflows/uptime.yml:90-92` uses `working-directory: miner`, but the package is at `track1-miner/miner`.

This creates a red operational signal while silently skipping the tests meant to protect continued eligibility through September 7.

### P1 — “Safe to register” does not verify the pending manifest

`tools/verify-deploy.mjs` checks health, SSL, Storm, Weather, and input handling, then prints `ALL CHECKS PASSED — safe to register.` It does not check Content, Headlines, Translation, CVE, or Papers, although the pending manifest declares all five.

The audit smoke-tested all five successfully, but an ad-hoc check is not a release gate. The verifier must derive coverage from the manifest or explicitly contain one semantic check for every declared endpoint.

### P1 — X and public adoption are close to zero

The repository documents one post attempt at roughly 11 impressions but contains no verifiable post URLs or engagement log. The public GitHub repository currently has zero stars, forks, watchers, and issues; its description and homepage are blank.

Rank 1 already saturates the performance term in two eligible-miner-count intents. Another small scorer improvement cannot substitute for the published 25% X term.

Use evidence-led posts:

1. Epoch 284 → 287: `#3/#3` to `#1/#1`, with exact causes and live links.
2. The globally scoped YAML-rate-limit discovery—useful to every multi-intent miner.
3. A real Track 3 integration receipt and which miner the router selected.
4. An open invitation for Storm/SSL application builders, followed by genuine support and follow-ups.

Reply under Telegraph and builder posts rather than broadcasting into an empty audience. Do not buy or coordinate engagement.

### P1 — The public narrative is stale

Examples:

- Root README still shows epoch 285 and Track 2 as “planning.”
- `track1-miner/README.md` says 103 tests; the current full suite has 109.
- `miner/README.md` still describes a 23-test SSL-only miner and the disproven terse-answer strategy.
- `TASKS.md` leaves deployment, registration, activation, and sandbox validation unchecked.
- `ARCHITECTURE.md` says “one miner, one intent” while the deployed strategy is breadth.
- `GAPS.md` says the active champion is unpublished and G18 is closed; both are false now.

Judges and adopters should not need to determine which handoff file is true. Create one current Track 1 status page and label historical analyses as superseded.

### P1 — Two security/privacy gaps remain

1. **DNS rebinding/TOCTOU:** `guard.ts` resolves and approves one address, but `ssl.ts` later calls `tls.connect({host})`, causing a second DNS resolution. A controlled hostname can resolve publicly for the guard and privately for the connection. Connect to the approved address while keeping `servername: host` and hostname verification against the original host.
2. **Full-query logging:** `handler.ts` logs `req.url` by default. Once Content Extraction or Translation is registered, Vercel logs can receive the complete user text, emails, phone numbers, and other supplied content. Default to path-only logging or redact query values.

### P2 — The “unit” CI job still performs live calls

Two suites named `answer completeness` call GitHub TLS and Open-Meteo but lack the `(live)` marker. Therefore `npm run test:unit` is network-dependent despite the workflow comment claiming otherwise. It passed during this audit, but an upstream outage can make ordinary CI red.

### P2 — IP rank 1 is not the strongest quality exhibit

The latest IP question asks for location and abuse history. LiveCert reports San Jose while the ground truth says likely Ashburn, and it does not address abuse history; the scorer still awards 0.992. This is honest provider disagreement, not misconduct, but it demonstrates that score and factual completeness can diverge.

Do not lead the public quality story with IP. Lead with the concrete SSL/Storm failure-to-rank-1 progression and state IP's provider ambiguity and ineligibility plainly.

## Expected-value ranking

Scores below are directional. “Movement” uses the published 75-point per-intent term, but cross-intent cash aggregation remains underspecified.

| Move | Potential movement | Time | Probability | EV judgment |
|---|---:|---:|---:|---|
| Fix CertWatch durability and obtain genuine SSL usage | Preserves an existing 75-point rank-1 path from guardrail exclusion | 3–6h + outreach | High technically; adoption medium | **#1** |
| Recruit a real Storm Track 3 integration | Preserves a second 75-point rank-1 path | 2–6h | Medium | **#2** |
| Execute evidence-led X cadence | Up to 25 published points | 2–4h user time | High | **#3** |
| Correct manifest; add Translation + Academic | Up to two additional 75-point rank-1 paths if eligible | 2–4h + one signature | Medium-high performance; eligibility uncertain | **#4** |
| Fix red monitoring and release proof | Protects all positions and credibility | 1–2h | High | **#5** |
| Chase Weather #1 | About +14.4 per-intent points at current ratio | 2–5h | Medium | #6 |
| Add CVE now | About 24.8 points at the stored 0.326/0.985 ratio, before eligibility | 3–8h | Low; global quota risk | **Do not** |

## Next 24 hours

1. Freeze registration 236 as the rollback-safe live state.
2. Fix the CertWatch ignored-history path; demonstrate one non-paid fixture record through the exact workflow-to-public-app read path.
3. Fix the uptime workflow directory and ensure the next run is fully green.
4. Prepare a minimal six-intent manifest: current four + Translation + Academic; no global NVD quota.
5. Extend verification to all six declared endpoints and replay fresh public questions through the current champion WASMs.
6. Sandbox-validate the exact file. The user alone signs; record the new registration ID and pinned hash.
7. Publish the first two evidence posts and reply to active Telegraph/Track 3 discussions.
8. Recruit one genuine SSL app user and one Storm app builder before Track 3 opens.
9. Update the public README/status, repository description, homepage, and current score proof.
10. Fix DNS rebinding and default query logging before exposing more general-purpose inputs.

## Six-intent update go/no-go

- Existing registration 236 remains active until the replacement is confirmed.
- No top-level provider-specific rate limitation.
- Every declared endpoint has an acceptance check and current champion replay.
- Translation remains above the current 0.003503 leader on fresh questions.
- Academic returns a real result for the exact current input shapes and beats the current failing field.
- Full 109-test suite and typecheck pass.
- Exact manifest hash is recorded before upload; sandbox passes every endpoint.
- New registration ID, IPFS bytes, and public supported-intent list are verified after the user signs.

## Disqualifying red lines

Do not create fake apps, users, miners, stars, issues, posts, or requests. Do not loop meaningless questions to hit 100, coordinate reciprocal metric inflation, exploit another miner, or emit scorer-friendly text without real data. Use real scheduled monitoring, real user-configured locations/domains, public receipts, and independent users.

The winning principle is simple: **protect the real rank-1 service, remove self-inflicted global limits, and make the demand flywheel visibly real.**
