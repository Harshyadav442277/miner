# Rank-1 follow-up: latest public epoch 336

Prepared before this follow-up's runtime changes. Local date: 17 September 2026; evidence captured 16 September UTC.

## What the latest result actually measures

The refreshed [36-intent audit](evidence/rank1-followup-2026-09-17/rank-audit.json) verifies registration 1408 and reports **10/36 rank 1 in epoch 336**. The academic row was scored at 05:03 UTC on September 16. The preceding release was promoted around 08:21 UTC that day according to the deployment handoff. Thus these scores do **not** measure that release's ONCHAIN answer correction, dated FX, sports coverage, classification, fraud, or fact-check changes. No post-release rank improvement can yet be claimed.

Six of the ten first places are in near-zero score bands: translation, CVE, token holders, crypto price, Telegraph knowledge and AI detection. The other four are storm, wallet, news search and stock. Count rank and answer quality separately. CONTENT_EXTRACTION is rank 2 despite a perfect 1.0 score; changing a correct answer does not resolve an unknown tie-break.

## Next changes, selected from historical evidence

| Target | Latest result | Evidence and action |
|---|---|---|
| ACADEMIC_SEARCH | #7, 0.01323 vs 0.99659 | Historical DOAJ wrappers crossed while our single-index search did not. Live OpenAlex now returns HTTP 429 with an exhausted anonymous budget; DOAJ returns HTTP 200 and article metadata. Add explicit DOAJ/open-access search and a bounded fallback after OpenAlex failure. Preserve dates, authors, source and missing citation counts. Coverage gain, not proven rank gain. |
| SENTIMENT_ANALYSIS | #2, 0 vs 1 | Reproduced: “I just love being charged twice and ignored by support” is positive. Recognize praise directly governing a negative experience, with sincere-praise controls. This remains a limited word-list classifier; no universal sarcasm claim. |
| RESEARCH_QUERY | #4, 0.00568 vs 0.01418 | Known wrong-domain RAFT eye-trial response to a consensus-algorithm question remains open. Evaluate a source-grounded technical route; never substitute clinical acronym matches. This is correctness work, with no demonstrated score gain. |
| ONCHAIN_TX_LOOKUP | #8, 0.01002 vs 0.99520 | A prior validated two-reference benchmark supports the deployed change. Verify the served answer and wait for a score timestamp after release before revising again. |
| GAME_RESULT | #6, 0.000096 vs 0.96598 | New MLB/date/penalty handling is already deployed after this epoch. Test the deployed path before changing it. |
| WEATHER_CHECK / TVL | #10 / #4 | Large factual-score gaps remain. Need an actual provider/subject/chain reproduction before selecting a correction. |
| SSL / IP / URL_SCAN | #2 / #4 / #2 | Close numeric margins; preserve known working paths. Tiny wording wins against an authored reference do not establish rank improvement. |

The full remaining-intent backlog is in [the loss report](RANK1_RECOVERY_REPORT_2026-09-16.md); the historical score table and reasons for past wins are in [the historical report](HISTORICAL_RANK_RECOVERY_2026-09-16.md). Earlier reports distinguish near-zero wins, correct factual crossings, scorer wording sensitivity and node failures. Those distinctions still apply.

## Verification plan

Save failing regressions before changes; test realistic counterexamples afterward. Run the full unit suite and production build, then exercise real providers locally and on a protected preview. Keep production promotion, source/provider correctness, and a subsequent live epoch as separate evidence. No promise that these fixes yield any specific number of first places.

