# WINNING.md — the goal: win Season II in the Miner and Evaluator tracks

Written 2026-10-22 ~17:10 UTC (22:40 IST); dates, prizes and protocol facts re-checked 2026-10-29; §4 rewritten 2026-10-31. This is the
goal file. Every plan, task and review in this repo answers to it. Rules: [RULES_SEASON2.md](RULES_SEASON2.md).
Evaluator weights reconciled 2026-11-04 UTC with the live Rules page as read 2026-11-01:
validity 40 (minimum 28), integrity 15, reproducibility 10, coverage 10, docs 5, growth 20.
**Miner weights changed; re-read live 2026-11-05 ~09:40 UTC:** quality 35 (minimum 24), reliability 15,
coverage 10, consumption 10, cost and latency 5, docs 5, **growth 20**. Older "(20)", "(15)" and "(10)" tags
below for reliability, coverage, cost and docs date from the 2026-10-29 rubric; this line wins.
Organiser answers of 2026-11-05 (Ahmed): no grace period on `updateMiner`, which closes G206;
"submit the capabilities you can reliably demonstrate rather than claiming everything".
Season I post-mortem: [track1-miner/docs/S1_LESSONS.md](track1-miner/docs/S1_LESSONS.md).

**Track names.** This repo calls the miner **Track 1** (`track1-miner/`, LiveCert, registration 4829) and
the evaluators **Track 2** (`track2/`). /rules numbers them 02 Miners / Providers and 03 Evaluators; the home
and /tracks pages number them 01 and 02. We do not enter Apps & Agents (the owner enters it later; see S2).

## 1. What "win" means, in prize terms

A group can take **one verified-delivery award and one excellence award per technical track**.

| Target | Prize | How it is decided |
|---|---:|---|
| Miners: excellence 1st | $500 | highest total out of 100 |
| Miners: a verified-delivery award | $300 | most distinct commercial missions enabled, then app workflows enabled, then missing mission-critical intents addressed, then quality |
| Evaluators: excellence 1st | $500 | highest total out of 100 |
| Evaluators: a verified-delivery award | $300 | same order as Miners |

**Main-competition ceiling: $1,600.** Nothing pays unless the entry scores **≥ 70/100** and clears the track
minimum: Miner quality ≥ 24/35, Evaluator validity ≥ 28/40.

**December challenges ($3,000, separate).** These are 4 × $500 for new mission results and technical work, and
2 × $500 for adoption. They are separate challenges, announced after Dec 1, each with its own rules, evidence and
deadline. Entering H2 does not enter us in them, and a result already paid cannot be paid again. Up to $1,000
more is possible (one award per category), but nothing about them is published yet.

**The dated, exactly-what-to-do checklist is §8.**

**Deadline: Dec 1 2026 23:59 UTC (Dec 2 05:29 IST), for every track.** /rules, /timeline and the home page
agree since the 2026-10-29 read (G203 closed). Judging runs Dec 2–8, and provisional results come from Dec 9.

## 2. Where we stand — checked 2026-10-22 16:50 UTC unless noted

**Track 1, the miner**

- **Registration 4829:** `active`, 36 intents, no rejection. Production `miner-wine.vercel.app` answered
  `/ssl-check` with HTTP 200 in 1.1 s.
- **Quality, production (audit 2026-10-21):** 110 pass, 17 partial and 27 fail out of 154 questions checked
  against primary sources. Evidence is in `correctness-audit-2026-10-21/` on branch
  `claude/correctness-audit-2026-10-21`.
- **Deployed 2026-10-23** as production `miner-n9d4aoxw8` (`22284c0`): the 22 audit fixes and the places
  table. Gates and evidence are in `track1-miner/docs/evidence/release-2026-10-23/`.
- **The sanctions alias bug (G201) is fixed on production.** On 2026-10-21 "Rosneft" had returned `no_match`,
  because a failed alias download was cached as a complete list. A failed download now makes the list
  unread, never "cleared".
- **New: G207.** Timeless web-search questions quote the wrong Wikipedia article.
- **Open owner decisions:** the news-source licence (it serves WEB_SEARCH, bought by 7 missions),
  STOCK_PRICE, Nominatim policy (G199), push, deploy, and Season II registration.

