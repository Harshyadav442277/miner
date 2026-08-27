# Track 1 — livecert miner

Everything in this folder is Track 1. Nothing outside it is.

**Live:** https://miner-wine.vercel.app · registration **236** · slug `livecert` · id `4433`
**Explorer:** https://explorer.telegraphprotocol.com/miners/livecert

---

## Layout

```
miner/          the service — Node, zero runtime dependencies, TypeScript
miner.yaml      the registered manifest (public, pinned to IPFS, hashed on-chain)
tools/          measurement and operations
docs/           Track 1 analysis and history
```

## State

| | |
|---|---|
| Registered intents | **4** — SSL_VERIFICATION, STORM_ALERT, WEATHER_FORECAST, IP_GEOLOCATION |
| Built and deployed | **9** — the above plus CONTENT_EXTRACTION, NEWS_HEADLINES, LANGUAGE_TRANSLATION, CVE_LOOKUP, ACADEMIC_SEARCH |
| Pending | one `updateMiner` signature registers the other five |
| Tests | 103 passing |

The five unregistered intents are built, live, and tested — the endpoints answer today. They just
are not declared on-chain yet, so no traffic is routed to them.

## Endpoints

| Path | Intent | Source |
|---|---|---|
| `/ssl-check` | SSL_VERIFICATION | live TLS handshake, no upstream |
| `/storm-alert` | STORM_ALERT | Open-Meteo |
| `/weather-forecast` | WEATHER_FORECAST | Open-Meteo |
| `/ip-geolocate` | IP_GEOLOCATION | ipapi + BigDataCloud |
| `/extract` | CONTENT_EXTRACTION | none — deterministic parsing |
| `/headlines` | NEWS_HEADLINES | Google News RSS |
| `/translate` | LANGUAGE_TRANSLATION | MyMemory |
| `/cve` | CVE_LOOKUP | NIST NVD |
| `/papers` | ACADEMIC_SEARCH | OpenAlex |

Every source is free and keyless. There is no API key anywhere in this miner, which is why
`auth.type` is `none` and why no upstream quota can revoke us.

## Tools

```bash
# acceptance — run before every registration, exits non-zero on any failure
node tools/verify-deploy.mjs https://miner-wine.vercel.app

# replay real paid questions from the public feed
node tools/replay-corpus.mjs
node tools/replay-corpus.mjs --refresh    # pull new questions first

# score our live answers with an intent's real champion WASM
node tools/bench-champion.mjs --wasm champ.wasm --bench ssl_bench.json --path ssl-check

# record this epoch's scores (idempotent; the hourly workflow runs it)
node tools/record-scores.mjs

# watch uptime and routing revocation
node tools/watch.mjs --base-url https://miner-wine.vercel.app --registration-id 236 --once
```

`tools/score-sim.mjs` is **superseded and should not be used** — its model of the scorer was
disproven. Use `bench-champion.mjs` against the real binaries instead.

## What was learned the hard way

Full history in [docs/EPOCH_284.md](docs/EPOCH_284.md). The parts that would cost another day:

- **Any non-2xx scores 0.** The engine stores an empty answer and the scorer never reads the body.
- **The engine sends only declared parameters**, not the question. Declare `q`/`query`/`lat`/`lon`.
- **There is no response size limit** — that theory was wrong; conversion fails ~6.7% of the time at
  every size, to every miner.
- **Echo the identifiers the question used.** Answering "San Francisco" to a question about
  `latitude 37.7749` scored 0.0068; including the coordinates scored 0.0135.
- **Answer every clause.** Naming the ISP in a geolocation answer moved it 0.0103 → 0.9936.
- **Never measure a hand-written candidate.** It leaks the ground truth. Measure the deployed answer.

## Registering an update

1. `node tools/verify-deploy.mjs <url>` must exit 0
2. `sha256sum miner.yaml` — SHA-256, **not keccak256**
3. integrate.telegraphprotocol.com → Connect → Import & Upload → `miner.yaml` →
   **REQUIRES API KEY toggle off** → Validate → sign
4. Capture the new `registrationId`; every lookup uses it, never the slug

`updateMiner` issues a new `registrationId` and `intentId`. The operator signs; no agent does.
