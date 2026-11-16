# Season II Track 2: sign list

**Required identity (owner instruction, 2026-11-03):** account `hyadav42774@gmail.com` and LiveCert
wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` only, including the signer and fee/payout address.
Verify both before any authenticated action; no alternate identity is permitted. See [../AGENTS.md](../AGENTS.md).
The owner signs. Claude never connects a wallet, signs or sends.

## Owner checklist: one sitting, about 20 minutes (prepared 2026-11-16)

Everything below is prepared and committed; each step needs only your click, signature or send. No adapter
registration is on the list, because none has passed the gate. Deadline: **Dec 1 2026 23:59 UTC** (Dec 2 05:29 IST).

1. **Star https://github.com/telegraphprotocol/bounties** as `Harshyadav442277`. §05 requires it for every track.
   Check: `gh api user/starred/telegraphprotocol/bounties` returns 204.
2. **Sign in at https://anjoman.ai/dashboard/eval.** Verify `hyadav42774@gmail.com` and the wallet
   `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. Then upload two files, each under its exact intent:
   - `material/dns_truth/DNS_RECORD_LOOKUP_GENERAL.truth.jsonl` under `DNS_RECORD_LOOKUP_GENERAL`. Check the sha256
     is `ccc8e992…0123` ([README](material/dns_truth/README.md); discloses that livecert serves this intent).
   - `material/validator_truth/VALIDATOR_PERFORMANCE_VERIFY_GENERAL.truth.jsonl` under
     `VALIDATOR_PERFORMANCE_VERIFY_GENERAL`. Check the sha256 is `bfcdb813…3e10`
     ([README](material/validator_truth/README.md)).
   Write down each response's row state or rejection code. `duplicate_case` on the validator file is possible and harmless.
3. **Optional:** upload `adapter/email_security/evidence/2026-11-16/holdout.jsonl` under `EMAIL_SECURITY_GENERAL`.
   It holds 65 real-answer pairs labelled from DNS, which catch verity's NXDOMAIN-as-success error. Skip it if you
   prefer; it adds coverage, not a ranking change.
4. **Send [material/ORGANISER_REPORT.md](material/ORGANISER_REPORT.md)** to the Telegraph team, on Discord or as a
   bounties issue. It reports the 45 blocked comparator registrations and the two unscored intents.
5. **Submit the H2 form** from [SUBMISSION_S2.md](SUBMISSION_S2.md). First fill its §7 table with what steps 1–4
   returned.

After steps 2 and 4, Claude can check the network evidence and update `SUBMISSION_S2.md`: row states in
`/api/evalpool/status`, and scores at an epoch after the upload in `/api/miners`.

## Nothing is ready to sign (2026-11-15)

A row is added here only when its module has passed the gate in [harness/](harness/README.md): it beats the
current champion's own file and the length baseline on a holdout frozen before training, in the node runtime.

## What is registered (devnode `/api/wasm`, read 2026-11-15 ~00:40 UTC)

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
