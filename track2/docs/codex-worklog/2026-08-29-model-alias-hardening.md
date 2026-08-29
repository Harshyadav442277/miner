# Model-alias hardening

- Wrote and hashed a 10-pair probe before changing the scorer.
- Frozen v1.0.0 result: 3/10 strict wins, mean margin 0.146267.
- Root cause: equivalent model names crossed identifier, number, and proper-noun token classes.
- Added a bounded semantic model-claim parser: punctuation and spacing are neutral, while family,
  version, size, variant, and attribution polarity remain exact claims.
- Candidate result: 10/10 strict wins, mean margin 0.846029; public corpus 256/256; negation
  holdout 20/20; ABI/trap verification and 84 Rust tests pass.
- Published artifact/source commit: `409911f351b4778555ac5bb03c9a6d6bba69ae58`.
- Stable release: `tac-v1.1.0`; release asset was re-downloaded and both hashes reproduced.
- GitHub Linux CI run `33227694014` rebuilt the artifact byte-for-byte and passed every profile.
- New artifact: 30,011 bytes; SHA-256 `8d8d690628d2cfcd52359f1bb1bfcd882456fc1198b80237ad74c1276a4ae8fe`;
  Keccak-256 `8599d78b039870628b67bb8e855cd6f93fc337eb0e569d786d16fa13036e9938`.
- The previous release remains historical and must not be registered. The new artifact is still
  unregistered; a wallet owner must submit the on-chain transaction.
