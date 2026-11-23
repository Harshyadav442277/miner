"""Synthetic contracts whose obligations are known by construction (CONTRACT_OBLIGATION_AUDIT, generator v1).

A contract is a list of clauses. Each obligation clause is built from a record (who owes what to whom, how much,
by when), so the correct audit is derived from the record, never written by hand. Boilerplate clauses that
create no obligation are mixed in, so an answer has to tell obligations from the rest of the text.

`split` keeps names and items apart between train and test: a test contract never reuses a train company or item.
"""
import datetime as dt
import hashlib
import random

PREFIX = ["Acme", "Birch", "Cobalt", "Delta", "Ember", "Fjord", "Granite", "Harbor", "Iris", "Juniper", "Keystone",
          "Lumen", "Maple", "Nimbus", "Orchid", "Pioneer", "Quarry", "Redwood", "Summit", "Tidal", "Umber", "Vertex",
          "Willow", "Xenon", "Yarrow", "Zephyr", "Alder", "Basalt", "Cedar", "Dune", "Elm", "Flint", "Garnet", "Hazel"]
# v2: about 600 generated names, so party direction is learned rather than a few names memorised.
HEADS = ["Al", "Bri", "Cor", "Dal", "Eve", "Fen", "Gor", "Hal", "Ivo", "Jas", "Kel", "Lor", "Mar",
         "Nor", "Ost", "Pel", "Quen", "Ros", "Sil", "Tor", "Ul", "Val", "Wex", "Yor", "Zan"]
TAILS = ["ton", "vex", "mark", "ridge", "wave", "line", "stone", "field", "core", "nova", "gate",
         "wood", "bay", "crest", "forge", "haven", "point", "brook", "dale", "stream", "works", "peak",
         "light", "well"]
NAMES = PREFIX + [h + t for h in HEADS for t in TAILS]
SUFFIX = ["Ltd", "Corp", "GmbH", "LLC", "Inc.", "S.A.", "Pty Ltd", "B.V.", "plc", "Holdings"]
ITEMS = ["steel brackets", "server racks", "LED panels", "pallets of flour", "laptops", "solar inverters",
         "safety helmets", "printed manuals", "copper cables", "office chairs", "water filters", "lithium cells",
         "glass bottles", "circuit boards", "seed bags", "air compressors", "tyres", "medical gloves", "valves",
         "cement bags", "routers", "textbooks", "paint drums", "forklift batteries"]
SERVICES = ["hosted platform", "payroll service", "data warehouse", "customer portal", "call centre", "API gateway",
            "logistics tracking system", "email service"]
CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "JPY"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
          "November", "December"]
TITLES = ["Supply Agreement", "Master Services Agreement", "Purchase Agreement", "Services Agreement",
          "Distribution Agreement", "Maintenance Agreement", "Consulting Agreement", "Lease"]
BOILERPLATE = [
    "This Agreement is governed by the laws of {law}.",
    "Headings are for convenience only and do not affect interpretation.",
    "This Agreement may be executed in counterparts, each of which is an original.",
    "Notices must be in writing and sent to the addresses set out above.",
    "If any provision is held invalid, the remaining provisions continue in full force.",
    "This Agreement is the entire agreement between the parties on its subject matter.",
    "No failure to exercise a right is a waiver of that right.",
]
LAWS = ["England and Wales", "the State of New York", "Delaware", "Singapore", "Ontario", "New South Wales", "Germany"]


def in_split(word, split):
    """A fixed fifth of every vocabulary is test-only."""
    test = int(hashlib.sha256(word.encode()).hexdigest(), 16) % 5 == 0
    return test == (split == "test")


def date_text(d):
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}"


def money(rng):
    return rng.choice([500, 1200, 2000, 4500, 7800, 12000, 25000, 40000, 95000, 150000]) * rng.choice([1, 1, 2, 3])


