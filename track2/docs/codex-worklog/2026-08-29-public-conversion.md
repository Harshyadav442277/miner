# 2026-08-29 — public conversion and adoption audit

## Outcome

The post-release rank-1 audit found that the scorer and proof were ready, but the public conversion
surface was not. The standalone repository had no release tag or discovery topics, its issue flow
did not give external authors a structured way to report benchmark runs, and the standalone README
did not carry the mandatory Track 1/Track 2 authorship disclosure. Several prepared X posts still
described obsolete binary sizes or the earlier broad harness.

Those gaps are now closed without changing the frozen WASM bytes or registration URL.

## Genuine adoption evidence

The public repository has one external fork, `shreshth006/telegraph-factscore`. It is not an empty
mirror: its branch is nine commits ahead and contains measured, IP-geolocation-specific changes to
the shared fact-aware kernel. This is recorded narrowly as genuine source reuse. It is **not**
treated as independent validation of the TAC artifact, and no downstream claim was imported merely
because it appeared in the fork.

That distinction mattered: the fork also contains a hash note that conflicts with the upstream
Keccak evidence. Upstream retained the independently reproduced result—OpenSSL Keccak-256 of
champion registration 850's hosted bytes equals its registry hash—and did not adopt the fork's
conclusion.

## Changes

- Added a GitHub issue form requiring a real module identity, unedited `check-tac` output, a stated
  finding, and an integrity confirmation.
- Added the livecert registration-225 overlap disclosure to the standalone README.
- Added the verified downstream-fork receipt, with an explicit non-endorsement boundary, to the
  README, judge brief, strategy, tasks, continuity notes, and gaps ledger.
- Corrected the X drafts to the 25,887-byte release and the focused 256-pair plus 20-held-out-check
  public surface. Added a mandatory disclosure post and a bounded adoption-receipt post. Every
  draft is independently character-counted at 280 or fewer.
- Added accurate repository topics for discovery.
- Published stable GitHub release `tac-v1.0.0` at public commit
  `1c74af5d54e177d97c75687feff9c197eccfd9fc` with the frozen WASM attached.

## Verification

- Public CI run `33227235399`: success, including all-profile tests/lints and Linux byte-for-byte
  reproduction of the frozen artifact.
- Downloaded release asset: 25,887 bytes.
- Release-asset SHA-256:
  `1a0f191b57ed06421bf2ad067863261f515927b9d8bbc53e4e01ed99aa5fc634`.
- Release-asset Keccak-256:
  `67da3ac8c06529a4ac44044bcf04471dd7d6c62fc97ca34fdd364a8feceb53aa`.
- Final live registry recheck at 2026-08-29 07:09 IST: 83 TAC entries, champion registration 850
  at margin 0.65861213 and 14/15 wins, zero historical rows, and no match for this release hash or
  URL.

## Boundary

No X post, wallet signature, Telegraph registration, or synthetic engagement was performed. The
remaining actions genuinely require the user's accounts: publish the prepared disclosure/evidence
posts and sign the one TAC registration only after the console displays the exact Keccak above.
