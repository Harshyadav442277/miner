# LiveCert improvement — five phases (2026-10-11)

Started 2026-10-10 19:02 UTC (2026-10-11 00:32 IST). Branch `codex/rank1-14-intents` at `94220f1`.
Registration 2750, 36 intents. Baseline = `rank-audit.json` in this folder (epoch 400, partial).

## Baseline: last ~10 epochs per intent

Ratio = our score ÷ the epoch's top score, median over the epochs the API returns (`r1` = epochs at rank 1).

| Lane | Intent | r1 | median ratio | ranks, newest first |
|---|---|---:|---:|---|
| A: zero or last | CRYPTO_PRICE | 0 | 0 | 37, 36 |
| A | EVENT_OUTCOME_RESOLUTION | 0 | 0.57 | 23 (node-side 429), 3, 2, 4 |
| B: two clusters | WEATHER_FORECAST | 0 | 0.001 | 3, 4, 4, 2, 2 |
| B | TELEGRAPH_KNOWLEDGE | 0 | ~0 | 3, 5, 7, 6, 3, 2, 4 |
| B | FINANCIAL_DATA | 1 | ~0 | 7, 4, 6, 1, 5 |
| B | TEXT_CLASSIFICATION | 1 | ~0 | 1, 3, 15, 4, 20 |
| C: mid gap | CURRENCY_EXCHANGE | 0 | 0.047 | 10, 7, 7, 6, 10 |
| C | TVL_LOOKUP | 0 | 0.099 | 5, 4, 4, 3, 5 |
| C | WEB_SEARCH | 0 | 0.163 | 9, 2, 10, 4 |
| C | FRAUD_DETECTION | 0 | 0.291 | 4, 5, 6, 6 |
| C | AI_TEXT_DETECTION | 0 | 0.293 | 2, 7, 5, 6, 4 |
| C | RESEARCH_QUERY | 1 | 0.353 | 10, 6, 1, 11, 10 |
| C | CONTENT_VERIFICATION | 0 | 0.365 | 8, 4, 5, 5, 5, 6, 4 |
| C | SPORTS_SCORE | 0 | 0.386 | 2, 10, 11, 9, 8, 2 |
| C | TEXT_AUTHENTICITY_CHECK | 0 | 0.40 | 6, 8, 4, 6, 9, 4, 5 |
| D: near miss | ACADEMIC_SEARCH, ONCHAIN_TX_LOOKUP, CROSS_CHAIN_STATE_VERIFY, RESEARCH_SYNTHESIS, GAS_PRICE, WEATHER_CHECK, URL_SCAN, LANGUAGE_TRANSLATION, SSL_VERIFICATION, IP_GEOLOCATION, WALLET_BALANCE_CHECK | | 0.58–1.0 | mostly 2–7 |
| Holding | NEWS_HEADLINES, STORM_ALERT, TOKEN_HOLDER_COUNT, CVE_LOOKUP, FACT_CHECK, GAME_RESULT, STOCK_PRICE | 2–5 | 1.0 | |

The two `build request for miner "livecert"` failures (TEXT_AUTHENTICITY_CHECK 396, EVENT_OUTCOME_RESOLUTION
400) are the node's own LLM gateway timing out or returning 429 before it calls us. They are not our defects.

## Phase 1: baseline and carry-over (done 2026-10-10 19:10 UTC)

- [x] Fresh rank audit, epoch 400 partial: 7/36 at rank 1. Saved here.
- [x] 10-epoch table above.
- [x] 1 Oct uncommitted work (URLhaus feed coalescing, prose-phrase extra-output guard): `npm run typecheck`
      passed, `npm run test:unit` 771/771.
- [ ] Commit the carry-over (needs the owner's yes). The `uptime.yml` change (monitors manual-only, no CI
      commits) is the owner's 1 Oct decision. Keep it.

## Phase 2: diagnose (evidence before any code) — done

For each intent, record: our live answer, a crossing competitor's live answer, both scored under the live
champion WASM (`../track2/harness/wasm-abi.mjs`), and the defect. Rule from G114/G128: the reference pair
must agree under the champion before it counts as a reference.

- Lane A: CRYPTO_PRICE first (scores exactly 0 while 36 others score above 0).
- Lane B: WEATHER_FORECAST, TELEGRAPH_KNOWLEDGE, FINANCIAL_DATA, TEXT_CLASSIFICATION. A leader near 1.0
  and us near 0 is a register or shape gap, not noise.
- Lane C: in median-ratio order. Lane D only when a reproducible defect exists. Rank 2–7 at ratio ≥ 0.84
  is noise until proven otherwise.

## Phase 3: fix

One intent = one change = one regression test, in the Phase 2 order. Never write a figure the miner did
not compute. Keep the keyless fallback wherever a model phrases an answer.

## Phase 4: verify

`npm run test:unit` → preview deploy → `preflight.mjs` 7/7 and `intent-answers.mjs` against the preview →
`no-regression.mjs` preview vs production → `manifest-diff.mjs` (hash unchanged means no `updateMiner`).

## Phase 5: release and measure (owner's yes for each outward step)

Commit on the branch → push → `vercel --prod` → alias check → `watch.mjs --once`. A manifest change also
needs a sandbox run and the owner signing `updateMiner`. Then `rank-audit.mjs` on the next two complete
epochs (about 9 h apart) and the handoff in `../../MEMORY.md`.

## Findings

### Phase 2, 2026-10-10 19:05–19:25 UTC

