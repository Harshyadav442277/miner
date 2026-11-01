# G213: a verified table of major token contracts (2026-10-27)

**Problem.** On production, token supply looked up by symbol took 437–3055 ms of miner time against a < 500 ms target.
Looked up by address it took 148–162 ms. The difference is GeckoTerminal symbol resolution.

**Fix.** `KNOWN_TOKENS` in `src/token-supply.ts` lists 21 contracts. A listed symbol skips the lookup; anything else
still uses it.

| Chain | Tokens |
|---|---|
| Ethereum | USDC, USDT, DAI, WETH, WBTC, LINK |
| Base | USDC, WETH, DAI |
| Arbitrum | USDC, USDT, WETH, DAI |
| Optimism | USDC, USDT, WETH, DAI |
| Polygon | USDC, USDT, WETH, DAI |

## How each entry was checked (2026-10-27 ~13:40 UTC)

Every entry agrees across at least two independent sources:

| Entries | Sources that agree |
|---|---|
| All five USDC | Circle's published list (developers.circle.com/stablecoins/usdc-contract-addresses), and the contract's own `symbol()` |
| Ethereum, Optimism | `symbol()`, and Blockscout's token record with its holder count (122k–17M holders): `onchain-and-blockscout.txt` |
| Base, Arbitrum, Polygon | `symbol()`, and the GeckoTerminal liquidity resolver the table replaces (`addressForSymbol`). Blockscout served a Cloudflare challenge on these chains and was not retried |

The resolver disagreed in one case: **Polygon USDC**, which it calls `ambiguous` because bridged USDC.e trades beside
native USDC. Circle's list settles it. The answer names the contract and says that USDC.e is a separate one.

USDT on Arbitrum and Polygon now reports its symbol as `USD₮0` / `USDT0` (Tether's migration). The answer shows the
on-chain symbol and says so.

## Found on the way: Polygon symbol lookups never resolved

GeckoTerminal ids on Polygon are `polygon_pos_0x…`. `holders.ts` cut at the first underscore and got `pos_0x…`, so
every Polygon symbol lookup in `/token-holders` and `/token-supply` failed. It is fixed by `poolTokenAddress`, with a
test.

## Local check, from India, round trips included

| Question | Time | Result |
|---|---:|---|
| USDC on Polygon | 491 ms | verified, Circle's contract |
| USDT on Arbitrum | 704 ms | verified, USD₮0 |
| WETH on Base | 610 ms | verified |

Production latency is not yet measured. It needs a deploy.
