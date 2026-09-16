# Why our earlier intents won, what can be repeated, and what to fix

**Prepared before implementation, 16 September 2026. Baseline: epoch 335, registration 1408, 36 intents, 7 rank-1 positions.** This is the historical follow-up to [the complete current loss report](RANK1_RECOVERY_REPORT_2026-09-16.md).

## Findings that change the plan

**There is no single old version to restore.** The record contains strong answers, first places against weak competition, zero-score ties, changing questions and platform failures. Reverting the service would also remove demonstrated fixes and current wins.

1. **Repeatable correctness fixes have paid off.** CONTENT_EXTRACTION moved from 0 in epochs 333–334 to 1 in 335 after request-shape and coverage fixes. IP_GEOLOCATION has repeatedly scored above 0.99; earlier field selection and request-prefix corrections have direct benchmark evidence. These support preserving the successful answer path while repairing cases it misses.
2. **A former first place does not always mean a formerly good answer.** In the saved sample, ACADEMIC_SEARCH's highest raw score is only 0.01679, FINANCIAL_DATA's is `7.89e-17`, and classification/sentiment have never exceeded zero. Their old first places cannot be recreated reliably by restoring old wording. Competition has exposed inadequate coverage.
3. **Question sensitivity is real.** GAME_RESULT scored 0.99446 in epoch 334 and 0.0000394 in 335. IP scored 0.99738 then 0.01106. We cannot identify either hidden question from our public rows. A code rollback is unsupported; broaden parsing/coverage and test multiple request shapes.
4. **Tiny-score first places are fragile.** SPORTS_SCORE, STOCK_PRICE, TOKEN_HOLDER_COUNT, AI_TEXT_DETECTION and TEXT_AUTHENTICITY_CHECK have no high absolute score in the saved sample. Preserve honest answers, but do not treat a one-place gain in that band as proof of improved capability.
5. **Some losses are outside our handler.** URL_SCAN's current zero comes from the node timing out while constructing the request. Its previous score was 0.96642. Changing blocklists cannot fix a request that never reaches us.
6. **A widespread scorer replacement is not supported.** All 34 non-null public champion URL/hash pairs match the September 13 snapshot; CROSS_CHAIN_STATE_VERIFY and EVENT_OUTCOME_RESOLUTION return null in both snapshots. This checks the two snapshots, not every intervening epoch or undocumented converter behavior.

The historical record supports **targeted coverage repairs, preserved successful paths, independently checked answers, and small releases measured across multiple valid epochs**. It does not support promising a particular number of first places.

## Historical comparison for every registered intent

Data combines the repository's durable score history, prior audit snapshots and saved public score pages through epoch 335. Rows are deduplicated by intent/epoch; no conflicting rank/score observations were found. “Best” means **best in this saved sample**, not all-time. Sample lengths differ, contain gaps and span changing registrations, questions, fields and sometimes older scorers. Win fractions are descriptive, not probabilities. Raw scores from different scorers must not be treated as directly comparable accuracy.

