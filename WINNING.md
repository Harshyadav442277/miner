# WINNING.md — the goal: win Season II in the Miner and Evaluator tracks

Written 2026-10-22 ~17:10 UTC (22:40 IST). This is the goal file. Every plan, task and review in this repo
answers to it. Rules: [RULES_SEASON2.md](RULES_SEASON2.md), read from the organiser's site today. Season I
post-mortem: [track1-miner/docs/S1_LESSONS.md](track1-miner/docs/S1_LESSONS.md).

**Track names.** This repo calls the miner **Track 1** (`track1-miner/`, LiveCert, registration 4829) and
the evaluators **Track 2** (`track2/`). The organiser numbers them 02 Miners / Providers and 03 Evaluators.
We do not enter 01 Apps & Agents (but see A4).

## 1. What "win" means, in prize terms

A group can take **one verified-delivery award and one excellence award per technical track**, and at most
one award per December category.

| Target | Prize | How it is decided |
|---|---:|---|
| Miners: excellence 1st | $500 | highest total out of 100 |
| Miners: a verified-delivery award | $300 | most distinct commercial missions enabled, then app workflows enabled, then missing mission-critical intents addressed, then quality |
| Evaluators: excellence 1st | $500 | highest total out of 100 |
| Evaluators: a verified-delivery award | $300 | same order as Miners |
| December technical outcome | $500 | reusable Provider or Evaluator capability that unblocks apps |
| December adoption | $500 | independently confirmed downstream use |

**Ceiling: $2,600.** Nothing pays unless the entry scores **≥ 70/100** and clears the track minimum:
Miner quality ≥ 24/35, Evaluator validity ≥ 28/40.

**Prize pool:** /rules says $10,000 with the split above. The home page still says "$15,000 USD". We plan to
/rules (G203). Our track numbering matches the /tracks page: 01 Miners, 02 Evaluators.

**The dated, exactly-what-to-do checklist is §8.**

**Deadline:** the two organiser pages disagree. /timeline says submissions close 1 Dec; /rules says
**Dec 20 23:59 UTC**. We plan to **1 Dec 23:59 UTC (2 Dec 05:29 IST)** and treat Dec 20 as slack, until
the organisers confirm in writing (G203).

## 2. Where we stand — checked 2026-10-22 16:50 UTC unless noted

**Track 1, the miner**

- **Registration 4829:** `active`, 36 intents, no rejection. Production `miner-wine.vercel.app` answered
  `/ssl-check` with HTTP 200 in 1.1 s.
- **Quality, production (audit 2026-10-21):** 110 pass, 17 partial and 27 fail out of 154 questions checked
  against primary sources. Evidence is in `correctness-audit-2026-10-21/` on branch
  `claude/correctness-audit-2026-10-21`.
- **Not deployed:**
  - 22 of the 27 fails are fixed on that branch;
  - the places table (`afda450`) is on this branch.
- **Production can still clear an aliased sanctioned party (G201).**
  - On 2026-10-21 "Rosneft" returned `no_match`: a failed alias download had been cached as a complete list.
  - On 2026-10-22 at 16:57 UTC it returned `match` (SDN 17022), so the failure is intermittent.
  - The fix is undeployed. Clearing a sanctioned party is the worst wrong answer we can give.
- **Open owner decisions:** the news-source licence (it serves WEB_SEARCH, bought by 7 missions),
  STOCK_PRICE, Nominatim policy (G199), push, deploy, and Season II registration.

**Track 2, the evaluators**

- **31 comparators**, one per mission-bought deterministic intent. They reproduce the node's own answer key
  on 234,848 cases. They are published and their hosted hashes match (track2 branch
  `claude/wasm-track-2-quality-e21db3`).
- **Not registered.** `/api/evalpool/status` still returns 404.
- **The LLM_OUTPUT_EVALUATION adapter was withdrawn.** It scored 96.9% in the kit but 81.0% as the node runs
  it (G32). It is being retrained on the node's base.
- **The kit refuses to package FACT_CHECK and WEB_SEARCH** (track2 G29, question to the organisers).

## 3. Decisions taken, and why each is needed to win

Each decision is tied to the rubric line it serves. Dates are when it was taken; the commits are on
`codex/rank1-14-intents` unless noted.

