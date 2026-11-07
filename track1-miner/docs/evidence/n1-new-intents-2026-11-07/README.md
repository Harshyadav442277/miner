# N1 intent picks — 2026-11-07 (from 2026-11-06 ~21:40 UTC, Nov 7 03:10 IST)

Owner: "keep improving. and let's add more intents", then "pick intents which would help us in winning".
Nothing here is deployed, pushed or signed. The code is `6aebe0f` on branch `claude/n1-new-intents`.

## How the picks were made

There were 104 canonical intents we do not serve (`GET /engine/v1/intents`, 136 in all). Each one was checked
against four things that score:

1. **A paid rank is reachable.** Routing pays ranks 1–3 only. The table records the score needed for third place
   at epoch 2028 (`unserved-intent-scores-epoch2028.txt`, from devnode `/api/miners`).
2. **Mission builds.** Coverage gives 10 points, and the delivery awards count missions enabled. From
   `missions-2026-10-31/matrix.json`, for each family: how many builds need it, and how many it would complete on
   its own.
3. **We really perform it.** It must use a keyless source that is licensed for paid use. This is Ahmed's rule:
   "submit the capabilities you can reliably demonstrate".
4. **The field answers correctly.** `tools/field-check.py` sends the field one question with a known answer.

| Intent | Builds needing it / completed by it alone | 3rd-place score | Decision |
|---|---|---|---|
| ONCHAIN_METRIC_VERIFY | 7 / 0, in 4 missions; 40 miners, the most of any unserved intent | 0.927 | **Add.** Built as `/onchain-metric` |
| TOKEN_TOTAL_SUPPLY_VERIFY | 3 / 1 | 1.000 (a tie) | **Add.** `/token-supply`, live since 2026-10-26 |
| DNS_RECORD_LOOKUP | none | 0.926 (last scored at epoch 2019) | **Add.** `/dns`, live since 2026-10-26 |
| KEYWORD_EXTRACTION | none | 0.966 | **Drop.** Production split phrases mid-clause ("rates steady amid") |
| VULNERABILITY_TRIAGE | 2 / 0 | 0.000 (the top score is 0.001) | **Drop.** No answer earns a score, so no rank can be earned |
| FX_NOW_EUR / CAD / SEK | 5 / 1 | 0.880 / 0.930 / 1.000; the leaders tie | **Not added.** It asks for a live mid-market rate. Our only licence-clean source is ECB's daily rate, which is also what the leader (`verifywire-fx-now`) serves |
| WEATHER_FORECAST_VERIFY | 14 / 1, in 5 missions | 0.940 | **Not added yet.** No licence-clean global rain observations: NOAA NCEI global-hourly returned nothing for Lisbon this week, and METARs outside the US carry no rain amounts |
| ASSET_RESERVE_ATTESTATION | 8 / 2 | 1.000 (a tie) | **Next candidate.** Needs issuer attestation sources read and licensed first |
| TEXT_GENERATION, CODE_REVIEW, TEXT_SUMMARIZATION, IMAGE_CAPTIONING | up to 9 / 4 | 0.987–1.000 | **Not added.** These would be model wrappers: Groq's agreement forbids reselling the service, and the free quota fails under load (WINNING D5) |
| LLM_OUTPUT_EVALUATION, TASK_EXECUTION_QUALITY | 7 / 3 and 10 / 3 | 0.963 / 0.998 | **Separate decision (WINNING S5).** Our trained judge needs a host that Vercel Hobby cannot provide |

## Evidence

| Claim | Evidence | Revision | Environment | Expected vs observed | Checked (UTC) | Limitation |
|---|---|---|---|---|---|---|
| `/onchain-metric` reads the right values | `local-reads.txt` | `6aebe0f` | local Node 24 against public RPCs | block 21000000 gas 13,952,884 and tx `0x24e2…8913` gas 264,493, both equal to Blockscout's | 2026-11-06 22:12 | Not deployed; production returns 404 for this route |
| Unit tests pass | `npm run test:unit` | `6aebe0f` | local | 906/906 | 2026-11-06 22:05 | Includes 5 new onchain-metric tests (stubbed RPC) |
| The ONCHAIN_METRIC field's ranks do not follow correctness | `field-summary.json` (counts only); named results kept outside the repository | n/a | direct calls, unpaid | ranks 1–3 (0.997, 0.977, 0.927) answer the block-gas question wrongly; the 1 correct endpoint of 28 ranks 9th at 0.399 | 2026-11-06 22:10 | One question; a miner may answer other shapes well (GAPS G269) |
| DNS and token-supply controls pass | same | production `192aecc` | production | pass, pass | same | — |

## Not done

- The N1 YAML still names families in the V1 style (`ONCHAIN_METRIC_VERIFY`). V2 registers listed intents
  (`ONCHAIN_METRIC_VERIFY_GENERAL`), and the tools key on V1 names (GAPS G270).
- Deploying `6aebe0f` needs the owner's yes. Until then `/onchain-metric` returns 404 on production.
- Validating on Anjoman and signing `updateMiner` are the owner's steps.
