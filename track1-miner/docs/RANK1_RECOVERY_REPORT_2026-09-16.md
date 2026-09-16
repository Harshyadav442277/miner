# LiveCert: every losing intent and the path to more rank-1 positions

**Snapshot:** 16 September 2026, 03:02–03:06 UTC / 08:32–08:36 IST. **Latest scored epoch: 335.**

**Current result: 7/36 rank 1, 21/36 top three, and 29/36 not first.** Of those 29, **28 have a strictly lower score than the leader**; SENTIMENT_ANALYSIS is an all-zero field whose ordinal tie-breaking was not established. Ten of the 29 have leaders below `1e-6`, so a close percentage there is not evidence of strong answer quality.

The best next investment is **fixing demonstrated parsing and coverage failures, then measuring whether those improvements survive Telegraph's conversion and scoring**. Another round of narrow wording edits cannot plausibly close all the gaps. Several broad intents currently use a small collection of regexes or domain-specific sources that do not cover the intent.

This report covers **every registered Track 1 intent that is not first**, including ties and infrastructure failures. It does not rank unregistered intents or Track 2 scripts. It proposes work; no runtime code, registration, deployment or wallet state was changed. The audit made 32 direct diagnostic requests to our production service, outside the routed engine.

## 1. Verified state and what changed after the last release

