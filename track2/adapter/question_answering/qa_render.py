"""Render one answer side in one of four formats: bare, sentence, supported, json.

Every random choice here (template, lead-in, caveat, key layout, confidence, citation count,
JSON spacing) is drawn the same way for the chosen and the rejected side: the renderer is
never told which side it renders. Content decides correctness; nothing else does.

content = {"kind": "answer" | "stmt" | "refusal" | "echo", "ans": str, "stmt": str,
           "support": [sentences], "title": str | None}
"""
import json
from urllib.parse import quote

ANSWER_SENTENCES = [
    "{a}.", "The answer is {a}.", "It is {a}.", "Answer: {a}", "{a}, according to the source.",
    "The source gives {a}.", "That is {a}.", "Short answer: {a}.", "{a} is the answer.",
    "The best supported answer is {a}.", "Based on the source, {a}.", "It was {a}.",
    "{a} - that is what the record shows.", "The reported answer: {a}.",
]
# v2: a negated answer. True when it negates a wrong answer, false when it negates the gold one; the two
# kinds that use it are built in equal numbers, so negation alone never marks a side (qa_kinds.NEGATION_KINDS).
NEG_SENTENCES = [
    "It is not {a}.", "The answer is not {a}.", "It was not {a}.", "That is not {a}.", "Not {a}.",
    "{a} is not the answer.", "{a} is not correct.", "No, it is not {a}.", "It isn't {a}.", "The source does not give {a}.",
]
NEG_BARE = ["Not {a}", "not {a}", "Not {a}.", "No - not {a}"]
REFUSAL_SHORT = ["Unknown.", "N/A", "Not found.", "No answer.", "No answer found.", "I don't know.",
                 "Unclear.", "No result.", "Cannot answer.", "No data.", "Unanswerable.", "None found.",
                 "No answer available.", "Answer not found.", "Unable to answer.", "Not available.", "Unanswered.",
                 "No answer could be found.", "The answer is not available.", "No answer in the sources.",
                 "Unable to determine the answer.", "No result for this question."]
REFUSAL_FILL = ["unknown", "not available", "not found in the sources", "none", "unclear", "no answer",
                "not stated", "undetermined", "not known", "unavailable"]
REFUSAL_LONG = [
    "No answer was found.", "I could not find an answer to that.", "The sources I checked do not answer this question.",
    "There is not enough information to answer.", "I was unable to determine the answer.",
    "No reliable answer is available.", "Sorry, I can't answer that.", "No matching result was returned.",
    "I could not find this in the sources.", "The answer could not be determined from the available sources.",
    "I don't have enough information to answer this.", "Nothing in the retrieved text answers the question.",
    "No source states this.", "This question could not be answered.", "I'm not able to answer that reliably.",
    "The lookup returned no answer.", "No confident answer could be given.", "Insufficient evidence to answer.",
]
ECHO = None  # set below from LEAD_INS: an echo is a lead-in with no answer after it
ECHO_BARE = ["{q}", "Question: {q}", "Q: {q} A:", "You asked: {q}", "Query received: {q}", "{q} Answer:"]
# Lead-ins share their words with echoes, so restating the question cannot mark the loser.
LEAD_INS = ["You asked: {q} ", "Question: {q} Answer: ", "{q} ", "Re: {q} - ", "On \"{q}\": ",
            "Here is what I found about this: {q} ", "Looking into: {q} ", "The question was: {q} ", "Query received: {q} "]
