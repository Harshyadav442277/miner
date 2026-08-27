# Track 2 Codex Audit — Rank-1 Strategy

Captured: 2026-08-28 (Asia/Calcutta)
Scope: Track 2 scorer, fixtures, live registry/history, submission proof, and public adoption surface.
Evidence log: [`codex_review/field_notes.md`](codex_review/field_notes.md)

## Executive verdict

**Do not register the current IP build yet.** It is close enough to remain the best immediate path, but it still fails known semantic and equivalence cases. A new registration now would spend scarce public feedback without clearing failures already visible locally.

The rank-1 route is:

1. Finish `IP_GEOLOCATION` against the exact known failures.
2. Rebuild the proof from one immutable SHA and current live data.
3. Publish the proof and secure genuine third-party use for the unclaimed 20% of the rubric.
4. Build `TVL_LOOKUP` as the fallback, with protocol/chain-aware facts and a current Spearman model.

The asymmetric advantage is not a secret exploit. It is a **better measurement loop**: reconstruct all promotion gates, test semantic invariants the public leaderboard does not expose, and package proof that makes the manual review easy to award. Rule 04 explicitly disqualifies artificial inflation or gaming, so any “at all costs” action that crosses that line reduces the chance of rank 1 to zero.

## What rank 1 actually requires

