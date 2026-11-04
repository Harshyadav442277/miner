# Call LiveCert from an app

LiveCert is miner **4433** (slug `livecert`, registration 4829) on `devnode.telegraphprotocol.com`.
Callers need no API key. A call costs $0.01 USDC (`min_price_usdc: 10000`), paid per request over x402
in Telegraph's test USDC on **Ethereum Sepolia** (`0xcc194e1a843B658526D0D5C431f670028582Ae17`, from the
anjoman.ai faucet), or from escrow. Payment details: https://anjoman.ai/docs/using/x402-inference (read
2026-11-04, page updated 2026-11-01).

**State on 2026-11-04.** Registration 4829 declares **36 intents**. On devnode's epoch 2013, 32 are scored:
3 at rank 1, 13 in the top 3. Some intents answer every request, or some questions, with `error:
"not_licensed"`, because their only source forbids resale: STOCK_PRICE, NEWS_HEADLINES, NEWS_SEARCH,
IP_GEOLOCATION, news questions under WEB_SEARCH, and listed-company prices under FINANCIAL_DATA. They are
marked *refuses* below. Do not buy them for those questions.

## Machine-readable description

[`docs/openapi.json`](openapi.json) is an OpenAPI 3.1 description of all 35 endpoints and the 36 intents they
serve: every query parameter, the shared answer fields and the receipt. It is generated from `miner.yaml` by
`track1-miner/tools/openapi.py`. Each route's own fields are typed from a real production answer and marked
`x-observed`: they describe one answer, not every case. Load the file into any OpenAPI client generator.

## Every answer has the same shape

HTTP 200, with the answer first and the values as fields:

```json
{
  "answer": "Potential match: \"Kim Jong Un\" matches KIM, Jong Un on the OFAC SDN list (DPRK3, individual, born 1984, reference 20157), score 1.",
  "verdict": "match",
  "confidence": 0.97,
  "matches": [{ "list": "OFAC SDN", "id": "20157", "score": 1, "url": "https://sanctionssearch.ofac.treas.gov/Details.aspx?id=20157" }],
  "reason": "the full sentence-by-sentence answer, with its sources",
  "checked_at": "2026-10-14T05:20:11.000Z"
}
```

- `answer` is one sentence an app can show as is.
- `verdict` is a machine label.
- `confidence` runs from 0 to 1. Today it is mostly a fixed level per intent that says how direct the source is:
  1.0 only for a direct read of the authoritative record of exactly what was asked (a TLS handshake, an EDGAR
  filing, an exact-title paper), lower for a model's output or a ranked search, and 0 when nothing was answered.
  It is not yet a calibrated probability. On the 2026-10-21 audit, answers at 0.9–1.0 were right 72–79% of the
  time (`track1-miner/docs/evidence/calibration-2026-10-26/`).
- `reason` is the full answer, naming its sources.
- `checked_at` is when the answer was computed.
- `receipt`, last, lists the upstream requests the miner actually made for this answer. Each entry has the URL
  with credentials redacted, the method, the HTTP status, the time and the duration. A TLS handshake or DNS read
  appears as `tls://` or `dns://` with its result. The receipt also has an `id`, the answering `deployment`, and
  `from_cache` (true when the answer came from the one-minute response cache, with the reads that first produced
  it). An empty list carries a `note`: the answer used data the miner already held, and its own source fields
  name where that came from.

An answer that could not be produced carries `confidence: 0` and an `error` code (`upstream_unavailable`,
`no_subject`, `list_unavailable`, `not_licensed`, …), and never a made-up figure.

## Intents that Season II missions buy

Mission counts are from the fifteen mission pages at hackathon.telegraphprotocol.com/missions (counted
2026-10-10).

| Intent | Missions | Endpoint | Send | Key fields back |
|---|---:|---|---|---|
| WEB_SEARCH (*refuses news questions*) | 7 | `/web-search` | `query` | `articles` (title, publisher, date), `background` |
| SANCTIONS_SCREENING_MATCH | 5 | `/sanctions-screen` | `name` or `wallet`, `query` | `matches` (list, id, matched name, programmes, score, birth-year check, OFAC URL), `lists_checked` with editions, `lists_not_checked` |
| CORPORATE_REGISTRY_LOOKUP | 5 | `/company-registry` | `company`, `company_number`, `query` | `entity_status`, `company_number`, `register`, `registered_address`, `registered_agent`, `incorporated`, `direct_parent`, `ultimate_parent`, `lei`, `us_filer` |
| QUESTION_ANSWERING | 5 | `/answer` | `query`, optional `context` | `citations` (title, URL), `method` (model-phrased or extracted) |
| FACT_CHECK | 4 | `/fact-check` | `claim`, `query` | `verdict`, `source_url`, `evidence` |
| FINANCIAL_DATA (*refuses listed-company prices*) | 4 | `/financial` | `symbol` or `address`, `query` | `data` (price, market cap, volume, ranges), `fundamentals` from the 10-K |
| REGULATORY_FILING_MONITOR | 4 | `/sec-filings` | `company`, `form`, `query` | `filing` (form, filed, accepted, accession, period, 8-K items, URL), `figures` from its XBRL, `prior_year_figures` |
| CRYPTO_TRANSFER_VERIFY | 3 | `/transfer-verify` | `hash`, `chain` | `transaction` (status, from, to, value, block, `confirmations`, `fee_wei`, `base_fee_wei`, `base_fee_burned`) |
| MACRO_ECONOMIC_INDICATOR | 3 | `/macro` | `indicator`, `country`, `query` | `indicators` (value, `value_high` for a range, period, frequency, series, source) |
| URL_SAFE | 2 | `/url-reputation` | `url` | `listed`, `sources` (each source and its result), `flagged_by`, `checks` |
| CRYPTO_PRICE | 2 | `/crypto-price` | `symbol`, `query` | `price`, `quote`, `price_at`, `source` |
| CONTENT_EXTRACTION | 2 | `/extract` | `text` | `extracted` |
| WEATHER_CHECK | 2 | `/weather-forecast` with `hours=0` | `location` | temperatures, precipitation, wind |
| EVENT_OUTCOME_RESOLUTION | 2 | `/event-outcome` | `event` | `outcome`, `winner`, `market`, `venue`, `closes_at` |
| CROSS_CHAIN_STATE_VERIFY | 2 | `/cross-chain` | `tx_hash` | `message` (chains, sender, receiver, both transactions) |
| TEXT_CLASSIFICATION | 2 | `/classify` | `text`, `labels` | `label` |
| STOCK_PRICE (*refuses every request*) | 1 | `/stock-price` | `symbol` | `price`, `currency`, `exchange`, `market_open` |
| GAS_PRICE | 1 | `/gas-price` | `chain` | Gwei, base and priority fee, block |
| SENTIMENT_ANALYSIS | 1 | `/sentiment` | `text` | `positive_words`, `negative_words`, `tones` |
| LANGUAGE_TRANSLATION | 1 | `/translate` | `text`, `target_language` | `translation`, `source_text`, `target_language`, `target_code` |

