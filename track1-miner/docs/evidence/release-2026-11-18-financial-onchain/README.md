# Releases `4cb5924` and `1c2a564`, 2026-11-17/18: FINANCIAL_DATA market cap; ONCHAIN_METRIC `metric`

| | `4cb5924` | `1c2a564` |
|---|---|---|
| Production | `miner-bb4rttgjq` (`dpl_AuZPKbjHRVwW5qygrzcCv6QRx8Y3`) | `miner-ngeicaq66` (`dpl_Cp6AhS1YnvcaYgJ8Z474m6CeyJgh`), current |
| Rollback target | `miner-fudhplzsd` (`6499779`) | `miner-bb4rttgjq` (`4cb5924`) |
| Unit tests | 1054/1054 | 1055/1055 (`unit.txt`) |
| Preflight | interrupted on 2026-11-17 (session ended) | 6/7 (`preflight-1c2a564.txt`). The failure was a live stock-quote test (AAPL symbol null from the upstream); `stockprice.test.js` alone: 17/17 |

1. **FINANCIAL_DATA (G333):** every stock answer carries `market_cap_usd` (SEC shares outstanding × last price), and
   company or coin names in `symbol` resolve (`preview-probes-4cb5924.txt`). Epoch 8: 0.9938, **rank 1/16**
   (0.9155, rank 9 on Nov 16).
2. **ONCHAIN_METRIC (G335):** `/onchain-metric` reads the intent's `metric`. `address + block + metric=balance` now
   answers the native balance; before, it answered "No readable on-chain value was named"
   (`preview-probes-1c2a564.txt`). The node's empty calls need the input mappings in the unsigned YAML
   (`../yaml-for-signature-2026-11-18/`).
3. The request log also records `metric` and `block` values.
