# Season II Track 2: publish commands and sign list

## V2, 2026-11-01: register the FX_NOW comparator — READY (owner: 5 MACHINA from the faucet, then publish)

FX_NOW is the only deterministic family without a champion at 18:22 UTC. The other five are taken:
WEATHER_CHECK #45 (0xfec66e…), and CRYPTO_PRICE #47, CURRENCY_EXCHANGE #48, STOCK_PRICE #49 and SSL_VERIFICATION
#50, all by 0xd4c73e99… between 16:08 and 16:14 UTC. A comparator passes the node's exact-match gate (#45: 1,120
cases, 0 mismatches) with no pool pairs and no training.

| | |
|---|---|
| File | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/FX_NOW.wasm`: HTTP 200, 0 redirects, sha256 `7aa1397d…80cc` |
| keccak256 | `0xa92fd5769698ee985f3c505dae116e7341363d6eefdbc02c55079fd38e5813ca` (computed from the download; equals `dist/manifest.json`) |
| Family / Fee | `FX_NOW` / `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Runnable URL | `https://livecert-comparator.vercel.app/FX_NOW/runnable` (Vercel production, commit 9483970). `node live-check.js`: 600/600 equal to the local scorer, slowest batch 467 ms; it serves the same sha256 |
| Correctness | an exact port of `ReferenceScore`: 234,848 cases, 0 mismatches (2026-10-22). `reference.go` has no diff from the pinned kit `992f2650` to kit main `1ed063e`. `node --test runnable/test`: 7/7, FX_NOW exact twice |
| Bond | 4.477 MACHINA (`entityBonds`, 18:24 UTC). Wallet 0.165 MACHINA; the allowance left from #46 is 5.165 |
| Dry run | `registerWasm` reverts `ERC20InsufficientBalance(wallet, 0.165, 4.477)`: funding is the only blocker |

**18:38 UTC:** the owner deregistered #46 and claimed contribution rewards (nonce 6). The wallet holds 3.547 MACHINA,
**0.93 short** of the 4.477 bond. `releasedMinerBond` shows 4.835 MACHINA, locked until 2026-11-03 18:36:48 UTC
(48 h). The faucet was already claimed today and reopens around 08:05 UTC on 2026-11-02. A fork test showed that
minting 6 test USDC and swapping it at the 0.3% pool (SwapRouter02 `0x3bFA…e48E`) gives 5.479 MACHINA, after which
the register call simulates as id 51.

**Steps (owner):** 1. Fund ≥ 0.93 MACHINA more (faucet or USDC swap). 2. Anjoman → Evaluators: paste the file URL, Verify & hash
(must show the keccak above), Family `FX_NOW`, the fee address, and the runnable URL; Publish; sign in MetaMask.

## Sanctions only — no ready-to-sign adapter (2026-11-01; Nov 2 IST)

**Do not reuse the historical v3 table or tunnel below.** Real-answer v3/v4/v5 scores are
90.625% / 37.5% / 75%, but the longer-answer baseline is 100%. Only 8 listed names and no
negative pairs contribute; G41 explains why these results do not establish readiness.
V6 completed its longer-answer pilot: kit 90.18% on synthetic test pairs, but node
runtime 68.75% on the initial set and 79.17% on the fresh set. Fresh v3 scores 83.33%;
the length baseline remains 100%, only 6 names contribute and there are no negative
pairs. None is ready to sign. The v6 package is hosted solely for reproduction.
Separate wrong-query controls score 16/20; only 3/4 in our own LiveCert format pass.
That synthetic relevance failure also remains open; it is not an actual miner error.

Only after a new independent set supports ≥80% with a defensible margin and passes
source/length/coverage checks: host and re-download exact bytes, verify live class and
Stage 1, start fresh identical executors/tunnel, check identity/root/bits through the
tunnel, then make the **read-only** `cast call` from the owner's address. Prepare the
five exact Anjoman fields only then. The owner signs; the agent never connects a wallet,
signs, sends or uses keys. No sanctions tunnel or conditional dry run was performed here.

