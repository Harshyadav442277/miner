# Season II plan — Track 1 (Miners)

Written 2026-10-11. Season II runs **1 Nov – 1 Dec 2026**: register before 1 Nov, pick intents
Nov 1–7, office hours Nov 15–21, submission and judging Nov 22 – Dec 1
(hackathon.telegraphprotocol.com/timeline, fetched 2026-10-10). The miner judging rules are
"published separately" and were not out on 2026-10-10. Re-read them the day they appear.

## The goal, as the owner set it (2026-10-11)

Win Track 1 outright. **Leaderboard rank is not a goal.** The intent count may go up or down. The
owner's theory is that demand from apps was what got judged. The Season I evidence agrees
([S1_LOSS_ANALYSIS_2026-10-11.md](S1_LOSS_ANALYSIS_2026-10-11.md)):

- **Apps chose miners directly.** 91% of LiveCert's Aug 31 – Sep 28 requests, 89% of TXlens's and
  97% of Chainsight's were direct calls, not rank-routed.
- **The rest of the gap was outside rank:** we started late, reviewers read a stale manifest, and
  our X reach was small.

**Risk:** if Season II requires apps to buy through routing, rank decides who gets that demand
again. Check this in the miner rules when they publish.

## Done on the branch (2026-10-11): committed, on a preview, not on production

Commits `f8925a4`, `6d658a3`, `6daccb6` and `ab08d90` on `codex/rank1-14-intents` (not pushed).
Preview `https://miner-e6z8ru8d1-wukong4.vercel.app` was built from a clean worktree at `ab08d90`,
so it carries none of the other session's uncommitted edits. All eight probed routes answered with
their fields through `npx vercel curl`: `/financial` (CoinGecko reachable from Vercel), `/storm-alert`,
`/web-search`, `/fact-check`, `/ssl-check`, `/papers`, `/tx-lookup` and `/weather-forecast`.
Evidence: [evidence/season2-build-2026-10-11/preview-probes.txt](evidence/season2-build-2026-10-11/preview-probes.txt).
Production is still `miner-j9eojoz7e`.

**Later the same day:** item 0 below (`c485819`, transaction fields) is on preview
`https://miner-h8tyai3m6-wukong4.vercel.app`, built from a clean worktree at `c485819`. `/tx-lookup`
returned the `transaction` fields from Vercel. This is the newest preview of this session's work. It
does not contain the other session's uncommitted news, translate and weather fixes.


| Change | Files | Verified |
|---|---|---|
| Answers are app-first: every route returns its whole result, and the question echo at the head of `reason` is gone (`restate.ts` deleted) | `src/handler.ts`, `src/papers.ts`, `src/geo.ts`, `test/handler.test.ts`, `test/papers.test.ts` | 767/767 unit tests |
| Storm answer opens with the graded yes or no, says it is not an official warning, and gives safety guidance only at moderate risk or worse, or when asked | `src/storm.ts`, `test/storm.test.ts`, `test/storm-answer.test.ts` | offline tests; 4/4 live storm tests |
| FINANCIAL_DATA for named coins: market cap, dollar 24h volume, valuation and range from CoinGecko; the Yahoo fallback no longer calls coin volume "shares" and says when market cap was not retrieved; every answer carries `data` fields | `src/financial.ts`, `test/financial-fields.test.ts` | 5 offline tests; live probes for SOL, ETH and BTC; "Apple's revenue, P/E, etc" stays on Apple |
| Manifest name and description rewritten to describe all 36 intents; `/financial` description corrected (P/E is computed from the 10-K, coins are covered) | `miner.yaml` | `manifest-diff.mjs`: PASS, all 35 endpoints, parameters and 36 intents unchanged |
| Integration guide rewritten around the Season II mission intents, with exact parameters | `docs/INTEGRATE_LIVECERT.md` | parameters read from `miner.yaml` |

`intent-answers.mjs` against a local build: **35/36**. The miss is IP_GEOLOCATION's Tokyo pin for
142.251.42.174. It failed the same way before these changes, because ip-api.com is unreachable from
this machine.