Every endpoint and its parameters are in [`track1-miner/miner.yaml`](../track1-miner/miner.yaml).
`query` is the user's sentence, verbatim. Send it alongside the structured parameters when you have
both. Every endpoint also accepts the bare sentence in `query` alone and reads the subject from it.

## Recipes for the mission intents

Each is a direct call (below). Every example was answered by production on 2026-10-14; the 154-question audit
replay of 2026-11-04 is in `track1-miner/docs/evidence/audit-replay-2026-11-04/`.

```jsonc
// Sanctions: screen a counterparty before onboarding it
{ "method": "GET", "endpoint": "/sanctions-screen", "payload": { "name": "Ivan Petrov", "query": "Screen Ivan Petrov, DOB 1974, against OFAC and UN lists" } }
// Company register: status, number, registered agent
{ "method": "GET", "endpoint": "/company-registry", "payload": { "query": "What is the incorporation status and registered agent for Tesla, Inc.?" } }
// SEC filings: has the 10-Q landed, and what does it report
{ "method": "GET", "endpoint": "/sec-filings", "payload": { "company": "TSLA", "form": "10-Q" } }
// Transfer verification: confirmations and the burned fee
{ "method": "GET", "endpoint": "/transfer-verify", "payload": { "hash": "0x…", "chain": "ethereum" } }
// Macro: the latest print from the publisher
{ "method": "GET", "endpoint": "/macro", "payload": { "query": "Latest US CPI year over year and the fed funds target range" } }
// URL reputation: which threat sources list it
{ "method": "GET", "endpoint": "/url-reputation", "payload": { "url": "https://login-secure-update.example.com" } }
// Cited answer from your own document
{ "method": "GET", "endpoint": "/answer", "payload": { "context": "…your passage…", "query": "When did the war end?" } }
```

What these do not cover, by design:
- Sanctions screening reads OFAC SDN and the UN list, not the EU or UK lists, and every answer says so.
- The company register has no directors or beneficial owners.
- SEC filings are EDGAR only.
- Policy rates are for the US and the euro area only.

## Two ways in

**Routed:** Telegraph classifies the question and sends it to the top-ranked miners for the intent.
Rank 1 gets 70% of routed traffic, rank 2 20% and rank 3 10%:

```http
POST https://devnode.telegraphprotocol.com/engine/v1/ask
{ "query": "What is the market cap and 24h volume of Solana?" }
```

**Direct:** name the miner. `payload` becomes the query string, because every endpoint is `GET`. Under the
Season II rules a direct request can earn use, repeat-use and accounting evidence, but not ranked-routing points:

```http
POST https://devnode.telegraphprotocol.com/engine/v1/ask/4433
{ "method": "GET", "endpoint": "/financial", "payload": { "query": "What is the market cap and 24h volume of Solana?" } }
```

## Verify any answer

Every paid call returns a `signal_hash`. `GET /engine/v1/signal/{hash}` returns the request, the answer
and the payload the hash was computed over. To check the answer itself, re-run the requests in its `receipt` and
compare what the sources say now. The miner's source is public at
`https://github.com/Harshyadav442277/miner` (`track1-miner/`).

`track1-miner/tools/verify-answer.mjs` does that on your own machine.

```bash
node track1-miner/tools/verify-answer.mjs "https://miner-wine.vercel.app/vuln-triage?cves=CVE-2023-4863,CVE-2024-3094"
node track1-miner/tools/verify-answer.mjs saved-answer.json
```

**What it does.** It re-fetches the receipt's GET requests and lists every value in the answer that one of those
sources still states, with the source host.

**What a ✓ means.** The value appears in that source as stated. This is a text match, not a parse.

**What it cannot check:**
- **Values read by POST.** JSON-RPC calls are not re-run, because a receipt keeps no request bodies.
- **Values the miner derived,** such as a supply net of burns or a version range.
- **Values that have changed since,** such as prices and TTLs.
- **Small whole numbers and short words.** They are listed as unchecked, because they appear in almost any document.

A catalog the miner already held in memory, such as CISA KEV for `/vuln-triage`, appears in the receipt with
`status: null` and a `result` saying when it was read.

Real usage only: the hackathon rules disqualify artificial traffic, and so do we.
