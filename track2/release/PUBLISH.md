# Standalone repository publication

## Current public state — published and byte-verified

Published 2026-08-29 to `Harshyadav442277/telegraph-factscore`:

- cross-platform artifact commit: `5728366ebc846faf2b81814be3b1dbec35f1c727`
- public metadata HEAD: `4dfacb4b2faea10286819b5ebcc584c2cc7275d1`
- `dist/text_authenticity.wasm`: 25,887 bytes
- SHA-256: `1a0f191b57ed06421bf2ad067863261f515927b9d8bbc53e4e01ed99aa5fc634`
- Keccak-256: `67da3ac8c06529a4ac44044bcf04471dd7d6c62fc97ca34fdd364a8feceb53aa`
- fresh commit-pinned raw download: byte length and both hashes verified
- GitHub Linux CI runs `33226710992` and `33226839747`: all profiles green and build byte-identical
- on-chain state: not registered

Registration URL:

```text
https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/5728366ebc846faf2b81814be3b1dbec35f1c727/dist/text_authenticity.wasm
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
correctly rejected the byte comparison. It was never registered and is superseded by `5728366`,
which normalizes the paths during compilation.

## Files to publish

The monorepo remains the editing source. Sync these paths into the standalone repository:

| Monorepo path | Standalone path |
|---|---|
| `track2/scorer/.cargo/config.toml` | `.cargo/config.toml` |
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
bytes      25887
sha256     1a0f191b57ed06421bf2ad067863261f515927b9d8bbc53e4e01ed99aa5fc634
keccak256  67da3ac8c06529a4ac44044bcf04471dd7d6c62fc97ca34fdd364a8feceb53aa
```

The commit-pinned raw URL was downloaded to a fresh file and both hashes reproduced. The release
manifest records the artifact commit/URL. Proceed to the website's VERIFY & HASH step; the wallet
signature remains a user-only action.
