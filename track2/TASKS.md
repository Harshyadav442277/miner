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

- [x] **T-C.5** [Opus+Codex] Registration-target survey completed; `TEXT_AUTHENTICITY_CHECK` is
      the selected target. Live recheck 2026-08-28: champion reg 850, margin 0.65861213, 14/15,
      zero historical rows, and no registration from our wallet. Poll again before signing.
- [x] **T-C.6** [Codex] Compile/test the actual release feature, repair question-option verdict
      masking + named-model attribution mismatch + foreign-unit ordering, and add regressions.
      Native TAC result: 234/240 → **240/240**, margin 0.721069 → **0.971687**.
- [x] **T-C.7** [Codex] Remove dead profile knobs/method/suppressions, deduplicate the two text
      profiles, repair TAC fixture provenance/proof routing, and add all-profile CI.
- [x] **T-C.8** [Codex] Close terse authenticity-label equivalence and sentence-initial subject
      substitution; add four label fixtures. Intermediate TAC checkpoint: **256/256**, separation
      **0.974996**; CV holdout retained **144/144**, **0.963445**.
- [x] **T-C.9** [Codex] Red-team unseen negation and categorical phrasing; repair semantic-pole
      comparison, reject an over-broad sentence shortcut, and repair presentation-label
      equivalence exposed by the clean standalone all-profile matrix. Unseen probe:
      **10/20 → 20/20**; public TAC retained **256/256**, separation **0.973658**; CV retained
      **144/144**, **0.963445**.

## Phase D — Proof

- [x] **T-D.1** [Opus] One-command proof pack done: `harness/make-proof.mjs` → `track2/PROOF.md`,
      regenerated against the fixed dist with SHA-256 self-consistency guards. IP_GEO "would
      promote" (margin 0.786 vs 0.596); STORM honestly "would be rejected" (ρ 0.5926); the 124×
      parrot inversion is exhibit §5.1.
- [x] **T-D.2** [Opus] Adversarial self-review: 6 CRITICAL / 9 MAJOR found
      (`recon/2026-08-27-adversarial-review.md`) → all criticals fixed with receipts, STORM
      Spearman ceiling (0.593) discovered and documented as a gate finding. Fuzz (19,734 calls)
      clean before and after.

## Phase E — Submit + public

- [x] **T-E.0** [Codex] Release complete: 30,011 B, SHA-256 `8d8d6906…4ae8fe`, Keccak-256
      `8599d78b…6e9938`, pinned Rust 1.98.0 cross-platform reproducible build, manifest and proof
      green. The standalone repository at commit `409911f…a69ae58` contains one WASM, a TAC-only
      README/proof, and a release audit with positive and negative controls. A GitHub release
      download reproduced both hashes and Linux CI rebuilt the tracked bytes. The old `867fd15`
      and `25ff808` releases are superseded and must not be registered. Stable GitHub release
      `tac-v1.1.0` attaches the verified artifact and preserves the reviewer entry point.
- [x] **T-E.1** [Fable+User] v1.1.0 submitted as registration 1671; Stage 1 passed and Stage 2
      rejected it at 9/15 wins, margin 0.3274022 versus champion 14/15 and 0.65861213.
- [x] **T-E.1b** [Codex] Replaced the AI-metric-heavy proxy with predeclared independent
      authenticity axes and a second vocabulary probe. The frozen local candidate passes
      256/256 public TAC, 20/20 negation, 10/10 model aliases, 20/20 axes, and 12/12 vocabulary;
      all profile tests/clippy and Stage 1 verification pass.
- [x] **T-E.1c** [Codex+User] v1.2 published at `638dae4`, tagged `tac-v1.2.0`, CI green — and
      **registered as reg 1673 at 05:37:55Z, rejected at 05:41:53Z: 8/15 wins, margin 0.2702413**
      against the 0.65861213 bar. Worse than v1.1.0's 9/15. The task note claiming only a signature
      remained was written eight minutes before that signature and never updated.
- [ ] **T-E.2** [Fable] X thread drafts (insight-led, tagged `@Telegraphprotoc`) → user posts.
- [x] **T-E.3** [Opus+Codex] Package the harness + fixtures as a reusable kit for other script
      authors, including an incumbent-free `check-tac.mjs` command with text/JSON output. It
      passes this release 256/256 and rejects incumbent 850 at 33/256. One external fork now has
      nine downstream measured commits using the kernel; a benchmark-result issue form captures
      additional genuine runs without manufacturing engagement.
- [x] **T-E.4** [User] Submitted v1.1.0 before deadline; registration 1671 recorded. A repaired
      candidate still requires a new transaction because the registered hash is immutable.
- [ ] **T-E.5** [Codex+User] Disclosure artifact: public scorer README now states the livecert
      (registration 225) overlap plainly; the matching X post is drafted and still requires the
      user's account — mandatory per the organizer answer.

## Phase F — Rebuild on the organizers' baseline (post-rejection)

