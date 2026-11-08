"""Dependency scenarios from the GHSA snapshot, and leaked-credential scenarios.

A scenario is {category, entity, files: [(name, lang, text)], findings: [...], traps: [...]}.
A finding is {sev, loc, ref, title, fix, kind}; a trap is a finding-shaped item that is NOT a
real issue (a patched version, a publishable key, an env-var reference), used for the
false-positive negatives. Truth for dependencies is the GHSA vulnerable range: an installed
version is vulnerable when the range contains it, and every snapshot advisory whose range
contains it is listed.
"""
import json
import random
import re
import string

SEV = {"critical": "critical", "high": "high", "moderate": "medium", "medium": "medium", "low": "low"}
VER = re.compile(r"^\d+(\.\d+){1,2}$")


def vt(v):
    parts = [int(x) for x in v.split(".")]
    return tuple(parts + [0] * (3 - len(parts)))


def in_range(version, rng):
    """GHSA ranges look like '< 1.2.6', '>= 2.0.0, < 2.3.1', '<= 1.0'. None if unparseable."""
    v = vt(version)
    for cond in rng.split(","):
        m = re.match(r"^\s*(<=|>=|<|>|=)\s*v?([\d.]+)\s*$", cond)
        if not m or not VER.match(m.group(2)):
            return None
        op, b = m.group(1), vt(m.group(2))
        ok = {"<": v < b, "<=": v <= b, ">": v > b, ">=": v >= b, "=": v == b}[op]
        if not ok:
            return False
    return True


def load_advisories(path):
    by_pkg = {}
    for line in open(path, encoding="utf-8"):
        a = json.loads(line)
        if a.get("withdrawn_at") or a.get("severity") not in SEV or not a.get("summary") or "withdrawn" in a["summary"].lower():
            continue
        for v in a["vulnerabilities"]:
            if v["range"] and v["patched"] and VER.match(v["patched"]) and in_range("0.0.1", v["range"]) is not None:
                name = v["name"].lower() if v["ecosystem"] in ("pip", "nuget", "composer") else v["name"]
                by_pkg.setdefault((v["ecosystem"], name), []).append(
                    {"ghsa": a["ghsa_id"], "cve": a.get("cve_id"), "summary": a["summary"].strip(),
                     "sev": SEV[a["severity"]], "range": v["range"], "patched": v["patched"],
                     "cwes": [c["cwe_id"] for c in a.get("cwes") or []]})
    return by_pkg


def vulnerable_version(advs, rng):
    """A version inside one advisory's range, just below its fix, hit by at most 2 advisories."""
    for adv in rng.sample(advs, len(advs)):
        p = vt(adv["patched"])
        cands = []
        if p[2] > 0:
            cands.append((p[0], p[1], p[2] - 1))
        if p[1] > 0:
            cands.append((p[0], p[1] - 1, rng.randint(0, 9)))
        for c in cands:
            ver = "%d.%d.%d" % c
            if in_range(ver, adv["range"]):
                hits = list({a["ghsa"]: a for a in advs if in_range(ver, a["range"])}.values())
                if 1 <= len(hits) <= 2:
                    return ver, hits
    return None, None


def safe_version(advs):
    ver = max((a["patched"] for a in advs), key=vt)
    return ver if not any(in_range(ver, a["range"]) for a in advs) else None


def manifest(eco, deps):
    """deps: [(name, version)] -> (filename, lang, text)."""
    if eco == "npm":
        body = ",\n".join(f'    "{n}": "{v}"' for n, v in deps)
        return "package.json", "json", '{\n  "name": "app",\n  "dependencies": {\n' + body + "\n  }\n}"
    if eco == "pip":
        return "requirements.txt", "text", "\n".join(f"{n}=={v}" for n, v in deps)
    if eco == "maven":
        rows = []
        for n, v in deps:
            g, art = n.split(":", 1)
            rows.append(f"  <dependency><groupId>{g}</groupId><artifactId>{art}</artifactId><version>{v}</version></dependency>")
        return "pom.xml", "xml", "<dependencies>\n" + "\n".join(rows) + "\n</dependencies>"
    if eco == "go":
        return "go.mod", "go", "module example.com/svc\n\ngo 1.21\n\nrequire (\n" + "\n".join(f"\t{n} v{v}" for n, v in deps) + "\n)"
    if eco == "rubygems":
        return "Gemfile.lock", "text", "GEM\n  specs:\n" + "\n".join(f"    {n} ({v})" for n, v in deps)
    if eco == "composer":
        body = ",\n".join(f'        "{n}": "{v}"' for n, v in deps)
        return "composer.json", "json", '{\n    "require": {\n' + body + "\n    }\n}"
    if eco == "nuget":
        return "App.csproj", "xml", "<ItemGroup>\n" + "\n".join(f'  <PackageReference Include="{n}" Version="{v}" />' for n, v in deps) + "\n</ItemGroup>"
    raise ValueError(eco)


