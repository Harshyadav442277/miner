"""Prompts, answer formats, the realistic failure operators, and length matching.

Chosen and rejected answers of one pair share the format, the intro, the closing notes pool
and the finding phrasing; they differ only in what is claimed. Length is matched by adding
true-for-any-input elaborations or notes to the shorter side, so neither length nor a
side-specific phrase predicts the label.
"""
import json
import random

ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
WHAT = {"dependency": "dependency manifest", "secret": "configuration file", "code": "code",
        "config": "configuration"}
ASK = [
    "Review the following {what} for security issues. List every finding with a severity.",
    "Security review please: report vulnerabilities, leaked credentials and misconfigurations, each with severity.",
    "Audit this {what}. I need security findings rated critical/high/medium/low.",
    "Find the security problems in the {what} below and rate how severe each one is.",
    "Can you do a security review of this? Give findings with severity and a fix for each.",
    "Check this {what} for known CVEs, hardcoded secrets, injection-prone patterns or risky settings. Severity per finding.",
    "Pre-merge security check on the {what} below. Output findings with severity.",
    "What are the security issues here? Include severity and remediation.",
    "Run a security review over these files and tell me what must be fixed, ordered by severity.",
    "Please identify vulnerabilities (with severity) in the {what} that follows.",
]
NOTES = {
    "dependency": ["Re-run the dependency audit after upgrading and commit the updated lockfile.",
                   "Pin exact versions in the lockfile so the fix cannot be silently reverted.",
                   "Enable automated dependency alerts for this repository."],
    "secret": ["Add a pre-commit secret scanner to stop this recurring.",
               "Purge the values from git history after rotating them.",
               "Audit provider logs for use of the exposed credentials."],
    "code": ["Add a regression test that sends a malicious payload to each fixed handler.",
             "Treat every request field as untrusted until validated.",
             "Run a static analyser (SAST) in CI to catch similar sinks."],
    "config": ["Apply the same baseline to the other environments.",
               "Enforce these settings with a policy check in CI.",
               "Re-scan the configuration after deployment."],
}
ELAB = {"dependency": "The pinned version falls inside the advisory's affected range.",
        "secret": "Anyone with read access to the repository can use this value.",
        "code": "Untrusted input reaches the sink without validation.",
        "config": "This setting widens the attack surface in production."}
CLEAN = {"dependency": "the pinned versions are outside the affected ranges of known advisories",
         "secret": "no live credentials are present; values are references, placeholders or public identifiers",
         "code": "inputs are parameterised, escaped or validated before reaching a sensitive sink",
         "config": "the security-relevant settings use their hardened values"}
# Non-answers worded like real findings (assertive, with a CWE), so only their emptiness
# relative to the input distinguishes them, not their style.
GENERIC = [("CWE-1104", "outdated third-party components detected", "upgrade packages to a later supported release"),
           ("CWE-20", "insufficient input validation", "validate and sanitise all external input"),
           ("CWE-778", "insufficient logging and monitoring of security events", "send security events to central logging"),
           ("CWE-522", "credentials are not protected adequately", "move credentials to a secrets manager"),
           ("CWE-693", "missing defence-in-depth protections", "enable the platform's hardening options"),
           ("CWE-284", "overly broad access control", "apply least privilege to every role")]
QUALITY = [("CWE-1099", "inconsistent naming conventions", "adopt one naming style across the module"),
           ("CWE-1120", "excessive function complexity without documentation", "split the function and document parameters"),
           ("CWE-1106", "magic numbers used instead of symbolic constants", "extract named constants"),
           ("CWE-1078", "inconsistent source formatting", "run the project formatter in CI"),
           ("CWE-1164", "dead or irrelevant code paths", "remove unused code"),
           ("CWE-1041", "redundant duplicated logic", "extract a shared helper")]
SEV_DRAW = ["critical", "high", "high", "medium", "medium", "low"]
CHECKED = {"dependency": "Checked every pinned package against published advisories.",
           "secret": "Checked each key for live tokens, private keys and connection strings.",
           "code": "Checked request handling for injection, deserialization and crypto misuse.",
           "config": "Checked privileges, exposure, encryption and authentication settings."}
ELAB2 = {"dependency": "Upgrading removes the vulnerable code path.",
         "secret": "Treat the value as compromised even after removal.",
         "code": "The fix should be applied wherever this pattern recurs.",
         "config": "Default hardened values avoid this exposure."}


