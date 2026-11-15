"""Snapshot reviewed GitHub Security Advisories (CC-BY-4.0) for the dependency findings.

Calls the public REST endpoint GET /advisories through the authenticated `gh` CLI, one
ecosystem at a time, newest first, and writes the raw pages plus a sha256 manifest. Only the
fields the pair builder needs are kept in `advisories.jsonl`; the raw pages stay for audit.

    python fetch_ghsa.py --out C:/Users/hyada/tg-eval/pairs/security_review_src/ghsa
"""
import argparse
import datetime
import hashlib
import json
import subprocess
from pathlib import Path

ECOSYSTEMS = {"npm": 14, "pip": 14, "maven": 10, "go": 10, "rubygems": 5, "composer": 6, "nuget": 4}
# Widely used packages, one extra query each, so the snapshot is not only this month's long tail.
POPULAR = {
    "npm": "lodash minimist axios express jsonwebtoken moment node-fetch ws semver qs tar minimatch "
           "handlebars marked jquery underscore follow-redirects body-parser serialize-javascript "
           "xml2js ejs shell-quote path-to-regexp got undici next vm2 mongoose sequelize dompurify",
    "pip": "django flask requests urllib3 pyyaml jinja2 pillow werkzeug cryptography paramiko sqlalchemy "
           "lxml tornado aiohttp numpy setuptools pyjwt fastapi starlette gunicorn twisted celery "
           "transformers mlflow gradio",
    "maven": "org.apache.logging.log4j:log4j-core com.fasterxml.jackson.core:jackson-databind "
             "org.springframework:spring-core org.springframework:spring-web org.yaml:snakeyaml "
             "commons-collections:commons-collections org.apache.commons:commons-text "
             "org.apache.struts:struts2-core com.thoughtworks.xstream:xstream io.netty:netty-codec-http "
             "org.apache.tomcat.embed:tomcat-embed-core com.h2database:h2 org.postgresql:postgresql",
    "go": "github.com/gin-gonic/gin golang.org/x/net golang.org/x/crypto github.com/dgrijalva/jwt-go "
          "github.com/gorilla/websocket google.golang.org/grpc github.com/docker/docker "
          "github.com/opencontainers/runc gopkg.in/yaml.v2",
    "rubygems": "rails actionpack nokogiri rack devise activerecord",
    "composer": "laravel/framework symfony/http-kernel guzzlehttp/guzzle phpmailer/phpmailer twig/twig",
}
KEEP = ("ghsa_id", "cve_id", "summary", "severity", "cwes", "published_at", "withdrawn_at", "cvss")


def keep(adv):
    vulns = [{"ecosystem": v["package"]["ecosystem"], "name": v["package"]["name"],
              "range": v.get("vulnerable_version_range"), "patched": v.get("first_patched_version")}
             for v in adv.get("vulnerabilities") or [] if v.get("package")]
    return {**{k: adv.get(k) for k in KEEP}, "vulnerabilities": vulns}


def page(ecosystem, after):
    q = f"/advisories?type=reviewed&ecosystem={ecosystem}&per_page=100&sort=published&direction=desc"
    if after:
        q += f"&after={after}"
    out = subprocess.run(["gh", "api", "-i", q], capture_output=True, text=True, encoding="utf-8", check=True).stdout
    head, _, body = out.partition("\r\n\r\n") if "\r\n\r\n" in out else out.partition("\n\n")
    nxt = None
    for line in head.splitlines():
        if line.lower().startswith("link:"):
            for part in line.split(","):
                if 'rel="next"' in part:
                    url = part[part.index("<") + 1:part.index(">")]
                    for kv in url.split("?", 1)[1].split("&"):
                        if kv.startswith("after="):
                            nxt = kv[6:]
    return json.loads(body), nxt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--scale", type=float, default=1.0)
    a = ap.parse_args()
    raw = a.out / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    rows, files = [], {}
    for eco, pages in ECOSYSTEMS.items():
        after = None
        for i in range(max(1, int(pages * a.scale))):
            data, after = page(eco, after)
            path = raw / f"{eco}-{i:02d}.json"
            path.write_text(json.dumps(data), encoding="utf-8")
            files[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
            rows += [keep(adv) for adv in data]
            print(eco, i, len(data), flush=True)
            if not after:
                break
    for eco, names in POPULAR.items():
        for name in names.split():
            q = f"/advisories?type=reviewed&ecosystem={eco}&affects={name}&per_page=100"
            data = json.loads(subprocess.run(["gh", "api", q], capture_output=True, text=True,
                                             encoding="utf-8", check=True).stdout)
            path = raw / f"popular-{eco}-{name.replace('/', '_').replace(':', '_')}.json"
            path.write_text(json.dumps(data), encoding="utf-8")
            files[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
            rows += [keep(adv) for adv in data]
            print(eco, name, len(data), flush=True)
    seen, unique = set(), []
    for r in rows:
        if r["ghsa_id"] not in seen:
            seen.add(r["ghsa_id"])
            unique.append(r)
    rows = unique
    out = a.out / "advisories.jsonl"
    out.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    manifest = {"source": "GitHub Advisory Database via GET https://api.github.com/advisories (type=reviewed)",
                "licence": "CC-BY-4.0 (https://github.com/github/advisory-database/blob/main/LICENSE.md)",
                "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "advisories": len(rows), "raw_pages_sha256": files,
                "advisories_jsonl_sha256": hashlib.sha256(out.read_bytes()).hexdigest()}
    (a.out / "MANIFEST.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in manifest.items() if k != "raw_pages_sha256"}))


if __name__ == "__main__":
    main()
