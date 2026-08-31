# Standalone repository publication

## Current state — v1.2 published, never registered

Frozen v1.2 release:

- `dist/text_authenticity.wasm`: 30,897 bytes
- SHA-256: `3bb3bb82e0f6e2db9948e8ce96c8f1796835858d4b0a78332ec0b624501628a9`
- Keccak-256: `8cfc5456b08363d281878b59f587ad9c44b7296b211a6a4bab4ec794a3c58a07`
- local five-profile matrix, Stage-1 verifier, and five semantic suites pass
- published at `telegraph-factscore` commit `638dae46ba31c1bf3a30e9d0e541b7c56f3fe48b`, hosted
  bytes downloaded and re-hashed (`publication.hosted_bytes_verified`)
- rebuilds byte-exact from monorepo commit `e12d09c83e38a91146ce9afb95cc8a0409ee848f`, on Windows
  and on Linux. Monorepo `main` no longer rebuilds them and is not meant to — see
  [README.md](README.md).

The currently public v1.1.0 artifact is historical. It was submitted as registration 1671 and
rejected at 9/15 wins, margin 0.3274022. Its artifact commit was
`409911f351b4778555ac5bb03c9a6d6bba69ae58`; do not register that URL again.

v1.2 registration URL:

```text
NONE — these bytes were never sent to registerWasm.
```

The TEXT_AUTHENTICITY_CHECK slot is instead held by registration 1882, which serves
`calibration/dist/text_authenticity_v2.wasm` (keccak
`eec7bc00a5131dfb4152c0ca3b4b54eabc9ed05092a5b4d014e3fe1453a50588`) from the calibration research
line, not this scorer. Registering v1.2 would be a fresh `registerWasm` against a slot we already
hold with different bytes; decide that deliberately rather than by drift.

## Superseded public state

Checked 2026-08-28 against `Harshyadav442277/telegraph-factscore`:

- public HEAD: `867fd15cbf3efbd081c885d7e9783a0a700903ec`
- `dist/text_authenticity.wasm`: 23,232 bytes
- SHA-256: `f58d986bb2216a81f3b103be0fcfc0d6f9174ea7f77d52da7a001d0db0c24039`
- Keccak-256: `aaea446b894a2190858739339e0dc200f72c69c7a4bb9af62c6584f359cb0e01`
- no public CI workflow, stars, forks, or issues observed

Do not register those bytes.

The later `25ff808` artifact (metadata HEAD `2da8548`) had the final scorer behavior but embedded
Windows backslashes in Rust source-span strings while Linux embedded forward slashes. GitHub CI
correctly rejected the byte comparison. It was never registered and is superseded by `409911f`,
which normalizes the paths during compilation.

## Files to publish

The monorepo remains the editing source. Sync these paths into the standalone repository:

| Monorepo path | Standalone path |
|---|---|
| `track2/scorer/.cargo/config.toml` | `.cargo/config.toml` |
| `track2/release/benchmark-result-issue.yml` | `.github/ISSUE_TEMPLATE/benchmark-result.yml` |
| `track2/scorer/Cargo.toml` | `Cargo.toml` |
| `track2/scorer/Cargo.lock` | `Cargo.lock` |
| `track2/scorer/rust-toolchain.toml` | `rust-toolchain.toml` |
| `track2/scorer/src/` | `src/` |
| `track2/release/STANDALONE_README.md` | `README.md` |
| `track2/scorer/JUDGE_BRIEF.md` | `JUDGE_BRIEF.md` |
| `track2/scorer/verify.mjs` | `verify.mjs` |
| `track2/scorer/dist/text_authenticity.wasm` | `dist/text_authenticity.wasm` |
| `track2/fixtures/synth/TEXT_AUTHENTICITY_CHECK_CLEAN_PAIR.json` | `fixtures/synth/TEXT_AUTHENTICITY_CHECK_CLEAN_PAIR.json` |
| `track2/fixtures/synth/TEXT_AUTHENTICITY_CHECK_LABEL_EQUIVALENCE.json` | `fixtures/synth/TEXT_AUTHENTICITY_CHECK_LABEL_EQUIVALENCE.json` |
| `track2/harness/check-tac.mjs` | `harness/check-tac.mjs` |
| `track2/harness/corpus.mjs` | `harness/corpus.mjs` |
| `track2/harness/report.mjs` | `harness/report.mjs` |
| `track2/harness/run-eval.mjs` | `harness/run-eval.mjs` |
| `track2/harness/score-pool.mjs` | `harness/score-pool.mjs` |
| `track2/harness/wasm-abi.mjs` | `harness/wasm-abi.mjs` |
| `track2/release/STANDALONE_HARNESS_README.md` | `harness/README.md` |
| `track2/release/TAC_PROOF.md` | `PROOF.md` |
| `track2/release/README.md` | `release/README.md` |
| `track2/release/probe-negation.mjs` | `release/probe-negation.mjs` |
| `track2/docs/codex-worklog/probes/2026-08-29-model-aliases.mjs` | `release/probe-model-aliases.mjs` |
| `track2/docs/codex-worklog/probes/2026-08-29-authenticity-axes.mjs` | `release/probe-authenticity-axes.mjs` |
| `track2/docs/codex-worklog/probes/2026-08-29-authenticity-vocabulary.mjs` | `release/probe-authenticity-vocabulary.mjs` |
| `track2/release/text-authenticity.json` | `release/text-authenticity.json` |
| `track2/release/verify-standalone.mjs` | `release/verify-standalone.mjs` |
| `track2/release/standalone-ci.yml` | `.github/workflows/ci.yml` |

Do not copy non-TAC fixture families, corpus generators, polling/proof generators,
`report-*.json`, `harness/champions/`, `target/`, or obsolete candidate WASM files. The three
obsolete local candidate files were removed after the canonical artifact was verified
byte-identical.

`PUBLISH.md`, `standalone-ci.yml`, `check-release-identity.mjs`,
`registered-text-authenticity.json`, the broad generated `track2/PROOF.md`, and the historical
`scorer/tune.md` are development-side evidence, not the focused public release payload. The last
two are the monorepo's own gate and the identity of the calibration wrapper registered on chain;
neither belongs in the released scorer's repository, and `verify-standalone.mjs` rejects both. Copy the
workflow only to `.github/workflows/ci.yml`. It tests/lints every profile and proves that a clean
Linux build is byte-identical to the tracked TAC binary and manifest.

The old public repository contained four non-target binaries. They were removed; only
`dist/text_authenticity.wasm` belongs in the focused release. Run
`node release/verify-standalone.mjs .` before pushing; it fails on extra WASM files, leaked local
paths, missing release files, or an artifact/manifest mismatch.

## Required pre-push checks

From the standalone repository root:

```powershell
cargo +1.98.0 test --no-default-features --features text-authenticity
cargo +1.98.0 clippy --all-targets --no-default-features --features text-authenticity -- -D warnings
cargo +1.98.0 build --release --target wasm32-unknown-unknown --no-default-features --features text-authenticity
node verify.mjs dist/text_authenticity.wasm
Get-FileHash -Algorithm SHA256 dist/text_authenticity.wasm
openssl dgst -keccak-256 dist/text_authenticity.wasm
```

Expected identity:

```text
bytes      30897
sha256     3bb3bb82e0f6e2db9948e8ce96c8f1796835858d4b0a78332ec0b624501628a9
keccak256  8cfc5456b08363d281878b59f587ad9c44b7296b211a6a4bab4ec794a3c58a07
```

Do not proceed to the website until the commit-pinned raw URL is inserted and a fresh download
reproduces both hashes. The wallet signature remains a user-only action.
