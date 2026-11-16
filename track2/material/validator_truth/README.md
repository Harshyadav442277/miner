# VALIDATOR_PERFORMANCE_VERIFY_GENERAL truth source (prepared 2026-11-16, NOT uploaded)

**Why:** this deterministic intent's miners were last scored at epoch 2032. On 2026-11-16, 25 of 27 `ready`
deterministic intents were scored at epochs 2105–2107 (GAPS G50). The docs say an intent with no readable reference
"is not ranked that epoch: its miners keep their previous ranking"
(anjoman.ai/docs/scoring/contribute-evaluation-data, read 2026-11-16).

The epoch-2032 table looks like a wrong reference. `val-llama-pools`, a DeFiLlama yields wrapper, scored 0.99, while
`truth-validator-publicnode` and `truth-validator-chainsafe`, which read the beacon state itself, scored 0.38. The
scored field is a validator's effective balance in gwei, and only a beacon node holds it.

**What:** `VALIDATOR_PERFORMANCE_VERIFY_GENERAL.truth.jsonl`, one row in the documented shape
`{"label_kind":"truth_source","source":"<miner-format YAML>"}`. It is 1,504 bytes, sha256
`bfcdb813c38077038017551035cbf44b7753041bfd6ae044e74d6e9544623e10`. The YAML is `publicnode.yaml`:

- **Source:** the keyless PublicNode Beacon REST API (the standard `/eth/v1/beacon/states/{state}/validators/{id}`
  route), finalized state, `auth.type: none`. We do not run it.
- **Checked from here 2026-11-16 18:16 UTC:** index 1 and index 1200000 return `effective_balance` 32000000000, status
  `active_ongoing`.
- **How the value is read:** an `intent_mapping` names the value's path (`data.validator.effective_balance`, unit gwei),
  so the node can read it in code rather than by model. The docs say that holds only on nodes with
  `INTENT_MAPPING_ENABLED`; elsewhere the parser model reads the whole answer.
- **No related party:** our miner `livecert` does not serve this intent.

## Limits (unverified)

- **It may be rejected as a duplicate.** The champion author's miner `truth-validator-publicnode` (#1900999023) calls
  the same endpoint and path. If that YAML is already in this intent's pool as a truth source, ours is rejected as
  `duplicate_case` (same endpoints and params). Rows are never shown back, so this cannot be checked beforehand. A
  rejection costs one signature and changes nothing else.
- **The node, not the contributor, places the row in the ranking or the testing half.** A row in the testing half is
  unused.
- **The node takes the median of up to 3 sources.** A wrong source already in the pool still counts as one of them.
- **Chainsafe's Lodestar endpoint is left out.** It returned HTTP 429 on the second request (2026-11-16).
- **Why scoring stopped at epoch 2032 is not known.**

## Upload (the owner signs; Claude never touches the key)

1. Sign in at https://anjoman.ai/dashboard/eval. Verify `hyadav42774@gmail.com` and the LiveCert wallet
   `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.
2. Add material under exactly `VALIDATOR_PERFORMANCE_VERIFY_GENERAL` and upload
   `VALIDATOR_PERFORMANCE_VERIFY_GENERAL.truth.jsonl`. Check that the body sha256 is the one above, then sign the
   `Telegraph eval-pool submission v1` message.
3. Note the response: row state, or a rejection code such as `duplicate_case`.

## How we would know it worked (network evidence only)

- `GET /api/evalpool/status?intent_id=VALIDATOR_PERFORMANCE_VERIFY_GENERAL`: our row shows `eligible`, and a later
  snapshot publishes.
- `GET /api/miners`: VALIDATOR_PERFORMANCE_VERIFY_GENERAL scores carry an `epoch_id` after the upload epoch, where it is
  2032 today.
- Until both show, claim nothing.