| Intent | Current rank / score | Best observed score (epoch; rank) | Last rank 1 (score) | Wins / sampled epochs |
|---|---|---|---|---|
| SSL_VERIFICATION | 1 / 0.008698722 | 0.993155 (e299; r2) | e335 (0.008698722) | 28/52 |
| STORM_ALERT | 1 / 0.9945304 | 0.9967058 (e329; r1) | e335 (0.9945304) | 24/52 |
| ACADEMIC_SEARCH | 11 / 0.008926418 | 0.016789528 (e334; r3) | e328 (0.011046269) | 15/44 |
| LANGUAGE_TRANSLATION | 1 / 2.073144e-10 | 0.008997087 (e289; r1) | e335 (2.073144e-10) | 34/47 |
| IP_GEOLOCATION | 14 / 0.011061581 | 0.99824667 (e329; r1) | e334 (0.9973802) | 17/50 |
| WEATHER_FORECAST | 2 / 0.00051460735 | 0.9999769 (e303; r1) | e313 (0.00055526214) | 9/51 |
| WEATHER_CHECK | 16 / 0.012629155 | 0.9993066 (e315; r1) | e315 (0.9993066) | 3/38 |
| CONTENT_EXTRACTION | 1 / 1 | 1 (e335; r1) | e335 (1) | 21/40 |
| NEWS_HEADLINES | 4 / 0.002776922 | 0.010870604 (e317; r1) | e334 (0.010798672) | 31/40 |
| WALLET_BALANCE_CHECK | 1 / 0.9999995 | 0.99999964 (e330; r3) | e335 (0.9999995) | 5/40 |
| ONCHAIN_TX_LOOKUP | 7 / 0.010015826 | 0.012366659 (e322; r2) | None in sample | 0/17 |
| CVE_LOOKUP | 5 / 1.10793215e-11 | 1 (e321; r1) | e326 (1.1223607e-11) | 2/17 |
| TVL_LOOKUP | 3 / 0.014204451 | 0.0155020375 (e333; r4) | None in sample | 0/17 |
| NEWS_SEARCH | 1 / 0.99977547 | 0.9998174 (e323; r1) | e335 (0.99977547) | 11/17 |
| CURRENCY_EXCHANGE | 8 / 1.1072443e-7 | 2.3376427e-7 (e328; r6) | None in sample | 0/17 |
| GAME_RESULT | 10 / 0.000039403025 | 0.9944621 (e334; r1) | e334 (0.9944621) | 4/17 |
| GAS_PRICE | 2 / 2.1596138e-11 | 0.99999887 (e328; r1) | e334 (2.6981903e-11) | 5/14 |
| FINANCIAL_DATA | 5 / 3.0199148e-27 | 7.886362e-17 (e322; r1) | e329 (1.1869521e-18) | 3/14 |
| FRAUD_DETECTION | 3 / 5.4482176e-14 | 6.005613e-14 (e333; r5) | None in sample | 0/14 |
| SPORTS_SCORE | 9 / 1.6527115e-12 | 6.907218e-12 (e324; r2) | e327 (4.923917e-12) | 1/14 |
| TOKEN_HOLDER_COUNT | 3 / 5.281597e-12 | 1.0288058e-11 (e334; r1) | e334 (1.0288058e-11) | 10/14 |
| RESEARCH_QUERY | 3 / 0.008210735 | 0.0086668115 (e326; r3) | e327 (0.008122426) | 2/14 |
| TEXT_AUTHENTICITY_CHECK | 2 / 2.091821e-7 | 2.2516238e-7 (e327; r1) | e329 (1.3381647e-7) | 8/14 |
| CRYPTO_PRICE | 1 / 0.999929 | 0.999929 (e335; r1) | e335 (0.999929) | 2/7 |
| STOCK_PRICE | 7 / 0 | 2.1296504e-11 (e333; r1) | e333 (2.1296504e-11) | 1/7 |
| CROSS_CHAIN_STATE_VERIFY | 2 / 0.37803778 | 0.50807047 (e329; r1) | e329 (0.50807047) | 1/7 |
| EVENT_OUTCOME_RESOLUTION | 2 / 0.22171375 | 0.4235198 (e330; r2) | e329 (0.28348804) | 1/7 |
| URL_SCAN | 11 / 0 | 0.9664245 (e334; r3) | None in sample | 0/7 |
| WEB_SEARCH | 15 / 1.4467808e-12 | 3.5383241e-12 (e330; r8) | None in sample | 0/7 |
| CONTENT_VERIFICATION | 2 / 3.2193222e-12 | 5.6935815e-12 (e333; r2) | e329 (3.2193222e-12) | 1/7 |
| SENTIMENT_ANALYSIS | 2 / 0 | 0 (e329; r1) | e329 (0) | 1/7 |
| TEXT_CLASSIFICATION | 4 / 0 | 0 (e329; r1) | e329 (0) | 1/7 |
| RESEARCH_SYNTHESIS | 4 / 0.0020954788 | 0.009969926 (e331; r2) | None in sample | 0/7 |
| FACT_CHECK | 3 / 3.8054e-9 | 1 (e334; r1) | e334 (1) | 18/38 |
| TELEGRAPH_KNOWLEDGE | 2 / 1.1757792e-11 | 1 (e324; r1) | e329 (1.367988e-11) | 15/38 |
| AI_TEXT_DETECTION | 2 / 2.4193547e-10 | 3.3116881e-10 (e296; r1) | e334 (2.621951e-10) | 11/43 |

