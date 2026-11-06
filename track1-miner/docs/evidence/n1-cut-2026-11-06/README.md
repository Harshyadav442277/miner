# N1 cut — 2026-11-06 ~22:10 UTC (Nov 7 03:40 IST)

Pending `updateMiner` manifest for registration 4829. It removes every intent that refuses all its requests, and
it states plainly what FINANCIAL_DATA and WEB_SEARCH do not do. **Not signed and not sandbox-tested.** The owner
signs; Claude never touches the wallet.

**Why now.** On 2026-11-06, Ahmed Ali (Telegraph CTO) wrote in a Discord DM (owner's screenshot) that registering
intents "without actually supporting their functionality won't help" and that miners which fail "won't qualify
for those claims". The live Rules page, re-read 2026-11-06 ~22:00 UTC, says "Each claimed Intent must pass its own
relevant tests". The audit replay of 2026-11-04 found four intents refusing every request on licence.

## What changes against the registered YAML

Registered: `2e8d1cf` `track1-miner/miner.yaml`, SHA-256 `84dd6ed3…6680` (devnode `yaml_hash`, read 2026-11-06).

| Change | Intents | Evidence |
|---|---|---|
| Removed | STOCK_PRICE, NEWS_HEADLINES, NEWS_SEARCH, IP_GEOLOCATION | `../audit-replay-2026-11-04/` rows 16–19, 33–39 and 101–104: all refused `not_licensed`; `src/sources.ts` marks Yahoo, Nasdaq, Google News, ip-api, ipinfo and ipwho.is `barred` |
| Added (already in the pending YAML from 2026-10-26/27) | DNS_RECORD_LOOKUP, TOKEN_TOTAL_SUPPLY_VERIFY, KEYWORD_EXTRACTION, VULNERABILITY_TRIAGE | Smoke probes below; no sourced audit yet |
| Description narrowed | FINANCIAL_DATA | Its first example ("Solana's market cap") was refused on production; it now claims SEC 10-K figures only |
| Description corrected | WEB_SEARCH (G250) | It claimed Google News, which is barred in code; it now names the sources it actually reads |
| Top description | — | 40 → 36 intents; no IP geolocation, news search or listed-company market data |

`supported_intents` stays at 36 (4 out, 4 in). The four retired routes are still served, because 4829 points at them
until the update is signed; `test/manifest.test.ts` names them in `RETIRED`. Delete their code after the signature.

## Checks run

| Check | Result |
|---|---|
| `manifest-diff.mjs` registered vs pending, `--allow-removed` the 4 paths and 4 intents (run with `MSYS_NO_PATHCONV=1`, or Git Bash rewrites `/headlines`) | **PASS** — nothing else lost or altered in path, method, intents or params |
| Unit tests, export of the tree at `C:\Users\hyada\tg-deploy\n1-cut` | **907/907** |
| Production probes, ~22:05 UTC (`miner-wine.vercel.app`, `192aecc`) | below |

| Route | Question | Answer (start) | Checked against |
|---|---|---|---|
| /financial | "What is Solana's market cap and 24-hour volume?" | `not_licensed` (CoinGecko) | — this is why the description changed |
| /financial | "Apple's revenue and P/E from its 10-K" | revenue $478.83 billion, FY ending 26 Sep 2026; **P/E silently dropped** | not sourced |
| /financial | "Microsoft's net income in its latest 10-K" | $133.75 billion, FY ending 30 Jun 2026 | not sourced |
| /web-search | "latest news on the Fed's rate decision" | `not_licensed` | — |
| /web-search | "Who is the CEO of OpenAI?" | Sam Altman | general knowledge only |
| /dns | A records for example.com | 104.20.23.154, 172.66.147.243 | Cloudflare DoH, same two |
| /dns | MX for gmail.com | 5 records, priority 5–40 | not sourced |
| /token-supply | USDC on Ethereum | 46,223,398,400.21 at block 26358699 | not sourced |
| /token-supply | DAI by address | 4,485,311,990.63 at block 26358699 | not sourced |
| /keywords | a 16-word Fed sentence | "federal reserve held", "held interest rates", … | weak phrase boundaries (G214) |
| /vuln-triage | Log4Shell, WebP, BlueKeep | Log4Shell, BlueKeep, WebP; all three on CISA KEV | KEV dates not re-read |

## Before the owner signs

1. Sourced audit of the four added intents, 5 questions each, against a primary source (TASKS N1).
2. Commit, push, and use the pushed commit's raw URL and the SHA-256 of the committed (LF) file.
3. Validate and sandbox-test on anjoman.ai/dashboard/earn (owner's session; CLAUDE.md hard rule 3).
