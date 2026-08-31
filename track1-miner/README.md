# Track 1 — LiveCert miner

LiveCert is an active Telegraph miner serving deterministic operational signals from
<https://miner-wine.vercel.app>.

## Submission identity

| Field | Value |
|---|---|
| **Miner ID for the submission form** | **`4433`** |
| Active on-chain registration | `389` |
| Slug | `livecert` |
| Author wallet | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Explorer | <https://explorer.telegraphprotocol.com/miners/livecert> |
| Production | <https://miner-wine.vercel.app> |
| YAML to upload | [`miner.yaml`](miner.yaml) |
| Registered YAML | [commit-pinned GitHub copy](https://github.com/Harshyadav442277/miner/blob/74ad4a19f41b922a5183dc26d6f405c8557dc9ba/track1-miner/miner.yaml) |

The portal calls the first value a **Miner ID**. Use `4433`; do not substitute registration `389`.
Registration `389` is included here so reviewers can reconcile the current on-chain manifest.

## Registered surface

| Intent | Endpoint | What is verified |
|---|---|---|
| `SSL_VERIFICATION` | `/ssl-check` | live certificate chain, hostname, issuer, validity, and expiry |
| `STORM_ALERT` | `/storm-alert` | severe-weather risk over the requested window |
| `WEATHER_FORECAST` | `/weather-forecast` | future condition, temperature, precipitation, and wind |
| `IP_GEOLOCATION` | `/ip-geolocate` | place, network operator, special ranges, Tor/abuse context |
| `LANGUAGE_TRANSLATION` | `/translate` | bare target-language translation with provider fallback |
| `ACADEMIC_SEARCH` | `/papers` | relevant papers via OpenAlex with requested dates/count/order |
| `AI_TEXT_DETECTION` | `/ai-detect` | conservative statistical authorship signals, never proof claims |
| `CONTENT_EXTRACTION` | `/extract` | deterministic structured extraction from supplied text |
| `NEWS_HEADLINES` | `/headlines` | current, sourced, count-aware headline lists |
| `WALLET_BALANCE_CHECK` | `/wallet-balance` | latest native balance from public EVM JSON-RPC |

All routes are keyless. The service uses timeouts and fallbacks and returns an honest shaped answer
instead of turning a recoverable upstream failure into a non-2xx response.

## Latest public result

Registry snapshot read on **2026-08-31**, epoch **297**:

| Rank | Intents |
|---:|---|
| **1** | `STORM_ALERT`, `AI_TEXT_DETECTION`, `CONTENT_EXTRACTION`, `NEWS_HEADLINES` |
| **2** | `SSL_VERIFICATION`, `IP_GEOLOCATION` |
| **3** | `WEATHER_FORECAST`, `LANGUAGE_TRANSLATION` |
| **4** | `ACADEMIC_SEARCH`, `WALLET_BALANCE_CHECK` |

At that audit the active registry reported **132 requests served**. Ranking is epoch-dependent; this
table is a dated result, not a promise about later epochs.

## Verify

```powershell
cd track1-miner/miner
npm.cmd test
cd ../..
node track1-miner/tools/verify-deploy.mjs https://miner-wine.vercel.app
```

Submission audit on 2026-08-31:

- full test suite: **237/237 passed**;
- production acceptance: **all checks passed**;
- production latency: **411 ms median**, **1.22 s p95**.

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
