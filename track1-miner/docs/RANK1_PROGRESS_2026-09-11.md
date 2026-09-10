# Rank-1 progress — 2026-09-11 IST

Target: **18 or more intents at rank 1 in the same live epoch**. The branch name retains the original fourteen-intent target.

The live audit at 2026-09-10 18:31 UTC confirms registration **1379**, catalog **4433**, active with **26 intents**. Registration 1378 is superseded. Epoch **321** has **8 rank-1 positions**, up from 3 in epoch 320. Nineteen existing intents have scores; seven newly registered intents have no scores yet. The mission is not complete.

Evidence: [rank audit](evidence/rank1-2026-09-11/baseline/rank-audit.json), [registration](evidence/rank1-2026-09-11/baseline/registration.json), and the individual intent score/champion files in the same directory.

## Shipped repairs and results

The earlier [weakness report](RANK1_WEAKNESSES_2026-09-10.md) documents transaction chain routing and receipt handling, chain-specific TVL, dated game fixtures, academic date filters, CVE fallback, extraction parsing, weather coverage, news matching and SSL parsing. Those runtime changes are already committed and included in the later twenty-six-intent deployment.

Current rank-1 intents: SSL_VERIFICATION, ACADEMIC_SEARCH, CONTENT_EXTRACTION, CVE_LOOKUP, LANGUAGE_TRANSLATION, NEWS_HEADLINES, NEWS_SEARCH and TELEGRAPH_KNOWLEDGE. Extraction, CVE and Telegraph knowledge score 1. Translation remains near zero despite ranking first; ranking does not establish answer quality.

## Remaining weaknesses

| Intent | Rank | Evidence / next investigation |
|---|---:|---|
| WALLET_BALANCE_CHECK | 6 | Score approximately 6.07e-12 versus leader approximately 1. No published failure reason; reproduce explicit-chain conflicts, native/token coverage and RPC fallback deadlines before assigning a cause. |
| WEATHER_CHECK | 5 | Score .01540 versus leader .99873; inspect current-weather answer coverage. |
| ONCHAIN_TX_LOOKUP | 4 | Score .01218 versus leader .99599; investigate remaining transaction coverage beyond repaired chain/receipt errors. |
| TVL_LOOKUP | 5 | Score .01335 versus leader .04366; chain-subtotal repair has not secured first place. |
| GAME_RESULT | 3 | Score .0000394 versus leader .04062; provider/fixture coverage remains weak. |
| WEATHER_FORECAST | 5 | Score .000289 versus leader .000362; validate timing and requested fields. |
| STORM_ALERT | 3 | Score .00971 versus leader .01120; compare complete forecast coverage. |
| IP_GEOLOCATION | 2 | Score .996710 versus leader .996832; narrow gap, preserve existing correctness. |
| FACT_CHECK | 2 | Both scores near zero; rank gap alone does not identify a useful correction. |
| AI_TEXT_DETECTION | 2 | Both scores near zero; investigate calibration with independent examples. |
| CURRENCY_EXCHANGE | 4 | Scores near zero; verify units, direction and dates before scorer interpretation. |

Seven pending intents: GAS_PRICE, FINANCIAL_DATA, FRAUD_DETECTION, SPORTS_SCORE, TOKEN_HOLDER_COUNT, RESEARCH_QUERY and TEXT_AUTHENTICITY_CHECK. Registration and successful endpoint checks are not rank evidence.

## Release boundary

The twenty-six-intent runtime and registration were committed through e96d2d3. This follow-up changes the audit default to registration 1379 and target 18, and preserves public ranking evidence. It does not change runtime behavior. Historical deployment evidence records production miner-r3r5p7xb6, 461 tests, 7/7 preflight and 25 sandbox endpoints passing; these are prior release results, not tests rerun by this documentation update.