**Gap found on the preview:** `/tx-lookup` returns only `hash`, `chain`, `verdict`, `confidence` and
`reason`. Sender, recipient, value and block are in the prose only. TXlens, the Season I winner,
returns `status`, `from`, `to`, `value_wei`, `value_eth`, `block_number`, `block_hash`,
`receipt_status` and `method` as fields. This is item 0 below, now done.

## Intent portfolio

**Demand evidence.** Two sources:

- Distinct app questions per intent, Aug 31 – Sep 28: URL_SCAN 579, FRAUD_DETECTION 384,
  CHAT_COMPLETION 278, WALLET 184, ONCHAIN_TX 172, NEWS_SEARCH 146, STORM 145, WEATHER_FORECAST 141,
  WEATHER_CHECK 134, SSL 129, IP 127, CRYPTO_PRICE 125.
- Season II mission pages, counting missions that buy each intent: WEB_SEARCH 7;
  CORPORATE_REGISTRY_LOOKUP, QUESTION_ANSWERING and SANCTIONS 5 each; FACT_CHECK, FINANCIAL_DATA,
  REGULATORY_FILING_MONITOR, ASSET_RESERVE_ATTESTATION and CHAT_COMPLETION 4 each.

**Keep the 35 others.** Each had Season I app demand, is bought by a mission, or costs nothing to
keep. LiveCert's own demand was led by WEATHER_FORECAST (510), STORM (405) and FACT_CHECK (170).

**Drop TVL_LOOKUP.** It had no direct demand to us, and its only source, DeFiLlama, may forbid paid
redistribution (G186, unverified). Confirm by reading DeFiLlama's terms first.

**Add, in this order.** All are canonical on-chain (checked 2026-10-10). Items 0–6 are keyless and
not generative; item 7 uses a free model key.

| # | Intent | Missions | Built from |
|---:|---|---:|---|
| 0 | ONCHAIN_TX_LOOKUP fields (already registered). **Done 2026-10-11:** `transaction` carries status, parties, exact value, block number and hash, receipt status, method, gas used and fee; 4 offline tests, and a live check on the first Ethereum transfer matches TXlens's block hash | — | `onchain.ts` |
| 1 | URL_SAFE | 2 | Declare on `/url-scan`, which already names the feeds that flagged a link |
| 2 | CRYPTO_TRANSFER_VERIFY | 3 | `onchain.ts`: status, sender, recipient, confirmations; add the fee burned |
| 3 | REGULATORY_FILING_MONITOR | 4 | SEC EDGAR submissions JSON: whether a 10-K, 10-Q or 8-K was filed, when it was accepted, and its link |
| 4 | SANCTIONS_SCREENING_MATCH | 5 | OFAC SDN and UN consolidated lists, with fuzzy name matching and match confidence |
| 5 | CORPORATE_REGISTRY_LOOKUP | 5 | GLEIF LEI register (status, legal and registered address, jurisdiction) plus EDGAR for US filers |
| 6 | MACRO_ECONOMIC_INDICATOR | 3 | World Bank and ECB statistics, keyless; US CPI and the fed funds target range need a source checked first |
| 7 | QUESTION_ANSWERING | 5 | Its canonical definition asks for "cited factual assertions". Answer from the web search and Wikipedia sources we already read, have a free model (Groq or Gemini; the owner will provide keys) phrase the answer with each claim cited, and keep a keyless extractive fallback, as `prose-phrase.ts` does for sentiment |

**Competitor check (2026-10-11, [S1_WINNERS_TEARDOWN_2026-10-11.md](S1_WINNERS_TEARDOWN_2026-10-11.md) §6).**
TxLens, the Season I winner, already serves items 1 and 3–6, plus FX_NOW, all from keyless sources.
Each addition has to beat it on something an app can check:

- **Item 4, sanctions:** TxLens screens OFAC SDN only. Screen more than one list and name the list.
- **Item 3, filings:** TxLens returns the top Federal Register search hit. Ours gives EDGAR form,
  accession number, acceptance time and link.
- **Item 6, macro:** TxLens gives the World Bank annual figure (2025). Use a fresher official series.
- **Item 1, URL_SAFE:** TxLens's URLhaus call fails with 401.
- **FX_NOW:** TxLens calls a once-a-day feed "live".

