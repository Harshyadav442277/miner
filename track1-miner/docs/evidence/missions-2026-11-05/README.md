# Mission builds on production `9b82d08` — 2026-11-05

The repeatable mission-specific test the verified-delivery award asks for (RULES_SEASON2.md §07): every example
build on the 15 mission pages, run against production and graded step by step against a primary source.

```bash
node tools/mission-fixtures.mjs https://miner-wine.vercel.app docs/evidence/missions-2026-11-05/fixtures-production-9b82d08.json docs/evidence/missions-2026-10-31/matrix.json
```

| Claim | Evidence | Revision | Environment | Expected vs observed | Checked at | Known limitation |
|---|---|---|---|---|---|---|
| Every one of the 15 missions has at least one build whose LiveCert part passes | `run.txt`, `fixtures-production-9b82d08.json` | `9b82d08` | production `miner-wine.vercel.app` | 15/15 vs 15/15 | 2026-11-05 ~21:00 UTC | the build list is `missions-2026-10-31/matrix.json`; the mission pages were not re-read today |
| Builds buying only families LiveCert serves | same | same | same | 9 builds: 7 pass, 0 fail, 2 unchecked | same | see "Unchecked" |
| LiveCert's part of builds that also buy other families | same | same | same | 58 builds: 53 pass, 0 fail, 4 unchecked, 1 refused | same | one representative step per family, not build-specific inputs |

## Unchecked and refused

- `crypto_eth` (CRYPTO_PRICE): its reference, Bitstamp's ticker, does not answer from this machine (HTTP 000,
  GAPS G232). Production answered "Ethereum (ETH) is $2,240.56 USD, the last Bitstamp trade at 2026-11-05
  21:02:48 UTC". Not graded.
- `websearch_founders` (WEB_SEARCH): Wikidata failed once during the run. Graded alone against production a few
  minutes later it passes (no missing founder).
- `stock_apple` (STOCK_PRICE): refused, no licensed stock-price source (GAPS G230). An honest refusal, not a pass.

The six unchecked builds depend on those two steps. Which build hangs on which step was not separated.

## Since the last run (`missions-2026-10-31`, production `e63df93`, 2026-11-01)

Then: full 9/9, partial 57 pass and 1 refused, 15/15. Now: no step fails; the difference is the unchecked
references above, not the miner. Four releases since then: `aa110f8`, `3c5e8ff`, `4fb477e`, `9b82d08`.
