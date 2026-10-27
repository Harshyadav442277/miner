# G217: TOKEN_HOLDER_COUNT on production, and a second holder-count source (2026-10-27)

Owner, 2026-10-27: "Investigate G217: check what Blockscout returns to Vercel's egress, and propose a second
holder-count source with measured agreement before changing anything." **Nothing in the miner was changed.**

## 1. What Blockscout returns to Vercel

Read from the `receipt` of production answers (`miner-6kvt9zv2p`), 15:24 UTC. The receipt records each upstream
request the function actually made, from Vercel's own egress.

| Chain | Request | Result |
|---|---|---|
| Base | `base.blockscout.com/api/v2/tokens/<USDC>` | **HTTP 403** in 23–46 ms |
| Polygon | `polygon.blockscout.com/api/v2/tokens/<DAI>` | **HTTP 403** in 37 ms |
| Arbitrum | `arbitrum.blockscout.com/api/v2/tokens/<WETH>` | **HTTP 403** in 45 ms |
| Optimism | `optimism.blockscout.com/api/v2/tokens/<USDC>` | 200: 661,506 holders |
| Ethereum, by address | `eth.blockscout.com/api/v2/tokens/<USDC>` | 200: 9,539,060 holders |
| Ethereum, by symbol | GeckoTerminal pool search first | **timed out at 6 s**; the Blockscout search was never sent |

From this machine (India), the same three hosts return 403 with a Cloudflare "Just a moment…" page, and `eth` returns
200. **The block is on the host, not on Vercel's addresses.** A bot challenge is not something to get around.

## 2. Candidates measured

Data: `compare.json` (15:29 UTC, 2.5 s apart) and `compare-pass2.json` (8 s apart), made by `compare.mjs`. The token
set is the 21 verified contracts of `KNOWN_TOKENS` plus UNI, AAVE (Ethereum), OP (Optimism) and ARB (Arbitrum).

| Source | Chains | Agreement | Speed and limits | Terms | Verdict |
|---|---|---|---|---|---|
| **GeckoTerminal** `networks/{net}/tokens/{addr}/info` → `holders.count` | all 5 | Against Ethplorer (Ethereum, n=8): 7 within 0.01%, **WETH +9.1%**. Against Blockscout (n=12: 8 Ethereum, 4 Optimism): **−9.3% to +20.3%**: 9 lower by 2.2–9.3%, OP −0.2%, WETH +8.4% (Ethereum) and +20.3% (Optimism) | **10 calls/min free** (GeckoTerminal's API page). Bimodal: about 0.3–1.9 s, or 9–13 s; one 20 s and one 25 s timeout, one 504, many 429s at 2.5 s spacing. Counts are snapshots, `last_updated` up to ~1 day old | CoinGecko API terms require "Powered by CoinGecko" attribution. Whether they govern the free GeckoTerminal API is not confirmed (G189) | **Not recommended** |
| **Ethplorer** `getTokenInfo?apiKey=freekey` | Ethereum only | Matches GeckoTerminal within 0.01% on 7 of 8, so probably the same underlying index and not an independent check | Fast | Its wiki: "The free API key for development purposes is freekey" | **Ruled out:** development use only |
| **Routescan** | Ethereum | −6.5% to −25.8% against Blockscout, 0 for Optimism USDC (G116, 2026-09-12) | Keyless | Free tier, no sign-up | **Ruled out** already (holders.ts header) |
| **Etherscan V2** | multi-chain | not measured | Needs a key; its holder-count endpoint is on a paid tier, as recalled from earlier notes and not re-read | — | Not measured; the owner's account |
| **Blockscout Pro API** `api.blockscout.com/{chain_id}/api/v2/...` | all 5 | **The same index the miner uses today, so no change in what a count means** | Keyless call: **HTTP 402**, JSON "Proceed with API key or make a X402 payment to continue". Free plan: 5 req/s per key (docs, `devs/apis/requests-and-limits`). Keys from dev.blockscout.com | Free-plan terms not read yet | **Recommended** |

**Indexes count different things.** On Ethereum, Blockscout reads 3–9% above GeckoTerminal and Ethplorer on 7 tokens
and below on WETH. No source here is ground truth. That is why a source that changes the definition of the number
was ranked below one that keeps it.

## 3. Proposal (nothing done yet)

1. **Owner:** create a free Blockscout Pro API key at dev.blockscout.com, read its terms, and put it in
   `track1-miner/miner/.env.local` as `BLOCKSCOUT_API_KEY`. Creating accounts is the owner's step. Claude then
   adds it to Vercel's env without printing it.
2. **Claude, on the owner's yes:**
   - In `holders.ts` and `contractactivity.ts`, read `api.blockscout.com/{chain_id}/api/v2/tokens/{addr}` with the
     key. Keep the per-chain hosts as fallback for Ethereum and Optimism.
   - Check that the key never appears in a receipt. Receipts redact query parameters named like `key`, but a header
     is safer; check how the Pro API takes it.
   - **Agreement check before shipping:** on Ethereum and Optimism the keyed counts must equal the per-chain hosts'
     counts for the same tokens.
   - Then deploy, and measure holder counts on all 5 chains on production.
3. **Small fix, independent of the source:** the outage branch in `holders.ts` returns `verdict: "not_found"` with
   `error: "upstream_unavailable"`. It should be `unknown`, as its own sentence says: an outage "is not the same
   thing" as not found. One line, plus a test.
4. **Cheap win, independent of the source:** `/token-holders` resolves symbols through GeckoTerminal (10 calls/min,
   6 s timeout seen today). Using the verified `KNOWN_TOKENS` table first, as `/token-supply` now does, removes that
   call for the major tokens.
5. **Not proposed:** a GeckoTerminal fallback. Its rate limit, latency and 8–20% WETH disagreement would make answers
   slower and less consistent than an honest "index unavailable".

**If the owner declines a key:** keep Blockscout, ship items 3 and 4, and accept that Base, Arbitrum and Polygon
holder counts answer "index unavailable" while the challenge lasts. TOKEN_HOLDER_COUNT is bought by no mission
(WINNING §6). Dropping it is a candidate for the next `updateMiner`, if the outage persists.
