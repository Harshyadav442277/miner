# Season I Track 1 winners, taken apart: TxLens, ChainSight, OathCast

Written 2026-10-11 ~05:50 UTC (11:20 IST). This follows [S1_LOSS_ANALYSIS_2026-10-11.md](S1_LOSS_ANALYSIS_2026-10-11.md),
which explains the loss from aggregate numbers. This document looks at the three winners themselves: what
they answer, how they are built, and what is worth copying. Evidence:
[evidence/s1-winners-2026-10-11/](evidence/s1-winners-2026-10-11/).

## How it was checked

- **Live probes, 2026-10-11 05:32 UTC.** The same 41 requests were sent to TxLens, ChainSight and LiveCert
  production: transaction, price, storm, forecast, SSL, fact check, web search and gas. Six Season II
  mission intents and three bad inputs were also sent. Requests went straight to each `base_url`, not
  through Telegraph, so nothing was paid for and nothing counts as served. Files: `probes.mjs`, `probes.json`.
- **OathCast could not be probed.** Its `/predict` needs a bearer key that only Telegraph holds, and returns
  401 without one. Its answers below come from the feed.
- **Real answers to real callers.** Explorer-feed rows for the four miners, in three windows: the Track 3
  week (Aug 31 – Sep 7 12:08 UTC; the pull hit its page cap there), judging (Sep 7 21:36 – Sep 28), and the
  last 7 days. Files: `pull-winners.mjs`, `summarise.cjs`, `feed-summary.txt`.
- **Source code.** TxLens (`Sireadell/onchain-tx` at `8d91a69`, 2026-09-27) and OathCast (`fexx301/oathcast` at `9963519`,
  2026-09-13) are public and were read. ChainSight has no public repository. Its stack was read from
  its own `/openapi.json` and its answers.
- **Our newest preview.** `miner-h8tyai3m6` (built from `c485819`) was given the same questions, so this
  document can say what the branch already fixes. File: `preview-probes.txt`.

## Short answer

1. **The two leaders return data, not just prose.** A TxLens answer carries a status label, a direct
   `answer` sentence, a `canonical` one-liner, `confidence`, a timestamp, its sources and every value as a
   field. Its median during judging was 12 top-level fields, and 32 in the last week. ChainSight's was 4
   and 7. LiveCert production has 3: `verdict`, `confidence` and one prose `reason`.
2. **Their answers lead with the answer.** For "Is there an active storm alert for Lagos right now?",
   TxLens opens "No storm is expected in Lagos … so the risk is low". It ends with a `recommended_action`
   that fits the risk. LiveCert production opens "Regarding is there an active storm alert …". It then
   advises sheltering personnel at risk grade "none". **61%** of our judging-window answers and **83%**
   of last week's open with that echo. The branch fixes it (preview below); production still has it.
3. **Their manifests read as a product spec, and the reviewers restated them.** Each TxLens endpoint
   description lists example questions, the exact parameters and every returned field. The winners-page
   blurb is the `/check-tx` description almost word for word.
4. **They kept growing during judging.** TxLens went from 14 intents to 72 between Sep 17 and Sep 25, over
   several on-chain updates. Six of those are Season II mission intents we have not built yet. ChainSight
   re-registered on Sep 19 and now lists 60. Ours went to 36 on Sep 19 too, but its description still
   named three endpoints.
5. **Volume came from a few apps, and the apps picked the on-chain miners.** In the judging window, one
   broken app template sent 2,055 calls: ChainSight 1,200, TxLens 827, LiveCert 28. TxLens's own app,
   AskLens, sent it 329 paid calls in a 21-minute scripted run on Sep 7. OathCast's whole judging-window
   count is 17 calls inside two minutes on Sep 28. Where demand exists, it went to miners whose manifest
   said "on-chain".
6. **They are not better on correctness.** ChainSight states that "CVE-2021-44228 was processed on Ethereum
   and confirmed successfully". It does the same for `0x1234` and for "Will it rain in London tomorrow?".
   Over a third of its answers last week were "Unable to process" sent with HTTP 200. TxLens's web search
   and fact check return 502 today because its Perplexity key ran out of credit. Our own fact check,
   though, rates "The Eiffel Tower is in Berlin" as **supported** (production and preview). See §4.

## 1. What they answer: the same questions, side by side

Live, 2026-10-11 05:32 UTC. Each cell shows what an app gets back. `probes.json` has the full bodies.

