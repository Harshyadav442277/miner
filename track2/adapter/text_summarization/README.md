# TEXT_SUMMARIZATION adapter lane (opened 2026-11-23)

Lane 3 of [the final plan](../../PLAN_2026-11-23.md). It replaces the CODE_PATCH_VERIFY challenge.

**Why this family, and why the plan changed:**
- It has no champion. zkasuran #208 was rejected at 2026-11-23 ~12:10 UTC, but only because its executor was
  unreachable (502). So the family is evaluable, and 70% takes the seat.
- CODE_PATCH_VERIFY would need ≥ 76.7% to beat #155, and its last challenger, #166, scored 60.9%.
- The pool has 199 eligible rows from 3 submitters.
- The source text is in the prompt.
- LiveCert does not serve this intent.

## Data: `generate_pairs.py` (v1), synthetic only

Every source document is generated from a fact record, so the faithful summary is derived from the record.

**Why not real data:** BillSum (CC0) was checked first. Every bill is far over the 512-token limit (median 1,536
tokens), and a cut source would break the label.

**What a pair looks like:**
- **Genres:** earnings note, incident report, study result, policy announcement.
- **Better answer:** the main finding and key facts, sometimes with one minor true detail.
- **Worse answer:** the same summary in the same style, with one of these:
  - a figure swapped for another from the same number set;
  - an organisation, place or person swapped;
  - the direction flipped;
  - a claim the document never makes, from the same vocabulary as the true details;
  - the main finding replaced by the minor detail.

**Splits:**
- a fixed fifth of every name list is test-only (test, seed 97);
- the probe uses the test split with a one-line "TL;DR" style training never sees.

**Kit dataset gate, 2026-11-23: PASS** on 3,000 pairs:

| Check | Value |
|---|---|
| Unique negatives | 98.3% |
| Largest single negative | 0.1% |
| Length shortcut | 50.1% |
| Held-out leak | 2.0% |
| Bag-of-words probe | 62.6% |

**Earlier builds:** two failed the bag-of-words probe, at 76.0% and then 69.3%. The causes were invented claims in
vocabulary only the worse answers used, the word "announced", and changed figures outside the normal number set.
All three were fixed.

**Known limit:** short synthetic documents with a narrow style. The public-pair check will show how far the pool's
texts are from them.

```bash
python -I generate_pairs.py --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/ts_v1
```

## v2 (2026-11-23): real bills added

The pool is described as mostly short 118th-Congress bills and NASA press releases (GAPS G54).

**Source.** [filter_bills.py](filter_bills.py) streamed `dreamproit/bill_summary_us` (CC0; govinfo texts; 125,246 rows,
never stored) and kept 8,193 short 116th–117th Congress bills with their CRS summaries. The file is
`tg-eval/data/bills/short.jsonl`, sha256 `ffd9fec6…0f70f`. None is from the 118th Congress, so none can be a pool
bill.

**Pairs** ([bill_pairs.py](bill_pairs.py)):
- **Better answer:** the CRS summary of that bill.
- **Worse answer:** the same summary with one unsupported claim, checked against the bill text: a number changed to
  one in neither text, an agency or official the bill never names, a flipped duty, or a sentence from another bill's
  summary.
- **Splits:** a fixed fifth of bills is test-only. `bills_test.jsonl` (400 pairs) measures ts_v1 on real text.

**Kit dataset gate on ts_v2** (4,000 pairs, about half of them bills): **PASS**.

| Check | Value |
|---|---|
| Unique negatives | 99.2% |
| Length shortcut | 61.1% |
| Leak | 0.7% |
| Bag-of-words probe | 60.2% |

## Training and results

**ts_v1** (synthetic pairs only; rank 8, alpha 32), measured in the node runtime (`harness/measure.py`):

| Set | ts_v1 | Longer wins | Shorter wins | Evidence |
|---|---|---|---|---|
| Own test, 400 pairs | 399/400 | 180 | 168 | [measure-ts_v1.json](evidence/measure-ts_v1.json) |
| Unseen-style probe, 200 pairs | 200/200 | 96 | 72 | same file |
| Real bills (`bills_test`), 400 pairs | 360/400 = 90.0% | 47 | 241 | [measure-ts_v1-bills.json](evidence/measure-ts_v1-bills.json) |

The node's public check passed 15/15 (#217, 2026-11-23 22:16 UTC). ts_v2 (about half bills) passed the kit gate; its
node-runtime measurement left no result file (`runs-v2/ts_v2/measure.json` is missing), so it is unmeasured.

**Registrations, all the v1 adapter re-exported at a different max_tokens for a new hash** (same Stage 1 bits
`0x3fbc8682`):

| Version | Registration | Outcome |
|---|---|---|
| v1 (512) | #217 | rejected: remote executor unreachable after the session restart killed the tunnel |
| v1b (511) | #222 | rejected: Cloudflare 524, workers paged out under training load |
| v1c (510) | #245 | rejected 2026-11-26 00:11 UTC: tunnel lost the network at 15:46 UTC before the signature |
| v1d (509) | #246 | rejected 2026-11-26 00:11 UTC: executor stopped by Claude to make room for v1e |
| v1e (508) | **#253, canonical** | 2026-11-26 07:25 UTC: "first Canonical for TEXT_SUMMARIZATION at 73.91% on 23 pairs"; [registration-253.json](evidence/registration-253.json) |

Every rejection was hosting, never scoring; once the executor stayed up, the same scorer was promoted.
