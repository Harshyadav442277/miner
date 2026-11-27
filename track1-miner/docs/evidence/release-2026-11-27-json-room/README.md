# Releases 2026-11-26/27 — `0a1dcaa`, `4fbc4e8`, `89acf9d`: scored fields that were null, JSON room for briefs

| | |
|---|---|
| Build commit | `89acf9d` (branch `PR/improve-2026-11-26`) |
| Production | `https://miner-19i4dsbxb-wukong4.vercel.app`, `dpl_6kcdtkx4mbfYpUgFK796wpzW5HLf` (promote answered 409, already current) |
| Earlier today | `0a1dcaa` (`dpl_C5FK7kCddFFCjaoVJL1HPpwmUbAa`), `4fbc4e8` (`dpl_7WJQARXG4tGep8MRsxxuqFwKFFPS`) |
| Rollback | `miner-pymeiko6m` (`bb6e288`, `dpl_4Xxd4dfdqbgHG4vkPjc72tnhXfD6`) |

## Changes

| Intent | Change | Evidence |
|---|---|---|
| CROSS_CHAIN | `consistent` is false when nothing was shown completed (status says why); null only for an outage (`1073dab`) | live schema: required bool, "the transfer completed on the destination chain"; we were 0 in e59–61 with null while a1-preflight scored 0.99 refusing the same questions with found:false |
| FRAUD | An assessed subject with no evidence either way gets `risk_score` 0.5, labelled (`9f6ba44`, `0a1dcaa`) | calls before e58 and e59 zeros answered `unknown`/`insufficient_evidence` with risk_score null; top 0.9995 |
| RESEARCH, SYNTHESIS | `answer` is a paragraph, brief first, as the intents define it (`4946ffa`) | production `answer` was the one-line brief |
| RESEARCH | A finding-first brief prompt was tried and **reverted** (`caa7c52`): it produced "No results are available yet." and fragments on production (`production-briefs-0a1dcaa-reverted.txt`) | |
| all briefs | A cut brief never ends on no/not/without/than; one shared word list (`4fbc4e8`) | synthesis brief served "…baseline weight with no." |
| all JSON model calls | 900 completion tokens instead of 300–400 (`89acf9d`) | json_validate_failed on 43% synthesis, 33% news-search, 29% web-search, 22% research calls vs 2% of code reviews at 1,400 (archive 11-25 to 11-27). After: 8 of 8 brief-route calls on production wrote a brief, no LLM error line (`production-briefs.txt`) |

## Gates

| Gate | Result |
|---|---|
| Unit tests | 1120/1120 at `89acf9d` |
| Preflight | **7/7 in one run** at `4fbc4e8` (15:28 UTC) and at `89acf9d` (15:45 UTC) |
| Watch 6126 | endpoint ok 413 ms, activation active |

## Scores seen since `bb6e288` (epochs 60–67, rank-1 score in brackets in GAPS)

RESEARCH_QUERY 1.00 in e63 and e66; FRAUD 1.00 in four of the last five; MACRO 0.98. Still losing: WEB_SEARCH
(0 in e61, e63, e66 against 1.00), FINANCIAL (0 in e62–64, e66 against ~0.97), NEWS_SEARCH (0.11–0.66 against
~0.98). CROSS_CHAIN's whole field is near 0 since e62. Whether `89acf9d` moves WEB_SEARCH is not observed yet.
