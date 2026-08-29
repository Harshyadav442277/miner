# 2026-08-29 — standalone release-surface debloat

> Historical checkpoint for the packaging cleanup. The recorded 25,488-byte positive control
> was later superseded by
> [2026-08-29 unseen-negation hardening](2026-08-29-negation-hardening.md).

## Defects found

The locally synchronized public repository still exposed five binaries under `dist/`, although
only `text_authenticity.wasm` is the selected registration. Its root README and generated proof
led with several abandoned intent targets, including an explicit STORM loss, before reaching the
TAC result. A historical 35 KB tuning file also remained at the root. Those files are useful in
the editing monorepo but create avoidable ambiguity in a focused manual review.

`harness/make-proof.mjs` also contained a fallback to one developer's absolute temporary Claude
scratchpad. That path was non-portable, leaked machine-specific state, and was dead once incumbent
binaries had a documented repository-local location.

## Changes

- Removed the absolute scratchpad fallback. Incumbents now resolve only from an explicit flag or
  `harness/champions/`, matching the public instructions.
- Added `release/STANDALONE_README.md`, which leads with the selected intent, semantic mechanism,
  exact release identity, one-command check, and evidence boundary.
- Added `release/TAC_PROOF.md`, reducing the public proof to the exact candidate/incumbent bytes,
  16 fixtures, 256 pairs, reproduction commands, and independent verifier receipt.
- Added `release/verify-standalone.mjs`, a read-only public-surface audit.
- Updated the publication map and standalone CI to run the semantic checker and release audit.
- Removed four non-TAC WASM files and the historical root `tune.md` from the local standalone
  staging tree. They remain available in the editing monorepo and git history.

## Release-audit invariants

The audit fails when:

- `dist/` contains anything except `text_authenticity.wasm`;
- required source, evidence, fixture, workflow, or release files are missing;
- development-only publication instructions or `tune.md` leak into the public root;
- the artifact size or SHA-256 differs from the manifest;
- TAC fixture count, pair count, or corpus version differs from the manifest;
- the public README, proof, or judge brief does not bind the full artifact SHA; or
- a Windows, macOS, or Linux home-directory path appears in the publishable text surface.

Positive control: the staged repository passes at 25,488 bytes and SHA-256
`4bb84373511e2b2bd76f9975c4e8425958181cecf74673c3e772440fd74e254e`.

Negative control: temporarily adding `dist/should_fail_extra.wasm` returns exit code 1 and names
both binaries. After deleting that exact probe file, the audit returns to exit code 0.

## Frozen artifact regression

The cleanup changed packaging and harness code only. A pinned Rust 1.98.0 TAC run passed 77/77
tests, `clippy -D warnings`, the release build, and the full local verifier. The rebuilt WASM SHA
remained byte-for-byte identical to the frozen SHA above. The public TAC checker remained 256/256
at separation 0.974996.

No commit, push, registration, wallet signature, website edit, or third-party adoption claim was
performed.
