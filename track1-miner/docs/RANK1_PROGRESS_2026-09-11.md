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

## Wallet repair batch — subsequent work

The unchanged epoch-321 audit still reports wallet rank 6; its public row does not disclose the evaluated question. The following are independently reproduced defects, not an asserted explanation of the hidden evaluation.

Seven direct production probes all failed before this repair. A Base USDC request returned `0 ETH`; a BSC native-balance request returned `10.36722181 ETH` from Ethereum. Conflicting structured chains, numeric chain IDs, mixed ETH/USDT requests, bridged USDC.e, and malformed addresses also produced wrong or incomplete answers. See [production before](evidence/rank1-2026-09-11/wallet-production-before.json).

Changes:

- Read canonical USDC on Ethereum, Base, Arbitrum, Optimism and Polygon, plus Ethereum USDT, using the requested account's ERC-20 `balanceOf`. Token-only questions do not receive a substitute ETH balance. Mixed questions report both amounts, with failed components explicit.
- Read BNB Chain native balances from BNB mainnet RPC and label them BNB. Structured supported chain names and IDs take precedence over prose.
- Race at most two RPC attempts per lookup, share a six-second deadline, rotate failed attempts and cancel outstanding work after a usable result. Reject JSON-RPC errors even when a result field is present, malformed quantities, and empty ABI results.
- Report malformed wallet addresses as invalid with unknown balance. The previous zero was not based on a valid account read, even though an older scorer experiment rewarded it.
- Keep USDC.e/USDbC distinct from issuer-native USDC. Unsupported token contracts and unsupported test networks remain explicit unknowns.

Validation so far: ten new regression cases failed on the old implementation and pass after repair; three additional network/empty-result cases pass. **474/474 full-suite tests pass**, including live provider tests. [Eight independent provider checks](evidence/rank1-2026-09-11/wallet-providers.json) verify all six token contracts' decimals and both BNB endpoints' chain IDs. Full output: [test log](evidence/rank1-2026-09-11/wallet-full-suite.txt).

Sources verified on 2026-09-11 IST: [Circle contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses), [Tether Ethereum contract](https://tether.to/en/supported-protocols/), [BNB RPC endpoints](https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/), and [ERC-20 balanceOf specification](https://eips.ethereum.org/EIPS/eip-20). The public RPC checks independently confirm network identity and six-decimal encoding; they do not imply a new rank.

Preview `miner-buok8rsna` passed Base USDC, Ethereum ETH/USDT and BNB native probes. Production **miner-kb0aad6hx** is Ready and serves both `miner-wine.vercel.app` and `miner-wukong4.vercel.app`, verified by Vercel inspection. All seven previously failing production probes now pass in **253–757 ms**; see [production after](evidence/rank1-2026-09-11/wallet-production-after.json). An explicit promote command returned 409 because this deployment was already current; inspection and direct alias responses verify the actual state. The full preflight is still running.

The active immutable YAML still advertises native balances on five chains and no tokens. Existing `query` requests can use the added runtime coverage; this batch does not claim that the registered description changed. Other ERC-20 contracts, historical block balances, Solana/Bitcoin, and on-chain activity summaries remain gaps.

The secondary project alias requires Vercel authentication: anonymous probes received non-JSON responses and are recorded as failed checks, not miner failures. An authenticated `vercel curl` confirms the new USDC response there. The registered public alias `miner-wine.vercel.app` passes all seven probes anonymously.

Final acceptance: **7/7 preflight gates passed**, including **26/26 intent correctness**, engine parameter shapes, hostile inputs, provider health and the expected regression comparison. See [preflight output](evidence/rank1-2026-09-11/wallet-preflight.txt). This supersedes the in-progress preflight note above. Rank improvement remains unverified.
