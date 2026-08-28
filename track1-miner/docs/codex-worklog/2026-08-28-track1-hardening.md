# Track 1 hardening and debloat — 2026-08-28

## Outcome

The registered service remains six intents, but its code now contains exactly
those six routes. Three abandoned candidates and a disproven scoring simulator
were removed. Security, privacy, cache coverage, release tests, and Translation
availability were tightened without changing the active manifest.

Registration 260 became active concurrently with this pass at 05:00 UTC. Its
supported intents and pinned hash were verified directly against the node API.
No wallet, transaction, registration, deployment, or external account was
changed by Codex.

## Strategic flaws found

1. The repository still carried Content Extraction, News Headlines, and CVE
   implementations after the signed manifest had excluded them. They added 579
   source lines, three upstream/failure modes, test burden, and accidental route
   surface without contributing to the registered score.
2. Translation had been promoted from candidate to registered intent on the
   strength of earlier smoke tests, but the full acceptance gate later returned
   `upstream 429` from MyMemory on Vercel. Local direct requests still passed,
   proving this was shared-egress quota behavior rather than a bad question.
3. The registered YAML is already the correct competition artifact: six intents,
   no node-wide NVD limitation, and local hash
   `e35e3e46b92e611781d5adf18f7ab30d5d0e6d9eb2c61698f0de1f5b1a98a3f5`.
   Its prose still says "all three" and its `verdict` enum predates IP,
   Translation, and Academic values. The node demonstrably accepts those live
   responses, so re-registering solely to tidy metadata would add more risk than
   score. The exact active file was therefore preserved.
4. The real cash bottleneck remains eligibility and the published social term,
   not adding speculative intents. Rank-one SSL and Storm still need genuine
   Track 3 application demand; IP still needs an independent third miner.

## Code changes

- Deleted `src/content.ts`, `src/news.ts`, and `src/cve.ts` and removed their
  imports, routes, and tests.
- Deleted `tools/score-sim.mjs`; its hand-written model had already been disproven.
- Reduced `pretune-intents.mjs` to the two intents registration 260 actually added.
- Added a route/manifest parity test so undeclared routes cannot silently return.
- Cached Academic Search and Translation results under the existing bounded TTL.
- Made request logging opt-in. `LOG_QUERY=on` records paths and parameter names,
  never values; tests pin both the default-off and redaction behavior.
- Removed upstream exception details from public responses.
- Extended the SSRF guard to block IPv4-mapped IPv6, IPv6 unique-local,
  link-local, multicast, loopback, and documentation ranges.
- TLS now omits SNI for literal IP targets while preserving hostname SNI and
  identity verification for domain targets.

## Translation incident and repair

The deployed acceptance command failed only this semantic check:

```text
FAIL French "good morning" -> Bonjour — got undefined
detail: upstream 429
```

The primary remains MyMemory. `MYMEMORY_EMAIL` is supported as an optional
operator setting; MyMemory's official API recommends its `de` contact parameter
for higher-volume clients. When MyMemory is unavailable, the code now tries a
second live translation provider. Both the simulated 429 path and a real
fallback request are tested. The fallback endpoint is not a documented service
contract, so it is a resilience layer, not a reason to stop monitoring.

## Verification

- TypeScript application typecheck: passed.
- TypeScript test compilation: passed.
- Network-free suite: 79/79 passed.
- Full suite: 111/111 passed, including the real Translation fallback.
- Active registration 260: `active`, six expected intents, no rejection.
- Local `miner.yaml`: byte-identical to HEAD and the already verified upload;
  local SHA-256 remains `e35e…a3f5`.
- First deployed acceptance: every check except Translation passed; Translation
  failed on MyMemory 429.
- Final pre-deploy retry: all checks passed, median 451 ms / p95 1216 ms. This
  shows the quota recovered; it does not put the local fallback into production.

## Deployment gate

The source repair is not production evidence. After deploying this exact code,
run:

```bash
node track1-miner/tools/verify-deploy.mjs https://miner-wine.vercel.app
```

It must pass every semantic check, especially Translation. A pre-deploy retry
passed only after MyMemory recovered, so do not use that transient recovery as a
substitute for deploying the fallback. Then confirm the next
uptime workflow is green and inspect registration 260's next scored rows. Do not
change or re-sign `miner.yaml` for this code-only repair.

## Integrity boundary

No synthetic requests, fake users, fake engagement, sockpuppet miners, scorer
exploitation, or fabricated evidence were introduced. `fable_review_audit.md`,
Track 2, and CertWatch were not edited by this pass.
