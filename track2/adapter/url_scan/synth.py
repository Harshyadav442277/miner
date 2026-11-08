"""Synthetic URL_SCAN_VERDICT answers: evidence catalog, answer records and response formats.

Everything here is our own wording. No miner response text is copied. The only factual
claims tied to a real domain are list membership (CERT Polska for unsafe domains, the
Majestic Million rank for benign ones); every other check result is synthetic answer text.
"""
import json
import random

CAS = ["Let's Encrypt R11", "DigiCert Global G2", "Sectigo RSA DV", "GlobalSign GCC R3", "Google Trust WR1",
       "Amazon RSA 2048 M02", "ZeroSSL ECC DV"]

# Evidence entries are (source, result, kind); kind is hit | clean | weak | heuristic | neutral.
HITS = [
    ("CERT Polska Warning List", "listed", "the host is on the national warning list of fraudulent domains"),
    ("Security DNS resolver", "blocked", "the threat-filtering resolver answers 0.0.0.0 for this host"),
    ("Page content", "credential harvesting", "the page imitates a payment or parcel service and asks for card details"),
    ("Page content", "fake login", "the page copies a bank sign-in form and posts it to another host"),
    ("Blocklist lookup", "listed", "the host matches an entry on a phishing blocklist"),
    ("Redirect chain", "suspicious", "the URL redirects through a short-lived host to a payment form"),
    ("URL heuristics", "score 0.93", "the hostname and path match patterns often used in phishing URLs, above the threshold"),
    ("Popularity ranking", "not ranked", "the registrable domain is not among the top 50,000 of the Majestic Million"),
]
CLEAN = [
    ("CERT Polska Warning List", "not listed", "the host is not on the warning list"),
    ("Security DNS resolver", "allowed", "the threat-filtering resolver returns the same address as an unfiltered one"),
    ("HTTP fetch", "200 OK", "the page loads over HTTPS and serves ordinary site content"),
    ("TLS", "valid", "the certificate chain is trusted and matches the hostname ({ca})"),
    ("Popularity ranking", "ranked", "the registrable domain is ranked #{rank} in the Majestic Million"),
    ("Blocklist lookup", "not listed", "no phishing or malware blocklist entry for the host"),
    ("Redirect chain", "none", "the URL does not redirect to another host"),
    ("URL heuristics", "score 0.07", "automated heuristics found none of the features often seen on phishing sites"),
    ("Hosting", "shared CDN", "the site is served from a shared content-delivery network, which is common and not a risk"),
]
WEAK = [  # absence of evidence: what a false "safe" usually rests on
    ("HTTP fetch", "timeout", "the request timed out before any content was returned"),
    ("HTTP fetch", "HTTP 599", "no usable response was received from the host"),
    ("Unfiltered DNS", "NXDOMAIN", "the host does not resolve, so the page was not inspected"),
    ("Reputation lookup", "no data", "no reputation record was found for the host"),
    ("TLS", "not checked", "the certificate could not be retrieved"),
    ("Content scan", "no indicators", "no threat indicators were found in the little content that was retrieved"),
]
HEURISTIC = [  # weak grounds for a false "unsafe"
    ("URL heuristics", "score 0.61", "the path contains words often used in phishing URLs"),
    ("Hosting", "shared CDN", "the site is served from a shared content-delivery network"),
    ("TLS", "free certificate", "the certificate was issued by a free automated authority"),
    ("Page content", "third-party scripts", "the page loads scripts from several other domains"),
    ("Page content", "sign-in form", "the page contains a password field"),
    ("URL heuristics", "many subdomains", "the hostname has several labels"),
]
NEUTRAL = [  # plausible for either class: used where the URL itself has to decide
    ("HTTP fetch", "200 OK", "the host answered with an HTML page"),
    ("TLS", "valid", "a certificate issued by {ca} was presented"),
    ("Unfiltered DNS", "resolves", "the host resolves to {ip}"),
    ("Page content", "sign-in form", "the page shows a sign-in form"),
]

VAGUE = [  # "unsupported": claims with no checkable source behind them
    ("Internal model", "classified", "the verdict comes from an internal classifier; no source is cited"),
    ("Policy", "default", "URLs are given this verdict unless they have been reported"),
    ("Assessment", "general", "based on general knowledge of sites like this one"),
    ("Summary engine", "auto", "an automated summary with no individual check recorded"),
]
SERVERS = ["nginx", "cloudflare", "Apache", "LiteSpeed", "openresty", "Microsoft-IIS/10.0", "gws", "envoy"]
ASNS = ["AS13335 Cloudflare", "AS16509 Amazon", "AS15169 Google", "AS24940 Hetzner", "AS14061 DigitalOcean",
        "AS16276 OVH", "AS8075 Microsoft", "AS20473 Vultr", "AS47583 Hostinger", "AS54113 Fastly"]
