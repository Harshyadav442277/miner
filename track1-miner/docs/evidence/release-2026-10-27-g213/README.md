# Release 2026-10-27: the token table (G213), Polygon symbol fix, KEV receipt note

- **Build:** `4af4ebd` on `codex/rank1-14-intents`. Not pushed. The miner code changes since the last release are:
  - `11f6306`: `KNOWN_TOKENS`, 21 verified contracts (`../g213-token-table-2026-10-27/`), and `poolTokenAddress`,
    which fixes Polygon symbol resolution in `/token-supply` and `/token-holders`;
  - `2cb4049`: `/vuln-triage` receipts name a KEV catalog held in memory (`status: null`, `result: "held in memory,
    read …"`).

  The other commits in the range touch tools and docs only.
- **Deployed from:** `C:\Users\hyada\tg-deploy\m4af4ebd`, a clean worktree holding only the `.vercel` link.
- **Preview:** `miner-1wt73oje6` (`preview-probes.txt`).
  - Polygon USDC resolves to Circle's contract; it was refused as `ambiguous` before.
  - USDT on Arbitrum reports `USD₮0`.
  - A wallet address answers `not_a_token`.
  - The second triage call names KEV as held in memory.
  - DNS and SSL are unchanged.
  - One UNI question failed once. On retry, UNI, LINK and AAVE (GeckoTerminal path) each verified twice. The same
    question verified on production and locally, so the failure was transient, not this build.
- **Production:** `miner-6kvt9zv2p` (`dpl_7sWbxycAgdTLPWFuL98x5hvs5NRH`), 2026-10-27 ~14:39 UTC, aliased to
  `miner-wine.vercel.app`. `vercel promote` answered 409, "already the current production deployment".
- **Rollback target:** `miner-9ozpb4kgh` (`dpl_DMXDNajvofboz6X8Du1zfQBu7N2T`, `4d74076`).
- **Registration 4829 is unchanged.**

## Gates on production (`preflight.txt`)

| Gate | Result | Note |
|---|---|---|
| unit + live suite | PASS | Preflight prints detail only for failing gates |
| verify-deploy | PASS | |
| param shapes | PASS | |
| intent answers | 39/40 | The known IP Tokyo pin. TOKEN_TOTAL_SUPPLY_VERIFY passes |
| hostile inputs | PASS | |
| upstream health | 2 FAIL | Both known: the ip-api primary, and the merkle RPC answering 429 |
| no-regression | PASS, 8 identical | |
| watch.mjs, registration 4829 | `endpoint=ok activation=active` | 14:46:02 UTC (`watch.txt`) |

This is the same baseline as the 2026-10-26 releases.

## Token-supply latency on production

Data: `latency-run{1,2,3}.{txt,json}`, from 14:46 UTC. Fresh questions; the /health round trip (235–244 ms) is
subtracted. The tool prints "within N/3" with a fixed denominator; each run asked 4 questions.

| Path | Questions | Miner time, ms | Within 500 ms |
|---|---|---|---|
| Symbol in the table | WBTC eth, DAI op, USDT polygon, WETH arb, USDC base, USDT eth, DAI base, WETH op | 122, 277, 164, 149, 101, 222, 83, 263 | **8/8** |
| Contract address | DAI eth, WETH arb | 137, 162 | 2/2 |
| Symbol not in the table (GeckoTerminal) | CRV, MKR | 731, 657 | 0/2 |

Before (2026-10-26, symbol path): 437, 867, 3055 and 1207 ms, 1/4 within target.

## Found during the probes, not caused by this release

**TOKEN_HOLDER_COUNT fails on production (GAPS G217).** Current production answered `not_found`, "the block explorer
index … did not answer", for USDC on Base and DAI on Polygon. It was the same before this deploy.
`intent-answers.mjs` has graded holder counts "for honesty only" while Blockscout sheds. Blockscout's Base,
Arbitrum and Polygon hosts served a Cloudflare challenge to this machine on 2026-10-27.
