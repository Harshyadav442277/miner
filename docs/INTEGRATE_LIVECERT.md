# Call LiveCert from an app

LiveCert is miner **4433** (slug `livecert`, registration 2750) on `devnode.telegraphprotocol.com`. It
serves **36 intents from 35 endpoints**, and callers need no API key. A call costs $0.01 USDC (`min_price_usdc: 10000`)
over Telegraph's payment rails. Every answer is HTTP 200 with at least:

```json
{ "verdict": "financial_data", "confidence": 0.9, "reason": "one paragraph that answers the question" }
```

`reason` is the answer in prose. `verdict` is a short machine label and `confidence` runs from 0 to 1.
An answer that could not be produced carries `confidence: 0` and an `error` code, and never a
made-up figure.

## Intents that Season II missions buy

From the fifteen mission pages at hackathon.telegraphprotocol.com/missions (counted 2026-10-10):

| Intent | Missions | Endpoint | Required | Optional |
|---|---:|---|---|---|
| WEB_SEARCH | 7 | `/web-search` | `query` | `topic` |
| FACT_CHECK | 4 | `/fact-check` | `claim` | `query` |
| FINANCIAL_DATA | 4 | `/financial` | — | `address`, `symbol`, `query` |
| CRYPTO_PRICE | 2 | `/crypto-price` | — | `symbol`, `query` |
| CONTENT_EXTRACTION | 2 | `/extract` | `text` | `query` |
| WEATHER_CHECK | 2 | `/weather-forecast` with `hours=0` | — | `location`, `lat`, `lon`, `days`, `hours`, `query` |
| EVENT_OUTCOME_RESOLUTION | 2 | `/event-outcome` | — | `event`, `query` |
| CROSS_CHAIN_STATE_VERIFY | 2 | `/cross-chain` | — | `tx_hash`, `source_chain`, `destination_chain`, `query` |
| TEXT_CLASSIFICATION | 2 | `/classify` | — | `text`, `labels`, `query` |
| STOCK_PRICE | 1 | `/stock-price` | — | `symbol`, `query` |
| GAS_PRICE | 1 | `/gas-price` | — | `chain`, `query` |
| SENTIMENT_ANALYSIS | 1 | `/sentiment` | — | `text`, `query` |
| LANGUAGE_TRANSLATION | 1 | `/translate` | `text`, `target_language` | `source_language`, `query` |

Every endpoint and its full parameter contract is in
[`track1-miner/miner.yaml`](../track1-miner/miner.yaml). `query` is the user's sentence, verbatim.
Send it alongside the structured parameters when you have both. Every endpoint also accepts the bare
sentence in `query` alone and extracts the subject itself.

## Fields, not just prose

**On the branch, not yet on production (as of 2026-10-11).** Production still trims most answers to
the three fields above and opens `reason` by repeating the question. The next release returns each
endpoint's whole result:

- **`/fact-check`**: `claim`, `verdict` (supported, contradicted, unverified or unknown), `source`,
  `source_url`, `evidence` (the source sentence) and `checked_at`. This route is already full on
  production.
- **`/financial`**: `data` with `symbol`, `name`, `currency`, `price`, `market_cap`, `volume_24h`
  (coins and tokens) or `volume` with `volume_unit` (shares), `fully_diluted_valuation`, the day or
  24-hour range, the 52-week range, `source` and `observed_at`. Unpublished figures are `null`. Answers
  from a 10-K return `fundamentals` instead.
- **`/web-search`**: `articles` (title, publisher, publication date) and `background` (one encyclopedia
  sentence, or null).
- **`/tx-lookup`**: `transaction` with `status`, `from`, `to`, `value_wei` and `value` (exact decimal
  strings), `symbol`, `block_number`, `block_hash`, `receipt_status` (null on pre-Byzantium blocks,
  which carry no status flag), `method`, `method_selector`, `contract_created`, `token_transfers`,
  `gas_used` and `fee_wei`.
- **`/storm-alert`**: `risk_score`, `max_wind_gust_kmh`, `max_wind_speed_kmh`, `max_precipitation_mm`,
  `thunderstorm`, `wind_direction`, `latitude`, `longitude` and `checked_at`. The prose opens with the
  graded answer, and says the grade comes from the forecast, not from an official warning.
- **Every other route** returns the fields its module computed, alongside the prose.

## Two ways in

**Routed:** Telegraph classifies the question and sends it to the top-ranked miners for the intent.
Rank 1 gets 70% of routed traffic, rank 2 20% and rank 3 10%:

```http
POST https://devnode.telegraphprotocol.com/engine/v1/ask
{ "query": "What is the market cap and 24h volume of Solana?" }
```

**Direct:** name the miner. `payload` becomes the query string, because every endpoint is `GET`:

```http
POST https://devnode.telegraphprotocol.com/engine/v1/ask/4433
{ "method": "GET", "endpoint": "/financial", "payload": { "query": "What is the market cap and 24h volume of Solana?" } }
```

## Verify any answer

Every paid call returns a `signal_hash`. `GET /engine/v1/signal/{hash}` returns the request, the answer
and the payload the hash was computed over. The miner's source is public at
`https://github.com/Harshyadav442277/miner` (`track1-miner/`).

Real usage only: the hackathon rules disqualify artificial traffic, and so do we.
