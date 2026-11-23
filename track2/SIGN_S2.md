# Season II Track 2: sign list

**Required identity (owner instruction, 2026-11-03):** account `hyadav42774@gmail.com` and LiveCert
wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` only, including the signer and fee/payout address.
Verify both before any authenticated action; no alternate identity is permitted. See [../AGENTS.md](../AGENTS.md).
The owner signs. Claude never connects a wallet, signs or sends.

## Owner checklist (rewritten 2026-11-23 ~12:50 UTC). Deadline: Dec 1 2026 23:59 UTC (Dec 2 05:29 IST)

The 2026-11-17 reset is over: the registry was restored on Nov 18 (G51). Each item names its file, what to check and
what to send back to Claude.

### Ready now

1. ~~Star telegraphprotocol/bounties~~ **done**: `gh api user/starred/telegraphprotocol/bounties` returned 204 on
   2026-11-23.
2. **Post update 1 on X**: [OUTREACH_S2.md](OUTREACH_S2.md), Draft 1, as written; it carries the prize disclosure.
   It is longer than 280 characters, so post it as a thread or a long post. Send Claude the post URL.
3. **Upload two truth sources on https://anjoman.ai/dashboard/eval.** Sign in as `hyadav42774@gmail.com` with wallet
   `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. Upload each file under its exact intent.
   - `material/dns_truth/DNS_RECORD_LOOKUP_GENERAL.truth.jsonl` under `DNS_RECORD_LOOKUP_GENERAL`. The sha256 is
     `ccc8e992…0123`.
   - `material/validator_truth/VALIDATOR_PERFORMANCE_VERIFY_GENERAL.truth.jsonl` under
     `VALIDATOR_PERFORMANCE_VERIFY_GENERAL`. The sha256 is `bfcdb813…3e10`.
   - Both hashes were re-checked on 2026-11-23, and the three APIs behind the files answered HTTP 200.
   - Send Claude each response's row state.
4. **Send [material/ORGANISER_REPORT.md](material/ORGANISER_REPORT.md)** (rewritten 2026-11-23) on Discord or as a
   bounties issue. Send Claude the link.
5. **Do not upload** the EMAIL_SECURITY pairs. They fail our identity bar
   ([material/email_security/README.md](material/email_security/README.md)).

### Ready to sign (2026-11-23 ~22:10 UTC): EMAIL_SECURITY v1

**Node runtime:**

| Set | Result |
|---|---|
| Test | 371/400 = 92.75% (bullets 128/136, JSON 127/136, prose 116/128) |
| Unseen-style probe | 191/200 = 95.5% |
| "Failed lookup read as success" | 65/65 and 36/36 |
| Weak kind: MX order | 11/23 |

It clears the A7 bar. The family has no champion.

| Field | Value |
|---|---|
| Binary link | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/252b96545df75d73fd13d6cd5c306c4dc6e85a7e/season2/adapter/EMAIL_SECURITY/v1/EMAIL_SECURITY.safetensors` |
| keccak256 | `0x17b84d0a18f93344ac5b2191bf9b08400f2da79b8ff5b136ce1cfa492cf9c578` |
| Family | `EMAIL_SECURITY` |
| Fee address | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Runnable endpoint URL | `https://bearing-dated-fishing-funk.trycloudflare.com/EMAIL_SECURITY` (executor on port 18290; `tg-eval/executor-es.out`) |

### Signed 2026-11-23 20:17 and 20:24 UTC as #217 and #218: TEXT_SUMMARIZATION v1 and CONTENT_MODERATION v2

Both are served by one executor, one tunnel and two paths. The URLs are in `C:\Users\hyada\tg-eval\executor-ts_cm.out`;
`check_executor.py` PASSED on both at 19:06 UTC. Use the same account and wallet as #210. Fee address for both:
`0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.

**TEXT_SUMMARIZATION v1: clears the A7 bar.**

Node runtime:

| Set | Result |
|---|---|
| Own test | 399/400 |
| Unseen-style probe | 200/200 |
| 400 real-bill pairs | 360/400 = 90.0% |

| Field | Value |
|---|---|
| Binary link | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/fe080f33c185a4e1a598abf4c707c06fa101d671/season2/adapter/TEXT_SUMMARIZATION/v1/TEXT_SUMMARIZATION.safetensors` |
| keccak256 | `0x3f3ad90898301c410e0820f9cb6501e97e0e847459cf812831400791ec68ead5` |
| Family | `TEXT_SUMMARIZATION` |
| Runnable endpoint URL | `https://ate-wives-craps-symantec.trycloudflare.com/TEXT_SUMMARIZATION` |

**CONTENT_MODERATION v2: a disclosed information-buying probe (A7 probe rule).**

Node runtime: test 328/400 = 82.0%, probe 161/200 = 80.5%. That is under the 85% bar. The family has no champion;
#174 got 51.9%.

| Field | Value |
|---|---|
| Binary link | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/a45ab6c49cbe1834917dc573468bb45e3867e6ed/season2/adapter/CONTENT_MODERATION/v2/CONTENT_MODERATION.safetensors` |
| keccak256 | `0x0e0014f3fff73294c93390db09363ee3301e0213cdc927777fb69e8d0b337606` |
| Family | `CONTENT_MODERATION` |
| Runnable endpoint URL | `https://ate-wives-craps-symantec.trycloudflare.com/CONTENT_MODERATION` |

