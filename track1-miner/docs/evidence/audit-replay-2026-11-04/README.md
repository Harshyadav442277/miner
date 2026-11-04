# Audit replay — 2026-11-04 21:00–21:02 UTC (Nov 5 02:30 IST)

The 154 questions of the [2026-10-21 correctness audit](../correctness-audit-2026-10-21/README.md), asked again of
production `https://miner-wine.vercel.app` (deployment `miner-1aoi3y0wt`), one at a time, with
`node track1-miner/tools/audit-replay.mjs <dir>`. Files: `answers-production.json` (every URL, status, latency,
full body) and `compare.md` (October verdict and verdict word beside the new answer).

**154/154 returned HTTP 200 with a non-empty answer.** That is availability, not correctness.

## What was re-checked against a source

Only the 61 rows whose October verdict was not a pass or whose verdict word changed. The other 93 were a pass in
October and still return the same verdict word: they are **carried, not re-sourced**, and prices, weather and
balances among them have moved since.

| Result | Count | Rows |
|---|---:|---|
| Pass, re-checked now | 12 | 10, 12 (MET Norway); 28 (OpenAlex 127,726 citations); 43 (nodejs.org: v26.13.0, 2026-10-28); 44; 69; 91, 112 (an off-intent question correctly declined); 121, 142 (October audit's source); 151, 153 (EDGAR) |
| Partial | 23 | 3, 11, 14, 25, 27, 42, 46, 49, 55, 58, 60, 62, 63, 70, 78, 82, 135, 137, 149, 150; outages 7, 15, 84 |
| Fail | 3 | 29, 30 (extraction answer sentence drops what was asked), 108 (a product-sales question answered with company revenue, G200) |
| Refused, licence | 15 | IP_GEOLOCATION 16–19, NEWS_HEADLINES 33–35, NEWS_SEARCH 37–39, STOCK_PRICE 101–104, FINANCIAL_DATA 107 |
| Time-varying, not re-sourced | 7 | 5, 8, 9, 13 (weather), 72 (wallet), 89 (gas), 100 (SOL price) |
| Not verified | 1 | 57 (a 2026 scoping review the miner quotes; not looked up) |

Against October's production run (27 fail): 11 of those now pass, 5 are partial, 6 are licence refusals, 2 still
fail (29, 108), and the rest are time-varying or unverified. Row 30 was a partial in October and is a fail now.

## Defects found, and what happened to each

| Rows | Defect | Status |
|---|---|---|
| 29, 30 | A request for several extraction kinds answered with the first kind only; the remainder repeated values up to three times | Fixed in `7b850e2`: every kind once, and the whole extraction is the `answer`. Unit 873/873. Not deployed at the time of writing |
| 25, 27 | "Here are 5 papers" listed one: the answer sentence ended at item 1 | Fixed in `7b850e2`: a numbered list stays in the sentence that introduced it |
| 7, 15 | Two weather calls failed fast (~760 ms) as `upstream_unavailable`; both answered correctly when asked again minutes later. The failure message names the whole question as the place | Transient; message wording logged |
| 108 | FINANCIAL_DATA answers product questions with company totals | G200, open |
| 101–104 | **STOCK_PRICE refuses every request (`not_licensed`), yet devnode ranks it 1st (score 0.9987, epoch 2013)** | Devnode rank does not measure correctness here. An app routed to us for a stock price gets a refusal. Remove at the next `updateMiner` |
| 16–19, 33–39 | IP_GEOLOCATION, NEWS_HEADLINES and NEWS_SEARCH also refuse on licence | Remove at the next `updateMiner` (WINNING.md §6) |

## Sources read for this replay

EDGAR `data.sec.gov/submissions` for Apple, Microsoft, NVIDIA and Pfizer, and XBRL `Revenues` for Pfizer
(FY2025 62,579,000,000 USD); `nodejs.org/dist/index.json`; `api.openalex.org/works`; MET Norway locationforecast
for Cairo and Cape Town. All read 2026-11-04 21:05–21:20 UTC. Microsoft's newest 8-K was accepted 21:01:27 UTC,
64 seconds before our read, so row 150 is judged on the filings before it: a 424B2 of 2026-11-02 was newer than
the 8-K we named, hence partial.
