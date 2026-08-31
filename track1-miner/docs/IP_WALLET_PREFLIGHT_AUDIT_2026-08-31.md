# Final-epoch audit: Preflight vs LiveCert on IP geolocation and wallet balance

**Audit time:** 2026-08-31, after epoch 296  
**Our miner:** `livecert`, registration `389`, active  
**Competitor:** `preflight-ssl-verification`, registration `377`, active  
**Preflight source audited:** commit [`3511244`](https://github.com/shreshth006/Preflight/tree/35112449111201a56e66437b813433efd7029b6a)  
**Scope:** diagnosis and last-epoch recommendations only. No production code, registration, wallet, or deployment was changed by this audit.

## Executive verdict

The two gaps look similar on the leaderboard but have different causes.

- **IP geolocation is a one-field cliff, and the fix is already deployed.** Epoch 296 asked about `8.8.8.8`. We returned the service name `Google Public DNS`; Preflight returned the network operator `Google LLC`, which is what the reference answers name. That single mismatch put us below the scorer cliff. Commit `6134e47` changed our priority from `org ?? isp` to `isp ?? org`, and the live endpoint now returns the same operator, place, and ASN as Preflight. Do not perturb IP again before the last epoch.
- **Wallet is a real coverage and answer-shape deficit.** Preflight is not using a magical balance source; both miners use public EVM JSON-RPC. Preflight wins because it built explicit branches for historical dates, malformed placeholder addresses, missing parameters, ENS names, and truth-shaped precision. Our current implementation still misses the two best-evidenced branches: historical-date questions and the recurring 41-hex-character placeholder.
- **The new ENS work is plausible but not the highest-ROI fix.** A commit titled `Resolve ENS names in wallet questions instead of refusing them` landed concurrently while this audit was being written. The public score API does not expose epoch 296's wallet question, ground truth, or converted answer, so there is no evidence that ENS caused this particular loss. Do not describe that as confirmed. ENS is a legitimate capability gap, but historical-date and malformed-address handling have direct recovered-fixture evidence and measured scorer gains.

## Live epoch-296 gap

Source: the public Telegraph score feeds for [`IP_GEOLOCATION`](https://devnode.telegraphprotocol.com/scores?intent=IP_GEOLOCATION&limit=200) and [`WALLET_BALANCE_CHECK`](https://devnode.telegraphprotocol.com/scores?intent=WALLET_BALANCE_CHECK&limit=500), queried during this audit.

| Intent | Preflight | LiveCert | Preflight multiple | Our normalized ratio |
|---|---:|---:|---:|---:|
| `IP_GEOLOCATION` | **0.9939274 · #1** | 0.010600168 · #4 | **93.77×** | 1.07% |
| `WALLET_BALANCE_CHECK` | **0.00432817 · #1** | 0.00012348956 · #5 | **35.05×** | 2.85% |

The absolute wallet leader score is still only `0.0043`; Preflight did not cross the near-1.0 band in epoch 296. Its large relative win is real, but it is a better miss rather than a solved intent. IP is different: Preflight and `txlens` both crossed at about `0.993`, while we fell to the miss band.

## Why Preflight is consistently hard to beat

Preflight's main advantage is its feedback loop, not its upstream APIs:

1. It retained 1,056 historical receipts containing questions, regenerated ground truths, converted answers, and scores from before the public API stopped exposing those fields.
2. It runs the exact public champion WASM for each intent locally and validates the replica against recorded node rankings.
3. It deduplicates by `(question, ground_truth)`, not question alone, because Telegraph regenerates the truth and the wording changes between epochs.
4. It selects changes on distribution-level mean, floor, cliff crossings, and field wins, then keeps unrelated intents byte-stable.
5. It writes special-case answers for known request failures instead of returning HTTP errors or generic operational prose.

That method let it discover narrow, unintuitive wins such as “historical balance cannot be answered by a latest-block RPC” and “a 41-character placeholder is not an account, so its balance is zero.” These are small code branches with disproportionate scorer impact.

Evidence: Preflight's [`HANDOVER.md`](https://github.com/shreshth006/Preflight/blob/35112449111201a56e66437b813433efd7029b6a/docs/HANDOVER.md), [`epoch-replica.mjs`](https://github.com/shreshth006/Preflight/blob/35112449111201a56e66437b813433efd7029b6a/scripts/epoch-replica.mjs), and [`wording-search.mjs`](https://github.com/shreshth006/Preflight/blob/35112449111201a56e66437b813433efd7029b6a/scripts/wording-search.mjs).

## IP geolocation audit

### Root cause of epoch 296

The failing target was recoverable from `iplocate`'s path error: epoch 296 used `8.8.8.8`. The decisive difference was:

```text
Preflight  0.9939274  associated with Google LLC ... Ashburn, Virginia ...
LiveCert   0.0106002  associated with Google Public DNS ... Ashburn, Virginia ...
```

`ip-api.com` returns both:

```text
isp = Google LLC
org = Google Public DNS
```

Preflight had deliberately selected `isp` because its recovered truths name the operator. We selected `org`, which names the service. The city, country, and ASN were otherwise aligned. This is exactly the sort of binary-looking semantic cliff the current IP scorer creates.

The relevant code is [`geo.ts`](../miner/src/geo.ts): the provider mapping now prioritizes `isp` at line 414, and the public answer starts with operator then place at lines 475–482. The diagnosis and rejected restatement hypothesis are recorded in [`GAPS.md`](../../GAPS.md) under G41.

### Fix status

The fix landed in `6134e47` **after** epoch 296. During this audit, both production endpoints returned HTTP 200 for `8.8.8.8`:

```text
LiveCert: The IP address 8.8.8.8 is associated with Google LLC (AS15169)
          and is located in Ashburn, Virginia, United States.

Preflight: The IP address 8.8.8.8 is associated with Google LLC and is located
           in Ashburn, Virginia, United States. It is announced in AS15169...
```

The core facts now match. Our answer is longer because it includes the Tor exit check, abuse-source limitation, timezone, and autonomous-system caveat. That is a residual conversion-budget risk, but the frozen 21-row scorer bench stayed at about `0.9943` with 21/21 crossings after the operator fix.

### What not to change

- Do **not** add the full-question restatement. The measured A/B was `0.994307`, 21/21 crossings without it versus `0.478165`, 10/21 with it.
- Do **not** change providers again. Both miners now use `ip-api.com` as primary for this target and return the reference-compatible Ashburn location.
- Do **not** add an unsupported claim that AbuseIPDB was queried. Our current wording honestly states the limitation.

**IP decision: freeze the deployed `6134e47` behavior.** The 93.77× historical gap is alarming, but it describes the pre-fix epoch answer, not the current production answer.

## Wallet-balance audit

### What is already equivalent

Both miners:

- query `eth_getBalance` at `latest` through keyless public RPC endpoints;
- return scoreable HTTP 200 prose on the normal path;
- detect Ethereum, Base, Arbitrum, Optimism, and Polygon;
- lead normal answers with address, native amount, chain, and `eth_getBalance`.

So adding more RPC providers or more account metadata is not the scoring lever. Preflight explicitly found that nonce, account type, raw wei, token scope, and block number diluted the scored prose and moved those details to structured fields.

### Material gaps, ordered by last-epoch ROI

| Priority | Gap | Preflight behavior and evidence | Our current behavior | Recommendation |
|---|---|---|---|---|
| **P0** | Historical-date questions | Detects “as of August …, 2026” and says the exact past balance requires the corresponding historical block/archive node. Preflight reports this raised wallet replay mean **0.2488 → 0.4966**, cliff crossings **4/16 → 8/16**, and field wins **9/16 → 12/16**. | Always queries `latest` and returns the current figure. It mentions latest block but does not answer the date mismatch directly. | Port an honest historical-date branch and keep the current value structured, not asserted as the past value. |
| **P0** | Malformed placeholder address | Detects `%[0x123…789]%` with 41 hex characters and returns `0`, explaining that no EVM account can exist because an address has 40 characters. The recovered corpus identifies it as a recurring, high-value question. | Strict 40-character regex fails, then returns a generic “no valid wallet address” response with an unrelated example. | Add a deterministic malformed-address branch before generic invalid input. |
| **P1** | Numeric precision | Keeps balance arithmetic in `bigint` and formats up to eight decimal places as a string. | Converts wei through `Number(wei)` and emits only four decimals for ordinary balances. This can lose significant digits before scoring. | Format from `bigint` directly; never route a wallet balance through IEEE-754 `Number`. |
| **P1** | Missing-address prose | Returns a concise, chain-specific `not_found` answer as HTTP 200. This branch was created after epoch 292 proved that 400/empty prose scores zero. | Also returns HTTP 200 now, but the prose is generic and spends budget on an example address. | Keep HTTP 200; shorten toward the requested chain and missing fact. Only ship if local scorer replay improves. |
| **P2** | ENS names | Resolves ENS on Ethereum mainnet, then reads the resolved address on the requested chain. | A concurrent commit adds an external `api.ensideas.com` resolver. No live score evidence identifies ENS as epoch 296's question. | Treat as a separate capability patch, not the explanation for this loss. Prefer deterministic/on-chain resolution if time permits; otherwise do not spend the remaining window expanding this single new dependency before P0 fixes. |
| **P2** | Unsupported/test networks | Explicitly supports Sepolia and Base Sepolia and distinguishes unsupported named chains from an absent chain. | Defaults unrecognized chains to Ethereum. | Useful correctness hardening, but lower ROI than the recovered wallet fixtures. |

The wallet implementation is [`wallet.ts`](../miner/src/wallet.ts). The two highest-evidence missing branches are visible at the input parser and invalid-address path; the current normal response also formats through `Number` and four decimals. Preflight's corresponding implementation is [`walletBalance.ts`](https://github.com/shreshth006/Preflight/blob/35112449111201a56e66437b813433efd7029b6a/src/intents/walletBalance.ts).

### Important correction about the new ENS work

The ENS edits appeared as uncommitted work created outside this audit and were committed concurrently after a score-history update rebased the branch. Their comment says Preflight “answered the epoch 296 question” through ENS. That is **not established by the public data**. The live `/scores` response exposes only miner, score, rank, timestamp, and failure reason; it omits the wallet question, truth, and converted answer.

The ENS change may still be useful, but it should not displace the P0 work whose fixtures and before/after measurements are public. It also introduces a single external resolver and live-network tests, so it needs a mocked unit test, an availability fallback, and a deploy smoke check before it is safe to ship.

## Last-epoch action order

1. **Keep the IP operator fix deployed and freeze IP prose.** This is the highest-confidence recovery.
2. **For wallet, implement one isolated P0 bundle:** historical-date qualification, malformed-placeholder classification, and bigint-safe formatting. These are deterministic and do not add an upstream dependency.
3. **Run local-only scorer replay against every recovered wallet `(question, ground_truth)` pair.** Require improvement in mean and field wins, no new zero, and preserve normal current-balance answers. Do not select on a single question.
4. **Run wallet unit tests plus engine-shaped HTTP cases:** valid address, zero balance, malformed 41-hex placeholder, missing address on Base, past-dated request, token-plus-native request, and RPC failure.
5. **Deploy once, smoke once, then freeze.** Verify the production response and registration `389`; do not register a new manifest unless the endpoint/schema surface actually changes.
6. **Park ENS unless it independently clears the same evidence gate.** An unmeasured capability addition is not worth delaying the two measured fixes.

## Confidence and limits

- **High confidence:** epoch 296 IP root cause, post-epoch code fix, and current live deployment behavior.
- **High confidence:** Preflight's historical-date and malformed-address wallet branches exist and its repository records their exact champion-replay gains.
- **Medium confidence:** those branches will improve the final epoch. Telegraph can draw a different question and regenerate a differently worded truth.
- **Unknown:** the exact epoch 296 wallet question and converted answers. The current public API no longer exposes them, so any claim that the loss was specifically ENS, precision, or a historical date would be speculation.
- **Not performed:** the recovered wallet corpus was not sent to either public production endpoint during this audit. Recommendations rely on code inspection, the repository's retained replay results, our local source, and the authoritative live standings.

## Bottom line

Preflight's lead comes from **fixture coverage plus scorer-shaped branching**. On IP, they already knew that the scorer wants the network operator, not the product name; our one-line fix now matches that. On wallet, they have four evidence-backed branches where we mainly have one generic path. The last-epoch bet should therefore be narrow:

> Freeze IP. Fix historical wallet dates, malformed placeholders, and precision. Do not mistake the unproven ENS hypothesis for the cause of epoch 296.