### Done: CONTRACT_OBLIGATION_AUDIT v1 is canonical #210

It went canonical on 2026-11-23 at 18:18 UTC, 82.76% on 29 pairs
([lane README](adapter/contract_obligation_audit/README.md)). Its sign block is kept below for the record.

### Signed: CONTRACT_OBLIGATION_AUDIT v1, an information-buying probe (2026-11-23 ~15:05 UTC)

**What it is.** v1 scores 80.5% held out in the node runtime. That is under our own 85% bar, so this is registered as
a disclosed probe under A7's probe rule. It may well be rejected. What we get either way:
- the node sends our executor its 15 public pairs, and the executor keeps them;
- v2, training now, can then be scored against what the pool really asks.

If v1 orders 11 of 15 correctly and wins ≥ 70% on the hidden sample, it takes the empty seat.

**Where:** https://anjoman.ai/dashboard/eval → publish for evaluation. Sign in as `hyadav42774@gmail.com` with wallet
`0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.

| Field | Value |
|---|---|
| Binary link | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/4298d6d3705969675e0214a960855a3cc00dd3c8/season2/adapter/CONTRACT_OBLIGATION_AUDIT/v1/CONTRACT_OBLIGATION_AUDIT.safetensors` |
| keccak256 Anjoman should show | `0xbf759737f604b1dfd4fbadd07da86271c478d82d97fa9c30e22b5f1b52b160e8` |
| Family | `CONTRACT_OBLIGATION_AUDIT` |
| Fee address | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Runnable endpoint URL | the URL printed in `C:\Users\hyada\tg-eval\executor-coa_v1.out`, valid only while that executor runs. At 15:04 UTC it was `https://scheduling-guarantees-romance-spend.trycloudflare.com/CONTRACT_OBLIGATION_AUDIT` |

**Checks already run:**
- the hosted file's keccak matches (HTTP 200, no redirect);
- Stage 1 passed;
- `check_executor.py` PASS through the public URL.

**After signing:**
- **Bond:** paid in test USDC on the new Diamond `0x72a70e94…a08b`, at most 1 USDC. The wallet holds 72.57.
- **Keep the laptop on, lid open.** Leave the executor running until Claude reports the registration past the remote
  check: about 1 hour of epoch wait plus minutes of checks.

### Not ready yet (Claude brings each one with exact values)

6. **Adapter registrations, about one a day.** Three adapters are trained or queued: CONTRACT_OBLIGATION_AUDIT,
   CONTENT_MODERATION and TEXT_SUMMARIZATION.
   - None is offered for signing until it clears ≥ 85% held out and ≥ 70% on every answer style, in the node runtime.
   - For each one Claude starts the executor and hands over four values: hosted URL, family, fee address (the LiveCert
     wallet) and runnable URL. You sign on Anjoman Evaluators.
   - The laptop stays awake until the remote check finishes, about 1.5 h.
7. **Posts 2 and 3** go out on later dates: about Nov 27 with the public-pair results, and about Nov 30.
8. **The H2 form** from [SUBMISSION_S2.md](SUBMISSION_S2.md), by Dec 1 20:00 UTC. Claude rewrites the form from network
   evidence on Nov 30.

## Nothing is ready to sign (2026-11-15)

A row is added here only when its module has passed the gate in [harness/](harness/README.md): it beats the
current champion's own file and the length baseline on a holdout frozen before training, in the node runtime.

## What was registered (devnode `/api/wasm`, read 2026-11-15 ~00:40 UTC; the registry was emptied on 2026-11-17, G51)

| Family | Id | State | Note |
|---|---|---|---|
| FX_NOW | 267 | superseded | passed the comparator gate (1,120 cases, 0 mismatches); replaced by #271, which scores identically |
| CRYPTO_PRICE | 268 | superseded | same; replaced, current champion #434 |
| WEATHER_CHECK | 269 | superseded | same; replaced, current champion #440 |
| REGULATORY_FILING_MONITOR | 273 | pending | `awaiting_compatible_material`: no snapshot under the family id |
| CORPORATE_REGISTRY_LOOKUP | 274 | pending | same |
| LIQUIDITY_DEPTH_VERIFY | 275 | pending | same |
| GRID_POWER_PRICE | 276 | pending | same |
| MINING_HASHPRICE_VERIFY | 277 | pending | same |
| FINANCIAL_DATA | 278 | pending | same |
| SANCTIONS_SCREENING_MATCH | 46 | deregistered | rejected at 7 of 15 public pairs on 2026-11-01 (GAPS G40) |

File URLs, keccak values and runnable URLs for #273 to #278 are in
[runnable/SIGN_HIGH_DEMAND.md](runnable/SIGN_HIGH_DEMAND.md). An exact comparator ties every other exact
comparator, so re-registering a superseded family proves nothing new: do not re-sign those.

## History

The earlier runbooks (the 32-row Season I/early-V2 list, CRYPTO_PRICE withdrawn 2026-10-31, FX_NOW funding,
EVENT_OUTCOME_RESOLUTION lost to registration 39, the sanctions v3 tunnel) were cut on 2026-11-15:
`git log -p -- track2/SIGN_S2.md`.
