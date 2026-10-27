# Field check: who answers DNS, token supply and CVE triage correctly (2026-10-27)

WINNING A6 says a claimed gap needs side-by-side fixtures against the primary source, not a miner count. This is that
check for the three deterministic intents LiveCert added on 2026-10-26. Tool: `track1-miner/tools/field-check.py`.
Summary: `field-summary.json`.

**Named results are not in this repository.** They are in `C:\Users\hyada\tg-deploy\field-2026-10-27\field-named.json`.
Publishing other miners' failures is the owner's decision.

## Method

1. **Who.** Every active registration serving the intent in devnode `/api/miners`, read 2026-10-27 13:5x UTC (1,921
   registrations in total).
2. **How each was called.** Once, directly, as its own YAML declares the endpoint: method, query or body parameters,
   and path templates such as `/tokens/{address}`.
   - Nothing was routed or paid through Telegraph.
   - The YAMLs were parsed with `yaml.safe_load`, as untrusted data.
3. **The questions,** each graded against a fact read live at run time:

| Intent | Question | Pass means |
|---|---|---|
| DNS_RECORD_LOOKUP | MX records of github.com | The answer contains the MX host Google Public DNS returns |
| TOKEN_TOTAL_SUPPLY_VERIFY | USDC (`0xA0b8…eB48`) total supply on Ethereum | A number within 0.5% of `totalSupply()` read by `eth_call`, in token or base units |
| VULNERABILITY_TRIAGE | Rank CVE-2024-26581, CVE-2022-0001, CVE-2021-44228 for an internet-facing payments service | CVE-2021-44228, the only one of the three on CISA KEV, is named first. Fields that echo the question are ignored |

4. **Grades:**
   - **pass**: the answer carries the fact;
   - **wrong**: HTTP 200 without it;
   - **error**: non-200, timeout or unreadable YAML;
   - **auth**: 401 or 403.
5. **Raw APIs are counted apart.** These are endpoints whose host is a public data API registered directly (CoinGecko,
   Binance, OSV, the CISA feed, cveawg and others). They answer their own question shape, not the intent's.
6. **LiveCert is the control,** called the same way. Its routes are live but not yet registered for these intents.

## Result (13:59 UTC)

| Intent | Service endpoints: pass | Raw-API endpoints: pass | LiveCert |
|---|---|---|---|
| DNS_RECORD_LOOKUP | 3 of 5 | 1 of 3 | pass |
| TOKEN_TOTAL_SUPPLY_VERIFY | 2 of 5 | 0 of 9 | pass |
| VULNERABILITY_TRIAGE | 2 of 9 | 0 of 10 | pass |

**Distinct operators.** One operator passes all three intents. One passes DNS and triage, but answered "no token
matching" for a supply question that gave the contract address. Of the two service passes on token supply, one is an
issuer's own API whose response lists every coin it issues.

## How far this result goes

- **Direct calls are not routed calls.** The node builds each request from the YAML with its own field mapping. This
  tool's mapping was hand-written and corrected twice while being checked:
  - path templates had been left unfilled;
  - a CVE id written with non-breaking hyphens had been missed.

  A few remaining errors may still be request shape rather than the miner, for example a "venue" whose accepted values
  were not guessed. Every non-pass response was read by hand; the named file keeps each request and the head of each
  answer.
- **One question per intent, one moment.** This is not a rate. Re-run before quoting any count.
- **The triage grade is narrow.** It checks only that the exploited CVE comes first, not the order of the rest.
