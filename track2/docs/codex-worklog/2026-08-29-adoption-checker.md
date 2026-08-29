# 2026-08-29 — one-command TAC adoption checker

> Historical checkpoint for the checker introduction. The current artifact identity and metrics
> are in [2026-08-29 unseen-negation hardening](2026-08-29-negation-hardening.md).

## Why

The full two-stage harness is strong evidence, but it asks another author to download a roughly
24 MB incumbent and wait minutes. That is too much friction for the rubric's genuine-adoption
criterion. A focused public TAC check should take one local WASM path and produce a shareable
result without an install, network request, transaction, or incumbent.

## Change

Added `track2/harness/check-tac.mjs`. It uses the same allocator-safe ABI loader and frozen public
TAC corpus as the proof harness. It checks:

- required exports and ABI arity;
- exact zero for empty and ASCII-whitespace answers;
- finite `[0,1]` scores and the `0.75` self-match floor;
- all 256 strict correct-over-counterfactual pair orderings; and
- all 16 equivalent-answer near-equality constraints.

Human output is the default; `--json` emits a machine-readable result. Exit codes are `0` for a
complete public pass, `1` for a benchmark failure, and `2` for usage/load/runtime errors. Every
output labels itself as a public proxy, not the hidden rotating node gate.

## Discrimination test

| Module | Result | Pair wins | Separation | Equivalence constraints |
|---|---:|---:|---:|---:|
| Frozen 25,488-byte scorer | PASS | 256/256 | 0.974996 | 16/16 |
| Exact incumbent registration 850 | FAIL | 33/256 | -0.124818 | 4/16 |

The incumbent preserved structural correctness, blank handling, range, and self-match, then failed
the semantic checks. That is the intended result: the checker isolates the submission's claimed
advantage instead of manufacturing a generic pass badge.

## Submission-state boundary confirmed with the user

- Only changed Track 1 intent/miner metadata needs the corresponding website update.
- GitHub source, documentation, tests, corpus, proof, and harness can change without a website or
  chain action.
- If a source change produces different Track 2 WASM bytes, those bytes are not live until they
  are published, re-hashed, and submitted through a fresh `registerWasm` transaction.

No adoption is claimed yet. Publication is not third-party use; only genuine external results,
issues, replies, or downstream reuse count as evidence.

## Live state rechecked

On 2026-08-29, the public standalone repository still ended at commit `867fd15` and therefore
still served the superseded 23,232-byte artifact. The TAC registry still named registration 850
as champion at margin `0.65861213`, 14/15 wins, zero historical rows, with 83 returned entries.
The synchronized staging tree is local only; no commit, push, website change, wallet signature, or
registration was performed.
