# Intent conformance against the hackathon site's Intents page (2026-10-25)

On 2026-10-25 the organiser (Ahmed) told builders to "build on intents hackathon website have": serve an
intent only when the miner really performs that intent's task. This folder checks our 36 registered intents
against that page.

**Inputs**
- `site-intents.json`: the 93 rows of hackathon.telegraphprotocol.com/intents, read from its script bundle
  by `tools/site-intents.mjs` on 2026-10-25.
- Each row gives the tier, the job, a service type, example sources, a latency target and a difficulty.

**Latency evidence**
- `latency.txt`: `tools/latency-targets.mjs` against production `miner-e2999tb2p`, plus a spot check.
- The client round trip is measured on `/health` and subtracted. The function runs in iad1, and this
  machine is in India.

## Headline

1. **Only 13 of our 36 intents are on the site's Intents page.** The other 23 are not listed, including
   WEB_SEARCH, FACT_CHECK, FINANCIAL_DATA, CONTENT_EXTRACTION and WEATHER_CHECK. All five are named on
   mission pages (`missions-2026-10-23/`). So the mission pages and the Intents page disagree.
   - The organiser's instruction points at the Intents page.
   - Whether an unlisted intent is judged, routed or worth anything in Season II is **not known**. It is a
     question for the organisers (GAPS).
2. **Three listed intents miss their latency target.**
   - SENTIMENT_ANALYSIS (< 300 ms) and TEXT_CLASSIFICATION (< 400 ms) took 0.45–1.42 s on most unseen
     questions.
     Both run a Groq phrasing call on every answer. The code's own comment calls that call a Season I scorer
     "lottery ticket" (`src/prose-phrase.ts`).
   - CURRENCY_EXCHANGE (< 250 ms) took 437 and 465 ms on two unseen pairs.
3. **Several listed intents match code we already have.**