Source and per-observation provenance: [historical-summary.json](evidence/historical-recovery-2026-09-16/historical-summary.json). The current baseline was freshly re-read and remains [epoch 335](evidence/historical-recovery-2026-09-16/current/rank-audit.json).

## What earlier successes teach us

| Historical evidence | Supported explanation | How to repeat the useful part |
|---|---|---|
| Extraction: e333/e334 = 0; e335 = 1 | The release repaired bare-text, header, quantity, entity and action-item cases; local/production probe evidence supports coverage improvement. The exact hidden conversion remains unavailable. | Test original-question and structured/bare-text shapes. Preserve all requested fields and use held-out variants, not just the previous failing string. |
| IP: e329 = 0.99825; e334 = 0.99738; e335 = 0.01106 | Provider/operator selection and unnecessary query prefixes were previously measured contributors. The new IPv6-loopback parser failure is reproduced, but is not proved to be epoch 335's cause. | Keep the operator-first successful path and working IPv4 behavior; validate real IPv6 literals and special ranges. Re-run recorded IP questions under the same scorer to protect the successful cases. |
| Game result: e334 = 0.99446; e335 = 0.0000394 | The service can answer some fixtures competitively. Its current long-query parsing and competition coverage are incomplete. The two scores alone do not identify the failed request. | Parse teams independently of competition/date suffixes; identify the exact fixture and final/live status. Share the repair with SPORTS_SCORE. |
| Fact check: e334 = 1; e335 = 3.81e-9 | The endpoint can succeed, but source selection still retrieves unrelated articles. The Wikimedia user-agent repair addressed availability, not evidence relevance. | Resolve the subject and predicate; require a supporting passage before declaring support/contradiction. Do not mistake a source-sharing a word for evidence. |
| Academic: 15 first places in 44 sampled epochs, maximum only 0.01679 | Old rank leadership did not demonstrate a high-scoring research capability. Current leader is 0.45328. | Preserve useful count/date/relevance fixes, then measure broader relevant retrieval and verified metadata. More old prose is not sufficient evidence of a solution. |
| Financial: earlier rank 1 at 1.19e-18; current leader 1.74e-15 | Both old and current values are extremely small. The annual-fundamentals release is a correctness improvement, not demonstrated competitive recovery. | Honor requested periods, including historical and quarterly figures; correctly label annual versus TTM denominators. |
| Research: e327 rank 1 at 0.00812; current own 0.00821 versus leader 0.99780 | Current raw performance is similar to a former winning level while the leader is much stronger. This is not evidence that we lost a formerly broad research capability. | Fix domain/entity routing and cited answer coverage. A computing question must not be answered from a same-name medical trial. |
| Content verification: e329 rank 1 at 3.2193222e-12; e335 same score, rank 2 | Our identical raw score now loses. At least for these observations, rank movement is driven by the field, not a lower own score. | Expand reference-based verification only with evidence of missing coverage; avoid “rollback to the winning score,” because we already have it. |
| Cross-chain and authenticity had unopposed/very small fields in earlier audits | Early dominance overstated competitive testing and, in cross-chain, the breadth of supported proofs. | Keep narrow verified claims explicit. A new proof family needs real verification and adverse fixtures; a small field is not a correctness test. |
| Sentiment/classification: e329 rank 1 at zero | These were zero ties, not successful semantic decisions. Classification's current leader scores 1. | Fix negation, multi-label instructions and compositional reasoning. Require nonzero valid scoring and independently labelled correctness. |
| Gas: e328 ~1, e333/e334 first at ~2.6e-11 | Rank and numeric scoring regime vary substantially. Earlier experiments show high sensitivity to sampled figures. | Retain correct chain, units, fee type and timestamps. Investigate same-block comparisons before a formatting change. |
| URL scan: e334 = 0.96642, e335 = 0 with request-builder timeout | Current zero is upstream of the miner. | Keep the working scan path, preserve failure evidence and await a successful scored request. A miner deployment is not a cure for this node failure. |

