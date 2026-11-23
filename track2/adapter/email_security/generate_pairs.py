"""Preference pairs for EMAIL_SECURITY (generator v1). The prompt carries the DNS evidence, so every label is computed.

Each question supplies a DNS-over-HTTPS JSON response (Google's /resolve format) or an Authentication-Results header,
the form the pool's material is described in (bounties #119: "a deterministic Google DoH response excerpt"). The
better answer is that response read correctly:
- whether the lookup succeeded (Status 0 is NOERROR; 3 is NXDOMAIN and is not a success);
- the SPF record and its all-qualifier (more than one v=spf1 record is a permerror);
- the DMARC policy;
- the MX hosts by preference (a null MX "0 ." accepts no mail);
- whether the header shows spoofing.

The worse answer is the same answer, in the same style, with one reading wrong. Domains are generated, and a fixed
fifth of the name parts is test-only.

    python -I generate_pairs.py --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/es_v1
"""
import argparse
import hashlib
import json
import os
import random

MAX_TOKENS = 500
WORDS = ["acme", "birch", "cobalt", "delta", "ember", "fjord", "granite", "harbor", "iris", "juniper", "keystone",
         "lumen", "maple", "nimbus", "orchid", "pioneer", "quarry", "redwood", "summit", "tidal", "umber", "vertex",
         "willow", "xenon", "yarrow", "zephyr", "alder", "basalt", "cedar", "dune", "flint", "garnet", "hazel", "ivory"]
TLDS = ["com", "net", "org", "io", "co.uk", "de", "in", "app", "dev"]
INCLUDES = ["_spf.google.com", "spf.protection.outlook.com", "servers.mcsv.net", "sendgrid.net", "amazonses.com",
            "_spf.salesforce.com", "mailgun.org"]
STATUS = {0: "NOERROR", 2: "SERVFAIL", 3: "NXDOMAIN"}
QUAL = {"-all": "hard fail (-all): mail from unlisted hosts should be rejected",
        "~all": "soft fail (~all): mail from unlisted hosts is accepted but marked",
        "?all": "neutral (?all): no assertion about unlisted hosts",
        "+all": "pass-all (+all): any host may send, which makes the record useless"}
TYPES = {"TXT": 16, "MX": 15}


def split_ok(word, split):
    return (int(hashlib.sha256(word.encode()).hexdigest(), 16) % 5 == 0) == (split == "test")


def domain(rng, split):
    pool = [w for w in WORDS if split_ok(w, split)]
    return f"{rng.choice(pool)}{rng.choice(['', '-mail', 'corp', 'labs', 'shop'])}.{rng.choice(TLDS)}"


def doh(name, rtype, status, answers):
    body = {"Status": status, "TC": False, "RD": True, "RA": True, "AD": False, "CD": False,
            "Question": [{"name": name + ".", "type": TYPES[rtype]}]}
    if answers:
        body["Answer"] = [{"name": name + ".", "type": TYPES[rtype], "TTL": 300, "data": a} for a in answers]
    return json.dumps(body)


def spf_case(rng, split):
    d = domain(rng, split)
    status = rng.choices([0, 3, 2], [70, 20, 10])[0]
    facts = dict(kind="spf", domain=d, status=status)
    answers = []
    if status == 0:
        n = rng.choices([0, 1, 2], [15, 70, 15])[0]
        for _ in range(n):
            q = rng.choice(list(QUAL))
            inc = " ".join(f"include:{x}" for x in rng.sample(INCLUDES, rng.randint(1, 3)))
            answers.append(f"\"v=spf1 {inc} {q}\"")
        if rng.random() < 0.4:
            answers.append(f"\"google-site-verification={hashlib.sha1(d.encode()).hexdigest()[:20]}\"")
        rng.shuffle(answers)
        spf = [a for a in answers if a.startswith("\"v=spf1")]
        facts.update(spf=[a.strip('"') for a in spf])
    q = rng.choice(["Does {d} publish a valid SPF record? Google DoH response for {d} TXT:\n{j}",
                    "Is this a successful mail DNS lookup, and what SPF policy does it show? Query: {d} TXT. "
                    "DoH response: {j}",
                    "Check the SPF configuration of {d} from this resolver answer:\n{j}"])
    return q.format(d=d, j=doh(d, "TXT", status, answers)), facts


