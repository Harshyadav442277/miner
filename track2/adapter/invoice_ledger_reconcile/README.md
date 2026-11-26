# INVOICE_LEDGER_RECONCILE adapter lane (opened 2026-11-26)

**Why this family:**
- it has no champion, and no adapter has ever been judged there: its one registration, #196, was refused at the
  batch request (`/api/wasm`, 2026-11-26 03:45 UTC);
- its pool snapshot is active: 130 eligible rows from 4 submitters (`/api/evalpool/status`, 2026-11-26);
- the query carries the truth: "Query supplies invoices, purchase orders and receipts and asks whether they
  reconcile: three-way match on line items, quantities, tax and totals, and which entries do not tie out"
  (bounties #120), the same property that made CONTRACT_OBLIGATION_AUDIT #210 canonical;
- LiveCert does not serve this intent.

**What the pool is known to hold:** one contributor describes 10 rows of three-way PO-GRN-invoice matching on Indian
construction purchases (steel weighbridge rejections, concrete slump rejections, retention, advance and TDS tie-out,
tare vs net weight, discounts in the tax base; bounties #120). The rows themselves are not public, and none is used.
v1 covers quantity, price, unlisted lines, tax base and totals; retention, advances and TDS are not covered yet.

## Data: [generate_pairs.py](generate_pairs.py) (v1)

Each query is a purchase order, a goods receipt and an invoice that this script builds, so the right reconciliation is
computed, not judged: payable per line = min(invoiced, received) × PO price; tax on the subtotal after discount;
discrepancy = invoice total − payable total.

| Better answer | Worse answer (same style, about the same length) |
|---|---|
| The verdict, the discrepancy, every entry that does not tie out, the lines that do, and the payable total | the wrong verdict (an invented shortfall or overcharge on a clean invoice, or "reconciled" on a mismatched one); the finding pinned on a line that ties out; a second discrepancy missed; a wrong amount or payable total; tax on the pre-discount subtotal |

- Half the invoices are clean, so neither verdict's wording leans to one side. There are no refusal negatives.
- Splits: a fixed fifth of vendors and items is test-only; test uses seed 97; `probe.jsonl` answers in a markdown
  table that training never sees. 3,000 train, 300 val, 400 test, 300 probe (`tg-eval/pairs/ilr_v1`).

**Kit dataset gate, 2026-11-26: PASS** on 3,000 pairs:

| Check | Value |
|---|---|
| Unique negatives | 100.0% |
| Largest single negative | 0.0% |
| Length shortcut | 53.5% |
| Held-out leak | 0.0% |
| Bag-of-words probe | 60.7% |

The first two builds failed this gate (length 65.6%, bag-of-words 69.4% and 72.0%): clean invoices were 30% of
scenarios, so "Not reconciled" leaned to the chosen side, and the invented shortfall always used the same words.
Residual tells: tax and total findings appear only on the chosen side; some item names lean slightly rejected.

```bash
python -I generate_pairs.py --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/ilr_v1
```

## Training and measurement

- Job `INVOICE_LEDGER_RECONCILE:ilr_v1:ilr_v1` (rank 8, alpha 32, 3 epochs, lr 1e-4), queued 2026-11-26 04:01 UTC
  behind es_v2.
- **Baseline before it is offered:** GENERIC #900005 on the same test and probe sets in the node runtime. If GENERIC
  already orders them, this lane adds nothing and stops.
- Before signing, measured in the node runtime (`../../harness/measure.py`): our test and probe, with the length
  baselines and GENERIC. There is no public-pair capture yet: this family has never been checked.

## Results

Kit 84.75% (length baseline 54%). Node runtime, first 150 pairs: test 121/150 = 80.7%, probe 116/150 = 77.3%; longer-wins 34.7% / 28.7%, shorter-wins 39.3% / 41.3% ([measure-ilr_v1.json](evidence/measure-ilr_v1.json)). Weak: over-price 10/18, clean 69/83. Offered for signing as a disclosed probe (SIGN_S2.md), 2026-11-26.
