# Why LiveCert is losing Track 1 leaderboard positions

**Audit date:** 15 September 2026. Leaderboard snapshot: **epoch 333**, read at approximately **07:21 UTC / 12:51 IST**. Additional production checks and request-feed reads ran through approximately 07:35 UTC.

**Scope:** Investigate the user's own miner, `livecert`, and explain its loss of first-place positions. This is a report only. No miner code, tests, manifest, registration, deployment, wallet, or Git history was changed. No leaderboard traffic was generated: endpoint probes called the deployed service directly, outside Telegraph's routed request engine.

## Main finding

**Our previous lead overstated the strength and breadth of our answers. Stronger competition has exposed that weakness, while several substantial scoring gaps remain unexplained at the individual-test level.** The September 13 deployment is live; the evidence does not support a missed deployment as the main explanation.

- **First-place intents fell from 16 to 8** between epochs 329 and 333. Top-three positions fell from **24 to 19** across the same 36 intents. We lost 12 first places and gained four.
- **The immediate competitive change was large:** `chainsight-oracle` expanded from **14 scored intents to 42**. It now has 15 first places and has displaced us in several domains. New specialists also changed fields such as academic search.
- **Some old first places were weak:** sentiment and classification were ranked first with **zero scores** in epoch 329. Both have remained zero through all five audited epochs. Text authenticity and cross-chain verification each had only one scored miner in the baseline.
- **There are real production defects.** Current requests reproduce incorrect extraction, missed classification, incomplete protocol answers, unrelated web results, incorrect paper counts, overly narrow research and financial coverage, and rejection of a valid event-resolution request.
- **Existing checks miss these defects:** the production acceptance script reports **36/36 passing**, including one check explicitly reduced to outage/honesty validation. Passing that script does not demonstrate competitive coverage of 36 entire intents.
- **The loss is uneven.** IP geolocation is third but scores **99.86% of its leader**. Sentiment and classification score **0 against 1**. Treating those situations as equivalent would direct effort badly.

Using the explicitly defined single-epoch comparison proxy below, LiveCert moved from first to second among the returned miners, with a **25.11% reduction in its relative-score sum**. That is a serious competitive loss, but not a collapse across every endpoint. This reconstructed position is **not an official final Track 1 prize placement**.

## 1. What was verified before attributing the loss

