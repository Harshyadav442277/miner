# track2 — WASM evaluators (Season I Script Author → Season II Evaluators)

Season II's Evaluators track ("build or improve how that intelligence is measured … per Intent", see
[../RULES_SEASON2.md](../RULES_SEASON2.md)) is what Season I called Script Author. This folder keeps the
parts that carry over; the Season I submission brief, task board and calibration experiments were
removed on 2026-10-18 and remain in git history. The published scorer repository is
[`telegraph-factscore`](https://github.com/Harshyadav442277/telegraph-factscore).

Wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` · X [@hyadav42774](https://x.com/hyadav42774)

## What is here

| path | what it is |
|---|---|
| [scorer/](scorer/), [scorer-v2/](scorer-v2/) | the fact-aware scorer: `no_std` Rust, zero imports, grades assertions (figures, identifiers, units, verdicts) rather than vocabulary |
| [harness/](harness/) | offline gate proxy that reproduces node scores to six significant figures; `time-base.mjs` measures per-call cost |
| [fixtures/](fixtures/), [FIXTURES.md](FIXTURES.md) | the evaluation corpus and its spec |
| [recon/](recon/) | how the node scores, the promotion gate and its time budget, each with a reproducer |
| [release/](release/) | publishing to the standalone repo, release identity checks and the CI probes |
| [calibration/screen-registry.mjs](calibration/screen-registry.mjs) | live board screen: per intent, how many fixture pairs the champion separates and what beating it needs |
| `calibration/dist/text_authenticity_v2.wasm` | kept only because registration 1882 is live on-chain and CI pins its bytes |
| [ARCHITECTURE.md](ARCHITECTURE.md), [PROOF.md](PROOF.md), [GAPS.md](GAPS.md), [MEMORY.md](MEMORY.md) | design, proof pack, open gaps, Season I state |

## What Season I measured (still true unless the Season II gate changed)

1. The agreement gate protects incumbent errors: a scorer that fixes them diverges from the ranking and
   fails the live-traffic check (registration 1725).
2. The margin axis measures calibration, not evaluation quality: a strictly increasing map on an
   incumbent's binary moves it without changing any ordering. That is why the calibration wrappers were
   not kept — they improve nothing about measurement.
3. The gate's ten-minute budget freezes intents served by the 24 MB transformer family
   ([method](recon/2026-08-31-runtime-budget-lock.md)).

## Reproduce

```bash
node calibration/screen-registry.mjs                       # live board, ceilings, headroom
node harness/time-base.mjs scorer/dist/head/generic.wasm   # per-call cost
cargo build --release --target wasm32-unknown-unknown --no-default-features --features generic
```
