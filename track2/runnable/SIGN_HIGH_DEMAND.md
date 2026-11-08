# SIGN: six high-demand comparator families

Prepared 2026-11-08, about 19:40 UTC (2026-11-09 01:10 IST), on branch `claude/high-demand-comparators`.
**Nothing here is registered.** The owner signs. Claude does not touch the wallet.

## Before any signature

1. **Production deploy first.** The node calls `wasmRunnableUrl` before it downloads the file. Production
   (`https://livecert-comparator.vercel.app`) still serves only FX_NOW, CRYPTO_PRICE and WEATHER_CHECK. A GET for
   any of the six families below returns `404 unknown family`, checked 2026-11-08 19:35 UTC. The tested preview is
   `https://livecert-comparator-26zsvagif-wukong4.vercel.app`, built from this branch's `track2/runnable`. It is
   behind Vercel Authentication: an anonymous GET returns 302 to vercel.com/sso-api. The owner says yes, and then:
   `cd C:/Users/hyada/tg-deploy/runnable && npx vercel --prod --scope wukong4 --yes`, followed by
   `node <repo>/track2/runnable/live-check.js` with no argument (production). The run must print `ALL OK` for
   all nine families before any signature.
2. **Account and wallet.** Sign in as `hyadav42774@gmail.com` with the LiveCert wallet
   `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. Register through Anjoman Evaluators, or call `registerWasm(keccak256, url,
   family, fee address)` on the Diamond named in https://anjoman.ai/docs. `intent` is the **family (prefix)**,
   not the `_GENERAL` child.
3. **Bond.** The registry shows `bond_amount: 0` for #267 to #269. This was not re-checked for these families.

## Facts that apply to all six (checked 2026-11-08, 19:05 to 19:35 UTC)

- **Class.** The node reports each `<FAMILY>_GENERAL` intent as `"class":"deterministic"`, with one scored
  integer or bool field (`/engine/v1/intents/<FAMILY>_GENERAL`). On chain, `intentKind` returns `1` for all six.
  The chain was read by `eth_call` on `0x3624EB012B5E998BB57B6bE6C9Cfc9c4bc5eb99b` over `ethereum-sepolia-rpc.publicnode.com`.
  **Anomaly:** `getPrefixes()` gives kind `3` (judgment) to all six **prefixes**, and the docs say only judgment
  prefixes have `_GENERAL` children. The docs' class-must-match-prefix rule is stated for Evaluator adapters.
  Every competitor comparator on these prefixes passed registration and stage 1: they are `pending`, not
  rejected. So the registration should not revert. That is inferred, not tested.
- **Ours vs competitors.** Every file, ours and the competitors', gave 0 mismatches against kit
  `ReferenceScore` on the 234,848-case grid. On the new adversarial suites (2,429 cases), every module scored
  every case identically. This is a tie by construction: the rule is fixed, and a comparator cannot beat
  another one. Evidence: `track2/comparator/evaluation/results-high-demand-2026-11-08.txt`.
- **Precedent.** Our FX_NOW #267 replaced the earlier champion #263 at 18:09 UTC. A later comparator that
  passes the gate does become canonical, so registering after the competitors does not by itself lose.
- **The shared blocker.** All seven pending competitors (#76, #101, #107, #111, #114, #116, #120) have been
  `awaiting_compatible_material` since 2026-11-03. Each has the same reason, `no public material to ask <FAMILY>'s runnable
  URL about yet: eval-pool: no published snapshot`, last updated 2026-11-08 19:09 UTC
  (`/engine/validator/v1/wasm/<id>`). `/api/evalpool/status?intent_id=<FAMILY>` (the prefix) has no snapshot.
  The `_GENERAL` child does have one. For FX_NOW, the prefix also has no snapshot, and the passing children
  (FX_NOW_EUR) hold 10 eligible submitters. **Why CORPORATE and LIQUIDITY are still blocked with 5 eligible
  submitters on their children is unknown.** Ours would sit in the same queue.
- **Truth 0 is never scored.** The node runtime refuses a ground truth of 0
  (`../comparator/evaluation/README.md`, truth-0 refusal). This matters below for CORPORATE, where `false = 0`,
  and for REGULATORY, where `filing_count = 0`.

---

## 1. REGULATORY_FILING_MONITOR (540 of 5,000 requests)

- **Family:** `REGULATORY_FILING_MONITOR`. Child `REGULATORY_FILING_MONITOR_GENERAL`, scored field `filing_count`
  (0 dp, range 0 to 1e8).
- **File URL:** https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/REGULATORY_FILING_MONITOR.wasm
- **keccak256:** `0x99d21ca63338375e236bd25e81a52070506447d266ed2c6b3c9a61893a9ff35e` (2,306 B; sha256
  `5506d7f0f3b168d1ea45a5ab7ca43457264d9eb43403d505936a0cadd824c97e`)
- **Fee address:** `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`
- **Runnable URL (after the prod deploy):** https://livecert-comparator.vercel.app/REGULATORY_FILING_MONITOR/runnable
- **Competitors:** #120 by `0xb3fb14fecac09efbd0c74fc07d50d7ed1eef2b53`, pending. Its keccak `0x68fe68f8…4c4877`
  equals the registry value, and it scores identically to ours. #88 by `0x8b2247…` is deregistered.
- **Pool:** 2 eligible contributors, 54 rows, on `_GENERAL`. Snapshot published 2026-11-07.
- **Honest note:** it waits for material. Highest demand, but the fewest contributors, and the blocker above
  applies. The node now scores this intent with the GENERIC judgment fallback (`/api/wasm?resolve=`). A "no
  filings" truth (0) can never be scored.

## 2. CORPORATE_REGISTRY_LOOKUP (298)

- **Family:** `CORPORATE_REGISTRY_LOOKUP`. Child `CORPORATE_REGISTRY_LOOKUP_GENERAL`, scored field `active` (bool, read as
  0 or 1).
- **File URL:** https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/CORPORATE_REGISTRY_LOOKUP.wasm
- **keccak256:** `0x1ab0d329db3ad549f1ec5c9c064bd9184d45765eb68512b23594671d10fcd652` (2,306 B; sha256
  `86ff887bc600975c2be5e6687dc6ca2dac3caf954bfe8d4535f5dacc9d0b4088`)
- **Fee address:** `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`
- **Runnable URL (after the prod deploy):** https://livecert-comparator.vercel.app/CORPORATE_REGISTRY_LOOKUP/runnable
- **Competitors:** #101 by `0xb3fb14fe…2b53`, pending, hash verified, identical scores. #67 by `0x8b2247…` is deregistered.
- **Pool:** 5 eligible contributors, 961 rows, on `_GENERAL`. Snapshot published 2026-11-05. `resolve` already
  says `scorer: comparator`.
- **Honest note:** this is the likeliest of the six to be scored soon, yet #101 is still blocked with the "no
  published snapshot" reason. Also, the bool encodes `false` as 0, which the runtime refuses, so only "active"
  answers can be scored.

## 3. LIQUIDITY_DEPTH_VERIFY (139)

- **Family:** `LIQUIDITY_DEPTH_VERIFY`. Child `LIQUIDITY_DEPTH_VERIFY_GENERAL`, scored field `liquidity_usd` (6 dp,
  $1 to $1e12). The kit prefix spec is RelTol 300 bps.
- **File URL:** https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/LIQUIDITY_DEPTH_VERIFY.wasm
- **keccak256:** `0x3d1b423ccabb5dbddf2907ffdd6495993acb4e40971751ac6e8fa3ad644b65d2` (2,303 B; sha256
  `65bdefda4bc80ef2728c9f7556789750a97ef88b20e2ebb7a9231bc43c3d1ee5`)
- **Fee address:** `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`
- **Runnable URL (after the prod deploy):** https://livecert-comparator.vercel.app/LIQUIDITY_DEPTH_VERIFY/runnable
- **Competitors:** #114 by `0xb3fb14fe…2b53`, pending, hash verified, identical scores. #78 by `0x8b2247…` is deregistered.
- **Pool:** 5 eligible contributors, 375 rows. Snapshot published 2026-11-05. `resolve` says `scorer: comparator`.
- **Honest note:** same as CORPORATE. Its material is sufficient on paper, but #114 is still blocked, for a
  reason that is not explained.

## 4. GRID_POWER_PRICE (122)

- **Family:** `GRID_POWER_PRICE`. Child `GRID_POWER_PRICE_GENERAL`, scored field `lmp_usd_per_mwh` (6 dp, −2000 to
  20000). The kit prefix spec is RelTol 30 bps.
- **File URL:** https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/GRID_POWER_PRICE.wasm
- **keccak256:** `0xcc7a1ec6fe7162bbaa1d2e3f422d2503da5e685b8b46f5be50bf2f580206795d` (2,297 B; sha256
  `a5aa5d7dc954883e9c2215f3479ff91884758a65624ef579837328c9e910e2ac`)
- **Fee address:** `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`
- **Runnable URL (after the prod deploy):** https://livecert-comparator.vercel.app/GRID_POWER_PRICE/runnable
- **Competitors:** two pending, both hash verified, both scoring identically: #111 by `0xb3fb14fe…2b53` and #76 by
  `0x8b224783fe5b3c52b7db0cb9b1754f8812b75287`. That second address authored the FX/CRYPTO/WEATHER champions that we replaced.
- **Pool:** 2 eligible contributors, 162 rows. Scored now by the GENERIC judgment fallback.
- **Honest note:** waits for material.

## 5. MINING_HASHPRICE_VERIFY (85)

- **Family:** `MINING_HASHPRICE_VERIFY`. Child `MINING_HASHPRICE_VERIFY_GENERAL`, scored field
  `hashprice_sats_per_ph_day` (6 dp, 1 to 1e9). The kit prefix spec is RelTol 400 bps.
- **File URL:** https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/MINING_HASHPRICE_VERIFY.wasm
- **keccak256:** `0x7519e81a734ca85fba736ce2df47621b70f5fb07349541efd16a67b73303e5aa` (2,304 B; sha256
  `9b816e49609a9eb23a7b0793ccb4d71564a697e70654bc86a1e21f2b8011d0da`)
- **Fee address:** `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`
- **Runnable URL (after the prod deploy):** https://livecert-comparator.vercel.app/MINING_HASHPRICE_VERIFY/runnable
- **Competitors:** #116 by `0xb3fb14fe…2b53`, pending, hash verified, identical scores. #82 by `0x8b2247…` is deregistered.
- **Pool:** 3 eligible contributors, 426 rows; 57 rows are quarantined as rate_limited. Scored now by the GENERIC fallback.
- **Honest note:** waits for material.

## 6. FINANCIAL_DATA (65)

- **Family:** `FINANCIAL_DATA`. Child `FINANCIAL_DATA_GENERAL`, scored field `market_cap_usd` (6 dp, 0 to 1e15).
- **File URL:** https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/FINANCIAL_DATA.wasm
- **keccak256:** `0x4c073c921a55721b4e8b706a7445e0545a2146adc2b3d8f84e29591c4d478f18` (2,295 B; sha256
  `dc502271f195e3d3d046ad229fb002f99d67c563638fc3a8f412dbe46a8ef395`)
- **Fee address:** `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`
- **Runnable URL (after the prod deploy):** https://livecert-comparator.vercel.app/FINANCIAL_DATA/runnable
- **Competitors:** #107 by `0xb3fb14fe…2b53`, pending, hash verified, identical scores. #73 by `0x8b2247…` is deregistered.
- **Pool:** 3 eligible contributors, 201 rows. The brief counted 2; it is 3 as of 19:3x UTC. Scored now by the
  GENERIC fallback.
- **Honest note:** waits for material. At 6 dp, a market cap above about $9.22 trillion does not fit in an i64.
  Separately, our own miner's `/financial` endpoint refuses market data, so LiveCert does not answer this scored field.

---

## Material gap (fewer than 5 contributors: REGULATORY 2, GRID 2, MINING 3, FINANCIAL 3)

- **We have no truth-source YAMLs for any of the six.** The only YAML in the repo naming these intents is the
  miner's own `track1-miner/miner.yaml` (`/financial`). Uploading our miner as a truth source would make
  LiveCert the reference it is itself scored against, so that is not legitimate.
- **The 5-contributor minimum is for questions, not truth sources.** Per
  https://anjoman.ai/docs/scoring/contribute-evaluation-data, "Truth sources have no such minimum: one is
  enough for an intent to be scored." A truth source must be a public, no-key API, written as a miner-YAML
  document. It is uploaded as `{"label_kind":"truth_source","source":"<yaml>"}` under the `_GENERAL` intent,
  signed `Telegraph eval-pool submission v1` (EIP-191) by the owner, the same way as
  `../material/README.md`. One honest contributor only: never extra wallets.
- **Candidate sources (not prepared, because the licence or the parsing is not clear):**
  - REGULATORY: SEC EDGAR. US government data, but SEC asks for a contact User-Agent, and "count of matching
    filings for an entity and period" needs a counting query that a generic YAML may not express.
  - GRID: CAISO OASIS `PRC_LMP`. It returns zipped CSV/XML, which the node's response parser probably cannot
    read, and the OASIS reuse terms were not checked.
  - MINING: hashprice is computed (reward times price over hashrate). No single public no-key endpoint was
    found that returns it.
  - FINANCIAL: market cap. The free sources (CoinGecko and similar) do not license resale. Our own YAML already
    says so.
  - **No files were prepared and nothing was uploaded.**