| Question | TxLens | ChainSight | LiveCert production |
|---|---|---|---|
| Transaction `0x5c50…2060` (first ETH transfer) | `status` confirmed, `from`, `to`, `value_wei`, `value_eth`, `block_number`, `block_hash`, `receipt_status`, `method`, `canonical`, `confidence` 1, `answer` | the same `answer` sentence word for word, plus `from`, `to`, `value_eth`, `value_eth_exact`, `block_number`; `status` is **null** | `verdict` confirmed, 0.99, prose `reason`. It is the only answer that explains the pre-Byzantium receipt. The preview adds a `transaction` object with the same fields as TxLens, plus gas used and fee |
| Malformed hash `0x1234` | `invalid_input`; says what a hash looks like and what you get back | "**0x1234 was processed on Ethereum and confirmed successfully**" | `invalid_hash`; says what a hash looks like and what you get back |
| ETH price | `price_usd` from CoinPaprika and DefiLlama, `source_count` 2, low/high range, 24h change, market cap, `as_of` | `price_usd`, `market_cap_usd`, `change_24h_pct`, `circulating_supply`; the prose repeats the number in five forms: "($2,506, $2,500, $3,000, $2505.71, $2.5 thousand)" | prose only: Coinbase last trade and CoinGecko, both timestamped. **The preview is still prose only** |
| Storm, Lagos, "right now" | "No storm is expected …", `risk_level` LOW, `risk_score`, 24-hour window, gusts in km/h, mph and m/s, Beaufort, `recommended_action` "No disruption expected", 32 fields | "Regarding Is there an active storm alert …:" then the full shelter-your-staff advice at risk "low" | the same echo and the same advice at risk "none". **The preview opens "No storm conditions are forecast for Lagos right now"**, says it is not an official warning, and returns 18 fields |
| 24-hour forecast, Lagos | answers **3 days** for a 24-hour question, with a `days[]` array | 24-hour summary, 9 fields | echo, then the summary. The preview has 18 fields and no echo |
| SSL, github.com | `valid`, chain length, matched hostname, every SAN, cipher, key bits, serial, SHA-256 fingerprint | `verdict` valid, issuer, `valid_until`, `days_remaining` | prose `reason` with the same facts |
| Fact check: "The Eiffel Tower is in Berlin." | 502: "the perplexity key has no credit left" | "Unverified. There is no reliable public evidence …" | **"supported", 0.7**, quoting a WW1 sentence that mentions Berlin |
| Web search: latest Fed decision | 502, same Perplexity outage | a dump of Indian RBI and gold-price snippets | two dated headlines, neither stating the decision |
| Sanctions: "Vladimir Putin" | match on the OFAC SDN list, program, entity number, remarks, `records_screened` 19,416 | "Unable to process" | not served |
| Corporate registry: "Apple Inc." | GLEIF: LEI, status, jurisdiction, legal **and** HQ address, creation date | GLEIF, thinner; calls the registered-agent address in Glendale the headquarters | not served |
| Regulatory filings: "Pfizer" | Federal Register: top notice and 5 documents out of 870 | not served | not served |
| Macro: Japan inflation | World Bank 2025 annual, +3.17% | "Unable to process" | not served |
| URL_SAFE: github.com | "Unknown. URLhaus check unavailable: … status 401" | not served | not served |
| "Will it rain in London tomorrow?" sent to the transaction endpoint | refuses and explains | "**The referenced transaction Will it rain in London tomorrow? was processed … confirmed successfully**" | refuses and explains |

OathCast answers one kind of question. On Sep 28 an app asked it for 24-hour forecasts for 16 cities. Each
`content` gave the window in UTC, the minimum and maximum temperature and the wettest hour. It then
listed a 24-row hourly table of temperature, precipitation, probability and wind. The registered output also carries a
calibrated `probability` field (`feed-summary.txt`).

## 2. How each one is built