**Track 1, the miner**

| # | Decision | Why it is needed to win |
|---|---|---|
| D1 | **Correct against the primary source is the target.** Not scorer similarity, not a single epoch's rank. Set 2026-10-17; audit 2026-10-21. | Quality is 35 points with a 24-point floor, judged by reviewers on "realistic unseen inputs" and each intent "checked separately against … same-Intent competition". Below 24 nothing else counts. Season I proved the scorer proxy was the wrong target ([S1_LESSONS](track1-miner/docs/S1_LESSONS.md) L1). |
| D2 | **The answer comes first, then every value as a field, then `checked_at` and the source.** 2026-10-11 to 14: `src/envelope.ts`; the question echo removed. | A reviewer can check a field against the source in seconds. An app can consume it, which serves coverage (15) and consumption (10). Integration and docs (10) need a stable shape. In Season I the two leaders did exactly this, and 61% of our answers opened by echoing the question. |
| D3 | **Quality over count.** Seven low-value intents removed 2026-10-14 (`2e8d1cf`), leaving 36. | "No additional points for raw volume or nominal Intent registrations." A weak intent adds no points, and it is another place for a reviewer to find a wrong answer. |
| D4 | **Seven mission intents added** 2026-10-13/14 (`src/mission-routes.ts`): sanctions, company registry, SEC filings, transfer verification, macro, URL reputation, question answering. | Delivery awards rank by **distinct missions enabled**, and coverage is 15 points "especially those enabling commercial missions". These seven appear 27 times across the 15 mission pages (read 2026-10-10). |
| D5 | **No CHAT_COMPLETION.** 2026-10-11. | 19 miners serve it, many wrapping large models, so we have no edge. A free key's quota fails under exactly the load we want. That would cost reliability (20) and quality. |
| D6 | **Licensed for paid use.** 2026-10-18: MET Norway and Nominatim replace Open-Meteo and BigDataCloud (`e86a0f4`); Groq replaces an unofficial Google endpoint and MyMemory (`329254b`). | The owner's goal is "correct, sourced and licensed for paid use". The rules (§10.05) keep every submission "subject to applicable third-party … licenses", and every request is a paid resale. A source whose terms forbid commercial use is a finding waiting for a reviewer. |
| D7 | **A built-in places table from Wikidata (CC0).** 2026-10-21, `afda450`, not deployed. | Nominatim allows about one request per second and has answered us with 429 (G196). In the replayed weather questions, 80 of 99 skip it. That serves reliability (20) and latency (10). |
| D8 | **Keyless or free upstreams wherever they exist.** | Cost and serving economics are 10 points. A paid key that runs dry is an outage: TxLens's search and fact check returned 502 on 2026-10-11 when its Perplexity credit ran out. |
| D9 | **Registered and live before the start.** `updateMiner` mined 2026-10-16 as registration 4829. | In Season I we were scored in 15 of 105 epochs. Reliability (20) is measured over time, and a late start cannot earn it back. |
| D10 | **Refuse honestly; never fabricate.** For example the fact-check fix G188 (`a9867c3`): "reported" sentences never support a claim. | Reviewers "test an appropriate failure case". Fabricated proof is disqualifying (§10.03). In Season I ChainSight told one app 1,200 times that a CVE id was a confirmed transaction. |
| D11 | **Repo cut to Season II.** 2026-10-17/18: 755 Season I rank files deleted. | Integration and documentation is 10 points, and reviewers read the repo to reproduce the work. |

**Track 2, the evaluators**

| # | Decision | Why it is needed to win |
|---|---|---|
| D12 | **Stop `rank_answer` and calibration wrappers.** 2026-10-18 and 21. | The node rejects `rank_answer` modules ("retired"). A monotone wrapper changes no ordering, so it improves nothing that validity (40) measures. |
| D13 | **31 comparators, each proved against the node's own reference rule in the node's runtime.** 2026-10-22 (track2 `0a88f02`). | Validity (40, floor 28) and reproducibility (15) need proof on the real pipeline. Coverage (20) rewards "credible new coverage", and 61 of the 76 mission-bought intents had no scorer. Delivery awards count missions enabled. |
| D14 | **Withdraw the adapter that does not reproduce on the node.** 2026-10-22 (`ca368a5`). | Integrity (20) and validity: never submit a number the node will not reproduce. 96.9% in the kit against 81.0% on the node would have been caught by reviewers. |
| D15 | **Adapter target: LLM_OUTPUT_EVALUATION.** The kit refuses FACT_CHECK; LLM_OUTPUT_EVALUATION is a judgment intent that it packages. | Coverage only counts where a module can actually be accepted. |
| D16 | **Train only on pairs we never upload to the evaluation pool. No miner fingerprints in any scorer** (track2 rule 2). | Integrity (20). The rules disqualify leaked confidential material and collusive work, and we also run a miner. |

