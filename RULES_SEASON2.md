# Telegraph Hackathon Season II (H2) — rules as published

**Primary source:** https://hackathon.telegraphprotocol.com/rules ("Official Competition Rules"). Read
**2026-10-29 ~16:45 UTC** in the browser pane, with each track tab selected in turn, because the Miner and
Evaluator text only renders after a tab click. The text here is quoted or closely paraphrased, and nothing
is inferred. This read replaces the 2026-10-22 read, which is in git history.

**Protocol docs:** the V2 docs, updated 2026-10-27, are served at **https://anjoman.ai/docs** and at
https://docs.telegraphprotocol.com. Both hosts serve the same text, and the second also serves raw Markdown
(`/docs/<page>.md`). The hackathon site still links the second. Anjoman (https://anjoman.ai, "Don't choose the
AI. Choose the outcome.") is Telegraph's consumer front end. Its dashboard (Earn, Eval, Validate, Jobs; Train
"SOON") needs a sign-in, and that sign-in is the owner's.

The organiser's track numbers differ between pages. /rules has 01 Apps & Agents, 02 Miners / Providers and
03 Evaluators. The home, /tracks and /build pages have 01 Miners, 02 Evaluators and 03 Apps & Agents. This
repo calls the miner "Track 1" (`track1-miner/`) and the evaluators "Track 2" (`track2/`).

## What changed since the 2026-10-22 read

| Item | 2026-10-22 | 2026-10-29 |
|---|---|---|
| Final deadline | /rules said Dec 20; /timeline said 1 Dec | **All pages: Dec 1, 2026 23:59 UTC** |
| Judging, results | Dec 21–27; results from Dec 28 | **Dec 2–8 (planned); provisional results from Dec 9**, then a 72-hour appeal window |
| Prize pool | /rules $10,000; home $15,000 | **$10,000 everywhere: $7,000 main competition + $3,000 reserved for separate December challenges** |
| December awards | part of Season II | **Separate challenges** with their own rules and deadlines, announced after Dec 1. "They do not extend Season II." |
| /judging page | older Apps rubric | **404**: removed |
| Starting early | not stated | Allowed. "H2-specific activity and transaction evidence must come from the event period." |
| Entering several tracks | not stated | Allowed, "as long as each entry is a real, distinct contribution" |
| Miner consumption points | as below | Same 4/2/2/2. Adds: "Direct requests don't earn ranked-routing points", but can earn use, repeat-use and accounting points |

The rubric weights, minimums and award counts are unchanged.

## Dates (all UTC; IST is UTC+5:30)

| Date | What |
|---|---|
| Before Nov 1 | Register once on the H2 site ("Register for Season II"). It covers all three tracks |
| **Nov 1 00:00** | Season II opens (Nov 1 05:30 IST) |
| Nov 1–13 | Miners and Evaluators pick the Intents they will serve or score |
| Nov 14 | First Integration Milestone, **Apps & Agents only**. A progress check, "not a submission deadline or a disqualification rule" |
| Nov 15–23 | Build and integrate. "Miners tune against real requests coming off real builds" |
| Nov 20 | Community showcase |
| Final week (Nov 24 – Dec 1) | Anjoman hands-on community session; details to come through official channels |
| **Dec 1 23:59** | **Season II closes for all three tracks** (Dec 2 05:29 IST) |
| Dec 2–8 (planned) | Verification and judging |
| From Dec 9 (planned) | Provisional results; 72 hours from each individual notice to appeal a factual error |
| After Dec 1 | Separate December challenges (the reserved $3,000) |

"Dates may shift if a documented platform issue prevents fair testing."

## Prizes — $10,000

| Pool | Awards |
|---|---|
| Apps & Agents $3,000 | 8 verified-delivery awards of $225; excellence $700 / $350 / $150 |
| **Miners / Providers $2,000** | **4 verified-delivery awards of $300; excellence 1st $500, 2nd $300** |
| **Evaluators $2,000** | **4 verified-delivery awards of $300; excellence 1st $500, 2nd $300** |
| December challenges $3,000 | 4 × $500 for new mission results and useful technical work; 2 × $500 for real adoption and ecosystem activity |

- "A team can win one delivery award and one excellence award in the same track if it qualifies for both."
  Each independent group can win at most one delivery award per track.
- Related wallets, jointly controlled teams and materially identical submissions count as one group.
- December challenges publish their own entry rules, evidence and deadlines before they open. "Entering the
  main hackathon does not automatically enter you in a later challenge." A result cannot be paid twice.
