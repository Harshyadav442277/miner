# Track 1 — LiveCert miner

LiveCert is an active Telegraph miner serving deterministic operational signals from
<https://miner-wine.vercel.app>.

## Submission identity

| Field | Value |
|---|---|
| **Miner ID for the submission form** | **`4433`** |
| Active on-chain registration | `402` — thirteen intents, active since 2026-08-31 21:46 UTC |
| Slug | `livecert` |
| Author wallet | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Explorer | <https://explorer.telegraphprotocol.com/miners/livecert> |
| Production | <https://miner-wine.vercel.app> |
| YAML to upload | [`miner.yaml`](miner.yaml) |
| Registered YAML | [commit-pinned GitHub copy](https://github.com/Harshyadav442277/miner/blob/6b0d176048313cc6fec2788d18cb9ae24f3e2adc/track1-miner/miner.yaml), SHA-256 `7538…7640` |

The portal calls the first value a **Miner ID**. Use `4433`; do not substitute registration `402`.
Registration `402` is included here so reviewers can reconcile the current on-chain manifest: the
`miner.yaml` in this folder hashes byte-for-byte to the registered `yaml_hash` (checked 2026-09-03).

## Registered surface

| Intent | Endpoint | What is verified |
|---|---|---|
| `SSL_VERIFICATION` | `/ssl-check` | live certificate chain, hostname, issuer, validity, and expiry |
| `STORM_ALERT` | `/storm-alert` | severe-weather risk over the requested window |
| `WEATHER_FORECAST` | `/weather-forecast` | future condition, temperature, precipitation, and wind |
| `WEATHER_CHECK` | `/weather-forecast` | the present hour (`hours=0`) or a window of up to 168 h, same endpoint |
| `IP_GEOLOCATION` | `/ip-geolocate` | place, network operator, special ranges, Tor/abuse context |
| `LANGUAGE_TRANSLATION` | `/translate` | bare target-language translation with provider fallback |
| `ACADEMIC_SEARCH` | `/papers` | relevant papers via OpenAlex with requested dates/count/order |
| `AI_TEXT_DETECTION` | `/ai-detect` | conservative statistical authorship signals, never proof claims |
| `CONTENT_EXTRACTION` | `/extract` | deterministic structured extraction from supplied text |
| `NEWS_HEADLINES` | `/headlines` | current, sourced, count-aware headline lists |
| `WALLET_BALANCE_CHECK` | `/wallet-balance` | latest native balance from public EVM JSON-RPC |
| `FACT_CHECK` | `/fact-check` | a claim against a citable encyclopaedic source, named and quoted; reports an explicit refutation or says the source does not settle it, never asserts truth from a topical match |
| `TELEGRAPH_KNOWLEDGE` | `/telegraph` | Telegraph itself: registration, the intent set, scoring, the Explorer; live figures read from the protocol at request time |

All routes are keyless. The service uses timeouts and fallbacks and returns an honest shaped answer
instead of turning a recoverable upstream failure into a non-2xx response.

## Latest public result

Epoch **298**, the last epoch to start inside the Track 1 window (scored 2026-09-01 ~00:15 UTC):

| Rank | Intents |
|---:|---|
| **1** | `ACADEMIC_SEARCH`, `CONTENT_EXTRACTION`, `LANGUAGE_TRANSLATION`, `NEWS_HEADLINES`, `STORM_ALERT`, `TELEGRAPH_KNOWLEDGE`, `WEATHER_FORECAST` |
| **2** | `AI_TEXT_DETECTION`, `FACT_CHECK`, `SSL_VERIFICATION`, `WEATHER_CHECK` |
| **4** | `IP_GEOLOCATION`, `WALLET_BALANCE_CHECK` |

Summed normalized ratio (our score ÷ the best score in each intent) that epoch: **10.125**, the
highest on the network, ahead of `chainsight-oracle` (7.77), `txlens` (7.34) and
`preflight-ssl-verification` (7.32).

Epoch **305**, read on **2026-09-03** during the Track 3 window:

| Rank | Intents |
|---:|---|
| **1** | `ACADEMIC_SEARCH`, `CONTENT_EXTRACTION`, `LANGUAGE_TRANSLATION`, `NEWS_HEADLINES`, `TELEGRAPH_KNOWLEDGE`, `WEATHER_FORECAST` |
| **2** | `AI_TEXT_DETECTION`, `FACT_CHECK`, `SSL_VERIFICATION`, `WEATHER_CHECK` |
| **3** | `IP_GEOLOCATION`, `STORM_ALERT` |
| **6** | `WALLET_BALANCE_CHECK` |

The 2026-08-31 submission audit recorded **132 requests served**. Ranking is epoch-dependent; these
tables are dated results, not a promise about later epochs. Every recorded epoch is in
[`docs/score-history.jsonl`](docs/score-history.jsonl).

## Verify

```powershell
cd track1-miner/miner
npm.cmd test
cd ../..
node track1-miner/tools/verify-deploy.mjs https://miner-wine.vercel.app
node track1-miner/tools/preflight.mjs https://miner-wine.vercel.app
```

Submission audit on 2026-08-31: 237/237 tests, production acceptance passed, 411 ms median and
1.22 s p95. Re-run on 2026-09-03:

- test suite: **182 unit + 67 live, all passed**;
- production acceptance: **all checks passed**; preflight **7/7 gates**;
- production latency: **406 ms median**, **1.11 s p95**.

## Source map

```text
miner.yaml       registered Telegraph manifest
miner/src/       endpoint implementations and router
miner/test/      unit, live-provider, and regression tests
tools/           production verification and operational checks
docs/            dated score and incident evidence
```

The service must remain live through Track 3; uptime and registry monitoring continue after the
Track 1 submission deadline.
