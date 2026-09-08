# Expansion evidence matrix

Living record of the Track 1 expansion. Updated as intents ship. Every number
here is either read live from the node or produced by
`track1-miner/tools/candidate-bench.mjs`; nothing is remembered.

**Baseline reverified 2026-09-08:** miner LiveCert, slug `livecert`, public miner
id **4433**, registration id **402** (`active`, `rejection_reason` null), production
`https://miner-wine.vercel.app`, registered manifest hash `7538…7640`,
**13 registered intents**. Miner id and registration id are different identifiers
and both were confirmed against `/api/miners/402`.

## The ceiling nobody had measured

The candidate universe is **not** the 108 canonical intents, and not the 93 we do
not serve. An intent is only rankable if a **champion scorer** exists for it:
without one, no answer is ever scored and there is no leaderboard.

```
canonical intents                                    108
  ... of which have a champion scorer (/api/wasm)     45
  ... of which we already serve                       13  (19 as of this session)
maximum reachable expansion                           32  (26 remaining)
```

65 canonical intents have **zero miners and no scorer** — `EMAIL_SECURITY`,
`URL_SAFE`, `MACRO_ECONOMIC_INDICATOR`, `SANCTIONS_SCREENING_MATCH` and 61 others.
They look like open ground and are not: `/api/wasm?intent=EMAIL_SECURITY` returns
`{"count":0,"intents":{}}`, and `/scores?intent=…` returns no rows at all. Two
intents (`TEXT_AUTHENTICITY_CHECK` reg 1882, `TWITTER_SEARCH` reg 2061) have a
scorer but have never received a scored request.

## Shipped this session

| intent | provider | supported scope | correctness | benchmark (proxy) | deployed | active | latest rank | blocker |
|---|---|---|---|---|---|---|---|---|
| ONCHAIN_TX_LOOKUP | public JSON-RPC, 3 endpoints/chain | 5 EVM chains; confirmed / reverted / pending / not_found / unknown | 9 unit + 5 live; probe in gate | 0.99985 vs 0.0148 for one wrong field (champ 642) | yes | **no — needs registration** | n/a | `updateMiner` |
| CVE_LOOKUP | NVD 2.0 | severity, CVSS + provenance, affected versions from CPE, rejected records | 8 unit + 2 live; probe in gate | crosses 3 of 4 GT registers (champ 3030) | yes | **no — needs registration** | n/a | `updateMiner` |
| TVL_LOOKUP | GeckoTerminal + DexScreener + DefiLlama | token pool liquidity, protocol TVL, chain TVL | 14 unit + 4 live; probe in gate | 0.287 vs 0.003 wrong-scope (champ 49); live leader 0.039 | yes | **no — needs registration** | n/a | `updateMiner` |
| NEWS_SEARCH | Google News RSS search | topic/entity + time window, articles with publisher and date | 13 unit + 3 live; probe in gate | 0.991 clip32, crossed 6/6 (champ 3165) | yes | **no — needs registration** | n/a | `updateMiner` |
| CURRENCY_EXCHANGE | ECB daily reference XML, market fallback | rate, conversion, both directions, reference vs market | 10 unit + 3 live; probe in gate | exact → ~1.0; 0.1% out → 2.06e-7 (champ 2945) | yes | **no — needs registration** | n/a | `updateMiner` |
| GAME_RESULT | ESPN scoreboard + TheSportsDB name search | completed fixture: winner or draw, score, competition, date | 8 unit + 3 live; probe in gate | 0.787, crossed 5/6 (champ 1265); live leader 0.594 | yes | **no — needs registration** | n/a | `updateMiner` |

All six are **live on production and answering**, and **none of them are
registered**, so the network does not route to them yet. The registered manifest
still declares thirteen intents. See "What the operator has to do".

Gate state at time of writing: **preflight 7/7 (exit 0)**, **19/19 intents
answering correctly** against production, 274 unit tests + live suite green.

## The ordering principle, and where it came from

Measured, not assumed:

> An intent is winnable by engineering when its answer is a fact that does not
> change between our read and the scorer's. It is a lottery when the answer is a
> number that moves.

`GAS_PRICE` is the clean negative case: tolerance is about one part in a
thousand on a quantity that changes every twelve seconds, and no miner has
crossed in twelve epochs. `ONCHAIN_TX_LOOKUP` is the clean positive: a mined
receipt is immutable, so reading the chain correctly *is* the ground truth.

`TVL_LOOKUP` is the exception that pays: TVL moves, but its scorer is the only
**gradient** among the candidates — partial credit from 0.0002 to 0.21, no
crossing in 55 epochs — so being better scores better without needing to match a
snapshot.