**Track 2, the evaluators**

- **31 comparators**, one per mission-bought deterministic intent. They reproduce the node's own answer key
  on 234,848 cases. They are published and their hosted hashes match (`track2/comparator/`, merged here
  2026-10-29). They predate protocol V2 (track2 G33).
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
| D13 | **31 comparators, each proved against the node's own reference rule in the node's runtime.** 2026-10-22 (track2 `0a88f02`). | Validity (40, floor 28) and reproducibility (10) need proof on the real pipeline. Coverage (10) rewards "credible new coverage", and 61 of the 76 mission-bought intents had no scorer. Delivery awards count missions enabled. |
| D14 | **Withdraw the adapter that does not reproduce on the node.** 2026-10-22 (`ca368a5`). | Integrity (15) and validity: never submit a number the node will not reproduce. 96.9% in the kit against 81.0% on the node would have been caught by reviewers. |
| D15 | **Adapter target: LLM_OUTPUT_EVALUATION.** The kit refuses FACT_CHECK; LLM_OUTPUT_EVALUATION is a judgment intent that it packages. | Coverage only counts where a module can actually be accepted. |
| D16 | **Train only on pairs we never upload to the evaluation pool. No miner fingerprints in any scorer** (track2 rule 2). | Integrity (15). The rules disqualify leaked confidential material and collusive work, and we also run a miner. |
| D17 | **Make the measurement useful to another developer.** 2026-11-01 rubric change. | Growth (20): a public explanation, a reproducible tutorial, three original dated updates and independently evidenced developer actions. "Posting alone does not earn all 20 points"; drafts and our own replays do not count as activation. |

## 4. Asymmetric strategies — what we bet on, and why (rewritten 2026-10-31 ~19:30 UTC)

An asymmetric bet is one where our cost is small or already paid, and the payoff is large or comes from
ground most competitors ignore. Rewritten after the 2026-10-31 re-check (GAPS G235–G240) and the first
build-level mission matrix (`track1-miner/docs/evidence/missions-2026-10-31/`, `tools/mission-matrix.mjs`).

**Facts the bets rest on (all checked 2026-10-31):**

- The 15 missions list **102 example builds**. Each build is an app workflow with the intent families it buys.
  Our 36 intents touch all 15 missions, and **9 builds in 7 missions buy only families we serve**.
- **Nobody is ranked in any of our 36 intents.** Judgment families need a canonical adapter plus 5 pool
  contributors; CRYPTO_PRICE_USD's intent is not ready. The only ranked families are the 7 with evaluators.
- TASK_EXECUTION_QUALITY and LLM_OUTPUT_EVALUATION are **ranked today** and are each the single missing family in
  3 builds. We trained an LLM_OUTPUT_EVALUATION reward model in October (96.6% as the node computed it then).
- A registered comparator changes no scoring (G237 killed). The old A2 ("31 comparators, cheap breadth") is dead.

**Leverage we take, and leverage we refuse.** We take leverage from work others skip: supplying whole workflows,
developer relations, evaluation material, honest licensing, published audits. We refuse every shortcut that the
rules disqualify or folder override 2 forbids: extra wallets to reach the 5-contributor minimum, our own traffic
counted as demand, requests between related parties presented as independent, and any scorer that knows our
miner. These would also lose: a reviewer finds them, and the entry is disqualified, not merely marked down.

