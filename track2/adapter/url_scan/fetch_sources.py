"""Download the licence-recorded public sources for the URL Scan adapter into a new folder.

Each source is saved byte for byte with its URL, UTC fetch time, HTTP status, size, sha256
and the licence text quoted from the publisher's page on the same day. Sources whose terms
forbid or restrict commercial use (OpenPhish, URLhaus, Tranco's Cloudflare Radar input) are
listed under `excluded` with the reason and are never downloaded.

    python fetch_sources.py --out C:/Users/hyada/tg-eval/data/urlscan_sources_r1
"""
import argparse
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

SOURCES = {
    "certpl_domains.txt": {
        "url": "https://hole.cert.pl/domains/v2/domains.txt",
        "label": "unsafe",
        "licence_url": "https://cert.pl/en/posts/2020/03/malicious_domains/",
        "licence": "The Warning List may be used by any user for any purpose, including commercial "
                   "purposes, without any representation or warranty. Attribution of the data source "
                   "is not required.",
    },
    "feodo_ipblocklist.txt": {
        "url": "https://feodotracker.abuse.ch/downloads/ipblocklist.txt",
        "label": "unsafe",
        "licence_url": "https://abuse.ch/terms-of-use/",
        "licence": "Terms section 3.4: Feodo Tracker, SSL Blacklist and YARAify are free to use without "
                   "limitations according to Creative Commons principles (CC0) for both commercial and "
                   "non-commercial purposes.",
    },
    "sslbl_ipblacklist.txt": {
        "url": "https://sslbl.abuse.ch/blacklist/sslipblacklist.txt",
        "label": "unsafe",
        "licence_url": "https://abuse.ch/terms-of-use/",
        "licence": "Terms section 3.4 (as Feodo Tracker): CC0, commercial and non-commercial.",
    },
    "majestic_million.csv": {
        "url": "https://downloads.majestic.com/majestic_million.csv",
        "label": "safe (popularity, not a safety certificate)",
        "licence_url": "https://majestic.com/reports/majestic-million",
        "licence": "Licensed under a Creative Commons Attribution 3.0 Unported License. Attribution: "
                   "The Majestic Million, Majestic-12 Ltd.",
    },
    "public_suffix_list.dat": {
        "url": "https://publicsuffix.org/list/public_suffix_list.dat",
        "label": "registrable-domain splitting only",
        "licence_url": "https://publicsuffix.org/list/public_suffix_list.dat",
        "licence": "Mozilla Public License 2.0 (header of the file).",
    },
}

EXCLUDED = {
    "https://openphish.com/feed.txt": "Terms of Use forbid any commercial purpose, including detection "
                                      "and product development (checked 2026-11-07).",
    "https://urlhaus.abuse.ch/downloads/csv_recent/": "abuse.ch terms section 4.1: URLhaus use with "
                                                      "commercial or for-profit needs may require a paid "
                                                      "subscription (checked 2026-11-07).",
    "https://tranco-list.eu/top-1m.csv.zip": "Combines Cloudflare Radar data under CC BY-NC 4.0 "
                                             "(checked 2026-11-07).",
    "https://phishtank.org/": "Bulk feed needs a registered account and application key; not created.",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)  # a new folder each time: never overwrite a snapshot
    manifest = {"created_at": datetime.now(timezone.utc).isoformat(), "sources": {}, "excluded": EXCLUDED}
    for name, meta in SOURCES.items():
        path = a.out / name
        fetched_at = datetime.now(timezone.utc).isoformat()
        proc = subprocess.run(["curl", "-4", "-sS", "-L", "--proto", "=https", "--proto-redir", "=https",
                               "-A", "Mozilla/5.0", "--max-time", "300", "-o", str(path),
                               "-w", "%{http_code}", "--url", meta["url"]],
                              capture_output=True, text=True)
        data = path.read_bytes() if path.exists() else b""
        manifest["sources"][name] = {**meta, "fetched_at": fetched_at, "http_status": proc.stdout.strip(),
                                     "curl_exit": proc.returncode, "bytes": len(data),
                                     "sha256": hashlib.sha256(data).hexdigest()}
        print(name, proc.stdout.strip(), len(data), flush=True)
    (a.out / "MANIFEST.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
