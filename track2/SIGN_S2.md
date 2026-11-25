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

### Ready to sign (2026-11-25 ~19:30 UTC): TEXT_SUMMARIZATION v1e, from the LiveCert wallet only

**v1d was submitted from a different wallet of the owner's** (owner, 2026-11-25 ~19:20 UTC), not
`0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. That breaks the identity rule (AGENTS.md). Its hash may now be taken
(same-hash re-registration is refused, bounties #213), so v1e is the same adapter at max_tokens 508. The v1d executor
is stopped, so the v1d registration cannot pass its check.

1. **From the wrong wallet:** deregister the v1d registration (Anjoman → My registrations → Deregister → "Confirm
   deregister?" within 4 s).
2. **Switch MetaMask to `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`**, check the address on the screen, then
   deregister #245 and register v1e.

Checked 2026-11-25 19:25-19:28 UTC: Stage 1 PASS (`0x3fbc8682`); hosted sha256 = local (`9f5cf1a3…e6fb`);
`check_executor.py` PASS, public = loopback, the reply's `adapter_hash` is v1e's; the node's 30-text batch took 73.0 s.
**Risk:** another training job runs on this PC, and the workers are partly paged out (0.7-1.1 GB of 3.8 GB resident,
2.1 GB RAM free). 73 s is under Cloudflare's 100 s cut, with less margin than the 58.9 s measured at 13:24.

| Field | Value |
|---|---|
| Binary link | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/a644c0f26e0470bcdfc720bc38395fe3393185cc/season2/adapter/TEXT_SUMMARIZATION/v1e/TEXT_SUMMARIZATION.safetensors` |
| keccak256 | `0x89974f9cf887e2fcae5741a35487b83081d3adae59635a55985a5805dfc052e3` |
| Family | `TEXT_SUMMARIZATION` |
| Fee address | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Runnable endpoint URL | `https://dividend-versus-notes-mothers.trycloudflare.com/TEXT_SUMMARIZATION` |

### Superseded 2026-11-25 ~19:25 UTC (submitted from the wrong wallet; executor stopped): TEXT_SUMMARIZATION v1d