| # | Strategy | Why it is asymmetric | Rubric lines | Guardrail |
|---|---|---|---|---|
| S1 | **One-stop supplier for the 9 full workflows.** Each becomes a runnable fixture: the build's real inputs, every intent called on production, each answer checked against its primary source. Each also gets a copy-paste client. | An app team on any of those builds integrates one miner instead of stitching 3–5. Delivery awards count missions and workflows enabled, and reviewers want "a repeatable mission-specific test", which almost no miner will ship. | Delivery tie-breaks 1–2; coverage 15; integration 10 | Each intent passes its own test. A workflow is claimed only when every step passes |
| S2 | **The owner's Apps entry is built on one of the 9 workflows.** | One app then feeds three tracks: the Apps entry itself, our related-party consumption evidence (the rules let "your own team's app" earn 1 point, plus repeat use, routing and accounting: up to 7 of 10), and mission-impact proof for both delivery awards. | Apps 35/30; Miner consumption 10 | Owner decides (G204). Labelled related-party everywhere; never counted as users or demand |
| S3 | **Recruit independent consumers before Nov 14.** Post the S1 clients where H2 app teams are (Discord), aimed at the 7 missions. | Nov 14 is when app teams must show a first Telegraph request, so they want working suppliers that week. Each independent consuming group is +1 point (up to 3), and most miners do no developer relations. | Consumption 10; delivery tie-break 2 | Count only receipts from groups we do not control |
| S4 | **Make our families scorable, honestly.** Contribute evaluation material for our intents (truth sources; attested preference pairs), and publish an open contributor kit so other participants can add theirs. | A family nobody can rank pays every miner nothing. We can be only one of the 5 contributors a judgment family needs, so the kit lets others become the other four. It is also a complete Evaluator entry that needs no foundation files. Another participant contributing with the kit is the independent developer action growth (20) asks for. | Evaluator validity 40, coverage 10, growth 20; December "reusable work" | One wallet, one contributor. Material is identity-blind and scores our own wrong answers down (track2 rule 2). Related party disclosed |
| S5 | **Enter a family that is ranked today, with work already paid for.** Candidate: LLM_OUTPUT_EVALUATION or TASK_EXECUTION_QUALITY as a miner intent. | It is the only path to a live H2 rank and routed demand (70/20/10). It completes 6 more builds. We already hold a trained judge for the domain, which competitors would have to build. | Quality 35; consumption (ranked routing 2); coverage 15 | Needs `updateMiner`, which issues a new registration id and may restart the grace period (G206). Gated on experiment E4 and the owner's yes |
| S6 | **Get the blocked deterministic intents fixed.** Send one evidence-backed report: CRYPTO_PRICE_USD "no decimals"; WEATHER_CHECK_TEMPERATURE unscored though ready. | One message could turn on scoring for 51 + 24 miners, us among them. File it on the bounty board too, which makes it citable. | Reliability and quality become measurable by the network; December "verified fixes for mission-critical blockers" | Report facts only; claim nothing about ranks until the network shows them |
| S7 | **Licence-clean supply** (former A3). We answer `not_licensed` where terms bar resale. | Most miners resell non-commercial APIs. If a reviewer checks licences, the field shrinks and we are left. | Quality 35 (accurate claims); §05 safe handling | Never claim "licensed" for terms we have not read (G202, G233) |
| S8 | **Run the reviewers' test before they do, weekly, and publish it** (former A5), now including the S1 fixtures. | We fix what reviewers would find, with dated evidence. Each weekly result is also the weekly post. | Quality 35; integration 10 | Publish failures too |
| S9 | **Be up every hour from Nov 1, and prove it** (former A8). | Reliability is 20 points, more than coverage, and most hobby miners keep no availability record. | Reliability 20 | Needs the owner's yes to resume the monitor (G205) |

## 4b. Experiments that decide the bets

Each experiment has a cost, a measurement and a kill rule. Results go in GAPS.md with dates.

