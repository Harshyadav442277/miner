# Comparator registrations, release 0.2.0 (prepared 2026-11-19; the owner signs)

**What these are.** The same comparator as every earlier one of ours: a `no_std` port of the network's `ReferenceScore`,
2,182 bytes of arithmetic. It carries a new informational label, `telegraph_comparator 0.2.0 for <FAMILY>`, so the
node accepts the bytes after refusing the 0.1.0 files as duplicates. `go run . pack` with the old label rebuilds
`dist/FX_NOW.wasm` byte for byte, which shows that only the label differs.

**What registering them does.** In these six families the node evaluates comparators on its correctness battery
(1,120–1,262 cases), and the latest passing registration supersedes the active one. On 2026-11-17/19 `0xb3fb…` and then
`0x8b22…` took all six in turn. Ours would become the active comparator until someone registers after us. **Scoring
is identical; this adds no measurement quality.** Say so in the submission, and claim "active" only from `/api/wasm`.

**Evidence:**
- node-runtime check: 234,848 cases each, 0 mismatches, 0 bp
  ([../comparator/dist-v2/verify-2026-11-19.txt](../comparator/dist-v2/verify-2026-11-19.txt));
- hosted bytes re-hashed from the pinned URLs (keccak below);
- runnable tests 17/17;
- preview live check ([live-check-preview-2026-11-19.txt](live-check-preview-2026-11-19.txt)).

**Before signing:**
- check the wallet's MACHINA balance against the bond Anjoman shows; each registration locks one for about 48 h;
- confirm production serves the family: `GET https://livecert-comparator.vercel.app/<FAMILY>/runnable` returns 200.

Register at https://anjoman.ai/dashboard/eval (Evaluators) with `hyadav42774@gmail.com` and wallet
`0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. File base URL:
`https://raw.githubusercontent.com/Harshyadav442277/miner/e834c7cad15e52dfd8b195cedacc921b6dcbeb25/track2/comparator/dist-v2/`

| Family | File | keccak256 | Runnable URL |
|---|---|---|---|
| FX_NOW | `FX_NOW.wasm` | `0x6fd0728e57aa27ff75bc0de29ba15e76a45d321df58f7f528acacb36b9ecfb27` | https://livecert-comparator.vercel.app/FX_NOW/runnable |
| CRYPTO_PRICE | `CRYPTO_PRICE.wasm` | `0xff6ab15821c449b5fc585cb1267fa951febc7a3a78a6fad5c9b010804705be17` | https://livecert-comparator.vercel.app/CRYPTO_PRICE/runnable |
| WEATHER_CHECK | `WEATHER_CHECK.wasm` | `0xc3b5c8777bb1eee583bfc7fcdbfeb3e09d3b3fddc4746b5dfa47dacabe562f88` | https://livecert-comparator.vercel.app/WEATHER_CHECK/runnable |
| CURRENCY_EXCHANGE | `CURRENCY_EXCHANGE.wasm` | `0xb12bbf49ae60624272c59e0abfa1c5eafa824d947c851e94d3b4bdfd9bc75d01` | https://livecert-comparator.vercel.app/CURRENCY_EXCHANGE/runnable |
| SSL_VERIFICATION | `SSL_VERIFICATION.wasm` | `0xfcecb3877835d7581fbacb60ccd8053dde9355d417ccf1b0738d6b9f94e22d72` | https://livecert-comparator.vercel.app/SSL_VERIFICATION/runnable |
| STOCK_PRICE | `STOCK_PRICE.wasm` | `0xd0bb9cb654071da17a1fbc71be01e41643ac5c23fd0fed32afaca35a14a4836d` | https://livecert-comparator.vercel.app/STOCK_PRICE/runnable |