def dmarc_case(rng, split):
    d = domain(rng, split)
    status = rng.choices([0, 3], [80, 20])[0]
    facts = dict(kind="dmarc", domain=d, status=status, policy=None)
    answers = []
    if status == 0 and rng.random() < 0.85:
        p = rng.choice(["none", "quarantine", "reject"])
        pct = rng.choice([100, 100, 50, 25])
        rec = f"v=DMARC1; p={p}" + (f"; pct={pct}" if pct != 100 else "") + f"; rua=mailto:dmarc@{d}"
        answers = [f"\"{rec}\""]
        facts.update(policy=p, pct=pct)
    q = rng.choice(["What DMARC policy does {d} publish? DoH response for _dmarc.{d} TXT:\n{j}",
                    "Is DMARC enforced for {d}? Resolver answer for _dmarc.{d}: {j}"])
    return q.format(d=d, j=doh("_dmarc." + d, "TXT", status, answers)), facts


def mx_case(rng, split):
    d = domain(rng, split)
    status = rng.choices([0, 3], [85, 15])[0]
    facts = dict(kind="mx", domain=d, status=status, mx=[])
    answers = []
    if status == 0:
        if rng.random() < 0.15:
            answers, facts["null_mx"] = ["0 ."], True
        else:
            hosts = rng.sample(["mx1", "mx2", "mail", "aspmx", "alt1.aspmx", "inbound"], rng.randint(1, 3))
            prefs = sorted(rng.sample([1, 5, 10, 20, 30, 50], len(hosts)))
            mx = [(p, f"{h}.{d}.") for p, h in zip(prefs, hosts)]
            facts["mx"] = mx
            answers = [f"{p} {h}" for p, h in mx]
            rng.shuffle(answers)
    q = rng.choice(["Which mail servers handle mail for {d}, in priority order? DoH response for {d} MX:\n{j}",
                    "Can {d} receive email? Resolver answer for {d} MX: {j}"])
    return q.format(d=d, j=doh(d, "MX", status, answers)), facts


def header_case(rng, split):
    d, other = domain(rng, split), domain(rng, split)
    spf, dkim = rng.choice(["pass", "fail", "softfail"]), rng.choice(["pass", "fail", "none"])
    aligned = rng.random() < 0.6
    dmarc = "pass" if (spf == "pass" or dkim == "pass") and aligned else "fail"
    hdr = (f"From: billing@{d}\nReturn-Path: <bounce@{d if aligned else other}>\nAuthentication-Results: mx.example.net; "
           f"spf={spf} smtp.mailfrom={d if aligned else other}; dkim={dkim} header.d={d if aligned else other}; "
           f"dmarc={dmarc} header.from={d}")
    q = rng.choice(["Do these message headers indicate spoofing?\n\n{h}", "Check mail authentication for this message:\n{h}"])
    return q.format(h=hdr), dict(kind="header", domain=d, spf=spf, dkim=dkim, dmarc=dmarc, spoofed=dmarc == "fail")


def read(f):
    """The correct reading as a list of short findings (the facts an answer must state)."""
    ok = f.get("status", 0) == 0
    if f["kind"] == "header":
        v = "likely spoofed: DMARC fails" if f["spoofed"] else "authenticated: DMARC passes"
        return [f"SPF {f['spf']}, DKIM {f['dkim']}, DMARC {f['dmarc']} for {f['domain']}", v]
    d = f["domain"]
    out = [f"lookup_ok for {d}: {str(ok).lower()} (status {f['status']} {STATUS[f['status']]})"]
    if not ok:
        out.append(f"no record for {d} can be read from a failed lookup" if f["status"] == 2 else f"{d} does not exist")
    elif f["kind"] == "spf":
        if not f["spf"]:
            out.append(f"{d} publishes no SPF record")
        elif len(f["spf"]) > 1:
            out.append(f"{d} publishes {len(f['spf'])} SPF records: a permerror, so SPF is invalid")
        else:
            out.append(f"{d} publishes \"{f['spf'][0]}\", {QUAL[f['spf'][0].split()[-1]]}")
    elif f["kind"] == "dmarc":
        out.append(f"{d} publishes no DMARC record" if not f["policy"] else
                   f"DMARC for {d} is p={f['policy']}" + (f" applied to {f['pct']}% of mail" if f.get("pct", 100) != 100 else ""))
    else:
        out.append(f"{d} has a null MX and accepts no mail" if f.get("null_mx") else
                   f"mail for {d} goes to " + ", then ".join(h for _, h in f["mx"]))
    return out