| # | Question | How | Cost | Confirms | Kills |
|---|---|---|---|---|---|
| E1 | Does a truth source alone make a deterministic family of ours scored? | Read `/docs/scoring/contribute-evaluation-data` § Truth sources. Build one truth source for SSL_VERIFICATION_CERT (currently none) or a second for WEATHER_CHECK. The owner signs the upload (EIP-191, no gas). | ~2 h Claude, 5 min owner | Miners in that intent get `scores` within 3 hourly epochs | Nothing scored after 24 h → S4 for deterministic intents waits on Telegraph (S6) |
| E2 | Is "no decimals" the CRYPTO_PRICE_USD blocker? | S6 report to Telegraph | 10 min owner | Telegraph fixes the intent and CRYPTO_PRICE_USD miners get scores | Fixed and still unscored → ask again with the new evidence |
| E3 | Are we more correct than the miners an app would otherwise buy from, on the 9 workflows? | S1 fixtures run on production, then the same inputs sent to the top 2–3 other miners for each intent at low volume, all graded against the primary source | ~1 day Claude | We pass where others fail → claim "verified missing mission-critical needs" (delivery tie-break 3) | Others equal → our pitch is licensing and one integration, not correctness |
| E4 | Can we serve a ranked judgment family well enough to rank? | Read the family's request and response schema; build answers for its public prompts; score ours against other miners' with our own judge and by hand against the reference; decide before any `updateMiner` | ~1 day Claude | Clear margin on held-out prompts → owner decides `updateMiner` (after G206 is answered) | No margin → drop S5 |
| E5 | Will independent app teams use the S1 clients? | Post the clients by Nov 10; track receipts that name 4829 | ~3 h Claude, owner posts | ≥ 1 independent group with a receipt by Nov 22 | Zero by Nov 22 → stop the outreach and put the hours into quality |
| E6 | What capacity can we state? | A short load test on production at a stated concurrency, p50/p90 latency and error rate recorded | ~1 h Claude | A number for reliability (20) and economics (10) | Errors at low concurrency → fix before claiming any capacity |

## 5. What to improve, in order of points at stake

**Track 1, the miner**

1. ~~Deploy the audit fixes and the places table.~~ **Done 2026-10-23** (`miner-n9d4aoxw8`). Next: G207,
   the wrong Wikipedia article in timeless web search, because WEB_SEARCH is bought by 7 missions. Then
   re-run the 154-question audit on production.
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
   - S2 if the owner agrees (related-party consumption).
7. **Submission pack, built from week one:**
   - a 2–5 minute video and a beginner tutorial (network, cost, limits);
   - evidence: receipts, ranking references, the audit;
   - a public summary.
8. **A weekly post tagging Telegraph**, carrying S8's results. Season I reach was 132 followers against the
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
   That is integrity (15) with evidence.
6. **Growth (20), new on 2026-11-01:** a public explanation and a tutorial on Telegraph's role, steps another
   developer can run, at least three original updates on separate dates shared beyond our team, and one
   independent developer acting on it. It is worth as much as coverage and reproducibility together.

## 6. What to remove

The rule behind every cut: each claimed intent is reviewed on its own, and registrations earn nothing.
Remove an intent when it fails on quality or licence and no mission needs it. Our 36 intents: 20 are bought
by at least one mission, 16 by none.

**Re-counted 2026-10-23 from the 15 live mission pages:** our intents touch all 15 missions, and they still
do after the cuts below. Resources & agriculture is the one exception to watch: after STOCK_PRICE goes, it
keeps only WEATHER_CHECK. Evidence: `track1-miner/docs/evidence/missions-2026-10-23/` (`missions.mjs`
regenerates it).

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
| Miner quality (35, ≥ 24) | Audit pass rate on production, every claimed intent, against primary sources, dated | audit replayed 2026-11-04 (12 pass, 23 partial, 3 fail of 61 re-checked); real callers found fact-check and sanctions misses 2026-11-05 (G254, G255) |
| Reliability (15) | Availability log from Nov 1; a capacity result | sweep every 30 min since 2026-11-04; 58 req/s at c20, one route |
| Coverage (10) | Mission × intent matrix with a fixture per mission | counts only, no matrix |
| Consumption (10) | Receipts from H2 app requests: routed, repeated, accounted | 385 paid requests from 16 wallets since Nov 1, 13 ranked-routed; none yet tied to a registered H2 app (`consumption-2026-11-05/`) |
| Cost and latency (5) | Per-request upstream cost (mostly 0) and p50/p90 latency | report tool built; table due once a week of sweeps exists |
| Integration and docs (5) | Recipes, tutorial, video | recipes exist; no tutorial or video |
| Miner growth (20) | The same growth table as the Evaluators | drafts in docs/OUTREACH.md; nothing posted |
| Evaluator validity (40, ≥ 28) | Node-runtime proof per module | 31 comparators proved; adapter retraining |
| Evaluator integrity (15) | Adversarial pair results; no pool material in training; no miner fingerprints | pairs generated, results unpublished |
| Evaluator reproducibility (10) | Frozen data, hashes, commands and per-pair scores in the node runtime | comparator hashes match; adapter not yet reproduced on V2 |
| Evaluator coverage (10) | Measured new tests or improvement for a supported intent | 144 LANGUAGE_TRANSLATION_GENERAL pairs built, unsigned, no baseline (G247) |
| Evaluator docs (5) | Clear entry point, tutorial, failure cases and limits | not written for Season II |
| Evaluator growth (20) | Explainer and tutorial; something another developer can test; ≥ 3 original dated updates; an independent developer acting on it | none recorded in this repo |

