# Season II Track 2: publish commands and sign list

Prepared 2026-10-22. **Nothing in this file has been run.**

> **HOLD (2026-10-22 ~08:30 UTC): do not run step 1 and do not sign row 1.**
>
> The adapter package `0xe54abbfe…` scores 81.0% as the node runs it, not 96.9% (G32). It is being retrained in
> the node's architecture. The release branch and row 1 will be rebuilt, with a new commit and new hashes.
> Rows 2–32 are unaffected, but the release commit they are pinned to will change too.

- The push and release in step 1 are public.
- Every `registerWasm` in step 4 is a transaction from the operator's wallet.
- Claude prepares and checks. The operator runs and signs.

## 0. Preconditions (check first, in order)

1. **Devnode has switched to the Season II evaluator.** This must return JSON, not `404 page not found`:
   ```bash
   curl -4 -s "https://devnode.telegraphprotocol.com/api/evalpool/status?intent_id=LLM_OUTPUT_EVALUATION"
   ```
   At 2026-10-22 07:45 UTC it was still 404. Until it answers, any registration is judged by the Season I gate and
   rejected.
2. **The packaged adapter check has passed.** `verify_wide` must print `PASS`. See [GAPS.md](GAPS.md) G31.4.
3. **The fee address is chosen.** It is where MACHINA earnings go, and it can be a cold wallet. The default below is
   the Track 2 wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. Replace it if you want a different payout
   address.

## 1. Publish

The release clone is at `C:\Users\hyada\tg-eval\factscore`, on branch `season2-evaluators`, commit
`421e07153462848b89f31abd8ad27aa817c48542`, which adds 53 files under `season2/`. `main` is not touched.

```bash
cd /c/Users/hyada/tg-eval/factscore
git push -u origin season2-evaluators
```

```bash
gh release create s2-evaluators-v1 -R Harshyadav442277/telegraph-factscore --target 421e07153462848b89f31abd8ad27aa817c48542 --title "Season II evaluators v1" --notes "LLM_OUTPUT_EVALUATION adapter package (1,205,363,765 bytes, keccak256 0xe54abbfed8c9f20f89c836a1e9a628978537eb7cac06041eac748f45b067ed89). Comparators and sources: season2/ on branch season2-evaluators." /c/Users/hyada/tg-eval/runs/LLM_OUTPUT_EVALUATION/LLM_OUTPUT_EVALUATION.wasm /c/Users/hyada/tg-eval/runs/LLM_OUTPUT_EVALUATION/LLM_OUTPUT_EVALUATION.wasm.manifest.json
```

The comparator URLs below are pinned to the commit, so they work as soon as the branch is pushed.

## 2. Hash the hosted bytes, not the local copies

```bash
/c/Users/hyada/tg-eval/cmptool.exe hash https://github.com/Harshyadav442277/telegraph-factscore/releases/download/s2-evaluators-v1/LLM_OUTPUT_EVALUATION.wasm
```

```bash
/c/Users/hyada/tg-eval/cmptool.exe hash $(grep -o 'https://raw[^ |]*' "/c/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/.claude/worktrees/wasm-track-2-quality-e21db3/track2/SIGN_S2.md")
```

Every printed hash must equal the table's. Stop at the first mismatch.

- A release-asset URL redirects to GitHub's storage. Whether the node follows that redirect has not been checked.
- If it does not, host the package on the Hugging Face Hub instead and re-run this step.

## 3. The call

`registerWasm(bytes32 wasmHash, string wasmUrl, string intent, address feeAddress)` on the Diamond
`0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8`, on Base Sepolia (chain 84532).

With Foundry, which is not installed on this machine:

```bash
cast send 0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8 "registerWasm(bytes32,string,string,address)(uint256)" <keccak256> <url> <INTENT> 0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e --rpc-url "$RPC" --private-key "$AUTHOR_KEY"
```

The other route is integrate.telegraphprotocol.com. Paste the URL and the intent there, and check that the hash it
shows matches the table.

After each transaction, record the `registrationId` and poll
`https://devnode.telegraphprotocol.com/engine/validator/v1/wasm/<id>`.

## 4. Sign list, in order

