"""Counterfactual sibling scenarios for v2: the same input with one issue fixed (or moved).

Each generator returns (S, S2, mode). S and S2 differ in exactly one item:
  fix   S has an issue that S2 does not (vulnerable line fixed, secret replaced by an env reference,
        dependency bumped to a safe version, setting hardened);
  swap  the same issue sits at a different location (function or key) in S2.
Answer A (S's true findings) is chosen for S and rejected for S2; answer B (S2's findings) is the
reverse. Every answer text is therefore chosen once and rejected once, so no answer-only cue
(words, length, format) can separate the labels.
"""
import sr_code
import sr_config
import sr_deps


def _code_files(rng, items, fname):
    """items: [(template, slots, vulnerable)] in display order -> (text, findings)."""
    blocks, findings = [], []
    for t, slots, vuln in items:
        line = sum(b.count("\n") + 2 for b in blocks) + 1
        blocks.append(sr_code.fill(t[7] if vuln else t[8], slots))
        if vuln:
            where = f"{fname} ({slots['fn']})" if "«fn»" in t[7] else f"{fname} (line {line})"
            findings.append({"sev": t[4], "loc": where, "ref": t[3], "title": t[5], "fix": t[6], "kind": "code",
                             "cat": "code"})
    return "\n\n".join(blocks), findings


def _slots(rng, used):
    s = {k: rng.choice(v) for k, v in sr_code.SLOTS.items()}
    while s["fn"] in used:
        s["fn"] = rng.choice(sr_code.SLOTS["fn"])
    used.add(s["fn"])
    return s


def cf_code(rng, templates):
    lang = rng.choice(sorted({t[1] for t in templates}))
    pool = [t for t in templates if t[1] == lang]
    fname = rng.choice(["app", "handlers", "views", "service", "routes", "api", "util"]) + "." + sr_code.EXT[lang]
    used = set()
    swappable = [t for t in pool if "«fn»" in t[7]]
    if swappable and rng.random() < 0.3:  # same pattern in two functions; the bug moves between them
        t = rng.choice(swappable)
        a, b = _slots(rng, used), _slots(rng, used)
        others = [(o, _slots(rng, used), rng.random() < 0.5) for o in rng.sample([o for o in pool if o is not t],
                                                                                  min(len(pool) - 1, rng.randint(0, 1)))]
        s1 = [(t, a, True), (t, b, False)] + others
        s2 = [(t, a, False), (t, b, True)] + others
        order = list(range(len(s1)))
        rng.shuffle(order)
        s1, s2, mode = [s1[i] for i in order], [s2[i] for i in order], "swap"
    else:
        k = min(len(pool), rng.choice([1, 2, 2, 3]))
        items = [(t, _slots(rng, used), rng.random() < 0.6) for t in rng.sample(pool, k)]
        i = rng.randrange(k)
        items[i] = (items[i][0], items[i][1], True)
        s1 = items
        s2 = [(t, sl, v and j != i) for j, (t, sl, v) in enumerate(items)]
        mode = "fix"
    out = []
    for items in (s1, s2):
        text, findings = _code_files(rng, items, fname)
        out.append({"category": "code", "files": [(fname, lang, text)], "findings": findings,
                    "entity": [f"tpl:{t[0]}" for t, _, _ in items]})
    return out[0], out[1], mode


def cf_config(rng, tid):
    fname, lang, head, foot, checks = sr_config.C[tid]
    picks = rng.sample(checks, rng.randint(2, len(checks)))
    bad = set(rng.sample(range(len(picks)), rng.randint(1, min(3, len(picks)))))
    flip = rng.choice(sorted(bad))
    out = []
    for bset in (bad, bad - {flip}):
        s = {"category": "config", "entity": [f"cfg:{tid}"], "findings": [], "traps": []}
        lines = [head]
        for i, (key, insecure, secure, sev, title, fix) in enumerate(picks):
            line_no = "\n".join(lines).count("\n") + 2
            lines.append(insecure if i in bset else secure)
            if i in bset:
                s["findings"].append({"sev": sev, "loc": f"{fname} line {line_no}", "ref": None, "title": title,
                                      "fix": fix, "kind": "config", "cat": "config"})
        s["files"] = [(fname, lang, "\n".join(lines + ([foot] if foot else [])))]
        out.append(s)
    return out[0], out[1], "fix"


