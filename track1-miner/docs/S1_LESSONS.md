# Season I, Track 1: why we did not win, and what we learnt

Written 2026-10-22. This is the short version. The evidence and its numbers are in:
- [S1_LOSS_ANALYSIS_2026-10-11.md](S1_LOSS_ANALYSIS_2026-10-11.md): ranking reconstructions, requests
  served, X reach and the judging criteria;
- [S1_WINNERS_TEARDOWN_2026-10-11.md](S1_WINNERS_TEARDOWN_2026-10-11.md): the winners' answers, code and
  judging-window traffic.

Where those files are not the source, it is named inline. What we do about it is in
[WINNING.md](../../WINNING.md).

## Result

| Place | Miner | Score |
|---|---|---:|
| 1 | TXlens | 97.9 |
| 2 | Chainsight Oracle | 86.9 |
| 3 | Oathcast Weather | 85.4 |
| — | **LiveCert (ours)** | not placed |

Source: hackathon.telegraphprotocol.com/winners, read 2026-10-10. Only totals were published; the organisers
never confirmed our breakdown.

## Why we did not win

**1. We optimised a number the judges did not use.** We chased first place by normalised score sum at a
single epoch (298), and reached it. The published Season I criteria were five:
- ranking;
- apps built on the miner;
- requests served;
- progress posts on X;
- X reach.

The reviewers wrote a judgement for each winner. Oathcast placed 3rd with a ranking that never passed
29.4/75 in any reconstruction, so ranking cannot have carried it.

**2. We started late.** LiveCert was scored in 15 of 105 Track 1 epochs, first on Aug 26. Oathcast was live
before day one, Chainsight from Aug 22 and TXlens from Aug 24. Anything judged over the event saw us
missing for nine days.

**3. Reviewers read a stale manifest.** Each winner's blurb restates its manifest; TXlens's repeats its
`/check-tx` description field by field. Ours still described a three-endpoint certificate-and-weather
service while the miner served 36 intents. The reviewers summarised the miner we described, not the one we
ran.

**4. Our answers were written for the scorer, not for apps.** We cut fields and kept one prose sentence,
because the converter rewarded it. We restated the question at the head of every answer (`restate.ts`).
61% of our judging-window answers opened by echoing the question, and our median answer had 3 fields. TXlens
had 12 and Chainsight 4. Both leaders kept fields and prose together and still ranked, so the trade was
never needed.

**5. Demand went to miners whose manifest said "on-chain".**
- In the Track 1 window we served 151 requests, more than the three winners combined (46).
- In the judging window most volume came from a few app scripts:
  - one broken template sent Chainsight 1,200 calls, TXlens 827 and us 28;
  - TXlens's own app, AskLens, sent it 329 paid calls in 21 minutes.
- An app by another team, Truvian Shield (Track 3, 2nd), names Chainsight as its miner. No winning app names
  ours.

**6. Our reach was small.** 132 X followers, against 5,469 for TXlens and 572 for Oathcast. Our feed mixed
Telegraph posts with unrelated projects.

**7. Breadth outran correctness.** Breadth went from 13 intents to 36, faster than we checked answers
against their sources:
- **Weak firsts.** By Sep 15 our rank-1 count had fallen from 16 to 8 in four epochs as Chainsight grew
  from 14 scored intents to 42. Some of those firsts had been won with zero scores (report of 2026-09-15:
  `git show cbeb504^:track1-miner/docs/TRACK1_RANK_LOSS_REPORT_2026-09-15.md`).
- **A blind acceptance script.** It reported 36/36 passing while production gave wrong extractions,
  unrelated web results and wrong paper counts.
- **Wrong answers found after the season:**
  - 2026-10-11: our fact check rated "The Eiffel Tower is in Berlin" *supported*;
  - 2026-10-21: an audit against primary sources failed 27 of 154 production answers.

**What did not cause the loss:**
- Ranking performance: we were never meaningfully below TXlens in any window.
- Raw volume: we led the Track 1 window.

## What we learnt

| # | Lesson | What we do now |
|---|---|---|
| L1 | **The published criteria are the target. A proxy we can measure is not.** Epoch 298 was the one window that flattered us. | Season II's rubric is in [RULES_SEASON2.md](../../RULES_SEASON2.md) and every decision cites its line ([WINNING.md](../../WINNING.md) §3). When criteria are unpublished, we ask the organisers rather than guess. |
| L2 | **Being live from day one beats any late improvement.** Time-weighted criteria cannot be caught up. | Registration 4829 has been active since 2026-10-16, before Season II opens. |
| L3 | **The manifest is the pitch.** Reviewers summarise what it says. | Every `updateMiner` rewrites the description to match what is served: example questions, parameters and returned fields. |
| L4 | **Answer for the app, with the answer first and every value as a field.** Imitating a winner's phrasing never survived measurement; finding the unanswered part of a question always helped (`LOSSES.md`, Season I, in history). | `src/envelope.ts`. The question echo is gone. |
| L5 | **Each intent is judged on its own, so breadth without correctness is a liability.** | A primary-source audit of every intent (154 questions, 2026-10-21). Seven intents removed on 2026-10-14. More removals are proposed in WINNING §6. |
| L6 | **A test that checks shape is not a test of correctness.** 36/36 passing meant nothing. | The audit compares each value with its source. Its questions become regression tests and evaluator material. |
| L7 | **Demand follows positioning and distribution, not a leaderboard alone.** | Per-mission recipes, Season II office hours, and one weekly post tagging Telegraph that carries real results. |
| L8 | **An honest refusal beats a fabricated success.** Chainsight confirmed transactions that do not exist. Season II disqualifies fabricated proof. | Refuse with a reason, never return "Unable to process" as a success, and never invent a value. |
| L9 | **Licences and keys are reliability.** A paid key that runs dry is an outage (TXlens on 2026-10-11). A non-commercial source is a liability when every answer is sold. | Keyless or licensed upstreams (MET Norway, Nominatim, Groq, Wikidata CC0). The open licence items are owner decisions in TASKS.md. |
| L10 | **Operations lose events too.** | Every deadline resolved in UTC: a local-date reading nearly cost the last three hours of Track 1. Deploys go through Vercel and are verified, because `git push` deploys nothing (G22) and a redeploy once 404'd every route (G70). Monitoring never parks on a human: 60 blind hours (G66). Wallets are hygienic: the seed phrase was exposed (G19). |
| L11 | **Our own traffic is not demand.** The winners' volume was partly their own scripts, and Season II gives no points for raw volume. | Folder override 2 stands. Any related-party evidence is labelled as such (WINNING A4, owner's decision). |
| L12 | **Re-decide at every checkpoint.** We kept chasing a count of rank-1 intents (target 18) after the published criteria pointed elsewhere. | WINNING.md §7 is reviewed on Nov 1, 8, 15 and 22. Hours already spent are not an argument. |
