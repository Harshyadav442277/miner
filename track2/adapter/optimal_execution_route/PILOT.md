# OPTIMAL_EXECUTION_ROUTE pilot (2026-11-16)

Pilot only. No training, no holdout freeze beyond the 3 pilot queries, no registration. Verdict at the end.

## Setup

- Intent `OPTIMAL_EXECUTION_ROUTE_GENERAL`, live schema read 2026-11-16 17:52 UTC (`devnode.../engine/v1/intents/...`). Request `pair`, enum
  with ONE allowed value, `ETH/USDC` ("sell exactly 1 ETH for USDC on Ethereum"). Scored `amount_out`, USDC base units, range 1e8 to 1e11.
- 42 miners, 4 owner wallets (from `/api/miners`):
  - `0xbd6f6960...` 22 `route-*` miners: raw third-party API wrappers (LiFi, Kyber, ParaSwap, Bebop, Sushi, Jupiter, DexScreener, GeckoTerminal)
    plus 4 of them behind one host, `omni-chat.13.237.89.59.sslip.io/truth/*`.
  - `0x8b224783...` 18 `zk-*` miners: the champion author (#417). 18 separate Cloudflare Workers under `margyn.workers.dev`, one code family.
  - `0x5c4b38cf...` 1 (`a1-preflight`), `0xb3fb14fe...` 1 (`txlens`).
  - Shared backends: ParaSwap `apiv5.paraswap.io/prices` serves 3 slugs; `li.quest/v1/quote` 2; Kyber ETH `/ethereum/api/v1/routes` 2.
- Queries: `holdout/pilot.json`, frozen at commit "Freeze the 3 OPTIMAL_EXECUTION_ROUTE pilot queries" (sha256 `3e9c7998...`) at 17:52:27 UTC, before any answer.
  Because the enum has one value, the 3 queries are the same request in 3 wordings (`params.pair = ETH/USDC`). They are 3 repeat observations, not 3 cases.
- Capture: `python track2/harness/capture.py ... --out C:/Users/hyada/tg-eval/captures/route-pilot-20261116 --cap 400`, 17:52 to 17:58 UTC,
  176 requests, log `C:/Users/hyada/tg-eval/route-pilot-capture.log`. No `--alias` needed.

## Truth, stated before looking at answers

- Sources (public, keyless, no signup): Velora/ParaSwap `https://api.paraswap.io/prices?srcToken=ETH&destToken=USDC&amount=1e18&network=1&side=SELL`
  and KyberSwap Aggregator `https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0xeee..&tokenOut=0xa0b8..&amountIn=1e18`.
  Terms of service were NOT read: unverified. Used only as read-only reference quotes, 6 samples each, 45 to 60 s apart, log
  `C:/Users/hyada/tg-eval/route-pilot-truth.jsonl`. Reference = the higher of the two at the sample nearest each request.
- Reference moved 1820.66 to 1824.32 USDC over the 5 minutes (0.2%); Velora and Kyber differed by at most 0.06% in a sample.
- Right: within +-1% of the reference. Wrong: more than 3% off, wrong units, wrong pair/direction. Between: dropped (none occurred).
- No-value (my label, not in the brief): a 200 with no `amount_out` (prose, `unavailable`, a list of chains). Call failure: non-200.

## Per-service table (distinct base_url+path; each cell is 3 queries unless noted)

Unit and shape for every right answer: `amount_out` is an integer in USDC base units; ratio to reference 0.9976 to 1.0009.

| Service (host+path) | Slugs | Right | Wrong | Drop | No value | Call fail | Shape |
|---|---|---|---|---|---|---|---|
| preflight-ssl-verification.vercel.app/execution-route | a1-preflight | 3 | 0 | 0 | 0 | 0 | JSON, 767 chars |
| omni-chat.../truth/route-paraswap | route-paraswap-destamount | 3 | 0 | 0 | 0 | 0 | flat JSON, 242 chars |
| omni-chat.../truth/route-kyber | route-kyber-amountout | 3 | 0 | 0 | 0 | 0 | flat JSON, 295 |
| omni-chat.../truth/route-cow | route-cowswap-buyamount | 3 | 0 | 0 | 0 | 0 | flat JSON, 255 |
| omni-chat.../truth/lifi-price | route-lifi-effprice | 3 | 0 | 0 | 0 | 0 | flat JSON, 357 (ratio 0.9976) |
| zk workers `/route`: execroute, routeproof, routeplus, routegrid, routeplan, routepin, routeatom, routebytes, routewide, routeclear, routeflex (11 hosts) | same names | 33 | 0 | 0 | 0 | 0 | rich JSON, 830 to 43,234 chars |
| zk workers `/route`: routeguard, routenative, routehub, routecost, routecheck, routebrief (6 hosts) | same names | 0 | 0 | 0 | 18 | 0 | 200 with `status: unavailable`, RPC failure, 195 to 506 chars |
| zk worker routefine | zk-routefine | 0 | 0 | 0 | 0 | 3 | HTTP 503 |
| telegraph-onchain-tx-lookup-miner.onrender.com/optimal-execution-route | txlens | 0 | 0 | 0 | 3 | 0 | prose advice, no number |
| li.quest/v1/chains, /v1/tools | route-lifi-chains, route-lifi-tools | 0 | 0 | 0 | 6 | 0 | unrelated catalogue (73 KB, 508 KB) |
| api.dexscreener.com/latest/dex/search, api.geckoterminal.com/.../pools | 2 slugs | 0 | 0 | 0 | 6 | 0 | unrelated pair/pool lists |
| li.quest/v1/quote (2 slugs), /v1/connections | 3 slugs | 0 | 0 | 0 | 0 | 9 | 400, required params not filled |
| apiv5.paraswap.io/prices (3 slugs), /tokens/{network}; api.paraswap.io/prices | 5 slugs | 0 | 0 | 0 | 0 | 15 | 400 |
| aggregator-api.kyberswap.com ethereum (2 slugs), bsc | 3 slugs | 0 | 0 | 0 | 0 | 9 | 400 |
| api.bebop.xyz (422), api.sushi.com (422), lite-api.jup.ag (400) | 3 slugs | 0 | 0 | 0 | 0 | 9 | 4xx |

Totals over 126 answers: right 48, wrong 0, dropped 0, no value 33, call failure 45. Rows: `C:/Users/hyada/tg-eval/route-pilot-rows.json`.

The 45 call failures are mostly a harness limit, not evidence about the miners: these `route-*` wrappers declare raw-API parameters
(`inputMint`, `srcToken`, `fromChain`...) that the intent's single `pair` field cannot fill (`missing_required` lists them), and ParaSwap said
"Invalid network" for the value the harness sent. How Telegraph itself calls them is unknown.

## The three bars (estimates; one observation window, 3 repeats)

1. Identity probe above 0.65? Undefined on right/wrong, because there are no wrong answers. If the negatives are the no-value answers
   instead, every service gave the same outcome on all 3 queries, so a probe that predicts by service is right on 81/81 = 1.00. Fails the bar either way.
2. Longer-wins above 0.65? Right answers vs no-value answers, same query: longer-wins picks the right one in 277 of 528 pairs = 0.52.
   Passes, but only on negatives that are not wrong answers.
3. Wrong answers from more than three services? 0 services. At least two services making both right and wrong? 0.
   Services that were both right and non-right: none (every service repeated its outcome 3 of 3).

## Verdict: same identity confound — stop

No wrong answer exists to build a "chosen vs rejected" pair on: every service that returns a number is within 0.25% of the reference, all 48
numeric answers are right. The only negatives are non-answers (unavailable, prose, wrong endpoint, HTTP failure) and they are fixed
per service, so service identity predicts the label. The ETH/USDC enum has one value, so queries cannot add variety.
A real holdout would need either wrong numbers (none in this pool today) or quality ranking among the correct quotes (spread of 0.25% from
different venues and times, which our reference cannot resolve; the reference itself moved 0.2% in 5 minutes).

Reopen only if miners start returning wrong `amount_out` (wrong units, ETH price, stale or wrong-chain quotes), or the intent gains more allowed pairs.

## Unverified

- Reference APIs' terms of use not read. Reference is two aggregators, not an on-chain quoter; 6 samples, matched to answers by nearest time.
- Only 3 same-request queries in one 6-minute window; transient RPC outages on the 6 unavailable workers may clear later.
- `amount_out` extraction is a regex over JSON field names (`amount_out`, `amountOut`, `destAmount`); non-matching shapes were bucketed as no-value.
  The 33 no-value bodies were spot-checked (unavailable status, prose, catalogues), not all read.
- Call-failure causes beyond status codes and the 1 body per service seen. How the engine routes these wrappers is unknown.
- Champion #417 accuracy and prompt rendering on this family not measured.