## 4. Asymmetric strategies — what we bet on, and why

An asymmetric bet is one where our cost is small or already paid, and the payoff is large or comes from
ground most competitors ignore.

| # | Strategy | Why it is asymmetric | Guardrail |
|---|---|---|---|
| A1 | **One correctness loop feeds both tracks.** The audit's primary-source questions (154 today) become miner regression tests and evaluator reference material. | Most entrants build one side. We pay for the reference data once and use it twice. Each track's evidence also strengthens the other: "our miner is right, and here is the measurement that proves it". | Scorers stay identity-blind, with our own wrong answers scored down (track2 rule 2). The related entries are disclosed (§10.03). |
| A2 | **Cheap breadth where breadth is what gets counted.** A comparator is about 2 KB and either passes the fixed rule or does not. One deployment serves every miner intent. | Delivery awards rank by distinct missions enabled. 31 comparators cover the deterministic mission intents at almost no marginal cost, where others build one adapter at a time. | Breadth only where quality holds. Each miner intent is checked separately (D3), and we drop what fails. |
| A3 | **Licence-clean, keyless supply.** | Most miners resell free APIs whose terms bar commercial use, or depend on a key that can run dry. The swaps cost us days. If anyone checks, our competition shrinks. It also lowers our serving cost (10 points). | Never claim "licensed" for an upstream whose terms we have not read: ip-api and ipinfo are unread (G202). |
| A4 | **Related-party consumption evidence, which the rules allow and cap.** A small H2 mission workflow of our own, for example in Morse, can earn the own-team point (1), repeated use (2), ranked routing (2) and accounting (2): **up to 7 of the 10 consumption points** without waiting for outside adoption. | Most miners will reach December with zero consumption evidence. These points are open to anyone who builds the evidence chain. | **The owner decides (G204).** Folder override 2 says nothing we control counts as a user or as volume. It is labelled related-party, never as users or demand, and never as raw volume (worth 0 points anyway). |
| A5 | **Run the reviewers' test before they do.** Every week: the audit questions, hostile inputs and parameter shapes, against production. Publish the result. | Reviewers use "realistic unseen inputs [and] relevant error cases". We will have fixed what they would find, with dated evidence. The weekly result is also the weekly X update the rules ask for, so we pay once and get both. | Publish failures too. An audit that only reports passes is fabricated proof. |
| A6 | **Fill mission-critical gaps nobody serves correctly.** Every mission intent has 9–56 registered miners (`/engine/v1/intents`, 2026-10-22), but registered is not correct: ChainSight answered "Unable to process" to sanctions and macro questions on 2026-10-11. | Delivery tie-break 3 counts "independently verified missing mission-critical Intent needs addressed". Proving a gap with fixtures also serves Track 2's coverage. | A claim of a "gap" needs side-by-side fixtures against the primary source, not a miner count. |
| A7 | **Aim at the December pool, the largest single pool ($3,000).** It rewards "reusable Provider, Evaluator, or integration capabilities that demonstrably unblock substantive applications", and November work counts. | Our per-mission integration recipes, the comparators and the open evaluation material are exactly that, and they already exist. | Each artifact can be paid only once. Each must show an application it unblocks. |
| A8 | **Be up every hour from Nov 1, and prove it.** | Reliability is 20 points, more than coverage. Most hobby miners keep no availability record. Validators also spot-check liveness about every 20 s, and consecutive empty answers revoke routing for that intent until the next epoch (docs). | The uptime workflow has been off since 2026-10-01 at the owner's request. It needs the owner's yes to resume (G205). |

## 5. What to improve, in order of points at stake