| Item | Evidence |
|---|---|
| Miner | `livecert`, catalog ID `4433` |
| Registration | `1408`, active; owner `0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e` |
| Coverage | All 36 locally declared intents match the registration and have epoch-335 rows |
| Registered manifest | [Commit-pinned YAML](https://raw.githubusercontent.com/Harshyadav442277/miner/4d73a9ed480b724ac845e203dd3f8ef5b31302cd/track1-miner/miner.yaml) |
| SHA-256 | `06a404b162f1eb72da2a24af896ad6cb08b2e221b7136f0a95ab14b893498b09`; fetched bytes match; local content matches after CRLF normalization |
| Runtime probed | [miner-wine.vercel.app](https://miner-wine.vercel.app) |
| Source checkout | `4efd8c5`; working tree was clean before this audit |
| Epoch-335 scoring window | 15 September, 19:53:29–20:24:02 UTC, after the **documented** second release at approximately 12:18 UTC |
| Cross-check | All 36 catalog ranks/scores and leaders agree with the separately fetched `/scores` rows |
| Next epoch at capture | 336, scheduled for 16 September 04:50:16 UTC / 10:20:16 IST; this is a schedule, not a verified result |

Production behavior was checked directly. The exact Vercel deployment ID was not independently re-inspected in this audit; the deployment timeline above comes from the repository's September 15 release record.

| Epoch | Rank 1 | Top three | Our zero scores | Our rows with failure reasons |
|---|---:|---:|---:|---:|
| 333 | 8 | 19 | 4 | 0 |
| 334 | 11 | 22 | 6 | 3 |
| 335 | 7 | 21 | 4 | 1 |

Relative to epoch 333, **CONTENT_EXTRACTION and CRYPTO_PRICE entered first place**; **NEWS_HEADLINES, GAS_PRICE and STOCK_PRICE left it**. Extraction moved from zero to `1.0` after the repair. That is encouraging temporal evidence, not a controlled proof that deployment alone caused the change. Questions and competitors also change.

**Protect these seven current first places:** SSL_VERIFICATION, STORM_ALERT, LANGUAGE_TRANSLATION, CONTENT_EXTRACTION, WALLET_BALANCE_CHECK, NEWS_SEARCH and CRYPTO_PRICE. LANGUAGE_TRANSLATION's winning score is only `2.073144e-10`; being first there does not establish high absolute quality. SSL's winning score is `0.008698722`.

The September 15 release did **not** establish rank recovery for classification, research, web search, financial data or Telegraph knowledge. Their remaining issues below are current, not a restatement of already-fixed billing, extraction or annual-revenue bugs.

## 2. Complete list of intents where we are not first

`% leader = our score / leader score × 100`, within this epoch and intent only. It is not accuracy, probability of winning, or the official cross-intent judging formula. Denominators count **scored miners in this epoch**, not all registered/active miners. Scores retain their raw scale so tiny differences are visible.

| Intent | Rank / field | Our score | Rank-1 miner | Leader score | % leader |
|---|---:|---:|---|---:|---:|
| ACADEMIC_SEARCH | 11 / 17 | 0.008926418 | acad-doaj | 0.45327702 | 1.97% |
| AI_TEXT_DETECTION | 2 / 6 | 2.4193547e-10 | caliber-truthport-text-auth | 2.55e-10 | 94.88% |
| CONTENT_VERIFICATION | 2 / 3 | 3.2193222e-12 | chainsight-oracle | 1.1908337e-11 | 27.03% |
| CROSS_CHAIN_STATE_VERIFY | 2 / 2 | 0.37803778 | chainsight-oracle | 0.44918525 | 84.16% |
| CURRENCY_EXCHANGE | 8 / 18 | 1.1072443e-7 | fxex-frankfurter-currencies | 1.0842995e-6 | 10.21% |
| CVE_LOOKUP | 5 / 17 | 1.10793215e-11 | sentinelvault-cve | 1.4551575e-11 | 76.14% |
| EVENT_OUTCOME_RESOLUTION | 2 / 13 | 0.22171375 | chainsight-oracle | 0.3326033 | 66.66% |
| FACT_CHECK | 3 / 15 | 3.8054e-9 | chainsight-oracle | 3.956889e-9 | 96.17% |
| FINANCIAL_DATA | 5 / 19 | 3.0199148e-27 | kriterion-pramagraph | 1.7427014e-15 | 1.733e-10% |
| FRAUD_DETECTION | 3 / 17 | 5.4482176e-14 | chainsight-oracle | 1 | 5.448e-12% |
| GAME_RESULT | 10 / 14 | 3.9403025e-5 | game-mlb-schedule | 0.750381 | 0.00525% |
| GAS_PRICE | 2 / 20 | 2.1596138e-11 | kriterion-pramagraph | 2.2218227e-11 | 97.20% |
| IP_GEOLOCATION | 14 / 17 | 0.011061581 | ipgeo-ipinfo | 0.9979013 | 1.11% |
| NEWS_HEADLINES | 4 / 14 | 0.002776922 | news-spaceflight | 0.0036858812 | 75.34% |
| ONCHAIN_TX_LOOKUP | 7 / 23 | 0.010015826 | veyctum | 0.995202 | 1.01% |
| RESEARCH_QUERY | 3 / 9 | 0.008210735 | chainsight-oracle | 0.99779797 | 0.82% |
| RESEARCH_SYNTHESIS | 4 / 6 | 0.0020954788 | chainsight-oracle | 0.011448731 | 18.30% |
| SENTIMENT_ANALYSIS | 2 / 4 | 0 | telegraph-ai-miner-node | 0 | Undefined: all zero |
| SPORTS_SCORE | 9 / 14 | 1.6527115e-12 | sports-mlb-schedule | 6.562595e-12 | 25.18% |
| STOCK_PRICE | 7 / 16 | 0 | alphavantage | 5.3265043e-14 | 0% |
| TELEGRAPH_KNOWLEDGE | 2 / 3 | 1.1757792e-11 | chainsight-oracle | 1 | 1.176e-9% |
| TEXT_AUTHENTICITY_CHECK | 2 / 2 | 2.091821e-7 | chainsight-oracle | 5.4601134e-7 | 38.31% |
| TEXT_CLASSIFICATION | 4 / 5 | 0 | chainsight-oracle | 1 | 0% |
| TOKEN_HOLDER_COUNT | 3 / 16 | 5.281597e-12 | chainsight-oracle | 6.9963636e-12 | 75.49% |
| TVL_LOOKUP | 3 / 21 | 0.014204451 | kriterion-pramagraph | 0.47008258 | 3.02% |
| URL_SCAN | 11 / 21 | 0 | netwire-url-scan | 0.9025795 | 0% |
| WEATHER_CHECK | 16 / 22 | 0.012629155 | chainsight-oracle | 0.015276573 | 82.67% |
| WEATHER_FORECAST | 2 / 25 | 0.00051460735 | amanat-weather-risk | 0.0005251178 | 98.00% |
| WEB_SEARCH | 15 / 23 | 1.4467808e-12 | sentinel-risk-oracle | 0.9999441 | 1.447e-10% |

Source: [saved rank audit](evidence/rank1-plan-2026-09-16/rank-audit.json), [independent score histories and failure summary](evidence/rank1-plan-2026-09-16/summary.json). The public [catalog](https://devnode.telegraphprotocol.com/api/miners) and [epoch leaderboard](https://explorer.telegraphprotocol.com/api/leaderboard/miners/epoch/335?limit=1000) were captured locally.

## 3. Order of work to pursue the most first places

These are engineering priorities based on reproduced failures, shared implementation work and observed ability to win. They are **not estimated win probabilities**. S/M/L are relative scope, not promised delivery times.

| Order | Work | Intents addressed | Scope | Why this order / stop condition |
|---:|---|---|---|---|
| 0 | Establish an honest scoring baseline; classify node failures separately | All 36; URL_SCAN immediately | S | A node timeout cannot be fixed by changing threat detection. Keep exact epoch, scorer and release identity. |
| 1 | Repair IP parsing and headline count/time constraints | IP_GEOLOCATION, NEWS_HEADLINES | S–M | Both won recently and both have fresh, deterministic defects. Reproduce and close the defects before any prose experiment. |
| 2 | Repair shared fixture parsing and competition coverage; then reuse verified event results | GAME_RESULT, SPORTS_SCORE, EVENT_OUTCOME_RESOLUTION | M | One demonstrated fixture parser failure affects two intents. Official result lookup can also remove the market-only limitation in event resolution. |
| 3 | Correct entity/source selection and historical/period handling | FACT_CHECK, CURRENCY_EXCHANGE, FINANCIAL_DATA | M | Fresh probes expose wrong reference articles, an ignored historical FX date, and an unanswered quarter. Ranking upside is uncertain in their low-score regimes. |
| 4 | Build a reusable, source-grounded retrieval and answer layer | WEB_SEARCH, RESEARCH_QUERY, RESEARCH_SYNTHESIS, ACADEMIC_SEARCH; protocol-specific use for TELEGRAPH_KNOWLEDGE | L | These five losses share inadequate retrieval, relevance or answer synthesis. Several leaders score near 1 while we remain near zero. |
| 5 | Add semantic decision capability, with constrained labels and evidence | TEXT_CLASSIFICATION, FRAUD_DETECTION, SENTIMENT_ANALYSIS | M–L | More keyword patches will keep missing negation, multiple labels and paraphrases. Classification and fraud have strong current leaders; sentiment currently has no positive leader. |
| 6 | Diagnose exact unresolved scope/numeric gaps before expensive changes | ONCHAIN_TX_LOOKUP, TVL_LOOKUP, CROSS_CHAIN_STATE_VERIFY | M–L | Worth a bounded investigation, but the epoch's actual request/answer/ground truth is unavailable. Cross-chain proof verification is a substantial capability addition. |
| 7 | Maintain provider correctness; limit wording experiments | WEATHER_FORECAST, WEATHER_CHECK, GAS_PRICE, CVE_LOOKUP, TOKEN_HOLDER_COUNT, STOCK_PRICE, AI_TEXT_DETECTION, TEXT_AUTHENTICITY_CHECK, CONTENT_VERIFICATION | S diagnostic; larger changes only with evidence | Small ranks and tiny score ratios can be misleading. Require a reproduced gap and a useful benchmark before committing a larger build. |

**First concrete target:** stabilize the seven current wins, repair the five intents in orders 1–2, and obtain a valid URL_SCAN result. These are six additional recovery candidates, **not a forecast of 13 wins**. Then use the retrieval and semantic work to pursue the large deficits. No evidence currently supports promising 18+, 25+, or 36/36 rank 1.

## 4. Per-intent diagnosis, fixes and acceptance evidence

**Evidence labels:** **Reproduced** means observed on production in this audit. **Code limitation** means verified in the current source. **Unresolved** means the cause of the live score is not established. Even a reproduced defect is not necessarily the cause of the hidden epoch-335 failure.

All probe IDs below refer to [probes.json](evidence/rank1-plan-2026-09-16/probes.json), which preserves complete inputs, responses and timestamps.

### ACADEMIC_SEARCH

**Rank 11; 1.97% of leader. Code limitation / unresolved scored gap.** Yesterday's count fix is working: `papers-count` returned three articles. That does not explain the score gap. The service labels them peer-reviewed based on journal-article filtering, which does not independently establish review status. Relevance and coverage remain hypotheses to measure, not a proven epoch cause.

**Fix:** evaluate a second scholarly metadata source; preserve exact topic, dates, requested count, publication type and identifiers. Rank by query relevance before citations, deduplicate versions by DOI, and qualify peer-review claims. [Crossref's documented metadata filters](https://www.crossref.org/documentation/retrieve-metadata/rest-api/rest-api-filters/) support date and type constraints; evaluate its actual usefulness alongside the current source rather than assuming a provider swap wins.

**Acceptance:** blind relevance review across biomedical and non-biomedical queries; requested counts or explicit shortfalls; no invented metadata. Benchmark the same requests against the live leader with independently sourced references. Files: [papers.ts](../miner/src/papers.ts). **Priority 4; rank effect unproven.**

### AI_TEXT_DETECTION

**Rank 2; 94.88% of a `2.55e-10` leader. Unresolved.** Epoch 334 was first, but both current scores are extremely small. The current implementation measures style features; no fresh defect was reproduced here.

**Fix:** prioritize false-positive evaluation over stronger authorship claims. Add a calibrated detector only if held-out human, edited, translated and generated text shows a material benefit; retain an inconclusive result where appropriate. Keep the answer's conclusion and measured evidence consistent.

**Acceptance:** independently labelled test data, reported false-positive rate and calibration, then current-champion comparison. Do not turn a stylistic heuristic into certainty to move a tiny score. File: [aidetect.ts](../miner/src/aidetect.ts). **Priority 7; weak rank opportunity evidence.**

### CONTENT_VERIFICATION

**Rank 2; 27.03% of a `1.19e-11` leader. Code limitation / unresolved.** The implementation supports supplied digests, two supplied text versions, and Wikipedia/Wikisource matching. That is narrow coverage for verifying arbitrary published content.

**Fix:** support comparison against a specified authoritative reference document, with safe fetching and explicit normalization rules. Return the exact changed spans; distinguish a hash match from proof that the publisher is authentic. Keep unavailable references separate from detected alteration.

**Acceptance:** unchanged/altered pairs, whitespace/encoding changes, misleading references, and unavailable-source cases. No new verification backend was tested here. Files: [contentverify.ts](../miner/src/contentverify.ts), [contentverify-text.ts](../miner/src/contentverify-text.ts). **Priority 7; capability gain plausible, rank gain unknown.**

### CROSS_CHAIN_STATE_VERIFY

**Rank 2/2; 84.16% of leader. Code limitation.** This is LayerZero V2 receipt/message checking, not general state-root, Merkle-Patricia or block-header proof verification. `crosschain-scope` correctly refuses the unsupported category; the request did not contain an actual proof and is not a failed cryptographic verification.

**Fix:** first determine which proof/message family is actually required. For supported messages, test both source/destination identities, emitted packet fields and finality. Expand to one explicitly specified proof family only with trusted-root selection and real verification, not an indexer's status renamed as proof validation.

**Acceptance:** known-valid and mutated proofs/messages, wrong chain, wrong root, wrong emitter, incomplete delivery and reorg/finality cases. Public `/api/wasm` returned no champion for this intent; establish its scoring path before claiming a benchmark win. File: [crosschain.ts](../miner/src/crosschain.ts). **Priority 6; substantial scope, not a cheap second-place flip.**

### CURRENCY_EXCHANGE

**Rank 8; 10.21% of leader. Reproduced.** `currency-historical` asks for **2024-01-02**, but production converts using the reference rate dated **2026-09-15**. It discloses the date, yet still answers the wrong period.

**Fix:** parse and honor explicit dates, separate historical/reference/live rates, preserve base/quote direction and amount, and define weekend/holiday handling visibly. [Frankfurter documents historical-date queries](https://frankfurter.dev/); test the selected provider and publication-date behavior before integration.

**Acceptance:** recorded historical rates with independent verification, weekend gaps, inverted pairs and non-unit amounts. Do not rewrite useful attribution to optimize micro-differences. File: [currency.ts](../miner/src/currency.ts). **Priority 3; definite correctness gain, uncertain scoring gain.**

### CVE_LOOKUP

**Rank 5; leader only `1.455e-11`. Unresolved.** Current champion is 3030. Repository measurements found high sensitivity to numeric mismatch; those experiments were not rerun in this audit. An earlier constructed benchmark failed to reproduce a known competitor's high score, so it is unsuitable as a release gate.

**Fix:** audit CVSS version, scoring authority, vector, affected versions and record status on actual failing requests. Name conflicting CNA/NVD values and their sources. Add regression cases for rejected, disputed, reserved and keyword-search requests; distinguish missing records from provider failure.

**Acceptance:** show a real factual or request-shape defect, then reproduce a known scoring result before claiming score improvement. Do not choose an incorrect CVSS value to imitate a hidden reference. Files: [cve.ts](../miner/src/cve.ts), [cve-program.ts](../miner/src/cve-program.ts), [cvekeyword.ts](../miner/src/cvekeyword.ts). **Priority 7.**

### EVENT_OUTCOME_RESOLUTION

**Rank 2; 66.66% of leader. Reproduced coverage gap.** `event-known` asks who won the 2022 FIFA World Cup. Production returns `no_market_found`. Removing the old prediction-market rejection did not make this query answerable.

**Fix:** add authoritative event-result lookup independent of whether Polymarket/Manifold has a suitable market. Resolve the actual event, date, named outcome and, where applicable, the contract's resolution conditions. Use a market's final resolution only when that is the question being asked. Reuse the repaired sports result layer for sports events.

**Acceptance:** named winner, draw, cancelled/unsettled event, wrong-year near-match and conflicting market/official criteria. Public champion lookup returned null here too; verify the scoring mechanism separately. File: [eventoutcome.ts](../miner/src/eventoutcome.ts). **Priority 2; useful rank candidate with real missing coverage.**

### FACT_CHECK

**Rank 3; 96.17% of a `3.96e-9` leader. Reproduced.** `fact-bats` selects *The Blind Watchmaker*; `fact-sharks` selects *Shark attack* and returns a contradiction although the supplied excerpt does not establish the taxonomic claim. Yesterday's Wikimedia availability fix did not fix evidence selection.

**Fix:** resolve the claim's subject first, retrieve evidence about the asserted relation, then test support/contradiction. Reject evidence that only shares words. Prefer a canonical subject page or primary reference before broad text search, and retain an unverified outcome when the evidence does not settle the claim.

**Acceptance:** a held-out set of positive, false, negated and ambiguous claims, with the exact supporting span checked independently. No unsupported verdicts. File: [factcheck.ts](../miner/src/factcheck.ts). **Priority 3; proven evidence-quality defect, uncertain low-score rank gain.**

### FINANCIAL_DATA

**Rank 5; our `3.02e-27` versus leader `1.74e-15`. Reproduced coverage gap.** Annual Apple revenue now works. `financial-quarter` asks Q2 2024 and receives FY2024 figures, with a final quarterly-unavailable disclaimer. The current period selector explicitly drops 10-Q data. Price divided by the latest annual EPS is also not necessarily a current trailing-twelve-month P/E.

**Fix:** add explicit fiscal-quarter and period selection; distinguish discrete-quarter versus year-to-date duration facts, and compute growth from comparable periods. Preserve units, filing/source and period in the response. Support true TTM EPS before labelling a ratio TTM; otherwise state the actual annual denominator. SEC documents company facts and annual/quarterly data, including the calendar-versus-company-period caveat. [SEC API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)

**Acceptance:** several companies with different fiscal calendars, annual/quarterly/TTM requests and restatements; figures checked against the filing. Files: [fundamentals.ts](../miner/src/fundamentals.ts), [financial.ts](../miner/src/financial.ts). **Priority 3; do not expect first place from annual-only support.**

### FRAUD_DETECTION

**Rank 3; `5.45e-14` versus leader 1. Reproduced.** `fraud-card` describes ten purchases in five minutes across two countries and receives `no_subject`. `fraud-benign-negation` triggers irrelevant account-takeover advice despite explicit verified vendor/payment context. The September 15 scenarios cover a finite pattern list.

**Fix:** distinguish transaction/card activity, invoice fraud, account takeover, phishing and on-chain risk before assessment. Model negation, actor, chronology and corroboration; cite the actual described indicators. A tested semantic classifier or constrained reasoning component is a better candidate than endlessly growing regexes. Keep factual lookups separate from inference.

**Acceptance:** paired suspicious/benign variants, paraphrases, negated red flags and missing context; measure false positives and abstentions. Authored scorer benchmarks are development evidence only. Files: [fraudscenario.ts](../miner/src/fraudscenario.ts), [fraud.ts](../miner/src/fraud.ts). **Priority 5; large observable gap, meaningful rebuild.**

### GAME_RESULT

**Rank 10; `0.0000394` versus leader `0.750381`. Reproduced.** `game-known` supplies Argentina, France, competition and the date, yet returns `no_fixture`. The team regex requires the entire right-hand segment to fit 40 characters **before** removing competition/date suffixes. International competition coverage is also limited. Epoch 334 was rank 1, so this endpoint can win some requests.

**Fix:** separate team names, competition, date and query scaffolding before bounded validation. Resolve teams to provider IDs, support the requested competition, and require the exact fixture/status match. Include long but valid suffixes and ordinary alternative phrasing. Report penalty shootouts separately from regulation/extra-time scores where applicable.

**Acceptance:** the failing request plus independent long queries, multiple fixtures between the same teams, wrong competition, draw, penalties and postponed games. File: [gameresult.ts](../miner/src/gameresult.ts). **Priority 2; high confidence in the parsing fix, no proof it caused epoch 335.**

### GAS_PRICE

**Rank 2; 97.20% of a `2.22e-11` leader. Unresolved.** It was first in epochs 333–334. The current ordinal gap is tiny in absolute terms; historical repository experiments show high sensitivity to sampled numeric values.

**Fix:** keep chain and units exact; distinguish base fee, priority fee and total suggested fee, identify the observed block/time, and test RPC fallback. Diagnose only if a real request shows the wrong quantity, chain or stale result. Do not spend a large iteration budget on near-zero wording differences.

**Acceptance:** same-block comparison to independent RPC evidence, unit conversions and failure handling; repeated live epochs afterward. File: [gas.ts](../miner/src/gas.ts). **Priority 7; opportunistic win, weak evidence for a controllable first-place fix.**

### IP_GEOLOCATION

**Rank 14; 1.11% of leader, down from rank 1 in epoch 334. Reproduced.** `ip-loopback-v6`, “Where is ::1 located?”, returns unparseable. Source inspection shows boundary-dependent IPv6 extraction even though loopback classification already exists. Public IPv4 and a public IPv6 control both answered successfully, so a total provider outage is not supported.

**Fix:** tokenize candidate addresses and validate with a real IP parser; cover compressed IPv6, brackets and question-only versus structured input. Preserve known special-range semantics. Compare operator/ASN/place across providers only on actual disagreements; distinguish anycast infrastructure from a precise user location. Review unnecessary prefixes on short queries against the current scorer.

**Acceptance:** compressed/expanded IPv6, `::1`, `::`, bracketed literals, private/documentation ranges, public controls and provider outage. Do not reapply the already-shipped ISP-over-service-name fix. File: [geo.ts](../miner/src/geo.ts). **Priority 1; definite defect, exact epoch cause unresolved.**

### NEWS_HEADLINES

**Rank 4; 75.34% of leader. Reproduced.** `headlines-topic` requests **three** spaceflight headlines from the **last 24 hours**. Production returns **six**, including one from September 13, while describing them as today's headlines. The code recognizes only numeric counts after selected words and slices the feed before time filtering.

**Fix:** parse numeric and word counts, honor the explicit publication window and timezone, filter/deduplicate/relevance-rank before limiting, and disclose a shortfall instead of filling with older items. Use publication timestamps in the response's actual claim.

**Acceptance:** three versus 3, yesterday versus last 24 hours, topic/geography constraints, future timestamps and fewer-than-requested valid results. Preserve NEWS_SEARCH behavior when sharing code. File: [news.ts](../miner/src/news.ts). **Priority 1; one of the clearest bounded fixes.**

### ONCHAIN_TX_LOOKUP

**Rank 7; 1.01% of leader. Unresolved.** Unlike epoch 334's request-builder failure, epoch 335 has no published failure reason. Earlier authored-ground-truth tests scored our answer highly without explaining the poor live score. That mismatch must not be repackaged as proof of a particular defect.

**Fix:** obtain/reconstruct legitimate failing request shapes and inspect chain, receipt status, sender/recipient, native value versus token transfers, token decimals, block time and finality. Verify structured-input precedence. Add decoding only for demonstrated missing transaction types. Avoid another blanket answer-order change without a valid benchmark.

**Acceptance:** independently verified successful/reverted/pending transactions, native and token transfers on several supported chains, plus a benchmark that reproduces a known competitor crossing. File: [onchain.ts](../miner/src/onchain.ts). **Priority 6; promising immutable facts, missing diagnosis.**

### RESEARCH_QUERY

**Rank 3; 0.82% of leader. Reproduced, serious domain error.** `research-general` asks how **Raft achieves distributed-system consensus**. Production answers about a **RAFT eye-treatment trial** and **lipid-raft Alzheimer's research**, with confidence 0.9. The proof-of-work/proof-of-stake comparison control works, showing yesterday's narrow comparison branch is present.

**Fix:** classify the question's domain and preserve full entity/context before retrieval. Require sources to address the asked relation, not just the shared term. Add general research retrieval and cited answer construction; medical trial registries should only serve biomedical requests. Validate every substantive conclusion against an identified passage.

**Acceptance:** homonyms across domains, conceptual/explanatory/comparative questions, citations that actually support the answer, and explicit insufficient-evidence cases. File: [research.ts](../miner/src/research.ts). **Priority 4; source routing must improve before prose tuning.**

### RESEARCH_SYNTHESIS

**Rank 4; 18.30% of leader. Reproduced coverage gap.** `synthesis-general` asks for multiple-source tradeoffs between proof of work and proof of stake; the service searches PubMed/Europe PMC and returns no sources. Source code assembles abstract sentences and explicitly avoids drawing a combined conclusion about agreement.

**Fix:** share domain-aware retrieval with research, then synthesize supported agreements, disagreements and limitations with claim-level citations. Keep supplied-notes requests distinct: honor their source boundary and do not add outside material when prohibited.

**Acceptance:** at least two genuinely independent relevant sources, supported comparative conclusions, contradictory-source cases, and exact note attribution. Files: [synthesis.ts](../miner/src/synthesis.ts), [synthesis-sources.ts](../miner/src/synthesis-sources.ts). **Priority 4; a list of abstracts is not sufficient for the full intent.**

### SENTIMENT_ANALYSIS

**Rank 2, but every miner scores zero. Reproduced correctness defect; no positive leader.** `sentiment-irony` returns **positive** for “I just love being charged twice and ignored by support,” while its own explanation says the tone is frustrated. A straightforward negative control works. The opening-praise sarcasm patch is too narrow.

**Fix:** evaluate compositional sentiment across the whole passage, with sarcasm, negation and aspect-specific conflict. Ensure verdict and explanation agree. Compare the current rules with a measured semantic classifier; do not extend confidence beyond its calibration.

**Acceptance:** blinded paraphrases, quoted versus structured text, mixed aspects, sarcasm and neutral statements. A zero-to-zero rank shuffle is not success; require positive valid scoring as well as correctness. File: [sentiment.ts](../miner/src/sentiment.ts). **Priority 5, after classification/fraud if model work is shared.**

### SPORTS_SCORE

**Rank 9; leader `6.56e-12`. Reproduced shared failure.** `sports-known` rejects the same fully specified Argentina–France fixture as GAME_RESULT. Both routes use the same fixture layer, so one parser improvement has two potential benefits.

**Fix:** apply the shared team/competition/date repair, then preserve this intent's separate live-versus-most-recent preference. Clearly identify match state and the relevant score type; do not select a completed game when the user asks about a currently live fixture.

**Acceptance:** live, final, upcoming and postponed fixtures; identical teams on different dates; penalties/extra time; provider failure. Files: [sportsscore.ts](../miner/src/sportsscore.ts), [gameresult.ts](../miner/src/gameresult.ts). **Priority 2 because the work is shared; absolute scoring remains weak.**

### STOCK_PRICE

**Rank 7, zero; leader only `5.33e-14`. Unresolved.** No published failure reason. `stock-historical` successfully returns a historical closing-price answer with an explicit date, so neither a total endpoint outage nor absent historical support is demonstrated. The quote value itself was not independently verified in this audit.

**Fix:** inspect actual failures for ticker/company collisions, currency/exchange, historical date, adjusted versus unadjusted close, regular versus extended session, and timezone. Add a same-time independent quote check and preserve source timestamps. A request for a future price cannot be answered as a known fact.

**Acceptance:** multi-exchange symbols, stock splits, market-closed dates and current/historical request pairs; a real diagnosed regression before provider replacement. File: [stockprice.ts](../miner/src/stockprice.ts). **Priority 7.**

### TELEGRAPH_KNOWLEDGE

**Rank 2; `1.18e-11` versus leader 1. Unresolved scored gap.** Both current probes work: the endpoint names the correct epoch-335 WEB_SEARCH leader and explains the scoring pipeline. Recommending yesterday's “include the leader's name” fix again would be stale. Most remaining knowledge responses come from regex-selected fact paragraphs.

**Fix:** build a versioned corpus of official protocol documentation, with topic retrieval and concise answers grounded in the relevant source. Continue reading dynamic registry, ranking and epoch state live. Test multipart questions and vocabulary outside existing regexes. Treat genuinely off-topic routing as a routing issue, not an excuse to invent protocol facts.

**Acceptance:** a diverse protocol-question set with source citations and independently checked dynamic answers; recover the actual scored trace if available before attributing the near-zero row. File: [telegraph.ts](../miner/src/telegraph.ts). **Priority 4, with an initial diagnostic spike rather than an assumed rewrite.**

### TEXT_AUTHENTICITY_CHECK

**Rank 2/2; 38.31% of a `5.46e-7` leader. Code limitation / unresolved.** Current source searches selected text shingles mainly against Wikipedia, so missing a match cannot establish originality. No fresh failed provenance case was reproduced here. Champion 1882 belongs to the project's earlier Track 2 work; keep evaluation independent of that implementation.

**Fix:** widen source discovery to appropriate accessible corpora, verify full-passage overlap and attribution, and distinguish quotation, common phrases, copying and unsupported provenance. Route explicit AI-authorship questions to their separate, calibrated assessment.

**Acceptance:** known copied passages from outside Wikipedia, attributed quotations, common phrases, paraphrases and original controls. Report searched coverage and uncertainty. File: [authenticity.ts](../miner/src/authenticity.ts). **Priority 7; useful coverage expansion, unproven rank return.**

### TEXT_CLASSIFICATION

**Rank 4; zero versus leader 1. Reproduced.** The billing control is fixed. However, `classify-intent` cannot distinguish “Do not cancel my subscription; I only need to update my card.” `classify-multilabel` returns only technical for a request explicitly asking all applicable labels on billing and technical problems.

**Fix:** respect single-label versus multi-label instructions and use whole-passage semantics, including negation and requested taxonomy. Constrain outputs to supplied labels; preserve arbitrary label sets rather than adding only canned families. Preserve selected labels explicitly through response serialization while checking converter impact—the current generic `lean()` drops structured label fields.

**Acceptance:** held-out taxonomies, negated intents, paraphrases, multiple valid labels, quoted versus structured input and ambiguous cases. Files: [classify.ts](../miner/src/classify.ts), [handler.ts](../miner/src/handler.ts). **Priority 5; adding more ticket cue words alone is insufficient.**

### TOKEN_HOLDER_COUNT

**Rank 3; 75.49% of a `7e-12` leader. Unresolved.** It was first in epoch 334. Current competitor error output exposes a Base chain/address pair, but neither our actual request nor a ground truth; do not assume the other miner's converted parameters were correct. The holder implementation relies on explorer-specific counts, with documented disagreement between indexes.

**Fix:** validate chain plus contract identity, count definition, freshness and top-holder denominator. Keep bridged/native tokens separate. Introduce failover only after checking that both providers count the same population; never substitute a supply figure or zero for an unavailable count.

**Acceptance:** canonical tokens across supported chains, unknown contract/chain combinations, index lag and concentration calculations. File: [holders.ts](../miner/src/holders.ts). **Priority 7; prior win and tiny scale argue against a blind provider swap.**

### TVL_LOOKUP

**Rank 3; only 3.02% of leader. Unresolved.** `tvl-chain` successfully answers Aave's Base subtotal, so that already-fixed scope is not the next proposed fix. The live score remains far below a leader scoring `0.470083`.

**Fix:** capture failing requests and distinguish protocol TVL, chain subtotal, pool TVL and token trading liquidity. Check whether the requested number is one pool, an aggregate or historical. Use canonical IDs; label partial pool discovery and avoid claiming a sampled maximum is the global deepest pool. Keep units and timestamp visible.

**Acceptance:** independently checked representatives of each scope, historical requests and ambiguous names; compare true answers under champion 49 with a validated reference set. File: [tvl.ts](../miner/src/tvl.ts). **Priority 6; substantial potential gap, no demonstrated current root cause.**

### URL_SCAN

**Rank 11, zero. Confirmed platform failure for this epoch.** The actual failure is `build request for miner "livecert": LLM call for miner "livecert" failed: context deadline exceeded`. This occurs before a call to our endpoint. In epoch 334 we scored `0.9664245`, rank 3, about 97.82% of that leader; the current direct safe-domain control also responds normally.

**Fix:** first obtain a successful scoring request and compare recent valid results. Preserve the timeout evidence for a platform issue. Investigate schema/request-builder complexity only if recurrence supports it; immutable manifest changes create operational work and are not justified by this one row. Content changes must target separate demonstrated scan failures.

**Acceptance:** a later complete epoch with no request-builder failure, plus safe/malicious/unknown fixture checks. No “fix” to [urlscan.ts](../miner/src/urlscan.ts) can guarantee elimination of the node's LLM timeout. **Priority 0; recovery candidate, not a proven miner-code regression.**

### WEATHER_CHECK

**Rank 16, yet 82.67% of leader. Unresolved.** Our score is back to roughly its epoch-333 level after epoch 334's scorer-runtime failure. The entire current field is low (`0.015277` best); ordinal position alone exaggerates the numerical deficit.

**Fix:** test that current-condition queries use current data rather than a daily forecast, with exact location, time, units and freshness. Audit the endpoint's shared WEATHER_CHECK/WEATHER_FORECAST dispatch and alert versus observation handling. Improve upstream availability without silently substituting a different weather quantity.

**Acceptance:** explicit current-hour, timezone boundary, coordinates, same-named cities and stale-source cases. Wrong-city and first-provider retry fixes are already shipped. Files: [currentweather.ts](../miner/src/currentweather.ts), [weather-upstream.ts](../miner/src/weather-upstream.ts), [handler.ts](../miner/src/handler.ts). **Priority 7 unless a new defect is reproduced.**

### WEATHER_FORECAST

**Rank 2; 98.00% of leader, but leader only `0.000525118`. Unresolved.** This is the closest positive numerical deficit, not proof of the easiest meaningful win. Epochs 334–335 are both second.

**Fix:** bound an experiment around exact forecast start/end, local timezone, hourly versus daily aggregation, precipitation units and wind/gust distinction. Compare equivalent data windows against the leader's served facts where accessible. Add failover only if it supplies the measurements the answer actually needs; preserve STORM_ALERT's current win.

**Acceptance:** independent forecast-window fixtures and current-champion tests with verified references, followed by multiple live epochs. Do not invent conditions or imitate an erroneous refusal to cross a scoring threshold. Files: [forecast.ts](../miner/src/forecast.ts), [weather-upstream.ts](../miner/src/weather-upstream.ts). **Priority 7; small bounded experiment, not a major rewrite.**

### WEB_SEARCH

**Rank 15; `1.45e-12` versus leader `0.999944`. Reproduced coverage gap.** Current-version questions now answer, but `web-official` cannot find official Python TaskGroup documentation or explain its failure behavior; it only reports an absence from Google News/Wikipedia. Two special-purpose fact providers did not create general web search.

**Fix:** retrieve general web documents, prioritize an explicitly requested official domain, fetch relevant passages safely, and answer the question with supporting URLs. Preserve entity, product/version, date and source constraints. Search result snippets/headlines alone are insufficient for an explanatory documentation query. A provider/model change requires measured latency, operating cost and availability, not an assumed free dependency.

**Acceptance:** official documentation, evergreen facts, recent news, exact products, conflicting sources and unavailable-page cases; answers supported by fetched passages. Reuse retrieval for research but keep task-specific answer requirements. Files: [websearch.ts](../miner/src/websearch.ts), [currentfacts.ts](../miner/src/currentfacts.ts). **Priority 4; broad coverage is the missing capability.**

## 5. How to prove a fix increases rank-1 coverage

1. **Freeze the baseline.** Save registration/owner, manifest hash, served release, epoch, current scorer ID/hash, our rank/score, leader and failure reason. Use this report's saved files as the epoch-335 baseline. The audit script's hardcoded `target: 18` is an older planning constant, not a measured attainable target.
2. **Reproduce the actual problem.** Use both original-question and declared-parameter shapes. For each fixed case add a genuinely different variant, a negative case and a provider-outage case. Do not promote a list of rehearsed public examples into a claim of broad capability.
3. **Establish factual correctness independently.** Fix wrong subject, period, chain, category or source before scorer experiments. For a semantic/model-backed change, compare against independently labelled examples and record cost, latency, false positives and abstentions.
4. **Validate the scoring benchmark.** Pin the current champion, prove it reproduces a recorded score where inputs are available, and include a known successful competing answer under the same conditions. An authored reference is not the hidden truth. A 32-word clip or flattened JSON is only a conversion approximation. Neither should be advertised as Telegraph's current converter.
5. **Test the actual served response.** The generic serializer removes structured fields; the node may further summarize the result. Measure useful facts and labels surviving the full observed path. Avoid globally shortening every endpoint: previous project experiments regressed already-winning SSL answers.
6. **Release in small groups with regression checks.** Protect all seven current wins and shared modules such as sports, weather and quote resolution. Verify the production alias serves every **registered** endpoint; local manifest coverage alone previously missed a production/registration mismatch.
7. **Accept rank gains only on valid live results.** Require a complete post-release epoch for an observed gain. For a durable-gain claim, use a rolling set of at least three valid epochs, state exact win counts, and keep node failures separate. Zero-score first places do not count as answer-quality success.

Track two outcomes separately: **observed first places** and **first places supported by valid positive scores and demonstrated answer quality**. They are not interchangeable. Do not change a Track 2 scorer to reward this miner or manufacture routed traffic; direct probes here establish behavior only.

## 6. Evidence, reproduction and limits

All current evidence is retained in [rank1-plan-2026-09-16](evidence/rank1-plan-2026-09-16/):

- [rank-audit.json](evidence/rank1-plan-2026-09-16/rank-audit.json): manifest-derived complete ranking table.
- [registration.json](evidence/rank1-plan-2026-09-16/registration.json), [identity.json](evidence/rank1-plan-2026-09-16/identity.json) and [registered-manifest.yaml](evidence/rank1-plan-2026-09-16/registered-manifest.yaml): identity and hash verification.
- [summary.json](evidence/rank1-plan-2026-09-16/summary.json): per-intent history, champion IDs and failure reasons; all 36 current score comparisons agree.
- `history-<INTENT>.json`: up to 400 unfiltered public score rows per intent, including competitors' published errors. These are bounded pages, not complete lifetime history.
- `<INTENT>.json`: current public champion metadata and selected score rows captured by the existing audit tool.
- [probes.json](evidence/rank1-plan-2026-09-16/probes.json): all 32 direct production probes. All returned HTTP 200, which plainly did **not** mean all answers were correct. The slowest was approximately 1.60 seconds in this small sample; this is not a load or cold-start test.
- [catalog.json](evidence/rank1-plan-2026-09-16/catalog.json), [leaderboard.json](evidence/rank1-plan-2026-09-16/leaderboard.json), [canonical.json](evidence/rank1-plan-2026-09-16/canonical.json), [epoch.json](evidence/rank1-plan-2026-09-16/epoch.json): captured public source data.

Read-only public sources: [registration 1408](https://devnode.telegraphprotocol.com/api/miners/1408), [catalog](https://devnode.telegraphprotocol.com/api/miners), [epoch state](https://explorer.telegraphprotocol.com/api/epoch), [canonical intent definitions](https://devnode.telegraphprotocol.com/engine/v1/intents), [example score feed](https://devnode.telegraphprotocol.com/scores?intent=IP_GEOLOCATION&limit=400), and [example champion registry](https://devnode.telegraphprotocol.com/api/wasm?intent=IP_GEOLOCATION).

To take a **new** snapshot, use a fresh evidence directory rather than overwrite this one:

```powershell
# From the repository root; read-only network work, local evidence writes.
node track1-miner/tools/rank-audit.mjs track1-miner/docs/evidence/rank1-plan-NEW-DATE
# capture.mjs and probe.mjs are archived reproduction scripts for this dated run.
# Copy them into a new evidence directory before running them again.
```

**Limits:** Public score rows currently expose ranks, scores, timestamps and failure reasons, **not our scored question, ground truth, converted answer or full miner response**. Competitor errors reveal occasional incomplete request fragments, not an authoritative full test. No fresh champion-WASM benchmark or full unit suite was run for this report. Existing tests and September 15 benchmark results are historical evidence, not new verification. The older [rank-loss report](TRACK1_RANK_LOSS_REPORT_2026-09-15.md) and [GAPS.md](../../GAPS.md) informed continuity, but today's rank and probe claims come from newly saved observations. This report assesses current ranking prospects, not prize eligibility or the earlier frozen judging record.
