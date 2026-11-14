# Release 2026-11-09 ~00:19 UTC (05:49 IST): sanctions index, intent_mapping, request capture — `b455022`

The owner chose "Yes, start all three" (capture, intent_mapping, sanctions index), then said "Deploy it". Agent F
wrote intent_mapping and agent E the sanctions index; request capture and two source fixes were done in the main
session.

| | |
|---|---|
| Build | `b455022` on `claude/n1-v2-ids` (merges of `claude/intent-mapping` and `claude/sanctions-index`) |
| Previous production | `eb09b0a`, `miner-ic5zvq5es` |
| Preview | `miner-qezkjslds`: sanctions answered from the index; Hezbollah matched through its UK alias; 2.2 s cold, ~1.1 s warm, both through `vercel curl` from India |
| Production | **`https://miner-o6dy8wc6k-wukong4.vercel.app`** (`dpl_CdAHxAMJdsQteSiaSmtkC5zhFnpR`). `promote` answered 409 "already current", and `vercel inspect` confirmed the alias |
| Rollback target | `https://miner-ic5zvq5es-wukong4.vercel.app` (`dpl_HxNRUWbpvPQok2pUeUfZzWSsqhxT`, `eb09b0a`) |
| Unit | 976/976 |

## What is live (`prod-probes.txt`)

**Sanctions:** every answer lists OFAC SDN, OFAC non-SDN, UN and **UK Sanctions List**; the EU list is under
`lists_not_checked` (G283).

| Name | Verdict | Time |
|---|---|---|
| Hezbollah | `match`, score 1 (UK alias CTI0032) | 1.94 s cold |
| Vladimir Putin | `match` | 0.93 s |
| a made-up name | `no_match`, `match_score` 0 | 0.75 s |

The index is branch `sanctions-data`, commit `c1311f9`, published by hand on 2026-11-09 00:03 UTC. It holds 27,476
parties, 2,830,368 bytes, SHA-256 `ec5d7412…`, and the file raw.githubusercontent serves matches it byte for byte.
The miner ignores an index more than 72 h old, so after **Nov 12 00:03 UTC** it falls back to direct downloads
unless the index is rebuilt (G284).

**Other changes:**
- Research query: `source_count` 7 for the semaglutide question; registered trials now count.
- Web search: answers taken from Wikipedia now cite the article. But "Who is the CEO of OpenAI?" is answered by
  `currentfacts.ts` (Wikidata), which still returns `sources: []`. Open.
- intent_mapping: in the YAML. It takes effect only after the owner signs.
- Request capture: in the code, off until an Upstash store is connected (G282).

## Gates (`preflight.txt`)

5/7 passed.
- **intent answers:** SANCTIONS failed only because the check still required exactly three lists and the old "EU
  and UK lists were not screened" wording; the check is updated. On the re-run it passes, and only
  ONCHAIN_METRIC fails, because the gate's reference (Blockscout) did not answer its tx call
  (`intent-answers-rerun.txt`).
- **unit + live:** the live test `paperfraud` "a generic title is not matched to a different work" got `unknown`;
  run alone, 1 of 6 still fails. That code is unchanged since `4733e5b`, and the test passed on Nov 8. It is
  recorded as an upstream-dependent flake, not fixed.

Registration 5135 is `active` (353 ms), and 42 of 42 routes are up (`availability.jsonl`).

## Not verified

- Whether nodes honour `intent_mapping` (only after signing).
- The EU list (HTTP 500 at its source).
- The daily rebuild workflow, which has never run because it is not on `main`.
- Rank effects.
