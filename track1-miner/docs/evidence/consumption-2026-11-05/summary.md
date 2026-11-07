# Paid requests routed to `livecert`, from the network's records

Generated 2026-11-05T09:45:38.725Z by `track1-miner/tools/consumption.mjs 2026-11-01T00:00:00Z <out-dir> livecert`.
Sources: `https://devnode.telegraphprotocol.com/daemon/api/questions` (5371 rows since 2026-11-01T00:00:00Z), `/engine/v1/signal/{hash}`, and
Sepolia receipts from `https://ethereum-sepolia-rpc.publicnode.com`.

- **Paid user requests:** 385, from 16 payer wallets, on 2026-11-01, 2026-11-02, 2026-11-03, 2026-11-04.
- **Chosen by the Engine's ranking:** 24, from 6 wallets. The rest named our miner.
- **x402 payment verified on Sepolia** (USDC from the payer to the Diamond): 341, $3.41 in total. 44 have no tx hash in their signal record.
- **Network's own internal traffic** routed to us in the same period: 6 rows (not counted above).
- **Answered with status `success`:** 384/385.

| Payer wallet | Requests | Distinct inputs | UTC dates | Ranked | x402 verified | Intents |
|---|---:|---:|---|---:|---:|---|
| `0x66fb1979cfcd581ca1542ecc18646b202d6a4a83` | 287 | 171 | 2026-11-01, 2026-11-02 | 0 | 287 | SANCTIONS_SCREENING_MATCH_GENERAL 287 |
| `0x104610ebb7a7a56b63a4f0c87ae40e722f38508a` | 55 | 48 | 2026-11-03 | 11 | 21 | FACT_CHECK_GENERAL 42, URL_SAFE_GENERAL 13 |
| `0xc4c153f4e957a7fb905f7ee366bac3d349875b90` | 9 | 4 | 2026-11-01, 2026-11-03, 2026-11-04 | 0 | 9 | SANCTIONS_SCREENING_MATCH_GENERAL 9 |
| `0x89eb73695af44980d217ae71abbc2f1337c43266` | 6 | 5 | 2026-11-03 | 0 | 6 | SENTIMENT_ANALYSIS_GENERAL 4, WEB_SEARCH_GENERAL 2 |
| `0xdbee317b429c8eadfce1825691cf10c7fa46b608` | 5 | 3 | 2026-11-03 | 0 | 5 | SANCTIONS_SCREENING_MATCH_GENERAL 4, NEWS_SEARCH_GENERAL 1 |
| `0x9b3c9555c28ca6cc1d07085d5fe81d9d229f0975` | 4 | 4 | 2026-11-04 | 4 | 4 | TOKEN_HOLDER_COUNT_GENERAL 4 |
| `0xf5987818ebbee812eb730b6a395d66e664412cf5` | 3 | 2 | 2026-11-02 | 0 | 3 | SANCTIONS_SCREENING_MATCH 3 |
| `0x10367c0bcf7a71aedbf55dfad4606a214dca8f4a` | 3 | 2 | 2026-11-04 | 3 | 0 | MACRO_ECONOMIC_INDICATOR_GENERAL 3 |
| `0x01e4f0ec437e85ac97dc36475f2ceac7ab604d85` | 2 | 1 | 2026-11-01 | 0 | 2 | CRYPTO_PRICE_USD 2 |
| `0x38452bab9725fc1449e7882c37bd9413c05d8cfc` | 2 | 2 | 2026-11-02, 2026-11-04 | 2 | 0 | WEATHER_CHECK_TEMPERATURE 1, CURRENCY_EXCHANGE_CONVERT 1 |
| `0x6cdcb33d0bf3508912a498016eac577cb9252f02` | 2 | 2 | 2026-11-03 | 0 | 2 | SANCTIONS_SCREENING_MATCH_GENERAL 2 |
| `0x3c80b31e71839201da7ecaa9479d869a435cc80d` | 2 | 2 | 2026-11-04 | 2 | 0 | MACRO_ECONOMIC_INDICATOR_GENERAL 2 |
| `0xcfcd7036ce739e617cc4c706acfd5e7fbfc6b18c` | 2 | 2 | 2026-11-04 | 2 | 0 | MACRO_ECONOMIC_INDICATOR_GENERAL 2 |
| `0x46d0c38a8f58e2ee1d6a9c2ccad6caa124fec77b` | 1 | 1 | 2026-11-03 | 0 | 1 | QUESTION_ANSWERING 1 |
| `0x9c2a13358f28f4f044e56f64dd8c62461fea89c4` | 1 | 1 | 2026-11-03 | 0 | 1 | SANCTIONS_SCREENING_MATCH_GENERAL 1 |
| `(no signal)` | 1 | 1 | 2026-11-03 | 0 | 0 | null 1 |

## Against the consumption rubric (10 points, Rules §06)

- **App users (4):** not claimable yet. No wallet is tied to a registered H2 mission app (GAPS G259).
- **Repeat use (2):** 6 wallets sent ≥ 3 distinct inputs; 3 used us on ≥ 2 UTC dates. They count only once a wallet is tied to a qualifying app.
- **Ranked routing (2):** 24 requests went through the ranking path.
- **Accounting (2):** every row has a signal record matching request, miner and intent; 341 payments are verified on-chain.

Our own availability sweeps and audits call the miner's URL directly, not the Engine, so none of them is in this feed.