Review this table at every checkpoint (Nov 1, Nov 8, Nov 15, Nov 22). Re-decide each time. Hours already
spent are not an argument.

## 8. Exactly what we must do, by date

Taken from /rules §03, §05, §08 and §09 and the V2 docs, re-read 2026-10-29. All times are UTC.
- **Owner:** registering, signing, posting and anything sent in the owner's name.
- **Claude:** the rest, each on the owner's yes where noted.

**Done since 2026-10-22:** the audit fixes and the places table are on production (2026-10-23); the G208
routes went live 2026-10-26 and G213 on 2026-10-27; registration 4829 carried over to V2 (TELEGRAPH_FACTS
item 10). The Oct 24 `updateMiner` window (Option A) passed unsigned. The recommendation therefore falls back to
Option B: 4829 stays frozen for the season, fixes ship as code deploys, and unlicensed sources answer
`not_licensed`. The owner can override this once G206 is answered.

### Before Nov 1 00:00 UTC (Nov 1 05:30 IST)

- [ ] **Owner: register for Season II** on the site with `hyadav42774@gmail.com` only, if not already done.
      It is the "Register for Season II" button; one registration covers all three tracks.
- [ ] **Owner: read the prize-payment terms** once they appear. /rules says they "must be available before the
      competition opens". Check that India is an eligible country and which payout methods exist (G218).
- [ ] **Owner: send the organisers the message below** on Discord (discord.gg/telegraphprotocol). Only the
      grace-period question is still open.
- [ ] **Owner: yes to push `codex/rank1-14-intents`.** Reviewers reproduce from the public repo.
- [ ] **Owner yes, then Claude: an availability record from Nov 1 (G205)**, plus one capacity test at a
      stated concurrency.
- [x] ~~**No `updateMiner` during Nov 1 – Dec 1** unless the organisers confirm the grace period does not
      restart (G206).~~ **Answered 2026-11-05 (Ahmed): there is no grace period for a new or updated miner;
      the new registration follows the normal evaluation and ranking.** One `updateMiner` is now the plan:
      cut what refuses or fails, fix the descriptions (G250), add only audited intents (TASKS N1).

### Nov 1 – 13 (pick intents, build)

- [ ] **Claude: a mission × intent matrix**, with one reproducible test fixture for each mission our intents
      enable. It earns coverage (15) and is the first delivery-award criterion.
- [ ] **Claude: close G200**, or answer RESEARCH_QUERY as `not_served`.
- [ ] **Track 2, on V2 (re-read 2026-10-31):** adapters are safetensors LoRA deltas on a shared Foundation Model,
      registered per family with `registerWasm(hash, url, prefix, feeAddress, runnableUrl)`. Re-export ours when
      Telegraph publishes `foundation.json` and the reference executor (GAPS G238). Comparators do not change
      scoring (G237 killed). Meanwhile, evaluation material for our intents is the entry that can start now.

### Nov 1 – 7 (start in public)

- [ ] **Owner: post an "at the start" update** tagging Telegraph: the miner, the evaluators, the intents we
      serve, and how an app gets our answers.
- [ ] **Claude: first weekly production audit (S8).** Publish the results, failures included.
- [ ] **Confirm the intents we claim** are the ones that pass the audit. Each is "checked separately".

### Every week until submission