- **Payout:** eligible countries, identity and tax checks, payout methods (a wallet option included) and timing
  are "governed by the official prize-payment terms. Those terms must be available before the competition
  opens." Registration alone does not confirm eligibility for a cash prize. GitHub bounties and network
  earnings are separate from the prizes.

## What every entry must do (§05), before it is scored

1. Something working: an app, a callable Provider service, or a valid Evaluator contribution.
2. A real Telegraph integration, with genuine evidence for any claim about registration, requests, rankings,
   payment, accounting or rewards.
3. Repeatable results: reviewers try new inputs and reasonable error cases.
4. Safe handling of permissions, spending limits, errors, private data, keys and confidential evaluation
   material.
5. Accurate claims: state the network used and what was verified. "Testnet, production, internal testing,
   and real customer demand are different things."

**Miners / Providers:** "Your service must answer real calls for a supported Intent. Judges will check
correctness, independently measured quality, uptime, capacity, speed, costs, useful Intent coverage, and
whether it helped H2 mission apps." Each Miner–Intent pair is tested on its own task and against relevant
same-Intent competition. "Only claim live rankings, routed use, or earnings when the network records support
them."

**Evaluators:** "Submit an adapter, evaluation material, or both, with a sound, repeatable way to measure
quality." Where a baseline exists, show a fair comparison; for a new or underserved Intent, show credible new
tests. "Don't claim Canonical status, a finalized ranking change, or paid material use without network
evidence. Useful evaluation work can qualify even before live activation."

**Apps & Agents** (they buy our answers): at least one "genuinely autonomous machine-to-machine purchase or
sale using the supported Telegraph flow". A supported testnet implementation can qualify.

## Rubric (§06): out of 100; a winner needs ≥ 70 and the track minimum

**Miners / Providers**, minimum 24/35 on quality. **Re-read live 2026-11-05 ~09:40 UTC** at
https://anjoman.ai/dashboard/hackathon/season-2/rules (Miners tab in §05, §06 and §08). The weights changed
from the 2026-10-29 read (35/20/15/10/10/10), and growth (20) is new for Miners too:

| Points | Criterion | 2026-10-29 |
|---:|---|---:|
| 35 | Independently evaluated intelligence quality (minimum 24) | 35 |
| 15 | Reliability, availability, and capacity | 20 |
| 10 | Verified Intent coverage and application enablement | 15 |
| 10 | Verified H2 mission application consumption | 10 |
| 5 | Cost, latency, and serving economics | 10 |
| 5 | Integration and documentation | 10 |
| 20 | Organic growth, education, and developer activation (same 5/5/5/5 table as the Evaluators) | — |

§05 for Miners, 2026-11-05: "Your service must answer real calls for a supported Intent. Judges will check
correctness, independently measured quality, uptime, capacity, speed, costs, useful Intent coverage, and whether
it helped H2 mission apps. Each Miner–Intent pair is tested for its specific task and against relevant same-Intent
competition. Only claim live rankings, routed use, or earnings when the network records support them."

The 10 coverage points reward "useful Miner–Intent capabilities, especially ones needed by the 15 missions".
"Creating lots of Intents or generating meaningless traffic does not earn extra points."

The 10 consumption points are awarded once per Provider, across all its Miner–Intent pairs:

| Points | Evidence |
|---:|---|
| up to 4 | 1 for use by a qualifying H2 mission app, "including your own team's app"; +1 for each of up to three independently operated consuming app groups |
| up to 2 | 1 for ≥ 3 meaningful, independently verifiable executions with different inputs; 1 for use on two different UTC dates |
| up to 2 | Requests through the ranking and routing policy for that Intent. "Direct requests don't earn ranked-routing points." |
| up to 2 | 1 for a matched request-to-Miner–Intent delivery record; 1 for verified cost, spend or payment accounting (testnet and batch records count) |

- "Related-party use can prove the service works but does not earn extra independent-user points."
- "Direct requests can earn use, repeat-use, and accounting points if verified."
- "Development-stage use counts when reviewers can verify the underlying mission work and requests."

**Evaluators**, minimum 28/40 on validity. **Re-read live 2026-11-01 ~17:00 UTC** (Rules page, Evaluators tab in
the scoring section). The weights changed from the 2026-10-29 read (40/20/15/20/5), and growth is new:

| Points | Criterion |
|---:|---|
| 40 | Measurement validity, quality discrimination, and baseline evidence (minimum 28/40) |
| 15 | Integrity and robustness |
| 10 | Reproducibility and protocol compatibility |
| 10 | Useful evaluation coverage and demonstrated improvement |
| 5 | Documentation and integration clarity |
| 20 | Organic growth, education, and developer activation |

