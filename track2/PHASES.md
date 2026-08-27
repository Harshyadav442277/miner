# PHASES.md — Track 2 phase plan

Window: 2026-08-27 → **2026-08-31 close**. Operational through 2026-09-07.

---

## Phase A — Recon (RUNNING, 2026-08-27)

Two Opus agents in flight (see MEMORY.md). **Exit criteria:** GAPS G1–G5 closed or explicitly
accepted as unknowable; exact `rank_answer` ABI and baseline formula quoted from source; the
submission mechanism written down step-by-step.

## Phase B — Design + fixtures

Lock ARCHITECTURE A1/A2/A6 (PENDING markers). Build the fixture corpus first — neutral,
adversarial, and real recorded traffic per intent — and the side-by-side harness that scores
baseline vs candidate on it. **Exit criteria:** harness runs the *baseline against the fixtures*
and reproduces its known mis-rankings (refusal-over-forecast etc.) before any candidate exists.
The metric (pairwise ranking accuracy) is computed and legible.

## Phase C — Build (Opus executes)

The Rust → WASM script(s): generic fact-aware core, per-intent extractors as thin modules
(portfolio per A6). Security-domain extractors (SSL / CVE / URL) built by Opus agents only.
**Exit criteria:** candidate beats baseline on pairwise ranking accuracy on every target intent's
fixture set, including adversarial fixtures; all edge-case tests pass; module size and sandbox
constraints verified.

## Phase D — Proof

One-command reproducible report: baseline vs candidate, per-fixture-class accuracy, per-intent
breakdown, with the real-traffic receipts. Written so a core-team reviewer can verify every claim
in minutes. **Exit criteria:** the report is regenerable from a clean checkout by one command.

## Phase E — Submit + public (user in the loop)

Submission per the verified flow (G1). X thread drafted for the user to post (10%); the
harness/fixture kit packaged for other authors (10% adoption). **Exit criteria:** submission
confirmed received before 2026-08-31; posts live; kit linked publicly.

---

**Standing risk:** the window is ~4 days. If recon (Phase A) slips past 2026-08-28 morning, cut
portfolio breadth (A6) before cutting fixture quality — one excellently-proven script beats three
thin ones under a 50%-weight manual review.
