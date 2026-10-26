# Release 2026-10-26 (third): the four G208 routes on production

- **Build:** `4d74076` on `codex/rank1-14-intents`, which landed `claude/g208-intent-swap` by fast-forward. Not pushed.
  - `3e29afb`: the routes `/dns`, `/token-supply`, `/keywords` and `/vuln-triage`, plus the draft 40-intent manifest.
  - `4d74076`: an address with no code answers `not_a_token` instead of "outage", and `intent-answers.mjs` gains
    correctness checks for the four new intents.
- **Deployed from:** clean worktrees outside OneDrive, `C:\Users\hyada\tg-deploy\mf9c2462` and `\m4d74076`, holding
  only the `.vercel` link.
- **Previews:**
  - `miner-7jj7njal2` (`f9c2462`): nine probes, all correct, all with receipts (`preview-probes-f9c2462.txt`).
  - `miner-6hssr7l25` (`4d74076`): the wallet-address case now answers `not_a_token`.
- **Production:**
  - `miner-9ozpb4kgh` (`dpl_DMXDNajvofboz6X8Du1zfQBu7N2T`, `4d74076`), ~12:15 UTC, aliased to `miner-wine.vercel.app`.
  - `vercel promote` answered 409, "already the current production deployment", for both production builds.
- **Production builds in between:** `miner-fpwo6m9mt` (`f9c2462`) served for about 20 minutes. Its gate run is what
  found the missing checks and the wallet-address bug.
- **Rollback targets:**
  - `miner-ccy6bq1ee` (`dpl_2a1LqwVBJrqfdyrWY58uaK4kVf3J`), the last build without the new routes;
  - `miner-fpwo6m9mt`, the same routes without the fix.
- **Registration 4829 is unchanged.** The new routes are served but not registered until an `updateMiner`. Production
  still answers every one of the 36 registered intents.

## Gates on production (`preflight.txt`, `4d74076`)

| Gate | Result | Note |
|---|---|---|
| unit + live suite | 933 pass, 0 fail, 1 skipped on re-run | The preflight run had one failure: SSL "expired certificates report a negative days_remaining" (`days_remaining=null`), read live from expired.badssl.com. It passed alone and in the full re-run (`unit-live-rerun.txt`), and passed at `f9c2462`. Recorded as a flaky live test; SSL code is untouched |
| verify-deploy | PASS | |
| param shapes | PASS | |
| intent answers | 39/40 | The known IP Tokyo pin. All four new intents pass |
| hostile inputs | PASS | |
| upstream health | 2 FAIL | Both known: the ip-api primary, and the merkle RPC answering 429 |
| no-regression | PASS, 8 identical | |
| watch.mjs, registration 4829 | `endpoint=ok activation=active` | 12:24:57 UTC (`watch.txt`) |

The previous release had the same baseline: 35/36, and the same two upstream failures.

## Latency on production

Data: `../g208-intent-swap-2026-10-26/latency-run{1,2}.{txt,json}`, 12:24 UTC.
- Six fresh questions per intent, in two runs.
- From India; the /health round trip (236–244 ms) is subtracted.

| Intent | Site target | Miner time, ms | Within target |
|---|---|---|---|
| DNS_RECORD_LOOKUP | < 200 ms | 56, 24, 36, 47, 35, 7 | 6/6 |
| KEYWORD_EXTRACTION | < 400 ms | 17, 43, 44, 24, 88, 64 | 6/6 |
| VULNERABILITY_TRIAGE | < 2 s | 100, 122, 196, 82, 87, 88 | 6/6 |
| TOKEN_TOTAL_SUPPLY_VERIFY, by address | < 500 ms | 148, 162 | 2/2 |
| TOKEN_TOTAL_SUPPLY_VERIFY, by symbol | < 500 ms | 437, 867, 3055, 1207 | **1/4** |

The symbol path misses its target (G213): the first resolution on an instance goes to GeckoTerminal. The triage
figures include whatever KEV download fell inside the run; an earlier preflight call may have warmed it.