The separate session's FX_NOW flow above remains separate. Commit `33b692a` records
owner deregistration of #46; its bond/unlock notes supersede the older pending action.
No new wallet action occurred in this sanctions measurement run.

## V2, 2026-11-01: SANCTIONS_SCREENING_MATCH v3 — historical rejection #46 (7/15); owner deregistered per 33b692a

**Result, 16:25:59 UTC:** rejected at the remote check, 7 of 15 public pairs (46.7%), GAPS G40. Executors, tunnel and
signing page stopped at 16:27 UTC. **Owner:** Anjoman → My registrations → Evaluation WASMs → #46 → Deregister
(`deregisterEntity(46, wasm)`), then withdraw the released bond when it unlocks. Bounty #78: not claimable.

**Signed by the owner in MetaMask, 2026-11-01 (UTC):** approve 10 MACHINA `0x50a728ee…74f6` (block 12041801) and a
redundant second approve `0x77a10bde…2218` (12041802); `registerWasm` `0x89c9c25d…886c`, block 12041861, 15:20:40 UTC,
status 1. Logs: registration id **46** (0x2e), bond 4.835 MACHINA pulled (entityBonds fell from 5.132 at 14:40 to
4.841 at 15:09, so the claim was not needed), keccak `0x49de4107…f2f0` in the event. No MACHINA claimed; wallet
holds 0.165 MACHINA after the bond. `/api/wasm/46` returned "not found" at 15:21 UTC (not yet indexed).
**Owner, 2026-11-01:** claim GitHub bounty telegraphprotocol/bounties#78 (SANCTIONS_SCREENING_MATCH, unfunded)
with `/claim` + `/submit` + registration id 46 **only after #46 is canonical**. Anjoman's Evaluators page takes the
same five fields (runnable URL included): use it for the next registration instead of a local signing page.

Owner, 2026-11-01: "Automate everything … only call me to sign." **Prepared and checked by Claude; nothing signed or
sent.** No champion for the family at 13:28 UTC; `0x3035…`'s registration 31 failed the public check at 9/15.

| | |
|---|---|
| Package | v3, `SANCTIONS_SCREENING_MATCH.safetensors`, 6,776,916 B, sha256 `547a3f05…b3e6` |
| keccak256 | `0x49de41078f6bb39ab183a715263c648543945565b4ce97c9a9214de59b09f2f0` |
| Hosted at | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/1e4733c15875c5bf2eba86ea881cb9094c748f6a/season2/adapter/SANCTIONS_SCREENING_MATCH/SANCTIONS_SCREENING_MATCH.safetensors`: downloaded, sha256 equal; `adapterexec` loads it as keccak `0x49de4107…f2f0` |
| Measured | held-out 200 pairs 93.0% (inflated by a name-shape cue, G40); out-of-template probe 72.5% on 80 pairs. **The public check needs 11/15: at a true 72.5% that is roughly a coin flip** |
| Runnable URL | `https://medicaid-lat-maria-janet.trycloudflare.com/` → `fanout_exec.py` :8090 (now retries a dead worker's chunk; logs batch size and timing only) → 3 `adapterexec` on the hosted bytes. `check_executor.py` PASS through the tunnel, bits equal to loopback and to adapterbuild (`0x3e96ccda`); worst case 30 × 256 tokens 62.2 s while v5 trained on the GPU |
| Bond | `entityBonds()` 14:40 UTC: 5.132 MACHINA. Wallet: 0.4025 ETH, **5.0 MACHINA: claim first** |
| Dry run | `registerWasm` from the wallet reverts `ERC20InsufficientAllowance(diamond, 0, 5.132e18)`, as expected before the approval; calldata decoded back to the values above |

