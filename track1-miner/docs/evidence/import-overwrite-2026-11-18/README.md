# 2026-11-18: an import on the devnode replaced registration 5292 with a 4-intent Season-1 YAML

Checked by Claude, 08:47–09:10 UTC, from the devnode API and Sepolia RPC (publicnode). Nothing was signed.

## What the node shows

| Id | Owner | Status | YAML | Intents | Registered (node) |
|---|---|---|---|---|---|
| 5292 | `0xdad2…a39e` (LiveCert) | **superseded** (was `active` at 08:33 UTC) | `04c0e9f` (GitHub) | 44 | 2026-11-17 09:51:48 (rebuild import) |
| 5352 | `0xdad2…a39e` | superseded at 08:41:51 | `ipfs/QmWmgbY7…` | 3: SSL, STORM, WEATHER_FORECAST | 08:41:10 |
| **5358** | `0xdad2…a39e` | **active** | `ipfs/QmdqCuVK…` ("LiveCert Operational Signals", 8,411 bytes) | 4: SSL, STORM, WEATHER_FORECAST, IP_GEOLOCATION | 08:41:50 |

Ids 5327–5358 were all created between 08:35:31 and 08:41:50 UTC, about six seconds apart, for many teams' slugs.

## What the chain shows

Every Diamond event with topic2 = the LiveCert wallet, from block 12,148,000 to 12,160,380 (now):

| Time (UTC) | Block | Tx | Registration id | Sender |
|---|---|---|---|---|
| 2026-11-16 18:07:12 | 12,148,994 | `0x8ebe1d47ca227789fd38f3509845dfa33a7a50dbc489afddfb0241140a46f5db` | 5292 | LiveCert wallet |
| 2026-11-17 11:14:12 | 12,154,029 | `0xbfb7a37b5ebd4757171239d16ea3dc1b2541e0c0c03dd848eeecf7413faa8b36` | 5301 | LiveCert wallet |

**There is no on-chain event for 5352 or 5358.** They were created by the node, not by a transaction from or for this
wallet. Their YAML is the Season-1 3–4 intent manifest.

## Effect

From 08:41 UTC on 2026-11-18, routing reaches LiveCert only on SSL, STORM, WEATHER_FORECAST and IP_GEOLOCATION. The
other 40 intents are off the node, including FINANCIAL_DATA, which was rank 1 in epoch 8.

## Message to the organisers (owner sends; draft)

> Hi team, the devnode import at ~08:35–08:41 UTC today replaced our current registration with an old one.
>
> `livecert`'s current registration is **5292** (Sepolia tx `0x8ebe1d47…`, YAML hash `3cf18081…`, 44 intents), plus
> a later one, **5301** (tx `0xbfb7a37b…8b36`, hash `bf9dd574…`). The node never indexed 5301.
>
> At 08:41 UTC the node created **5352** and **5358** for our wallet from IPFS YAMLs. Those are Season-1 manifests
> with 3–4 intents. There is no on-chain event for either: our wallet's only Diamond events since Nov 16 are 5292 and
> 5301. 5358 is now active and 5292 is marked superseded, so 40 of our 44 intents left routing.
>
> Could the import be rolled back for `livecert`, or 5301 indexed? We can also re-register, but we would rather not
> have a later import overwrite it again.

## Not verified

- The import's source and whether it will run again.
- Whether a new signature now would index; registrations sent by others after the Nov 17 rebuild did.
