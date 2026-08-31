# Post-fix audit: IP geolocation and wallet balance

**Audit time:** 2026-08-31 15:27 IST  
**Miner:** `livecert`, registration `389`  
**Source reviewed:** `a7567c9` plus the deployed IP and wallet changes  
**Competitor baseline:** Preflight commit [`3511244`](https://github.com/shreshth006/Preflight/tree/35112449111201a56e66437b813433efd7029b6a)  
**Scope:** post-fix correctness, scorer evidence, reliability and final-epoch risk. This audit changed no miner code, deployment, registration or wallet.

## Executive verdict

Claude fixed the observed behaviors, but neither intent is yet a proven post-fix win.

- **IP is the stronger fix.** Production now answers the epoch-296 target `8.8.8.8` with `Google LLC`, Ashburn, Virginia, United States and `AS15169`, aligning the facts that let Preflight score `0.9939274`. The previous `0.010600168` score belongs to the old `Google Public DNS` answer. Freeze the runtime wording for the final epoch.
- **Wallet is materially better.** ENS resolution, the recurring 41-hex placeholder, historical-date qualification and bigint prose formatting are deployed. The recovered replay improves the historical subset from `0.165762` and 1/6 crossings to `0.330671` and 2/6; the honest malformed-placeholder answer improves `0.005956` to `0.989002` on that row. The recorded production replay is `0.382350`, 5/13 crossings, versus the old `0.298`, 3/10 baseline.
- **The leaderboard has not validated any of these changes.** The newest public result is still epoch 296: IP `#4`, wallet `#5`. All relevant changes landed after those requests. The accurate claim is **deployed and replay-improved**, not “fixed rank” or “now beating Preflight.”
- **A P0 wallet routing defect remains.** A live request containing `address=<vitalik>&chain=base`, without the prose query, returned the Ethereum balance and `chain: "ethereum"`. The handler ignores the structured `chain` parameter, and the wallet endpoint does not declare it as an input. Preflight declares and validates `chain` explicitly.

## Verified state

| Check | Result | Meaning |
|---|---|---|
| Registration `389` | Active; both intents present; pinned YAML commit `74ad4a1` | Eligible, but the pinned manifest is older than the runtime fixes |
| Production IP `8.8.8.8` | `Google LLC (AS15169)`, Ashburn, Virginia, US | `6134e47` behavior is deployed |
| Production wallet malformed placeholder | HTTP 200, `0 ETH`, explains 41 vs 40 hex characters | `fa421d0` behavior is deployed |
| Production wallet historical date | Current `6.64217816 ETH`, then archive-node qualification | `438be30` behavior is deployed |
| Production wallet `vitalik.eth` | Resolves to `0xd8dA...6045` and returns a current balance | `d20b17b` behavior is deployed |
| TypeScript | Direct typecheck and test compilation pass | Source is type-correct |
| Offline-labelled test suite | 167/169 pass; two wallet tests make undeclared live RPC calls and fail when RPC networking is unavailable | No deterministic green unit gate exists for wallet |
| Current public scores | Epoch 296 only: IP `0.010600168 #4`; wallet `0.00012348956 #5` | Both are pre-fix scores; no post-fix rank evidence |

Authoritative live sources: [registration 389](https://devnode.telegraphprotocol.com/api/miners/389), [IP scores](https://devnode.telegraphprotocol.com/scores?intent=IP_GEOLOCATION&limit=200), [wallet scores](https://devnode.telegraphprotocol.com/scores?intent=WALLET_BALANCE_CHECK&limit=500).

## Findings, ordered by risk

### P0 — Wallet ignores structured chain input

The route builds its question from `query` plus `address`; it never reads `chain`. The endpoint manifest likewise declares only required `address` and optional `query`. Consequently:

```text
GET /wallet-balance?address=0xd8dA...6045&chain=base
=> chain: ethereum, symbol: ETH, Ethereum balance
```

This is a confidently wrong answer, not a graceful refusal. It is masked when Telegraph preserves the full optional question because `walletChain()` can read “Base” from that prose. It fails whenever the router supplies only structured parameters or paraphrases the query without the chain.

Preflight's manifest declares `chain`, its router rejects unsupported named chains, and it supports Ethereum Sepolia and Base Sepolia. Ours maps `Sepolia` to Ethereum mainnet, `Base Sepolia` to Base mainnet, and BNB Chain or Avalanche to Ethereum mainnet.

**Final-epoch action:** make the handler honor `chain`; only default to Ethereum when no chain was named anywhere. Declaring the missing input on-chain is a separate manifest/update decision and must not be confused with the code fix.

### P0 — We have implementation evidence, not outcome evidence

The titles and comments around the ENS change overstate the diagnosis: public epoch-296 data contains no question, ground truth, miner answer or converted answer. It cannot establish that ENS caused that loss. The newest public score still predates all four wallet improvements and the IP operator fix.

**Final-epoch action:** do not announce a win until the next score record shows registration `389`, the expected epoch, both intents, rank, score and no failure reason.

### P1 — Wallet failover does not fit inside its deadline

Wallet RPC endpoints are attempted sequentially, each with a 6-second timeout. Ethereum has four endpoints, while the handler watchdog answers at 11 seconds. In the hanging-provider case, the third and fourth endpoints cannot possibly contribute. ENS can consume up to 4 seconds before the same RPC sequence begins.

Production is healthy now, but this design turns one slow primary into a near-watchdog answer and makes the advertised spare endpoints mostly decorative.

**Recommendation:** race two independent RPCs under one overall budget or sharply subdivide the remaining deadline. Keep the honest HTTP-200 unavailable response as the final fallback.

### P1 — The malformed-address branch is too broad

`malformedAddress()` accepts any `0x` plus at least 16 hex characters when no exact address was found. A direct probe showed that a 64-hex transaction hash is classified as a malformed wallet and assigned balance zero. For the recovered address containing a non-hex `m`, the parser reports only the truncated hex prefix, not the actual supplied string.

The recovered 41-hex `%[...]%` placeholder is strongly evidenced and should remain. The generic 16-plus-hex rule is not.

**Recommendation:** restrict the zero-balance branch to wallet/address context and a complete candidate with a demonstrable length error. Do not turn transaction hashes or truncated fragments into zero-balance wallets.

### P1 — ENS is less deterministic than Preflight's implementation

Our ENS path depends on one third-party resolver, `api.ensideas.com`, before querying the chain. Preflight computes EIP-137 namehash locally and resolves through Ethereum RPC. Our regex also rejects syntactically valid short labels: `a.eth` and `ab.eth` return no ENS match, while `abc.eth` matches.

The current path works in production and has an honest failure response, so a rushed rewrite before the final epoch is higher risk than leaving it. Longer term, resolve on-chain, test with mocked RPC responses, and retain the external service only as an optional failover if its privacy and availability tradeoff is accepted.

### P1 — IP has no exact regression test for the field that lost 93.77x

The live IP test only asserts that the answer contains an operator-shaped phrase. It does not mock primary `ip-api.com` or assert `organisation === "Google LLC"` when `isp` is `Google LLC` and `org` is `Google Public DNS`. Reversing the precedence could therefore recreate the epoch-296 failure while the test still passes.

**Final-epoch action:** freeze runtime prose, but add a deterministic provider-mapping unit test for this exact `isp`/`org` split. A test-only change does not disturb the scored answer.

### P1 — IP failover also exceeds the watchdog

Three geolocation providers are sequential at up to 4 seconds each, against the same 11-second watchdog. The third provider cannot reliably finish when the first two hang. The primary is also plain HTTP, so the queried address and response are not transport-encrypted between Vercel and `ip-api.com`.

This does not explain epoch 296—the primary answered with accurate fields—but it is a reliability and privacy weakness.

### P2 — IP abuse wording implies evidence the sources do not contain

For a non-Tor address, the answer says “no abuse reports appear” in registry and geolocation sources, then admits those sources do not include a reputation database. Those sources cannot substantiate absence of abuse reports. The only actual reputation-adjacent check is Tor DNSEL.

The scorer appears to reward an abuse clause, so do not rewrite it hours before the epoch without replay evidence. Product-correct wording should say that no dedicated abuse-history check was performed and separately report the Tor result.

### P2 — Precision is fixed in prose, not end to end

`verdict` and `reason` use bigint-derived `6.64217816`, but `balance_eth` still uses `Number(wei) / 1e18`, and the schema exposes only that number. The scoring-critical reason is safe; the structured response can still lose wei precision. Add `balance_wei` and a decimal string field later, keeping `balance_eth` for compatibility.

### P2 — Historical parsing covers one wording family

The branch recognizes English full-month dates after “as of” or “on.” It misses ISO dates, abbreviated months and block-number requests. Direct probes returned no match for `as of 2026-08-22`, `on Aug 22, 2026` and `at block 12345`.

The shipped wording is a measured improvement on the recovered family. Expand only with fixtures; do not turn an unsupported date into a claim that today's value was the historical value.

## Weaknesses in our strategy

1. **We mistake patch presence for live proof.** Commit, deployment, production behavior and leaderboard outcome are four different gates. Only the first three are currently green.
2. **Our corpus is frozen and incomplete.** The 21-row IP bench did not contain `8.8.8.8`, yet reported 21/21 crossings before the 93.77x loss. Wallet has 13 local rows while Preflight reports on 16, so `0.382350` and `0.4966` are not directly comparable.
3. **The replay approximates the hidden converter.** Wallet tuning scores the first 32 words manually against the champion WASM. Telegraph scores a generated `converted_answer`; the current API no longer exposes it. Replay direction is useful, but its absolute score is not a production guarantee.
4. **We copied competitor branches faster than we audited their assumptions.** The ENS comment claimed an epoch-specific cause that public evidence cannot establish. G44's title says “ENS was” while its own later note concedes the cause is unknown.
5. **We test happy-path questions more than router-shaped inputs.** The missed `chain` parameter is the same class of bug as the earlier address-plus-paraphrase failure: the domain function is correct, but the engine-facing parameter path drops context.
6. **Our supposedly offline gate is not offline.** Two wallet tests without a `(live)` marker make real RPC calls. That creates flaky red builds and makes it impossible to distinguish a code regression from a provider/network failure.
7. **Production has no immutable build identity.** Registration `389` pins YAML at `74ad4a1`, while runtime behavior comes from later commits. Behavior smokes prove what the endpoint does now, but no response field identifies the deployed commit.

## Final-epoch decision

1. **Freeze IP runtime behavior.** The observed one-field loss is corrected live. Add only the exact mocked `isp`-before-`org` regression test.
2. **Fix wallet chain propagation before touching prose.** It is the clearest remaining correctness defect and directly separates us from Preflight's parameter strategy.
3. **Narrow malformed classification while preserving the measured 41-hex placeholder.** Benchmark the exact resulting sentence before deploy.
4. **Do not rewrite ENS or the historical sentence in the remaining window.** Both are live; the historical branch has measured gain, and the ENS dependency is currently healthy.
5. **Deploy once and smoke engine-shaped cases:** address plus structured Base chain without prose; Base Sepolia/unsupported chain behavior; 41-hex placeholder; transaction hash; historical date; ENS; `8.8.8.8` exact operator.
6. **Call the result a win only after the next authoritative epoch row.** Until then, report the verified state as “post-fix production ready, leaderboard unvalidated.”

## Bottom line

Preflight's advantage is still its system, not a special data provider: explicit router parameters, deterministic chain resolution, retained question/truth receipts, exact champion replay, distribution-level selection and strict isolation of unrelated answers. We have now copied the highest-value answer branches and corrected the IP fact that caused the cliff. The remaining largest risk is that our engine-facing wallet route can discard the chain and confidently query the wrong network.

Fix that routing defect, freeze the measured prose, and let the last epoch—not the commit messages—decide whether the gap is closed.
