# CLAUDE.md — track2 (WASM evaluators) operating rules

**Goal (Season II Evaluators track):** scorers that measure an intent's answers better than the incumbent —
by what an answer asserts, not by how it is worded — so stronger measurement replaces weaker. Rules:
[../RULES_SEASON2.md](../RULES_SEASON2.md); Evaluator rules were unpublished on 2026-10-17. Nothing here may
break the miner in `../track1-miner`, which shares this repo.

## Docs — read at session start

- [README.md](README.md) — what is here and what Season I measured.
- [MEMORY.md](MEMORY.md) — Season I state of every registration. [GAPS.md](GAPS.md) — open gaps.
- [ARCHITECTURE.md](ARCHITECTURE.md) — design decisions. Conform, or update it before deviating.
- [FIXTURES.md](FIXTURES.md) — evaluation corpus spec.

## Hard rules

1. Wallet, signing and secrets rules inherit from the root [CLAUDE.md](../CLAUDE.md) unchanged.
2. **No miner fingerprints in any scorer.** A scorer encodes general intent correctness — no slug, wallet,
   field-name, schema or phrasing match that favours (or disfavours) `livecert`. Fixtures must show our own
   miner's answer style scored DOWN when factually wrong.
3. **Measure before claiming.** Every "better than the incumbent" claim comes from the offline harness on
   pinned binaries and fixtures. Never hand-write a candidate answer while reading its ground truth.
4. **No calibration wrappers.** A monotone map on someone else's binary changes no ordering and improves
   nothing; Season I proved it wins slots, which is why it is not quality.
5. `calibration/dist/text_authenticity_v2.wasm` is registration 1882's on-chain artifact; CI pins its bytes.
   Never edit or delete it while that registration is active.
6. Boring, explicit code. Files under ~300 lines. Commit messages describe the change and nothing else.
