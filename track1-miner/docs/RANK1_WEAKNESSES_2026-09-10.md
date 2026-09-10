# Rank 1 mission: weaknesses, repairs, and evidence

Target: **at least 14 intents ranked #1 in the same complete live epoch**. Status: **in progress**.
Latest verified complete epoch: **320**, checked 2026-09-10. LiveCert holds **3/19 #1 positions**,
so eleven additional wins are needed. Local tests and direct endpoint probes do not establish a rank change.

## Identity and evidence

- Registration **1378**, active; catalog miner ID **4433**. These identifiers have different meanings.
- Owner: `0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e`.
- Nineteen intents; registered YAML hash `8d62ebe0136aea75e8185a5536f99687cac7650b31a31a5fb90c5c9aac94d874`.
- Registration and catalog were matched by owner, slug, and pinned YAML URL; the local manifest agrees.
- Source: [registration](https://devnode.telegraphprotocol.com/api/miners/1378),
  [catalog](https://devnode.telegraphprotocol.com/api/miners), intent-specific `/scores` and `/api/wasm`.
- Machine-readable snapshot: [rank-audit.json](evidence/rank1-2026-09-10/checkpoint/rank-audit.json).
  The neighboring intent files preserve recent score rows, failure reasons, and current champion identity.
- The epoch-298 judging snapshot remains historical evidence. This mission concerns current live ranking.

The three current leaders are LANGUAGE_TRANSLATION, NEWS_HEADLINES, and FACT_CHECK. Translation
and fact checking lead in a near-zero score band; their rank is real, but it is not evidence of high
absolute answer quality. CONTENT_EXTRACTION's rank ordering is an all-zero tie and is not a win.

## Every intent below #1

Scores below come from the same epoch. A score gap establishes a target, not a diagnosis of its cause.
The defect column distinguishes reproduced failures from unresolved explanations.

| Intent | Rank | Our score | Leader score | Weakness and disposition |
|---|---:|---:|---:|---|
| ONCHAIN_TX_LOOKUP | 9 | 0.00654124 | 0.01141124 | **Fixed:** Base/mainnet/ETH ambiguity, precision loss, missing receipt/error handling, incomplete cross-chain denials. Real Base transaction denied by production before the repair. |
| GAME_RESULT | 4 | 0.000251756 | 0.34823856 | **Fixed:** fallback ignored requested date and returned teams unchecked; structured dates and cache identity were incomplete; sequential provider searches could exhaust the deadline. Provider coverage remains a limitation. |
| TVL_LOOKUP | 5 | 0.00612050 | 0.15408534 | **Fixed:** a chain-specific protocol question returned the global protocol total; mainnet could select the wrong chain; 429/403 were treated as missing data. |
| CVE_LOOKUP | 3 | 7.771775e-12 | 1.2229478e-11 | **Fixed:** NVD availability was a single point of failure despite caching. Public CVE Program fallback now preserves record identity and assigning authority. Healthy NVD answers remain preferred. Rank gain unproven. |
| ACADEMIC_SEARCH | 2 | 0.01209009 | 0.01241055 | **Fixed:** explicit days were widened to whole months; ISO ranges were not parsed; retry removed the date filter. OpenAlex availability and broader research-query coverage remain open. |
| STORM_ALERT | 3 | 0.01133215 | 0.02737227 | No failure reason in the epoch. Prior scorer/payload measurements exist; the current gap's cause is unproven. Next: replay current location/time-window requests against the current champion. |
| WEATHER_FORECAST | 5 | 0.000283336 | 0.000404793 | Persistent weak band across recent epochs. No current endpoint failure reason. Forecast horizon, variables, and provider/model agreement need fresh comparison; wording alone is not an established fix. |
| WEATHER_CHECK | 5 | 0.01825744 | 0.01840802 | Close in epoch 320, far below the leader in 319. Current-condition versus forecast-window handling remains a candidate to measure, not a proven cause. |
| IP_GEOLOCATION | 2 | 0.99689025 | 0.99840873 | High score with a small gap. Preserve measured ISP/organization wording; evaluate actual city/operator mismatches before changing the response. |
| WALLET_BALANCE_CHECK | 2 | 0.99999905 | 0.9999999 | Effectively saturated scores in this epoch. Exact #1 remains unachieved. Protect chain, token, and historical-block correctness; tiny numerical gaps alone do not identify a useful change. |
| SSL_VERIFICATION | 2 | 0.01013054 | 0.01043768 | Won epochs 318 and 319; no request failure in 320. The current question is hidden. Re-benchmark certificate cases against the current champion before a prose change. |
| NEWS_SEARCH | 2 | 0.9944752 | 0.99969006 | Strong score and rank 1 in 319. Freshness, article relevance, and exact requested topic are the useful remaining levers; no current failure was established in this batch. |
| CURRENCY_EXCHANGE | 3 | 1.6125713e-7 | 3.1802534e-7 | Near-zero band. Epoch 319's zero was a node request-builder timeout before calling the miner. Daily-reference versus live-quote disagreement remains a hypothesis; no ranking fix claimed. |
| CONTENT_EXTRACTION | 2 | 0 | 0 | Whole field scored zero in 320. In 319 the node failed to build our request. Current fixture/ground truth is hidden. Multi-field extraction coverage still needs audit; no remedy for the network's request-builder failure is claimed. |
| TELEGRAPH_KNOWLEDGE | 2 | 1.0888141e-11 | 1.1466902e-11 | Near-zero band; narrow documented fact table cannot answer every routed question. Fresh feed includes unrelated predictions routed here. Do not turn unrelated questions into invented protocol facts. |
| AI_TEXT_DETECTION | 2 | 2.0708446e-10 | 2.55e-10 | Persistent near-zero band. Heuristic authorship detection has limited evidence and cannot establish authorship. No trustworthy rank-improving change established yet. |

## Repairs reproduced before implementation

The initial twelve new regression tests all failed against the original implementation. They cover
independent behavior: chain selection, value precision, receipt outages, RPC error bodies, incomplete
chain searches, sports dates and team identity, and publication windows. The expanded regression set
contains **19 tests**. Recorded output: [before](evidence/rank1-2026-09-10/regressions-before.txt),
[after](evidence/rank1-2026-09-10/regressions-after.txt).

Four failures were then reproduced on **production**, not merely on mocks:

| Request | Production before repair | Corrected preview |
|---|---|---|
| Real Base transaction, phrased as an ETH transaction on Base mainnet | Claimed it was absent on Ethereum | Confirmed on Base, block 51,113,404, 46,218 gas |
| Aave TVL on Base | $18,149,323,083 aggregated globally | $517,754,093 for Base, read from DefiLlama's `currentChainTvls.Base` |
| Arsenal vs Chelsea on 2025-03-17 | Reported a 2026-09-06 match, Arsenal 2–1 Chelsea | Refuses to substitute that match; requested-date provider coverage remains limited |
| Papers between January 15, 2025 and June 10, 2026 | Advertised January 1 through June 30 | Preserves January 15 through June 10 |

The transaction fixture is
`0xd5350fe7e52011dacf1d806eee38425ae5cc489dc85d46b63e4202a6ab896285`.
It is a Base system transaction with zero value and fee, so this live example proves chain resolution;
integer precision and reverted-transfer behavior are verified separately with controlled receipts.
TVL figures are dated provider snapshots, not permanent values or a comparison of prices.

Original responses: [live-before.json](evidence/rank1-2026-09-10/live-before.json).
Preview responses are in `preview-tx.txt`, `preview-tvl.txt`, `preview-game.txt`, and `preview-academic.txt`.

**TVL scorer experiment:** the local module was byte-compared with current champion **49** fetched
from its registered URL. Against three authored references derived from the verified Base subtotal,
the old/new 32-word scores were **0.008562 → 0.109624**, **0.006936 → 0.635705**, and
**0.008005 → 0.843235**. All three improved; full-text scores improved too. This supports the
chain-scope fix under that scorer, but the references are authored and the clips do not reproduce
the network converter or hidden fixtures. [Complete experiment](evidence/rank1-2026-09-10/tvl-proxy-bench.json).

Additional transaction repairs preserve a mined transaction when receipt retrieval throws; reject
HTTP-200 error objects without a JSON-RPC result; report unknown when a cross-chain probe failed;
continue discovery if Ethereum is unavailable; preserve every wei in decimal amounts; use the located
chain for Byzantium rules; do not call a modern receipt without status reverted; and describe a reverted
value transfer as attempted. Transfer events are no longer all labelled ERC-20 because ERC-721 uses
the same event signature.

The CVE fallback uses [the CVE Program record API](https://cveawg.mitre.org/api/cve/CVE-2024-3094).
The live record was checked for matching CVE ID, publication state, CNA, CVSS 3.1/10.0, and affected XZ
versions 5.6.0/5.6.1. Controlled tests force NVD 429 and both-provider 503; unaffected versions and a
different CVE ID must not become an answer. Fallback availability on a forced NVD outage in Vercel
has not been independently induced.

## Verification and release

- Clean starting checkout, fast-forwarded over two score-history commits; work is on `codex/rank1-14-intents`.
- TypeScript build passed; **295 non-live tests passed**.
- **376 full-suite tests passed** before the final sports error-classification refinement; affected
  sports/regression tests passed again after that refinement. Some older live tests return early when
  providers are unavailable, so the full-suite count is not a claim that every provider answered.
- Initial protected preview: `miner-litai0e5h-wukong4.vercel.app`, probed with authenticated `vercel curl`.
- Final preview: `miner-ds6a57cr2-wukong4.vercel.app`; final sports no-match classification verified.
- **Production released:** `miner-9asqqpg3w-wukong4.vercel.app`, alias `https://miner-wine.vercel.app`.
  All five targeted [production probes](evidence/rank1-2026-09-10/live-after.json) pass (655–849 ms).
  The sports probe returns an honest no-match; the other four return substantive answers.
  **Production acceptance: 7/7 gates passed**, including all 19 intent correctness checks,
  full suite, deployment probes, parameter shapes, hostile inputs, upstream health, and the
  expected no-regression comparison. [Preflight output](evidence/rank1-2026-09-10/preflight-production.txt).
  Registration remained active; watch reported a valid TLS result in 380 ms. `vercel inspect`
  confirmed both production aliases point at the new deployment. Rollback was held and unused.
  No live ranking gain is claimed yet.
- Registered manifest is unchanged. No wallet signing or new registration is required for these endpoint repairs.

## Second release: extraction and weather coverage

The user requested deployment before the next epoch (approximately **05:41 UTC on September 10**).
The first release is already live. This second batch was **deployed at 05:23 UTC and accepted by
05:28 UTC**, leaving approximately thirteen minutes before the stated cutoff.
It changes CONTENT_EXTRACTION, STORM_ALERT, and the shared WEATHER_CHECK /
WEATHER_FORECAST endpoint; the same 19-intent manifest remains registered.

**Fourteen additional failures reproduced before fixes:** six extraction cases and eight weather cases.
Extraction previously selected a category from words in the payload, returned only one requested
category, truncated quoted text at apostrophes, confused quoted field labels with supplied text,
lost cents in comma-formatted currency, and read "March 2026" as "March 20". Instructions and
explicit text are now separate; all requested categories are combined and these values remain intact.
Entity recognition remains heuristic; this does not claim general document understanding.

For weather, `hours=0` and storm "right now" now select the **current hourly interval**, rather than
the next hour. This is modelled hourly weather, not a live station observation. Explicit zero survives
storm parameter parsing, and its point meaning takes precedence over a query's future window.
Storm cache keys now distinguish effective hours across `hours`, `forecast_hours`, `days`, and
`forecast_days`. Stale series, missing/null essential measurements, and an unavailable future storm
point yield unknown instead of a fabricated current/zero/last-available value. A point-specific wind
threshold is assessed at that point, not across earlier hours.

- [Extraction before](evidence/rank1-2026-09-10/extraction-before.txt): 6 failures.
- [Weather before](evidence/rank1-2026-09-10/weather-before.txt): 8 failures.
- [New regressions after](evidence/rank1-2026-09-10/coverage-after.txt): 14/14 passed.
- [Local suite](evidence/rank1-2026-09-10/coverage-unit.txt): 309/309 passed.
- [Full suite](evidence/rank1-2026-09-10/coverage-full.txt): 390/390 passed, with the same older
  provider-unavailable early-return caveat as the first release.
- Preview `miner-jqc1xpscz-wukong4.vercel.app`: mixed email/date extraction, current-hour weather,
  and storm `hours=0` all returned the corrected answers. Evidence files are prefixed
  `coverage-preview-` in the same evidence folder.
- **Production:** `miner-lm6seiqeu-wukong4.vercel.app`, deployment
  `dpl_2vrHHBCnkvT5BtueUpqeQmjZN9Zr`; `vercel inspect` confirms both production aliases, including
  `https://miner-wine.vercel.app`. [Alias evidence](evidence/rank1-2026-09-10/coverage-production-inspect.txt).
- [Targeted production probes](evidence/rank1-2026-09-10/coverage-live-after.json): **6/6 passed**.
  [Initial acceptance](evidence/rank1-2026-09-10/coverage-preflight-production.txt): six gates passed,
  including **19/19 intent correctness**, deployment, parameter shapes, hostile inputs, upstream health,
  and the expected no-regression result. The suite gate failed because an older test required NVD
  attribution and "and" between versions even when the fallback correctly returned the CVE Program
  record. The test now requires the actual source's attribution and both exact affected versions.
  [Affected recheck](evidence/rank1-2026-09-10/coverage-cve-recheck.txt): 29/29;
  [entire failed gate recheck](evidence/rank1-2026-09-10/coverage-suite-recheck.txt): **390/390 passed**.
  All seven gates are accepted across the initial run and this focused recheck. No runtime change
  was needed after the deployed build, and the original failing evidence is retained.
- [Live registration/rank checkpoint](evidence/rank1-2026-09-10/second-release-checkpoint/rank-audit.json)
  still shows complete epoch **320**, **3/19 rank 1**, and active registration 1378. This is the
  pre-release ranking baseline, not a measured outcome of the fixes. The goal remains active.

## Route to fourteen and remaining work

The first target set is the existing three leaders plus ONCHAIN_TX_LOOKUP, GAME_RESULT, TVL_LOOKUP,
CVE_LOOKUP, ACADEMIC_SEARCH, SSL_VERIFICATION, IP_GEOLOCATION, WALLET_BALANCE_CHECK, NEWS_SEARCH,
WEATHER_CHECK, and STORM_ALERT: fourteen total. It is a work queue, not a prediction that they will
all lead simultaneously. Correct answers, provider reliability, the converter, changing scorers,
and per-epoch questions all matter; exact tie ordering is not under this miner's control.

1. Read the next complete scored epoch after this deployed and accepted batch.
2. Continue extraction entity/date coverage and current-weather source fidelity after this accepted release.
3. Re-run current-champion proxy benches for the small-gap intents. Preserve original and revised
   answer text and report authored ground truths and converter approximations explicitly.
4. Audit transaction deadlines and cross-chain provider fallback under delayed and partially failed RPCs.
   Correct unknown answers avoid false claims but do not earn the same usefulness as a full receipt.
5. For sports, broaden completed-fixture retrieval only with validated dates, both teams, competition,
   and a usable Vercel provider. Refusing a substituted result fixes correctness without completing coverage.
6. Record at least fourteen **positive-score**, authoritative rank-1 rows in one complete epoch before
   claiming the mission achieved. Also report ties and near-zero winners separately.

The replay tool now derives all **19 intents** from the manifest; its stale hard-coded 13-intent list
omitted the expansion. A successful refresh merges into the saved corpus, and a failed or empty fetch
cannot erase the previous corpus. The fresh 1,000-row public feed sample contributed 106 distinct
questions across eleven intents. Absence from that sample is not proof that an intent receives no traffic.

## Reproduction

Run from the repository root unless the command changes directory:

```powershell
node track1-miner/tools/rank-audit.mjs track1-miner/docs/evidence/current-rank-audit
node track1-miner/tools/rank-live-probes.mjs https://miner-wine.vercel.app track1-miner/docs/evidence/current-live-probes.json
node track1-miner/tools/coverage-live-probes.mjs https://miner-wine.vercel.app track1-miner/docs/evidence/current-coverage-probes.json
node track1-miner/tools/replay-intents.mjs --refresh --pages 10 --refresh-only
cd track1-miner/miner
node node_modules/typescript/bin/tsc -p tsconfig.test.json
node --test dist-test/test/rank-regressions.test.js
node --test dist-test/test/*.test.js
```

`rank-audit.mjs` refuses inactive registrations, owner/YAML mismatches, and local/registered coverage
drift. It reports a partial epoch as incomplete and does not count an all-zero tie as demonstrated
answer quality. `rank-live-probes.mjs` checks correctness of selected responses; its academic and
sports checks permit an honest unknown, so inspect the saved verdicts before claiming coverage.
