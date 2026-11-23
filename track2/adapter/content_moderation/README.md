# CONTENT_MODERATION adapter lane (opened 2026-11-23)

Lane 2 of [the final plan](../../PLAN_2026-11-23.md).

**Why this family:**
- it has no champion: zkasuran #174 lost at 51.9% on 27 pairs;
- the pool has 268 eligible rows from 5 submitters (`/api/evalpool/status`, 2026-11-23);
- the content to judge is in the prompt;
- LiveCert does not serve this intent.

## Data: `generate_pairs.py` (v1)

The source is Civil Comments (`google/civil_comments`, CC0 1.0), whose comments were rated by crowd workers. A
label is never ours.

| Element | How it is set |
|---|---|
| Which comments are used | Only where the raters agreed: toxic at toxicity ≥ 0.7, clean at ≤ 0.05; the rest are dropped |
| A toxic comment's category | Its highest-rated sub-type at ≥ 0.5, else general toxicity |
| Better answer | The right decision (remove or allow) and category |
| Worse answer | Same style, about the same length: the opposite decision (70%), the right decision with a category the raters scored under 0.1 (22% of toxic), or a refusal (8%) |
| Uniqueness | Every answer quotes a random snippet of its comment, so no two answers are the same text. The snippet does not reveal the label |

**Splits:**
- train/val: the Civil Comments validation split;
- test: its test split, seed 97;
- probe: its test split, in a markdown-table style training never sees.

**Kit dataset gate, 2026-11-23: PASS** on 3,000 pairs:

| Check | Value |
|---|---|
| Unique negatives | 100% |
| Largest single negative | 0.0% |
| Length shortcut | 58.4% |
| Held-out leak | 0.0% |
| Bag-of-words probe | 60.6% |

The first build failed this gate, because template answers repeated (0.8% unique).

**Known limits:**
- The intent also covers questions about how moderation works ("How do automated systems detect hate speech?").
  v1 has none, so the public-pair check will show whether the pool holds them.
- Civil Comments is news-site comments in English only.

```bash
python -I generate_pairs.py --data C:/Users/hyada/tg-eval/data/civil_comments \
    --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/cm_v1
```

## Training and results

[`../train_package.ps1`](../train_package.ps1) `-Intent CONTENT_MODERATION -Run cm_v1 -Pairs cm_v1 -BatchSize 1
-GradAccum 16` was queued at 2026-11-23 ~12:02 UTC, behind the contract lane. No results yet.

The registration bar is the same as lane 1: in the node runtime, ≥ 85% on `test.jsonl` and ≥ 70% on every style.