def new_contract(rng, split):
    names = [p for p in NAMES if in_split(p, split)]
    items = [i for i in ITEMS if in_split(i, split)]
    a, b = rng.sample(names, 2)
    a, b = f"{a} {rng.choice(SUFFIX)}", f"{b} {rng.choice(SUFFIX)}"
    cur = rng.choice(CURRENCIES)
    start = dt.date(2026, 1, 1) + dt.timedelta(days=rng.randrange(0, 700))
    obligations = []
    kinds = rng.sample(["deliver", "pay", "uptime", "report", "insure", "penalty", "confidential"], rng.randint(2, 4))
    if "penalty" in kinds and "deliver" not in kinds:
        kinds[kinds.index("penalty")] = "deliver"
    if "pay" not in kinds and rng.random() < 0.7:
        kinds.append("pay")
    due = start + dt.timedelta(days=rng.randrange(20, 200))
    for k in kinds:
        if k == "deliver":
            o = dict(kind=k, party=a, other=b, qty=rng.choice([20, 50, 100, 250, 500, 1200]), item=rng.choice(items),
                     due=due)
        elif k == "pay":
            o = dict(kind=k, party=b, other=a, amount=money(rng), cur=cur, days=rng.choice([10, 14, 30, 45, 60]),
                     after_delivery="deliver" in kinds)
            if not o["after_delivery"]:
                o["due"] = start + dt.timedelta(days=rng.randrange(15, 120))
        elif k == "uptime":
            o = dict(kind=k, party=a, other=b, pct=rng.choice(["99.5", "99.9", "99.95", "98"]),
                     service=rng.choice(SERVICES))
        elif k == "report":
            o = dict(kind=k, party=a, other=b, freq=rng.choice(["monthly", "quarterly"]),
                     days=rng.choice([5, 10, 15, 30]), topic=rng.choice(["performance", "stock levels", "incidents"]))
        elif k == "insure":
            o = dict(kind=k, party=rng.choice([a, b]), amount=money(rng) * 10, cur=cur,
                     cover=rng.choice(["public liability", "professional indemnity", "product liability"]))
        elif k == "penalty":
            o = dict(kind=k, party=a, other=b, pct=rng.choice([0.5, 1, 2, 5]), unit=rng.choice(["week", "day"]))
        else:
            o = dict(kind=k, party=b, other=a, years=rng.choice([1, 2, 3, 5]),
                     thing=rng.choice(["pricing", "source code", "customer data", "terms of this Agreement"]))
        obligations.append(o)
    rng.shuffle(obligations)
    filler = rng.sample(BOILERPLATE, rng.randint(1, 3))
    return dict(title=rng.choice(TITLES), a=a, b=b, start=start, obligations=obligations,
                filler=[f.format(law=rng.choice(LAWS)) for f in filler])


def clause(o):
    k = o["kind"]
    if k == "deliver":
        return f"{o['party']} shall deliver {o['qty']} {o['item']} to {o['other']} by {date_text(o['due'])}."
    if k == "pay":
        when = (f"within {o['days']} days of delivery" if o.get("after_delivery")
                else f"by {date_text(o['due'])}")
        return f"{o['party']} shall pay {o['cur']} {o['amount']:,} {when}."
    if k == "uptime":
        return f"{o['party']} shall maintain {o['pct']}% monthly uptime for the {o['service']}."
    if k == "report":
        return (f"{o['party']} shall give {o['other']} a {o['freq']} {o['topic']} report within {o['days']} days "
                f"after each period ends.")
    if k == "insure":
        return f"{o['party']} shall maintain {o['cover']} insurance of at least {o['cur']} {o['amount']:,}."
    if k == "penalty":
        return f"Late delivery by {o['party']} incurs a penalty of {o['pct']}% of the price per {o['unit']}."
    return f"{o['party']} shall keep the {o['thing']} confidential for {o['years']} years after termination."


def contract_text(c, rng):
    parts = [clause(o) for o in c["obligations"]] + c["filler"]
    rng.shuffle(parts)
    head = f"{c['title']} between {c['a']} and {c['b']}, dated {date_text(c['start'])}."
    if rng.random() < 0.5:
        return head + " " + " ".join(f"{i}. {p}" for i, p in enumerate(parts, 1))
    return head + "\n" + "\n".join(parts)


def statement(o):
    """The audit's plain statement of one obligation (the same facts as its clause, reworded)."""
    k = o["kind"]
    if k == "deliver":
        return f"{o['party']} must deliver {o['qty']} {o['item']} to {o['other']} by {date_text(o['due'])}"
    if k == "pay":
        when = (f"within {o['days']} days after delivery" if o.get("after_delivery")
                else f"by {date_text(o['due'])}")
        return f"{o['party']} must pay {o['cur']} {o['amount']:,} {when}"
    if k == "uptime":
        return f"{o['party']} must keep the {o['service']} at {o['pct']}% monthly uptime"
    if k == "report":
        return f"{o['party']} must send {o['other']} a {o['freq']} {o['topic']} report within {o['days']} days of period end"
    if k == "insure":
        return f"{o['party']} must hold {o['cover']} insurance of at least {o['cur']} {o['amount']:,}"
    if k == "penalty":
        return f"{o['party']} owes a late-delivery penalty of {o['pct']}% of the price per {o['unit']}"
    return f"{o['party']} must keep the {o['thing']} confidential for {o['years']} years after termination"


def new_rng(seed):
    return random.Random(seed)
