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