ECOS = {"npm", "pip", "maven", "go", "rubygems", "composer", "nuget"}


def dep_scenario(rng, pkgs_by_eco, by_pkg, n_vuln):
    """pkgs_by_eco: this split's package keys grouped by ecosystem. n_vuln 0..2."""
    eco = rng.choice(sorted(e for e, ks in pkgs_by_eco.items() if len(ks) >= 5))
    keys = rng.sample(pkgs_by_eco[eco], min(len(pkgs_by_eco[eco]), 10))
    deps, findings, traps, entities = [], [], [], []
    for key in keys:
        name = key[1]
        if len([d for d in deps if d[2]]) < n_vuln:
            ver, hits = vulnerable_version(by_pkg[key], rng)
            if ver:
                deps.append((name, ver, True))
                entities.append(name)
                for h in hits:
                    findings.append({"sev": h["sev"], "loc": f"{name}@{ver}", "ref": h["cve"] or h["ghsa"],
                                     "title": h["summary"], "fix": f"upgrade {name} to {h['patched']} or later",
                                     "kind": "dependency", "cwe": (h["cwes"] or [None])[0]})
                continue
        ver = safe_version(by_pkg[key])
        if ver and len(deps) < 6:
            deps.append((name, ver, False))
            entities.append(name)
            adv = max(by_pkg[key], key=lambda a: vt(a["patched"]))
            traps.append({"sev": adv["sev"], "loc": f"{name}@{ver}", "ref": adv["cve"] or adv["ghsa"],
                          "title": adv["summary"], "fix": f"upgrade {name} to {adv['patched']} or later",
                          "kind": "dependency"})
        if len(deps) >= 6 and len([d for d in deps if d[2]]) >= n_vuln:
            break
    if len([d for d in deps if d[2]]) < n_vuln or len(deps) < 3:
        return None
    rng.shuffle(deps)
    fname, lang, text = manifest(eco, [(n, v) for n, v, _ in deps])
    return {"category": "dependency", "entity": [f"pkg:{eco}:{e}" for e in entities],
            "files": [(fname, lang, text)], "findings": findings, "traps": traps}


# ---- leaked credentials -----------------------------------------------------------------
A, AN, HEX = string.ascii_uppercase + "234567", string.ascii_letters + string.digits, "0123456789abcdef"


def rs(rng, alphabet, n):
    return "".join(rng.choice(alphabet) for _ in range(n))


SECRETS = [  # (variable names, value generator, severity, title, fix)
    (["AWS_ACCESS_KEY_ID", "aws_access_key_id"], lambda r: "AKIA" + rs(r, A, 16), "critical",
     "hardcoded AWS access key ID", "deactivate the key in IAM, rotate it and load credentials from the environment or a role"),
    (["AWS_SECRET_ACCESS_KEY", "aws_secret_access_key"], lambda r: rs(r, AN + "/+", 40), "critical",
     "hardcoded AWS secret access key", "revoke and rotate the key pair; use an IAM role or a secrets manager"),
    (["GITHUB_TOKEN", "GH_PAT", "github_token"], lambda r: "ghp_" + rs(r, AN, 36), "critical",
     "GitHub personal access token committed in plain text", "revoke the token in GitHub settings and inject it as a CI secret"),
    (["STRIPE_SECRET_KEY", "stripe_api_key"], lambda r: "sk_live_" + rs(r, AN, 24), "critical",
     "live Stripe secret key exposed", "roll the key in the Stripe dashboard and read it from a secret store"),
    (["SLACK_BOT_TOKEN", "slack_token"], lambda r: "xoxb-" + rs(r, "0123456789", 11) + "-" + rs(r, "0123456789", 12) + "-" + rs(r, AN, 24), "high",
     "Slack bot token in source", "revoke the token and store it outside the repository"),
    (["SENDGRID_API_KEY", "sendgrid_key"], lambda r: "SG." + rs(r, AN, 22) + "." + rs(r, AN, 43), "high",
     "SendGrid API key hardcoded", "delete the key in SendGrid and load it from the environment"),
    (["GOOGLE_MAPS_KEY", "google_api_key"], lambda r: "AIza" + rs(r, AN + "-_", 35), "medium",
     "Google API key embedded in config", "restrict or regenerate the key and keep it server-side"),
    (["DATABASE_URL", "db_url"], lambda r: f"postgres://{r.choice(['app','admin','svc'])}:{rs(r, AN, 14)}@db.internal:5432/{r.choice(['prod','orders','main'])}", "high",
     "database connection string with an embedded password", "rotate the database password and supply the URL via a secret"),
    (["JWT_SECRET", "jwt_signing_key"], lambda r: r.choice(["changeme", "supersecret", "secret123", "jwt-key-2024"]), "high",
     "weak hardcoded JWT signing secret", "generate a long random secret, rotate it and load it from the environment"),
    (["TWILIO_API_SECRET", "twilio_secret"], lambda r: rs(r, HEX, 32), "high",
     "Twilio API secret in plain text", "rotate the secret in Twilio and move it to a secrets manager"),
]
BENIGN = [("PORT", lambda r: str(r.choice([3000, 8080, 8000, 5000]))), ("LOG_LEVEL", lambda r: r.choice(["info", "debug", "warn"])),
          ("AWS_REGION", lambda r: r.choice(["us-east-1", "eu-west-1", "ap-south-1"])), ("NODE_ENV", lambda r: "production"),
          ("CACHE_TTL", lambda r: str(r.choice([60, 300, 3600]))), ("FEATURE_FLAGS", lambda r: "search,export")]
