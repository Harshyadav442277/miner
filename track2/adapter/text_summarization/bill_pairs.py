"""Bill-summary pairs for TEXT_SUMMARIZATION v2, from short 116th/117th-Congress bills and their CRS summaries
(filter_bills.py; CC0 dataset, government text).

The better answer is the CRS summary, written by the Congressional Research Service for that exact bill text. The
worse answer is the same summary with one claim the bill does not support:
- a number that is in both the bill and the summary is changed to one that is in neither;
- an agency or official named in the summary is swapped for one the bill never names;
- a duty is flipped ("requires" for "prohibits", and the like);
- a sentence from another bill's summary is added.
The swap is checked against the bill text, so the worse answer is wrong by construction.
"""
import json
import re

AGENCIES = ["Department of Agriculture", "Department of Energy", "Department of Defense", "Department of Education",
            "Department of Transportation", "Department of Veterans Affairs", "Department of the Treasury",
            "Department of Homeland Security", "Department of Health and Human Services", "Department of Labor",
            "Department of the Interior", "Department of Commerce", "Department of Justice", "Department of State",
            "Environmental Protection Agency", "Small Business Administration", "Federal Communications Commission",
            "Securities and Exchange Commission", "Federal Trade Commission", "Social Security Administration"]
OFFICIALS = ["Secretary of Agriculture", "Secretary of Energy", "Secretary of Defense", "Secretary of Education",
             "Secretary of Transportation", "Secretary of Veterans Affairs", "Secretary of the Treasury",
             "Secretary of Homeland Security", "Secretary of Health and Human Services", "Secretary of Labor",
             "Secretary of the Interior", "Secretary of Commerce", "Attorney General", "Secretary of State"]
FLIPS = [("requires", "prohibits"), ("prohibits", "requires"), ("authorizes", "prohibits"), ("increases", "decreases"),
         ("expands", "restricts"), ("establishes", "abolishes"), ("extends", "terminates"), ("must", "may not")]


def load(path):
    return [json.loads(l) for l in open(path, encoding="utf-8")]


def change_number(rng, summary, text):
    nums = [m for m in re.finditer(r"\b\d[\d,]*\b", summary) if m.group() in text and len(m.group()) <= 9]
    if not nums:
        return None
    m = rng.choice(nums)
    v = int(m.group().replace(",", ""))
    for _ in range(10):
        w = v + rng.choice([-3, -2, -1, 1, 2, 3, 5, 10]) * max(1, v // 10)
        if w > 0 and str(w) not in text and f"{w:,}" not in text:
            new = f"{w:,}" if "," in m.group() else str(w)
            return summary[:m.start()] + new + summary[m.end():]
    return None


def swap_name(rng, summary, text):
    for pool in (OFFICIALS, AGENCIES):
        named = [x for x in pool if x in summary]
        absent = [x for x in pool if x not in text and x not in summary]
        if named and absent:
            x = rng.choice(named)
            return summary.replace(x, rng.choice(absent))
    return None


def flip(rng, summary, text):
    options = [(a, b) for a, b in FLIPS if re.search(rf"\b{a}\b", summary)]
    if not options:
        return None
    a, b = rng.choice(options)
    return re.sub(rf"\b{a}\b", b, summary, count=1)


def add_foreign(rng, summary, other):
    sents = [s.strip() for s in re.split(r"(?<=\.)\s+", other["summary"]) if 40 < len(s) < 220]
    if not sents:
        return None
    return summary + " " + rng.choice(sents)


def pair(rng, bill, others, tok, max_tokens):
    kind = rng.choice(["number", "name", "flip", "foreign"])
    s, t = bill["summary"], bill["text"]
    rejected = {"number": lambda: change_number(rng, s, t), "name": lambda: swap_name(rng, s, t),
                "flip": lambda: flip(rng, s, t), "foreign": lambda: add_foreign(rng, s, rng.choice(others))}[kind]()
    if not rejected or rejected == s:
        return None
    prompt = rng.choice(["Summarize this bill:\n\n{t}", "Give a concise executive summary of the following bill.\n\n{t}",
                         "What does this legislation do? Summarize it.\n{t}"]).format(t=t)
    if max(len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{a}").ids) for a in (s, rejected)) > max_tokens:
        return None
    return dict(prompt=prompt, chosen=s, rejected=rejected, kind=f"bill_{kind}", style="crs", genre="bill",
                bill=bill["id"])
