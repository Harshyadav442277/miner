"""EMAIL_SECURITY v2 cases: the three kinds the node's public pairs for #221 held (8/15, 2026-11-24), in our own words.
None of the captured text is used.

- **posture:** the prompt names a domain and nothing else. The answer's stated posture must follow from its own SPF
  and DMARC fields: None with neither; Weak with SPF but no enforcing DMARC; Strong with SPF and DMARC at quarantine
  or reject. The worse answer states the same fields with a posture that does not follow from them.
- **capture:** a supplied Google DoH response with a reference time and source URL. `lookup_ok` follows from its
  Status. The worse answer flips `lookup_ok`.
- **phishing:** a brand display name, an envelope sender and Authentication-Results. The verdict follows from whether
  the sender domain is the brand's own domain and whether the link or attachment is unsafe. The worse answer flips
  the verdict, with the same wording.
"""
import json

BRANDS = [("PayPal", "paypal.com"), ("Chase", "chase.com"), ("HMRC", "hmrc.gov.uk"), ("Netflix", "netflix.com"),
          ("Microsoft", "microsoft.com"), ("DHL", "dhl.com"), ("Amazon", "amazon.com"), ("Wells Fargo", "wellsfargo.com"),
          ("Revolut", "revolut.com"), ("IRS", "irs.gov"), ("Apple", "apple.com"), ("Coinbase", "coinbase.com"),
          ("Santander", "santander.co.uk"), ("Australia Post", "auspost.com.au"), ("ICICI Bank", "icicibank.com")]
LOOKALIKE = ["{b}-verify.com", "secure-{b}.net", "{b}-account-alerts.com", "{b}support.co", "{b}-billing.info",
             "{b}.security-check.io"]
QUAL = {"-all": "hard fail (-all)", "~all": "soft fail (~all)", "?all": "neutral (?all)"}


def posture_of(spf, policy):
    if not spf and not policy:
        return "None"
    return "Strong" if spf and policy in ("quarantine", "reject") else "Weak"


def posture_case(rng, domain_fn, split):
    d = domain_fn(rng, split)
    right = rng.choice(["None", "Weak", "Strong"])  # uniform, so no posture word leans to one side
    while True:
        spf = rng.choice([None, "-all", "~all", "?all"])
        policy = rng.choice([None, "none", "quarantine", "reject"])
        if posture_of(spf, policy) == right:
            break
    wrong = rng.choice([p for p in ("None", "Weak", "Strong") if p != right])
    mx = rng.random() < 0.85
    q = rng.choice(["What is the email security posture of {d}? Check SPF, DMARC and MX.",
                    "Rate {d}'s mail authentication (SPF and DMARC) and say whether it can receive mail.",
                    "Email posture check for {d}: SPF, DMARC, MX."]).format(d=d)

    def say(p, style):
        if style == "json":
            return json.dumps({"domain": d, "posture": p, "spf": {"present": bool(spf), "qualifier": QUAL.get(spf)},
                               "dmarc": {"present": bool(policy), "policy": policy}, "mx_present": mx})
        s = f"SPF ends in {QUAL[spf]}" if spf else "no SPF record is published"
        m = f"DMARC is published with p={policy}" if policy else "no DMARC record is published"
        return f"{d} has {p} email security: {s}; {m}; MX records are {'present' if mx else 'absent'}."
    style = rng.choice(["json", "prose"])
    return q, say(right, style), say(wrong, style), "posture"


def capture_case(rng, domain_fn, split, doh):
    d = domain_fn(rng, split)
    rtype = rng.choice(["MX", "TXT"])
    status = rng.choice([0, 0, 3, 2])
    answers = ([f"10 mx1.{d}."] if rtype == "MX" else [f"\"v=spf1 include:_spf.{d} -all\""]) if status == 0 and rng.random() < 0.8 else []
    ts = f"2026-{rng.randint(1, 11):02d}-{rng.randint(1, 28):02d}T{rng.randint(0, 23):02d}:{rng.randint(0, 59):02d}:00+00:00"
    q = rng.choice([
        "Reference time {ts}. A reviewer needs the DNS evidence for {t} at {d}: read the response below, do not look it up "
        "again. Source: https://dns.google/resolve?name={d}&type={t}\n{j}",
        "From this resolver capture ({ts}), did the {t} lookup for {d} succeed? Use only the supplied response.\n{j}"]
    ).format(ts=ts, t=rtype, d=d, j=doh(d, rtype, status, answers))
    note = {0: "Status 0 (NOERROR)", 2: "Status 2 (SERVFAIL)", 3: "Status 3 (NXDOMAIN)"}[status]

    def say(ok):
        return (json.dumps({"capture": ts, "domain": d, "lookup_ok": ok, "record_type": rtype}) +
                f" This reads the supplied response for {d} {rtype}, which carries {note}.")
    return q, say(status == 0), say(status != 0), "capture"


def phishing_case(rng, split):
    brand, real = rng.choice(BRANDS)
    phish = rng.random() < 0.45  # with unsafe attachments on own domains, about half the cases are phishing
    stem = real.split(".")[0]
    sender = rng.choice(LOOKALIKE).format(b=stem + str(rng.randint(2, 99))) if phish else real
    link = f"{sender if rng.random() < 0.7 else real}/login?ref={rng.randint(1000, 99999)}"  # quoted by both answers
    attach = rng.choice([None, None, "statement.pdf", "invoice.exe", "notice.html"])
    risky = phish or (attach and attach.endswith((".exe", ".html")))
    auth = f"spf=pass smtp.mailfrom={sender}; dkim=pass header.d={sender}; dmarc=pass header.from={sender}"
    q = (f"From: \"{brand}\" <alerts@{sender}>\nAuthentication-Results: mx.example.net; {auth}\n"
         f"Subject: Action needed on your {brand} account\nThe message links to https://{link}"
         + (f" and attaches {attach}" if attach else "") + ". Is this email safe?")
    own = sender == real
    # Both answers use the same two templates; the worse one makes a claim the headers contradict.
    legit = f"Legitimate: the sender {sender} is {brand}'s own domain, authentication passes for it, and the link https://{link} is its own."
    bad_reason = (f"authentication passes only for {sender}, which is not {brand}'s domain {real}" if not own else
                  f"the sender is {real}, but {attach} is an unsafe attachment" if attach and attach.endswith((".exe", ".html"))
                  else f"authentication passes only for {sender}, which is not {brand}'s domain")
    phishy = f"Phishing: treat as malicious; {bad_reason}, so https://{link} should not be opened."
    return q, (phishy if risky else legit), (legit if risky else phishy), "phishing"