TRAPS = [("STRIPE_PUBLISHABLE_KEY", lambda r: "pk_live_" + rs(r, AN, 24), "publishable Stripe key (public by design)"),
         ("DB_PASSWORD", lambda r: "${DB_PASSWORD}", "password read from an environment reference"),
         ("API_KEY", lambda r: "<your-api-key>", "placeholder value"),
         ("SENTRY_DSN_PUBLIC", lambda r: "https://" + rs(r, HEX, 32) + "@o1.ingest.sentry.io/42", "public Sentry DSN")]
SECRET_FORMATS = ["env", "yaml", "python", "js", "compose", "json", "ini", "terraform"]


def secret_file(fmt, items):
    if fmt == "env":
        return ".env", "text", "\n".join(f"{k}={v}" for k, v in items)
    if fmt == "yaml":
        return "config.yaml", "yaml", "app:\n" + "\n".join(f"  {k.lower()}: \"{v}\"" for k, v in items)
    if fmt == "python":
        return "settings.py", "python", "\n".join(f'{k.upper()} = "{v}"' for k, v in items)
    if fmt == "js":
        return "config.js", "javascript", "module.exports = {\n" + "\n".join(f"  {k.lower()}: '{v}'," for k, v in items) + "\n};"
    if fmt == "compose":
        return "docker-compose.yml", "yaml", "services:\n  api:\n    image: api:1.4\n    environment:\n" + "\n".join(f"      - {k}={v}" for k, v in items)
    if fmt == "json":
        return "appsettings.json", "json", "{\n" + ",\n".join(f'  "{k}": "{v}"' for k, v in items) + "\n}"
    if fmt == "ini":
        return "app.ini", "ini", "[default]\n" + "\n".join(f"{k.lower()} = {v}" for k, v in items)
    if fmt == "terraform":
        return "provider.tf", "hcl", 'provider "app" {\n' + "\n".join(f'  {k.lower()} = "{v}"' for k, v in items) + "\n}"
    raise ValueError(fmt)


def secret_scenario(rng, fmt, n_secret, n_trap):
    picks = rng.sample(SECRETS, n_secret)
    items, findings, traps = [], [], []
    for names, gen, sev, title, fix in picks:
        items.append((rng.choice(names), gen(rng), "s", sev, title, fix))
    for name, gen, why in rng.sample(TRAPS, n_trap):
        items.append((name, gen(rng), "t", "high", f"hardcoded secret {name}", why))
    for name, gen in rng.sample(BENIGN, rng.randint(2, 4)):
        items.append((name, gen(rng), "b", None, None, None))
    rng.shuffle(items)
    fname, lang, text = secret_file(fmt, [(k, v) for k, v, *_ in items])
    for line_no, (k, v, t, sev, title, fix) in enumerate(items, 1):
        shown = k if fmt in ("env", "compose", "json") else (k.upper() if fmt == "python" else k.lower())
        mask = v[:4] + "****" if len(v) > 8 else "****"
        if t == "s":
            findings.append({"sev": sev, "loc": f"{fname} ({shown})", "ref": "CWE-798", "title": f"{title} ({mask})",
                             "fix": fix, "kind": "secret"})
        elif t == "t":
            traps.append({"sev": "high", "loc": f"{fname} ({shown})", "ref": "CWE-798", "title": f"hardcoded credential {shown}",
                          "fix": "rotate it and move it to a secrets manager", "kind": "secret"})
    return {"category": "secret", "entity": [f"secretfmt:{fmt}"], "files": [(fname, lang, text)],
            "findings": findings, "traps": traps}
