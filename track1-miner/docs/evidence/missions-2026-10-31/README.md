# Mission × intent matrix and workflow fixtures — 2026-10-31

WINNING.md S1, E3. Regenerate with:

```bash
node tools/mission-matrix.mjs docs/evidence/missions-2026-10-31
node tools/mission-fixtures.mjs https://miner-wine.vercel.app docs/evidence/missions-2026-10-31/fixtures-production.json
```

| Claim | Evidence | Revision | Environment | Expected vs observed | Checked at | Known limitation |
|---|---|---|---|---|---|---|
| The 15 missions list 102 example builds; our 36 intents touch all 15 missions; 9 builds buy only families we serve (58 partial, 35 none) | `matrix.json` (parsed from the H2 site's mission chunk; our intents from `/api/miners/4829`) | miner `330f2af` | H2 site, devnode | — | 2026-10-31 18:50 UTC | Mission pages name families; an intent counts if it is the family or a child of it |
| 3 of the 9 full workflows pass every step on production; 4 fail; 2 are unchecked | `fixtures-production.json` | `330f2af` (`miner-h0lnck8v6`) | production `miner-wine.vercel.app` | all 9 pass vs 3 pass | 2026-10-31 18:52 UTC | SEC steps need `SEC_USER_AGENT`; macro, crypto, weather, registry, CEO and transfer steps are cross-checked live (BLS, Bitstamp, MET Norway, GLEIF, Wikidata, Ethereum RPC, LayerZero Scan) |

**Failing steps (GAPS G241–G243):**

- `factcheck_boe`, `factcheck_stripe_year`: `unverified` for "the Bank of England is headquartered in London" and
  "Stripe was founded in 2010" (both settled facts). Breaks 3 workflows.
- `sentiment_earnings`: `neutral` for "beat earnings expectations and raised guidance; shares jumped 8%". Breaks 1.
- `event_election`: `no_market_found` for "Who won the 2024 United States presidential election?" ("Did Bitcoin
  reach $100k in 2024?" resolves correctly). Breaks 1.

The first run (18:51 UTC) also failed `qa_moons` and could not check `transfer_first_eth`. Both were fixture
faults, fixed before the second run: the fixture required "Phobos" when "two" is the complete answer, and its
RPC kept no 2015 receipts.

## Fixes for G241–G243 (2026-10-31 ~19:15 UTC; not deployed to production)

| Claim | Evidence | Environment | Expected vs observed | Known limitation |
|---|---|---|---|---|
| Unit suite and typecheck pass with the three fixes | `unit-fixes.txt`: 866/866 (854 before, 12 new tests) | local, tree at `5a3dba0` + the fix diff | pass vs pass | — |
| Fact-check settles the two failing claims, and the guards still hold | `fixtures-local-fixes.json` (`factcheck_boe`, `factcheck_stripe_year` pass); ad-hoc live run: Paris/Edinburgh HQ and Stripe 1999/2011, Apple 1980, Microsoft 1976 not supported; Eiffel/Berlin still contradicted; vaccines/autism not supported | local server, live Wikipedia | supported vs supported | Founding rule matches founded/established/launched/… + "in YEAR" or a full date only |
| Sentiment reads market news by its outcome | 8-text endpoint check: earnings beat → positive, miss/cut/plunge → negative, layoffs → negative, 3 plain facts → neutral, 2 consumer controls unchanged (8/8) | local server with the Groq model | 8/8 vs 8/8 | The local fixture run in `fixtures-local-fixes.json` predates the prompt change, so it still shows `sentiment_earnings` failing |
| Event outcome resolves the election in both spellings; Rosneft and BTC still pass | `npx vercel curl` on preview `miner-d881p4yiz-wukong4.vercel.app`: "Who won the 2024 United States presidential election?" → resolved, "Donald Trump won."; the "US" spelling the same; BTC $100k → resolved Yes; Rosneft → match (OFAC SDN) | Vercel preview | resolved vs resolved | Polymarket and OFAC are unreachable from this machine, so these steps were checked only on the preview |

Not yet shown: all 9 workflows passing in one run on production. That needs the production deploy (owner's yes),
then `node tools/mission-fixtures.mjs https://miner-wine.vercel.app …`.

## All 102 builds on production `a8abbcf` (2026-10-31 19:28 UTC) — `fixtures-all-a8abbcf.json`

`tools/mission-fixtures.mjs` now also grades every PARTIAL build on LiveCert's part only, with one representative
step per family (`tools/mission-steps.mjs`, `FAMILY_STEPS`). SEC steps are cross-checked against EDGAR and XBRL
under the miner's own identity; `SEC_USER_AGENT` overrides it.

| Result | Value |
|---|---|
| Full builds (every family ours) | **9 pass, 0 fail** of 9 |
| Partial builds, LiveCert's part | **50 pass, 7 fail, 1 refused** of 58 |
| Missions with at least one passing build | **15 / 15** |

The 7 failures came from two steps:

- `extract_invoice` (CONTENT_EXTRACTION, 3 builds): the invoice number was never extracted (G245). Fixed in code,
  869/869 unit; preview `miner-ipk9a60l8` returns all four fields. **Not on production.**
- `classify_incident` (TEXT_CLASSIFICATION, 4 builds): "operator error" for a motor failure. The model call missed
  its 350 ms deadline by 1 ms and the keyless fallback guessed; after the 60 s cache expired the same request
  answered "hardware fault" twice (G244). Intermittent; not changed.

The refusal is STOCK_PRICE (resources-and-agriculture, "Auditable machine decisions"): an honest `not_licensed`
(G230), so that build is not served.

Limitation: a partial build's grade uses one representative input per family, not that build's own inputs.