| Intent | Finding | Evidence | Action |
|---|---|---|---|
| CRYPTO_PRICE | Not a defect we can show. Champion reg 3170 (local `crypto_price_reg3170.wasm`, keccak `21be28b0…` = registry) gives 1.0 only when the figure is identical to the reference. Every other figure lands at 1e-21 to 1e-30 whatever the gap. In epoch 400, 41 of 56 miners score exactly 0 and the top is 3.6e-30, so rank inside the zeros is arbitrary. Our prices are within 0.03% of Coinbase/CoinGecko, and all 23 routed questions get a correct answer. The 5 refusals are 3 misrouted weather questions, "crypto price check" (no coin) and a testnet. | `../../../track2/harness` scorer run, scratch bench (not committed); live replay 19:10 UTC | None. Chasing an exact-match lottery is noise-fitting (G114). |
| TVL_LOOKUP | The leader `finwire-tvl` now answers every TVL question with a licence refusal ("DeFiLlama … personal, non-commercial purposes") and still scores 0.09–0.12, 8× our correct DefiLlama figure. The score is not rewarding the correct figure. | live `GET telegraph-fin.margyn.workers.dev/tvl?protocol=aave` 19:14 UTC vs our `/tvl` | No answer change. The licence claim is the competitor's and unverified; logged in GAPS for the owner. |
| CROSS_CHAIN_STATE_VERIFY | `xchain-beacon-publicnode` returns Ethereum's raw beacon state root for every question (`/eth/v1/beacon/states/head/root`) and scores 0.53–0.55 against our 0.33–0.38. | its manifest, read 19:20 UTC | No change. Copying a canned upstream payload would answer the wrong question. |
| TELEGRAPH_KNOWLEDGE, WEATHER_FORECAST | The miners scoring 1.0 (`telegraph-chatbot`, `openweathermap`) have manifests at `http://127.0.0.1:8099/…`, i.e. on the node operator's own host. They are probably fed from the same source as the ground truth, so they cannot be reproduced from outside. `isobar-weather` (external) returned 504 at 19:16 UTC, so no reference could be collected. | `/api/miners` catalog, 19:15 UTC | None until a reachable crossing reference exists. |

**What this means:** the big ratio gaps in this table come from how the scorer and ground truth work, not
from wrong answers. Lane A and B produced no fix you can justify. The remaining lever is the one that
worked on 2026-09-10: replay the routed questions and fix real refusals (`replay-production.txt`).

### Phase 2b: routed replay (`replay-production.txt`, 1,500 feed rows → 256 distinct questions, 22 intents)

Nearly all refusals are correct: misrouted "Will X succeed?" market questions, questions naming no subject
("this wallet", "this tx"), and nonsense topics. Real defects found:

| Route | Defect | Cause |
|---|---|---|
| `/headlines` | "headlines about happening in India today" → 0 headlines | the topic became the verb "happening" |
| `/headlines` | "Sports headlines in Middle East today" → 0 | feed ranks by relevance; none of the 100 items were from the last day |
| `/headlines` | "from the Middle East" → region "Middle"; "Southeast asia" → "Southeast" | "the" blocked the region match; lowercase second word |
| `/translate` | "Say hello in Spanish." → refused | imperative "say" was not a recognised asking phrase |
| `/weather-forecast` | `location=Lagos Nigeria` → "Lagos, 100242, Nigeria"; Auckland → "Auckland, 1010, …" (14 routed rows in 7 days, found by the parallel loss-analysis session) | the Nominatim fallback keeps the first and last two `display_name` parts, and the postcode is one of them |

### Phase 3: fixes (uncommitted)

- `src/news.ts`: "happening" family added to `GENERIC_TOPIC`; region match skips a leading "the"; a
  case-insensitive list of multi-word world regions; a window ending now adds `when:Nd` to the Google News query.
- `src/translate.ts`: "Say/please say X in L" reads X.
- `src/weather-upstream.ts`: postcode-shaped components are dropped from the Nominatim name.
- Tests: 2 in `test/news.test.ts`, 1 in `test/translate.test.ts`, 1 in `test/weather-upstream.test.ts`.

### Phase 4: verification (2026-10-10 19:30–19:50 UTC)

| Claim | Evidence | Result |
|---|---|---|
| No unit regression | `unit-tests.txt` | 775/775 (771 before + 4 new) |
| Weather place names fixed, others unchanged | `preview-weather-location.txt`, preview `miner-k9cu0ezci` vs production, 7 `location=` values | Lagos and Auckland lose the postcode; 5 controls identical |
| Parse change touches only intended headline questions | `parse-diff.txt`, old vs new over 1,244 corpus strings | 34 field changes; every change on a headline question is intended; the rest are answer strings that never reach `/headlines` |
| Fixes work against real providers and nothing is lost | `preview-vs-production.txt`, preview `miner-lvjnfemfl` vs production, every routed question | NEWS_HEADLINES 23/33 → 28/33, LANGUAGE_TRANSLATION 19/21 → 20/21, **0 lost** |
| Fixed shapes answer | `preview-probes.txt` (first preview `miner-b1h9vi3zv`) | 11/11 HTTP 200 with content |

**Not run:** `preflight.mjs`, `intent-answers.mjs` and `no-regression.mjs` against the preview. They cannot
pass Deployment Protection, and locally Google News answers 302. Run them against production right after a
promote. No rank effect is claimed. The headline wins are coverage, and NEWS_HEADLINES is already rank 1 in
4 of the last 7 epochs.

Phase 5 has not started: it needs the owner's yes for the commit and the production deploy.