CAVEATS = [
    "No second source was found to confirm this.", "I could not verify this elsewhere.",
    "The source does not give more detail.", "This may be incomplete.", "Other sources were not checked.",
    "Treat this as unconfirmed.", "I am fairly sure of this.", "This is from one source only.",
    "The sources do not mention anything else.", "Confidence is moderate.",
]
# Hedges share their words with refusals, so refusal vocabulary alone cannot mark the loser.
HEDGES = [
    "I could not find a second source for this.", "No other source states this.", "I don't know of a source that says otherwise.",
    "Not certain; no second source was found.", "I cannot confirm this with another source.", "Unknown whether other sources agree.",
    "No further answer was found.", "I'm not able to check this elsewhere.", "There is not enough information to say more.",
    "The other sources I checked do not answer this.", "Sorry, I can't give more detail.", "No other matching result was returned.",
    "Other details are unclear.", "Anything further is unknown.", "No answer beyond this is available.", "Alternatives: none found.",
    "Related details were left unanswered.", "Further data: N/A.", "No other result.", "Other sources: none.",
]
ECHO = [x.strip() for x in LEAD_INS] + ["{q} Answer:", "Q: {q} A:"]
BARE_LEADS = [x.replace("Question: {q} Answer: ", "Q: {q} A: ") for x in LEAD_INS]
TEXT_KEYS = ["answer", "summary", "result"]
STATUS_OK = {"status": ["ok", "answered", "success", "found"], "verdict": ["answered", "found", "supported"]}
STATUS_NONE = {"status": ["not_found", "no_answer", "unanswered"], "verdict": ["not_found", "unanswered", "no_answer"]}
FORMATS_ALL = ["bare", "sentence", "supported", "json"]


def wiki_url(title):
    return "https://en.wikipedia.org/wiki/" + quote(title.replace(" ", "_"), safe="_()',-.")


def wiki_name(title):
    return title.replace("_", " ")


def _q(q):
    return q if q.rstrip().endswith("?") else q.rstrip() + "?"


def _sentence(c, q, rng):
    k = c["kind"]
    if k == "answer":
        body = rng.choice(ANSWER_SENTENCES).format(a=c["ans"].rstrip(" ."))
    elif k == "neg":
        body = rng.choice(NEG_SENTENCES).format(a=c["ans"].rstrip(" ."))
    elif k == "stmt":
        body = c["stmt"]
    elif k == "refusal":  # half the time an answer template filled with a non-answer
        body = rng.choice(REFUSAL_LONG) if rng.random() < 0.5 else             rng.choice(ANSWER_SENTENCES).format(a=rng.choice(REFUSAL_FILL))
    else:
        body = rng.choice(ECHO).format(q=_q(q))
    if k in ("refusal", "echo") and c.get("support") and (c.get("deco") or {}).get("quote"):
        # a non-answer that quotes on-topic text, as some services return
        body = body + " " + c["support"][0]
    deco = c.get("deco") or {}
    if deco.get("lead") and k != "echo":
        body = deco["lead"].format(q=_q(q)) + body
    if deco.get("caveat"):
        body = body + " " + deco["caveat"]
    return body


def _bare(c, q, rng):
    k = c["kind"]
    if k == "answer":
        body = c["ans"] + ("." if rng.random() < 0.3 and not c["ans"].endswith(".") else "")
        lead = (c.get("deco") or {}).get("lead")
        return (BARE_LEADS[LEAD_INS.index(lead)].format(q=_q(q)) + body) if lead else body
    if k == "neg":
        return rng.choice(NEG_BARE).format(a=c["ans"].rstrip(" ."))
    if k == "refusal":
        return rng.choice(REFUSAL_SHORT)
    if k == "echo":
        return rng.choice(ECHO_BARE).format(q=_q(q))
    return c["stmt"]


def _support(c, rng):
    sup = c.get("support") or []
    if not sup:
        return ""
    n = 1 if len(sup) == 1 or rng.random() < 0.6 else 2
    return " ".join(sup[:n])


def _supported(c, q, rng):
    head = _sentence(c, q, rng)
    tail = _support(c, rng)
    return (head + " " + tail).strip()


def _prose_source(text, c, ctx, rng):
    """An optional source note in prose, naming a real SQuAD article title."""
    title = _pick_title(ctx, rng)
    if not title or not (c.get("deco") or {}).get("src"):
        return text
    style = rng.randrange(3)
    if style == 0:
        return f"{text} (Source: Wikipedia, \"{wiki_name(title)}\")"
    if style == 1:
        return f"{text} [1]\nSources: [1] {wiki_url(title)}"
    return f"{text} Source: {wiki_name(title)} (Wikipedia)."


