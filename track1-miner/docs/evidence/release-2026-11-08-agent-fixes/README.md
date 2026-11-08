# Release 2026-11-08 ~19:08 UTC (Nov 9 00:38 IST): fixes across 22 intents from four agents — `a2f911e`

The owner said "improve miner. divide task across 2 phases and use 2 agent in each phase", then "try to improve across
many intents" and "priortize on basis of this table" (Anjoman's 30-day earnings). Deploy: "Yes, deploy it".

| | |
|---|---|
| Phase 1 (read-only) | Agent A diagnosed 16 intents and agent B 15, each comparing our answers with the top 3 at epoch 2040 (`ranks-epoch2040-before.txt`). Raw evidence is in the session scratchpad and not committed |
| Phase 2 | Agent C: 11 commits on `claude/fix-drops`. Agent D: 12 commits on `claude/fix-nearmiss`. Merged without conflict as `a2f911e` |
| Unit | 959/959 after the merge (924 before) |
| Preview | `https://miner-md17zhom4-wukong4.vercel.app`, `preview-probes.txt` |
| Production | **`https://miner-4hs6cb5jh-wukong4.vercel.app`** (`dpl_ABhFVKcsHHwJiqKgG38CJBSnVpRM`). `promote` answered 409 "already current", and `vercel inspect` confirmed the alias |
| Rollback target | `https://miner-7bo22h7r8-wukong4.vercel.app` (`dpl_9WvUyyb7o9uBqYpsXLSDz5dXjzTU`, `1f43311`) |
| Security | The automated push review did not run (HTTP 429). A manual review of `00c87ad..a2f911e` found new upstream URLs fixed-host and encoded or validated. The new filings period regexes are quadratic in isolation, but the input is cut to 600 and 200 characters first; 23 changed routes were timed on a 3,500-space input locally, slowest 2.7 s (upstream) |

## Fixes, with the value shown on preview or production

| Intent ($/30d) | Change | Observed |
|---|---|---|
| All `brief` routes | Brief built from content and cut at a word boundary. It was cut at the first "." or ":", which cost research synthesis 0.9965 → 0.7815 after `1f43311` | news: a headline; research: "Molecular mechanisms of antibiotic resistance"; papers: "Top paper: …" |
| Sanctions (16.93) | A rare, telling one-word name matches inside a listed organisation's name | Hezbollah: `matched` true, 0.85 (was false) |
| Chat (13.72) | No one-word brief; no out-of-enum `verdict`; plain hyphens | "Uncertain: the Fed may or may not cut rates in Dec 2026" |
| Web search (11.25) | Article URLs in `sources`; a direct answer from the model | URLs present. The direct answer did NOT fire for "Who won the 2026 FIFA World Cup?" (digest led); being looked into |
| Research (7.15) | The subject phrase is searched apart from the aspect asked | antibiotic resistance: 0 → 3 sources |
| Corporate registry (6.72) | Legal forms spelled out | Siemens AG: not found → `active` true |
| Code review (6.31) | A 3–6 sentence summary opening "The code is (not) correct." | live: "The code is not correct. It suffers from an SQL injection …" |
| **Smart contract audit (2.78), new** | `/contract-audit` route (Groq) | live: the planted reentrancy in `withdraw()` graded High |
| Fact check (3.21) | The answer opens with the schema verdict | "False. The claim …" |
| Filings (2.68) | Year, FY and quarter windows | Apple Q3 2025: `filing_count` null → 18 |
| Text generation (1.98) | A title always; a cleaner brief | "Eco-Friendly Reusable Bottle", 50/50 words |
| Macro | Reads the year (param and "in YYYY") from World Bank WDI | US inflation 2023: 4.1163 (was the latest monthly print) |
| Token supply | Native coins are no longer resolved to look-alike contracts | solana: 888,888,888,888,888 → `not_a_token` / `native_coin` |
| Crypto price | A bare ticker is read; Coinbase spot as fallback | PEPE $0.00000507 |
| Gas | BSC and Avalanche; testnets refused | bsc 0.05 Gwei |
| Others | Weather (location-only = current reading), storm (`window_hours`), extraction (`fields`), translation (`source_language`), event outcome (race winner), classification (fallback not cached), fraud (parcel-fee typology) | weather Lagos `temperature_c` 29.5; translation `source_language` English |

## Gates (`preflight.txt`)

6/7 on the first run. The live gas test required the string "bsc" in an answer that names "BNB Smart Chain". Fixed
in the test (`61f1046`); re-run passes; production was not affected. Registration 5135 is `active` (375 ms), and
42 of 42 routes were up (`availability.jsonl`).

## Registration update (owner signs)

- **YAML:** `https://raw.githubusercontent.com/Harshyadav442277/miner/61f1046d030c96d26eae3ab2a730201e75052e1d/track1-miner/miner.yaml`
- **SHA-256:** `0x700aca973e3afec3bd33e51684e9cbb927fdc502e260be8bf4b3932a778e7f66`, the same from git and the raw URL.
- **Change:** 42 → 43 intents, all canonical. `/contract-audit` is new (SMART_CONTRACT_AUDIT_GENERAL). `/macro` gains the
  optional `year` parameter; `manifest-diff` lists it as CHANGED, and it is the only change to a registered endpoint.
  The rest are description changes.

## Not checked

- Rank effects: read the epochs after 19:08 UTC.
- Licences: Coinbase is recorded as barred and is called only because the licence gate is off.
