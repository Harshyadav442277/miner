"""Preference pairs for INVOICE_LEDGER_RECONCILE (generator v1). Every label is computed from the prompt's own figures.

The family's task (bounties #120): "Query supplies invoices, purchase orders and receipts and asks whether they
reconcile: three-way match on line items, quantities, tax and totals, and which entries do not tie out." Each query
here is assembled by this script, so the right reconciliation is known by construction:
- payable per line = min(invoiced qty, received qty) x PO price; tax is charged on the subtotal after any discount;
- discrepancy = invoice total - payable total (positive means the invoice over-bills);
- an entry "does not tie out" when its quantity exceeds the receipt, its price differs from the PO, it is not on the
  PO, or the invoice's tax or total is miscomputed.
The better answer gives the verdict, the discrepancy and every entry that does not tie out. The worse answer is the
same style with one thing wrong: the verdict, the amount, the entry named, a second discrepancy missed, tax computed
on the wrong base, or off-topic text. No pool row, public pair or miner answer is used.

    python -I generate_pairs.py --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json \
        --out C:/Users/hyada/tg-eval/pairs/ilr_v1

Writes train/val (train vendors and items), test (test-only vendors and items, another seed) and probe (test split,
answers in a markdown-table style training never uses).
"""
import argparse
import copy
import json
import os
import random
from decimal import ROUND_HALF_UP, Decimal

MAX_TOKENS = 500
VENDORS = ["Apex Steel", "Northwind Supply", "Kaveri Cement", "Bluegate Electricals", "Orion Packaging", "Sahyadri Agro",
           "Meridian Office", "Harbor Chemicals", "Vertex Fasteners", "Lumen Lighting", "Delta Paints", "Granite Works",
           "Pioneer Pipes", "Crescent Textiles", "Summit Tools", "Riverbend Foods", "Zenith Cables", "Atlas Logistics",
           "Coral Plastics", "Evergreen Timber"]
ITEMS = ["TMT bar 12 mm", "Portland cement bag", "Copper cable 4 sq mm", "Corrugated box", "LED panel 40 W",
         "Hex bolt M10", "Emulsion paint 20 L", "PVC pipe 110 mm", "Safety helmet", "Printer toner", "A4 paper ream",
         "Hydraulic oil 20 L", "Ball bearing 6205", "Cotton fabric roll", "Granite slab", "Packing tape", "Wheat flour 50 kg",
         "Circuit breaker 32 A", "Plywood sheet 18 mm", "Welding rod box", "Pallet wrap", "Gate valve 2 in",
         "Thermal label roll", "Drill bit set"]
CURRENCIES = [("USD", "$"), ("EUR", "€"), ("INR", "₹"), ("GBP", "£")]
ASKS = ["Reconcile invoice {inv} against PO {po} and goods receipt {grn}. Do they tie out?\n\n{docs}",
        "Three-way match check for {vendor}: invoice {inv}, purchase order {po}, receipt {grn}.\n{docs}\nWhich entries "
        "do not reconcile, and by how much?",
        "Does invoice {inv} reconcile with ledger {po}/{grn}? Check line items, quantities, tax and totals.\n\n{docs}",
        "AP review: match {inv} to {po} and {grn} and report any discrepancy.\n{docs}"]
KINDS = ["over_qty", "over_price", "not_on_po", "tax_error", "total_error", "two_issues"] + ["clean"] * 6  # 1:1 verdicts


def q(x):
    return Decimal(x).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def split_vocab(split):
    """A fixed fifth of vendors and items is test-only."""
    pick = (lambda i: i % 5 == 0) if split == "test" else (lambda i: i % 5 != 0)
    return [v for i, v in enumerate(VENDORS) if pick(i)], [t for i, t in enumerate(ITEMS) if pick(i)]


