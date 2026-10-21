# Track 1 — LiveCert miner

LiveCert answers 36 Telegraph intents from <https://miner-wine.vercel.app>. Every answer is read from
a named primary source at request time, carries `checked_at`, and says so when the source could not
answer, rather than filling the gap.

## Identity

| Field | Value |
|---|---|
| Slug | `livecert` |
| Miner ID (catalog id, used by the submission form) | `4433` — not a registration id |
| Active registration | `4829` — 36 intents, `active`, re-read 2026-10-21 |
| Author wallet | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Production | <https://miner-wine.vercel.app> |
| Manifest | [`miner.yaml`](miner.yaml); registered copy pinned at commit `2e8d1cf`, SHA-256 `0x84dd…6680` |

Look a registration up by id (`/api/miners/4829`), never by slug or catalog id: `/api/miners/4433`
returns a different miner.

## Registered surface

| Intents | Endpoint |
|---|---|
| `SSL_VERIFICATION` | `/ssl-check` |
| `STORM_ALERT` | `/storm-alert` |
| `WEATHER_FORECAST`, `WEATHER_CHECK` | `/weather-forecast` |
| `IP_GEOLOCATION` | `/ip-geolocate` |
| `LANGUAGE_TRANSLATION` | `/translate` |
| `ACADEMIC_SEARCH` | `/papers` |
| `CONTENT_EXTRACTION` | `/extract` |
| `NEWS_HEADLINES` | `/headlines` |
| `NEWS_SEARCH` | `/news-search` |
| `WEB_SEARCH` | `/web-search` |
| `FACT_CHECK` | `/fact-check` |
| `QUESTION_ANSWERING` | `/answer` |
| `RESEARCH_QUERY` | `/research` |
| `RESEARCH_SYNTHESIS` | `/research-synthesis` |
| `SENTIMENT_ANALYSIS` | `/sentiment` |
| `TEXT_CLASSIFICATION` | `/classify` |
| `WALLET_BALANCE_CHECK` | `/wallet-balance` |
| `ONCHAIN_TX_LOOKUP` | `/tx-lookup` |
| `CRYPTO_TRANSFER_VERIFY` | `/transfer-verify` |
| `TOKEN_HOLDER_COUNT` | `/token-holders` |
| `GAS_PRICE` | `/gas-price` |
| `CROSS_CHAIN_STATE_VERIFY` | `/cross-chain` |
| `CRYPTO_PRICE` | `/crypto-price` |
| `STOCK_PRICE` | `/stock-price` |
| `FINANCIAL_DATA` | `/financial` |
| `CURRENCY_EXCHANGE` | `/convert` |
| `MACRO_ECONOMIC_INDICATOR` | `/macro` |
| `EVENT_OUTCOME_RESOLUTION` | `/event-outcome` |
| `CVE_LOOKUP` | `/cve` |
| `URL_SCAN` | `/url-scan` |
| `URL_SAFE` | `/url-reputation` |
| `FRAUD_DETECTION` | `/fraud-check` |
| `SANCTIONS_SCREENING_MATCH` | `/sanctions-screen` |
| `CORPORATE_REGISTRY_LOOKUP` | `/company-registry` |
| `REGULATORY_FILING_MONITOR` | `/sec-filings` |

Each endpoint's description in `miner.yaml` opens with example questions and the fields it returns.
Recipes for calling it routed, direct or over MCP: [../docs/INTEGRATE_LIVECERT.md](../docs/INTEGRATE_LIVECERT.md).

## Sources and licences

Season II answers are sold, so each source's terms were read for commercial use (GAPS G186, G189,
G194–G197). Moved to licensed sources on 2026-10-18: weather and storm to MET Norway (CC BY 4.0),
geocoding to OpenStreetMap's Nominatim (ODbL, credited in the answer) with the largest cities served
from a built-in Wikidata table (CC0), translation to open-weight models on Groq. DeFiLlama TVL was
dropped as unlicensed.

**Still on sources whose terms bar commercial use, pending the owner's decision:** Google News RSS
(`/web-search`, `/news-search`, `/headlines`) and Yahoo (`/stock-price`, the listed-company half of
`/financial`). URLhaus "may require" a subscription for commercial use. These are open, not settled.

Model-phrased answers (`/sentiment`, `/classify`, `/answer`, `/translate`) fall back to keyless rule
paths, or to an outage report, when the model does not answer in time.

## Verify

```powershell
cd track1-miner/miner
npm.cmd run test:unit
cd ../..
node track1-miner/tools/verify-deploy.mjs https://miner-wine.vercel.app
node track1-miner/tools/preflight.mjs https://miner-wine.vercel.app
```

Run the live suite (`npm.cmd run test:live`) one file at a time: in parallel it exceeds Nominatim's
one request per second and gets HTTP 429 (G196). The latest release's gate output is under
`docs/evidence/release-2026-10-18/`.

## Source map

```text
miner.yaml       registered Telegraph manifest
miner/src/       endpoint implementations and router
miner/test/      unit, live-provider and regression tests
tools/           deploy gates, manifest checks, the places-table generator
docs/            Season II plan, signing notes and dated evidence
```

Season I's rank reports and benches were removed on 2026-10-17; they are in git history.
