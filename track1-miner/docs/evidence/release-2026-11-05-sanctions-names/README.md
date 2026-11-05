# Release 2026-11-05 ~18:28 UTC (23:58 IST): sanctions names as people write them (G258)

Owner's authorisation: "Yes, deploy now" (2026-11-05 UTC), in answer to "Deploy the sanctions fix now?". It covers
this commit only. The filings change `bb07266` (G257, G263), committed later on the same branch, is **not** in this
release and still needs its own yes.

| | |
|---|---|
| Build commit | `4fb477e`. The miner diff against the previous release `3c5e8ff` is `src/sanctions-names.ts` (new), `src/sanctions.ts`, `src/sanctions-lists.ts` and `test/sanctions-names.test.ts` only |
| Change | Sanctions names are read in Cyrillic (BGN/PCGN romanisation), with Cyrillic or Greek look-alike letters (both readings scored), abbreviated ("Grp", "Mkt"), with digits for letters, as a domain (OFAC "Website" remarks become aliases), and with legal forms and descriptor words dropped. A one-word name one letter off a 5–6-letter listed word is a possible match, not a match. A name in a script that is not read answers `unsupported_script`. Replay on 180 real paid inputs: `../sanctions-real-inputs-2026-11-05/` |
| Unit | 885/885 in the deploy tree `C:/Users/hyada/tg-deploy/m4fb477e` |
| Preview | `https://miner-5rgj7486i-wukong4.vercel.app`; probes in `preview-probes.txt` (9 sanctions inputs; `/company-registry`, `/ssl-check` unchanged), 11/11 as expected |
| Production | `https://miner-mztwjxnqa-wukong4.vercel.app`, `dpl_HdLrLG7mb9pdfMPFDzF2PMSavUtv`; `--prod` aliased `miner-wine.vercel.app`, `promote` answered 409 "already the current production deployment", and `vercel inspect miner-wine.vercel.app` names it |
| Rollback target | `https://miner-5arlzhkv6-wukong4.vercel.app` (`dpl_6irxTNbbNRkgny3gXiyyMcMxLJ6T`, `3c5e8ff`, 2026-11-05 09:39 UTC) |

The production build sat in "Building" for about 12 minutes after its log said "Deployment completed" at
18:28:24 UTC (the preview took 4 minutes; the last release took 18 seconds). Nothing in the log explains it.

## Gates (`preflight.txt`, production)

| Gate | First run (18:29–18:36 UTC) | Re-run alone | Note |
|---|---|---|---|
| unit + live suite | FAIL | PASS: live tests 186/187 (0 fail, 1 skip); unit 885/885 before the deploy | first run: the `paperfraud` live test got `unknown`, OpenAlex unreadable from this machine (keyless budget per IP, G231). It runs local code against OpenAlex, not the deployment |
| verify-deploy | PASS | | |
| param shapes | PASS | | |
| intent answers | FAIL, 39/40 | PASS, 40/40 (~18:37 UTC) | first run: ACADEMIC_SEARCH returned 2 papers without citation counts (OpenAlex). The six `not_licensed` refusals are the known baseline (G230). SANCTIONS_SCREENING_MATCH passed both runs |
| hostile inputs | PASS | | |
| upstream health | PASS | | |
| no-regression | PASS | | 8 identical, 0 differ |

**5/7 on the first run; 7/7 after re-running the two failing gates alone** (`preflight-reruns.txt`). Both failures
were on OpenAlex paper routes this release did not touch, the same two as the `3c5e8ff` release. Not rolled back.

`watch.txt`: registration 4829 `active`, endpoint ok in 638 ms (2026-11-05 18:31:08 UTC).

## The change, on production (`production-probes.txt`, ~18:29 UTC)

| Input | Before (`3c5e8ff`) | Now |
|---|---|---|
| "Сбербанк" | `unknown`, no subject named | `match`, PUBLIC JOINT STOCK COMPANY SBERBANK OF RUSSIA (OFAC SDN 17018), 1.0 |
| "Tesla, Inc." | `possible_match` with TELA, `matched: true` | `no_match`, closest TELA 0.85 |
| "AEZA Grp" | `no_match` | `match`, AEZA GROUP LLC (54566), 1.0 |
| "suex.io" | `no_match` | `match`, SUEX OTC, S.R.O. (33151), 1.0 |
| "Gr1nex" | `possible_match` | `match`, GRINEX (55045), 1.0 |
| "Hamaz" | not in the replay | `possible_match`, HAMAS (4695), 0.92 |
| "محمد" (Arabic) | not run | `unknown`, `unsupported_script` |
| "Apple Inc." | `no_match` | `no_match`, closest 0.85 |
| "Viktor But" | `possible_match`, 0.914 | `possible_match`, 0.914 |

The "Before" column is from the 2026-11-05 replay (`../sanctions-real-inputs-2026-11-05/before.json`, run on
`aa110f8`, whose sanctions matching `3c5e8ff` did not change), and for "Viktor But" from the `3c5e8ff` release
probes.

## Before (`epochs-before.json`, read 2026-11-05 ~18:29 UTC)

SANCTIONS_SCREENING_MATCH_GENERAL, the last epochs scored before this deploy: rank 4–12 and score 0.960–0.9985 across
epochs 2004–2019 (12th, 0.997 at 2019, 13:46 UTC, the only one after `3c5e8ff`), third place 0.9969–1.0. The rank
moves eight places with no code change, so one epoch after this release proves nothing.

## Not checked

- Whether the sanctions rank moves. Read with `node track1-miner/tools/epoch-history.mjs <out.json>
  SANCTIONS_SCREENING_MATCH_GENERAL` after three epochs scored after 18:28 UTC. Only one sanctions epoch (2019) was
  scored on `3c5e8ff` alone, so a later move cannot be credited to this release or to `3c5e8ff`'s `matched` field
  separately (G254).
- Whether the evaluator's references agree with these verdicts. "Correct" above means the closest listed name is the
  party the input names, against the live SDN list; the benchmark's own labels are not public.
- The limits in `../sanctions-real-inputs-2026-11-05/README.md`: Arabic, Persian and Chinese script refused, not read;
  a one-letter change to a listed word of 4 letters or fewer is not flagged.
