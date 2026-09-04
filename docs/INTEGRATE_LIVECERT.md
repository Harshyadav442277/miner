# Call LiveCert from a Track 3 app

LiveCert is miner **4433** (slug `livecert`) on `devnode.telegraphprotocol.com`, serving thirteen
intents from twelve keyless endpoints. Every call costs $0.01 USDC via x402 (Base Sepolia or Solana
Devnet), failed calls are not charged, and every answer is a `200` with the same shape:

```json
{ "verdict": "valid", "confidence": 1, "reason": "one paragraph that answers the question", "...": "fields" }
```

`reason` is the prose answer; the other fields carry the facts behind it. Nothing needs a key.

## Three ways in

**Routed** — let Telegraph's router classify the question. It lands on LiveCert whenever the
intent is one of ours and the router picks us by rank (70% of routed traffic goes to rank 1, 20% to
rank 2, 10% to rank 3):

```http
POST https://devnode.telegraphprotocol.com/engine/v1/ask
{ "query": "Is the TLS certificate for github.com valid, and who issued it?" }
```

**Direct** — name the miner. `payload` becomes the query string, because every endpoint is `GET`:

```http
POST https://devnode.telegraphprotocol.com/engine/v1/ask/4433
{ "method": "GET", "endpoint": "/ssl-check", "payload": { "domain": "github.com" } }
```

The dispatcher form the reference apps in `telegraph-usecases` use is the same call at
`POST https://devnode.telegraphprotocol.com/miner-dispatcher/v1/4433/ssl-check`.

**MCP** — run the Telegraph MCP server (`npx -y telegraph-protocol-mcp` with a funded burner key)
and the tools appear on their own within five minutes: `tg_livecert_ssl_check`,
`tg_livecert_storm_alert`, `tg_livecert_weather_forecast`, `tg_livecert_ip_geolocate`,
`tg_livecert_translate`, `tg_livecert_papers`, `tg_livecert_extract`, `tg_livecert_headlines`,
`tg_livecert_wallet_balance`, `tg_livecert_fact_check`, `tg_livecert_telegraph`,
`tg_livecert_ai_detect`.

## Endpoints

| Endpoint | Intent(s) | Required | Optional | Example payload |
|---|---|---|---|---|
| `/ssl-check` | SSL_VERIFICATION | `domain` | `query` | `{"domain":"expired.badssl.com"}` |
| `/storm-alert` | STORM_ALERT | one of `location` or `lat`+`lon` | `hours`, `query` | `{"location":"Chennai","hours":48}` |
| `/weather-forecast` | WEATHER_FORECAST, WEATHER_CHECK | one of `location` or `lat`+`lon` | `days`, `hours`, `query` | `{"location":"London","hours":0}` for the present hour |
| `/ip-geolocate` | IP_GEOLOCATION | `ip` | `query` | `{"ip":"8.8.8.8"}` |
| `/translate` | LANGUAGE_TRANSLATION | `text`, `target_language` | `source_language`, `query` | `{"text":"good morning","target_language":"fr"}` |
| `/papers` | ACADEMIC_SEARCH | `topic` | `query` | `{"topic":"transformer models for protein folding"}` |
| `/extract` | CONTENT_EXTRACTION | `text` | `query` | `{"text":"Reach us at support@example.com or call 555-0192.","query":"Extract the contact details"}` |
| `/headlines` | NEWS_HEADLINES | `topic` | `query` | `{"topic":"technology","query":"current technology headlines in Japan"}` |
| `/wallet-balance` | WALLET_BALANCE_CHECK | `address` | `query` | `{"address":"vitalik.eth"}` |
| `/fact-check` | FACT_CHECK | `claim` | `query` | `{"claim":"The Eiffel Tower is in Paris"}` |
| `/telegraph` | TELEGRAPH_KNOWLEDGE | `query` | — | `{"query":"How many miners serve SSL_VERIFICATION?"}` |
| `/ai-detect` | AI_TEXT_DETECTION | `text` | `query` | `{"text":"<the passage>"}` |

`query` is the user's original sentence, verbatim. Send it alongside the structured parameter when
you have both: the answer then addresses the question as asked. Every endpoint also accepts the
bare sentence in `query` alone and extracts the subject itself.

## What you get back, per intent

- **SSL**: `verdict` ∈ valid · expired · not_yet_valid · hostname_mismatch · self_signed ·
  untrusted · unreachable, from a live TLS handshake, with issuer, SANs, chain and days remaining.
- **Storm / weather**: wind, gusts, precipitation and a 0–1 risk for the asked window, hourly
  series included; `hours=0` is current conditions.
- **IP**: place, coordinates, network operator, special-range classification, Tor exit status.
- **Translation**: the bare translation, Google primary with MyMemory failover.
- **Papers / headlines**: five sourced items with authors, years and citation counts, or sources
  and dates. Headlines currently recognise these topics: technology, business, finance, science,
  health, sports, politics, entertainment, world, crypto, energy, climate, ai, plus a region
  (GAPS G68).
- **Extraction**: deterministic structured extraction from the supplied text; never invents.
  Contact details, entities, action items, "Month D, YYYY" dates, percentages and currency amounts
  (GAPS G69 lists the shapes it currently misses).
- **Wallet**: latest native balance from public JSON-RPC, ENS resolved, chain named.
- **Fact check**: an explicit refutation when the source states one, otherwise "the source does
  not settle this"; it never asserts a claim is true from a topical match.
- **Telegraph**: protocol facts, with live figures read from the node at request time.
- **AI text**: statistical authorship signals with confidence capped at 0.6, labelled as not proof.

## Verify any answer

Every paid call returns a `signal_hash`. `GET /engine/v1/signal/{hash}` returns the request, the
answer and the payload the hash was computed over. The miner's own source is public at
`https://github.com/Harshyadav442277/miner` (`track1-miner/`).

Real usage only: the hackathon rules disqualify artificial traffic, and so do we.