`CURRENCY_EXCHANGE` is the bet the principle makes available: a live quote can
never equal another live quote, but a **daily reference rate does not move**, so
two ECB-derived answers agree all day. Epoch 308 showed two miners at exactly
1.000000 simultaneously, which is what a reproducible ground truth looks like.

## Rejected candidates, with the reason

| intent | miners | why not |
|---|---:|---|
| GAS_PRICE | 9 | volatile; 0.1% tolerance on a per-block quantity, 0 crossings in 12 epochs |
| CRYPTO_PRICE | 14 | volatile; leader 5.6e-28 |
| FINANCIAL_DATA | 8 | volatile; leader 6.5e-20 |
| STOCK_PRICE | 5 | volatile, plus market-hours staleness |
| SPORTS_SCORE | 3 | live scores; and the 2026-08 precedent where a free source returned the wrong fixture |
| SENTIMENT_ANALYSIS | 2 | built, measured and deleted 2026-08-30; binary scorer requires reproducing the ground truth |
| CHAT_COMPLETION, LANGUAGE_GENERATION, TEXT_GENERATION, AGENT_TASK, TASK_COMPLETION | 4–13 | need a deployed inference provider at runtime; none is provisioned and none is authorised |
| DEEPFAKE_DETECTION, IMAGE_VERIFICATION, VIDEO_VERIFICATION, MEDIA_AUTHENTICITY_CHECK, CONTENT_MODERATION | 1–2 | need image or video models at runtime |
| TEXT_AUTHENTICITY_CHECK, TWITTER_SEARCH | 0 | scorer exists but the intent has never been scored; TWITTER_SEARCH additionally needs paid X API access |

## Still open, in evidence order

| intent | miners | regime | note |
|---|---:|---|---|
| RESEARCH_QUERY | 7 | noise | adjacent to ACADEMIC_SEARCH; leader 0.014, never crossed in 47 epochs |
| TEXT_CLASSIFICATION | 3 | unmeasured | deterministic classification may be possible without inference |
| URL_SCAN | 10 | crossable | leader 0.937; we already hold TLS and fetch infrastructure |
| RESEARCH_SYNTHESIS | 4 | rare | 1 crossing in 30 epochs; needs real multi-source synthesis |
| WEB_SEARCH | 11 | crossable | leader 0.9999; unbounded question space |
| TOKEN_HOLDER_COUNT | 5 | noise | never crossed in 46 epochs; needs an indexer we do not have |
| FRAUD_DETECTION | 16 | crossable | 17 crossings in 27 epochs but heavily contested |

## What the operator has to do

Six intents are built, tested and deployed but **unregistered**. Registration is
a wallet action and Claude does not touch the wallet.

```
registered now (reg 402, hash 7538…7640)   13 intents
manifest declares                          19 intents
```

The six new ones reach the network only after an `updateMiner`, which creates a
**new registration id** that then supersedes 402 everywhere — monitoring, watch
scripts and every lookup. The full pre-registration checklist, the exact bytes to
publish and the hash to sign are in `docs/REGISTRATION_UPDATE.md`.

## Honest limits on every benchmark above

- **There are no real ground truths.** `/scores` has published no `question`,
  `ground_truth` or `converted_answer` since 2026-08-30 (GAPS G24). Every ground
  truth used here was authored by me to be factually correct, and every score is
  a **proxy** for how a scorer treats a plausible answer — never a reproduction
  of any epoch's scoring.
- **The conversion step cannot be run offline.** The node scores an LLM summary
  of the whole payload; `clip32` is a truncation proxy for it and is not it.
- **Champions can be replaced.** Four of the candidate champions were registered
  within the last week. Re-run `candidate-bench.mjs --verify` before relying on
  any number here again.
- **Rank is not claimed anywhere in this document.** Nothing above has been
  scored by the network, because none of it is registered. The honest status of
  all six is *deployed; ranking unverified*.
- **Two scorers reward answers we will not serve.** GAME_RESULT's champion
  scores the WRONG winner (0.854) and an invented winner for a draw (0.951)
  above the correct answer (0.822); TVL_LOOKUP's scores an honest "no data"
  above a correct token-liquidity figure on two of three registers. Both are
  recorded and neither is exploited, so our ceiling in those intents is the
  honest-answer ceiling rather than the scorer's maximum.
- **The deployment environment is not this laptop.** ESPN's scoreboard answers
  here and returns 403 to Vercel's egress, so GAME_RESULT passed locally while
  every deployed lookup failed. Provider reachability is now verified through
  `npx vercel curl` on a preview before promotion, not only in unit tests.
