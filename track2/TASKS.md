# TASKS.md — Track 2 execution board

One task = one change = one commit. Work top-down. Owner in brackets.

**Closes 2026-08-31.** See [PHASES.md](PHASES.md) for exit criteria.

---

## Phase A — Recon

- [x] **T-A.1** [Fable] Verify the Track 2 rubric + Canonical Script definition against the live
      rules page (tabbed content). → MEMORY.md, 2026-08-27.
- [x] **T-A.2** [Fable] Locate the official baseline repo (`telegraph-wasm-baseline`) and the
      intent catalog (40 intents, 18 Tier A). → MEMORY.md.
- [x] **T-A.3** [Opus] Champion repo + `/api/wasm` registry + submission flow spec →
      `recon/2026-08-27-track2-scorer-spec.md`. G1/G3 closed.
- [x] **T-A.4** [Opus] Baseline source analysis → `recon/2026-08-27-baseline-analysis.md`.
      G6 answered (toolchain absent).
- [x] **T-A.5** [Fable] G5 closed (gate + all constants), G11 opened (fixtures unrecoverable),
      ARCHITECTURE A1/A2/A3/A6/A8 locked, target portfolio ordered (IP_GEOLOCATION → STORM → SSL).
- [ ] **T-A.6** [User] Two Discord questions: Track 2 ranking formula; scorer-for-mined-intent
      legitimacy (G10). Also glance for any extra submission artifact the judges expect (G1
      residual).
- [x] **T-A.7** [Opus] Node gate recovered → `recon/2026-08-27-node-gate-analysis.md`. All
      constants pinned; `telegraph-subnet` was a dead end, gate found in git-history docs + live
      rejections.
- [x] **T-A.8** [Opus] Rust→WASM toolchain installed + ABI-skeleton proof build passing
      (274-byte wasm, 0 imports; seed crate in scratchpad `abi_probe`). G6 closed with
      build gotchas recorded.

## Phase B — Design + fixtures

- [ ] **T-B.1** [Opus] Fixture corpus v1: real recorded traffic per target intent pulled from
      public `/scores` (question / ground_truth / answers / scores), pinned to files, per
      [FIXTURES.md](FIXTURES.md) class REAL.
- [ ] **T-B.2** [Opus] Synthetic fixture set per [FIXTURES.md](FIXTURES.md) classes 2–10
      (fact-swap, refusal, stuffing, contradiction, format-equivalence, unit/form, temporal,
      length, our-style-wrong).
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

- [ ] **T-C.5** [Opus] Registration-target survey at candidate-ready time: poll `/api/wasm` for
      every NON-mined Tier A intent (URL_SCAN first) — champion_margin, entry count, miner count
      (Spearman on/off) — and pick the softest gate. Bars drift; poll again immediately before
      the user registers. (A6, G10, G11)

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