def wrong(rng, f):
    """The same facts with one reading wrong; None when this case has no such error."""
    g = json.loads(json.dumps(f))
    k = f["kind"]
    choices = []
    if f.get("status", 0) != 0:
        choices.append("failed_as_ok")
    elif k != "header":
        choices.append("ok_as_failed")  # the mirror error, so "failed" readings appear on both sides
    if k == "spf" and f.get("status") == 0:
        choices += (["qualifier", "multi_valid" if len(f["spf"]) > 1 else rng.choice(["spf_missing", "single_as_permerror"])]
                    if f["spf"] else ["spf_invented"])
    if k == "dmarc" and f.get("status") == 0 and not f["policy"]:
        choices += ["dmarc_invented"]
    if k == "dmarc" and f.get("status") == 0 and f["policy"]:
        choices += ["policy"]
    if k == "mx" and f.get("status") == 0 and len(f.get("mx", [])) > 1:
        choices += ["mx_order"]
    if k == "mx" and f.get("null_mx"):
        choices += ["null_as_hosts"]
    if k == "header":
        choices += ["header_flip"]
    if not choices:
        return None, None
    c = rng.choice(choices)
    if c == "failed_as_ok":
        g["status_claim_ok"] = True
        r = read(f)
        d = f["domain"]
        r[0] = f"lookup_ok for {d}: true (status 0 NOERROR)"
        q = rng.choice(list(QUAL))
        r[1] = {"spf": f"{d} publishes \"v=spf1 include:{rng.choice(INCLUDES)} {q}\", " + QUAL[q],
                "dmarc": f"DMARC for {d} is p={rng.choice(['none', 'quarantine', 'reject'])}",
                "mx": f"mail for {d} goes to {rng.choice(['mx1', 'mx2', 'mail', 'aspmx', 'alt1.aspmx', 'inbound'])}.{d}."}.get(k, r[1])
        return r, c
    if c == "ok_as_failed":
        g["status"] = rng.choice([2, 3, 3])  # the same mix of failures as the real cases
        return read(g), c
    if c == "null_as_hosts":
        g["null_mx"] = False
        g["mx"] = [(10, f"{rng.choice(['mx1', 'mx2', 'mail', 'aspmx', 'alt1.aspmx', 'inbound'])}.{f['domain']}.")]
        return read(g), c
    if c == "single_as_permerror":
        r = read(f)
        r[1] = f"{f['domain']} publishes 2 SPF records: a permerror, so SPF is invalid"
        return r, c
    if c == "spf_invented":
        g["spf"] = [f"v=spf1 include:{rng.choice(INCLUDES)} {rng.choice(list(QUAL))}"]
    if c == "dmarc_invented":
        g["policy"] = rng.choice(["none", "quarantine", "reject"])
    if c == "qualifier":
        q = f["spf"][0].split()[-1]
        g["spf"] = [s.rsplit(" ", 1)[0] + " " + rng.choice([x for x in QUAL if x != q]) for s in f["spf"]]
    elif c == "multi_valid":
        r = read(f)
        r[1] = f"{f['domain']} publishes \"{f['spf'][0]}\", " + QUAL[f["spf"][0].split()[-1]]
        return r, c
    elif c == "spf_missing":
        g["spf"] = []
    elif c == "policy":
        g["policy"] = rng.choice([p for p in ("none", "quarantine", "reject") if p != f["policy"]])
    elif c == "mx_order":
        g["mx"] = list(reversed(f["mx"]))
    elif c == "header_flip":
        g["spoofed"] = not f["spoofed"]
    return read(g), c


def render(lines, style, f):
    if style == "json":
        return json.dumps({"domain": f["domain"], "findings": lines})
    if style == "bullets":
        return "\n".join(f"- {x[0].upper()}{x[1:]}." for x in lines)
    if style == "line":  # probe only
        return " | ".join(lines)
    return " ".join(f"{x[0].upper()}{x[1:]}." for x in lines)


def build(n, seed, split, styles, tok):
    rng = random.Random(seed)
    rows, seen = [], set()
    while len(rows) < n:
        prompt, f = rng.choice([spf_case, spf_case, dmarc_case, mx_case, header_case])(rng, split)
        bad, kind = wrong(rng, f)
        if bad is None or prompt in seen:
            continue
        style = rng.choice(styles)
        chosen, rejected = render(read(f), style, f), render(bad, style, f)
        if chosen == rejected:
            continue
        if max(len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{a}").ids) for a in (chosen, rejected)) > MAX_TOKENS:
            continue
        seen.add(prompt)
        rows.append(dict(prompt=prompt, chosen=chosen, rejected=rejected, kind=kind, style=style, case=f["kind"]))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=3000)
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    styles = ["json", "bullets", "prose"]
    train = build(a.n + 300, 7, "train", styles, tok)
    sets = {"train": train[:a.n], "val": train[a.n:], "test": build(400, 97, "test", styles, tok),
            "probe": build(200, 131, "test", ["line"], tok)}
    os.makedirs(a.out, exist_ok=True)
    for name, rows in sets.items():
        with open(os.path.join(a.out, f"{name}.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(name, len(rows))


if __name__ == "__main__":
    main()
