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
- [x] **T-A.6** [User] Both Discord questions answered 2026-08-27 → G10 closed (overlap OK with
      disclosure), G1 residual closed (registerWasm + X posts), review measures the module vs the
      incumbent directly (depth over breadth). Recorded in MEMORY/GAPS/ARCHITECTURE.
- [x] **T-A.7** [Opus] Node gate recovered → `recon/2026-08-27-node-gate-analysis.md`. All
      constants pinned; `telegraph-subnet` was a dead end, gate found in git-history docs + live
      rejections.
- [x] **T-A.8** [Opus] Rust→WASM toolchain installed + ABI-skeleton proof build passing
      (274-byte wasm, 0 imports; seed crate in scratchpad `abi_probe`). G6 closed with
      build gotchas recorded.

## Phase B — Design + fixtures

- [x] **T-B.1** [Opus] Fixture corpus v1 built: 94 REAL + 119 synth + 56 probe fixtures across
      7 intents (3.6 MB), provenance pinned.
- [x] **T-B.2** [Opus] Synthetic + probe fixtures per [FIXTURES.md](FIXTURES.md); class 3
      (REFUSAL) corrected after measurement — refusals are GTs in real traffic, not answers.
- [x] **T-B.3** [Opus] `track2/harness/run-eval.mjs` + 8 support modules: full gate proxy
      (Stage 1 + Stage 2 constants as measured) + per-class accuracy + Spearman proxy.
      Validated: reproduces live node scores to 6 s.f. (20/20 rows) and replays the real
      WEATHER 636-vs-442 promotion 6/6.
- [x] **T-B.4** [Fable] Reviewed `recon/2026-08-27-harness-validation.md`: PREFIX-PARROT
      reproduced (0.993 echo vs 0.0089 real data, 100–124×); refusal archetype
      corrected (refusals are GTs, not answers) → FIXTURES.md class 3 rewritten; binding
      design corrections relayed to the scorer build (exact-match→1.0 ratchet; answered-ness
      not overlap-penalty; GT-conditional refusal handling). → GAPS G12.

## Phase C — Build

- [x] **T-C.1** [Opus] `track2/scorer/` crate: no_std ABI + all Stage-1 traps unit-tested;
      3 builds, 13.9 KB, 0 imports.
- [x] **T-C.2** [Opus] Fact-aware core: typed facts (units, %, coordinates, identifiers) +
      answered-ness gate + smoothstep; constants swept against the harness (tune.md).
- [x] **T-C.3** [Opus] Extractors: generic + ip_geolocation + storm_alert. (SSL/CVE/URL later
      if targeted.)
- [x] **T-C.4** [Fable-verified] Both targets PASS the offline gate proxy vs live champions —
      IP_GEO margin 0.784 vs 0.596 (27/29 wins), STORM 0.581 vs 0.425 (Spearman 0.632).
      FACT-SWAP 4/4 at margin 0.458 vs champion 0.004.

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
- [ ] **T-E.5** [Fable+User] Disclosure artifact: scorer README section + the required X post
      state the livecert (registration 225) overlap plainly — mandatory per the organizer answer.