Validity: "Judges will test evaluators using repeatable methods, appropriate unseen examples, and credible reference
answers or other defensible checks. If a baseline exists, compare against it under similar conditions." Growth (20)
splits into four 5-point parts:
- **Content and education:** a public explanation (2), a tutorial on Telegraph's role (2), honest limitations (1).
- **Ease of adoption:** steps with an example (2), something another developer can test (2), troubleshooting and costs (1).
- **Organic distribution:** "At least three meaningful original updates on separate dates" (2), sharing beyond our own team (2), follow-up (1).
- **Community activation:** an invitation with a next step (1), an independent developer acting on it (2), a further verified contribution (2).

"Posting alone does not earn all 20 points." Tag @Telegraphprotoc on X.

A result that confirms an existing ranking can still be valuable. Adapter-only, material-only and combined
entries are each judged on what they actually contribute.

**Apps & Agents**, for reference: 35 technical quality and mainnet readiness (minimum 24), 30 commercial
viability, 15 real independent adoption and retention, 10 quality of the Telegraph integration, and 10 proof,
demo, tutorial and repeatable results.

**Excellence:** ranked by total. Ties go to the track's main technical score, then to independently
repeatable proof, then to a recorded fair draw.

## Verified-delivery awards (§07): Miners and Evaluators, 4 per track

Judges choose the set of four qualifying independent groups that, in order:

1. enables the most distinct commercial missions;
2. enables, unblocks or improves the most distinct H2 app workflows;
3. meets the most independently verified missing mission-critical Intent needs;
4. has the strongest combined technical quality.

Provider ties go to verified H2 mission-app consumption, then to the quality score. Evaluator ties go to
proven measurement improvement or valuable new coverage, then to the validity score. Mission impact needs real
proof: "a reviewer rerunning an app, an accepted integration test, or a repeatable mission-specific test".
"Each claimed Intent must pass its own relevant tests." A Provider or Evaluator can qualify with a suitable
test for a new mission-critical capability while the apps that will use it are still being built.

## What to submit by Dec 1 23:59 UTC (§08), through the H2 website

1. Project details: team and contact, track, project name, the missions or Intents chosen, and a working or
   reviewer-access link.
2. A 2–5 minute demo video showing the real input, the result and the Telegraph integration.
3. How to run it: beginner-friendly steps, sample request, expected result, the actual network, spending
   limits or costs, and known limitations.
4. Evidence: receipts, requests, accounting records, service endpoints, evaluation methods, tests and
   rankings. Sensitive material may be shared privately with judges.
5. A short public summary with one Try, Use, Connect, Build or Compete link.
6. Showcase permission: what may be shared publicly, including Anjoman experiences, and whether we agree to
   buyer introductions. It does not affect scores.

**Provider evidence:** list the Miner–Intent pairs. If claiming consumption points, list the consuming
mission apps, independent groups, repeat use, ranked routes and accounting evidence. Show which
mission-specific tests or applications the service enables.

**Evaluator evidence:** the Intent, the adapter or material version, the results, and a fair baseline
comparison or credible new coverage. Show which mission-specific tests or applications it enables.

**Public posts:** scored since the growth criterion (20) was added to every track (Evaluators read
2026-11-01, Miners 2026-11-05). Organic distribution (5) asks for "at least three meaningful original updates on
separate dates covering progress and results", sharing beyond our own team, and follow-up to feedback. Followers,
stars and reposts earn nothing; an independent developer acting on the work earns up to 4 of the 5 community
points. The links go in the public summary or the evidence field (§08). In the final-week Anjoman session,
participants show what they actually did and say whether it was on testnet or production.

## Verification (§09) and fair play (§10)

- **Result labels:** Mission Verified (reproduced on the stated network), Production Verified, Commercially
  Validated (independently funded third-party customer activity), and Competitive Supply Verified (at least
  two meaningfully independent Providers meet the quality bar).
- **"Ranking evaluations and live customer requests are not the same activity."** Demand a Provider receives
  "also depends on eligibility, quality, price, availability, and the routing policy." A request or payment is
  never counted twice. Protocol-paid tests, internal demos, testnet traffic and independently funded customer
  activity are told apart.
- **Platform problems:** affected milestones are extended by the documented impact.
- **Disqualifying:** "Fake receipts, manufactured adoption, collusive requests, copied work presented as
  independent, or disclosure of protected material". Related teams or wallets must be disclosed when asked.
- **Ownership:** entrants keep their work. Public features, reused media and buyer introductions need consent.
- **Prior work:** preparing before Nov 1, reusing our own code, and adapting open source under its licence are
  all allowed. Major reused components must be disclosed.

## Protocol V2: what the miner and evaluators must follow (anjoman.ai/docs, read 2026-10-29)