def scenario(rng, split):
    vendors, items = split_vocab(split)
    cur, sym = rng.choice(CURRENCIES)
    lines = []
    for name in rng.sample(items, rng.randint(2, 4)):
        qty = rng.randint(2, 60)
        price = q(rng.choice([Decimal(rng.randint(1, 99)) + Decimal(rng.choice(["0", "0.50", "0.25", "0.99"])), Decimal(rng.randint(100, 2500))]))
        lines.append(dict(item=name, po_qty=qty, po_price=price, recv=qty, inv_qty=qty, inv_price=price))
    kind = rng.choice(KINDS)
    issues = []
    tax_rate = Decimal(rng.choice(["0.05", "0.08", "0.12", "0.18", "0.20"]))
    discount = q(rng.choice([0, 0, 0, rng.randint(5, 80)]))
    tax_error = total_error = None

    def over_qty():
        ln = rng.choice(lines)
        ln["recv"] = max(1, ln["po_qty"] - rng.randint(1, max(1, ln["po_qty"] // 3)))
        issues.append(("qty", ln["item"]))

    def over_price():
        ln = rng.choice(lines)
        ln["inv_price"] = q(ln["po_price"] * Decimal(rng.choice(["1.05", "1.10", "1.15", "1.02"])))
        issues.append(("price", ln["item"]))

    if kind in ("over_qty", "two_issues"):
        over_qty()
    if kind in ("over_price", "two_issues"):
        over_price()
    if kind == "not_on_po":
        extra = rng.choice([t for t in items if t not in {ln["item"] for ln in lines}])
        lines.append(dict(item=extra, po_qty=0, po_price=None, recv=0, inv_qty=rng.randint(1, 10),
                          inv_price=q(rng.randint(5, 300))))
        issues.append(("not_on_po", extra))
    inv_sub = sum(q(ln["inv_qty"] * ln["inv_price"]) for ln in lines)
    inv_tax = q((inv_sub - discount) * tax_rate)
    if kind == "tax_error":
        tax_error = q(inv_sub * tax_rate)  # tax on the pre-discount subtotal
        if discount == 0:
            tax_error = q((inv_sub - discount) * (tax_rate + Decimal("0.01")))
        inv_tax = tax_error
        issues.append(("tax", None))
    inv_total = q(inv_sub - discount + inv_tax)
    if kind == "total_error":
        inv_total = q(inv_total + Decimal(rng.choice([10, 25, 50, 100, 1, 9])))
        total_error = True
        issues.append(("total", None))
    pay_sub = sum(q(min(ln["inv_qty"], ln["recv"]) * ln["po_price"]) for ln in lines if ln["po_price"] is not None)
    pay_total = q(pay_sub - discount + q((pay_sub - discount) * tax_rate))
    return dict(vendor=rng.choice(vendors), cur=cur, sym=sym, lines=lines, tax_rate=tax_rate, discount=discount,
                inv_sub=inv_sub, inv_tax=inv_tax, inv_total=inv_total, pay_total=pay_total,
                diff=q(inv_total - pay_total), issues=issues, kind=kind,
                inv=f"INV-{rng.randint(1000, 9999)}", po=f"PO-{rng.randint(10000, 99999)}",
                grn=f"GRN-{rng.randint(100, 999)}")


def render_docs(s, rng):
    m = lambda x: f"{s['sym']}{x:,.2f}"  # noqa: E731
    po = "\n".join(f"- {ln['item']}: {ln['po_qty']} @ {m(ln['po_price'])}" for ln in s["lines"] if ln["po_price"])
    grn = "\n".join(f"- {ln['item']}: {ln['recv']} received" for ln in s["lines"] if ln["po_price"])
    inv = "\n".join(f"- {ln['item']}: {ln['inv_qty']} x {m(ln['inv_price'])} = {m(q(ln['inv_qty'] * ln['inv_price']))}"
                    for ln in s["lines"])
    foot = f"Subtotal {m(s['inv_sub'])}"
    if s["discount"]:
        foot += f"; discount {m(s['discount'])}"
    foot += f"; tax {int(s['tax_rate'] * 100)}% {m(s['inv_tax'])}; total {m(s['inv_total'])} ({s['cur']})"
    blocks = [f"Purchase order {s['po']} ({s['vendor']}):\n{po}", f"Goods receipt {s['grn']}:\n{grn}",
              f"Invoice {s['inv']}:\n{inv}\n{foot}"]
    if rng.random() < 0.3:
        blocks = [blocks[2], blocks[0], blocks[1]]
    return "\n\n".join(blocks)


def findings(s, issues, m):
    out = []
    by = {ln["item"]: ln for ln in s["lines"]}
    for kind, item in issues:
        ln = by.get(item)
        if kind == "qty":
            out.append(f"{item}: invoiced {ln['inv_qty']} but only {ln['recv']} received")
        elif kind == "price":
            out.append(f"{item}: billed at {m(ln['inv_price'])} against PO price {m(ln['po_price'])}")
        elif kind == "not_on_po":
            out.append(f"{item}: on the invoice but not on {s['po']}")
        elif kind == "tax":
            out.append(f"tax: invoice charges {m(s['inv_tax'])}; {int(s['tax_rate'] * 100)}% of the taxable value "
                       f"is {m(q((s['inv_sub'] - s['discount']) * s['tax_rate']))}")
        elif kind == "total":
            out.append(f"total: invoice states {m(s['inv_total'])}, but its own lines, discount and tax add to "
                       f"{m(q(s['inv_sub'] - s['discount'] + s['inv_tax']))}")
    return out


def answer(s, style, reconciled, diff, issues, payable=None):
    """Every answer states the same three things: what does not tie out, what does, and the payable total."""
    m = lambda x: f"{s['sym']}{x:,.2f}"  # noqa: E731
    payable = s["pay_total"] if payable is None else payable
    items = findings(s, issues, m)
    n = sum(1 for ln in s["lines"] if ln["po_price"])
    named = len({i for k, i in issues if i and k != "not_on_po"})
    if items:
        rest = n - named
        items.append(f"the other {rest} line{'s' if rest != 1 else ''} match {s['po']} and {s['grn']}" if rest
                     else f"no line of {s['inv']} ties out")
    else:
        taxable = q(s["inv_sub"] - s["discount"])
        items = [f"all {n} lines match {s['po']} prices and {s['grn']} quantities",
                 f"tax {int(s['tax_rate'] * 100)}% on {m(taxable)} is {m(q(taxable * s['tax_rate']))}"]
    items.append(f"payable {m(payable)}")
    if style == "json":
        return json.dumps({"reconciled": reconciled, "discrepancy": float(diff), "currency": s["cur"],
                           "explanation": "; ".join(items)}, ensure_ascii=False)
    head = "Reconciled." if reconciled else "Not reconciled."
    if style == "table":
        rows = "\n".join(f"| {i} |" for i in items)
        return f"| Result | Discrepancy |\n|---|---|\n| {head} | {m(diff)} |\n\n| Check |\n|---|\n{rows}"
    if style == "bullets":
        return f"{head} Discrepancy: {m(diff)}.\n" + "\n".join(f"- {i}" for i in items)
    return f"{head} {s['inv']} against {s['po']} and {s['grn']}, discrepancy {m(diff)}: " + "; ".join(items) + "."


def pair(rng, split, styles):
    s = scenario(rng, split)
    style = rng.choice(styles)
    ok = not s["issues"]
    chosen = answer(s, style, ok, s["diff"], s["issues"])
    priced = [ln for ln in s["lines"] if ln["po_price"]]
    # Weights: most worse answers are wrong in a way the documents show directly (the verdict, the line, a missed line);
    # a few differ only in an amount. Wrong-verdict negatives are about equally common on clean and on mismatched
    # invoices, so neither verdict's wording leans to one side. No refusals: they are too easy to teach anything.
    if ok:
        weights = {"verdict": 3, "payable": 2}
    else:
        weights = {"verdict": 4, "wrong_entry": 4, "amount": 1}
        if len(s["issues"]) > 1:
            weights["missed"] = 2
        if s["discount"]:
            weights["tax_base"] = 1
    bad = rng.choices(list(weights), weights=list(weights.values()))[0]
    if bad == "verdict" and ok:  # invent a shortfall or an overcharge that the documents do not show
        t = copy.deepcopy(s)
        ln = rng.choice([x for x in t["lines"] if x["po_price"]])
        if rng.random() < 0.5:
            ln["recv"] = max(1, ln["recv"] - rng.randint(1, 3))
            over, kind = q((ln["inv_qty"] - ln["recv"]) * ln["po_price"]), "qty"
        else:
            ln["po_price"] = q(ln["po_price"] * Decimal(rng.choice(["0.90", "0.95", "0.98"])))
            over, kind = q(ln["inv_qty"] * (ln["inv_price"] - ln["po_price"])), "price"
        over = q(over * (1 + t["tax_rate"]))
        rejected = answer(t, style, False, over, [(kind, ln["item"])], q(s["pay_total"] - over))
    elif bad == "verdict":
        rejected = answer(s, style, True, q(0), [], s["inv_total"])
    elif bad == "payable":  # right verdict, wrong payable total
        rejected = answer(s, style, True, q(0), [], q(s["pay_total"] + rng.choice([-1, 1]) * rng.choice([5, 10, 25, 100])))
    elif bad == "amount":
        rejected = answer(s, style, False, q(s["diff"] + rng.choice([-1, 1]) * Decimal(rng.choice(["5", "10", "12.50", "50", "100"]))),
                          s["issues"])
    elif bad == "missed":
        rejected = answer(s, style, False, s["diff"], s["issues"][:-1])
    elif bad == "wrong_entry":
        named = {i for _, i in s["issues"]}
        clean = [ln["item"] for ln in priced if ln["item"] not in named]
        first = next((n for n, (k, i) in enumerate(s["issues"]) if k in ("qty", "price")), None)
        if not clean or first is None:
            return None
        t = copy.deepcopy(s)
        src = next(x for x in t["lines"] if x["item"] == s["issues"][first][1])
        pick = rng.choice(clean)
        dst = next(x for x in t["lines"] if x["item"] == pick)
        for key in ("recv", "inv_qty", "inv_price", "po_price"):  # the same finding, pinned on a line that ties out
            src[key], dst[key] = dst[key], src[key]
        issues = [(k, dst["item"] if n == first else i) for n, (k, i) in enumerate(s["issues"])]
        rejected = answer(t, style, False, s["diff"], issues)
    else:  # tax_base: tax on the subtotal before the discount
        wrong_pay = q(s["pay_total"] + s["discount"] * s["tax_rate"])
        rejected = answer(s, style, False, q(s["inv_total"] - wrong_pay), s["issues"], wrong_pay)
    if rejected == chosen:
        return None
    ask = rng.choice(ASKS).format(inv=s["inv"], po=s["po"], grn=s["grn"], vendor=s["vendor"], docs=render_docs(s, rng))
    return dict(prompt=ask, chosen=chosen, rejected=rejected, kind=s["kind"], bad=bad, style=style)


def build(n, seed, split, tok, styles):
    rng = random.Random(seed)
    rows, seen = [], set()
    while len(rows) < n:
        r = pair(rng, split, styles)
        if not r or r["prompt"] in seen:
            continue
        lens = [len(tok.encode(f"### Task:\n{r['prompt']}\n\n### Answer:\n{r[k]}").ids) for k in ("chosen", "rejected")]
        if max(lens) > MAX_TOKENS:
            continue
        seen.add(r["prompt"])
        rows.append(r)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=3000)
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    os.makedirs(a.out, exist_ok=True)
    styles = ["json", "prose", "bullets"]
    train = build(a.n + 300, 7, "train", tok, styles)
    sets = {"train": train[:a.n], "val": train[a.n:], "test": build(400, 97, "test", tok, styles),
            "probe": build(300, 131, "test", tok, ["table"])}
    for name, rows in sets.items():
        with open(os.path.join(a.out, f"{name}.jsonl"), "w", encoding="utf-8", newline="\n") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(name, len(rows))


if __name__ == "__main__":
    main()