def prompt_text(rng, scenario):
    files = scenario["files"]
    what = WHAT[scenario["category"]] if len(files) == 1 else "files"
    ask = rng.choice(ASK).format(what=what)
    body = "\n\n".join(f"{name}:\n```{lang}\n{text}\n```" if rng.random() < 0.8 else f"--- {name} ---\n{text}"
                       for name, lang, text in files)
    return f"{ask}\n\n{body}" if rng.random() < 0.85 else f"{body}\n\n{ask}"


def sev_word(sev, style):
    return {"upper": sev.upper(), "title": sev.title(), "lower": sev}[style]


def render(findings, fmt, style, pad, category):
    """pad: {"notes": [str], "elab": {item id: 0..2 sentences}, "checked": bool}."""
    notes, elab = pad["notes"], pad["elab"]
    fs = sorted(findings, key=lambda f: ORDER[f["sev"]])
    counts = {}
    for f in fs:
        counts[f["sev"]] = counts.get(f["sev"], 0) + 1
    summary = (f"{len(fs)} finding{'s' if len(fs) != 1 else ''}: " + ", ".join(
        f"{n} {s}" for s, n in sorted(counts.items(), key=lambda kv: ORDER[kv[0]]))) if fs else \
        f"No security issues found: {CLEAN[category]}."
    if pad["checked"]:
        summary += " " + CHECKED[category]

    def text(f):
        ref = f" ({f['ref']})" if f.get("ref") else ""
        level, cat = elab.get(f.get("_i"), 0), f.get("cat", category)
        e = (" " + ELAB[cat] if level >= 1 else "") + (" " + ELAB2[cat] if level >= 2 else "")
        return f"{f['title']}{ref}.{e}", f"Fix: {f['fix']}."
    if fmt == "json":
        obj = {"findings": [{"severity": f["sev"], "location": f["loc"], "id": f.get("ref"), "issue": text(f)[0],
                             "remediation": f["fix"]} for f in fs], "summary": summary}
        if notes:
            obj["notes"] = notes
        return json.dumps(obj, indent=1 if style == "upper" else None)
    rows = []
    if fmt == "md":
        rows = [f"{i}. **[{sev_word(f['sev'], style)}]** `{f['loc']}`: {' '.join(text(f))}" for i, f in enumerate(fs, 1)]
        head = "## Security findings"
    elif fmt == "table":
        rows = ["| Severity | Location | Issue | Fix |", "|---|---|---|---|"] + [
            f"| {sev_word(f['sev'], style)} | {f['loc']} | {text(f)[0]} | {f['fix']} |" for f in fs] if fs else []
        head = "Security review results"
    elif fmt == "plain":
        rows = [f"- {sev_word(f['sev'], style)}: {f['loc']}: {' '.join(text(f))}" for f in fs]
        head = "Findings:"
    else:  # prose
        ords = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"]
        rows = [f"{ords[i]}, {f['loc']} has a {sev_word(f['sev'], 'lower')}-severity issue: {' '.join(text(f))}"
                for i, f in enumerate(fs)]
        head = "I reviewed the input."
    parts = [head, "\n".join(rows), summary] if rows else [head, summary]
    if notes:
        parts.append("Notes: " + " ".join(notes))
    return "\n\n".join(p for p in parts if p)


KINDS = ["missed_critical", "wrong_severity", "wrong_location", "hallucinated_cve", "false_positive",
         "generic", "code_quality", "false_no_issues"]


