# livecert — twelve endpoints, thirteen intents

A zero-runtime-dependency Telegraph miner. Active registration 402 routes thirteen intents
through the twelve endpoints below.

## Why a handshake, and not a CT lookup

The incumbent `certspotter-cert-verification` miner answers from certificate-transparency
logs. CT tells you what was **issued** for a domain; it cannot tell you what the server has
**deployed**. A host still serving an expired certificate while a fresh one sits in CT is
exactly the case this intent is asked about, and only a live handshake sees it.

## Endpoints

| Path | Intent |
|---|---|
| `/ssl-check` | `SSL_VERIFICATION` |
| `/storm-alert` | `STORM_ALERT` |
| `/weather-forecast` | `WEATHER_FORECAST`, `WEATHER_CHECK` |
| `/ip-geolocate` | `IP_GEOLOCATION` |
| `/translate` | `LANGUAGE_TRANSLATION` |
| `/papers` | `ACADEMIC_SEARCH` |
| `/extract` | `CONTENT_EXTRACTION` |
| `/headlines` | `NEWS_HEADLINES` |
| `/wallet-balance` | `WALLET_BALANCE_CHECK` |
| `/fact-check` | `FACT_CHECK` |
| `/telegraph` | `TELEGRAPH_KNOWLEDGE` |
| `/ai-detect` | `AI_TEXT_DETECTION` |

`GET /health` is a liveness probe that does no outbound work. See `../miner.yaml` for
the complete input and output contract.

### Verdicts

`valid` · `expired` · `not_yet_valid` · `hostname_mismatch` · `self_signed` · `untrusted` · `unreachable`

`self_signed` means the leaf itself is self-signed; a self-signed *root* in the chain is
`untrusted`, which is a different fact about a different certificate.

## Run locally

```bash
npm install && npm run build && npm start
curl "http://127.0.0.1:8080/ssl-check?domain=expired.badssl.com"
```

## Test

```bash
npm test
```

**182 unit tests and 67 live tests** (`npm run test:unit`, `npm run test:live`) cover every
endpoint: target parsing, every SSL verdict path, storm/weather windows and coordinates, IP
geolocation, translation, academic search, extraction, headlines, wallet balances, fact checks,
protocol knowledge, AI-text signals, the engine's parameter shapes, and the rule that no request
may produce a non-2xx.

Some suites make live calls (badssl.com, Open-Meteo, GitHub TLS) and are deliberately not mocked —
they are what actually proves the verdict logic. The cost is that an upstream hiccup can make the
run red without anything being wrong with the code; re-run before investigating.

## Deploy

Production is Vercel (`https://miner-wine.vercel.app`). **Pushing to `main` does not deploy**
(GAPS G22); only this does, run from this directory:

```bash
vercel --prod --scope wukong4
node ../tools/preflight.mjs https://miner-wine.vercel.app
```

`api/index.ts` and `src/server.ts` share `src/handler.ts`, so the serverless and local targets
cannot diverge. `vercel.json` caps a function at 15 s and the router's 11 s watchdog answers
honestly before that, because a platform 504 scores exactly like a 400. Telegraph's ~20 s spot
checks keep the function warm once registered.

## Design notes

- **Zero runtime dependencies** — Node standard library only. Nothing to break, small image, fast start.
- **60s bounded cache** — absorbs repeated validation traffic and upstream jitter.
- **8s handshake timeout** — a slow host fails fast as `unreachable` rather than hanging a spot check.
- **Private-by-default logs** — query values are never logged; `LOG_QUERY=on` records parameter names only.
- **Translation failover** — Google is primary, MyMemory the failover; the answer is the bare translation.