- [ ] **Owner:** one progress post tagging Telegraph, carrying that week's audit numbers. For the Evaluator
      entry these are now scored: growth (20) needs at least three original updates on separate dates that
      link reproducible evidence. Do not backdate, and drafts do not count.
- [ ] **Claude:** the audit re-run, the availability log, a fix for every failure found, and the replay of
      real routed questions ("Miners tune against real requests coming off real builds").

### Nov 15 – 23 build and integrate; Nov 20 community showcase

- [ ] Bring the per-mission recipes to app teams, and ask on Discord which intents their builds buy.
      Independent consuming groups are worth up to 3 of the consumption points.
- [ ] Show a milestone at the Nov 20 showcase: a verified quality gain or a registered comparator.

### Submission: Dec 1 23:59 UTC (Dec 2 05:29 IST), every track

Make one submission per track on the H2 website; entering several tracks is allowed when each entry is a
distinct contribution. Each holds the six items /rules §08 lists.

| Item | Miner entry (LiveCert) | Evaluator entry |
|---|---|---|
| 01 Participant and project | Track Miners / Providers; the intents we claim; `miner-wine.vercel.app` | Track Evaluators; the intents covered; the published release |
| 02 Video, 2–5 minutes | Realistic input, the answer, the receipt and the ranking | Module proved in the node runtime, against the baseline |
| 03 Tutorial | How an app gets our answer through Telegraph: an example request, expected output, Ethereum Sepolia, the $0.01 floor price, limitations | How to reproduce the proof and the hashes |
| 04 Evidence | Registration 4829 and its YAML hash; per-intent ranking references; receipts for any H2 consumption; the availability log; the audit; a latency and cost table | Methodology, results against a baseline, hosted keccak hashes, registration transactions, protected reference material through reviewer access |
| 05 Public summary | What works today, and one Try or Connect link | What it measures, and one Compete or Build link |
| 06 Showcase preferences | Owner's choice | Owner's choice |

- **Disclose that the two entries are related** (§10.03), and any own app under S2.
- **Final week:** an Anjoman hands-on showcase post tagging Telegraph, showing the real testnet status.

### Message for the organisers (owner sends; not sent)

The deadline, the prize-pool and the two-track questions were answered by the 2026-10-29 /rules text, so
they are cut. Two questions remain:

> Hi team, two questions before Nov 1:
> 1. Does `updateMiner` on an active miner (new registrationId) restart the 7-day grace period? Devnode now
>    shows our registration 4829 with `registered_at` 2026-10-25 00:48 UTC, the V2 import. Did the import
>    restart it?
> 2. Where are the prize-payment terms (eligible countries, payout methods)? /rules says they will be
>    available before the competition opens.

## 9. Several prizes, and the intent question (decided 2026-10-23)

### The prize stack and what decides each prize

Per track we can take one delivery award and one excellence award: **four prizes, $1,600, in the main
competition.** The two December rows below belong to separate challenges announced after Dec 1, with their own
rules (re-read 2026-10-29). They are listed so the work is not lost, not as Season II prizes.

| Prize | What decides it | Where we stand, 2026-10-23 | What we do |
|---|---|---|---|
| Miner excellence 1st, $500 | Highest total /100, with ≥ 70 overall and quality ≥ 24/35 | Production audit 110/154 on Oct 21; fixes deployed Oct 23, re-audit pending. No uptime record. No consumption | §5 items 1–8, in order |
| Miner delivery, $300 (4 awarded) | Criteria in order: (1) missions materially enabled, (2) app workflows enabled, (3) missing mission-critical needs met, (4) quality | Our intents touch **15/15** missions; no per-mission proof yet | One reproducible fixture per mission showing a real workflow step answered correctly. Side-by-side proof where the field answers wrongly (E3) |
| Evaluator excellence 1st, $500 | Highest total /100, with ≥ 70 overall and validity ≥ 28/40 | 31 comparators exact on 234,848 cases. Adapter at 96.6% as the node computes it, `verify_wide` PASS (track2 MEMORY, 2026-10-22) | Register the day the pool opens. Publish robustness results and a baseline comparison |
| Evaluator delivery, $300 | Same order. Ties go to measurement improvement or new coverage | Modules touch **15/15** missions (`SIGN_S2.md` intents against the mission pages) | A mission-by-mission table of what each module lets reviewers measure |
| December technical, $500 | A reusable capability that unblocks apps, or a verified fix to a documented mission-critical blocker | Track 2 G32: the adapter kit packages a different ModernBERT from the one it trains. We found it and our node-architecture retrain passes | The owner approves a report of G32 to the organisers. Publish the retrain recipe as the fix and claim it here, separately from the track entries |
| December adoption, $500 | Independently confirmed downstream use: onboarding, reproduced integrations, retained users | None | Recipes to app teams at office hours. Get one independent team to reproduce an integration and say so publicly |

