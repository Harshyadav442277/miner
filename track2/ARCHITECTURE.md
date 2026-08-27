# ARCHITECTURE.md — Track 2 design decisions

Code must conform to this. **Update this file before deviating from it**, not after.

---

## A1 — Match the canonical ABI exactly · PENDING exact signature

The script is a WASM module exporting the Telegraph scorer ABI observed live: `memory`, `alloc`,
(`dealloc`,) `rank_answer(q_ptr, q_len, gt_ptr, gt_len, ans_ptr, ans_len) → f32 in [0,1]` — the
shape `probe-champion.mjs` already drives. The baseline also exports `breakdown_answer`; keeping
a compatible breakdown export makes review and side-by-side comparison easier.
**PENDING:** Agent B confirms argument order, return scaling, and any host imports allowed
(expectation: none — pure sandbox, `wasm32-unknown-unknown`, no WASI).

## A2 — Rust, same toolchain as the baseline · PENDING toolchain availability

The baseline is Rust → `wasm32-unknown-unknown`. We build in Rust with zero host imports and no
nondeterminism (no clock, no randomness, no floats-dependent-on-platform hazards beyond f32 ops).
Reviewers read Rust against Rust; diffing against the baseline is legible. **PENDING:** Agent B
reports whether cargo + the wasm32 target exist locally; if not, installing the toolchain becomes
the first build task.

## A3 — Fact-aware scoring over embedding similarity (the thesis)

For Tier A deterministic intents, correctness lives in **typed facts**: verdicts, numbers with
units, identifiers (CVE ids, hostnames, coordinates), timestamps. The scorer:

1. extracts typed facts from `ground_truth` and from the miner answer;
2. compares them with typed tolerance (numeric epsilon/relative bands, unit normalization,
   identifier canonicalization, timestamp parsing);
3. scores fact agreement as the dominant signal;
4. uses lexical/semantic overlap only as a low-weight tie-breaker for prose quality;
5. is robust to gaming: keyword stuffing, ground-truth-shaped refusals, length manipulation, and
   contradiction (an answer containing both the right and wrong value must not win).

A refusal or error must score near zero when the ground truth contains a real answer — the
measured baseline failure (refusal 0.99 vs correct 0.007) is the canonical counter-example.

## A4 — The legitimacy boundary is a design constraint

General intent correctness only. JSON and prose answers with equal facts score equally. No
fingerprints of any specific miner (slug, wallet, field names, phrasing) — favoring OR
disfavoring. The fixture suite must include adversarial cases where a livecert-style answer is
factually wrong and scored down. Source and reasoning are published for manual review.

## A5 — The proof harness is part of the product

Manual review decides winners, so the deliverable is script + evidence. The harness must:

- run baseline and candidate side-by-side on the same fixture corpus (pinned binaries);
- report an interpretable accuracy metric: **pairwise ranking accuracy** (does the scorer rank
  the factually-better answer above the worse one?) plus score-vs-correctness correlation;
- include three fixture classes: neutral (typical answers), adversarial (gaming attempts,
  refusals, stuffing), and **real recorded traffic** (public `/scores` records with actual
  question/ground_truth/answer triples);
- be one command, reproducible by a reviewer.

## A6 — Portfolio shape · PENDING G2/G3

One generic fact-aware core with per-intent fact extractors as thin, testable modules. Whether we
submit one generic script, several per-intent scripts, or both depends on GAPS G2 (participating
intents), G3 (what the current Canonical Script per intent is), and G4 (multi-submission
allowance). The 10% adoption axis favors something other authors can reuse.

## A7 — Conventions

Boring, explicit code; files under ~300 lines; TypeScript for harness tooling, Rust for the
module; one task = one change = one commit; no secrets anywhere (nothing here needs any).