| | TxLens (1st) | ChainSight (2nd) | OathCast (3rd) |
|---|---|---|---|
| Code | public: `Sireadell/onchain-tx`, 138 commits from Aug 14 | not public | public: `fexx301/oathcast`, 126 commits from Aug 5 |
| Stack | Node, Express 4, `express-rate-limit`; ~36k lines in `src/` including tests | Python FastAPI; OpenAPI 3.1 served at `/docs` | Python, ~33k lines, 39 files under `tests/`, CI |
| Hosting | Render **free** plan behind Cloudflare; `--max-http-header-size=64KB` so long router query strings are not refused with 431 | own domain behind Cloudflare; two sibling miners (TVLWire 301, ScoreWire 300) on subdomains | Docker and Caddy on a self-hosted duckdns name; `/status` publishes the release id, image digest and source hash |
| Upstreams | paid keys: Ankr RPC, Twelve Data, OpenWeatherMap, Perplexity Sonar (general fallback), Tavily, NVD. Keyless: CoinPaprika, DefiLlama, Open-Meteo, MET Norway, OFAC SDN CSV, GLEIF, Federal Register, World Bank, open.er-api.com | named in answers: CoinGecko, public RPC, Blockscout, Open-Meteo, Alpha Vantage, er-api, GLEIF, LangSearch, and "llm" | Open-Meteo, WeatherAPI, OpenWeather adapters, each requiring an exact native hourly point |
| Intents / endpoints | 72 / 74, all GET except two POSTs | 60 / 60: 18 GET data routes and 42 POST routes, many of which name `llm` or `langsearch+llm` as their source | 1 / 1 |
| Manifest | per endpoint: "Answers '…'", exact params, returned fields; `limitations` give exact lengths for hash and address | one top-level paragraph naming what it returns; one-line endpoint descriptions; rate limit 5/s, 30 s cache, circuit breaker | an exact window contract: absolute UTC, 1–168 whole hours, lat/lon, a 0.1 mm threshold |
| How it learned | logs every question and answer; a misroute watch; commits like "Answer questions the logs show we refused" and "Fix three real per-epoch scoring losses" | not visible | measured its answer sentence against a local scorer proxy and kept both versions (`docs/renderer-experiment.md`) |
| Beyond the miner | a Track 2 scorer for ONCHAIN_TX_LOOKUP (three registrations rejected by Aug 25, per its handoff note); the AskLens app: Windows clipboard checker, MetaMask Snap, MCP server for Claude and Cursor | an app by another team, Truvian Shield (Track 3, 2nd place), names it | a Track 3 app, Planning Desk, that buys through the Telegraph Engine with x402 payments and keeps a journal |

## 3. What is worth copying

**From TxLens**

- **One answer envelope on every endpoint:** `status` label, direct `answer` sentence, `canonical`
  one-liner, `confidence`, `as_of`/`checked_at`, `source`/`sources` with `source_count`, then every value
  as a field. The prose serves the scorer and the fields serve an app. That is the trade-off we made the
  wrong way in Season I (loss analysis §5).
- **Cross-checked numbers, said out loud:** two price sources, their range and the count.
- **Confidence with a rule behind it.** On `/check-tx` it scales with confirmation depth (`BUILD_SPEC.md`).
- **Refusals that teach the contract.** "Pass one as the tx_hash parameter and I will report …".
- **Endpoint descriptions as example questions.** These help the router and the reviewer alike.
- **Growth driven by traffic.** It logged every request, read the misses, and shipped a fix with a
  commit that names the miss.
- **Distribution where people already are:** clipboard, wallet and AI tools, with demo videos on X.

**From ChainSight**

- **A one-line identity:** "one oracle for the on-chain data surface, for trading and risk agents". An app
  by another team names it as its miner. Of the four miners, it got the most network-routed questions last
  week (120 of 278).
- **Speed.** Median 0.5–0.65 s across all three windows.
- **Ops settings declared in the manifest:** rate limit, cache and circuit breaker.

**From OathCast**

- **A narrow contract stated exactly.** It placed 3rd with 19 lifetime requests and a median rank of 6.
  The reviewers rewarded a clear, rigorous, well-documented miner.
- **Release identity in public:** `/status` shows exactly which build is serving.
- **Calibrated probability as a field**, with the answer sentence measured before it shipped.

## 4. Where they are weak, and where we already beat them

- **Fabrication.** ChainSight confirms transactions that do not exist (§1). In the judging window it
  told one app 1,200 times that "CVE-2021-44228 was processed on Ethereum and confirmed successfully".
  TxLens refused the same input.
- **"Unable to process" sent as a success.** 94 of ChainSight's 278 answers last week (34%) say "Unable
  to process" or "Unable to generate" with HTTP 200, so the explorer counts them as served.
- **Paid keys fail visibly.** TxLens's WEB_SEARCH and FACT_CHECK return 502 today because the Perplexity
  key has no credit left. Its URL_SAFE says "Unknown" because URLhaus now refuses the call with 401. Our
  keyless design avoids that class of outage.
- **"Live" that is not live.** TxLens describes FX_NOW as "the current mid-market rate from a live FX
  feed". Its source, open.er-api.com, last updated at 00:02 UTC and next updates 24 hours later (checked
  05:38 UTC).
