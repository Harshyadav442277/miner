"""Text helpers for the QUESTION_ANSWERING pair builder: normalisation, sentences, answer
types and near-miss perturbation of figures and dates. Pure functions, no randomness of
their own (callers pass a random.Random)."""
import re
import unicodedata

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]
NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
             "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
             "eighteen", "nineteen", "twenty"]
_NUMWORD_RE = re.compile(r"\b(" + "|".join(NUM_WORDS[1:]) + r")\b", re.I)
_DIGITS_RE = re.compile(r"\d[\d,]*(?:\.\d+)?")
_YEAR_RE = re.compile(r"\b(1[0-9]{3}|20[0-2][0-9])\b")
_MONTH_RE = re.compile(r"\b(" + "|".join(MONTHS) + r")\b")
_SENT_RE = re.compile(r"(?<=[.!?])[\"')\]]?\s+(?=[A-Z0-9\"'(])")

PERSON_Q = re.compile(r"^\s*(who|whom|whose)\b", re.I)
PLACE_Q = re.compile(r"^\s*where\b|\b(what|which) (country|city|state|town|county|continent|region|"
                     r"province|island|river|place|location|nation)\b", re.I)
ORG_Q = re.compile(r"\b(company|organi[sz]ation|team|university|college|band|party|club|group|agency|"
                   r"network|school|church|firm|label|army|newspaper)\b", re.I)


def normalise(text, punct=""):
    """Lowercase, strip accents and punctuation (Unicode category P*), collapse spaces.
    punct=" " turns punctuation into a space instead (a second key for exclusion matching)."""
    text = unicodedata.normalize("NFKD", unicodedata.normalize("NFKC", text)).lower()
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = "".join(" " if unicodedata.category(ch) == "Zs" else ch for ch in text)
    cut = ("P", "S") if punct else ("P",)  # the spaced key also splits symbols ("$800" -> "800")
    text = "".join(punct if unicodedata.category(ch).startswith(cut) else ch for ch in text)
    return " ".join(text.split())


def question_keys(text):
    """Both normalisations of a question, so an exclusion matches either way."""
    return {normalise(text), normalise(text, " ")}


def clean(text):
    """Collapse whitespace, including non-breaking spaces, without changing anything else."""
    return " ".join(unicodedata.normalize("NFKC", text).split())


def sentences(context):
    """(start, end, text) spans of the sentences of a paragraph."""
    spans, prev = [], 0
    for m in _SENT_RE.finditer(context):  # a match is the optional closing quote plus the space
        spans.append((prev, m.start() + len(m.group(0).rstrip())))
        prev = m.end()
    spans.append((prev, len(context)))
    return [(s, e, context[s:e].strip()) for s, e in spans if context[s:e].strip()]


def answer_type(question, answer):
    """person, place, organisation, date, number or other: from the question's wh-word and
    the answer's shape. Heuristic; used only to pick distractors of the same kind."""
    if _YEAR_RE.search(answer) or _MONTH_RE.search(answer) or re.match(r"^\s*when\b", question, re.I):
        if _YEAR_RE.search(answer) or _MONTH_RE.search(answer) or _DIGITS_RE.search(answer):
            return "date"
    if _DIGITS_RE.search(answer) or _NUMWORD_RE.fullmatch(answer.strip()):
        return "number"
    caps = answer[:1].isupper()
    if PERSON_Q.search(question) and caps:
        return "person"
    if PLACE_Q.search(question) and caps:
        return "place"
    if ORG_Q.search(question) and caps:
        return "organisation"
    return "other"


def _fmt_int(n, like):
    s = f"{n:,}" if "," in like else str(n)
    return s


def _perturb_int(n, rng, is_year):
    if is_year:
        for _ in range(20):
            m = n + rng.choice([-10, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10])
            if 1000 <= m <= 2026:
                return m
        return None
    if n <= 3:
        return n + rng.choice([1, 2, 3])
    span = max(1, round(n * 0.25))
    for _ in range(20):
        m = n + rng.choice([-1, 1]) * rng.randint(1, span)
        if m > 0 and m != n:
            return m
    return None


def perturb(answer, rng, forbidden=frozenset()):
    """A near miss of a figure or date in `answer`, or None. Never returns the answer itself, a
    string whose normalised form is in `forbidden`, or anything absurd (years stay 1000-2026,
    counts stay positive, changes are small)."""
    for _ in range(12):
        out = _perturb_once(answer, rng)
        if out and normalise(out) != normalise(answer) and normalise(out) not in forbidden:
            return out
    return None


def _perturb_once(answer, rng):
    digits = list(_DIGITS_RE.finditer(answer))
    words = list(_NUMWORD_RE.finditer(answer))
    months = list(_MONTH_RE.finditer(answer))
    choices = []
    if digits:
        choices.append("digit")
    if words:
        choices.append("word")
    if months and digits:
        choices.append("month")
    if not choices:
        return None
    pick = rng.choice(choices)
    if pick == "month":
        m = rng.choice(months)
        i = MONTHS.index(m.group(1))
        j = (i + rng.choice([-2, -1, 1, 2])) % 12
        return answer[:m.start()] + MONTHS[j] + answer[m.end():]
    if pick == "word":
        m = rng.choice(words)
        i = NUM_WORDS.index(m.group(1).lower())
        j = i + rng.choice([-2, -1, 1, 2]) if i > 2 else i + rng.choice([1, 2])
        if not 1 <= j < len(NUM_WORDS):
            return None
        w = NUM_WORDS[j]
        w = w.capitalize() if m.group(1)[0].isupper() else w
        return answer[:m.start()] + w + answer[m.end():]
    m = rng.choice(digits)
    tok = m.group(0).rstrip(",")
    if "." in tok:
        whole, frac = tok.replace(",", "").split(".")
        val = float(tok.replace(",", ""))
        step = 10 ** -len(frac)
        new = val + rng.choice([-1, 1]) * step * rng.randint(1, max(1, int(round(val * 0.2 / step))))
        if new <= 0:
            return None
        rep = f"{new:.{len(frac)}f}"
    else:
        n = int(tok.replace(",", ""))
        is_year = len(tok) == 4 and "," not in tok and 1000 <= n <= 2026
        day = bool(months) and n <= 31
        if day:
            new = n + rng.choice([-3, -2, -1, 1, 2, 3])
            new = new if 1 <= new <= 28 else None
        else:
            new = _perturb_int(n, rng, is_year)
        if new is None:
            return None
        rep = _fmt_int(new, tok)
    return answer[:m.start()] + rep + answer[m.start() + len(tok):]


def contains_answer(text, answers):
    """True when the normalised text contains any normalised answer as whole words."""
    t = " " + normalise(text, " ") + " "  # punctuation as space, so JSON quotes and "Smith's" split words
    # an answer that is only symbols ("≥") is matched as raw text
    return any((" " + normalise(a, " ") + " ") in t if normalise(a, " ") else (a.strip() and a.strip() in text)
               for a in answers)


def same_answer(a, answers):
    na = normalise(a)
    return any(na == normalise(b) or (na and (" " + na + " ") in (" " + normalise(b) + " "))
               or (normalise(b) and (" " + normalise(b) + " ") in (" " + na + " ")) for b in answers)


def replace_span(sentence, old, new):
    """Replace the first occurrence of `old` in `sentence`; None when it does not occur."""
    i = sentence.find(old)
    if i < 0:
        return None
    return sentence[:i] + new + sentence[i + len(old):]