Provider references: [DOAJ API](https://doaj.org/docs/api/), [OpenAlex filtering](https://help.openalex.org/api/). Live HTTP responses are stronger evidence for current availability than historical documentation. **Availability clarification after probing:** OpenAlex rejected searches from this machine but answered the same requests from production. This is not a proven production outage. General and open-access searches therefore retain OpenAlex; only explicit DOAJ requests bypass it. Open-access requests now add the previously missing `is_oa:true` filter.

## Implemented and verified in this follow-up

1. **Academic search:** explicit DOAJ requests now retrieve open-access article metadata. Normal searches retain OpenAlex and fall back to DOAJ on outage within one request deadline. Open-access requests add `is_oa:true`; DOAJ dates must fit the requested interval, duplicate DOIs are removed, compound topics cannot match scattered unrelated words, and missing citation counts/order are disclosed.
2. **Sentiment:** praise directly governing a negative experience is recognized in a bounded set of constructions. The reproduced complaint changes from positive to negative, while “I love being helped by support” remains positive. This does not implement general irony understanding or solve the scorer's reference-wording dependency.
3. **Technical research:** explicit technical questions bypass biomedical acronym matches. The Raft question now retrieves the consensus-algorithm article and cites a general-reference excerpt. Source failure remains unavailable; it cannot fall back to a clinical acronym match. Existing biomedical questions and tested comparisons retain their routes.

Evidence:

- [Before-change failing regressions](evidence/rank1-followup-2026-09-17/regressions-before.txt) and [clinical acronym reproduction](evidence/rank1-followup-2026-09-17/research-before.txt).
- [685/685 unit tests](evidence/rank1-followup-2026-09-17/unit-tests.txt); production TypeScript build passed.
- [Final local real-provider probes](evidence/rank1-followup-2026-09-17/local-final.json). The [earlier comparison](evidence/rank1-followup-2026-09-17/local-production-comparison.json) deliberately retains the rejected broad DOAJ matches; those are not the final implementation.
- Protected preview [miner-677hz1mgk](https://miner-677hz1mgk-wukong4.vercel.app): **6/6 targeted probes**, all HTTP 200 with checked content. [Retrieval results](evidence/rank1-followup-2026-09-17/preview-retrieval.txt), [sentiment and SSL controls](evidence/rank1-followup-2026-09-17/preview-controls.txt), [deployment record](evidence/rank1-followup-2026-09-17/preview-deploy.txt).
- [Production recheck of the preceding release](evidence/rank1-followup-2026-09-17/prior-release-production.json) confirms the corrected ONCHAIN answer shape is already served. The World Cup directory fallback still cannot name the shootout winner when its source omits that outcome; it reports this limitation instead of inventing it.

No live score for this follow-up exists. Local provider availability differs from Vercel, and DOAJ is a narrower corpus with no citation counts. General web retrieval, LLM-wording-sensitive scorers, synthesis coverage, weather/TVL numeric gaps, and tie-breaking remain unresolved. This release is not a claim that all 26 losses are fixed.

**Wrap-up status:** the user requested a stop after the preview verification. Production was not promoted. [Broader local preflight](evidence/rank1-followup-2026-09-17/preflight-local.txt) is not green: unit+live, deployment verification and intent answers failed; engine-shaped parameters passed. Investigation was stopped before all failures could be classified. Localhost cannot pass the production HTTPS requirement, and provider availability differs by environment; neither fact justifies treating all failures as harmless. Resume with these failures before promotion. The preceding production release remains the rollback/reference target, `miner-71hy3v2zy`.

## All 26 intents currently below rank 1

This table is epoch 336 evidence, not a score for the preview. Regime near_zero refers to the best score in the entire field being below 0.000001.

| Intent | Rank | Our score | Best score | Leader |
|---|---:|---:|---:|---|
| SSL_VERIFICATION | 2 | 0.011116877 | 0.011169977 | chainsight-oracle |
| ACADEMIC_SEARCH | 7 | 0.013231061 | 0.99658847 | chainsight-oracle |
| IP_GEOLOCATION | 4 | 0.99440676 | 0.99867314 | txlens |
| WEATHER_FORECAST | 3 | 0.000527314 | 0.0005369436 | chainsight-oracle |
| WEATHER_CHECK | 10 | 0.01590076 | 0.7739851 | amanat-weather-risk |
| CONTENT_EXTRACTION | 2 | 1 | 1 | chainsight-oracle |
| NEWS_HEADLINES | 2 | 0.0048629767 | 0.0055912803 | news-spaceflight-blogs |
| ONCHAIN_TX_LOOKUP | 8 | 0.010015826 | 0.995202 | veyctum |
| TVL_LOOKUP | 4 | 0.0052857148 | 0.54965866 | preflight-ssl-verification |
| CURRENCY_EXCHANGE | 10 | 7.7757235e-8 | 0.00031645346 | fxex-erapi-usd |
| GAME_RESULT | 6 | 0.000095833515 | 0.96597844 | game-football-data |
| GAS_PRICE | 4 | 1.6795771e-11 | 1.9129648e-11 | agentfeed-base-crypto |
| FINANCIAL_DATA | 17 | 0 | 3.0475586e-16 | kriterion-pramagraph |
| FRAUD_DETECTION | 5 | 3.9801567e-14 | 1.004069e-13 | chainsight-oracle |
| SPORTS_SCORE | 2 | 6.176938e-12 | 8.085423e-12 | scorewire-oracle |
| RESEARCH_QUERY | 4 | 0.005681249 | 0.01417696 | kriterion-pramagraph |
| TEXT_AUTHENTICITY_CHECK | 2 | 2.0012193e-7 | 4.3474466e-7 | chainsight-oracle |
| CROSS_CHAIN_STATE_VERIFY | 2 | 0.3549507 | 0.4390314 | chainsight-oracle |
| EVENT_OUTCOME_RESOLUTION | 8 | 0.21580905 | 0.3359489 | chainsight-oracle |
| URL_SCAN | 2 | 0.9258598 | 0.9271755 | proofgate-url-intelligence |
| WEB_SEARCH | 14 | 2.002052e-12 | 0.99997115 | telegraph-ai-miner-node |
| CONTENT_VERIFICATION | 2 | 5.6935815e-12 | 8.419883e-12 | chainsight-oracle |
| SENTIMENT_ANALYSIS | 2 | 0 | 1 | telegraph-ai-miner-node |
| TEXT_CLASSIFICATION | 4 | 0 | 1 | chainsight-oracle |
| RESEARCH_SYNTHESIS | 5 | 0.01176913 | 0.99551886 | chainsight-oracle |
| FACT_CHECK | 11 | 7.2920354e-9 | 3.7186503e-8 | qarinah-proofpack |