**Track 1, the miner**

1. **Deploy the audit fixes and the places table** (owner's yes). Production failed 27 of 154 audit
   questions on 2026-10-21, and the code behind those failures is still live, including the sanctions alias
   bug (G201). This is quality, the 24/35 gate.
2. **Close G200**, or drop the intent:
   - RESEARCH_QUERY fails 3 of 4 (no mission buys it);
   - ACADEMIC_SEARCH fails title lookups;
   - FINANCIAL_DATA answers product-level questions with company totals.
3. **Settle the licences** (owner): the news source behind WEB_SEARCH, NEWS_SEARCH and NEWS_HEADLINES;
   STOCK_PRICE (Yahoo); ip-api and ipinfo terms; Nominatim policy (G199); URLhaus.
4. **Reliability evidence** (20):
   - resume an availability record from Nov 1;
   - add a capacity test at a stated concurrency;
   - keep the upstream health check in the record.
5. **Next `updateMiner`**:
   - every endpoint description written as example questions, parameters and returned fields;
   - fix the weather claims MET Norway cannot meet (G195) and the Google News naming;
   - apply the removals in §6.
6. **Consumption** (10):
   - a recipe for each mission that buys our intents (`docs/INTEGRATE_LIVECERT.md`);
   - office hours Nov 15–21;
   - A4 if the owner agrees.
7. **Submission pack, built from week one:**
   - a 2–5 minute video and a beginner tutorial (network, cost, limits);
   - evidence: receipts, ranking references, the audit;
   - a public summary.
8. **A weekly post tagging Telegraph**, carrying A5's results. Season I reach was 132 followers against the
   winner's 5,469.

**Track 2, the evaluators**

1. **Register the 31 comparators** the day `/api/evalpool/status` answers (owner signs; sign list
   `track2/SIGN_S2.md`). Record the hosted-hash evidence with each registration.
2. **Retrain the adapter on the node's ModernBERT** and prove it in the node runtime (`verify_wide`). Submit
   only at **≥ 70% on held-out pairs as the node runs it** (the hidden-pool threshold).
3. **Get the organisers' answer on G29** (FACT_CHECK and WEB_SEARCH packaging). These two are the largest
   judgment targets.
4. **Contribute evaluation material** (signed public pool) for mission intents. It is a scored contribution
   type on its own.
5. **Publish robustness results:** the flip, fabricate, misquote and off-topic negatives already generated.
   That is integrity (20) with evidence.

## 6. What to remove

The rule behind every cut: each claimed intent is reviewed on its own, and registrations earn nothing.
Remove an intent when it fails on quality or licence and no mission needs it. Mission counts come from the
15 mission pages read 2026-10-10; re-count them before the Nov 1–7 intent pick. Our 36 intents: 20 are
bought by at least one mission, 16 by none.

**Intents. These need the owner's `updateMiner` signature; do them in the one update in §5.5.**

| Intent | Missions | Why remove | Verdict |
|---|---:|---|---|
| NEWS_HEADLINES | 0 | Google News RSS is non-commercial (G194). An audit question failed | **remove** |
| IP_GEOLOCATION | 0 | ip-api terms unread, believed non-commercial. 1 of 5 audit questions passed on production. The Tokyo pin fails in every gate | **remove**, or keep only after the terms are read and the branch fixes are deployed |
| STOCK_PRICE | 1 | Yahoo forbids commercial use | **remove** unless the owner pays for data (it also covers the listed-company half of `/financial`) |
| RESEARCH_QUERY | 0 | 3 of 4 audit questions fail (G200) | **fix by Nov 1 or remove** |
| NEWS_SEARCH | 0 | Same news-licence problem as WEB_SEARCH | keep only if the news source is licensed |
| RESEARCH_SYNTHESIS, ACADEMIC_SEARCH | 0 | Audit partials and a fail; OpenAlex sheds anonymous traffic (G81) | keep only if G200 is closed |

**Keep:** the other 20 mission intents (the news-sourced WEB_SEARCH once licensed), and the non-mission
intents whose audit fails are all fixed on the audit branch and that cost nothing to run. Those are SSL, STORM, WEATHER_FORECAST,
ONCHAIN_TX, WALLET, TOKEN_HOLDER, CVE, URL_SCAN, CURRENCY_EXCHANGE and FRAUD_DETECTION.

**Tooling and docs. DELETED 2026-10-22 on the owner's yes; kept in git history.** Typecheck was clean and
unit tests passed 771/771 after the deletion.

| Path | Why |
|---|---|
| `track1-miner/tools/sign-update.sh` | Season I registration 389 with 13 intents; referenced by nothing |
| `track1-miner/tools/onchain-shape-bench.mjs`, `tools/candidate-corpus.json` | Benchmarks against the Season I `rank_answer` champion, a module kind the node no longer runs (update the three comments that mention it) |
| `track1-miner/tools/replay-corpus.mjs`, `tools/corpus.json` | Superseded by `replay-intents.mjs`, as that file's own header says |
| `track1-miner/docs/score-history.jsonl` | Season I per-epoch scores, last row 2026-09-10 (git keeps it) |
| `track1-miner/tools/opportunity-scan.mjs` | Season I occupancy-and-score scan; Season II intents are picked by mission |
| `track1-miner/docs/evidence/improve-2026-10-11/`, `season2-build-2026-10-11/`, `release-2026-10-11/` | Pre-release and superseded evidence; the 10-14 and 10-18 releases replace them |

**Update, do not delete:**
- `tools/rank-audit.mjs` (defaults to registration 2750 and a deleted folder; ranking still decides routing);
- `tools/record-scores.mjs`, once the Season II ranking API is known;
- the stale `"description"` in `track1-miner/miner/package.json`.

**Source code:** nothing dead. All 79 modules are reachable from `api/index.ts` and `src/server.ts`, and
every export is used (checked 2026-10-22). Code leaves only with the intents above.

## 7. How we will know we are winning

| Criterion | Evidence we must hold by the deadline | Today |
|---|---|---|
| Miner quality (35, ≥ 24) | Audit pass rate on production, every claimed intent, against primary sources, dated | 110/154 on production; 22 fixes undeployed |
| Reliability (20) | Availability log from Nov 1; a capacity result | none (monitor off) |
| Coverage (15) | Mission × intent matrix with a fixture per mission | counts only, no matrix |
| Consumption (10) | Receipts from H2 app requests: routed, repeated, accounted | none |
| Cost and latency (10) | Per-request upstream cost (mostly 0) and p50/p90 latency | latency is in the feed, not written up |
| Integration and docs (10) | Recipes, tutorial, video | recipes exist; no tutorial or video |
| Evaluator validity (40, ≥ 28) | Node-runtime proof per module | 31 comparators proved; adapter retraining |
| Evaluator integrity (20) | Adversarial pair results | pairs generated, results unpublished |
| Evaluator coverage (20) | Intents newly covered, missions enabled | 31 intents |

Review this table at every checkpoint (Nov 1, Nov 8, Nov 15, Nov 22). Re-decide each time. Hours already
spent are not an argument.

## 8. Exactly what we must do, by date

Taken from /rules §05, §08 and §09 and the miner docs, read 2026-10-22. All times are UTC.
- **Owner:** registering, signing, posting and anything sent in the owner's name.
- **Claude:** the rest, each on the owner's yes where noted.

### Now to Oct 24

- [ ] **Owner: register for Season II** on the site with `harsh.2024a@vitstudent.ac.in`. It is the "Register
      for Season II" button; one registration covers all three tracks.
- [ ] **Owner: send the organisers the message below** on Discord (discord.gg/telegraphprotocol).
- [ ] **Owner: choose when the next `updateMiner` happens (G206).** Every update issues a new
      `registrationId`, and the first 7 days "after activation" are a grace period off the leaderboard,
      sharing 5% of routed traffic. If that restarts, an update made in November costs a week of 70/20/10
      routing while apps are buying.
  - **Option A: sign by Oct 24 23:59 UTC**, so any new grace period ends by Oct 31. It carries:
    - the §6 intent cuts;
    - the weather claims MET cannot meet (G195);
    - the Google News naming;
    - rewritten endpoint descriptions.

    Do it only if the sandbox validation is green by Oct 24 12:00 UTC.
  - **Option B: freeze registration 4829 for the season.** All fixes ship as code deploys, which do not
    touch the registration. Unlicensed sources answer `not_licensed`.
  - **Recommendation:** A if it is validated in time, otherwise B. Make no `updateMiner` during Nov 1 –
    Dec 1 unless the organisers confirm the grace period does not restart.
- [ ] **Claude, on the owner's yes:** deploy the audit branch (22 fixes, including G201) and the places
      table. Steps: preview, gates, production, `preflight.mjs`. This is code only; the registration is
      unchanged.
- [ ] **Owner:** yes to push `codex/rank1-14-intents`. Reviewers reproduce from the public repo, and Option A
      pins the YAML to a pushed commit.

### Oct 25 – Oct 31

- [ ] **Claude: a mission × intent matrix**, with one reproducible test fixture for each mission our intents
      enable. That is coverage (15) and the first delivery-award criterion.
- [ ] **Claude: close G200**, or remove RESEARCH_QUERY: in the update under Option A, or as `not_served`
      under Option B.
- [ ] **Owner yes, then Claude: an availability record from Nov 1 (G205)**, plus one capacity test at a
      stated concurrency.
- [ ] **Track 2:**
  - retrain the adapter and prove it in the node runtime (`verify_wide`);
  - register the 31 comparators the day `/api/evalpool/status` answers (owner signs; `track2/SIGN_S2.md`).

### Nov 1 – 7 (pick intents, start in public)

- [ ] **Owner: post an "at the start" update** tagging Telegraph: the miner, the evaluators, the intents we
      serve, and how an app gets our answers.
- [ ] **Claude: first weekly production audit (A5).** Publish the results, failures included.
- [ ] **Confirm the intents we claim** are the ones that pass the audit. Each is "checked separately".

### Every week until submission

- [ ] **Owner:** one progress post tagging Telegraph, carrying that week's audit numbers.
- [ ] **Claude:** the audit re-run, the availability log, a fix for every failure found, and the replay of
      real routed questions ("Miners tune against real requests coming off real builds").

### Nov 15 – 21 office hours; Nov 20 community showcase

- [ ] Bring the per-mission recipes to app teams, and ask on Discord which intents their builds buy.
      Independent consuming groups are worth up to 3 of the consumption points.
- [ ] Show a milestone at the Nov 20 showcase: a verified quality gain or a registered comparator.

### Submission. Planned for 1 Dec 23:59 UTC (2 Dec 05:29 IST); the official rules say Dec 20

Make one submission per track on the H2 website. Each holds the six items /rules §08 lists.

| Item | Miner entry (LiveCert) | Evaluator entry |
|---|---|---|
| 01 Participant and project | Track Miners / Providers; the intents we claim; `miner-wine.vercel.app` | Track Evaluators; the intents covered; the published release |
| 02 Video, 2–5 minutes | Realistic input, the answer, the receipt and the ranking | Module proved in the node runtime, against the baseline |
| 03 Tutorial | How an app gets our answer through Telegraph: an example request, expected output, Base Sepolia, the $0.01 floor price, limitations | How to reproduce the proof and the hashes |
| 04 Evidence | Registration 4829 and its YAML hash; per-intent ranking references; receipts for any H2 consumption; the availability log; the audit; a latency and cost table | Methodology, results against a baseline, hosted keccak hashes, registration transactions, protected reference material through reviewer access |
| 05 Public summary | What works today, and one Try or Connect link | What it measures, and one Compete or Build link |
| 06 Showcase preferences | Owner's choice | Owner's choice |

- **Disclose that the two entries are related** (§10.03), and any own app under A4.
- **Final week:** an Anjoman hands-on showcase post tagging Telegraph, showing the real testnet status.

### Message for the organisers (owner sends; not sent)

> Hi team. Four questions on the Season II rules before Nov 1:
> 1. /rules says final submission is Dec 20 23:59 UTC, but /timeline and the home page say 1 Nov – 1 Dec.
>    Which deadline applies to Miner and Evaluator submissions?
> 2. The home page says the prize pool is $15,000, while /rules says $10,000. Which is current?
> 3. Does `updateMiner` on an active miner (new registrationId) restart the 7-day grace period?
> 4. We are entering both the Miner and the Evaluator tracks with related work. Is one H2 registration
>    and one submission per track the right way to do it?
