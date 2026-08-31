# Track 2 — Script Author submission

**Start here: [SUBMISSION.md](SUBMISSION.md).** It is the judge-facing document and it opens with
the four submitted registrations and what each one actually is.

Wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` · X [@hyadav42774](https://x.com/hyadav42774)

---

## In one paragraph

The Canonical Script scores how much an answer's vocabulary resembles the ground truth, not what it
asserts. We measured that: a contentless restatement of the question scores 0.9933 while the answer
carrying the correct data scores 0.0080. We wrote a scorer that grades assertions instead — figures,
identifiers, units, verdicts, coordinates — and it out-separated the incumbent on the node's own
fixtures. It was rejected anyway, for disagreeing with the incumbent on live traffic. That
rejection, and what it says about the promotion gate, is the substance of this submission.

## What is here

| path | what it is |
|---|---|
| **[SUBMISSION.md](SUBMISSION.md)** | the entry document — read this |
| [scorer/](scorer/) | the original fact-aware scorer, `no_std` Rust, ~32 KB, zero imports |
| [scorer/dist/head/](scorer/dist/head/) | its compiled artifacts, one per intent profile |
| [harness/](harness/) | the offline gate proxy that reproduces node scores to six significant figures |
| [recon/](recon/) | protocol measurements, each with a reproducer |
| [calibration/](calibration/) | the calibration experiments, and the registry ceiling screen |
| [GAPS.md](GAPS.md) | the honesty ledger — everything unverified or broken, including in our own work |
| [PROOF.md](PROOF.md) | generated proof pack, regenerated from the artifacts it describes |

## The four findings

Each is measured, and each has something you can run.

1. **The agreement gate structurally protects incumbent errors.** A scorer that fixes the
   incumbent's mistakes necessarily diverges from its ranking and fails the real-traffic check.
   Registration 1725 is the live demonstration.
2. **The margin axis measures calibration, not evaluation quality.** A strictly increasing map
   appended to an incumbent's own binary changes no ranking of any answer, yet moves the margin
   axis freely — and took champion slots on eleven intents.
3. **The hidden fixture geometry is recoverable from public data.** `node
   calibration/screen-registry.mjs` prints, for all 45 intents, how many fixture pairs each
   champion separates and what beating it requires. Nine intents sit at an unbeatable 1.0.
4. **The gate's time budget freezes seven intents.** The incumbent 24 MB transformer family has never
   once finished the ten-minute gate on ACADEMIC_SEARCH, IP_GEOLOCATION, WEATHER_FORECAST,
   SSL_VERIFICATION, WEATHER_CHECK, WEB_SEARCH or NEWS_HEADLINES — fifteen attempts, zero verdicts
   — so nobody can improve those intents while building on it. Registration 2961 shows the cost
   exactly: 7 of 7 orderings and separation 0.9998413 against the champion's 0.9915076, rejected
   at 13m13s on the clock alone.
   ([method](recon/2026-08-31-runtime-budget-lock.md), `node harness/time-base.mjs <module.wasm>`)

## Reproduce

```bash
node calibration/screen-registry.mjs                      # live board, ceilings, headroom
node harness/time-base.mjs scorer/dist/head/generic.wasm   # per-call cost
cargo build --release --target wasm32-unknown-unknown \
  --no-default-features --features generic                 # rebuild the scorer
```

## What we are not claiming

The champion slots this wallet holds were won with calibration wrappers around another team's
MIT-licensed modules, with attribution and licence preserved. They are ranking-identical by
construction and improve nothing about evaluation quality. They are evidence for finding 2 and
should not be read as the improvement claim — see [GAPS.md](GAPS.md) G23, and section 1 of
SUBMISSION.md.
