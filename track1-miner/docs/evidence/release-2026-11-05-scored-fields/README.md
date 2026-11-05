# Release 2026-11-05 ~09:39 UTC (15:09 IST): scored fields for sanctions, registry, filings (G254)

Owner's authorisation: "Yes, deploy it" (2026-11-05 UTC), in answer to "Deploy the scored-field change to
production?".

| | |
|---|---|
| Build commit | `3c5e8ff` (code `d478c56`, rebased onto `ca3742f`; the miner diff against the previous release `aa110f8` is `src/filings.ts`, `src/intent-fields.ts`, `src/mission-routes.ts` and their tests only) |
| Change | Answers carry each intent's scored field: SANCTIONS_SCREENING_MATCH_GENERAL `matched` (+ `name`, `lists`, `match_score`), CORPORATE_REGISTRY_LOOKUP_GENERAL `active` (+ `registration_id`), REGULATORY_FILING_MONITOR_GENERAL `filing_count` (+ `entity`, `filings`, `urls`, `counted_since`, `count_complete`) |
| Unit | 877/877 in the deploy tree `C:/Users/hyada/tg-deploy/m3c5e8ff` |
| Preview | `https://miner-n9owey621-wukong4.vercel.app`, `dpl_CipD4S3qdw4M8GX4vnfyxGchp1Yx`; probes in `preview-probes.txt` (the three changed routes; `/ssl-check`, `/convert` unchanged) |
| Production | `https://miner-5arlzhkv6-wukong4.vercel.app`, `dpl_6irxTNbbNRkgny3gXiyyMcMxLJ6T`; `promote` answered 409 "already the current production deployment", and `vercel inspect miner-wine.vercel.app` names it |
| Rollback target | `https://miner-iwc9rd2yv-wukong4.vercel.app` (`dpl_6wQ4PevtNbDgVKpAPuhKePa8hw5K`, `aa110f8`, 2026-11-04) |

## Gates (`preflight.txt`, production, 09:41–09:46 UTC)

| Gate | First run | Re-run alone | Note |
|---|---|---|---|
| unit + live suite | FAIL | FAIL, 1002/1004 (1 fail, 1 skip) | `paperfraud` live test: OpenAlex unreadable from this machine (keyless budget per IP, G231). It runs local code against OpenAlex, not the deployment |
| verify-deploy | FAIL | PASS (09:47 UTC) | first run: `/papers` returned 1 paper |
| param shapes | PASS | | |
| intent answers | FAIL, 38/40 | PASS, 40/40 (09:47 UTC) | first run: ACADEMIC_SEARCH 2 papers, RESEARCH_SYNTHESIS upstream unavailable. The six `not_licensed` refusals are the known baseline (G230) |
| hostile inputs | PASS | | |
| upstream health | PASS | | |
| no-regression | PASS | | 8 identical, 0 differ |

**4/7 on the first run; 6/7 after re-running the failing gates alone.** All three failures were on paper and
research routes this release did not touch, and both production gates passed when re-run a minute later. The
remaining failure is one live test hitting OpenAlex's keyless budget from this machine (G231, owner: a free
key). Not rolled back: the rollback target runs the same paper code against the same upstream.

`watch.txt`: registration 4829 `active`, endpoint ok in 449 ms (2026-11-05 09:52:43 UTC).

## The change, on production (`production-probes.txt`, 09:52 UTC)

| Probe | Scored field |
|---|---|
| `/sanctions-screen?name=Viktor But` | `matched: true` (possible match, BOUT Viktor Anatolijevitch, OFAC SDN, 0.914) |
| `/sanctions-screen?name=Unilever` | `matched: false` (closest 0.851) |
| `/company-registry?company=Barclays Bank PLC` | `active: true`, `registration_id: 01026167` |
| `/sec-filings?company=Apple&query=How many filings … last 12 months?` | `filing_count: 13` since 2025-11-05 |
| `/sec-filings?company=Microsoft&form=8-K&query=… last 6 months` | `filing_count: 7` since 2026-05-05 |

## Before (`epochs-before.json`, read 2026-11-05 ~10:00 UTC)

Every epoch the node has scored for LiveCert in these intents, all before the deploy (last one 08:44 UTC):

| Intent | Epochs | Our rank | Our score | 3rd place |
|---|---|---|---|---|
| SANCTIONS_SCREENING_MATCH_GENERAL | 21 (1990–2017) | 3–12, 4th at 2017 | 0.960–0.999 | 0.997–1.0 |
| CORPORATE_REGISTRY_LOOKUP_GENERAL | 3 (2013–2017) | 4, 3, 4 | 0.942, 0.965, 0.992 | 0.968, 0.965, 0.997 |
| REGULATORY_FILING_MONITOR_GENERAL | 5 (1996–2017) | 8–10 | 0.976–0.980 | 0.995–0.998 |

Sanctions moves 3rd–12th with no code change, so one epoch there proves nothing. Filings holds a steady gap of
about 0.02 to third place: that is where an effect from `filing_count` should show first.

## Not checked

- Whether the scores move. Measure with `node track1-miner/tools/epoch-history.mjs <out.json>
  SANCTIONS_SCREENING_MATCH_GENERAL CORPORATE_REGISTRY_LOOKUP_GENERAL REGULATORY_FILING_MONITOR_GENERAL` once
  three epochs scored after 09:40 UTC exist (epochs arrive every 2–6 hours).
- The filings route finds no issuer in a question alone: "How many filings did Apple make in the last 12
  months?" without `company` answers "No issuer was named" (G257), on the preview and on production before
  this release; the probes above pass `company`.
