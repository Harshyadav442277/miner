# Codex worklog

This folder records Codex's material work on the Telegraph submission.

It exists to make the current state, evidence, decisions, and verification
boundaries easy to hand off. It is not a substitute for the product's primary
documentation.

## Files

- [`WORKLOG.md`](WORKLOG.md) — chronological record of actions and outcomes.
- [`2026-08-26-strategy-review.md`](2026-08-26-strategy-review.md) — detailed
  evidence from the initial adversarial strategy review.
- [`2026-08-26-live-scoring-recon.md`](2026-08-26-live-scoring-recon.md) — exact
  production-scorer, public-ground-truth, buyer-contract, and next-epoch analysis.
- [`2026-08-28-track1-audit.md`](2026-08-28-track1-audit.md) — current rank,
  pending-manifest, eligibility, workflow, public-proof, and security evidence.
- [`probe-champion.mjs`](probe-champion.mjs) — offline reproduction tool for a
  downloaded champion WASM and public score records.
- [`epoch284-weather-candidate.txt`](epoch284-weather-candidate.txt) and
  [`epoch284-ssl-candidate.txt`](epoch284-ssl-candidate.txt) — exact truthful
  counterfactual texts used for the reported offline measurements.

## Logging convention

Future entries should state:

1. What was inspected or changed.
2. Why it was done.
3. What evidence or verification passed.
4. What remains uncertain or blocked.
5. Whether repository files, deployments, registrations, or external systems
   were mutated.