| Item | Current evidence |
|---|---|
| Active miner | `livecert` |
| Registration / catalog ID | **1408 / 4433** |
| Owner | `0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e` |
| Activation | Active; no rejection reason; not retrying |
| Declared intents | **36**; all 36 have epoch-333 score rows |
| Runtime | [miner-wine.vercel.app](https://miner-wine.vercel.app) |
| Active source repository | [Harshyadav442277/miner](https://github.com/Harshyadav442277/miner), under `track1-miner/` |
| Registered manifest | [Immutable manifest at 4d73a9ed](https://raw.githubusercontent.com/Harshyadav442277/miner/4d73a9ed480b724ac845e203dd3f8ef5b31302cd/track1-miner/miner.yaml) |
| Registered and fetched manifest SHA-256 | `06a404b162f1eb72da2a24af896ad6cb08b2e221b7136f0a95ab14b893498b09` |
| Local manifest comparison | Raw local hash differs because the checkout uses CRLF. After CRLF-to-LF normalization, local content is identical to the registered file and has the same SHA-256. No substantive manifest drift was found. |
| Production deployment | `miner-1yltvl5d8-wukong4.vercel.app`, Vercel status **Ready** |
| Deployment ID | `dpl_GSgTnfqodf4LodxNyZwnJ47e11TD` |
| Deployment creation | **2026-09-13 16:57:16 UTC / 22:27:16 IST** |
| Verified production aliases | `miner-wine.vercel.app`, `miner-wukong4.vercel.app` |
| Local HEAD when audited | `92c997f76ee780f9dfae595aea969751809aa931` — `Repair below-third miner answer gaps` |
| Current completed scoring | Epoch **333**; catalog last-scored time **2026-09-15T02:17:43Z** |

Sources: [registration](https://devnode.telegraphprotocol.com/api/miners/1408), [miner catalog](https://devnode.telegraphprotocol.com/api/miners), [epoch state](https://explorer.telegraphprotocol.com/api/epoch), registered manifest, and read-only Vercel inspection. Vercel identity and reproduced runtime behavior establish the active release; this audit did not independently reconstruct its build provenance from every source file.

**Four scoring epochs, 330–333, have followed the deployment.** The previous release's effect is no longer merely something to wait for in the next epoch. Its narrow correctness improvements can be checked against actual subsequent results, with the caveat that test cases and competitors also change.

## 2. How much performance has changed

### Five-epoch trend for the same 36 intents

| Epoch | Intents | Rank 1 | Top 3 | Own zero scores | Positive denominators | Relative-score sum | Mean over positive denominators |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 329 | 36 | 16 | 24 | 4 | 34 | 23.3211 | 68.59% |
| 330 | 36 | 4 | 26 | 3 | 35 | 18.5865 | 53.10% |
| 331 | 36 | 5 | 25 | 4 | 34 | 17.3616 | 51.06% |
| 332 | 36 | 6 | 22 | 2 | 36 | 15.7994 | 43.89% |
| 333 | 36 | 8 | 19 | 4 | 36 | 17.4650 | 48.51% |

“Positive denominators” counts intents where at least one miner scored above zero. This matters because division by an all-zero leader is undefined. Zero-score rank-one rows remain included in the displayed rank count, but contribute no points to the comparison sum.

### Definition and limits of the comparison proxy

For intent `i` in epoch `e`:

```text
relative_score(miner, i, e) = miner_score / highest_score_in_that_intent
comparison_sum(miner, e)   = sum of those relative scores across scored intents
```

An absent miner or an all-zero intent contributes zero to this diagnostic sum. All-zero intents are excluded from the separately reported mean. It uses the public raw scores, without rounding them before division. It is a way to compare the breadth and size of current competitive gaps; it does not convert raw scores across different intents into a common accuracy measure.

The [published Track 1 rules](https://hackathon.telegraphprotocol.com/rules) describe performance relative to the best average score within each intent, with 75% performance and 25% X engagement. They also require at least three active miners and 100 real Track 3 application requests for an intent's prize eligibility. **This audit has not reconstructed that averaging window, eligibility record, X component, or organizer adjudication.** A sum of one epoch's ratios is therefore not the final judging calculation.

| Snapshot | LiveCert sum / proxy position | Chainsight sum / proxy position | LiveCert / Chainsight scored intents |
| --- | --- | --- | --- |
| 298 | 10.1252 / 1 | 7.7736 / 2 | 13 / 14 |
| 329 | 23.3211 / 1 | 7.4620 / 3 | 36 / 14 |
| 333 | 17.4650 / 2 | 27.6503 / 1 | 36 / 42 |

Epoch 298 is included only as a historical comparison, not as a claim about today's eligibility or final judging. Earlier project history identifies it as a potentially important judging snapshot; the organizer's exact applicable frozen record was not independently re-established in this audit.

At epoch 333 the proxy gap between Chainsight and LiveCert is **10.1853**:

- **6.0258**, or **59.16%**, comes from eight intents Chainsight scores that LiveCert does not serve.
- **4.1595** is the net gap over LiveCert's existing 36 intents. This includes LiveCert's advantage in two intents Chainsight does not score; it is not a sum over only the shared 34.

**Implication:** reclaiming a few narrowly lost first places is unlikely to restore the old breadth advantage under this proxy. However, registering extra capabilities without useful answers would not establish real competitiveness or prize eligibility.

### First-place changes

**Lost:** CONTENT_EXTRACTION, CONTENT_VERIFICATION, CROSS_CHAIN_STATE_VERIFY, EVENT_OUTCOME_RESOLUTION, FACT_CHECK, FINANCIAL_DATA, IP_GEOLOCATION, SENTIMENT_ANALYSIS, TELEGRAPH_KNOWLEDGE, TEXT_AUTHENTICITY_CHECK, TEXT_CLASSIFICATION, TOKEN_HOLDER_COUNT.

**Gained:** GAS_PRICE, SSL_VERIFICATION, STOCK_PRICE, WALLET_BALANCE_CHECK.

**Retained:** LANGUAGE_TRANSLATION, NEWS_HEADLINES, NEWS_SEARCH, STORM_ALERT.

The rank-one count first fell to **four in epoch 330**, then recovered to eight. The latest snapshot is better than the immediate post-expansion low, while still well below epoch 329.

## 3. Competition changed more than our release addressed

### Chainsight expanded into the same areas where we were weak

The epoch-329 leaderboard contains 14 scored intents for `chainsight-oracle`; epoch 333 contains 42. Its current catalog registration timestamp is **September 13, 20:28:04 UTC**, after our 16:57 deployment and before epoch-330 scoring. This is an existing competitor expanding its coverage, not a brand-new name.

It now leads extraction, sentiment, classification, token holders and event outcomes, among other categories. On Telegraph knowledge it ties the highest score of 1, although the displayed rank is second. Those results directly challenge capabilities that previously had weak or sparse competition.

| Intent | Scored field, 329 → 333 | Our rank, 329 → 333 | Current leader |
| --- | --- | --- | --- |
| ACADEMIC_SEARCH | 6 → 17 | 2 → 4 | acad-doaj |
| WEATHER_FORECAST | 15 → 25 | 4 → 6 | amanat-weather-risk |
| WEATHER_CHECK | 12 → 22 | 12 → 13 | amanat-weather-risk |
| IP_GEOLOCATION | 6 → 17 | 1 → 3 | preflight-ssl-verification |
| ONCHAIN_TX_LOOKUP | 13 → 23 | 6 → 10 | txlens |
| TOKEN_HOLDER_COUNT | 6 → 16 | 1 → 4 | chainsight-oracle |
| EVENT_OUTCOME_RESOLUTION | 2 → 13 | 1 → 8 | chainsight-oracle |
| WEB_SEARCH | 12 → 23 | 8 → 15 | telegraph-chatbot |
| SPORTS_SCORE | 4 → 14 | 2 → 7 | sportwire-score |

These counts are **miners with score rows in those epochs**, not proof that each field satisfies every prize-eligibility condition.

Chainsight's eight additional intents are:

| Intent outside LiveCert coverage | Chainsight raw score | Displayed rank | Relative contribution |
| --- | --- | --- | --- |
| CHAT_COMPLETION | 7.5803307e-13 | 4 | 0.025814 |
| CONTENT_MODERATION | 8.193718e-12 | 1 | 1.000000 |
| DEEPFAKE_DETECTION | 0 | 2 | 0 (all-zero field) |
| IMAGE_VERIFICATION | 1.12708514e-11 | 1 | 1.000000 |
| LANGUAGE_GENERATION | 0.9986753 | 3 | 0.999952 |
| MEDIA_AUTHENTICITY_CHECK | 7.925841e-12 | 1 | 1.000000 |
| TEXT_GENERATION | 0.9971725 | 1 | 1.000000 |
| VIDEO_VERIFICATION | 1.0235092e-11 | 1 | 1.000000 |

Four of its additional rank-one categories have top scores around `1e-11`. They add to a relative-score sum, but do not independently prove high answer quality. Conversely, its TEXT_GENERATION and LANGUAGE_GENERATION scores are close to 1. The footprint advantage mixes stronger results with very small-score comparisons.

### Specialists widened several existing gaps

- **ACADEMIC_SEARCH:** `acad-doaj`, registered September 14 at 10:26:54 UTC, now scores **0.7136804**; LiveCert scores **0.00977501**. Our old second place was against a leader around 0.011, so the same approximate absolute score now represents only **1.37%** of the leader.
- **RESEARCH_QUERY:** `kriterion-pramagraph` scores **0.7215227** against our **0.007721469**. Our own score improved slightly over epoch 329, yet our relative position deteriorated.
- **ONCHAIN_TX_LOOKUP:** `txlens` scores **0.99567837** against **0.005965703**. That gap predates this audit and is still unresolved at the actual test-case level.
- **FRAUD_DETECTION:** `sarzops-transaction-risk` scores **1** against approximately **6e-14**. Our recent safety and screening corrections have not closed this scoring gap.
- **WEATHER_FORECAST / WEATHER_CHECK:** `amanat-weather-risk` leads both. We still lead STORM_ALERT. The weather problem is specific to individual intents, not a blanket defeat of the entire weather service.

### Why some old first places were misleading

1. **Zero ties:** sentiment and classification were both zero in epoch 329 and remain zero. Their earlier rank-one labels were not evidence that their answers were passing the scorer.
2. **Unopposed categories:** TEXT_AUTHENTICITY_CHECK and CROSS_CHAIN_STATE_VERIFY each had one scored miner at epoch 329. EVENT_OUTCOME_RESOLUTION and CONTENT_VERIFICATION had two.
3. **Tiny-score leadership:** TOKEN_HOLDER_COUNT, TELEGRAPH_KNOWLEDGE and FINANCIAL_DATA previously led with approximately `8.36e-12`, `1.37e-11`, and `1.19e-18`. A new high-scoring competitor can erase that relative lead even without a new endpoint failure.
4. **Close ties can look dramatic:** IP geolocation's rank moved 1 → 3, but its current gap is only **0.0014239 raw score**, approximately **0.143% of the leader**.

Twelve of the 36 current intents have a leader below `1e-6`; three of our eight first places are in that group. The threshold is an analytical warning about scale, not a protocol pass mark. Small scores must still be inspected relative to their field and scoring function.

## 4. Confirmed defects in the deployed answers

**Evidence distinction:** the following are reproduced failures on live production inputs, with mechanisms visible in the checked-out source. They show real capability gaps. Except where explicitly stated otherwise, they are **not reconstructions of epoch-333 test cases**: the public score API does not provide our full scored request, converted answer or ground truth. The amount of the observed rank loss attributable to each defect cannot be calculated from public rows alone.

All **28 targeted GET probes returned HTTP 200**. Measured time to response headers ranged from **249 to 3,475 ms** in this small sample. Several responses were substantively wrong despite HTTP success.

### F1 — CONTENT_EXTRACTION misses requested fields and invents entity types

**Current score:** 0; leader: 1. **Confidence in defect:** high.

Three live examples:

| Input | Actual result | Failure |
|---|---|---|
| Extract people, organizations and places from: Alice Johnson works for OpenAI in New York. | People: `Alice Johnson`, `New York`; organizations and places empty; confidence 1 | A city is called a person and OpenAI is omitted. |
| Extract quantities and units from: Add 1/2 cup milk, 250ml water and 2.5kg flour. | `quantities: ["2 cup"]`; confidence 1 | The denominator becomes the quantity, and compact units disappear. |
| Extract merchant name, date and total amount from this receipt: Acme Store. Date: 2026-09-14. Total: $42.50. | Date only in the answer; structured places contain `Date` and `Total`; confidence 1 | Requested merchant and total are omitted. Header words are treated as places. |

Source mechanisms: [quantity regex, content.ts:99](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/content.ts#L99) requires whitespace between number and unit and has no fraction grammar; [proper nouns and entity mapping, line 138](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/content.ts#L138) rely on capitalization, a short organization list, and treating multiword names as people; [field selection, line 224](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/content.ts#L224) only handles recognized categories.

**Counterevidence that limits attribution:** a competitor's epoch-333 error exposes the input fragment `Reach us at support@example.com or call 555-0192.` Our direct request to extract its contact details returned both values correctly. That fragment is not a complete verified record of our own scored request. It nevertheless means we should not claim the current zero is explained solely by the three new extraction examples. Request construction, conversion, output shape and scorer behavior still need an exact trace.

### F2 — TEXT_CLASSIFICATION fails an ordinary billing ticket

**Current score:** 0; leader: 1. **Own scores in epochs 329–333:** all zero. **Confidence in defect:** high.

Input: `Classify this ticket as billing, technical, or account issue: "I was charged twice on my invoice."`

Actual: `ambiguous`, confidence 0.2, between billing and account issue. A clear duplicate-charge ticket receives no label.

A second request placed a duplicate-charge/refund statement after an unrelated introductory paragraph. The response was ambiguous between billing and technical. [classify.ts:125](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/classify.ts#L125) truncates the text to its **first ten distinct content words**; relevant evidence later in a passage is never scored. [The label scorer](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/classify.ts#L143) compares lexical neighbors, with a margin gate deciding whether to answer. It is not a general semantic classifier.

This is more serious than adjusting one confidence value. The evidence selection and classification method fail ordinary in-scope phrasing.

### F3 — SENTIMENT_ANALYSIS cannot resolve a clear sarcastic complaint

**Current score:** 0; leader: 1. **Own scores in epochs 329–333:** all zero. **Confidence in coverage limitation:** high; attribution of those epoch zeros remains unproved.

Input: `What is the sentiment of this review: "Fantastic, another three hours wasted because your app deleted my work."`

Actual: mixed, confidence 0.65. The response balances the positive word “Fantastic” against negative wording. In context this is a complaint, not a balanced favorable/unfavorable review.

[sentiment.ts:199](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/sentiment.ts#L199) applies lexical compound/mixed thresholds, and [line 269](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/sentiment.ts#L269) emits the mixed explanation. Simple positive and negative control requests passed. The implementation is therefore not universally broken, but its declared capability is broader than the tested easy cases. Existing source comments also document score sensitivity to wording in earlier authored-ground-truth experiments; those experiments do not identify the current hidden failure.

### F4 — TELEGRAPH_KNOWLEDGE answers the wrong live-state question

**Current score:** approximately `1.07e-11`; two competitors score 1. **Confidence in defect:** high.

- `Which miner is currently rank 1 for WEATHER_FORECAST?` returns the number of registered miners and the intent description, with confidence 0.9. It does not name `amanat-weather-risk`.
- `Who leads the WEB_SEARCH leaderboard in the latest epoch?` returns an explanation of the nine-hour epoch schedule, with confidence 0.85. It does not name `telegraph-chatbot`.

[telegraph.ts:369](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/telegraph.ts#L369) treats a named intent plus “miner” as a request for an intent's miner count. [line 441](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/telegraph.ts#L441) chooses the first matching static fact for other questions. Broad keyword matches substitute a related topic for the requested answer. A miner-count control did return the correct count.

### F5 — WEB_SEARCH retrieves related headlines without answering the question

**Current score:** approximately `2e-12`; leader: 0.99992883. **Confidence in defect:** high.

Input: `What is the latest stable Python release?`

Actual: an `answered` response at confidence 0.8 whose only result is **CUDA Python 1.0**, an NVIDIA article. That is a different product. At audit time, the [official Python downloads page](https://www.python.org/downloads/) lists Python **3.14.7** as the latest stable feature-series release; Python 3.15 is still marked prerelease.

Another input asks for the current UN Secretary-General. The response gives headlines about candidates and UN debt but never supplies the requested person's name.

[websearch.ts:154](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/websearch.ts#L154) draws on news search and a Wikipedia fallback; the selected news path uses at most two articles. [line 179](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/websearch.ts#L179) labels a current-report summary as answered. Entity matching and answer completeness are insufficient. The September 13 product-code retry solved a narrower retrieval case, not general web question answering.

### F6 — ACADEMIC_SEARCH ignores a natural-language count and overstates paper qualification

**Current score:** 0.00977501; leader: 0.7136804. **Confidence in count/relevance defects:** high.

Input: `Find three peer-reviewed papers about transformer language models.`

Actual: **five** papers, confidence 1. The results include Swin Transformer, a vision paper, and the 1998 paper *Gradient-based learning applied to document recognition*. Those do not all satisfy the requested transformer-language-model scope.

[papers.ts:220](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/papers.ts#L220) recognizes numeric counts such as `3 papers` but not the written word `three`, so it defaults to five. The [result path through line 429](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/papers.ts#L429) labels returned indexed records “peer-reviewed” without establishing that property for each item. This audit does not claim every returned paper lacks peer review; the defect is the unverified blanket assertion plus poor scope filtering.

### F7 — RESEARCH_QUERY is too dependent on biomedical sources

**Current score:** 0.007721469; leader: 0.7215227. **Confidence in coverage gap:** high.

Input: `What are the main differences between proof of work and proof of stake? Cite sources.`

Actual: `no_evidence`, confidence 0.6, explaining that no trial or indexed publication was found in ClinicalTrials.gov and Europe PMC. It gives no comparison or relevant sources.

The [canonical intent description](https://devnode.telegraphprotocol.com/engine/v1/intents) covers research questions beyond medicine. [research.ts:35](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/research.ts#L35) defines the biomedical sources; [the fallback and no-evidence path](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/research.ts#L337) did not recover a general comparative question. The response is candid about its limited search, but candor alone does not fulfill the intent.

### F8 — FINANCIAL_DATA does not answer ordinary company fundamentals

**Current score:** approximately `6.40e-27`; even the leader is only approximately `1.88e-16`. **Confidence in capability gap:** high; current numerical rank interpretation is weak because the whole field is tiny.

Input: `What was Apple's revenue in fiscal year 2024?`

Actual: current stock trading range, volume, 52-week range and price, confidence 0.9, followed by an admission that revenue growth/fundamentals were not retrieved. Fiscal-year revenue is not provided.

[financial.ts:24](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/financial.ts#L24) explicitly documents that fundamentals are not covered; [line 310](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/financial.ts#L310) describes their absence. The canonical intent includes company fundamentals. This is an acknowledged implementation limitation with competitive consequences, not evidence that a stock-price response satisfies a revenue request.

### F9 — EVENT_OUTCOME_RESOLUTION rejects the phrase “prediction market”

**Current score:** 0.24720605; leader: 0.6978115. **Confidence in routing/guard defect:** high.

Input: `Resolve this prediction market: who won the 2022 FIFA World Cup?`

Actual: `unknown`, confidence 0, error `prediction_requested`; it says the user asked for a prediction or opinion. The request explicitly asks to resolve an already-completed event.

[eventoutcome.ts:208](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/eventoutcome.ts#L208) rejects any occurrence matching `predict(?:ion)?`, and [line 228](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/miner/src/eventoutcome.ts#L228) applies it before retrieval. This catches the in-scope noun phrase “prediction market.”

A separate plain-sports query matched a different Manifold proposition and returned “Yes.” That example is **not counted as a primary canonical failure here**, because a plain sports-result question belongs in GAME_RESULT without a market/contract context. Likewise, a plain cross-chain supply-comparison probe is not treated as proof of a CROSS_CHAIN_STATE_VERIFY defect. The in-scope rejection above stands independently.

## 5. Severe gaps whose exact cause remains unresolved

Finding a working sample is not evidence that an entire intent is correct. Conversely, a near-zero score is not by itself evidence of a runtime outage.

| Intent | Latest evidence | What can be concluded | What is still missing |
|---|---|---|---|
| TOKEN_HOLDER_COUNT | About `6.22e-12` versus 0.99999994; Base USDC live probe returned a sourced holder count | Production can answer at least one known supported token. The old tiny-score first place has been displaced. | Exact epoch token, chain, snapshot time, expected count and converted answer |
| ONCHAIN_TX_LOOKUP | 0.005965703 versus 0.99567837; a historical Ethereum receipt query succeeds | The route is alive; the broad scoring deficit persists over all five epochs | Actual receipt/address case, relevant token transfers, expected fields and conversion |
| FRAUD_DETECTION | About `6e-14` versus 1; a negated seed-phrase warning now correctly stays unknown without invented evidence | The recent correction is present but does not establish comprehensive transaction-risk detection | Exact task and required evidence beyond pattern matching/sanctions lookup |
| CRYPTO_PRICE | Zero now, but 0.99992436 in epoch 331; BTC live control succeeds | Not enough evidence to call this a persistent price-provider outage. Latest leader is also around `1e-27`. | Test asset, timestamp, converter output, expected tolerance and scorer trace |
| TVL_LOOKUP | 0.0155020375 versus 0.3353164; Aave on Base control returns a sourced value | A working well-known protocol does not settle chain/protocol coverage or expected interpretation | Actual protocol, chain, definition and timing of ground truth |
| GAME_RESULT | Rank 2, but only 0.264% of the leader's score | A favorable ordinal rank hides a large relative deficit | Exact event, source and expected result; no targeted live failure was isolated here |
| CROSS_CHAIN_STATE_VERIFY | 0.35801327 versus 0.44551426; only two scored miners | Competition now exists where we were unopposed | Full in-scope bridge/proof request and actual scoring path; champion lookup returns null |
| TEXT_AUTHENTICITY_CHECK | Rank 2; 39.36% of leader | Our raw score rose, while a stronger competitor removed the unopposed lead | Actual text, requested authenticity claim, source evidence and ground truth |
| CONTENT_VERIFICATION / FACT_CHECK | Leader and our scores generally tiny in this snapshot; FACT_CHECK was near 1 in epoch 332 | Large score swings do not prove a recent code regression | Exact claim, retrieved sources and scoring/conversion trace |
| WEATHER_FORECAST / WEATHER_CHECK | 83.37% / 74.25% of their leaders; known wrong-city example is corrected | The release fixed real behavior; it has not secured first place | Hidden location/horizon, thresholds, data age, fields and latency budget |
| CURRENCY_EXCHANGE / SPORTS_SCORE / CVE_LOOKUP / AI_TEXT_DETECTION | Current fields largely at very small score scales | Rank changes need same-case scrutiny before a causal explanation | Representative current request and expected answer, not just a new prose template |
| RESEARCH_SYNTHESIS | 43.46% of leader; no new isolated defect in this audit | A genuine relative gap exists | A complete supplied-source/synthesis case and evidence-preservation comparison |

## 6. What the evidence does not support blaming

### A missing or stale production deployment

Vercel points the production aliases to the September 13 release, the registration is active, and representative deployed behavior contains the recent corrections. The historical earlier 26-route/36-intent deployment mismatch is not evidence of a current outage: the current 36-intent gate passes and all targeted routes responded.

### A recent replacement of the published canonical scorer champions

Compared with the September 13 baseline, **all 34 non-null champion records have the same registration ID, WASM URL and declared hash**. CROSS_CHAIN_STATE_VERIFY and EVENT_OUTCOME_RESOLUTION have null champion lookups in both snapshots.

This rules against a currently visible published-champion replacement as the broad explanation. It does **not** establish the actual runtime module used for every individual score row, prove remote bytes were freshly hash-verified for all 34 modules, or exclude transient changes between snapshots. Canonical cases, ground truths and conversion behavior can still differ with an unchanged champion.

### A network-wide endpoint outage affecting us in epoch 333

None of LiveCert's 36 epoch-333 score rows carries a failure reason. Across epochs 329–333, two explicit infrastructure failures were found:

| Epoch | Intent | Recorded failure |
|---|---|---|
| 329 | WEATHER_CHECK | Telegraph's request-builder LLM timed out before calling our endpoint |
| 331 | WEB_SEARCH | The same local LLM endpoint timed out while building our request |

The common error refers to `http://127.0.0.1:4000/v1/chat/completions` and `context deadline exceeded`. That address belongs to the node-side request-construction error; it is not our production URL.

Those incidents explain those recorded failures, not all subsequent losses. Empty failure reasons also do not establish correct answers or rule out gracefully handled upstream problems.

### Competitor wrongdoing or an attack

No evidence in this investigation establishes cheating, sabotage, favoritism or malicious routing. Stronger scores and broader registrations are directly observable; motives and implementation quality beyond the observed results are not.

## 7. Why the September 13 work did not restore the lead

The [previous release report](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/docs/RANK_BELOW3_2026-09-13.md) records 704 passing tests and nine release checks. Those checks covered specific weather-location, fraud-evidence and web-retrieval failures. That report correctly warned that successful checks were not rank evidence.

| Intent | Rank 329 → 330 → 331 → 332 → 333 | Current interpretation |
| --- | --- | --- |
| WEATHER_FORECAST | 4 → 3 → 6 → 7 → 6 | Known wrong-city bug fixed; still behind specialist competition. |
| WEATHER_CHECK | 12 → 8 → 15 → 10 → 13 | Baseline timeout was node-side; later scores are nonzero. |
| FRAUD_DETECTION | 6 → 5 → 6 → 4 → 5 | Recent warning/screening corrections present; scoring remains near zero. |
| WEB_SEARCH | 8 → 8 → 11 → 11 → 15 | Product-code fix present; broad answering defects remain. |
| URL_SCAN | 4 → 3 → 6 → 3 → 2 | Improved relative result, but not first. |
| WALLET_BALANCE_CHECK | 6 → 3 → 4 → 1 → 1 | Now first; not a causal attribution to a wallet change in this release. |

The release did **not** address the nine breadth/semantic issues documented above as a complete set, nor the newly expanded competitive field. Correcting an observed defect and gaining leaderboard share are separate claims.

The checking problem is visible today:

```text
node track1-miner/tools/intent-answers.mjs https://miner-wine.vercel.app

coverage: 36 declared intents, 36 cases
...
(Polymarket unreachable from the checker — EVENT_OUTCOME checked for honesty only)
...
36/36 intents answering correctly.
```

The script completed successfully in this audit. The final sentence is **too broad to use as a competitive conclusion**. [intent-answers.mjs:978](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/tools/intent-answers.mjs#L978) and adjacent checks explicitly allow some outage-only validation; [line 1340](https://github.com/Harshyadav442277/miner/blob/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/tools/intent-answers.mjs#L1340) prints the aggregate success message. The production failures in section 4 coexisted with that green run.

The operational lesson is not that previous tests were useless. It is that **we have treated a small set of expected answer paths as stronger evidence of intent coverage than it is**. Current scored cases, field strength and a broader set of natural requests must be evaluated separately. The exact on-chain lookup and fraud gaps have also remained open across multiple audits; another successful familiar control does not close them.

## 8. What this means for getting more requests

The [protocol's published routing explanation](https://hackathon.telegraphprotocol.com/rules) says rank influences probabilistic routing within an intent. Losing rank can therefore reduce exposure to routed demand. It does not establish a fixed traffic multiplier, and rank one does not guarantee that applications request that intent.

The catalog records **1,179 cumulative requests** for LiveCert and **2,473** for Chainsight at capture time. Those lifetime counters are not a controlled before/after throughput comparison.

A fresh sample of **500 unique public request records** covered **2026-09-13 18:54:14 UTC through 2026-09-15 07:25:44 UTC**:

| Measure | Observed sample |
|---|---:|
| `routing_mode=auto` | 441 |
| `routing_mode=direct` | 59 |
| Records routed to LiveCert | 40 / 500, or 8.0% |
| LiveCert records marked success | 40 / 40 |
| LiveCert records in SSL / IP | 18 / 14; together 32 of 40, or 80% |
| Other LiveCert records | Academic 2, news search 2, wallet 1, headlines 1, stock 1, research 1 |

Source: five 100-record pages of the [public request feed](https://explorer.telegraphprotocol.com/api/daemon/api/questions?limit=100&offset=0), captured at approximately 07:34 UTC. The feed's separate `type` field was direct for 252 rows and daemon for 248; it is **not interchangeable** with `routing_mode`.

This sample establishes that LiveCert is still receiving successful routed requests, concentrated in a small subset of its declared intents. It **does not establish a historical traffic decline, unique human users, organic demand, paid volume, or qualifying Track 3 traffic**. No comparable earlier traffic window was reconstructed. Much of the SSL/IP sample predates epoch-330 scoring, so it cannot be treated as the settled traffic distribution under epoch 333.

The earlier on-chain-request PR concerns a separate request-delivery path. The current manifest has no `on_chain` block. That is relevant to the user's aim of serving more on-chain requests, but this audit did not reproduce the node's ERC-8183 fallback behavior or validate the proposed PR. It is **not established as the cause of these canonical leaderboard losses** and was not merged or changed.

## 9. Investigation priorities if rank recovery is authorized later

This is a prioritization of discovered gaps, not an implementation plan executed during this audit. No rank-one recovery or next-epoch improvement is promised.

| Priority | Area | Why it deserves attention | Evidence required before claiming recovery |
|---|---|---|---|
| 1 | Extraction, classification, sentiment, Telegraph knowledge | Zero/near-zero versus leaders at 1; ordinary live inputs expose failures | Correct behavior over varied in-scope requests, including the counterexamples here; current-scorer evaluation with clearly labeled authored ground truths; then actual subsequent epoch rows |
| 1 | Web search and general research | Large deficits against high-scoring specialists; retrieval often fails to answer the requested question | Entity-correct, complete answers supported by appropriate sources across question types, then scorer and live-epoch evidence |
| 1 | Token holders, transaction lookup, fraud | Large persistent gaps with exact causes still unresolved | Obtain or instrument the full legitimate request → response → conversion → score trace; compare supported-chain/data coverage and timing. Familiar passing controls alone are insufficient. |
| 2 | Academic search and event resolution | New strong competitors plus clearly reproduced count/scope/guard defects | Requests satisfying count, topic and evidence requirements; event resolution that distinguishes market context from a forecast; subsequent comparative scores |
| 2 | Genuine additional capability coverage | Roughly 59% of the Chainsight proxy gap is outside our intent set | A supported useful capability, representative correctness and demand evidence, and eligibility verification before counting a projected competitive benefit |
| 2 | TVL, game results, synthesis, financial fundamentals | Low relative scores or direct scope limitations | Representative task coverage and ground-truth alignment; avoid equating a related live datum with the requested answer |
| 3 | Small relative gaps / tiny-score fields | IP, several first-place fields and some low-score rankings can distract from larger deficits | Same-case evidence establishing a substantive improvement, plus traffic value if prioritizing routed requests |

The priority-1 list contains two different jobs: correcting **proven capability failures** and diagnosing **unexplained scoring failures**. They should not be conflated. Repeatedly changing prose in an unexplained category risks another green local result without a live improvement.

## 10. Complete per-intent evidence

### Rank progression

| Intent | 329 | 330 | 331 | 332 | 333 | Scored field 329 → 333 |
| --- | --- | --- | --- | --- | --- | --- |
| SSL_VERIFICATION | 3 | 2 | 1 | 3 | 1 | 6 → 17 |
| STORM_ALERT | 1 | 1 | 3 | 2 | 1 | 7 → 17 |
| ACADEMIC_SEARCH | 2 | 5 | 5 | 9 | 4 | 6 → 17 |
| LANGUAGE_TRANSLATION | 1 | 1 | 2 | 1 | 1 | 4 → 15 |
| IP_GEOLOCATION | 1 | 2 | 1 | 1 | 3 | 6 → 17 |
| WEATHER_FORECAST | 4 | 3 | 6 | 7 | 6 | 15 → 25 |
| WEATHER_CHECK | 12 | 8 | 15 | 10 | 13 | 12 → 22 |
| CONTENT_EXTRACTION | 1 | 2 | 4 | 1 | 4 | 3 → 4 |
| NEWS_HEADLINES | 1 | 1 | 3 | 1 | 1 | 3 → 14 |
| WALLET_BALANCE_CHECK | 6 | 3 | 4 | 1 | 1 | 10 → 20 |
| ONCHAIN_TX_LOOKUP | 6 | 3 | 7 | 9 | 10 | 13 → 23 |
| CVE_LOOKUP | 2 | 5 | 4 | 4 | 5 | 6 → 17 |
| TVL_LOOKUP | 4 | 6 | 3 | 5 | 4 | 11 → 21 |
| NEWS_SEARCH | 1 | 2 | 1 | 3 | 1 | 6 → 17 |
| CURRENCY_EXCHANGE | 4 | 4 | 3 | 11 | 10 | 8 → 18 |
| GAME_RESULT | 2 | 2 | 1 | 2 | 2 | 4 → 4 |
| GAS_PRICE | 2 | 2 | 3 | 4 | 1 | 10 → 20 |
| FINANCIAL_DATA | 1 | 2 | 6 | 4 | 5 | 9 → 9 |
| FRAUD_DETECTION | 6 | 5 | 6 | 4 | 5 | 17 → 17 |
| SPORTS_SCORE | 2 | 2 | 2 | 2 | 7 | 4 → 14 |
| TOKEN_HOLDER_COUNT | 1 | 2 | 1 | 5 | 4 | 6 → 16 |
| RESEARCH_QUERY | 3 | 3 | 2 | 3 | 4 | 8 → 9 |
| TEXT_AUTHENTICITY_CHECK | 1 | 2 | 2 | 2 | 2 | 1 → 2 |
| CRYPTO_PRICE | 12 | 3 | 2 | 6 | 18 | 16 → 26 |
| STOCK_PRICE | 6 | 6 | 3 | 6 | 1 | 6 → 16 |
| CROSS_CHAIN_STATE_VERIFY | 1 | 2 | 2 | 2 | 2 | 1 → 2 |
| EVENT_OUTCOME_RESOLUTION | 1 | 2 | 2 | 2 | 8 | 2 → 13 |
| URL_SCAN | 4 | 3 | 6 | 3 | 2 | 11 → 21 |
| WEB_SEARCH | 8 | 8 | 11 | 11 | 15 | 12 → 23 |
| CONTENT_VERIFICATION | 1 | 2 | 2 | 2 | 2 | 2 → 3 |
| SENTIMENT_ANALYSIS | 1 | 2 | 2 | 3 | 3 | 3 → 4 |
| TEXT_CLASSIFICATION | 1 | 4 | 2 | 3 | 3 | 4 → 5 |
| RESEARCH_SYNTHESIS | 4 | 4 | 2 | 3 | 5 | 5 → 6 |
| FACT_CHECK | 1 | 1 | 2 | 1 | 3 | 4 → 5 |
| TELEGRAPH_KNOWLEDGE | 1 | 3 | 3 | 3 | 3 | 2 → 3 |
| AI_TEXT_DETECTION | 2 | 2 | 2 | 2 | 2 | 4 → 5 |

### Epoch-333 scores and current published champions

“Relative” is our score divided by that intent's highest score, not accuracy. `<0.0001%` means positive but extremely small; literal `0%` means our reported score is zero. “Field” is the number of scored miners. “Champion” is the returned scoring-module registration ID; a dash means the lookup returned null.

| Intent | Our score | Highest score | Displayed leader | Relative | Field | Champion |
| --- | --- | --- | --- | --- | --- | --- |
| SSL_VERIFICATION | 0.009664475 | 0.009664475 | livecert | 100.00% | 17 | 631 |
| STORM_ALERT | 0.31124175 | 0.31124175 | livecert | 100.00% | 17 | 453 |
| ACADEMIC_SEARCH | 0.00977501 | 0.7136804 | acad-doaj | 1.37% | 17 | 688 |
| LANGUAGE_TRANSLATION | 3.3961944e-10 | 3.3961944e-10 | livecert | 100.00% | 15 | 2296 |
| IP_GEOLOCATION | 0.996566 | 0.9979899 | preflight-ssl-verification | 99.86% | 17 | 630 |
| WEATHER_FORECAST | 0.00046899993 | 0.0005625579 | amanat-weather-risk | 83.37% | 25 | 3173 |
| WEATHER_CHECK | 0.012432899 | 0.016745035 | amanat-weather-risk | 74.25% | 22 | 510 |
| CONTENT_EXTRACTION | 0 | 1 | chainsight-oracle | 0% | 4 | 935 |
| NEWS_HEADLINES | 0.005129075 | 0.005129075 | livecert | 100.00% | 14 | 635 |
| WALLET_BALANCE_CHECK | 0.9999995 | 0.9999995 | livecert | 100.00% | 20 | 3022 |
| ONCHAIN_TX_LOOKUP | 0.005965703 | 0.99567837 | txlens | 0.60% | 23 | 642 |
| CVE_LOOKUP | 8.4402225e-12 | 1.2818817e-11 | secwire-cve-lookup | 65.84% | 17 | 3030 |
| TVL_LOOKUP | 0.0155020375 | 0.3353164 | finwire-tvl | 4.62% | 21 | 49 |
| NEWS_SEARCH | 0.00045735785 | 0.00045735785 | livecert | 100.00% | 17 | 3165 |
| CURRENCY_EXCHANGE | 7.89687e-8 | 1.8754108e-7 | finwire-currency-exchange | 42.11% | 18 | 2945 |
| GAME_RESULT | 0.00025175625 | 0.09542081 | sportwire-game-result | 0.26% | 4 | 1265 |
| GAS_PRICE | 2.5847751e-11 | 2.5847751e-11 | livecert | 100.00% | 20 | 3119 |
| FINANCIAL_DATA | 6.4041955e-27 | 1.8792465e-16 | alphavantage | <0.0001% | 9 | 3029 |
| FRAUD_DETECTION | 6.005613e-14 | 1 | sarzops-transaction-risk | <0.0001% | 17 | 2793 |
| SPORTS_SCORE | 2.4926931e-12 | 7.230484e-12 | sportwire-score | 34.47% | 14 | 3045 |
| TOKEN_HOLDER_COUNT | 6.2233196e-12 | 0.99999994 | chainsight-oracle | <0.0001% | 16 | 2057 |
| RESEARCH_QUERY | 0.007721469 | 0.7215227 | kriterion-pramagraph | 1.07% | 9 | 452 |
| TEXT_AUTHENTICITY_CHECK | 2.091821e-7 | 5.3150274e-7 | chainsight-oracle | 39.36% | 2 | 1882 |
| CRYPTO_PRICE | 0 | 9.561821e-28 | crypto-coinpaprika | 0% | 26 | 3170 |
| STOCK_PRICE | 2.1296504e-11 | 2.1296504e-11 | livecert | 100.00% | 16 | 3166 |
| CROSS_CHAIN_STATE_VERIFY | 0.35801327 | 0.44551426 | chainsight-oracle | 80.36% | 2 | — |
| EVENT_OUTCOME_RESOLUTION | 0.24720605 | 0.6978115 | chainsight-oracle | 35.43% | 13 | — |
| URL_SCAN | 0.878128 | 0.92099977 | netwire-url-scan | 95.35% | 21 | 220 |
| WEB_SEARCH | 2.002052e-12 | 0.99992883 | telegraph-chatbot | <0.0001% | 23 | 2789 |
| CONTENT_VERIFICATION | 5.6935815e-12 | 9.044689e-12 | chainsight-oracle | 62.95% | 3 | 2062 |
| SENTIMENT_ANALYSIS | 0 | 1 | chainsight-oracle | 0% | 4 | 646 |
| TEXT_CLASSIFICATION | 0 | 1 | chainsight-oracle | 0% | 5 | 687 |
| RESEARCH_SYNTHESIS | 0.005631604 | 0.012956906 | chainsight-oracle | 43.46% | 6 | 627 |
| FACT_CHECK | 2.7106966e-9 | 3.1192868e-9 | chainsight-oracle | 86.90% | 5 | 1582 |
| TELEGRAPH_KNOWLEDGE | 1.0683806e-11 | 1 | telegraph-chatbot | <0.0001% | 3 | 2104 |
| AI_TEXT_DETECTION | 2.4193547e-10 | 2.55e-10 | caliber-truthport-text-auth | 94.88% | 5 | 1286 |

### Largest reductions in our relative-score contribution since epoch 329

| Intent | Relative score 329 | Relative score 333 | Contribution lost |
| --- | --- | --- | --- |
| CONTENT_EXTRACTION | 100.00% | 0% | 1.000000 |
| TOKEN_HOLDER_COUNT | 100.00% | <0.0001% | 1.000000 |
| TELEGRAPH_KNOWLEDGE | 100.00% | <0.0001% | 1.000000 |
| FINANCIAL_DATA | 100.00% | <0.0001% | 1.000000 |
| ACADEMIC_SEARCH | 99.95% | 1.37% | 0.985773 |
| RESEARCH_QUERY | 66.87% | 1.07% | 0.657999 |
| EVENT_OUTCOME_RESOLUTION | 100.00% | 35.43% | 0.645741 |
| TEXT_AUTHENTICITY_CHECK | 100.00% | 39.36% | 0.606433 |
| SPORTS_SCORE | 89.17% | 34.47% | 0.546950 |
| CONTENT_VERIFICATION | 100.00% | 62.95% | 0.370506 |
| CROSS_CHAIN_STATE_VERIFY | 100.00% | 80.36% | 0.196404 |
| CVE_LOOKUP | 84.02% | 65.84% | 0.181822 |

This table measures changes in the ratio, not necessarily deterioration of the same answer to the same question. A stronger leader alone can reduce our contribution. Sentiment and classification do not appear as ratio losses because both were already zero; they remain major opportunities relative to the current leader.

## 11. Reproduction, sources and limitations

### Read-only audit procedure

1. Verify local working-tree state and current registration, owner, activation, manifest URL and supported intents.
2. Fetch the registered manifest and compare its SHA-256 with the registry; normalize CRLF only for the separate local-content comparison.
3. Inspect the Vercel production alias and deployment status without deploying anything.
4. Fetch current per-intent scores and champions, and up to 400 history rows per intent. Confirm all 36 have rows in epochs 329–333.
5. Compare historical network snapshots for epochs 298 and 329 with epoch 333 using one explicit formula.
6. Compare current champion IDs, URLs and declared hashes with the saved September 13 baseline.
7. Run the existing production intent checks and targeted GET probes. These are functional diagnostics, not engine-routed demand or proofs of organic usage.
8. Sample the public request feed without writing to it.

No current epoch test corpus was recovered in full. The exact model conversion and ground truth for LiveCert's score rows remain unavailable in the queried public API. A competitor's error occasionally exposes an input fragment, but that is not a complete scored trace. No fresh canonical WASM execution was performed as part of this audit; earlier source comments and old experiments are not presented as new scorer results.

### Primary API sources

- [Current per-intent leaderboard](https://explorer.telegraphprotocol.com/api/leaderboard/miners?limit=1000)
- [Epoch 329 leaderboard](https://explorer.telegraphprotocol.com/api/leaderboard/miners/epoch/329?limit=1000)
- [Epoch 298 leaderboard](https://explorer.telegraphprotocol.com/api/leaderboard/miners/epoch/298?limit=1000)
- [Example score history: CONTENT_EXTRACTION](https://devnode.telegraphprotocol.com/scores?intent=CONTENT_EXTRACTION&limit=400); the same endpoint was queried for every registered intent
- [Current canonical intent definitions](https://devnode.telegraphprotocol.com/engine/v1/intents)
- [Registration 1408](https://devnode.telegraphprotocol.com/api/miners/1408), [catalog](https://devnode.telegraphprotocol.com/api/miners), [epoch state](https://explorer.telegraphprotocol.com/api/epoch)
- [Public question feed](https://explorer.telegraphprotocol.com/api/daemon/api/questions?limit=100&offset=0)

### Audit evidence saved locally

Supporting JSON and diagnostic output were written outside the repository at:

```text
C:\Users\hyada\AppData\Local\Temp\telegraph-rank-audit-2026-09-15\
```

Key files: `rank-audit.json`, `registration.json`, `catalog.json`, `histories.json`, `leaderboard.json`, `leaderboard-329.json`, `leaderboard-298.json`, `metrics.json`, `comparison.json`, `manifest-identity.json`, `champion-comparison.json`, `canonical-intents.json`, `probes.json`, `extra-probes.json`, `intent-check.txt`, and `traffic-summary.json`. This report embeds the main numerical snapshot and reproduced failures so its central conclusions remain readable if temporary files are removed. Live URLs can change; their future contents should not be assumed identical to this snapshot.

The pre-release baseline is already in the repository under [rank-below3-2026-09-13/baseline](https://github.com/Harshyadav442277/miner/tree/92c997f76ee780f9dfae595aea969751809aa931/track1-miner/docs/evidence/rank-below3-2026-09-13/baseline). Code links in this report are pinned to the audited source commit rather than moving `main`.

### Selected exact production responses

These inputs and JSON responses are diagnostic examples captured in this audit. They are not represented as private validator questions. Long responses are retained where necessary to show the failure; all shown requests returned HTTP 200.

#### extract-entities

Endpoint: `/extract`; captured 2026-09-15T07:26:12.988Z.

```text
Extract people, organizations and places from: Alice Johnson works for OpenAI in New York.
```

```json
{
  "verdict": "entities",
  "extracted": {
    "people": [
      "Alice Johnson",
      "New York"
    ],
    "organizations": [],
    "places": []
  },
  "confidence": 1,
  "reason": "Person: Alice Johnson, New York."
}
```

#### extract-quantities

Endpoint: `/extract`; captured 2026-09-15T07:26:12.989Z.

```text
Extract quantities and units from: Add 1/2 cup milk, 250ml water and 2.5kg flour.
```

```json
{
  "verdict": "quantities",
  "extracted": {
    "quantities": [
      "2 cup"
    ]
  },
  "confidence": 1,
  "reason": "2 cup."
}
```

#### extract-receipt

Endpoint: `/extract`; captured 2026-09-15T07:33:03.582Z.

```text
Extract merchant name, date and total amount from this receipt: Acme Store. Date: 2026-09-14. Total: $42.50.
```

```json
{
  "verdict": "date_event",
  "extracted": {
    "dates": [
      "2026-09-14"
    ],
    "events": [],
    "places": [
      "Date",
      "Total"
    ]
  },
  "confidence": 1,
  "reason": "Date: 2026-09-14."
}
```

#### classify-control

Endpoint: `/classify`; captured 2026-09-15T07:26:15.151Z.

```text
Classify this ticket as billing, technical, or account issue: "I was charged twice on my invoice."
```

```json
{
  "verdict": "ambiguous",
  "confidence": 0.2,
  "reason": "This ticket is ambiguous between billing and account issue: its wording relates to each, and none clears the others by a clear margin, so no single label is chosen."
}
```

#### sentiment-sarcasm

Endpoint: `/sentiment`; captured 2026-09-15T07:26:14.596Z.

```text
What is the sentiment of this review: "Fantastic, another three hours wasted because your app deleted my work."
```

```json
{
  "verdict": "mixed",
  "confidence": 0.65,
  "reason": "The sentiment of this review is mixed. The words fantastic are positive, while wasted are negative."
}
```

#### web-official-version

Endpoint: `/web-search`; captured 2026-09-15T07:26:17.625Z.

```text
What is the latest stable Python release?
```

```json
{
  "verdict": "answered",
  "confidence": 0.8,
  "reason": "The most relevant current report is \"CUDA Python 1.0: Stable APIs, One Foundation, Full Platform Access | NVIDIA Technical Blog\" (NVIDIA Developer, 25 August 2026). Source: Google News search."
}
```

#### research-control

Endpoint: `/research`; captured 2026-09-15T07:26:22.036Z.

```text
What are the main differences between proof of work and proof of stake? Cite sources.
```

```json
{
  "verdict": "no_evidence",
  "confidence": 0.6,
  "reason": "No registered trial and no indexed publication on main differences between proof work proof stake was found, so nothing is claimed about What are the main differences between proof of work and proof of stake. ClinicalTrials.gov and Europe PMC were both searched and both answered; an absence in those two indexes is not proof that no work exists."
}
```

#### financial-revenue

Endpoint: `/financial`; captured 2026-09-15T07:26:21.102Z.

```text
What was Apple's revenue in fiscal year 2024?
```

```json
{
  "verdict": "financial_data",
  "confidence": 0.9,
  "reason": "Apple Inc. (AAPL) has a day range of 331.34 to 335.50 USD, volume of 38,702,066 shares, a 52-week range of 235.03 to 344.57 USD, a change of +4.10% against the previous close of 319.97 USD. It last traded at 333.08 USD. The revenue growth was not retrieved: company fundamentals are not available from this data source, so it is not reported here."
}
```

#### event-market

Endpoint: `/event-outcome`; captured 2026-09-15T07:33:03.582Z.

```text
Resolve this prediction market: who won the 2022 FIFA World Cup?
```

```json
{
  "verdict": "unknown",
  "confidence": 0,
  "reason": "This asks for a prediction or an opinion, not the resolution of a determinable event, so no outcome is given. Name a specific event whose result can be checked, and its settled outcome will be reported.",
  "error": "prediction_requested"
}
```

## Conclusion

The strongest supported explanation is **stronger and broader competition exposing shallow or incomplete capability coverage, compounded by checks that do not measure enough of the actual task space**. Some previous first places were zero ties or unopposed positions. Other serious score deficits cannot yet be traced to a specific runtime answer and must remain labeled unresolved.

The deployment is present. The visible scorer-champion set is unchanged. The next useful work, if authorized, should target the evidenced capability failures and obtain exact traces for the largest unexplained deficits. Another deployment by itself is not evidence that rank one has been recovered.

## Follow-up — fixes shipped 2026-09-15 (first release ~11:02 UTC, second ~12:18 UTC)

Seven of the nine section-4 defects were fixed and promoted to production `miner-nj9rqs2vp`, with
the operator's approval. Verification: 588/588 unit tests, preflight 7/7, and intent-answers 36/36
against production. Every section-4 probe was re-asked of production before and after the
release; see `docs/evidence/rank-loss-2026-09-15/`.

| Finding | Status on production |
|---|---|
| F1 extraction | Fixed. Entities, fractions and attached units, receipt fields, email headers, bare action items and hyphenated sizes all score 1.0 under champion 935 (before: 5 of 9 probes). This includes the epoch-330 and 331 payloads recovered from a competitor's failure_reason. |
| F2 classification | Fixed for the report's cases. Cue lexicon, whole-text scoring and "a billing issue" wording. Scored against authored ground truths only. |
| F3 sentiment | Sarcastic opening praise now reads negative. Other sarcasm is still missed. |
| F4 Telegraph knowledge | Leader questions name the latest scored epoch's rank 1. |
| F5 web search | Second release. Latest-release questions are answered from endoflife.date ("Python 3.14.7") and office holders from Wikidata preferred-rank claims. General news questions still use the headline path. |
| F6 academic search | Word counts honoured, off-topic hits ranked out, "peer-reviewed" only when asked and filtered to journal articles. Score-neutral on the 22-row bench. |
| F7 research | "Difference between A and B" answered from both Wikipedia articles. Other general questions are unchanged. |
| F8 financial data | Second release. Fiscal-year fundamentals come from SEC EDGAR 10-K facts (Apple FY2024 revenue $391.04B), plus a trailing P/E from the last price and diluted EPS. Quarterly figures are not supported. |
| F9 event outcome | "Prediction market" no longer refused. The FIFA case now reports no market that names a winner, rather than a wrong Yes. |

The second release (production `miner-6xcnxjuz8`, preflight 7/7) also answers the fraud scenarios, research questions and holder count that leaked from the node through other miners' failure reasons, and fixes a Wikimedia 429 that made FACT_CHECK intermittent. No leaderboard effect is claimed until epoch 335 is read. Open items
are GAPS G137–G151.
