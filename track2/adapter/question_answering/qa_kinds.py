"""The seven failure kinds. Each recipe returns (chosen content, rejected content, format pool,
json inner pool, rejected short answer) or None when the item cannot carry that kind.

Orderings are only the defensible ones: the correct answer beats a wrong, non-responsive,
contradicted, off-topic or echoed answer, and beats a refusal. No pair puts a refusal against
a wrong answer in either direction.
"""
import qa_text as qt

KINDS = ["wrong_entity", "wrong_number_or_date", "nonresponsive", "contradicted", "refusal", "off_topic", "echo"]
SQUAD_ONLY = {"nonresponsive", "contradicted"}
ALL_FORMATS = ["bare", "sentence", "supported", "json"]
NQ_FORMATS = ["bare", "sentence", "json"]
INNER_ALL = ["bare", "sentence", "supported"]


def feasible(it):
    out = [k for k in KINDS if not (k in SQUAD_ONLY and it["title"] is None)]
    if it["atype"] not in ("date", "number"):
        out.remove("wrong_number_or_date")
    return out


def _nongold(it, rng, n, avoid=()):
    cand = [s for i, s in enumerate(it["sents"]) if i != it["gold_sent"]
            and not qt.contains_answer(s, it["golds"]) and s not in avoid and 25 <= len(s) <= 320]
    rng.shuffle(cand)
    return cand[:n]


def _gold_support(it):
    s, gi = it["sents"], it["gold_sent"]
    out = [s[gi]]
    nb = gi + 1 if gi + 1 < len(s) else gi - 1
    if 0 <= nb < len(s) and len(s[nb]) <= 320:
        out.append(s[nb])
    return out


def _ok_wrong(ans, it, forbidden):
    n = qt.normalise(ans)
    return n and n not in forbidden and not qt.same_answer(ans, it["golds"])


def _distractor(it, index, rng, forbidden, same_type=True):
    """Gold answer of another question in the same split: same article and type when possible."""
    pools = []
    if it["title"] and same_type:
        pools.append(index["by_title_type"].get((it["title"], it["atype"]), []))
    pools.append(index["by_type"].get(it["atype"], []) if same_type else index["all"])
    for pool in pools:
        for _ in range(12):
            if not pool:
                break
            d = pool[rng.randrange(len(pool))]
            if d["id"] != it["id"] and d["qnorm"] != it["qnorm"] and _ok_wrong(d["gold"], it, forbidden):
                return d
    return None


def build(kind, it, index, rng, forbidden):
    squad = it["title"] is not None
    if squad and len(it["sents"][it["gold_sent"]]) > 320:
        return None
    fmts = ALL_FORMATS if squad else NQ_FORMATS
    inner = INNER_ALL
    gold_sup = _gold_support(it) if squad else []
    fill = (lambda n: _nongold(it, rng, n)) if squad else (lambda n: [])
    if squad and len(fill(2)) < 1:
        return None
    # A right answer is not always next to the sentence that proves it (real services quote
    # nearby text), so "the stated answer is in the quote" must not decide the label.
    c_sup = gold_sup if not squad or rng.random() < 0.7 else fill(2)
    chosen = {"kind": "answer", "ans": it["gold"], "support": c_sup}
    if kind == "wrong_entity":
        d = _distractor(it, index, rng, forbidden)
        if d is None:
            return None
        same_art = squad and d["title"] == it["title"] and len(d["sents"][d["gold_sent"]]) <= 320
        sup = [d["sents"][d["gold_sent"]]] if same_art and rng.random() < 0.5 else fill(2)
        return chosen, {"kind": "answer", "ans": d["gold"], "support": sup}, fmts, inner, d["gold"]
    if kind == "wrong_number_or_date":
        p = qt.perturb(it["gold"], rng, forbidden)
        if p is None or not _ok_wrong(p, it, forbidden):
            return None
        sup = fill(2)
        if squad and rng.random() < 0.5:
            fab = qt.replace_span(it["sents"][it["gold_sent"]], it["gold"], p)
            if fab:
                sup = [fab]
        return chosen, {"kind": "answer", "ans": p, "support": sup}, fmts, inner, p
    if kind == "nonresponsive":
        gold_s = it["sents"][it["gold_sent"]]
        others = _nongold(it, rng, 4)
        if len(others) < 2:
            return None
        others.sort(key=lambda s: abs(len(s) - len(gold_s)))
        r_stmt, rest = others[0], others[1:]
        c = {"kind": "stmt", "stmt": gold_s, "support": [rest[0]]}
        r = {"kind": "stmt", "stmt": r_stmt, "support": [rest[-1]] if len(rest) > 1 else [rest[0]]}
        return c, r, ["sentence", "supported", "json"], ["sentence", "supported"], None
    if kind == "contradicted":
        if it["atype"] in ("date", "number") and rng.random() < 0.5:
            w = qt.perturb(it["gold"], rng, forbidden)
        else:
            d = _distractor(it, index, rng, forbidden)
            w = d["gold"] if d else None
        if not w or not _ok_wrong(w, it, forbidden):
            return None
        return chosen, {"kind": "answer", "ans": w, "support": gold_sup}, ["supported", "json"], ["supported"], w
    if kind == "refusal":
        return chosen, {"kind": "refusal", "support": fill(2)}, fmts, inner, None
    if kind == "echo":
        return chosen, {"kind": "echo", "support": fill(2)}, fmts, inner, None
    if kind == "off_topic":
        pool = index["squad"] if squad else index["nq"]
        for _ in range(20):
            o = pool[rng.randrange(len(pool))]
            if o["id"] == it["id"] or (squad and o["title"] == it["title"]) or o["qnorm"] == it["qnorm"]:
                continue
            if not _ok_wrong(o["gold"], it, forbidden) or qt.same_answer(it["gold"], o["golds"]):
                continue
            if squad and len(o["sents"][o["gold_sent"]]) > 320:
                continue
            sup = _gold_support(o) if squad else []
            return chosen, {"kind": "answer", "ans": o["gold"], "support": sup}, fmts, inner, o["gold"]
        return None
    raise ValueError(kind)
