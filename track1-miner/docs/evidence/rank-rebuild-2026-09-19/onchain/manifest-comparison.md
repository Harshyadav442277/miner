# ONCHAIN_TX_LOOKUP manifest comparison — ours vs the two miners that cross

Read 2026-09-19 from each miner's `yaml_url` in `https://devnode.telegraphprotocol.com/api/miners`.
**No change was made to `track1-miner/miner.yaml`.** This is the proposal, with the reason.

## What each miner declares

| | livecert (reg 1408) | txlens (reg 9002) | veyctum (reg 9005) |
|---|---|---|---|
| path | `/tx-lookup` | `/check-tx` | `/lookup` |
| subject param | `hash` | `tx_hash` | `tx_hash` |
| subject in top-level `input_schema` | **absent** | `tx_hash`, `pattern ^0x[0-9a-fA-F]{64}$` | `tx_hash`, same pattern, `required` |
| chain param | `chain`, free string | `chain`, **`enum: [eth, base, arbitrum, optimism, polygon]`, `default: eth`** | `chain`, free string |
| chain in top-level `input_schema` | **absent** | yes | yes |

txlens's `chain` is the only one carrying an **enum**. A request-builder filling an enum field can
only emit one of five tokens, and txlens's server accepts exactly those five. Ours is free text
described in prose — "One of ethereum, base, arbitrum, optimism, polygon, bsc or avalanche" — so
the model may write `eth`, `mainnet`, `1` or `ETH_MAINNET`, none of which our endpoint accepted.

Our top-level `input_schema` declares `query, q, domain, location, latitude, longitude, lat, lon,
hours, forecast_hours, days, forecast_days, topic, ip, text, target_language, source_language` —
and **neither `hash` nor `chain`**, although the `/tx-lookup` endpoint's own `params` block
declares both. The manifest's own comment above that block asserts "the engine fills the
parameters a miner declares here and does not pass the rest of the question, so anything not
declared is invisible." Those two statements cannot both be true of this endpoint.

## The YAML change I would propose (not made)

In the `/tx-lookup` endpoint's `params.query.optional`, replace the free-text `chain` entry's
description with an enumerated one, and add `hash` and `chain` to the top-level `input_schema`:

```yaml
# endpoints[] -> /tx-lookup -> params.query.optional
  - name: chain
    type: string
    enum: [ethereum, base, arbitrum, optimism, polygon, bsc, avalanche]
    description: >-
      Use one of these exact words and no abbreviation. Omit it entirely when the
      question does not name a chain; every chain is then searched for the hash.

# input_schema.properties
    hash:
      type: string
      pattern: "^0x[0-9a-fA-F]{64}$"
      description: /tx-lookup. The 32-byte transaction hash.
    chain:
      type: string
      enum: [ethereum, base, arbitrum, optimism, polygon, bsc, avalanche]
      description: /tx-lookup, /wallet-balance, /gas-price. Exact word, no abbreviation.
```

**Why, and why it is second-order.** The enum removes the chance of a spelling we do not read;
declaring the params in `input_schema` removes the contradiction above. But the code fix in this
lane already accepts every spelling the enum would have prevented, so the YAML change is
belt-and-braces rather than the repair — and registration is effectively immutable, so it is not
worth a re-registration on its own.
