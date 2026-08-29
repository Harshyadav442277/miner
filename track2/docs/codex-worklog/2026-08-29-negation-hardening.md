# 2026-08-29 — unseen-negation hardening and final local refreeze

## Outcome

The final pre-publication red team found a material semantic defect after every public corpus gate
was green. The 25,488-byte intermediate scorer won only **10/20** deliberately unseen
authenticity comparisons. It treated negated labels as positive support: with truth `not
original`, the correct `copied` answer scored 0.000007 while the wrong `original` answer scored
0.997858; with truth `no evidence of AI generation`, the wrong positive AI answer scored
0.999137.

The repaired release wins **20/20**, mean margin **0.757994**, worst margin **0.007009**. The
probe is now public at `release/probe-negation.mjs`, but remains separate from the 256-pair
benchmark so the held-out result cannot inflate the primary corpus metric.

## Root cause and accepted fix

Verdict-antonym comparison used the base token relation but ignored each token's `neg` state.
Literal token support could therefore match a positive answer against a negated truth. Short
verdict answers were also routed mostly through the low-weight prose tie-breaker.

`scorer/src/score.rs` now:

- defines semantic verdict agreement using the base relation plus both negation states;
- treats equivalent labels as agreeing when negation matches and opposites as agreeing when
  exactly one side is negated;
- uses that relation for verdict support, categorical classification and polarity; and
- counts closed-set verdicts as assertions in precision.

Two regression tests bind the behavior:
`negated_verdicts_reverse_the_semantic_pole` and
`explicit_negative_and_positive_labels_do_not_cancel`.

## Rejected branch

A broader full-sentence categorical shortcut also made the new probe green, but red-teaming it
showed that `human-authored; no model detected` could give a perfect score to an answer inventing
`GPT-4`. That shortcut and its test were removed before refreezing. The accepted change is the
narrow semantic rule that fixes negation without suppressing independent attribution errors.

The first clean standalone all-profile matrix then caught a separate inconsistency: the
`storm-alert` feature scored `Assessment is human-written` versus `Verdict is human-written` only
0.400526, failing the already-existing presentation-equivalence invariant. The implementation now
aliases structural labels only when they are sentence-initial and introduce a closed-set verdict;
the context restriction prevents substantive phrases such as `Response is delayed` from being
treated as labels. The targeted invariant passes under all five profiles, TAC metrics are
unchanged, and this more general build became the final local freeze.

## Frozen identity and evidence

```text
path       track2/scorer/dist/text_authenticity.wasm
bytes      25887
sha256     e7bb15f12e55aa5a0cb8fa30f5d2d5a21a3027d026b207d3d8563d2ae2ae52b6
keccak256  bdd3fea5deb7ce2a48663aa7ec63d5a295ade30c4c2bb2d3254031cb04cdca0f
```

- A clean Rust 1.98.0 build in a separate target directory reproduced the SHA-256 byte-for-byte.
- Public TAC corpus: **256/256**, separation **0.973844**; clean 240/240, mean margin 0.970427;
  label equivalence 16/16, mean margin 0.998724; constraints 16/16.
- Exact incumbent reg 850: 33/256, separation -0.124818.
- Content-verification holdout: **144/144**, separation **0.963445**.
- Five test/clippy profiles: **79 / 80 / 71 / 79 / 79** tests, all green.
- Local ABI verifier: green.
- Independent verifier at pinned commit `f537c7c`: 17/17 structural, 14/14 robustness, 500
  seeded fuzz triples, fresh-instance determinism, approximately 800 microseconds per 128 KiB
  call, no sustained memory growth, and 16/16 custom TAC cases.

The 0.001152 decrease from the intermediate public separation is accepted: it buys ten unseen
wins and removes two near-total semantic inversions while retaining every public ordering and the
cross-profile holdout.

## Publication-surface hardening

The standalone staging repository was reduced to one WASM, the two TAC fixture files, the focused
proof/brief, and only the harness modules needed for candidate-only and incumbent comparisons.
Non-TAC real/probe/synthetic corpora and generator/polling/proof-builder scripts were removed from
that publication surface. `release/verify-standalone.mjs` now enforces these exact harness and
fixture allowlists.

`harness/run-eval.mjs` previously defaulted to monorepo-only `track2/fixtures/...` paths, so the
proof's documented comparison command was not portable. Its defaults now resolve from the script
location. From the debloated standalone tree, the full comparison reproduces candidate 256/256,
0.973844 versus incumbent 33/256, -0.124818.

The broad `PROOF.md` generator rejected stale reports bound to the 25,535-byte intermediate SHA,
then completed a fresh 551-second rescore against every pinned incumbent and emitted a proof bound
to the final SHA. Both monorepo and standalone CI execute the public TAC gate and held-out probe;
standalone CI additionally enforces the release allowlist.

## Boundary

The focused standalone release was committed and pushed to the public repository at
`25ff8089d4d3f1cfcc639115e14464d7d6313cc1`. A fresh download from its commit-pinned raw URL
reproduced 25,887 bytes, SHA-256
`e7bb15f12e55aa5a0cb8fa30f5d2d5a21a3027d026b207d3d8563d2ae2ae52b6`, and Keccak-256
`bdd3fea5deb7ce2a48663aa7ec63d5a295ade30c4c2bb2d3254031cb04cdca0f` exactly.

No website action, wallet signature or Telegraph registration was performed. The release is
ready for the user to paste the verified raw URL, compare the console's hash with the Keccak
above, and sign only if it matches.

The public TAC registry was rechecked at 2026-08-29 06:53 IST: 83 entries, incumbent registration
850 still champion at margin 0.65861213 and 14/15 wins, zero historical rows, and the new release
hash absent as expected before registration.

A metadata-only follow-up was pushed at `2da85486be186eaf7fd822edccd232e06fc74f33`; remote `main`
resolved to that commit and its public manifest records `published_verified`. The registration URL
remains pinned to artifact commit `25ff8089d4d3f1cfcc639115e14464d7d6313cc1`. A final direct
download after the metadata push again reproduced 25,887 bytes and the expected SHA-256.