Sources: `/docs/whats-new-v2`, `/docs/miners/miner-overview` and `/docs/miners/miner-registration`, all
"Updated October 27, 2026".

- **Intents are families.** Register intents (`FX_NOW_EUR`, `WEATHER_FORECAST_GENERAL`), never family
  prefixes (`FX_NOW`). Listing a prefix reverts the whole registration with "a prefix is not an intent". There
  are 21 judgment families with a `_GENERAL` intent. Anyone can propose a new intent, and the admin approves
  it. Check with `getPrefixes()(string[],uint8[])` as well as `isCanonicalIntent`.
- **`updateMiner`** changes the YAML, price, fee address or intents in one transaction, and issues a **new
  `registrationId`**. A revert leaves the old registration untouched. `updateMinerFor` and `registerMinerFor`
  are relayed EIP-712 twins.
- **Optional `intent_mapping`:** paths and formulas that read each answer field exactly. Jobs no longer read
  `on_chain.request` / `on_chain.fields`. The node builds the request from the Intent's inputs. An endpoint
  without `params` is legal, but it is "the most common reason a registered, active miner fails the calls it
  is sent".
- **Shape:** `result` is read into the Intent's own shape (`result_shape`, `field_status`, `format_version`,
  `shape_error`). `parsed` is gone. `GET /engine/v1/intents/{intent}` returns the request schema, the response
  format and the on-chain layout.
- **Spot checks:** "on average about once per hour for each Intent (the node default), at randomised times".
  Any non-empty answer passes. Consecutive failures trigger a Routing Revocation until the next epoch
  tournament. The 2026-10-22 docs said about every 20 seconds.
- **Routing:** 70% / 20% / 10% to ranks 1–3 by Canonical Score, the stake-weighted median of validator local
  scores. Rank 4 and below get no routed share.
- **Grace period:** 7 days "after registration" (overview) or "after activation" (registration page). The miner
  is off the leaderboard, and all grace-period miners share 5% of routed traffic.
- **Earnings:** from demand only. `min_price_usdc × demand_multiplier × 0.98`, swapped to MACHINA over 24 h;
  settlement waits for 100 USDC to accumulate. The floor is 10000 (0.01 USDC). Anjoman's Earn page says
  instead "Each answer it returns is paid in USDC" (G219).
- **Chain (corrected 2026-10-31, G236):** V2 runs on **Ethereum Sepolia** (chain ID 11155111), Diamond
  `0x3624EB012B5E998BB57B6bE6C9Cfc9c4bc5eb99b`. The Base Sepolia Diamond `0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8`
  below is the earlier chain. Current addresses are at
  `/docs/protocol/addresses-and-params`. After a chain move, the admin imports existing miners with the same
  id and owner.
- **Evaluators (re-read 2026-10-31 ~18:30 UTC; docs updated Oct 31):** judgment and hybrid families take an
  **Evaluator adapter as a safetensors delta** (LoRA deltas plus a reward head) on the validators' shared
  Foundation Model (ModernBERT-base). Full-model float `.wasm` adapters are now refused too (`legacy_full_model`).
  Deterministic families take a comparator module, unchanged; the node holds the reference rule, so a
  deterministic intent is scored without one (G237 killed). Call: `registerWasm(hash, url, prefix, feeAddress,
  runnableUrl)` with a $5 MACHINA bond, or `registerWasmFor` relayed. The Anjoman Eval page says an adapter
  "replaces the live scorer only when it beats the incumbent on a hidden sample by the replacement margin".
- **Evaluation pool:** judgment questions count only once 5 different contributors have material in the pool;
  truth sources for deterministic intents have no minimum. Uploads are signed (EIP-191), with no gas and no
  registration. Each upload is credited to the signer.
- **Epochs:** 1 hour on devnode since 2026-10-31 (they were 5 minutes earlier that day; G239).
- **Docs host:** docs.telegraphprotocol.com now redirects to anjoman.ai/docs, and raw `.md` is no longer served
  (2026-10-31).
- **Rules additions seen 2026-10-31** (substance otherwise unchanged): Miners, "A high-quality new capability can
  qualify even if customer demand for its Intent is still growing"; the 10 consumption points reward requests
  served "to registered H2 Apps & Agents projects". Evaluators: judges check "correctness, robustness, fit with
  Telegraph's evaluation pipeline, useful coverage, and documentation".

**Intent catalogue:** the H2 /intents page lists **134** intents, each Deterministic, Hybrid or Judgment
(2026-10-29). `devnode /engine/v1/intents` returns **136** on-chain names (2026-10-29 16:47 UTC).
