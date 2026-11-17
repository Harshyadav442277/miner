# Devnode rebuild, 2026-11-17: registration 5292 missing for at least 2 h 20 min, then restored

Checked by Claude from the node's public API and the Sepolia chain. Nothing was signed or re-registered.

## Timeline (UTC)

| Time | Observation | Source |
|---|---|---|
| Nov 16 18:16:14 | Registration 5292 (`livecert`) active, YAML `04c0e9f`, hash `3cf18081…5fb13d`, 44 intents | `GET /api/miners/5292`, saved in `../track1-diagnosis-2026-11-17/registration-5292.json` |
| Nov 16 18:22 | Catalog: 2,173 miners, epoch 2107 scores present | `C:/Users/hyada/tg-deploy/scores/miners-2026-11-16T1822Z-pre-reset.json` |
| Nov 17 ~06:31 | Catalog rebuild begins; every `registered_at` is from 06:31 onward; all scores at epoch 0 | `GET /api/miners` |
| 06:36 / 07:24 / 07:30:39 | Registrations restored in id order: 3000, then 5000, then 5201 (the last) | `GET /api/miners/{id}` |
| 07:32 → 09:15 | 5202–5300 all answer `miner registration not found`, 5292 included; catalog grows only by new registrations (1,455 → 1,465) | repeated `GET /api/miners/{id}` |
| 08:25 | `scores` workflow fails ("livecert not in the catalog"), issue 34 | Actions run 44046568642 |
| 09:16 | Chain: 5292 intact (see below) | Sepolia `eth_getLogs`, publicnode RPC |
| 09:51:48 | **5292 restored**: active, same wallet, hash and 44 intents; 5240–5291 restored at 09:51 too | `GET /api/miners/5292` at 10:05 |
| 10:05 | `watch.mjs --registration-id 5292`: `endpoint=ok`, `activation=active` | local run |

Still `not found` at 10:04: 5202 and 5203. Their status before the rebuild was not checked.

## On-chain evidence that 5292 was never deregistered

- Network: Ethereum Sepolia. Diamond `0x3624EB012B5E998BB57B6bE6C9Cfc9c4bc5eb99b` (docs: miner-registration, updated Nov 1).
- Registration tx `0x8ebe1d47ca227789fd38f3509845dfa33a7a50dbc489afddfb0241140a46f5db`, block 12,148,994:
  - from `0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e` (the LiveCert wallet), to the Diamond;
  - its input carries the YAML hash `3cf18081…`;
  - three events with topic1 = 5292.
- No event with topic1 = 5292 after it, up to block 12,153,446 (09:16 UTC Nov 17).

## New in the restored record: `warnings`

The node now lists four intents whose endpoint declares no field for a node-required param. Each message adds
"(the request builder maps it)":

- CONTENT_EXTRACTION `/extract`: `fields`
- FRAUD_DETECTION `/fraud-check`: `subject`
- TOKEN_HOLDER_COUNT `/token-holders`: `token`
- TEXT_CLASSIFICATION `/classify`: `categories`

These are candidates for the batched YAML (declare the params or map them in `intent_mapping.input`). Their effect
on scoring is not known.

## Message to the organisers (owner sends; draft)

> Hi team, a note on the devnode rebuild on Nov 17, in case it helps with §10.02 (network problems).
>
> From about 06:31 UTC the catalog was rebuilt and every score reset to epoch 0. Registrations were restored in id
> order up to 5201 (07:30:39 UTC). From then until at least 09:15 UTC, ids 5202–5300 answered "miner registration
> not found".
>
> Our registration **5292** (`livecert`) was among them, although it is intact on Sepolia: tx
> `0x8ebe1d47ca227789fd38f3509845dfa33a7a50dbc489afddfb0241140a46f5db` (block 12,148,994, YAML hash
> `3cf18081…5fb13d`), with no later deregistration. It came back at 09:51:48 UTC.
>
> So LiveCert was out of routing and scoring for at least 2 h 20 min (07:30 to 09:51 UTC), and its scores before
> the rebuild are no longer shown. Is that window logged on your side? Also, are 5202 and 5203 still expected to
> come back?

## Not verified

- Why the rebuild paused, or whether it is complete. 5202 and 5203 were still missing at 10:04.
- When LiveCert last served a request before the rebuild. The request log keeps about an hour.
- Whether the earlier scores (epochs up to 2107) still count anywhere. The node now shows epoch 0 for every miner.
