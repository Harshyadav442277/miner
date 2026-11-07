# Release 2026-11-05 ~21:09 UTC (Nov 6 02:39 IST): fact checks settled only on sentences that state the claim (G262)

Owner's authorisation: "Yes, deploy it" (2026-11-05 UTC), in answer to "Deploy the FACT_CHECK fix to production?".
It covers this commit only.

| | |
|---|---|
| Build commit | `e501a57`. The miner diff against the previous release `9b82d08` is `src/factevent.ts` (new), `src/factsubject.ts`, `src/factarticle.ts`, `src/factcheck.ts`, `src/factwords.ts` and `test/factevent.test.ts` only. The branch tip then (`7722488`) added evidence files only |
| Change | Support and contradiction need the claim's figures, superlatives, names and event verb in a sentence that is about them; compound claims are checked part by part; a class counts only as a copula's complement; lists and link sections are not evidence. Replay on the 37 real paid claims and 31 regression claims: `../factcheck-real-claims-2026-11-05/` |
| Unit | 903/903 in the deploy tree `C:/Users/hyada/tg-deploy/me501a57` |
| Preview | `https://miner-dryxe6ec0-wukong4.vercel.app`; `preview-probes.txt`, 9/9 as expected (7 fact checks; `/sanctions-screen`, `/ssl-check` unchanged) |
| Production | `https://miner-mzapr28vo-wukong4.vercel.app`, `dpl_3rEwsNuVz6tkfnjQ4p5KAUy2qQJw`; `--prod` aliased `miner-wine.vercel.app`, `promote` answered 409 "already the current production deployment", and `vercel inspect miner-wine.vercel.app` names it |
| Rollback target | `https://miner-f28bzjwiw-wukong4.vercel.app` (`dpl_BmcKxGSMKRuwAcY6P22sBzhvojD6`, `9b82d08`, 2026-11-05 ~19:10 UTC) |

## Gates (`preflight.txt`, production, ~21:10–21:17 UTC)

**7/7 on the first run**: unit + live suite, verify-deploy, param shapes, intent answers (the six `not_licensed`
refusals are the known baseline, G230), hostile inputs, upstream health, no-regression (8 identical, 0 differ).

`watch.txt`: registration 4829 `active`, endpoint ok in 485 ms (2026-11-05 21:17:17 UTC).

## The change, on production (`production-probes.txt`, ~21:10 UTC)

| Claim | Production before (`before.json`) | Now |
|---|---|---|
| Venus is the largest planet in the Solar System. | supported | unverified |
| The Eiffel Tower is located in Berlin and was completed in 1889. | supported | contradicted, quoting the Paris lead |
| Mount Kilimanjaro is the tallest mountain in Africa at 5895 metres. | contradicted | supported, quoting "It is the highest mountain in Africa ... at 5,895 m" |
| The Golden Gate Bridge opened in 1937. | unverified | supported, quoting "The bridge opened to the public on May 27, 1937" |
| Marie Curie won the Nobel Prize in Physics in 1903. | unverified | supported, quoting "She shared the 1903 Nobel Prize in Physics" |
| Fact-check: vaccines cause autism. | unverified | unverified (the intent-answers safety case) |
| Is it true that the Eiffel Tower is located in Paris? | supported | supported |

The "before" column is from `../factcheck-real-claims-2026-11-05/before.json` (the `4fb477e` tree, whose fact-check
code `9b82d08` did not change) and `regression-before.json`.

## Not checked

- Whether the FACT_CHECK score or rank moves. Read with `node track1-miner/tools/epoch-history.mjs <out.json>
  FACT_CHECK_GENERAL` after three epochs scored after 21:09 UTC. Devnode ranked it 5th at 0.9791 (epoch 2017) with
  the wrong verdicts live, so the score may not move with this change.
- Whether the evaluator's references agree with our labels.
- The remaining limits in `../factcheck-real-claims-2026-11-05/README.md`: 9 of 21 true real claims still
  `unverified`; a different year or value is not read as a refutation; the fallback `judge()` path is unchanged.
