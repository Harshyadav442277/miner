# Release `4f1f852`, 2026-11-22: ONCHAIN_METRIC tx_count and block values; Web Search cited source

Owner's yes: 2026-11-22, in the session. PR: https://github.com/Harshyadav442277/miner/pull/47 (open, not merged).

| | |
|---|---|
| Build commit | `4f1f852` (branch `PR/audit-fixes-2026-11-22`), deploy tree `C:\Users\hyada\tg-deploy\m4f1f852` |
| Preview | `miner-qa65594et-wukong4.vercel.app` |
| Production | `miner-lefeghzyl-wukong4.vercel.app` (`dpl_B4dRAz1D6s2yoevNoty1Uz1fR8eh`), aliased to `miner-wine.vercel.app` at ~09:25 UTC |
| Rollback target | `miner-n0lo5k8w7-wukong4.vercel.app` (`dpl_H2chXAV54A5aiaRuQ9newazCV7wh`, 2026-11-19) |

## Gates

| Gate | Result | Note |
|---|---|---|
| Unit tests on the deploy tree | 1059/1059 | `unit.txt` |
| Preview probes | pass | `preview-probes.txt`: tx_count 5970 at Ethereum block 26,453,005; gas limit 30000000 at block 20,000,000; a nonce question in words answers tx_count; Web Search cites `wiki/Pride_and_Prejudice`; SSL and crypto price unchanged |
| Preflight on production | 7/7 | `preflight.txt` |
| Registration watch (6126) | endpoint ok, activation active | `watch.txt`, 09:28 UTC |
| Production probe | `metric=tx_count` → verified, 5970, balance_gwei 5798969845.71421 | `curl` at ~09:28 UTC; it answered `insufficient_input` before this release |

Not fixed by this release: Arbitrum balance at block 507,283,728 answers `unknown` on Vercel (GAPS G343).
Score effect: not yet known; read ONCHAIN_METRIC and WEB_SEARCH in the next epochs.
