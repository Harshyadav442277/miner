# 2026-08-28 — Independent hardening and release freeze

> Historical checkpoint. Superseded by
> [2026-08-29 unseen-negation hardening](2026-08-29-negation-hardening.md); retain the figures
> below as evidence of the intermediate artifact, not the current registration candidate.

## Outcome

The canonical local `TEXT_AUTHENTICITY_CHECK` artifact is frozen at **25,488 bytes**:

- SHA-256: `4bb84373511e2b2bd76f9975c4e8425958181cecf74673c3e772440fd74e254e`
- Keccak-256: `0eb01610476004114ea2b9110352b9d57916dd279a60ffbc104e96a217a2dfb0`
- Rust: 1.98.0, `wasm32-unknown-unknown`, feature `text-authenticity`
- native proxy: **256/256**, separation **0.974996**
- content-verification holdout: **144/144**, margin **0.963445**

The build produced from the pinned toolchain is byte-identical to the artifact that was tested.
`release/text-authenticity.json` records the machine-readable release identity. CI now rebuilds
the target, runs the structural verifier, and rejects any byte-size or SHA-256 drift.

## Live state

The public registry was queried on 2026-08-28 immediately before the freeze:

- champion: registration **850**, active, margin **0.65861213**, 14/15 wins
- champion historical rows: **0**, so its recorded evaluation skipped Spearman
- entries returned for the intent: **83**
- registrations from the project wallet: **0**

The live bar can change. Poll it again immediately before the user signs.

## Independent finding

Public project [`telegraph-wasm-check`](https://github.com/neromtoobad/telegraph-wasm-check), pinned
at commit `f537c7c085e9d3366c5615fe1ad1f98a0abeff7c`, was used as an external benchmark. Its generic
checks exposed two relevant gaps:

1. sentence-initial subject substitutions such as `Paris is ...` to `Berlin is ...` were nearly
   free; and
2. terse authenticity labels did not treat `AI` and `machine generated` as equivalent.

Both were fixed with narrow, general rules. The final independent run reported:

- **0 hard failures, 0 soft failures**
- deterministic across 100 calls and across fresh instances
- 500 seeded fuzz triples without traps, nondeterminism, or out-of-range scores
- 128 KiB performance: approximately **700 microseconds per call**
- 300 calls without deallocation: **0 MB growth**
- all **16** native TAC custom cases passed

The verifier's unrelated finance and generic sentiment examples are not claimed as supported
intents. The artifact is deliberately intent-specific.

## Source and corpus changes

- Added a small authenticity-equivalence table and opposite propagation in `src/antonyms.rs`.
- Preserved token capitalization and added a narrow copular leading-subject substitution check.
- Added a categorical shortcut only for unambiguous one-token closed-set ground truths; mixed or
  hedged answers stay on the ordinary scoring path.
- Added four generated `LABEL-EQUIVALENCE` fixtures covering AI, human, original, and copied.
- Removed the earlier dead profile knobs/methods/suppressions and retained the deduplicated text
  profiles from the prior checkpoint.
- Pinned Rust 1.98.0 in `scorer/rust-toolchain.toml` and CI.
- Removed three obsolete generated TAC candidate binaries after the canonical file was proven
  byte-identical, leaving one unambiguous `text_authenticity.wasm` release artifact.

## Validation matrix

Tests and `clippy -D warnings` passed for every profile:

| profile | tests |
|---|---:|
| generic | 77 |
| IP geolocation | 78 |
| storm alert | 69 |
| content verification | 77 |
| text authenticity | 77 |

`cargo fmt --check`, the local structural/semantic verifier, the independent verifier, the native
gate proxy, the cross-intent holdout, and the proof generator's on-disk SHA consistency guard all
passed. `PROOF.md` now references the canonical filename and matching SHA.

## Remaining external boundary

No repository push, hosted release, website edit, social post, wallet transaction, or on-chain
registration was performed.

The standalone public repository was rechecked at HEAD `867fd15`: it still serves the superseded
23,232-byte WASM (`f58d986b…c24039`, Keccak `aaea446b…0e01`) and has no CI workflow. The exact
source-to-standalone mapping and expected hashes are recorded in `release/PUBLISH.md`.

The next safe sequence is:

1. publish these exact WASM bytes in the standalone public repository;
2. download the raw hosted file and verify both hashes against the manifest;
3. confirm the website's VERIFY & HASH result is the same Keccak-256;
4. have the user register `TEXT_AUTHENTICITY_CHECK`;
5. record the node's hidden-fixture result and registration ID; and
6. publish genuine evidence/adoption updates without artificial engagement.

## Judge-path hardening

The live Track 2 tab was re-read rather than inferred from the repository notes. It confirms a
focused manual review weighted 50% improvement, 30% robustness/code quality, 10% X engagement and
10% community adoption. `scorer/JUDGE_BRIEF.md` now gives reviewers a 90-second evidence path,
maps each technical receipt to the 80% engineering axes, and leaves the external 20% explicitly
unclaimed until real public links exist.

The public standalone repository had no workflow at the recheck. `release/standalone-ci.yml` now
provides a publish-ready CI definition: all-profile tests/lints, target build, byte comparison
against the tracked WASM, structural verification and manifest SHA/size verification.
