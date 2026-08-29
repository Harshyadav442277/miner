# v1.2 semantic repair after registration 1671

## Network evidence

Registration 1671 proved that v1.1.0 was structurally valid but semantically weak: Stage 1 passed,
then Stage 2 rejected it at 9/15 correct orderings and margin 0.3274022. Champion 850 retained the
slot at 14/15 and 0.65861213. No hidden fixture content was exposed.

## Predeclared probes

- `2026-08-29-authenticity-axes.mjs` SHA-256
  `e6ad0933121e5efc4d818c49bfc7a8fa234548db7fe60b1b24c678bb7c4eb679`: rejected v1.1.0
  scored 18/20, margin 0.463029. The first axis repair scored 20/20, margin 0.617114, but four
  correct paraphrases remained near 0.007.
- `2026-08-29-authenticity-vocabulary.mjs` SHA-256
  `4b2b98aa20ec9d1061f6627e3f870ab6252b05cf5f77a23cb7a8d3ddf90709f5`: the intermediate
  candidate scored 8/12 with mean margin 0.000003.

Both probes were written and hashed before the corresponding scorer change. They are derived from
the public intent definition, not Telegraph's hidden cases. Checkpoint `e002b7d` preserves those
exact hashed versions; a later packaging-only edit made their harness import work from both the
monorepo and standalone `release/` directory without changing any case.

## Repairs

- Separated authorship, originality, genuineness, integrity, and verification into independent
  semantic classes. An authentic copy is no longer treated as an original.
- Split broad support from strict contradiction handling, preventing cross-axis shorthand from
  cancelling a real same-axis contradiction.
- Made a supported, unambiguous semantic verdict open the answeredness gate. This fixed correct
  paraphrases such as `person` for `human` that had precision 0.98 but were pinned to score 0.007.
- Added bounded ordinary-language variants such as `algorithmically`, `lifted`, `fraudulent`,
  `doctored`, `pristine`, and `undetermined`.
- Exposed the WASM's existing five-value breakdown through the local ABI harness for repeatable
  diagnosis; it does not affect the scoring ABI.

## Frozen local candidate

```text
bytes      30897
sha256     3bb3bb82e0f6e2db9948e8ce96c8f1796835858d4b0a78332ec0b624501628a9
keccak256  8cfc5456b08363d281878b59f587ad9c44b7296b211a6a4bab4ec794a3c58a07
```

- Public TAC proxy: 256/256, separation 0.973696.
- Negation holdout: 20/20, mean margin 0.945619.
- Model-alias holdout: 10/10, mean margin 0.960045.
- Independent-axis probe: 20/20, mean margin 0.974294.
- Vocabulary probe: 12/12, mean margin 0.999465.
- All five profile test/clippy combinations, formatting, and the Stage-1 verifier pass.
- A 10:54 IST live registry read still showed champion 850 at 14/15 and margin 0.65861213, zero
  historical rows, and 85 entries.

Published at artifact commit `638dae46ba31c1bf3a30e9d0e541b7c56f3fe48b`, tagged `tac-v1.2.0`.
A fresh commit-pinned download reproduced both hashes and Linux CI run `33236230467` passed every
release gate. Only a new user-signed registration remains before any network rank claim.