### Proven mechanisms to preserve

- **Answer the actual requested subject and scope.** Historical wallet repairs stopped token requests becoming native ETH requests, honored structured chain parameters, used integer-safe amounts and returned unknown for unavailable reads. Apply the same principle to dates, financial periods, fixture identity and research domains.
- **Use real source facts and keep essential identifiers.** The earlier IP operator correction used the network operator instead of the service label. Preserve that; fix parsing around it rather than replacing a working provider blindly.
- **Make answer-shape changes per intent.** Earlier IP prefix removal improved the recorded benchmark, while applying it globally damaged an SSL case from about 0.993 to 0.011. Preserve currently winning SSL/storm/wallet paths.
- **Validate the measuring instrument.** Previous ONCHAIN/CVE authored-reference tests could not reproduce a known competitor crossing. A good score against our own answer key is not enough to justify a scoring-driven change.
- **Keep honest unknowns.** Do not imitate mistaken reference answers, report an invented balance, or call a missing market an event that never happened. Expand actual coverage where a determinable answer exists.

Historical benchmark details: [GAPS G127–G130 and G114–G115](../../GAPS.md), [prior repair evidence](evidence/rank-loss-2026-09-15/), and [wallet/IP audit](POST_FIX_IP_WALLET_AUDIT_2026-08-31.md). Those earlier numbers are historical measurements, not new benchmark runs.

## Implementation plan, recorded before code changes

The first batch targets **demonstrated defects** rather than every unexplained low score. Work proceeds to verification without waiting for another planning approval.

1. **IP parsing:** accept valid compressed/bracketed IPv6, including `::1`, without accepting partial or invalid addresses. Preserve special-range classification and IPv4 answers.
2. **Headlines:** honor count words and explicit publication windows; filter before limiting; reject future/out-of-window items; report genuine shortfalls.
3. **Shared sports fixture parsing:** separate team names from long date/competition suffixes; include international fixtures where the provider supports them; preserve strict identity/status checks. Evaluate reuse for known event outcomes after the fixture layer works.
4. **Historical FX:** use the requested reference date; make publication-date fallback explicit; never silently substitute today's rate.
5. **Research domain safety:** reject unrelated clinical evidence for technical questions; add a grounded general-source path where sources can be verified. Preserve medical and supplied-comparison behavior that already works.
6. **Evidence and semantic gaps:** improve fact-check source relevance, classification negation/multiple labels, sentiment contradiction and fraud scenario handling where changes generalize and can be tested. Do not claim that a few additional rules implement universal semantics.
7. **Remaining broader work:** evaluate quarterly financial facts, general web retrieval, scholarly/synthesis coverage and event sources after the bounded repairs. If a new provider/model is required, test feasibility and cost instead of silently introducing a fragile dependency.

For every implemented item: a regression fails on the original code; positive/negative variants pass after; affected existing tests pass; historical winning paths remain covered; live-provider behavior is separately checked. Record unchanged or blocked items explicitly. The [complete loss report](RANK1_RECOVERY_REPORT_2026-09-16.md) remains the per-intent backlog, including unresolved on-chain/TVL/scorer questions.

## Acceptance and limits

- **Local correctness:** focused regressions, typecheck/build and the appropriate existing suite.
- **Historical protection:** re-run useful recorded-question benchmarks against the current scorer where available; record the baseline and candidate from actually served responses. Clipped prose remains a proxy for the node's converter.
- **Release evidence:** verify the served alias and all registered endpoints; preserve rollback provenance. Unit tests do not prove deployment.
- **Rank evidence:** one valid complete post-release epoch establishes an observed gain; multiple valid epochs are needed to argue it is durable. Keep node failures, all-zero ties and near-zero first places visible.
- **Missing evidence:** the current public API omits our actual question, ground truth and converted answer. We cannot honestly prove why each historical high score occurred. Explanations above distinguish measured mechanisms, reproduced current defects and hypotheses.

This report was written before implementation. Results and any remaining blockers will be recorded separately so the original reasoning and plan remain reviewable.
