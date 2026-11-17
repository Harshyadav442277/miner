# Release `14b6d98`, 2026-11-16 ~18:50 UTC: Federal Register count for non-registrants; request-log values

| | |
|---|---|
| Build commit | `14b6d98` (branch `PR/livecert-miner-track1-cec6be`), built in `C:/Users/hyada/tg-deploy/med32fa0` detached at it |
| Preview | `https://miner-h7ltxcojs-wukong4.vercel.app` |
| Production | `https://miner-7bx1moszs-wukong4.vercel.app`, `dpl_4HCYvTJQV28vZ5pdEpq1CtovBYDh`; alias `miner-wine.vercel.app` on it (promote answered 409 "already the current production deployment") |
| Rollback target | `miner-hns8y07yw` (`04c0e9f`, `dpl_FFxTiE7cY9ZBr2f69kBubPSdxeco`): `vercel promote https://miner-hns8y07yw-wukong4.vercel.app --scope wukong4 --yes` |
| Registration | 5292, unchanged. No YAML change: `/sec-filings` already declared `entity` and `period` |

## What changed

1. **REGULATORY_FILING_MONITOR, entity that is not an SEC registrant.** The intent's `entity` is "Company, product or
   concern". Before, a product such as Ozempic answered `filing_count: null` (`verdict: not_found`), which no scorer can
   read. Now the US Federal Register (keyless API, US Government works) is searched for the entity as a phrase in the
   period, and `filing_count` is that document count, with `register: "Federal Register"`, titles, URLs and the search
   URL. SEC registrants are answered from EDGAR exactly as before. If the Federal Register is down, the old
   `not_found` / `null` answer stands; nothing is guessed. Code: `src/fedreg.ts`, `src/fedreg-filings.ts`.
2. **Request log.** With `LOG_QUERY=on` (already set in production), the log line now carries the values of `__path`,
   `chain`, `record_type`, `type`, `period`, `form`, `target_language` and `window_hours`. Every other param is still
   logged by name only. Purpose: read GAS_PRICE's 0 (GAPS G310) against what the node sends.

## Gates

| Gate | Result | Note |
|---|---|---|
| Unit tests at `14b6d98` | 1045/1045 (`unit.txt`) | 7 new tests in `test/fedreg.test.ts` |
| Preview probes | 6/6 as expected (`preview-probes.txt`) | Ozempic 3, semaglutide in 2025 2, an unknown name 0, Apple 92 from EDGAR (unchanged), gas, DNS |
| Preflight on production | 6/7 (`preflight.txt`); the failing gate re-run alone passes | The failure was one live test whose call to MET Norway (157.249.81.141) was closed by the server (`UND_ERR_SOCKET`). Re-run alone: 2/2 pass. Not this release |
| Watch | `endpoint=ok 655ms`, registration active (`watch.txt`) | |

## Not verified

- The score effect. REGULATORY_FILING has never been scored for LiveCert, and 5292 also adds the `period` mapping. The
  request log cannot separate the two causes: `entity` is rightly not logged, so the log does not show which register
  answered.
- **Corrected in `dd95ab6`** (production `miner-om2pymy89`, 2026-11-17 ~07:25 UTC). Production probes after this
  release showed brand names of registrants (Google, Facebook, Meta, JPMorgan, Berkshire) taking the Federal Register
  path with the false sentence "X is not an SEC registrant". The answer now says no registrant matched by name, at
  confidence 0.7. Counts are full-text matches: "Meta" counted 115 documents, some unrelated.
- Pre-existing, not from this release: "Toyota" resolves to "TOYO Co., Ltd" on EDGAR (GAPS G324).
- **`dd95ab6` preflight (2026-11-17 ~07:40 UTC): 5/7.** Both failures are Google News answering 429. They are a live
  news test, and NEWS_SEARCH and NEWS_HEADLINES in the intent-answers gate (`provider_unavailable`). Production
  probes at 07:45 UTC returned `upstream_unavailable` / `provider_unavailable`, both with HTTP 200. No news code
  changed in either release, so it was not rolled back (GAPS G326).
- Which entities the node's tests use. Leaders at 0.5 in epoch 2107 (txlens, reg-fedreg-search) read the Federal
  Register; zk-filing, which counts EDGAR, scored 0.
