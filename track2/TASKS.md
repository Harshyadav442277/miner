# TASKS.md — Track 2 execution board

One task = one change = one commit. Work top-down. Owner in brackets.

**Closes 2026-08-31.** See [PHASES.md](PHASES.md) for exit criteria.

---

## Phase A — Recon

- [x] **T-A.1** [Fable] Verify the Track 2 rubric + Canonical Script definition against the live
      rules page (tabbed content). → MEMORY.md, 2026-08-27.
- [x] **T-A.2** [Fable] Locate the official baseline repo (`telegraph-wasm-baseline`) and the
      intent catalog (40 intents, 18 Tier A). → MEMORY.md.
- [ ] **T-A.3** [Opus·running] Champion repo + `/api/wasm` registry + submission flow spec →
      `track2/recon/2026-08-27-track2-scorer-spec.md`.
- [ ] **T-A.4** [Opus·running] Baseline source analysis: exact formula, ABI, toolchain check,
      mis-ranking scenarios → `track2/recon/2026-08-27-baseline-analysis.md`.
- [ ] **T-A.5** [Fable] Read both reports; close GAPS G1–G5; lock ARCHITECTURE A1/A2/A6 and the
      target portfolio.
- [ ] **T-A.6** [User, if needed] Check Discord for the official hackathon repo announcement /
      Track 2 submission instructions if agents cannot verify G1/G2 from public sources.

## Phase B — Design + fixtures

- [ ] **T-B.1** [Opus] Fixture corpus v1: real recorded traffic per target intent pulled from
      public `/scores` (question / ground_truth / answers / scores), pinned to files.
- [ ] **T-B.2** [Opus] Adversarial fixture set: refusals, keyword stuffing, contradiction,
      length-gaming, JSON-vs-prose equivalence pairs, wrong-number/wrong-verdict swaps.
- [ ] **T-B.3** [Opus] Side-by-side harness: run any two scorer WASMs over the corpus, emit
      pairwise ranking accuracy + per-class breakdown (extends `probe-champion.mjs`).
- [ ] **T-B.4** [Fable] Review harness output on baseline alone — it must reproduce the known
      mis-rankings before any candidate exists.

## Phase C — Build

- [ ] **T-C.1** [Opus] Rust workspace for the scorer module; ABI skeleton + edge-case tests
      (empty/huge/non-UTF8 inputs) building to `wasm32-unknown-unknown`.
- [ ] **T-C.2** [Opus] Generic fact-aware core: typed fact extraction + tolerant comparison +
      low-weight lexical tie-breaker (ARCHITECTURE A3).
- [ ] **T-C.3** [Opus] Per-intent extractors for the locked portfolio (security-domain ones —
      SSL / CVE / URL — Opus only).
- [ ] **T-C.4** [Opus] Candidate beats baseline on every target intent's fixtures; iterate until
      adversarial set is clean.

## Phase D — Proof

- [ ] **T-D.1** [Opus] One-command reproducible report (baseline vs candidate, receipts inline).
- [ ] **T-D.2** [Fable] Adversarial self-review: try to break our own scorer the way a reviewer
      would; feed failures back to T-C.4.

## Phase E — Submit + public

- [ ] **T-E.1** [Fable] Submission package per verified flow; user confirms/sends anything
      requiring accounts or signatures.
- [ ] **T-E.2** [Fable] X thread drafts (insight-led, tagged `@Telegraphprotoc`) → user posts.
- [ ] **T-E.3** [Opus] Package the harness + fixtures as a reusable kit for other script authors
      (the 10% adoption play).
- [ ] **T-E.4** [User] Submit before **2026-08-31**; confirmation recorded in MEMORY.md.
