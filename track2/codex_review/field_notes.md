# Codex Track 2 Field Notes

This folder records the investigation behind [`../codex_audit.md`](../codex_audit.md). It is evidence, not a claim that the current working tree is release-ready.

Captured: 2026-08-28 (Asia/Calcutta)

## Boundaries

- Existing modified scorer files and Claude’s untracked fixtures were inspected but not edited.
- No registration, wallet action, social post, repository publication, or deployment was performed.
- Live values can drift. Refresh them before making a registration decision.
- Local success is reported separately from live promotion or manual-review readiness.

## Sources inspected

- Repository instructions: root and Track 2 `CLAUDE.md`.
- Track 2 strategy/state: `MEMORY.md`, `ARCHITECTURE.md`, `TASKS.md`, `GAPS.md`, `ADVANTAGE.md`, `PHASES.md`, and `FIXTURES.md`.
- Scorer source, profiles, tests, harness, proof, registration notes, fixtures, X draft, and standalone-publication notes.
- [Official rules](https://hackathon.telegraphprotocol.com/rules), including the interactively revealed Track 2 tab.
- [Public WASM registry](https://devnode.telegraphprotocol.com/api/wasm).
- Public score-history endpoints such as [IP geolocation history](https://devnode.telegraphprotocol.com/scores?intent=IP_GEOLOCATION&limit=500).
- [Standalone public repository](https://github.com/Harshyadav442277/telegraph-factscore).

## Worktree at audit time

Pre-existing or concurrent work observed:

```text
M fable_review_audit.md
M track2/scorer/src/facts.rs
M track2/scorer/src/profile.rs
M track2/scorer/src/score.rs
M track2/scorer/src/tokens.rs
?? track2/fixtures/synth/IP_GEOLOCATION_CLEAN_PAIR.json
?? track2/fixtures/synth/STORM_ALERT_CLEAN_PAIR.json
```

This list changed during the audit as other work continued. It is recorded to make ownership explicit.

## Live rejection evidence

Registration 1377 for `IP_GEOLOCATION` was rejected with:

```text
candidate mean margin  0.87751794
champion mean margin   0.99185944
candidate wins         14/15
champion wins          15/15
candidate self-match   1.0
candidate stddev       0.4654
```

Interpretation: the candidate was not generally weak. It lost one ordering case and the incumbent already nearly saturates separation. The next attempt must remove every locally known ordering reversal.

## Current local IP measurements

Audited dirty candidate against active registration 630:

```text
candidate SHA              448a32... (abbreviated harness output)
champion SHA               84d6b1... (abbreviated harness output)
fixtures / calls           70 / 416 per scorer
candidate separation       0.9193
incumbent separation       0.7331
candidate pair wins        288/295
incumbent pair wins        277/295
CLEAN-PAIR wins            248/248 candidate, 246/248 incumbent
CLEAN-PAIR equivalence     28/31 candidate
ENTITY-SWAP                16/18 candidate
UNIT/FORM                  1/2 candidate
REAL-PARROT                3/8 candidate, 4/8 incumbent
```

The generated pair-win total is not sufficient because correct-answer equivalence and fluent minimal errors are closer to the platform’s hidden ordering problem.

## Exact local failures retained for repair

| Fixture | Observation |
|---|---|
| `ip_geolocation-synth-14` | Correct prose 0.999813 vs equivalent hemisphere form 0.255840 |
| `ip_geolocation-synth-es-03` | Correct paraphrase 0.291902; wrong city 0.295418; wrong country 0.296980 |
| `ip_geolocation-cleanpair-01` | Correct-form spread about 0.0564, over 0.05 tolerance |
| `ip_geolocation-cleanpair-10` | Correct-form spread about 0.5569 |
| `ip_geolocation-cleanpair-11` | Correct-form spread about 0.4759 |

Likely mechanisms: signed/hemisphere normalization, ISO alpha-2 aliasing (`UY`), non-ASCII punctuation/tokenization, and over-generous treatment of added entities.

## Benchmark provenance defect

Both CLEAN-PAIR JSON files declare:

```text
method: mechanical transform of existing fixture text (gen-clean-pairs.mjs)
```

No `gen-clean-pairs` file was found under `track2`. Cases 10 and 11 contain malformed positional substitutions, including text beginning “The Iceland. It address…”. That gives the scorer an easy lexical target and blocks exact regeneration.

## Fresh history correction

At capture time, `IP_GEOLOCATION` public history contained 23 rows, 2 miners, and 22 epochs. Therefore older documentation calling it Spearman-free is stale. A fresh local replay across 12 distinct public questions gave rho 0.6573.

TVL history contained 121 rows, 7 miners, and 25 epochs. GAS, STOCK, and CRYPTO histories also had multiple miners. A zero `historical_rows_evaluated` value in an evaluation that failed an earlier gate cannot prove Spearman is inapplicable.

## Generic-scorer experiments

```text
STOCK_PRICE
  Stage 1:       38/40 (fail)
  separation:   0.6952 candidate vs 0.6025 champion
  wins:         24/29 candidate vs 15/29 champion
  Spearman rho: 0.4116 (fail)

CRYPTO_PRICE
  Stage 1:       pass
  separation:   0.6968 candidate vs 0.7444 champion (fail)
  wins:         26/29 candidate vs 22/29 champion
  Spearman rho: 0.042 (fail)

TVL_LOOKUP synthetic probe
  candidate:     15/20
  champion:      20/20
  failure mode:  five wrong-protocol substitutions tied correct answers
```

These were isolated comparisons; they did not alter repository files.

## Quality checks

```text
cargo test                         58/58 pass (current dirty scorer)
IP WASM structural verification   pass
IP WASM size                       19,951 bytes
IP WASM imports                    0
cargo fmt -- --check               fail
cargo clippy --all-targets \
  -- -D warnings                   fail (4 findings)
```

Clippy findings were: an empty line after a doc comment, a collapsible match, a large const array, and a boolean literal assertion. Formatting differences span several scorer modules.

Large files observed against the repository’s own under-300-line convention include `score.rs` (706), `tokens.rs` (512), `facts.rs` (431), `units.rs` (373), `lib.rs` (339), plus several harness scripts.

## Proof/adoption observations

- `PROOF.md` contains mutually inconsistent STORM conclusions and predates registration 1377.
- The strongest current “answeredness” claim does not hold on IP `REAL-PARROT`, where the incumbent wins 4/8 vs 3/8.
- The standalone repository had no visible stars, forks, watchers, or issues at capture time and no visible root `.github` workflow.
- The public standalone HEAD found during review documented the SSL loss; current dirty IP fixes were not published there.
- X material is drafted locally, but no post or engagement was verified.

## Safe interpretation of public telemetry

Aggregated public registry, score, and rejection data can inform general engineering. It should not become a hidden-case oracle. A defensible iteration adds a semantic test class, improves unseen variants in that class, and creates a materially different release. Tiny repeated registrations intended only to climb black-box outputs risk Rule 04 disqualification.