The [official rules](https://hackathon.telegraphprotocol.com/rules) weight Track 2 as:

| Dimension | Weight | Current state | Rank-1 implication |
|---|---:|---|---|
| Improvement over baseline | 50% | IP reg. 1377 lost one ordering case: 14/15 vs champion 15/15 | Fix ordering, not just mean separation |
| Robustness and code quality | 30% | Strong structural WASM checks and green unit tests; proof/format/lint/reproducibility gaps remain | Turn local claims into one reproducible release |
| X | 10% | Draft exists; posting is not verified | Publish only after the evidence is corrected |
| Community adoption | 10% | Public repo has no visible adoption evidence at capture time | Obtain real external runs, issues, PRs, or testimonials |

Promotion is automated, but the rules also promise manual core-team review. A narrow metric win with weak proof can leave 50% of the available score underused.

## Live strategic snapshot

The public [WASM registry](https://devnode.telegraphprotocol.com/api/wasm) and score histories were checked on 2026-08-28. These values are a tactical snapshot, not permanent constants.

| Intent | Current/observed separation bar | Latest useful signal | Decision |
|---|---:|---|---|
| `IP_GEOLOCATION` | 0.991859 | Existing candidate reached 0.877518 and 14/15 wins | **Primary:** sunk work plus one identifiable hidden ordering loss |
| `TVL_LOOKUP` | 0.504232 | Latest challenger won 13 pairs vs champion 12 but lost separation | **Best fallback:** low bar, but current history has 7 miners |
| `GAS_PRICE` | 0.485051 | Challenger separation 0.64456, but Spearman 0.1288 | Avoid until rank agreement is deliberately modeled |
| `STOCK_PRICE` | 0.589032 | Local generic rho 0.4116 | Generic scorer is not registration-ready |
| `CRYPTO_PRICE` | 0.668554 | Local generic rho 0.042 and lower separation | Generic scorer is not registration-ready |
| `CVE_LOOKUP` | 0.999334 | Latest challenger at 0.996705 still lost separation | Bad use of the remaining deadline |

### Critical live correction

The existing strategy calls IP “Spearman-free” or “structurally safe.” That is stale. Its public history now contains 23 rows, 2 miners, and 22 epochs. A fresh local replay over 12 distinct public questions produced rho **0.6573**: passing the 0.60 gate, but with only 0.0573 of cushion.

Likewise, TVL now has 121 rows and 7 miners. A prior evaluation showing `historical_rows_evaluated: 0` does not establish that Spearman is absent; evaluation may simply have stopped at an earlier failing gate.

## Findings, ordered by rank risk

### P0 — Current IP still loses cases we already know about

The latest local IP harness is impressive but not registration-ready:

- 288/295 candidate wins vs 277/295 for the incumbent.
- 248/248 generated CLEAN-PAIR wins.
- 16/18 `ENTITY-SWAP`, 1/2 `UNIT/FORM`, and 3/8 `REAL-PARROT`.
- Only 28/31 CLEAN-PAIR equivalence constraints pass.

Known failures are actionable:

1. South/west hemisphere notation is not fully equivalent to signed coordinates.
2. Country aliases such as `UY` for Uruguay are not normalized reliably.
3. Curly Unicode punctuation such as `Shimo’ochiai` produces a large phrasing gap.
4. CLEAN-PAIR cases 10 and 11 have correct paraphrases scoring far below their equivalent forms.
5. An answer covering every ground-truth entity may add an unsupported identifier/entity too cheaply.

**Decision:** add metamorphic tests for these five categories, then tune. Do not use the live registration endpoint to discover defects that a local test can expose.

### P0 — The headline CLEAN-PAIR result is not trustworthy enough

The generated files say they were created by `gen-clean-pairs.mjs`, but that generator is absent from the repository. The `wrong-swapped` answers in cases 10 and 11 are mechanically corrupted (“The Iceland. It address…”), making them much easier than a fluent, minimally wrong answer.

Consequences:

- 248/248 overstates robustness.
- The dataset cannot currently be regenerated from source.
- A future scorer can learn generator artifacts rather than factuality.

**Fix:** restore the generator; make donor substitutions slot-aware; add fluent minimal counterfactuals changing exactly one city, country, ASN, IP, sign, or abuse claim; version the generated corpus with its source hash.

### P0 — The public proof contradicts itself and predates the actual rejection

`PROOF.md` says STORM both clears applicable gates and fails Stage 1 in different sections. Other notes report both rho 0.5926 and 0.6005. The proof predates registration 1377 and the current dirty IP tuning.

The public story also leads with “answeredness,” while the target IP build scores only 3/8 `REAL-PARROT` cases versus the incumbent’s 4/8. That is not the strongest honest exhibit.

**Fix:** generate one proof packet from one commit, one WASM hash, one fixture manifest, and one live capture. Lead with fact-swap detection, unit/coordinate normalization, and correct-paraphrase equivalence. Report answeredness as unfinished instead of selecting a friendlier WEATHER exhibit.

### P1 — TVL is a real opening, but the generic scorer cannot exploit it

A quick 20-pair protocol test gave the generic candidate 15/20 wins versus the current champion’s 20/20. All five misses were wrong-protocol substitutions tying the correct answer.

Build a TVL profile that extracts:

- protocol identity and aliases;
- chain identity;
- USD value and magnitude suffixes;
- timestamp/freshness;
- aggregate TVL versus chain-specific TVL.

Only register when wrong-protocol and wrong-chain answers are decisively below correct answers and fresh public-history rho has safe margin.

### P1 — “One generic scorer for every intent” is a trap

Local generic results show high pairwise performance can coexist with a fatal rank-correlation miss:

- STOCK: Stage 1 38/40, rho 0.4116, severe format/unit gaps.
- CRYPTO: Stage 1 pass, rho 0.042, separation below champion.

The platform rewards intent-specific agreement with human quality orderings. Share a small factual kernel, but use per-intent slot schemas, normalizers, and calibration profiles.

### P1 — The easiest 20% is currently unproven

The standalone public repository was visible with zero stars, forks, watchers, or issues at capture time, no visible CI workflow, and a latest published result documenting an SSL loss. The corrected current work is not yet an immutable public release. The X thread is a draft, not verified distribution.

**Legitimate acquisition plan:** recruit two real builders to run the harness on their scorers; ask them to open an issue with the report; merge at least one outside fixture or documentation PR; cite those interactions in the final submission. Do not buy, trade, script, or sock-puppet engagement.

### P1 — The 30% quality story has avoidable holes

Current evidence:

- Unit tests: 58/58 pass in the audited dirty worktree.
- IP WASM: 19,951 bytes, zero imports, structural verification passes.
- `cargo fmt --check`: fails.
- `cargo clippy --all-targets -- -D warnings`: fails with four findings.
- Multiple source and harness files exceed the repository’s own 300-line rule.
- No tracked CLEAN-PAIR generator and no public CI workflow were found.

Do not refactor the whole scorer near the deadline. Restore reproducibility, fix formatting/lint, add CI, and split only obvious test modules or schema tables where behavior will not change.

## The asymmetric advantage stack

### 1. A live gate radar

Capture registry and score history into a dated machine-readable snapshot. For each intent, compute champion margin, wins, miner count, epoch count, and whether rho is applicable. This prevents strategy from depending on stale prose and reveals low-bar openings before competitors notice them.

### 2. A semantic shadow benchmark

Turn each observed failure into a *class*, not a hidden-case fingerprint:

- same fact in prose, JSON, terse, and verbose forms;
- one-field fluent counterfactuals;
- aliases and Unicode variants;
- equivalent units and coordinate forms;
- appended false assertions and contradictory extras.

Every fix must pass unseen members of the class. That creates a defensible quality advantage without gaming the hidden benchmark.

### 3. Small, deterministic WASM

The 19,951-byte, zero-import module is a real differentiator against megabyte-scale incumbents: easy to inspect, deterministic, cheap to host, and fast to reproduce. Publish size, imports, SHA-256, and benchmark latency from CI.

### 4. A reviewer-grade proof packet

Make the judge’s comparison one command and one page: incumbent versus candidate, fixed fixtures, counterfactual examples, gate table, hash verification, limitations, and exact reproduction command. This converts engineering into points under both the 50% and 30% dimensions.

### 5. Make the harness useful to competitors

Publish the target radar and semantic fixture generator as reusable tools. Genuine use by other entrants creates adoption proof and forces competitors to compare on the dimensions where this scorer is strongest.

## 24–48 hour execution order

1. **Hold registration.** Preserve the live feedback opportunity.
2. **Repair the benchmark.** Restore `gen-clean-pairs.mjs`; replace corrupted swaps with fluent one-fact counterfactuals.
3. **Close the five IP failure classes.** Hemisphere, country aliases, Unicode, cases 10/11, and false appended facts.
4. **Refresh public histories.** Recompute rho from current data immediately before release; target at least 0.70 for buffer, not merely 0.6000.
5. **Clean the release.** `fmt`, clippy with warnings denied, tests, WASM verification, fixture manifest, SHA, and hosted-byte hash must all pass from a clean checkout.
6. **Regenerate all proof.** Delete stale conclusions; include registration 1377 and current registry capture.
7. **Publish one immutable standalone commit.** The release tag, hosted WASM, proof, and submission must identify the same bytes.
8. **Register IP once.** If it loses after the known classes are green, use the returned aggregate evidence to add a general test class; do not repeatedly probe tiny parameter changes.
9. **Build TVL in parallel only after IP is gated.** Require slot-aware protocol/chain facts and current-history rho before registration.
10. **Claim the remaining rubric.** Post the corrected X evidence thread and obtain two genuine external harness runs before the deadline.

## Release gates

### IP go/no-go

- All unit, format, clippy, and structural WASM checks green.
- `ENTITY-SWAP` 18/18 and `UNIT/FORM` 2/2 minimum.
- CLEAN-PAIR correct-form spread at most 0.05 for 31/31.
- Every fluent one-fact counterfactual ranks below every correct phrasing for its case.
- Appending a false IP, ASN, country, city, or coordinate cannot be free.
- Fresh public-history rho at least 0.70 preferred; never below 0.60.
- Proof, release tag, IPFS/hosted bytes, and registration SHA all agree.

### TVL go/no-go

- Protocol and chain substitutions never tie correct answers.
- Unit equivalence covers `$1.2B`, `1.2 billion USD`, and `1200M` without accepting a 1000× error.
- At least 15 fluent independent clean/counterfactual pairs pass.
- Fresh public-history rho at least 0.65, with margin above the latest champion snapshot.
- Same release/proof/hash requirements as IP.

## Disqualifying red lines

Do **not**:

- create fake accounts, stars, reposts, usage, issues, or testimonials;
- coordinate artificial engagement or register throwaway miners;
- fingerprint or reconstruct individual hidden benchmark records;
- repeatedly re-register negligible mutations as black-box hill climbing;
- exploit node bugs, denial of service, leaked data, credentials, or other participants’ private work;
- claim deployment, adoption, or test results that were not actually verified.

Public aggregate telemetry is legitimate research input. The safe test is: **would this change still be a general scorer improvement if the hidden fixtures were replaced tomorrow?** If not, do not ship it.

## Bottom line

The project is closer to a strong IP submission than the rejection suggests, but farther from a defensible rank-1 package than the 248/248 headline suggests. Fix the known semantic failures, make the benchmark reproducible, rebuild proof from one SHA, and deliberately earn the unclaimed X/adoption points. TVL is the best hedge; generic multi-intent registration is not.
