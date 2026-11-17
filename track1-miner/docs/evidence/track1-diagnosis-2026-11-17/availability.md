# LiveCert availability, latency and serving cost

Generated 2026-11-16T18:48:51.189Z from 45 sweeps, 2026-11-04T21:03:18.234Z to 2026-11-16T18:25:42.846Z, of https://miner-wine.vercel.app (tools/availability.mjs, run by the `uptime` workflow every 30 minutes).

- **Sweeps with every endpoint up:** 43/45 (95.56%)
- **Endpoint calls answered:** 1649/1653 (99.76%). Up = HTTP 200 with a non-empty `answer`.
- **Upstream cost per request: $0.** Every upstream is keyless or on a free key; the binding limits are listed per endpoint.

| Endpoint | Up | Availability | Licence refusals | p50 ms | p90 ms | Upstreams | Binding limit |
|---|---:|---:|---:|---:|---:|---|---|
| /ssl-check | 45/45 | 100.0% | 0 | 793 | 1063 | none (computed in the function) | — |
| /storm-alert | 45/45 | 100.0% | 0 | 655 | 819 | metno, nominatim | Nominatim policy: 1 request a second (places table answers most weather places first) |
| /papers | 45/45 | 100.0% | 0 | 875 | 3536 | doaj, openalex | OpenAlex free key: metered daily |
| /translate | 45/45 | 100.0% | 0 | 388 | 684 | groq | Groq free-tier key: per-minute and per-day quotas |
| /ip-geolocate | 19/19 | 100.0% | 7 | 268 | 736 | ip-api, ipinfo, ipwhois | — |
| /weather-forecast | 45/45 | 100.0% | 0 | 279 | 583 | metno, nominatim, nws | Nominatim policy: 1 request a second (places table answers most weather places first) |
| /extract | 45/45 | 100.0% | 0 | 87 | 157 | none (computed in the function) | — |
| /headlines | 19/19 | 100.0% | 7 | 227 | 584 | google-news | — |
| /wallet-balance | 45/45 | 100.0% | 0 | 192 | 280 | 1rpc, chain-rpcs, drpc, ensideas, flashbots, merkle, publicnode | — |
| /tx-lookup | 45/45 | 100.0% | 0 | 69 | 118 | 4byte, blockscout, chain-rpcs, dns-resolvers, doaj, drpc, merkle, ofac-list, openalex, openchain, publicnode, routescan | OpenAlex free key: metered daily |
| /cve | 45/45 | 100.0% | 0 | 204 | 6073 | cve, nvd, ofac-list | NVD free key: rate-limited |
| /news-search | 19/19 | 100.0% | 7 | 127 | 2371 | endoflife, google-news, groq, wikidata | Groq free-tier key: per-minute and per-day quotas |
| /convert | 45/45 | 100.0% | 0 | 441 | 653 | ecb, frankfurter | — |
| /gas-price | 45/45 | 100.0% | 0 | 109 | 141 | chain-rpcs, drpc, merkle, publicnode | — |
| /financial | 45/45 | 100.0% | 7 | 182 | 351 | bitstamp, coinbase, coingecko, ecb, frankfurter, sec, yahoo | — |
| /fraud-check | 45/45 | 100.0% | 0 | 72 | 117 | 4byte, chain-rpcs, dns-resolvers, doaj, drpc, merkle, ofac-list, openalex, openchain, publicnode | OpenAlex free key: metered daily |
| /token-holders | 45/45 | 100.0% | 0 | 375 | 1031 | blockscout, coingecko | — |
| /research | 45/45 | 100.0% | 0 | 836 | 6075 | clinicaltrials, ebi, wikipedia | — |
| /crypto-price | 45/45 | 100.0% | 0 | 99 | 228 | bitstamp, coinbase, ecb, frankfurter | — |
| /stock-price | 19/19 | 100.0% | 7 | 125 | 2268 | bitstamp, coinbase, coingecko, ecb, frankfurter, nasdaq, sec, yahoo | — |
| /cross-chain | 45/45 | 100.0% | 0 | 66 | 118 | 4byte, chain-rpcs, drpc, layerzero, merkle, openchain, publicnode | — |
| /event-outcome | 45/45 | 100.0% | 0 | 347 | 478 | groq, manifold, polymarket, wikidata | Groq free-tier key: per-minute and per-day quotas |
| /url-scan | 45/45 | 100.0% | 0 | 242 | 298 | dns-resolvers | — |
| /web-search | 45/45 | 100.0% | 7 | 315 | 1348 | bitstamp, clinicaltrials, coinbase, ebi, ecb, endoflife, frankfurter, google-news, groq, tech-docs, wikidata, wikipedia | Groq free-tier key: per-minute and per-day quotas |
| /sentiment | 45/45 | 100.0% | 0 | 304 | 374 | groq | Groq free-tier key: per-minute and per-day quotas |
| /classify | 45/45 | 100.0% | 0 | 354 | 472 | datamuse, groq | Groq free-tier key: per-minute and per-day quotas |
| /research-synthesis | 45/45 | 100.0% | 0 | 536 | 3886 | clinicaltrials, doaj, ebi, ncbi, openalex, wikipedia | OpenAlex free key: metered daily |
| /fact-check | 45/45 | 100.0% | 0 | 259 | 506 | groq, tavily, wikipedia | Groq free-tier key: per-minute and per-day quotas; Tavily paid key: not set in production, unused |
| /sanctions-screen | 45/45 | 100.0% | 0 | 3349 | 4184 | eu-sanctions, ofac, ofac-list, uk-sanctions, un-sanctions | — |
| /company-registry | 45/45 | 100.0% | 0 | 944 | 1266 | eu-sanctions, gleif, ofac, ofac-list, sec, uk-sanctions, un-sanctions | — |
| /sec-filings | 45/45 | 100.0% | 0 | 345 | 530 | eu-sanctions, federal-register, ofac, ofac-list, sec, uk-sanctions, un-sanctions | — |
| /transfer-verify | 45/45 | 100.0% | 0 | 69 | 112 | 4byte, blockscout, chain-rpcs, dns-resolvers, doaj, drpc, merkle, ofac-list, openalex, openchain, publicnode, routescan | OpenAlex free key: metered daily |
| /macro | 45/45 | 100.0% | 0 | 242 | 342 | bls, ecb, eurostat, nyfed, worldbank | — |
| /url-reputation | 45/45 | 100.0% | 0 | 118 | 158 | dns-resolvers | — |
| /answer | 45/45 | 100.0% | 0 | 923 | 1338 | groq, wikipedia | Groq free-tier key: per-minute and per-day quotas |
| /dns | 45/45 | 100.0% | 0 | 85 | 127 | dns-resolvers | — |
| /token-supply | 45/45 | 100.0% | 0 | 210 | 296 | 1rpc, blockscout, chain-rpcs, coingecko, drpc, ensideas, flashbots, merkle, publicnode | — |
| /keywords | 8/10 | 80.0% | 0 | 87 | 121 | none (computed in the function) | — |
| /vuln-triage | 8/10 | 80.0% | 0 | 250 | 778 | none (computed in the function) | — |
| /onchain-metric | 35/35 | 100.0% | 0 | 156 | 199 | 1rpc, blockscout, chain-rpcs, coingecko, drpc, ensideas, flashbots, merkle, publicnode | — |
| /chat | 9/9 | 100.0% | 0 | 767 | 2554 | endoflife, groq, wikidata | Groq free-tier key: per-minute and per-day quotas |
| /code-review | 9/9 | 100.0% | 0 | 590 | 722 | endoflife, groq, wikidata | Groq free-tier key: per-minute and per-day quotas |
| /contract-audit | 9/9 | 100.0% | 0 | 62 | 137 | endoflife, groq, wikidata | Groq free-tier key: per-minute and per-day quotas |
| /generate | 9/9 | 100.0% | 0 | 1404 | 1932 | endoflife, groq, wikidata | Groq free-tier key: per-minute and per-day quotas |
| /security-review | 1/1 | 100.0% | 0 | 67 | 67 | dns-resolvers, groq, osv | Groq free-tier key: per-minute and per-day quotas |

A licence refusal (`not_licensed`) passes the spot-check bar and counts as up; the refusals column shows it is not service.
Sweeps before 2026-11-05 did not record refusals, so their refusals read 0.
Latency is one call per endpoint per sweep from a GitHub-hosted runner, so it includes that runner's round trip to Vercel.
These are our own direct calls: availability evidence only, never use or demand.
