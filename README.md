# LiveCert + FactScore — Telegraph Hackathon Season I

Two public, reproducible submissions from `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.

| Track | Submission | Review first |
|---|---|---|
| **1 — Miner** | [LiveCert](https://explorer.telegraphprotocol.com/miners/livecert), miner ID **4433**, active registration **389** | [`track1-miner/README.md`](track1-miner/README.md) |
| **2 — Script Author** | Fact-aware WASM evaluators plus a measured audit of Telegraph's promotion gate | [`track2/SUBMISSION.md`](track2/SUBMISSION.md) |

X account: [`@hyadav42774`](https://x.com/hyadav42774) · Official account tagged in updates:
[`@Telegraphprotoc`](https://x.com/Telegraphprotoc)

## Track 1 — LiveCert

LiveCert is a deterministic, keyless miner for ten operational and research intents. It performs
live TLS handshakes, weather and storm checks, IP geolocation, translation, academic search,
structured extraction, news retrieval, wallet-balance reads, and conservative AI-text analysis.

- **Live service:** <https://miner-wine.vercel.app>
- **Explorer:** <https://explorer.telegraphprotocol.com/miners/livecert>
- **Submission miner ID:** `4433`
- **Active on-chain registration:** `389`
- **Registered manifest:** [commit-pinned `miner.yaml`](https://github.com/Harshyadav442277/miner/blob/74ad4a19f41b922a5183dc26d6f405c8557dc9ba/track1-miner/miner.yaml)
- **Latest judged epoch in the registry:** 297 — four rank-1, two rank-2, two rank-3, and two
  rank-4 intent results
- **Requests served at the 2026-08-31 submission audit:** 132
- **Verification at the same audit:** 237/237 tests passed; the production acceptance matrix
  passed with a 411 ms median and 1.22 s p95

The exact registered surface and reproducible verification commands are in the
[Track 1 review guide](track1-miner/README.md). The miner remains live through Track 3 as required.

## Track 2 — fact-aware evaluation

The primary Track 2 contribution is a small, deterministic `no_std` scorer that evaluates typed
assertions—figures, units, identifiers, coordinates, and categorical verdicts—instead of relying
only on vocabulary proximity.

The strongest network receipt is `CRYPTO_PRICE` registration **1725**: it matched the incumbent's
14/15 fixture ordering and produced a larger separation margin (`0.7219137` versus `0.6295639`),
but was rejected because its ranking of real traffic disagreed with the incumbent. That result is
reported as evidence of the promotion gate's incumbent-agreement trade-off, not presented as an
active registration.

Three separate calibration experiments are currently active and rank 1. They demonstrate that a
strictly increasing post-map can win the gate without changing answer ordering; they are not used
as the evaluator-accuracy claim.

| Registration | Intent | Status | Compiled module |
|---:|---|---|---|
| **2365** | `CRYPTO_PRICE` | active, rank 1 | [`crypto_price_v3.wasm`](https://github.com/Harshyadav442277/miner/blob/4c0f6d5db19f72c76031d90f1aa842a115d643a8/track2/calibration/dist/crypto_price_v3.wasm) |
| **2010** | `LANGUAGE_GENERATION` | active, rank 1 | [`language_generation_m45.wasm`](https://github.com/Harshyadav442277/miner/blob/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_generation_m45.wasm) |
| **1882** | `TEXT_AUTHENTICITY_CHECK` | active, rank 1 | [`text_authenticity_v2.wasm`](https://github.com/Harshyadav442277/miner/blob/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/text_authenticity_v2.wasm) |

Start with the [Track 2 submission brief](track2/SUBMISSION.md). The focused evaluator repository,
including source, compiled modules, CI, tests, and proof, is
[`telegraph-factscore`](https://github.com/Harshyadav442277/telegraph-factscore).

## Evidence boundary

- Live registry state and ranks are time-dependent; the values above were re-read on
  **2026-08-31**.
- Local or public-corpus benchmarks are labelled as offline evidence, not hidden-fixture results.
- Rejected and superseded registrations are identified as such.
- The Track 1/Track 2 overlap was disclosed to the organizers. The scorer contains no miner slug,
  wallet, response-template fingerprint, or special case for LiveCert.

Official criteria: [Telegraph Hackathon rules](https://hackathon.telegraphprotocol.com/rules).