Root cause of both rejections: `TEXT_AUTHENTICITY_CHECK` has `miner_count: 0` and zero score
records, so every fixture we owned for it was self-authored — and the champion scores 13% on our
corpus versus 93% on the node's. We optimised against an anti-correlated corpus.

**Standing acceptance test:** no corpus may be used as evidence unless the champion `tn_t70`
scores ~14/15 on it.

- [x] **T-F.1** Vendor `telegraphprotocol/telegraph-wasm-baseline` (MIT) as the scoring core;
      record the licence and attribution. Builds here with Rust 1.98 `--features real_weights`.
- [~] **T-F.2** Replace the composite: drop `cos(question, answer)` (8/18 wins — worthless) and the
      length term (~0.99 for everything, rewards filler); keep `cos(GT, answer)` and `bm25`.
- [ ] **T-F.3** Add the two terms neither the baseline nor the champion has — a verdict-pole
      agreement term over the authenticity axes, and a hard non-answer penalty for restatement,
      refusal and generic filler. This is the honest edge and it is what the intent actually asks.
- [ ] **T-F.4** Sharpen to a binariser. Margin is the axis we lose on; the champion reaches 0.6586
      by pushing to ~0.996 / ~0.010. Beat it by *also* crediting the correct paraphrases it dumps
      to ~0.010.
- [ ] **T-F.5** Build a held-out corpus the opposite way — correct answers with LOW lexical overlap
      with the ground truth, wrong answers with HIGH overlap — to test the paraphrase-credit claim
      instead of assuming it. Guards against the G14 authoring bias.
- [ ] **T-F.6** Stage-1 traps on the new core: empty answer exactly 0.0, exact match 1.0, zero
      imports, determinism, bounded memory, fuzz.
- [ ] **T-F.7** Publish, verify hosted bytes and both hashes, then a single user signature.
      **No wallet action until T-F.5 passes.**

### Phase F outcome (2026-08-29 evening)

T-F.1–T-F.4 were overtaken by the true-bar survey: the MiniLM rebuild was dropped once the live
rejection record showed a ten-minute evaluation budget that a 24 MB module risks, and the target
moved to the numeric intents where this scorer already measures strongest. The baseline stays
vendored at `scorer-v2/` with provenance.

- [x] **T-F.8** True-bar survey across all 45 intents; `champion_margin` recomputed per evaluation
      is the real bar, not the stored `eval_score`. → `recon/2026-08-29-true-bars.md`.
- [x] **T-F.9** Corpus builders for the numeric intents from recorded traffic, with objective
      numeric labelling that never reads the live score → `harness/build-numeric-corpus.mjs`,
      `harness/build-factswap.mjs`, `harness/run-numeric.mjs`.
- [x] **T-F.10** `headline_quantity_profile` + role-scoped figure comparison. Champion 15/16 @
      0.074155, ours 15/16 @ 0.143524. All seven profiles green.
- [x] **T-F.11** [User go-ahead] Publish `stock_price.wasm` and `tvl_lookup.wasm` to an immutable
      commit; verify hosted bytes against both hashes.
- [ ] **T-F.12** [User] Re-read the live bar, then sign both registrations in one batch.
- [ ] **T-F.13** Record returned `candidate_margin` / `candidate_wins` / recomputed
      `champion_margin` — the only measurement loop available.
- [ ] **T-F.14** Close the last shape gap: GT-verbatim vs GT-swapped is 0.882 for us against 0.926
      for the champion. Everything else already leads.
- [x] **T-F.15** Extend the profile to CRYPTO_PRICE and ONCHAIN_TX_LOOKUP; publish all four at
      `73ef740` and verify hosted bytes byte-identical.

## Step calibration (2026-08-29 evening)

- [x] **T-G.1** Establish that champion modules are inner scorer + monotone post-map, and that the
      post-map sweeps are published on chain four bytes apart → `calibration/STEP_CALIBRATION.md`.
- [x] **T-G.2** `build-step-calibration.mjs` / `build-raw-export.mjs` / `verify-step-calibration.mjs`
      / `hash-artifacts.mjs`. Builder validated to one ULP against registration 1797's own
      calibration; Keccak tool validated against registration 1774's on-chain hash.
- [x] **T-G.3** Recover each base's uncalibrated margin by affine fit; prove the floor on the best
      threshold for FRAUD_DETECTION (>= 14 pairs) and CVE_LOOKUP (= 15 pairs).
- [x] **T-G.4** Build and verify ten artifacts; commit `85fac32`.
- [ ] **T-G.5** [User] Push `85fac32` so the raw URLs resolve.
- [ ] **T-G.6** [User] Sign round 1: `cve_lookup_t050`, `fraud_detection_t080`,
      `language_translation_t085`.
- [ ] **T-G.7** Record the returned margins and win counts; a rejected rung locates the threshold
      for the next round.
- [ ] **T-G.8** Apply the same recipe to TEXT_AUTHENTICITY_CHECK, CRYPTO_PRICE, GAME_RESULT,
      ACADEMIC_SEARCH and ONCHAIN_TX_LOOKUP, reading each intent's published sweep first.
