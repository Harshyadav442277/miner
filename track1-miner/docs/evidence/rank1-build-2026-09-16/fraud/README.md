# FRAUD_DETECTION scenario families — 2026-09-16

**DEVELOPMENT EVIDENCE ONLY. The ground truths here are AUTHORED, not the node's.**

There is no validated crossing reference for this intent. chainsight's fraud endpoint takes
addresses, not scenarios, so no real competitor answer can be scored beside ours the way
CONTENT_EXTRACTION's could. Every truth in `bench-champion2793-authored.json` was written by
hand for this bench. A number here justifies a wording choice. It does not predict a rank, and
no rank effect is claimed.

| File | What it is |
|---|---|
| `bench-champion2793-authored.json` | Champion 2793, seven cases, three authored truths each, `d26a937` vs this branch. Mean 0.333 → 0.810; no row falls. |
| `champion2793-truth-sensitivity.txt` | Why each row is a mean of three: the SAME answer scores 1.0 against one authored truth for epoch 331 and 0.0 against another. |
| `answers.json` | The seven answers this branch gives, with the verdict, confidence and named indicators. |

## The champion

- Registration 2793, `active`, still champion when `/api/wasm?intent=FRAUD_DETECTION` was read
  on 2026-09-16.
- `wasm_url`:
  `https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/a22b4919f6f2dc1102cd51e0be710a2c0aec1660/dist/reclaim5/fr_r3e6.wasm`
- **Unresolved:** the registry reports `wasm_hash` `ee0bf4e8…5021f9`; the sha256 of the bytes
  served at that same `wasm_url` is `c10bbf81…3109e8`. The bytes compile and expose the
  Telegraph `memory` / `alloc` / `rank_answer` ABI, so the bench ran on them, but the
  discrepancy is not explained and the bench inherits it.

## What the scorer does

It returns 0 or 1, not a gradient. The `5e-14` values in the `before` column are the same
magnitude the production miner was scoring on this intent, which is the cross-check that those
rows really were the refusal: "No wallet address, transaction hash, domain or affirmative
scam-language signal was identified."