def cf_secret(rng, fmt):
    picks = rng.sample(sr_deps.SECRETS, rng.choice([1, 2, 2]))
    benign = [(n, g(rng)) for n, g in rng.sample(sr_deps.BENIGN, rng.randint(2, 4))]
    real = [(rng.choice(names), gen(rng), sev, title, fix) for names, gen, sev, title, fix in picks]
    mode = "fix"
    swap_names = [n for n in picks[0][0] if n != real[0][0]]
    if swap_names and rng.random() < 0.3:  # the live value moves to the other key
        mode, other = "swap", swap_names[0]
    order = list(range(len(real) + len(benign) + (mode == "swap")))
    rng.shuffle(order)

    def build(variant):
        items = []
        for j, (name, val, sev, title, fix) in enumerate(real):
            live = not (j == 0 and variant == 1 and mode == "fix")
            if mode == "swap" and j == 0:
                live_name = name if variant == 0 else other
                for n in (name, other):
                    items.append((n, val if n == live_name else "${" + n.upper() + "}", n == live_name, sev, title, fix))
                continue
            items.append((name, val if live else "${" + name.upper() + "}", live, sev, title, fix))
        items += [(n, v, False, None, None, None) for n, v in benign]
        items = [items[i] for i in order]
        fname, lang, text = sr_deps.secret_file(fmt, [(k, v) for k, v, *_ in items])
        findings = []
        for k, v, live, sev, title, fix in items:
            if live:
                shown = k if fmt in ("env", "compose", "json") else (k.upper() if fmt == "python" else k.lower())
                findings.append({"sev": sev, "loc": f"{fname} ({shown})", "ref": "CWE-798",
                                 "title": f"{title} ({v[:4]}****)", "fix": fix, "kind": "secret", "cat": "secret"})
        return {"category": "secret", "entity": [f"secretfmt:{fmt}"], "files": [(fname, lang, text)],
                "findings": findings}
    return build(0), build(1), mode


def cf_dep(rng, pkgs_by_eco, by_pkg):
    eco = rng.choice(sorted(e for e, ks in pkgs_by_eco.items() if len(ks) >= 5))
    deps, vuln, n_vuln, n_deps = [], [], rng.choice([1, 1, 2]), rng.randint(3, 6)
    for key in rng.sample(pkgs_by_eco[eco], min(len(pkgs_by_eco[eco]), 14)):
        safe = sr_deps.safe_version(by_pkg[key])
        if not safe:
            continue
        if len(vuln) < n_vuln:
            ver, hits = sr_deps.vulnerable_version(by_pkg[key], rng)
            if ver:
                vuln.append(len(deps))
                deps.append((key[1], ver, safe, hits))
                continue
        deps.append((key[1], safe, safe, []))
        if len(deps) >= n_deps and len(vuln) >= n_vuln:
            break
    if not vuln or len(deps) < 3:
        return None
    rng.shuffle(deps)
    flip = rng.choice([i for i, d in enumerate(deps) if d[3]])
    fixes = {}
    out = []
    for variant in (0, 1):
        rows, findings = [], []
        for i, (name, ver, safe, hits) in enumerate(deps):
            v = safe if (variant == 1 and i == flip) else ver
            rows.append((name, v))
            if v == ver:
                for h in hits:
                    fx = fixes.setdefault((name, h["ghsa"]), f"upgrade {name} to {h['patched']}" + rng.choice(["", " or later"]))
                    findings.append({"sev": h["sev"], "loc": f"{name}@{ver}", "ref": h["cve"] or h["ghsa"],
                                     "title": h["summary"], "fix": fx, "kind": "dependency", "cat": "dependency"})
        fname, lang, text = sr_deps.manifest(eco, rows)
        out.append({"category": "dependency", "entity": [f"pkg:{eco}:{d[0]}" for d in deps],
                    "files": [(fname, lang, text)], "findings": findings})
    return out[0], out[1], "fix"