ChainSight lists sanctions and macro, but answered "Unable to process" to both.

**Decided 2026-10-11 (owner delegated the choice): no CHAT_COMPLETION.** It had real Season I demand
(278 distinct questions), but 19 miners serve it, many wrapping large providers, so we have no edge.
A free key's daily quota would also run out under exactly the demand we want, and an exhausted chat
miner fails visibly. TEXT_SUMMARIZATION (2 missions) waits until QUESTION_ANSWERING's model path has
proven reliable.

**Not added yet.** FX_NOW needs a live institutional mid-market rate, and no keyless source was
found. ASSET_RESERVE_ATTESTATION needs the issuers' attestation reports parsed, which is research
first.

Every addition goes into **one** `updateMiner`: sandbox validation at integrate.telegraphprotocol.com,
then the owner signs. Do it before 1 Nov, so the miner is registered and live from day 1.

## Demand plan: the part code cannot do

1. **Integration recipes per mission.** For each mission that buys our intents, one copy-paste call
   with its exact response fields, published in `docs/INTEGRATE_LIVECERT.md` and linked from X.
2. **Office hours, Nov 15–21.** Bring the recipes to app teams whose mission needs our intents.
3. **X from week one.** Post real findings at a steady cadence, and reply under builders' posts.
   TXlens had 40× our reach in Season I.
4. **No self-generated volume.** Requests from our own apps or scripts are not demand (folder
   override 2).

## Next actions, in order

Status 2026-10-14 ~05:30 UTC. Production is `miner-ntd40dbx9` (rollback `miner-q67fqthj7`), with
preflight 42/43 intents correct; the miss is the known IP Tokyo pin. Evidence:
[evidence/season2-release-2026-10-14/](evidence/season2-release-2026-10-14/).

1. ~~Promote the October release.~~ **Done 2026-10-13** (`miner-q67fqthj7`).
2. ~~Fix FACT_CHECK's false "supported".~~ **Done** (`a9867c3`, G188), on production.
3. ~~One envelope on every endpoint.~~ **Done.** `src/envelope.ts` adds `answer` (the lead sentence)
   first and `checked_at` everywhere. Prices, URL scans, fraud, CVE, sentiment, event outcomes,
   cross-chain and content verification now return their values as fields, and translations return
   their languages.
4. ~~Build items 0–7.~~ **Done, on production:**
   - `/url-reputation` (URL_SAFE, with Quad9 as a third threat source).
   - `/transfer-verify` (CRYPTO_TRANSFER_VERIFY).
   - `/sec-filings` (REGULATORY_FILING_MONITOR).
   - `/sanctions-screen` (SANCTIONS_SCREENING_MATCH).
   - `/company-registry` (CORPORATE_REGISTRY_LOOKUP).
   - `/macro` (MACRO_ECONOMIC_INDICATOR).
   - `/answer` (QUESTION_ANSWERING, Groq-phrased and kept only when fully cited).

   TVL_LOOKUP was not dropped: protocol and chain scopes are refused as `not_licensed` (G186), and the
   token scope still answers. Whether to deregister it is the owner's call.
5. **Next:** one `updateMiner`. The manifest at HEAD passes `manifest-diff.mjs` against the registered
   `94bbb04`: 36 → 43 intents, nothing lost. The top description is rewritten. The seven new
   endpoints plus `/tx-lookup`, `/url-scan` and `/tvl` describe example questions and returned fields.
   **Still to do:** rewrite the other 32 endpoint descriptions the same way (teardown §6). Then:
   - Push the branch, because the pinned YAML URL is a raw GitHub URL at a commit. **This needs the
     owner's yes.**
   - Hash the YAML (SHA-256).
   - Validate in the integrate.telegraphprotocol.com sandbox.
   - The owner signs.
6. Read the Season II miner rules when published and re-check this plan against them.
7. Demand plan items 1–3 (recipes are in `docs/INTEGRATE_LIVECERT.md`; X posts and office hours are the
   owner's to send and attend).
