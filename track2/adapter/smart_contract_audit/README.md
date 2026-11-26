# SMART_CONTRACT_AUDIT adapter lane (opened 2026-11-24)

**Why this family:** it has a champion, #187 (`0xcd0a23…`), at 83.33% (`/api/wasm`, 2026-11-25). A challenger has to
beat that on the node's hidden round, so this lane is only offered for signing if it clearly beats #187's own file on
the same pairs in the node runtime.

**Related party:** LiveCert serves this intent. That is disclosed (ARCHITECTURE A7), and nothing here names or formats
a LiveCert answer.

## Data: [generate_pairs.py](generate_pairs.py) (v1)

Every contract is assembled by the generator, so the right answer is known by construction. The two question kinds
are the ones #187's public write-up describes the pool as holding; the write-up was read for methods only, and none
of its code or data is used.

| Kind | Better answer | Worse answer |
|---|---|---|
| Access control: which check restricts who may call function F? | F's own modifier or `require(msg.sender == …)`, as JSON `{"target", "authorization_check"}` | another function's check, a check that is not about the caller (`whenNotPaused`, `nonReentrant`), or "none" for a guarded function |
| Audit: one weakness planted in one function of a numbered Solidity 0.4 contract | Verdict / Highest severity / Finding (class, function, line) / Fix | the wrong class, function or line, or a "Safe" verdict |

- A fixed fifth of the contract names is test-only. Texts are capped at 500 tokens.
- Pairs: 4,000 train, 300 val, 400 test (`tg-eval/pairs/sca_v1`). There is no unseen-style probe file yet.
- The kit dataset gate PASSED when the pairs were built (commit `4e3f096`); its metric values were not recorded.

```bash
python -I generate_pairs.py --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/sca_v1
```

## Training and measurement

- Job: `SMART_CONTRACT_AUDIT:sca_v1:sca_v1` through `../train_queue.py` (rank 8, alpha 32, 3 epochs, lr 1e-4, 512
  tokens). Queued on GPU.lock since 2026-11-26 03:28 UTC.
- Before it is offered for signing, measured in the node runtime (`../../harness/measure.py`):
  - our test split, with the longer- and shorter-answer baselines;
  - #187's registered file on the same pairs (keccak checked against the registry);
  - the family's 15 public pairs offline, if a capture exists (none yet: we have never been checked in this family).

## Results

None yet: training has not finished.