| Listed intent | Missions | Target | Our code |
|---|---:|---|---|
| ONCHAIN_METRIC_VERIFY | 10 | < 2 s | `wallet*.ts`, `onchain.ts`, `gas.ts`, `holders.ts` |
| VULNERABILITY_TRIAGE | 10 | < 2 s | `cve*.ts` (NVD, CVE program, KEV) |
| FX_NOW | 8 | < 200 ms | `currency.ts` (ECB / Frankfurter, the site's own example) |
| THREAT_IP_REPUTATION | 7 | < 400 ms | `geo.ts` |
| DNS_RECORD_LOOKUP | 6 | < 200 ms | `quad9.ts` (Quad9 is a named example source) |
| TOKEN_TOTAL_SUPPLY_VERIFY | 6 | < 500 ms | `holders.ts`, `wallet-tokens.ts` |
| ENTITY_EXTRACTION, KEYWORD_EXTRACTION | 7, 6 | < 600 ms, < 400 ms | `extract.ts`, `content.ts` |
| WEATHER_FORECAST_VERIFY | 5 | < 1 s | `metno.ts`, `forecast.ts`. MET Norway is not a named source |

## The 13 listed intents

Latency is the estimated miner time on questions the miner had not seen: run 1 plus the spot check in
`latency.txt`. A second run of repeated questions was answered from a cache and is discarded.

| Intent | Site target | Our source vs the site's | Measured | Verdict |
|---|---|---|---|---|
| CORPORATE_REGISTRY_LOOKUP | < 2.5 s | SEC EDGAR + GLEIF, vs "Government Chamber API / OpenCorporates". No national registries (Companies House) | 0.31–1.09 s | keep; coverage gap noted |
| CROSS_CHAIN_STATE_VERIFY | < 3 s | LayerZero Scan / Wormhole, vs "LayerZero / Wormhole RPCs" | ≤ 0.28 s (not-found and insufficient inputs only) | keep; time a real delivered message |
| CRYPTO_TRANSFER_VERIFY | < 1.5 s | Ethereum RPCs, vs "Etherscan / Alchemy / QuickNode" | ≤ 0.61 s | keep |
| CURRENCY_EXCHANGE | < 250 ms | ECB / Frankfurter, the site's own example | **465 ms** and **437 ms** on two pairs; ≤ 278 ms on two | fix: keep ECB rates warm |
| EVENT_OUTCOME_RESOLUTION | < 5 s | Polymarket, vs "Polymarket API / NewsAPI" | ≤ 0.36 s | keep |
| LANGUAGE_TRANSLATION | < 1.5 s | Groq LLM, vs "DeepL / Google / NLLB" | 0.35–1.0 s | keep; free-quota risk (item 4) |
| MACRO_ECONOMIC_INDICATOR | < 2 s | BLS, Eurostat, ECB, World Bank, NY Fed, vs "FRED / World Bank" | ≤ 0.29 s | keep |
| QUESTION_ANSWERING | < 2 s | Wikipedia RAG + Groq, vs "OpenRouter / Perplexity" | 0.59–0.72 s | keep |
| REGULATORY_FILING_MONITOR | < 3 s | SEC EDGAR, as named | ≤ 0.28 s | keep |
| SANCTIONS_SCREENING_MATCH | < 500 ms | OFAC SDN + UN lists, vs "OpenSanctions / OFAC" | **3.35 s** on the first call (list download); ≤ 0.28 s after | fix: no list download on the request path |
| SENTIMENT_ANALYSIS | < 300 ms | lexicon + Groq phrasing, vs "RoBERTa / HF pipeline" | **0.69–1.42 s** on all five | fix: drop or bound the phrasing call |
| TEXT_CLASSIFICATION | < 400 ms | cue lexicon + Datamuse + Groq phrasing, vs "BART-large-MNLI" | **0.45, 1.08, 1.25 s**; 0.28 s and ≤ 0.28 s on two | fix: as sentiment, and bound Datamuse |
| URL_SAFE | < 300 ms | threat lists, vs "VirusTotal / Safe Browsing" | ≤ 0.28 s | keep |

**Not measured:**
- correctness on the site's terms, beyond the Oct 21 audit;
- latency from a caller in the US;
- p90 over many questions. Three questions per intent is a spot check, not a distribution.

## The 23 intents not on the Intents page

ACADEMIC_SEARCH, CONTENT_EXTRACTION, CRYPTO_PRICE, CVE_LOOKUP, FACT_CHECK, FINANCIAL_DATA, FRAUD_DETECTION,
GAS_PRICE, IP_GEOLOCATION, NEWS_HEADLINES, NEWS_SEARCH, ONCHAIN_TX_LOOKUP, RESEARCH_QUERY, RESEARCH_SYNTHESIS,
SSL_VERIFICATION, STOCK_PRICE, STORM_ALERT, TOKEN_HOLDER_COUNT, URL_SCAN, WALLET_BALANCE_CHECK, WEATHER_CHECK,
WEATHER_FORECAST, WEB_SEARCH.

They are still canonical on-chain, and seven are named by mission pages. Nothing here is removed. Re-mapping
them onto the listed intents in the sibling table needs an `updateMiner`, which is the owner's decision, with
the grace-period risk in G206.

## Recommended order

1. Code, no registration change:
   - sentiment and classification under their targets;
   - sanctions with no download on the request path;
   - FX kept warm.
2. Ask the organisers: are unlisted intents judged and routed in Season II?
3. If the answer is "listed only": plan one `updateMiner` that registers the sibling intents our code already
   performs. Each must pass an audit against its row before signing.

## Fix 1: SENTIMENT_ANALYSIS and TEXT_CLASSIFICATION latency (G209)

`tools/prose-model-bench.mjs` runs 24 hand-labelled sentiment passages and 16 classification items in
process, from India, with the word list alone and with the model.

| Version | Sentiment correct | Sentiment p50 / p90 | Classification correct | Classification p50 / p90 |
|---|---:|---|---:|---|
| Word list only | 14/24 | 0 / 0 ms | 11/16 | 67 / 273 ms |
| Before: gpt-oss at "low", Season I prompts (`prose-model-before.txt`) | 21/24 | 700 / 1252 ms | 12/16 | 570 / 699 ms |
| After: qwen3.8-27b with reasoning off, plain prompts, 250 / 350 ms deadline (`prose-model-after.txt`) | **23/24** | **164 / 203 ms** | 12/16 | 168 / 329 ms |

**What changed**
- `llm.ts` gains a `fast` request: one attempt on qwen3.8-27b with `reasoning_effort: "none"`. A miss falls
  back to the keyless answer, never to a slower model.
- `prose-phrase.ts` drops the Season I scorer-register prompts for plain ones that define each label. Those
  prompts had made qwen call 10 of 12 negative reviews "mixed".
- A passage with no word-list opinion word now also goes to the model ("Five stars, would buy again").

**Kept on purpose:** classification's guard. The model's label is used only when the word list has a clear
margin, so "Hello, I have a question" is never labelled billing, and "not spam" is never asserted from an
absence of evidence. It costs the four misses in the table.

**Not measured**
- Latency from Vercel's iad1 to Groq; it is probably shorter than from India.
- Behaviour under the free plan's 30 requests a minute. Back-to-back bench calls hit it, which is why the
  bench is paced at 2.1 s. Under real load, overflow answers fall back to the word list (item 4).
