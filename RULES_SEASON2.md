# Telegraph Hackathon Season II — rules as published

**Primary source:** https://hackathon.telegraphprotocol.com/rules ("Official Competition Rules"), read
2026-10-22 16:47 UTC with curl and a browser user-agent. The Miner and Evaluator tabs of sections 5–8 are
rendered by script: their text was read from the page's own bundle,
`/_next/static/chunks/app/(s2)/rules/page-ece4e8abc17f7fe1.js`. Text here is quoted or closely paraphrased.
Nothing is inferred. The earlier read (2026-10-17) found the Miner and Evaluator rules unpublished; they are
now published.

The organiser numbers the tracks 01 Apps & Agents, 02 Miners / Providers and 03 Evaluators. This repo calls
the miner "Track 1" (`track1-miner/`) and the evaluators "Track 2" (`track2/`).

## Dates — the organiser's two pages disagree

| Source | Window | Final submission |
|---|---|---|
| /rules, read 2026-10-22 | November 1 – December 20, 2026 | **Dec 20, 2026 23:59 UTC**; judging Dec 21–27; provisional results from Dec 28, then a 72-hour appeal window |
| /timeline, read 2026-10-22 | 1 November – 1 December 2026 | "22 Nov – 1 Dec: Submissions close and judging runs" |

Other milestones on /rules: Nov 20 community progress showcase; Dec 1 mission-coverage update; final-week
Anjoman showcase. Other milestones on /timeline: 1–7 Nov pick a track (miners pick their intents); 8–14 Nov
apps need one settled transaction; 15–21 Nov office hours ("Miners tune against real requests coming off
real builds"). **Plan to the earlier date** until the organisers confirm in writing (GAPS G203).

## Prizes — $10,000

| Pool | Awards |
|---|---|
| Apps & Agents $3,000 | 8 verified-delivery awards of $225; excellence $700 / $350 / $150 |
| **Miners / Providers $2,000** | **4 verified-delivery awards of $300; excellence 1st $500, 2nd $300** |
| **Evaluators $2,000** | **4 verified-delivery awards of $300; excellence 1st $500, 2nd $300** |
| December $3,000 | 4 × $500 mission and technical outcomes; 2 × $500 adoption and ecosystem activation |

- "A participant may receive one verified-delivery award and one excellence award in the same technical
  track." Each related entrant group may receive at most one award in each December category.
- Related wallets, materially identical entries and jointly controlled teams count as one group.

## Gate and rubric

Every entry first passes the technical requirements: functional delivery, Telegraph integration,
reproducibility on new inputs including failure cases, safety and data handling, and accurate evidence. To
win any award it needs **at least 70/100 and the track's minimum**. Excellence awards go to the highest
total; ties go to the primary score, then reproducibility.

**Miners / Providers** (quality minimum 24/35)

| Points | Criterion |
|---:|---|
| 35 | Independently evaluated intelligence quality |
| 20 | Reliability, availability, and capacity |
| 15 | Verified Intent coverage and application enablement |
| 10 | Verified H2 mission application consumption |
| 10 | Cost, latency, and serving economics |
| 10 | Integration and documentation |

- "Each claimed Miner–Intent capability is checked separately against its supported task and relevant
  same-Intent competition."
- "A Provider can qualify through verified functionality and quality while demand for a newly supported
  Intent develops."
- The 15 coverage points recognise "useful Miner–Intent capabilities, especially those enabling commercial
  missions".
- **There are "no additional points for raw volume or nominal Intent registrations".**

The 10 consumption points are computed once per Provider, across its Miner–Intent pairs:

| Points | Evidence |
|---:|---|
| 4 | Use by an H2 mission application: 1 point, "including an application operated by the Provider's own team". Then 1 point for each independently operated consuming app group, up to 3. |
| 2 | Repeated use: 1 point for ≥ 3 independently verifiable task executions with distinct inputs; 1 point for consumption on ≥ 2 separate UTC dates |
| 2 | Consumption through the ranked-routing path ("a verifiable routed request made under the applicable Intent ranking and routing policy") |
| 2 | 1 point for a reconciled request-to-Miner–Intent delivery record; 1 point for the matching cost or payment record, testnet included |

"Related-party activity may establish functional consumption but does not receive the additional
independent-consumer points."

**Evaluators** (validity minimum 28/40)

| Points | Criterion |
|---:|---|
| 40 | Measurement validity, quality discrimination, and baseline evidence |
| 20 | Integrity and robustness |
| 15 | Reproducibility and protocol compatibility |
| 20 | Useful evaluation coverage and demonstrated improvement |
| 5 | Documentation and integration clarity |

- Submit "an evaluation adapter, evaluation material, or a combined contribution". Reviewers assess
  correctness, resistance to manipulation, pipeline compatibility, usefulness and documentation.
- Where a baseline exists, show what the contribution improves or confirms. For new or underserved
  intents, show credible new coverage.
- Claims of Canonical status or ranking impact need protocol evidence. Otherwise a contribution "can be
  judged on independently demonstrated measurement quality and readiness".

**Apps & Agents**, for reference (they buy our answers): technical quality and mainnet readiness 35 (minimum 24),
commercial viability 30, independent adoption 15, network integration 10, reproducibility and proof 10. An
app needs at least one autonomous machine-to-machine purchase through Telegraph.

## How the four verified-delivery awards are picked (Miners and Evaluators alike)

The four awards are "selected together in this order":

1. the most distinct commercial missions materially enabled;
2. the most distinct H2 mission application workflows enabled, unblocked or measurably improved;
3. the most independently verified missing mission-critical Intent needs addressed;
4. combined technical quality.

Provider ties are broken by verified H2 application consumption, then the quality score. Evaluator ties
are broken by demonstrated measurement improvement or new coverage, then the validity score. "Independently
accepted new Provider and Evaluator capabilities can qualify through mission-specific test evidence while
applications using them are still being built."

**December technical awards** cover reusable Provider, Evaluator or integration capabilities that
"demonstrably unblock substantive applications", and fixes to documented mission-critical blockers. Work
done in November counts.

## Routing, verification, fairness

- **Routing (/how-it-works, read 2026-10-17):** Telegraph routes each request to the highest-ranked miner
  for its intent, and the app never picks a miner.
- **Rankings (/rules):** "Rankings are established through the applicable evaluation and finalization
  process; ordinary live Consumer requests use those rankings and are recorded as consumption."
- **Reviewers' tests:** "realistic unseen inputs, relevant error cases, test fixtures, and the supplied
  reproduction instructions."
- **Disqualifying:** "Fraudulent transactions, fabricated proof, collusive traffic, copied/duplicated
  artifacts presented as independent work". Related teams and controlled entries must be disclosed.
- **Submission package:**
  - a 2–5 minute video;
  - a beginner tutorial with the network used, costs and limitations;
  - evidence: receipts, methodology, ranking references, endpoints or fixtures;
  - a public summary.
- **Public posts:** aim for one useful progress update per active week, tagging Telegraph. Follower counts
  and likes are "not mandatory technical-scoring requirements".
