# Release `5f28505`, 2026-11-22 ~19:40 UTC (2026-11-23 IST): remaining gaps

Owner: "fix all of them" (2026-11-23 IST). PRs #53 (`d1620ae`) and #54 (`5f28505`) merged into main.
#54 fixed a case the `d1620ae` preview exposed before promotion: with GLEIF silent, the SEC-only registry answer ignored
the jurisdiction asked. `d1620ae` was never promoted.

| | |
|---|---|
| Build commit | `5f28505` (main), deploy tree `C:\Users\hyada\tg-deploy\m5f28505` |
| Previews | `miner-nhdkzkb1p` (`d1620ae`), `miner-gdbnbnjzw` (`5f28505`) |
| Production | `miner-pd9clrct7-wukong4.vercel.app` (`dpl_9pMfgpRecB1Cn116wHV5v8noi9wg`) |
| Rollback target | `miner-bk9insot7-wukong4.vercel.app` (`dpl_BfJXp7P13QwEgh7fD1hUtaCo6ozS`, `8ef874f`) |

## Gates

| Gate | Result | Note |
|---|---|---|
| Unit tests on the deploy tree | 1078/1078 | `unit.txt` |
| Preview probes | pass | `preview-probes.txt`. ONCHAIN_METRIC `metric=totalSupply` returns USDC's supply at block 25,987,739, and `gas_limit` returns 30000000. Web Search on TaskGroup exceptions quotes the cancellation rule. Alphabet $3.26 tn. Apple in US-DE `not_found`, in US-CA `found`. Apple's filings in August 2026: 4. SSL valid |
| Preflight on production | 7/7 | `preflight.txt` |
| Registration watch (6126) | endpoint ok, activation active | `watch.txt`, 19:41 UTC |

Limits (GAPS, 2026-11-22 ~20:15 UTC block):
- Visa and Berkshire still depend on Nasdaq for market cap.
- One ONCHAIN_METRIC scoring call carried no parameters.
- The "what happens when one task raises" phrasing picks a related passage, not the main rule.
