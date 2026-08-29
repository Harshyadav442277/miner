# Standalone repository publication

## Current public state — published and byte-verified

Published 2026-08-29 to `Harshyadav442277/telegraph-factscore`:

- cross-platform artifact commit: `409911f351b4778555ac5bb03c9a6d6bba69ae58`
- public metadata HEAD: `1c74af5d54e177d97c75687feff9c197eccfd9fc`
- stable release: `tac-v1.1.0`, with `text_authenticity.wasm` attached
- `dist/text_authenticity.wasm`: 30,011 bytes
- SHA-256: `8d8d690628d2cfcd52359f1bb1bfcd882456fc1198b80237ad74c1276a4ae8fe`
- Keccak-256: `8599d78b039870628b67bb8e855cd6f93fc337eb0e569d786d16fa13036e9938`
- fresh commit-pinned raw download: byte length and both hashes verified
- GitHub Linux CI run `33227235399`: all profiles green and build byte-identical
- downloaded release asset: byte length, SHA-256, and Keccak-256 verified
- on-chain state: not registered

Registration URL:

```text
https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/409911f351b4778555ac5bb03c9a6d6bba69ae58/dist/text_authenticity.wasm
```

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
| `track2/release/text-authenticity.json` | `release/text-authenticity.json` |
| `track2/release/verify-standalone.mjs` | `release/verify-standalone.mjs` |
| `track2/release/standalone-ci.yml` | `.github/workflows/ci.yml` |

Do not copy non-TAC fixture families, corpus generators, polling/proof generators,
`report-*.json`, `harness/champions/`, `target/`, or obsolete candidate WASM files. The three
obsolete local candidate files were removed after the canonical artifact was verified
byte-identical.

`PUBLISH.md`, `standalone-ci.yml`, the broad generated `track2/PROOF.md`, and the historical
`scorer/tune.md` are development-side evidence, not the focused public release payload. Copy the
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
bytes      30011
sha256     8d8d690628d2cfcd52359f1bb1bfcd882456fc1198b80237ad74c1276a4ae8fe
keccak256  8599d78b039870628b67bb8e855cd6f93fc337eb0e569d786d16fa13036e9938
```

The commit-pinned raw URL was downloaded to a fresh file and both hashes reproduced. The release
manifest records the artifact commit/URL. Proceed to the website's VERIFY & HASH step; the wallet
signature remains a user-only action.