**Optional, not planned: an Apps & Agents entry** (8 delivery awards of $225, excellence up to $700). It
needs a working mission app that makes an autonomous purchase through Telegraph, and a mainnet-readiness
score of at least 24/35. The same app would also earn the miner's related-party consumption points (S2,
G204). It costs days of build; the owner decides.

### Report of G32 to the organisers (owner sends; drafted 2026-10-27, not sent)

The facts are from `track2/GAPS.md` G32. On 2026-10-25 Ahmed said
the current WASM system will move to "v2", so the message asks whether v2 keeps this converter rather than assuming
it does.

> Hi team, a converter issue in the wide-adapter kit (`telegraph-wasm-baseline`, `feature/v2-integration`, commit
> `992f2650`) that changes what a ModernBERT adapter scores on the node:
> 1. `wide_runtime/convert.py` and `hf_helpers._norm_cfg` read `rope_theta`. ModernBERT has no such key; it has
>    `global_rope_theta` 160000 and `local_rope_theta` 10000. So every layer gets theta 10000, and every layer is
>    built as global attention, where ModernBERT slides a 128-token window on 2 layers in 3.
>    The package manifest shows `Config` theta×1000 = 10000000.
> 2. Effect on one LLM_OUTPUT_EVALUATION adapter: 96.9% pairwise accuracy as trained, 81.0% as the node runs it
>    (flip 94.1% → 67.4%). `verify_wide` gave Pearson 0.83 against the float model.
> 3. Proof: in float, with all layers global and theta 10000, our probe answers score within about 0.1 of the WASM
>    output.
> 4. Workaround: train against that same architecture (`global_attn_every_n_layers: 1`, both thetas 10000). Our
>    retrain scores 96.6%, and `verify_wide` gives Pearson 1.00000.
>
> Questions: which architecture do you intend the node to run? And does the v2 evaluator system reuse this
> converter? If you fix it, adapters trained on the workaround would change score again. Happy to share the recipe
> and the measurement script.

Send only after the owner reads it. The retrain recipe is public on `telegraph-factscore` `season2-evaluators`. The
adapter package itself was never pushed (track2 MEMORY, 2026-10-25).

### Should we add intents? Not now

- **Breadth is already maxed for the first award criterion.** Our intents touch all 15 missions, so an extra
  intent cannot raise "distinct missions enabled". Registrations earn no points, and every new intent is
  another place for a reviewer to find a wrong answer.
- **Timing.** An intent can only be added through `updateMiner` (G206). Nothing new can reach
  audit-verified quality before the Oct 24 cut-off.
- **The rule for any later addition.** All of these must hold:
  - it deepens a thinly covered mission, or is bought by three or more missions;
  - it is correct from a licence-clean primary source, proved in the audit before signing;
  - it never serves an intent we submit a judgment adapter for (comparators reproduce a fixed network
    rule, so they carry no such conflict);
  - its update costs no routing time.
- **Ranked candidates, if G206 resolves as "no reset":**
  1. **ASSET_RESERVE_ATTESTATION** (4 missions): on-chain supply against attested reserves. The source's
     licence is unchecked.
  2. **WEATHER_FORECAST_VERIFY** (3 missions: autonomous systems, commodities, agriculture). It reuses the
     weather stack, but needs observed station data from a licence-clean source, and none has been
     verified yet.
- **Never:** CHAT_COMPLETION (D5), and LLM_OUTPUT_EVALUATION (we evaluate it).
