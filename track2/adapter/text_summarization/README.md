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

## Training and results

`../train_package.ps1 -Intent TEXT_SUMMARIZATION -Run ts_v1 -Pairs ts_v1 -BatchSize 1 -GradAccum 16` was queued at
~12:42 UTC, third on GPU.lock. No results yet.
