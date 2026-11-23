# CONTRACT_OBLIGATION_AUDIT adapter lane (opened 2026-11-23)

Lane 1 of [the final plan](../../PLAN_2026-11-23.md).

**Why this family:**
- it has no champion: zkasuran #92 lost at 65.5% on 29 pairs, and Telegraph's seed #900110 was pulled;
- the pool has 338 eligible rows from 11 submitters (`/api/evalpool/status`, 2026-11-23);
- the contract text in the prompt holds every fact an answer must get right;
- LiveCert does not serve this intent.

## Data: `generate_pairs.py` (v1)

Every label comes from text the prompt carries (ARCHITECTURE A7, as amended 2026-11-23). No pool row, public
pair or miner answer is used as training text.

| Source | Share | Better answer | Worse answer |
|---|---|---|---|
| Synthetic contracts ([synth.py](synth.py)) | 60% | The obligations the clauses create (party, action, figure, date). On a status question, whether each is met, late, overdue or not yet due on the date given | The same answer in the same style with one party, figure, date or status wrong, one obligation dropped or invented, off-topic data, or a refusal |
| CUAD v1 excerpts | 40% | A quote of the clause that lawyers annotated for the category asked, or "no" when the contract has none (naming the closest clause) | A quote of another clause in the same excerpt, "no" when the clause is there, or a claim when it is not |

**About the sources:**
- CUAD v1 is The Atticus Project's, under CC BY 4.0 (its README, line 345: "free to the public for commercial and
  non-commercial use"). It is at `C:/Users/hyada/tg-eval/data/cuad/CUAD_v1.json`, sha256 `ed0b77d8…0eae`.
- The answer styles (JSON list, quoted spans, numbered list, prose) follow how the three services that answered the
  G52 pilot correctly lay out an audit. Their texts were not copied.
- **Splits:**
  - test uses only test-split company names, items and CUAD contracts, with seed 97;
  - probe uses the test split with a markdown-table answer style that training never sees.

**Kit dataset gate, 2026-11-23: PASS** on 3,000 pairs:

| Check | Value |
|---|---|
| Unique negatives | 99.7% |
| Largest single negative | 0.1% |
| Length shortcut | 54.1% |
| Held-out leak | 0.4% |
| Bag-of-words probe | 58.4% |

The first build failed this gate: a repeated refusal reached 2.2%, and repeated "no" answers leaked 11.6% into
held-out. Both were fixed by making those answers name the contract or the clause they read.

```bash
python -I generate_pairs.py --cuad C:/Users/hyada/tg-eval/data/cuad/CUAD_v1.json \
    --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/coa_v1
```

## Training and gate

[`../train_package.ps1`](../train_package.ps1) `-Intent CONTRACT_OBLIGATION_AUDIT -Run coa_v1 -Pairs coa_v1`: rank 8,
alpha 32, 512 tokens; then export and Stage 1. It waits for a free GPU.

Before registration the package must reach both of these, measured in the node runtime (`harness/measure.py`):
- ≥ 85% on `test.jsonl`;
- ≥ 70% on every answer style in `probe.jsonl` and `test.jsonl`.

## Results

**v1 is the canonical CONTRACT_OBLIGATION_AUDIT evaluator: registration #210.** The node's reason (2026-11-23 18:18
UTC): "promoted: first Canonical for CONTRACT_OBLIGATION_AUDIT at 82.76% on 29 pairs (floor 70%, corpus 01f46baeb1a0)".
Full registry entry: [evidence/registration-210.json](evidence/registration-210.json).

**The registration** was signed by the owner at 15:36 UTC as a disclosed information-buying probe (ARCHITECTURE A7
probe rule), because v1 was under our 85% held-out bar.

| Item | Value |
|---|---|
| Package | `telegraph-factscore` `4298d6d` `season2/adapter/CONTRACT_OBLIGATION_AUDIT/v1/` |
| keccak256 | `0xbf759737…60e8` |
| Rank / alpha / max tokens | 8 / 32 / 512 |
| Training pairs | 3,000 |

**Measured before registration**, in the node runtime:

| Version | Kit | Own test | Unseen-style probe | Weak kinds | Evidence |
|---|---|---|---|---|---|
| v1 | 82.25% | 322/400 = 80.5% | 249/278 = 89.6% | party swap 52/78, status 9/21, CUAD present/absent 52/84 | [measure-coa_v1.json](evidence/measure-coa_v1.json) |
| v2 | 85.0% | 307/400 = 76.75% | 234/265 = 88.3% | same as v1 | [measure-coa_v2.json](evidence/measure-coa_v2.json) |

v2 (more names, deadline-relative status, more CUAD) was not better, and is not registered (GAPS G55).

**The node's remote check:**
- one batch of 30 texts (15 pairs) at 18:12 UTC;
- 82.5 s through the tunnel;
- the bits were confirmed by the node.

On every one of the 15 pairs, our adapter scored the first answer higher.

**What the public pairs hold, by kind.** This is the decoded capture, read for kinds only; the texts stay outside the
repo.

| Kind | Pairs |
|---|---|
| CUAD clause extraction as `{"clause","value","found"}` with a wrong value, clause label, party or date | 11 |
| Rubric-style meta answers ("identifies the specific…" vs "makes a generic statement…") | 3 |
| Legal reasoning about a settlement-authority clause | 1 |

One pair appeared twice.

**Disclosure.** Another contributor's pool rows also draw on CUAD, which v1 trains on. We never read a pool row, and
our pairs are our own construction. Still, the same public contracts can appear on both sides, so the hidden-sample
score may be easier for any CUAD-trained adapter. Reviewers should weigh it with that in mind.