**Steps (owner, MetaMask):** 1. Anjoman → Activity → Claim all. 2. Open `http://127.0.0.1:8095/` in the browser
with MetaMask (served from `tg-eval\hosted\sanctions_v3\sign\`), Connect, Approve 10 MACHINA, Register. Claude then
follows `/api/wasm` for the registration id to `canonical` or a rejection. The laptop stays awake and online until then.

## V2, 2026-11-01: register the EVENT_OUTCOME_RESOLUTION adapter — SUPERSEDED (race lost to registration 39)

Owner's yes to "set it up" (hosting and tunnel), 2026-11-01. **Prepared and checked by Claude; nothing signed or
sent.** Transactions are the owner's, on Ethereum Sepolia.

**Why:** EVENT_OUTCOME_RESOLUTION is a judgment intent with 5 pool contributors and no canonical adapter (29 miners,
LiveCert among them, are unranked in it). The first adapter at ≥ 70% becomes canonical. **Risk (GAPS G38):** the
adapter is 100% on structural failures and at chance on factual flips; if the hidden pool is mostly factual flips it
fails the 15-pair public check, which costs gas and leaves the bond to be released by deregistering.

| | |
|---|---|
| Package | `EVENT_OUTCOME_RESOLUTION.safetensors`, 6,776,916 B, sha256 `8f0de689…90ed` |
| keccak256 | `0xc23ad1c6268d27f1a33de975c39b547844fef14e95868b5158f3e020e5b5e9e0` |
| Hosted at | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/1d455d46d931436eec260b3cb405431fdb80d71b/season2/adapter/EVENT_OUTCOME_RESOLUTION/EVENT_OUTCOME_RESOLUTION.safetensors`: HTTP 200, 0 redirects, 4.2 s, re-hashed equal (branch `season2-adapters-v2`) |
| Checks | Stage 1 + foundation load (kit `1ed063e` with the live class, `adapter/live_class/`); class `judgment` from `/engine/v1/intents/EVENT_OUTCOME_RESOLUTION_GENERAL` |
| Executor | kit `adapterexec` on this laptop, serving the downloaded hosted bytes on 127.0.0.1:8081; `adapter/check_executor.py`: PASS (identity echo, deterministic bits `0x401da773`, equal to adapterbuild's) |
| Runnable URL | `https://favourite-prohibited-rebate-treasure.trycloudflare.com/` — Cloudflare quick tunnel (cloudflared 2026.10.7) → `adapter/fanout_exec.py` on 127.0.0.1:8090 → 3 `adapterexec` workers (8081–8083) on the hosted bytes. `check_executor.py` PASS through the tunnel, bits equal to loopback; worst-case 30 × 243-token batch 74 s (Cloudflare cuts at 100 s; one worker took 126 s → 524). **The URL changes if cloudflared restarts: re-check before signing** (G39) |
| Prefix | `EVENT_OUTCOME_RESOLUTION` is registrable: registration 30 (another author) used it on 2026-11-01 |
| Wallet `0xdAd2…A39e` | 0 Sepolia ETH, 5.0 MACHINA (read 2026-11-01). Claim 3.35 MACHINA on Anjoman Activity after getting ETH |

**Steps (owner):**

1. Sepolia ETH to the wallet; then Anjoman → Activity → Claim all (≈ 8.35 MACHINA after).
2. Tell Claude before signing; Claude re-runs `check_executor.py --url <public> --compare http://127.0.0.1:8081/`.
   The laptop stays on, lid open, awake and online until `/api/wasm/<id>` leaves `pending` (about 1.5 h).
3. Register, either way:
   - **Anjoman → Evaluate:** paste the hosted URL above, Verify & hash (must show the keccak above), and only if
     step 3 asks for a runnable URL, enter it and publish. If it does not ask, use the direct call.
   - **Direct (Foundry):**
     ```bash
     export RPC=https://ethereum-sepolia-rpc.publicnode.com
     export DIAMOND=0x3624EB012B5E998BB57B6bE6C9Cfc9c4bc5eb99b
     export MACHINA=0xd68305cA83C7AF42A4F720144E7416fB53F8AaF4
     export ME=0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e
     export WASM_HASH=0xc23ad1c6268d27f1a33de975c39b547844fef14e95868b5158f3e020e5b5e9e0
     export WASM_URL=https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/1d455d46d931436eec260b3cb405431fdb80d71b/season2/adapter/EVENT_OUTCOME_RESOLUTION/EVENT_OUTCOME_RESOLUTION.safetensors
     export RUNNABLE=https://favourite-prohibited-rebate-treasure.trycloudflare.com/
     cast send $MACHINA "approve(address,uint256)" $DIAMOND 20000000000000000000 --rpc-url $RPC --private-key $KEY
     cast call --from $ME $DIAMOND "registerWasm(bytes32,string,string,address,string)(uint256)" \
       $WASM_HASH $WASM_URL EVENT_OUTCOME_RESOLUTION $ME $RUNNABLE --rpc-url $RPC      # dry run: must print a number
     cast send $DIAMOND "registerWasm(bytes32,string,string,address,string)" \
       $WASM_HASH $WASM_URL EVENT_OUTCOME_RESOLUTION $ME $RUNNABLE --rpc-url $RPC --private-key $KEY
     ```
4. Claude follows `GET /api/wasm/<registrationId>` to `active` / `canonical` or a rejection reason.

## V2, 2026-10-31: register the CRYPTO_PRICE comparator — WITHDRAWN 18:40 UTC, do not run

**Do not sign this.** Re-checked the same evening: FX_NOW_EUR is scored at epoch 1945 with every FX_NOW comparator
deregistered since 2026-10-28, and CRYPTO_PRICE_USD is blocked by its own intent definition (`onchain.ready:
false`, "price_usd has no decimals"). A registered comparator would not make it scored (root GAPS G237 killed,
G235 revised). The runbook stays below as a record; the runnable endpoint stays up.

Owner's yes to "build an evaluator for one of our families", 2026-10-31. **Prepared and checked by Claude; nothing
signed or sent.** The steps below are transactions from the owner's wallet, on **Ethereum Sepolia** (GAPS G236).

**Why this family and this module** (GAPS G235, G237): only families with an evaluator are scored, and LiveCert's 36
are not. CRYPTO_PRICE is deterministic, so its evaluator is a comparator, a fixed network rule with no model. Its
pool has 5 ranking-half truth sources from 2 contributors, and its on-chain spec is RelTol 1% on BTC, ETH, SOL, BNB
and XRP. **It is a hypothesis, not a certainty, that a live comparator makes it scored**: the one scored
deterministic family, FX_NOW, is the one that has had comparators registered; WEATHER_CHECK, CURRENCY_EXCHANGE and
CRYPTO_PRICE have truth sources and no comparator and are unscored. The $5 bond is refunded on deregistration.

**What is checked (2026-10-31):**

| | |
|---|---|
| Module | `CRYPTO_PRICE.wasm`, 2,293 bytes, keccak256 `0x30dd31e3d35f287eaa7ba0db5656a0b067ab62d1eb5d24308a5ce813200cd9a3` |
| Hosted at | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/CRYPTO_PRICE.wasm`: downloaded and re-hashed, equal to the manifest |
| Correctness | 234,848 cases against the node's `ReferenceScore`, 0 mismatches (2026-10-22, [comparator/README.md](comparator/README.md)); `reference.go` is byte-identical at kit HEAD `5fa5d68b` |
| Runnable URL | `https://livecert-comparator.vercel.app/CRYPTO_PRICE/runnable` (Vercel project `livecert-comparator`, wukong4). Source: [runnable/](runnable/). Serves the same bytes (sha256 `c72796f2…e11c`, equal to the hosted file) |
| Endpoint tests | `node --test runnable/test/*.test.js`: 6/6, ~40k cases a family equal to an independent BigInt port of `ReferenceScore`, twice; two real mutants caught |
| Live endpoint | 600/600 results equal to the proven local scorer, per family; slowest 100-question batch 0.66 s (the node allows 2 min); the old single form gets 400 |
| Chain | prefix `CRYPTO_PRICE` registered (`getPrefixes`), `CRYPTO_PRICE_USD` kind 1; `entityBonds()` WASM bond $5 = 5.744 MACHINA at the pool price |
| Wallet `0xdAd2…A39e` | **0 Sepolia ETH, 0 MACHINA, 0 allowance.** Fund it first (step 1) |

**Steps (owner, in a shell with Foundry; the key never goes in a file or a chat):**

```bash
export RPC=https://ethereum-sepolia-rpc.publicnode.com
export DIAMOND=0x3624EB012B5E998BB57B6bE6C9Cfc9c4bc5eb99b
export USDC=0xcc194e1a843B658526D0D5C431f670028582Ae17
export MACHINA=0xd68305cA83C7AF42A4F720144E7416fB53F8AaF4
export ROUTER=0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
export ME=0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e
export WASM_HASH=0x30dd31e3d35f287eaa7ba0db5656a0b067ab62d1eb5d24308a5ce813200cd9a3
export WASM_URL=https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/CRYPTO_PRICE.wasm
export RUNNABLE=https://livecert-comparator.vercel.app/CRYPTO_PRICE/runnable
```

1. Sepolia ETH for gas from any public Sepolia faucet, to `$ME`.
2. Mint 10 test USDC, swap 6 for MACHINA (the docs: a $5 bond needs about 7), check the balance is over 5.75e18:
   ```bash
   cast send $USDC "mint(address,uint256)" $ME 10000000 --rpc-url $RPC --private-key $KEY
   cast send $USDC "approve(address,uint256)" $ROUTER 6000000 --rpc-url $RPC --private-key $KEY
   cast send $ROUTER "exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))" \
     "($USDC,$MACHINA,3000,$ME,6000000,0,0)" --rpc-url $RPC --private-key $KEY
   cast call $MACHINA "balanceOf(address)(uint256)" $ME --rpc-url $RPC
   ```
3. Approve the bond, then **simulate** the registration (an `eth_call`, nothing sent). It must print a number,
   not a revert:
   ```bash
   cast send $MACHINA "approve(address,uint256)" $DIAMOND 20000000000000000000 --rpc-url $RPC --private-key $KEY
   cast call --from $ME $DIAMOND "registerWasm(bytes32,string,string,address,string)(uint256)" \
     $WASM_HASH $WASM_URL CRYPTO_PRICE $ME $RUNNABLE --rpc-url $RPC
   ```
4. Register (the transaction):
   ```bash
   cast send $DIAMOND "registerWasm(bytes32,string,string,address,string)(uint256)" \
     $WASM_HASH $WASM_URL CRYPTO_PRICE $ME $RUNNABLE --rpc-url $RPC --private-key $KEY
   ```
5. Then Claude watches: `curl -s https://devnode.telegraphprotocol.com/engine/validator/v1/addresses/$ME/wasm`, then
   `/api/wasm?intent=CRYPTO_PRICE` and `/api/miners/4829` for `scores`. A comparator is usually decided within
   minutes of the next epoch (5 min). Keep the runnable URL up until it leaves `pending`.

**Disclosure for the submission:** the same owner runs a CRYPTO_PRICE_USD miner (LiveCert, 4829). A comparator is
the network's fixed rule and cannot favour any miner; the reference value comes from other contributors' truth
sources. State this as a related party all the same (RULES_SEASON2 §05/§09).

**Undo:** `cast send $DIAMOND "deregisterEntity(uint256,uint8)" <registrationId> 2 …`; the bond is released and
withdrawn with `withdrawMinerBond()` after 2 days.

---

## Season I/early-V2 sign list (2026-10-22, superseded above except as the comparator's record)

Prepared 2026-10-22. **Nothing in this file has been run.**

> **STOPPED 2026-10-25. Do not register anything in this file.** Ahmed Ali (Telegraph), on Discord, relayed by the
> operator in a screenshot: "i'd hold off on that for now, as the current wasm system will be deprecated in couple
> of days".
>
> - The operator's call is not to work on WASM.
> - The comparator branch `season2-evaluators` (`2825b06`) stays public as it is.
> - The adapter commit `d82ff64` and its release were never pushed.
> - "The current wasm system" may mean the comparator and adapter format described here. Re-read the docs before
>   reusing any of it.

> **Status 2026-10-22 ~17:40 UTC.**
> - Comparators: pushed at `2825b06`, and all 31 hosted hashes were verified (rows 2–32).
> - Adapter: row 1 is the node-architecture retrain, keccak `0x76f78441…`. It scores 96.6% as the node computes it,
>   and `verify_wide` PASS: Pearson 1.00000 against float, in the node's own runtime.
> - The adapter is committed on the release branch at `d82ff64`, which is not pushed yet. Step 1b publishes it.
> - The withdrawn `0xe54abbfe…` package must never be used.

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
2. **Row 1 only: the packaged adapter check has passed.** `verify_wide` must print `PASS`. See [GAPS.md](GAPS.md) G31.4.
3. **The fee address is chosen.** It is where MACHINA earnings go, and it can be a cold wallet. The default below is
   the Track 2 wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. Replace it if you want a different payout
   address.

## 1. Publish

The release clone is at `C:\Users\hyada\tg-eval\factscore`, on branch `season2-evaluators`, commit
`2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9`, which adds 51 files under `season2/`: the comparators, their check, and the adapter training recipe. It holds no
adapter package. `main` is not touched.

```bash
cd /c/Users/hyada/tg-eval/factscore
git push -u origin season2-evaluators
```

Done 2026-10-22 16:38 UTC.

**1b. The adapter, in PowerShell.** This pushes commit `d82ff64`, then creates the release with the 1.2 GB package
attached.

```powershell
cd C:\Users\hyada\tg-eval\factscore
git push origin season2-evaluators
gh release create s2-evaluators-v1 -R Harshyadav442277/telegraph-factscore --target d82ff6458bb9bfb5467ab7401060b252f9380856 --title "Season II evaluators v1" --notes "LLM_OUTPUT_EVALUATION adapter trained in the node's architecture: 96.6% on 800 held-out pairs as the node computes it. 1,205,363,765 bytes, keccak256 0x76f78441de399ebe6af97c70c17cb69c556bb09d7fb8849fdbbc121088d02f77. Sources and the 31 comparators: season2/ on branch season2-evaluators." C:\Users\hyada\tg-eval\runs\LLM_OUTPUT_EVALUATION_node\LLM_OUTPUT_EVALUATION.wasm C:\Users\hyada\tg-eval\runs\LLM_OUTPUT_EVALUATION_node\LLM_OUTPUT_EVALUATION.wasm.manifest.json
```

The comparator URLs below are pinned to the commit, so they work as soon as the branch is pushed.

## 2. Hash the hosted bytes, not the local copies

Run from Git Bash. PowerShell has no `grep` and cannot read `/c/...` paths.

```bash
cd "/c/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph"
/c/Users/hyada/tg-eval/cmptool.exe hash $(grep -o 'https://raw\.githubusercontent\.com/[^ |]*\.wasm' track2/SIGN_S2.md | sort -u)
```

**Done 2026-10-22 16:38 UTC.** The operator pushed `season2-evaluators`, and the remote head is `2825b06`. Hashing all
31 hosted URLs gave 31 of 31 equal to their rows.

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
| 1 | `LLM_OUTPUT_EVALUATION` | adapter (judgment), node-architecture retrain | `0x76f78441de399ebe6af97c70c17cb69c556bb09d7fb8849fdbbc121088d02f77` | https://github.com/Harshyadav442277/telegraph-factscore/releases/download/s2-evaluators-v1/LLM_OUTPUT_EVALUATION.wasm |
| 2 | `FX_NOW` | comparator, kit-wired | `0xa92fd5769698ee985f3c505dae116e7341363d6eefdbc02c55079fd38e5813ca` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/FX_NOW.wasm |
| 3 | `ROUTE_ETA` | comparator, kit-wired | `0xcf88885efe3c55c3dd587baa8280b2c659eae2116e05f355963f9ebfaa5e5eb4` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/ROUTE_ETA.wasm |
| 4 | `MACRO_ECONOMIC_INDICATOR` | comparator, kit-wired | `0xe4be81e2ee8c7cf34f65aa398dc79c2a0b2a058c8eb31aab9f22bc299da87fff` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/MACRO_ECONOMIC_INDICATOR.wasm |
| 5 | `LIQUIDITY_DEPTH_VERIFY` | comparator, kit-wired | `0x3d1b423ccabb5dbddf2907ffdd6495993acb4e40971751ac6e8fa3ad644b65d2` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/LIQUIDITY_DEPTH_VERIFY.wasm |
| 6 | `MINING_HASHPRICE_VERIFY` | comparator, kit-wired | `0x7519e81a734ca85fba736ce2df47621b70f5fb07349541efd16a67b73303e5aa` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/MINING_HASHPRICE_VERIFY.wasm |
| 7 | `GRID_POWER_PRICE` | comparator, kit-wired | `0xcc7a1ec6fe7162bbaa1d2e3f422d2503da5e685b8b46f5be50bf2f580206795d` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/GRID_POWER_PRICE.wasm |
| 8 | `LIVE_SHELF_PRICE` | comparator, kit-wired | `0x62af97690e067532735a789fc8087d5e38cbdd95cd5db0f4bb508f8a3f725056` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/LIVE_SHELF_PRICE.wasm |
| 9 | `ONCHAIN_METRIC_VERIFY` | comparator, kit-wired | `0x2e299e2a244a67bfd7499cee973c3852c43b5ff43a5e6279632c7bf296081042` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/ONCHAIN_METRIC_VERIFY.wasm |
| 10 | `ASSET_RESERVE_ATTESTATION` | comparator, kit-wired | `0x393ef113afa8f8fd67f35733eff18ef3634907df25b8d2ec48f1cb54f1e598cf` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/ASSET_RESERVE_ATTESTATION.wasm |
| 11 | `WEATHER_FORECAST_VERIFY` | comparator, docs-only | `0x2adcce6e823f04ecf909e57a2334ba1ef0701735c25965603e676a2a1813a2ba` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/WEATHER_FORECAST_VERIFY.wasm |
| 12 | `SENSOR_TELEMETRY_VERIFY` | comparator, docs-only | `0xf8b68e458fa5c0fabbbec5c4c8942cf7128e5c7068f09ad06604eef0a07db3db` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/SENSOR_TELEMETRY_VERIFY.wasm |
| 13 | `CORPORATE_REGISTRY_LOOKUP` | comparator, docs-only | `0x1ab0d329db3ad549f1ec5c9c064bd9184d45765eb68512b23594671d10fcd652` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/CORPORATE_REGISTRY_LOOKUP.wasm |
| 14 | `REGULATORY_FILING_MONITOR` | comparator, docs-only | `0x99d21ca63338375e236bd25e81a52070506447d266ed2c6b3c9a61893a9ff35e` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/REGULATORY_FILING_MONITOR.wasm |
| 15 | `VESSEL_TELEMETRY_VERIFY` | comparator, docs-only | `0xc5da88a06406dfc3b4e0cf5c5dfac1a6bbb2344a3494ede30c87dcce4c4edee0` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/VESSEL_TELEMETRY_VERIFY.wasm |
| 16 | `CRYPTO_PRICE` | comparator, docs-only | `0x30dd31e3d35f287eaa7ba0db5656a0b067ab62d1eb5d24308a5ce813200cd9a3` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/CRYPTO_PRICE.wasm |
| 17 | `FINANCIAL_DATA` | comparator, docs-only | `0x4c073c921a55721b4e8b706a7445e0545a2146adc2b3d8f84e29591c4d478f18` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/FINANCIAL_DATA.wasm |
| 18 | `WEATHER_CHECK` | comparator, docs-only | `0xecc319e96f8b34f89e6e22d0b94632097d7d8a19e7567c36b67f865d50dfe535` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/WEATHER_CHECK.wasm |
| 19 | `DATACENTER_TELEMETRY_VERIFY` | comparator, docs-only | `0x4a14a80bee113ee32cc425fd18ccea9dc2320751bea756486a2b87ccc75039ab` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/DATACENTER_TELEMETRY_VERIFY.wasm |
| 20 | `CROSS_CHAIN_STATE_VERIFY` | comparator, docs-only | `0x17a38f173197ba445fe0231139501e712f38634496824e630ab1e3e100276c1a` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/CROSS_CHAIN_STATE_VERIFY.wasm |
| 21 | `PACKAGE_STATUS` | comparator, docs-only | `0x4fa0860631687803e5601150f742daa97a405ed42c06471e25be1618efa572bb` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/PACKAGE_STATUS.wasm |
| 22 | `TRAVEL_DISRUPTION` | comparator, docs-only | `0x7476c01abb3266e682a092d3782dbb7c3d34649881ea1c0665a3314be6ea590a` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/TRAVEL_DISRUPTION.wasm |
| 23 | `SKU_IN_STOCK` | comparator, docs-only | `0x46c7dd092ada2078b692b2e52c203625762a78b28d4b4d91c0586124cb5d0482` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/SKU_IN_STOCK.wasm |
| 24 | `CODE_PATCH_VERIFY` | comparator, docs-only | `0x9d3b92d88877116bb62f9e2694026a3979c879aab00c3efde0b0b5402f50fa49` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/CODE_PATCH_VERIFY.wasm |
| 25 | `SLA_COMPLIANCE` | comparator, docs-only | `0xf7e64ca0a242b4449b4a29f733f4398d69de22d2538fb8769ff36c728004feac` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/SLA_COMPLIANCE.wasm |
| 26 | `GAS_PRICE` | comparator, docs-only | `0x9693f0d5d77ed30c7a631b0f1b0b96ba458cc2cb1d14f7097e6599aa0a375a70` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/GAS_PRICE.wasm |
| 27 | `STOCK_PRICE` | comparator, docs-only | `0x72fb6fbcc36931e3920b789978f270a7728a23e66ba5d8871602116f5ff23abb` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/STOCK_PRICE.wasm |
| 28 | `CARRIER_SERVICEABILITY` | comparator, docs-only | `0xaf3dd3ad3c6c98c42f9ed38e4061c0d89ce64dc6efbf608a61a8d9e03229cc21` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/CARRIER_SERVICEABILITY.wasm |
| 29 | `REGRESSION_VERIFY` | comparator, docs-only | `0xae44274cdffd6f570a3fe7f953e4ed7af2fa99418eeccab81932f9c187454a06` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/REGRESSION_VERIFY.wasm |
| 30 | `WAREHOUSE_INVENTORY` | comparator, docs-only | `0x99b7f37c3d3f69c355827644112588d9b7e1c2e15998438d86edc68419a312fb` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/WAREHOUSE_INVENTORY.wasm |
| 31 | `VALIDATOR_PERFORMANCE_VERIFY` | comparator, docs-only | `0x976792ca449bdd4e01a3f4c872c2057066d4b985556beb98978b20e8ece41f3a` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/VALIDATOR_PERFORMANCE_VERIFY.wasm |
| 32 | `COMMERCE_PURCHASE_VERIFY` | comparator, docs-only | `0x3bfbf8fe9aeb45413435a83c4e95cec39d26d05a7e7851b4b28479349ae1eaf1` | https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist/COMMERCE_PURCHASE_VERIFY.wasm |

**Why this order:**

- Row 1 first: in a round, ties go to the lower registration ID, and an adapter that is waiting for material is not
  charged an attempt.
- Rows 2–10 next: the kit itself wires these intents to the comparator path.
- Rows 11–32 last: these intents are deterministic only in the docs. A rejection there costs gas only, and the
  first one tells you whether to stop (G30).

**Overlap to disclose:** our miner serves 9 of these intents (rows 4, 13, 14, 16, 17, 18, 20, 26, 27). The release
README says so.