- **Scorer-gaming text.** ChainSight writes numbers in five forms inside its answer. It also carries the
  same storm echo and boilerplate we do.
- **Our own defect, found here.** LiveCert's fact check calls "The Eiffel Tower is in Berlin" supported.
  `settle()` in `src/factsubject.ts` leaves one key word ("berlin") once the subject is removed. One
  co-occurrence in any sentence that names the subject then counts as support. FACT_CHECK is bought by
  four Season II missions. A fix is queued as its own task; nothing is fixed yet.

## 5. Where their judging-window volume came from

`feed-summary.txt`. Window: 2026-09-07 21:36 UTC to 2026-09-28. Successes are HTTP-level, so they include
"Unable to process" answers.

| | ChainSight | TxLens | LiveCert | OathCast |
|---|---:|---:|---:|---:|
| Rows | 4,110 | 2,464 | 980 | 17 |
| HTTP success | 2,677 | 2,283 | 980 | 17 |
| Distinct question texts | 485 | 895 | 359 | 16 |
| One broken app template (CVE id as a token or tx hash) | 1,200 | 827 | 28 | 0 |
| Network-routed (`daemon`) | 312 | 373 | 112 | 0 |

- TxLens's busiest hour is Sep 7 22:00 UTC, with 390 rows. That matches AskLens's own record
  (`HASHES.md`): 720 paid signals between 21:59 and 22:20, 329 of them to TxLens, paid in Base Sepolia test
  USDC.
- All 17 OathCast rows arrived between 15:59 and 16:01 on Sep 28, the last judging day. They came from the
  same "24-hour weather forecast for X starting today" template that also called us 293 times in the window.
- The volume behind the winners' "requests served" was mostly a handful of app scripts, some broken and
  one the author's own. It was not broad organic demand. Override 2 still stands: our own calls are not
  demand. The lesson is about positioning. The scripts that exist pick miners whose manifest matches
  what they need. In Season I that was on-chain data, and our manifest did not say we served it.

## 6. What this changes for Season II

These items go into [SEASON2_PLAN.md](SEASON2_PLAN.md).

1. **Fix the fact-check false support first.** FACT_CHECK is bought by four missions, and a confident
   wrong "supported" is worse than "unverified".
2. **Make every endpoint answer as TxLens does,** not just storm, weather and tx. The preview still
   returns prose-only `/crypto-price`. Required fields everywhere: `answer` (the direct answer first),
   `verdict`, `confidence`, `checked_at`, `source`/`sources`, plus the values.
3. **TxLens already serves six of our planned additions**: SANCTIONS, CORPORATE_REGISTRY,
   REGULATORY_FILING_MONITOR, MACRO, URL_SAFE and FX_NOW. Being present is not enough. Each must beat it
   on a point an app can check:
   - **Sanctions:** TxLens screens OFAC SDN only. Screen more than one list and name which list matched.
   - **Filings:** TxLens searches Federal Register notices and returns the top search hit. Use SEC EDGAR filings (form, accession number, acceptance time, link).
   - **Macro:** TxLens's figure is the World Bank's latest annual number (2025). Use a fresher official
     series where a keyless one exists. Verify it first.
   - **FX_NOW:** call a rate live only if it is.
   - **URL_SAFE:** its main feed is failing now (401). Ours names the feeds that flagged a link.
4. **Rewrite every endpoint description** as example questions, then parameters, then returned fields,
   and keep the top-level description true (loss analysis §5). Do it in the single pre-1-Nov `updateMiner`.
5. **Never return "Unable to process" or a fabricated success.** Refuse with a reason, or answer.
6. **Position the miner for the apps that exist.** In Season I those apps wanted on-chain data and safety
   checks. Season II apps are set by the missions. Lead the manifest with the mission intents.

## Unverified

| Claim | State |
|---|---|
| AskLens's test-USDC calls counted towards TxLens's `total_requests_served` | Likely, because they went through Telegraph and appear in the feed. Not confirmed with the organisers. |
| Who sent the CVE-template calls and the Sep 28 forecast sweep | Unknown. The feed records `source: user` only. |
| Which manifest the reviewers read | Unknown. TxLens changed it five times during judging. |
| Latencies in §1 | Single requests. The feed medians in `feed-summary.txt` are the better measure. |
| ChainSight's stack | Inferred from `/openapi.json` (FastAPI) and Python-style errors (`gaierror`). Its source was not seen. |
| TxLens code size | `wc -l` over `src/`, including tests, at the cloned HEAD. Not the size of the build that was judged. |
