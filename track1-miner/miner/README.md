# livecert — six operational-signal endpoints

A zero-runtime-dependency Telegraph miner. Active registration 260 routes SSL, Storm,
Weather, IP Geolocation, Translation, and Academic Search.

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
| `/weather-forecast` | `WEATHER_FORECAST` |
| `/ip-geolocate` | `IP_GEOLOCATION` |
| `/translate` | `LANGUAGE_TRANSLATION` |
| `/papers` | `ACADEMIC_SEARCH` |

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

**111 tests** cover the six endpoints, including target parsing, every SSL verdict path,
storm/weather windows and coordinates, IP geolocation, Translation, and Academic Search.

Some suites make live calls (badssl.com, Open-Meteo, GitHub TLS) and are deliberately not mocked —
they are what actually proves the verdict logic. The cost is that an upstream hiccup can make the
run red without anything being wrong with the code; re-run before investigating.

## Deploy

```bash
fly launch --no-deploy --copy-config --name livecert
fly deploy
```

`min_machines_running = 1` in `fly.toml` is load-bearing: spot checks run every ~20s and
routing is revoked on a 20% score drop, so a cold start reads as a failure.

## Design notes

- **Zero runtime dependencies** — Node standard library only. Nothing to break, small image, fast start.
- **60s bounded cache** — absorbs repeated validation traffic and upstream jitter.
- **8s handshake timeout** — a slow host fails fast as `unreachable` rather than hanging a spot check.
- **Private-by-default logs** — query values are never logged; `LOG_QUERY=on` records parameter names only.
- **Translation failover** — MyMemory remains primary; a second provider covers shared-egress 429s.
