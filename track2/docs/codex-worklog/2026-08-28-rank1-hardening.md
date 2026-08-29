# 2026-08-28 — Track 2 rank-1 hardening

> Historical checkpoint. Superseded later the same day by
> [independent hardening and release freeze](2026-08-28-independent-hardening.md). The hashes and
> metrics below remain as an audit record and are not the current registration identity.

## Outcome

The `TEXT_AUTHENTICITY_CHECK` candidate improved from **234/240 wins and +0.721069 margin** to
**240/240 wins and +0.971687 margin** on the native clean-pair corpus. The live champion bar was
**0.65861213**, leaving an offline cushion of approximately **+0.3131** instead of +0.0625.

This is legitimate evaluator hardening, not fixture fingerprinting: the fixes recognize asserted
verdicts even when the question lists both answer choices, compare named model attributions across
token shapes, and correctly rank an unknown unit below a grossly wrong value in the expected unit.

## Live snapshot

Queried `https://devnode.telegraphprotocol.com/api/wasm` on 2026-08-28:

- incumbent registration: **850** (`tn_t70`)
- status: active champion
- candidate margin/bar: **0.65861213**
- wins: **14/15**
- historical rows: **0**, so the Spearman check is skipped
- our wallet has no `TEXT_AUTHENTICITY_CHECK` registration
- highest registry id observed: **1607**

Live values drift. Poll immediately before registration.

## Defects found

1. The old handoff said all six native-corpus losses were confidence near-misses. That was false.
   Five were wrong verdicts hidden because question-option tokens were excluded from verdict
   detection; one was a wrong model attribution missed because `Claude` and `GPT-4` tokenize into
   different categories.
2. Default-feature tests were green while the actual registration feature failed a unit-category
   regression. CI did not compile or test the release target.
3. The TAC proof path reused the content-verification corpus instead of TAC's native corpus.
4. The fixture generator depended on the caller's working directory and omitted class/provenance
   metadata used by the proof report.
5. Two unused profile knobs, one unused set method, a production-only test constructor, six blanket
   dead-code suppressions, and roughly 100 lines of duplicated profile configuration obscured the
   real decision surface.

## Changes

- Fixed verdict and named-model attribution semantics in `scorer/src/score.rs` and added focused
  regressions.
- Set the text-verification foreign-unit multiplier to `0.005` and deduplicated the content/TAC
  profiles in `scorer/src/profile.rs`.
- Removed the dead fields/method/suppressions and restricted the empty token constructor to tests.
- Made the TAC generator cwd-independent, deterministic, classified, and self-versioning.
- Made the proof harness use the native TAC corpus.
- Made `verify.mjs` recognize all four intent tags and exit cleanly on Windows.
- Added a GitHub Actions job that formats, lints, and tests every profile and verifies a freshly
  built TAC WASM.

## Evidence

Feature matrix, all with warnings denied:

| profile | tests | result |
|---|---:|---|
| generic | 74 | pass |
| IP geolocation | 75 | pass |
| storm alert | 66 | pass |
| content verification | 74 | pass |
| text authenticity | 74 | pass |

The final local candidate:

- path: `scorer/dist/text_authenticity_candidate.wasm` (gitignored)
- size: **23,845 bytes**
- SHA-256: `55074d66d78b1cfdd3299702b4e305b960d32fbeac11ad35436414db026091df`
- local Keccak-256: `79d66f1a5dedc9ad031bdb6e741b717c70da6d884bcd3aa7e449ef0a01d10196`
- imports: **0**
- ABI/stage-1 verifier: pass
- native TAC corpus: **240/240**, margin **+0.971687**, 12/12 form-equivalence checks
- cross-intent content-verification holdout: **144/144**, margin **+0.963445**

`PROOF.md` was regenerated from all five freshly built artifacts in one 2,958-call run. Its TAC
row now uses the native TAC corpus and reports 240/240, +0.971687; the proof generator's SHA-256
consistency guard passed for every candidate and incumbent.

The incumbent scored 21/240 with margin -0.165231 on the native TAC corpus. These are offline proxy
results against the pinned incumbent bytes, not claims about the node's hidden fixtures.

## Release boundary

The candidate is **not published and not registered**. Its local Keccak-256 was computed with
OpenSSL after the same command reproduced champion reg 850's known on-chain hash. The hash has not
yet been reproduced from final hosted bytes, so the old hosted URL and hash in `REGISTRATION.md`
must not be used.

Required release sequence:

1. Freeze the candidate bytes and publish those exact bytes in the public scorer repository.
2. Download the raw GitHub URL and prove it is byte-identical to the local candidate.
3. Recompute Keccak-256 from the hosted bytes; it must equal the local hash above and the console's
   VERIFY & HASH result.
4. Register `TEXT_AUTHENTICITY_CHECK` with the user's wallet.
5. Read the node verdict from the public registry and record the registration id/evaluation.

GitHub source may continue changing afterward, but a registered WASM URL/hash is a pinned release
identity. A materially changed binary needs a new registration transaction.

## Rules boundary

No artificial engagement, hidden-fixture extraction, opponent sabotage, identity manipulation, or
repeated micro-probe registrations. The asymmetry is transparent engineering: target a weak
champion, expose a decisive semantic blind spot, publish reproducible evidence, and maintain the
module through Track 3.
