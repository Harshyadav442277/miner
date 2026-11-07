# Release 2026-11-05 ~19:10 UTC (00:40 IST Nov 6): filings issuer and null counts (G257, G263)

Owner's authorisation: "Yes, deploy it" (2026-11-05 UTC), in answer to "Deploy `50f6a53` to production? It also
ships the pending sanctions fix." The sanctions fix had already shipped on its own (`4fb477e`, release record
`../release-2026-11-05-sanctions-names/`), so this release adds the filings change only.

| | |
|---|---|
| Build commit | `9b82d08` (code `bb07266`). The miner diff against the previous release `4fb477e` is `src/filings.ts`, `src/mission-routes.ts`, `test/filings.test.ts` and `test/intent-fields.test.ts` only |
| Change | The filings route finds the issuer in a question alone ("How many filings did Apple make in the last 12 months?", "Microsoft 8-K filings in the last 6 months"), reads REGULATORY_FILING_MONITOR's own `entity` and `period`, and reads quarter and year windows. `filing_count` is `null`, not 0, for an issuer not in EDGAR, and `null`, not a count of the whole index, when no period or fiscal year was read |
| Unit | 887/887 in the deploy tree `C:/Users/hyada/tg-deploy/m9b82d08` |
| Preview | `https://miner-kmp8kjry5-wukong4.vercel.app`, `dpl_JBkugHh2MsSQmPXQz2fw5fkQAe8a`; probes in `preview-probes.txt` (six filings inputs; `/sanctions-screen`, `/company-registry`, `/ssl-check` unchanged), 9/9 as expected |
| Production | `https://miner-f28bzjwiw-wukong4.vercel.app`, `dpl_BmcKxGSMKRuwAcY6P22sBzhvojD6`; `promote` answered 409 "already the current production deployment", and `vercel inspect miner-wine.vercel.app` names it |
| Rollback target | `https://miner-mztwjxnqa-wukong4.vercel.app` (`dpl_HdLrLG7mb9pdfMPFDzF2PMSavUtv`, `4fb477e`, 2026-11-05 ~18:28 UTC) |

## Gates (`preflight.txt`, production, between 19:11 and 19:16 UTC)

| Gate | Result | Note |
|---|---|---|
| unit + live suite | PASS | |
| verify-deploy | PASS | |
| param shapes | PASS | |
| intent answers | PASS | the six `not_licensed` refusals are the known baseline (G230) |
| hostile inputs | PASS | |
| upstream health | PASS | |
| no-regression | PASS | 8 identical, 0 differ |

**7/7 on the first run.** `watch.txt`: registration 4829 `active`, endpoint ok in 356 ms (2026-11-05 19:16:43 UTC).

## The change, on production (`production-probes.txt`)

| Request | Before (`4fb477e`, 19:10 UTC) | Now (`9b82d08`, 19:16 UTC) |
|---|---|---|
| `query=How many filings did Apple make in the last 12 months?` | `unknown`, no issuer named | `filing_count: 13` since 2025-11-05 |
| `query=Microsoft 8-K filings in the last 6 months` | `unknown`, no issuer named | `filing_count: 8` since 2026-05-05 |
| `entity=Tesla&period=last 12 months` | `unknown`, no issuer named | `filing_count: 15` since 2025-11-05 |
| `query=Has Tesla filed its latest 10-Q on SEC EDGAR?` | `filing_count: 26`, a count of the whole index | `filing_count: null`, same filing answer |
| `entity=Ozempic&period=last 12 months` | `unknown`, no issuer named | `not_found`, `filing_count: null` |

## Before (`epochs-before.json`, read ~19:18 UTC)

REGULATORY_FILING_MONITOR_GENERAL: rank 8–10 and 0.976–0.980 over epochs 1996–2017, then 11th at **0.8145** at
2019 (14:07 UTC, the only epoch after `3c5e8ff` added `filing_count`), when every filings miner fell (GAPS G254).
No filings epoch had been scored after 2019 at the time of the read. This release is the first with the null
counts, so the next filings epochs test G263 directly.

Also in the file: sanctions 9th (0.9859) and registry 4th (0.9962) at epoch 2021, scored 18:59 and 18:20 UTC.
The sanctions epoch is the first after the `4fb477e` sanctions release (`../release-2026-11-05-sanctions-names/`).

## Not checked

- Whether the filings score recovers. Read the next filings epochs with `node track1-miner/tools/epoch-history.mjs
  <out.json> REGULATORY_FILING_MONITOR_GENERAL` and compare with 0.8145 and with 0.976–0.980.
- Which forms the reference counts (material only here; zk-filing counts every form) and from which source (G263).
