# Paid requests routed to LiveCert, Nov 1–4 — from the network's records (GAPS G256)

Produced 2026-11-05 ~09:45 UTC by
`node track1-miner/tools/consumption.mjs 2026-11-01T00:00:00Z track1-miner/docs/evidence/consumption-2026-11-05 livecert`.
Anyone can re-run it: every source is public and needs no key.

- `summary.md`: the counts, a table per payer wallet, and the consumption rubric line by line.
- `requests.json`: one record per paid request. Each has the `signal_hash`, the intent, who chose the miner, the
  status, a hash of the input, the paying wallet, the x402 `tx_hash`, whether that payment checked out on Sepolia, and
  our answer's `verdict` or `error`. Question text is left out; `GET /engine/v1/signal/{signal_hash}` returns it.

| | |
|---|---|
| Paid user requests | 385, from 16 wallets, 2026-11-01 to 2026-11-04 |
| Chosen by the Engine's ranking | 24, from 6 wallets; 361 named LiveCert |
| x402 payments verified on Sepolia | 341 (USDC from the payer to the Diamond, $0.01 each) |
| Network's own internal traffic | 6 rows, not counted |
| Status `success` | 384/385 (the failure asked for a `POST /scan` we do not serve) |

## What this does and does not show

- **Shown:** that the network recorded each request, our answer and its payment, and which requests the ranking
  routed. These are Telegraph's records, not our logs.
- **Not shown:** who the payers are. None of the 16 wallets appears in this repo or on the Codex branch, but a
  wallet is not an H2 app, and an Anjoman smart wallet of our own would be unknown here too. No consumption point is
  claimed until a wallet is tied to a registered H2 Apps & Agents project.
- **Our own traffic is not in this feed.** The availability sweep, the audits and the capacity test call
  `miner-wine.vercel.app` directly, not the Engine.
- The two biggest payers sent test-like sets: 287 sanctions names (a robustness benchmark) and 55 fact-check
  claims. What they found is in `../sanctions-real-inputs-2026-11-05/` and GAPS G254.