REGISTRARS = ["NameCheap", "GoDaddy", "Tucows", "OVH", "Gandi", "Porkbun", "Dynadot", "Key-Systems", "MarkMonitor"]
COUNTRIES = ["US", "DE", "NL", "FR", "GB", "SG", "PL", "CA", "JP", "FI"]


def extras(rng, k):
    """Neutral host details, drawn independently of the verdict, so they carry no label."""
    pool = {"server": rng.choice(SERVERS), "content_type": "text/html; charset=utf-8", "asn": rng.choice(ASNS),
            "country": rng.choice(COUNTRIES), "registrar": rng.choice(REGISTRARS),
            "response_ms": rng.randint(40, 2400), "ip": "%d.%d.%d.%d" % (rng.randint(23, 212), rng.randint(0, 255),
                                                                         rng.randint(0, 255), rng.randint(1, 254)),
            "http_version": rng.choice(["HTTP/1.1", "HTTP/2", "HTTP/3"]), "ipv6": rng.choice([True, False]),
            "scanner_region": rng.choice(["eu-west", "us-east", "ap-south", "eu-central"])}
    return {key: pool[key] for key in rng.sample(sorted(pool), k)}


UNSAFE_REASONS = [
    "{host} is a known fraudulent host and should not be opened",
    "the host imitates a legitimate service to collect credentials or payments",
    "the hostname looks generated for a phishing campaign and the checks support blocking it",
    "visiting {host} risks entering card or login details on a fraudulent page",
    "features often seen on phishing sites were detected and the host is flagged, so it cannot be treated as safe",
]
SAFE_REASONS = [
    "{host} is an established site with no threat findings",
    "the checks found ordinary site content and no listing on any blocklist",
    "the domain is long established and the page behaves normally",
    "nothing in the checks indicates phishing or malware on {host}",
    "no threat indicators were detected, the site has several independent clean results and is not a cached result",
]
WEAK_SAFE_REASONS = [
    "no threat indicators were detected for {host}",
    "the scan returned no findings, so the URL is treated as safe",
    "nothing suspicious was observed for {host}",
]
HEURISTIC_UNSAFE_REASONS = [
    "{host} shows patterns associated with risky sites",
    "heuristic signals for {host} exceed the risk threshold",
    "the page has features often seen on phishing sites",
]


def fill(text, ctx):
    return text.format(**ctx)


def make_record(rng, url, host, safe, evidence, reason, when, ctx, n_extra=0):
    risk = round(rng.uniform(0.0, 0.18) if safe else rng.uniform(0.72, 0.99), 2)
    return {"url": url, "host": host, "safe": safe, "risk": risk, "when": when,
            "evidence": [(s, r, fill(d, ctx)) for s, r, d in evidence],
            "reason": fill(reason, {**ctx, "host": host}), "trace": "%016x" % rng.getrandbits(64),
            "status": "ok", "extras": extras(rng, n_extra), "errors": rng.choice(["none", None, "[]"])}


def non_answer(rng, url, host, when, ctx, n_extra=0):
    msg = rng.choice(["the upstream scanner timed out", "the scanning quota for this hour is exhausted",
                      "the reputation service returned an internal error", "the request could not be parsed"])
    attempted = rng.sample(["HTTP fetch", "Unfiltered DNS", "Security DNS resolver", "Reputation lookup", "TLS"], 3)
    return {"url": url, "host": host, "safe": None, "risk": None, "when": when,
            "evidence": [(a, "error", msg) for a in attempted],
            "reason": f"No verdict: {msg}, so it cannot be said whether {host} is safe",
            "trace": "%016x" % rng.getrandbits(64), "status": "error", "extras": extras(rng, n_extra), "errors": msg}


def word(rec, a="safe", b="unsafe", none="unknown"):
    return none if rec["safe"] is None else (a if rec["safe"] else b)


def f_flat(rec):
    return json.dumps({"url": rec["url"], "safe": rec["safe"], "verdict": word(rec), "risk": rec["risk"],
                       "evidence": [f"{s}: {r}" for s, r, _ in rec["evidence"]],
                       "summary": rec["reason"][0].upper() + rec["reason"][1:] + ".",
                       "host_details": rec["extras"], "errors": rec["errors"], "checked_at": rec["when"], "scan_id": rec["trace"]})


def f_answer_first(rec):
    lead = {True: "Yes, {u} is safe to open", False: "No, do not open {u}", None: "Unknown for {u}"}[rec["safe"]]
    return json.dumps({"answer": lead.format(u=rec["url"]) + ": " + rec["reason"] + ".", "url": rec["url"],
                       "verdict": word(rec), "confidence": None if rec["risk"] is None else
                       round(1 - rec["risk"] if rec["safe"] else rec["risk"], 2),
                       "sources": [{"name": s, "finding": r, "detail": d} for s, r, d in rec["evidence"]],
                       **rec["extras"], "checked_at": rec["when"], "id": rec["trace"]})