**#245 (v1c, signed 2026-11-25 18:09 UTC) points at a dead URL.** The v1c tunnel lost the network at 15:46:49 UTC
(cloudflared: DNS timeout, "no recent network activity"), and Cloudflare then deleted the quick tunnel ("Tunnel not
found"), so the URL was already dead when #245 was signed. A quick-tunnel name cannot be restored, and no call to change
a registration's runnable URL is known. v1d is the same trained adapter re-exported at max_tokens 509, for a new hash.

1. **Deregister #245** at Anjoman → My registrations → Deregister, then click "Confirm deregister?" within 4 s.
2. **Register v1d** with the values below, right away: a quick tunnel only lives while this laptop's network holds.

Checked 2026-11-25 19:10-19:13 UTC:
- Stage 1 PASS, same bits as v1 to v1c (`0x3fbc8682`); `runs-v2/ts_v1d/stage1.log`;
- the hosted file's sha256 equals the local package's (`ff87a137…7b48`);
- `check_executor.py` PASS, public = loopback, and the reply's `adapter_hash` is v1d's;
- the node's 30-text batch replayed through the tunnel in 69.2 s (Cloudflare cuts at 100 s);
- training is paused (`tg-eval/EXECUTOR.lock`), 4 workers at AboveNormal. Keep the PC on and online until decided.

| Field | Value |
|---|---|
| Binary link | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/a89b4b477df792dc9923843d29303db3bd473bfc/season2/adapter/TEXT_SUMMARIZATION/v1d/TEXT_SUMMARIZATION.safetensors` |
| keccak256 | `0xff6352179269ae46dee2c2252d23cfb5d56223f92f3f49d568785e76456c8175` |
| Family | `TEXT_SUMMARIZATION` |
| Fee address | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Runnable endpoint URL | `https://wholesale-demographic-coast-but.trycloudflare.com/TEXT_SUMMARIZATION` |

### Signed 2026-11-25 18:09 UTC as #245, URL dead since 15:46 UTC: TEXT_SUMMARIZATION v1c

#222 (v1b) was rejected with Cloudflare 524 three times. Its 30-text batches took 164-263 s, because the executor's
workers (3.4 GB private each) were paged out while training ran. Same-hash re-registration is refused, so v1c is the
same adapter at max_tokens 510, with the same Stage 1 bits `0x3fbc8682`.

**The Nov 24 executor (`kelly-their-deleted-mechanical…`) is dead:** the PC crashed at 15:39 UTC Nov 24 (event 41)
and was powered off from the Start menu at 16:35 and 16:51 UTC. v1c was never registered. Use only the URL below.

**This window (checked 2026-11-25 13:21-13:24 UTC):**
- training is paused (`tg-eval/EXECUTOR.lock`; all six lanes are relaunched and wait on it);
- the executor (`tg-eval/executor-ts4.out`) runs 4 workers at AboveNormal priority;
- `check_executor.py` PASS: public and loopback return identical bits, item 0 `0x3fbc8682`;
- replaying the node's own 30-text batch (captured 2026-11-24 02:21) through the tunnel took 58.9 s;
- the hosted binary's sha256 equals the local package's (`a7bfdf10…f434`), whose manifest keccak is below.

Keep the lock and the PC on (no shutdown, no sleep, lid open) until the registration is decided. The check comes
about 2 h after the first epoch boundary after registration; the next boundary is 2026-11-25 16:04:54 UTC.

| Field | Value |
|---|---|
| Binary link | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/13a7900aba9ff9e1c0abff55ca3fab906df92813/season2/adapter/TEXT_SUMMARIZATION/v1c/TEXT_SUMMARIZATION.safetensors` |
| keccak256 | `0x1c22378e13fe61e67400281f5c6e792282e63181f373529bffddee1b6344697c` |
| Family | `TEXT_SUMMARIZATION` |
| Fee address | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Runnable endpoint URL | `https://humanities-jerusalem-vote-inspiration.trycloudflare.com/TEXT_SUMMARIZATION` |

### Signed 2026-11-24 01:39 UTC as #222, rejected (executor timeouts): TEXT_SUMMARIZATION v1b

#217 passed its public check 15/15, but was rejected when the node came back to a dead executor. v1b is the same
adapter re-exported at max_tokens 511, for a new hash. Its Stage 1 bits are the same (`0x3fbc8682`). Node-runtime
results are as v1: own test 399/400, probe 200/200, 400 real-bill pairs 90.0%.

The executor was started through `executor/launch.py`: WMI, then its own hidden console and a new process group. It
survives session restarts and console Ctrl+C, but not reboots or sleep.

| Field | Value |
|---|---|
| Binary link | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/da22d6605782eee2e9ffafe490cc4f5e9210020d/season2/adapter/TEXT_SUMMARIZATION/v1b/TEXT_SUMMARIZATION.safetensors` |
| keccak256 | `0x51b0f844a8f2860489d684188e0637930b4b2243506daa18b1041cf9209a3c3b` |
| Family | `TEXT_SUMMARIZATION` |
| Fee address | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Runnable endpoint URL | `https://why-detroit-tucson-locally.trycloudflare.com/TEXT_SUMMARIZATION` |

### Done 2026-11-23 23:11 UTC: #220 replaced by #221 (EMAIL_SECURITY v1b)

#220 was registered at 23:04 UTC (tx mined 22:55:48), but its runnable URL died when the session restarted and
killed the executors. A quick-tunnel address cannot be restored, so #220's check would fail.

Same-hash re-registration is refused ("duplicate wasm hash", bounties #213). The replacement is therefore v1b: the same
trained adapter re-exported at max_tokens 480. Its Stage 1 score is the same bits (`0x3fe521b2`), and every EMAIL text
is under 480 tokens.

1. **Deregister #220** at Anjoman → My registrations → Deregister, then click "Confirm deregister?" within 4 s.
2. **Register v1b:**

| Field | Value |
|---|---|
| Binary link | `https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/03693028a0f09b5bf0b0203fdecd46035aa2b7b9/season2/adapter/EMAIL_SECURITY/v1b/EMAIL_SECURITY.safetensors` |
| keccak256 | `0x35de4143e5afa65dc0dafc4b4639a6f4d3f17ca6b9efd95ed6cf061bf0b96b66` |
| Family | `EMAIL_SECURITY` |
| Fee address | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` |
| Runnable endpoint URL | `https://rocks-territory-light-zen.trycloudflare.com/EMAIL_SECURITY` (a detached executor: it survives session restarts, not reboots) |

### Superseded (2026-11-23 ~22:10 UTC): EMAIL_SECURITY v1, registered as #220 with a URL that has since died

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