| # | intent | kind | keccak256 | URL |
|---|---|---|---|---|
| 1 | `LLM_OUTPUT_EVALUATION` | adapter (judgment) | `0xe54abbfed8c9f20f89c836a1e9a628978537eb7cac06041eac748f45b067ed89` | https://github.com/Harshyadav442277/telegraph-factscore/releases/download/s2-evaluators-v1/LLM_OUTPUT_EVALUATION.wasm |
| 2 | `FX_NOW` | comparator, kit-wired | `0xa92fd5769698ee985f3c505dae116e7341363d6eefdbc02c55079fd38e5813ca` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/FX_NOW.wasm |
| 3 | `ROUTE_ETA` | comparator, kit-wired | `0xcf88885efe3c55c3dd587baa8280b2c659eae2116e05f355963f9ebfaa5e5eb4` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/ROUTE_ETA.wasm |
| 4 | `MACRO_ECONOMIC_INDICATOR` | comparator, kit-wired | `0xe4be81e2ee8c7cf34f65aa398dc79c2a0b2a058c8eb31aab9f22bc299da87fff` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/MACRO_ECONOMIC_INDICATOR.wasm |
| 5 | `LIQUIDITY_DEPTH_VERIFY` | comparator, kit-wired | `0x3d1b423ccabb5dbddf2907ffdd6495993acb4e40971751ac6e8fa3ad644b65d2` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/LIQUIDITY_DEPTH_VERIFY.wasm |
| 6 | `MINING_HASHPRICE_VERIFY` | comparator, kit-wired | `0x7519e81a734ca85fba736ce2df47621b70f5fb07349541efd16a67b73303e5aa` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/MINING_HASHPRICE_VERIFY.wasm |
| 7 | `GRID_POWER_PRICE` | comparator, kit-wired | `0xcc7a1ec6fe7162bbaa1d2e3f422d2503da5e685b8b46f5be50bf2f580206795d` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/GRID_POWER_PRICE.wasm |
| 8 | `LIVE_SHELF_PRICE` | comparator, kit-wired | `0x62af97690e067532735a789fc8087d5e38cbdd95cd5db0f4bb508f8a3f725056` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/LIVE_SHELF_PRICE.wasm |
| 9 | `ONCHAIN_METRIC_VERIFY` | comparator, kit-wired | `0x2e299e2a244a67bfd7499cee973c3852c43b5ff43a5e6279632c7bf296081042` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/ONCHAIN_METRIC_VERIFY.wasm |
| 10 | `ASSET_RESERVE_ATTESTATION` | comparator, kit-wired | `0x393ef113afa8f8fd67f35733eff18ef3634907df25b8d2ec48f1cb54f1e598cf` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/ASSET_RESERVE_ATTESTATION.wasm |
| 11 | `WEATHER_FORECAST_VERIFY` | comparator, docs-only | `0x2adcce6e823f04ecf909e57a2334ba1ef0701735c25965603e676a2a1813a2ba` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/WEATHER_FORECAST_VERIFY.wasm |
| 12 | `SENSOR_TELEMETRY_VERIFY` | comparator, docs-only | `0xf8b68e458fa5c0fabbbec5c4c8942cf7128e5c7068f09ad06604eef0a07db3db` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/SENSOR_TELEMETRY_VERIFY.wasm |
| 13 | `CORPORATE_REGISTRY_LOOKUP` | comparator, docs-only | `0x1ab0d329db3ad549f1ec5c9c064bd9184d45765eb68512b23594671d10fcd652` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/CORPORATE_REGISTRY_LOOKUP.wasm |
| 14 | `REGULATORY_FILING_MONITOR` | comparator, docs-only | `0x99d21ca63338375e236bd25e81a52070506447d266ed2c6b3c9a61893a9ff35e` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/REGULATORY_FILING_MONITOR.wasm |
| 15 | `VESSEL_TELEMETRY_VERIFY` | comparator, docs-only | `0xc5da88a06406dfc3b4e0cf5c5dfac1a6bbb2344a3494ede30c87dcce4c4edee0` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/VESSEL_TELEMETRY_VERIFY.wasm |
| 16 | `CRYPTO_PRICE` | comparator, docs-only | `0x30dd31e3d35f287eaa7ba0db5656a0b067ab62d1eb5d24308a5ce813200cd9a3` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/CRYPTO_PRICE.wasm |
| 17 | `FINANCIAL_DATA` | comparator, docs-only | `0x4c073c921a55721b4e8b706a7445e0545a2146adc2b3d8f84e29591c4d478f18` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/FINANCIAL_DATA.wasm |
| 18 | `WEATHER_CHECK` | comparator, docs-only | `0xecc319e96f8b34f89e6e22d0b94632097d7d8a19e7567c36b67f865d50dfe535` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/WEATHER_CHECK.wasm |
| 19 | `DATACENTER_TELEMETRY_VERIFY` | comparator, docs-only | `0x4a14a80bee113ee32cc425fd18ccea9dc2320751bea756486a2b87ccc75039ab` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/DATACENTER_TELEMETRY_VERIFY.wasm |
| 20 | `CROSS_CHAIN_STATE_VERIFY` | comparator, docs-only | `0x17a38f173197ba445fe0231139501e712f38634496824e630ab1e3e100276c1a` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/CROSS_CHAIN_STATE_VERIFY.wasm |
| 21 | `PACKAGE_STATUS` | comparator, docs-only | `0x4fa0860631687803e5601150f742daa97a405ed42c06471e25be1618efa572bb` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/PACKAGE_STATUS.wasm |
| 22 | `TRAVEL_DISRUPTION` | comparator, docs-only | `0x7476c01abb3266e682a092d3782dbb7c3d34649881ea1c0665a3314be6ea590a` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/TRAVEL_DISRUPTION.wasm |
| 23 | `SKU_IN_STOCK` | comparator, docs-only | `0x46c7dd092ada2078b692b2e52c203625762a78b28d4b4d91c0586124cb5d0482` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/SKU_IN_STOCK.wasm |
| 24 | `CODE_PATCH_VERIFY` | comparator, docs-only | `0x9d3b92d88877116bb62f9e2694026a3979c879aab00c3efde0b0b5402f50fa49` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/CODE_PATCH_VERIFY.wasm |
| 25 | `SLA_COMPLIANCE` | comparator, docs-only | `0xf7e64ca0a242b4449b4a29f733f4398d69de22d2538fb8769ff36c728004feac` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/SLA_COMPLIANCE.wasm |
| 26 | `GAS_PRICE` | comparator, docs-only | `0x9693f0d5d77ed30c7a631b0f1b0b96ba458cc2cb1d14f7097e6599aa0a375a70` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/GAS_PRICE.wasm |
| 27 | `STOCK_PRICE` | comparator, docs-only | `0x72fb6fbcc36931e3920b789978f270a7728a23e66ba5d8871602116f5ff23abb` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/STOCK_PRICE.wasm |
| 28 | `CARRIER_SERVICEABILITY` | comparator, docs-only | `0xaf3dd3ad3c6c98c42f9ed38e4061c0d89ce64dc6efbf608a61a8d9e03229cc21` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/CARRIER_SERVICEABILITY.wasm |
| 29 | `REGRESSION_VERIFY` | comparator, docs-only | `0xae44274cdffd6f570a3fe7f953e4ed7af2fa99418eeccab81932f9c187454a06` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/REGRESSION_VERIFY.wasm |
| 30 | `WAREHOUSE_INVENTORY` | comparator, docs-only | `0x99b7f37c3d3f69c355827644112588d9b7e1c2e15998438d86edc68419a312fb` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/WAREHOUSE_INVENTORY.wasm |
| 31 | `VALIDATOR_PERFORMANCE_VERIFY` | comparator, docs-only | `0x976792ca449bdd4e01a3f4c872c2057066d4b985556beb98978b20e8ece41f3a` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/VALIDATOR_PERFORMANCE_VERIFY.wasm |
| 32 | `COMMERCE_PURCHASE_VERIFY` | comparator, docs-only | `0x3bfbf8fe9aeb45413435a83c4e95cec39d26d05a7e7851b4b28479349ae1eaf1` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/421e07153462848b89f31abd8ad27aa817c48542/season2/comparator/dist/COMMERCE_PURCHASE_VERIFY.wasm |

**Why this order:**

- Row 1 first: in a round, ties go to the lower registration ID, and an adapter that is waiting for material is not
  charged an attempt.
- Rows 2–10 next: the kit itself wires these intents to the comparator path.
- Rows 11–32 last: these intents are deterministic only in the docs. A rejection there costs gas only, and the
  first one tells you whether to stop (G30).

**Overlap to disclose:** our miner serves 9 of these intents (rows 4, 13, 14, 16, 17, 18, 20, 26, 27). The release
README says so.