def f_checks(rec):
    return json.dumps({"intent": "URL_SCAN_VERDICT", "target": rec["url"], "is_safe": rec["safe"],
                       "classification": word(rec, "benign", "malicious"),
                       "score": None if rec["risk"] is None else int(rec["risk"] * 100),
                       "checks": [{"source": s, "result": r, "detail": d, "at": rec["when"]}
                                  for s, r, d in rec["evidence"]],
                       "reason": rec["reason"], "host": rec["extras"], "error": rec["errors"], "trace": rec["trace"]})


def f_status(rec):
    head = {True: "Safe.", False: "Unsafe.", None: "Unavailable."}[rec["safe"]]
    return json.dumps({"query": rec["url"], "status": rec["status"], "summary": f"{head} {rec['reason']}.",
                       "details": {"risk_level": None if rec["safe"] is None else ("low" if rec["safe"] else "high"),
                                   "signals": [f"{s} - {d}" for s, _, d in rec["evidence"]],
                                   "time": rec["when"], **rec["extras"]}, "request": rec["trace"]})


def f_signal(rec):
    return json.dumps({"url": rec["url"], "verdict": word(rec), "risk": rec["risk"],
                       "source": "live-scan", "signal": f"{rec['url']} is assessed as {word(rec)}: "
                       + rec["reason"] + ". " + " ".join(f"{s}: {d}." for s, _, d in rec["evidence"]),
                       "observed": rec["when"], "meta": rec["extras"], "ref": rec["trace"]})


def f_prose(rec):
    lead = {True: "Yes, {u} looks safe to open", False: "No, {u} is not safe to open",
            None: "I could not get a verdict for {u}"}[rec["safe"]]
    checks = "; ".join(f"{s} {r} ({d})" for s, r, d in rec["evidence"])
    details = ", ".join(f"{k.replace('_', ' ')} {v}" for k, v in rec["extras"].items())
    return (lead.format(u=rec["url"]) + f": {rec['reason']}. Checks: {checks}. "
            + (f"Host details: {details}. " if details else "") + f"Checked {rec['when']} (scan {rec['trace']}).")


def f_markdown(rec):
    lines = [f"**Verdict:** {word(rec).upper()}", f"**URL:** {rec['url']}", "**Evidence:**"]
    lines += [f"- {s}: {r} - {d}" for s, r, d in rec["evidence"]]
    lines += [f"**Summary:** {rec['reason']}."]
    if rec["extras"]:
        lines.append("**Details:** " + "; ".join(f"{k}={v}" for k, v in rec["extras"].items()))
    lines.append(f"_scan {rec['trace']} at {rec['when']}_")
    return "\n".join(lines)


def f_kv(rec):
    return "\n".join([f"url={rec['url']}", f"verdict={word(rec)}",
                      f"safe={json.dumps(rec['safe'])}", f"risk={json.dumps(rec['risk'])}",
                      "evidence=" + " | ".join(f"{s}:{r}" for s, r, _ in rec["evidence"]),
                      f"note={rec['reason']}"] + [f"{k}={json.dumps(v)}" for k, v in rec["extras"].items()]
                     + [f"time={rec['when']}", f"scan_id={rec['trace']}"])


def f_nested(rec):  # holdout only
    label = None if rec["safe"] is None else ("clean" if rec["safe"] else "phishing/malware")
    return json.dumps({"result": {"target": {"url": rec["url"], "host": rec["host"]},
                                  "assessment": {"malicious": None if rec["safe"] is None else not rec["safe"],
                                                 "label": label},
                                  "engines": {s: f"{r} ({d})" for s, r, d in rec["evidence"]},
                                  "explanation": rec["reason"], "network": rec["extras"]},
                       "meta": {"ts": rec["when"], "id": rec["trace"]}})


def f_sentence_json(rec):  # holdout only
    ev = " ".join(f"[{s}] {d}." for s, _, d in rec["evidence"])
    return json.dumps({"response": f"Verdict for {rec['url']}: {word(rec).upper()}. {rec['reason']}. "
                       f"Evidence: {ev}", "meta": {"generated": rec["when"], **rec["extras"], "request_id": rec["trace"]}})


TRAIN_FORMATS = {"flat": f_flat, "answer_first": f_answer_first, "checks": f_checks, "status": f_status,
                 "signal": f_signal, "prose": f_prose, "markdown": f_markdown, "kv": f_kv}
HOLDOUT_FORMATS = {"nested": f_nested, "sentence_json": f_sentence_json}


def pad_to(rng, rec, render, target):
    """Lengthen rec's trace so render(rec) is exactly `target` characters (never shortens)."""
    gap = target - len(render(rec))
    if gap > 0:
        rec["trace"] += "".join(rng.choice("0123456789abcdef") for _ in range(gap))
    return render(rec)


def random_choice_ctx(rng, rank):
    return {"ca": rng.choice(CAS), "rank": rank, "ip": "%d.%d.%d.%d" % (
        rng.randint(23, 212), rng.randint(0, 255), rng.randint(0, 255), rng.randint(1, 254))}
