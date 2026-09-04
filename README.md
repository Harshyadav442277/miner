# LiveCert + FactScore — Telegraph Hackathon Season I

Track 1 and Track 2 submissions from `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. The Track 3
application, **Morse**, lives in its own repository (see the table).

| Track | Submission | Review first |
|---|---|---|
| **1 — Miner** | [LiveCert](https://explorer.telegraphprotocol.com/miners/livecert), miner ID **4433**, active registration **402** | [`track1-miner/README.md`](track1-miner/README.md) |
| **2 — Script Author** | Fact-aware WASM evaluators plus a measured audit of Telegraph's promotion gate | [`track2/SUBMISSION.md`](track2/SUBMISSION.md) |
| **3 — Application** | Morse: ask Telegram, get a receipt from the Telegraph network (Telegram bot, web ledger, hosted MCP) | [`telegraph-morse`](https://github.com/Harshyadav442277/telegraph-morse) |

X account: [`@hyadav42774`](https://x.com/hyadav42774) · Official account tagged in updates:
[`@Telegraphprotoc`](https://x.com/Telegraphprotoc)

## Track 1 — LiveCert

LiveCert is a deterministic, keyless miner for thirteen operational and research intents. It performs
live TLS handshakes, weather forecasts and current conditions, storm checks, IP geolocation,
translation, academic search, structured extraction, news retrieval, wallet-balance reads,
source-backed fact checks, Telegraph protocol knowledge, and conservative AI-text analysis.

- **Live service:** <https://miner-wine.vercel.app>
- **Explorer:** <https://explorer.telegraphprotocol.com/miners/livecert>
- **Submission miner ID:** `4433`
- **Active on-chain registration:** `402` — thirteen intents, active since 2026-08-31 21:46 UTC
- **Registered manifest:** [commit-pinned `miner.yaml`](https://github.com/Harshyadav442277/miner/blob/6b0d176048313cc6fec2788d18cb9ae24f3e2adc/track1-miner/miner.yaml)
- **Closing epoch of Track 1 (298, scored 2026-09-01 ~00:15 UTC):** seven rank-1, four rank-2 and
  two rank-4 intent results; normalized-ratio sum 10.125, the highest on the network that epoch
- **Latest epoch at the last check (305, 2026-09-03):** six rank-1, four rank-2, two rank-3 and one
  rank-6
- **Requests served at the 2026-08-31 submission audit:** 132
- **Verification on 2026-09-03:** 182 unit and 67 live tests passed; preflight 7/7; the production
  acceptance matrix passed with a 406 ms median and 1.11 s p95

The exact registered surface and reproducible verification commands are in the
[Track 1 review guide](track1-miner/README.md). The miner remains live through Track 3 as required.
To call it from your own application, routed, direct or over MCP, see
[docs/INTEGRATE_LIVECERT.md](docs/INTEGRATE_LIVECERT.md).

## Track 2 — fact-aware evaluation

The primary Track 2 contribution is a small, deterministic `no_std` scorer that evaluates typed
assertions—figures, units, identifiers, coordinates, and categorical verdicts—instead of relying
only on vocabulary proximity.

The strongest network receipt is `CRYPTO_PRICE` registration **1725**: it matched the incumbent's
14/15 fixture ordering and produced a larger separation margin (`0.7219137` versus `0.6295639`),
but was rejected because its ranking of real traffic disagreed with the incumbent. That result is
reported as evidence of the promotion gate's incumbent-agreement trade-off, not presented as an
active registration.

Three separate calibration experiments reached rank 1, and two still hold their slot (registry
re-read 2026-09-03). They demonstrate that a strictly increasing post-map can win the gate without
changing answer ordering; they are not used as the evaluator-accuracy claim.

| Registration | Intent | Status | Compiled module |
|---:|---|---|---|
| **2365** | `CRYPTO_PRICE` | held rank 1 on 2026-08-31 from 04:23 to 18:32 UTC, then retaken | [`crypto_price_v3.wasm`](https://github.com/Harshyadav442277/miner/blob/4c0f6d5db19f72c76031d90f1aa842a115d643a8/track2/calibration/dist/crypto_price_v3.wasm) |
| **2010** | `LANGUAGE_GENERATION` | active, rank 1 (re-verified 2026-09-03) | [`language_generation_m45.wasm`](https://github.com/Harshyadav442277/miner/blob/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_generation_m45.wasm) |
| **1882** | `TEXT_AUTHENTICITY_CHECK` | active, rank 1 (re-verified 2026-09-03) | [`text_authenticity_v2.wasm`](https://github.com/Harshyadav442277/miner/blob/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/text_authenticity_v2.wasm) |

Start with the [Track 2 submission brief](track2/SUBMISSION.md). The focused evaluator repository,
including source, compiled modules, CI, tests, and proof, is
[`telegraph-factscore`](https://github.com/Harshyadav442277/telegraph-factscore).

## Evidence boundary

- Live registry state and ranks are time-dependent; the values above were re-read on
  **2026-09-03**.
- Local or public-corpus benchmarks are labelled as offline evidence, not hidden-fixture results.
- Rejected and superseded registrations are identified as such.
- The Track 1/Track 2 overlap was disclosed to the organizers. The scorer contains no miner slug,
  wallet, response-template fingerprint, or special case for LiveCert.

Official criteria: [Telegraph Hackathon rules](https://hackathon.telegraphprotocol.com/rules).