def _pick_title(ctx, rng):
    if not ctx.get("title"):
        return None
    if ctx.get("titles") and rng.random() < 0.3:
        return rng.choice(ctx["titles"])
    return ctx["title"]


def _confidence(rng):
    return round(rng.uniform(0.3, 0.99), 2)


def _json(c, q, rng, ctx, inner_pool):
    inner = rng.choice(inner_pool)
    text = {"bare": _bare, "sentence": _sentence, "supported": _supported}[inner](c, q, rng)
    refusal = c["kind"] == "refusal"
    obj = {}
    tk = rng.choice(TEXT_KEYS)
    obj[tk] = None if refusal and rng.random() < 0.3 else text
    if rng.random() < 0.25:  # a second text field, as some services repeat the answer
        other = rng.choice([k for k in TEXT_KEYS if k != tk])
        obj[other] = text if obj[tk] is None else obj[tk]
    if rng.random() < 0.7:
        obj["confidence"] = _confidence(rng)
    n_cit = 0
    if ctx.get("title") and rng.random() < 0.6:
        style = rng.choice(["source", "sources", "citations"])
        n_cit = 1 if style == "source" else rng.choice([1, 1, 2, 3])
        titles = list(dict.fromkeys(_pick_title(ctx, rng) for _ in range(n_cit)))
        n_cit = len(titles)
        if style == "source":
            obj["source"] = wiki_url(titles[0])
        elif style == "sources":
            obj["sources"] = [wiki_url(t) for t in titles]
        else:
            obj["citations"] = [{"n": i + 1, "title": wiki_name(t), "url": wiki_url(t)} for i, t in enumerate(titles)]
    if rng.random() < 0.6 or obj[tk] is None:
        sk = rng.choice(["status", "verdict"])
        honest = refusal and (obj[tk] is None or rng.random() < 0.5)
        obj[sk] = rng.choice((STATUS_NONE if honest else STATUS_OK)[sk])
    if rng.random() < 0.4:
        day = rng.randint(1, 28)
        obj[rng.choice(["checked_at", "as_of"])] = (f"2026-{rng.randint(1, 10):02d}-{day:02d}T"
                                                   f"{rng.randint(0, 23):02d}:{rng.randint(0, 59):02d}:00Z")
    if rng.random() < 0.4:
        obj["question"] = q
    keys = list(obj)
    rng.shuffle(keys)
    obj = {k: obj[k] for k in keys}
    style = rng.randrange(3)
    if style == 0:
        out = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    elif style == 1:
        out = json.dumps(obj, ensure_ascii=False)
    else:
        out = json.dumps(obj, ensure_ascii=False, indent=2)
    meta = {"inner": inner, "keys": sorted(obj), "confidence": obj.get("confidence"), "n_cit": n_cit}
    return out, meta


def draw_deco(rng, lead_p=0.2, hedge_p=0.15, caveat_p=0.15, src_p=0.25):
    """Decorations for one side, drawn once per side so that picking a rendering by length
    cannot pick decorations by label."""
    r = rng.random()
    caveat = rng.choice(HEDGES) if r < hedge_p else (rng.choice(CAVEATS) if r < hedge_p + caveat_p else None)
    return {"lead": rng.choice(LEAD_INS) if rng.random() < lead_p else None, "caveat": caveat,
            "src": rng.random() < src_p}


def render(fmt, c, q, rng, ctx):
    """(text, meta) for one side. ctx = {"title": pair article or None, "titles": same-split titles}."""
    has_sup = bool(c.get("support"))
    if fmt == "bare":
        return _bare(c, q, rng), {"format": "bare"}
    if fmt == "sentence":
        return _prose_source(_sentence(c, q, rng), c, ctx, rng), {"format": "sentence"}
    if fmt == "supported":
        return _prose_source(_supported(c, q, rng), c, ctx, rng), {"format": "supported"}
    pool = ctx["json_inner"]
    if not has_sup:
        pool = [p for p in pool if p != "supported"] or ["sentence"]
    text, meta = _json(c, q, rng, ctx, pool)
    meta["format"] = "json"
    return text, meta