def corrupt(kind, rng, s, real_cves):
    """Return the rejected finding list for this failure kind, or None if it does not apply."""
    f = [dict(x) for x in s["findings"]]
    traps = s["traps"]
    top = min(range(len(f)), key=lambda i: ORDER[f[i]["sev"]]) if f else None
    if kind == "missed_critical":
        return f[:top] + f[top + 1:] if len(f) >= 2 and ORDER[f[top]["sev"]] <= 1 else None
    if kind == "false_no_issues":
        return [] if f else None
    if kind == "wrong_severity":
        if not f:
            return None
        i = top if rng.random() < 0.5 else rng.randrange(len(f))
        f[i]["sev"] = {"critical": rng.choice(["low", "medium"]), "high": "low",
                       "medium": "critical", "low": rng.choice(["high", "critical"])}[f[i]["sev"]]
        return f
    if kind == "wrong_location":
        if not f:
            return None
        i = rng.randrange(len(f))
        others = [t["loc"] for t in traps if t["loc"] != f[i]["loc"]] + [x["loc"] for x in f if x["loc"] != f[i]["loc"]]
        if not others:
            return None
        f[i]["loc"] = rng.choice(others)
        return f if len({x["loc"] for x in f}) == len(f) or rng.random() < 0.5 else None
    if kind == "hallucinated_cve":
        if not f:
            return None
        i = rng.randrange(len(f))
        if f[i]["kind"] == "dependency":
            real = f[i]["ref"] if f[i]["ref"].startswith("CVE-") else rng.choice(sorted(real_cves))
            year, digits = int(real[4:8]), len(real) - 9
            while True:  # same year and digit count as a real id, so only knowledge can tell
                fake = f"CVE-{year}-{rng.randint(10 ** (digits - 1), 10 ** digits - 1)}"
                if fake not in real_cves:
                    break
            f[i]["ref"] = fake
        else:
            f[i]["ref"] = rng.choice(sorted(real_cves))
        return f
    if kind == "false_positive":
        if not traps:
            return None
        extra = [dict(t) for t in rng.sample(traps, min(len(traps), rng.choice([1, 1, 2])))]
        return f + extra
    if kind in ("generic", "code_quality"):
        pool = GENERIC if kind == "generic" else QUALITY
        n = max(1, len(f)) + (1 if not f else 0)
        locs = [x["loc"] for x in f + traps] or [s["files"][0][0]]
        out = []
        for ref, title, fix in rng.sample(pool, n):
            loc = s["files"][0][0] if kind == "generic" else rng.choice(locs)
            out.append({"sev": rng.choice(SEV_DRAW), "loc": loc, "ref": ref, "title": title, "fix": fix, "kind": kind})
        return out
    raise ValueError(kind)


def pair_answers(rng, s, rejected, category):
    """Render chosen/rejected in one shared format with matched length."""
    fmt = rng.choice(["md", "md", "json", "table", "plain", "prose"])
    style = rng.choice(["upper", "title", "lower"])
    rej = []
    for i, x in enumerate(rejected):
        x = dict(x)
        x.setdefault("_i", ("r", i))
        x["cat"] = x.get("cat") or category
        rej.append(x)
    pool = NOTES[category][:]
    rng.shuffle(pool)
    # generic / code-quality items never get an elaboration: it would be a rejected-only phrase
    can = lambda items: [x["_i"] for x in items if x["kind"] not in ("generic", "code_quality")]
    base_notes, checked = rng.choice([0, 0, 1]), rng.random() < 0.3
    c_pad = {"notes": pool[:base_notes], "checked": checked,
             "elab": {i: rng.choice([0, 0, 1, 2]) for i in can(s["findings"])}}
    r_pad = {"notes": pool[:base_notes], "checked": checked,
             "elab": {i: c_pad["elab"].get(i, rng.choice([0, 0, 1, 2])) for i in can(rej)}}

    def grow(pad):
        """One padding step, chosen at random among the moves still available."""
        moves = [("e", i) for i, v in pad["elab"].items() if v < 2]
        moves += [("c", None)] * (not pad["checked"]) + [("n", None)] * (len(pad["notes"]) < len(pool))
        if not moves:
            return False
        m, i = rng.choice(moves)
        if m == "e":
            pad["elab"][i] += 1
        elif m == "c":
            pad["checked"] = True
        else:
            pad["notes"].append(pool[len(pad["notes"])])
        return True

    def shrink(pad):
        moves = [("e", i) for i, v in pad["elab"].items() if v > 0]
        moves += [("c", None)] * pad["checked"] + [("n", None)] * bool(pad["notes"])
        if not moves:
            return False
        m, i = rng.choice(moves)
        if m == "e":
            pad["elab"][i] -= 1
        elif m == "c":
            pad["checked"] = False
        else:
            pad["notes"].pop()
        return True

    for _ in range(16):
        c = render(s["findings"], fmt, style, c_pad, category)
        r = render(rej, fmt, style, r_pad, category)
        gap = len(c) - len(r)
        if abs(gap) <= max(30, 0.08 * max(len(c), len(r))):
            return c, r, fmt
        short, long_ = (r_pad, c_pad) if gap > 0 else (c_pad, r_pad)
        # half the time shrink the longer side, so padding is not a property of one label
        if not ((rng.random() < 0.5 and shrink(long_)) or grow(short) or shrink(long_)):
            return None
    return None
