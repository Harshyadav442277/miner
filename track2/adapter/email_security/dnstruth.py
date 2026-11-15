"""DNS truth for EMAIL_SECURITY labels, from two public resolvers that are not miners in this family.

    python -I dnstruth.py queries.json --out truth-<when>.jsonl

For each query's (domain, record_type) it asks two validating DoH resolvers, JSON form
(`?name=&type=`, accept: application/dns-json), over HTTP/1.1:
  - NextDNS  https://dns.nextdns.io/dns-query
  - DNS.SB   https://doh.dns.sb/dns-query
Neither is a miner in EMAIL_SECURITY_GENERAL (checked 2026-11-15). Quad9 was tried and refused HTTP/1.1
(505, RFC 8484 section 5.2); this machine's curl has no HTTP/2.
A query's truth is `lookup_ok` = (Status == NOERROR) only when both resolvers return the same Status;
otherwise it is `disagree` and the query is dropped. Raw response text is kept. One request per
second per resolver. Resumable: rows already in --out are skipped.
"""
import argparse
import datetime as dt
import json
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

RCODES = {0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED"}
RESOLVERS = {"nextdns": "https://dns.nextdns.io/dns-query", "dnssb": "https://doh.dns.sb/dns-query"}
UA = "Mozilla/5.0 (dns-truth)"
TYPE_NUM = {"A": 1, "NS": 2, "CNAME": 5, "SOA": 6, "PTR": 12, "MX": 15, "TXT": 16, "AAAA": 28, "SRV": 33,
            "TLSA": 52, "HTTPS": 65, "CAA": 257}


def ask(resolver, name, rtype):
    url = RESOLVERS[resolver] + "?" + urllib.parse.urlencode({"name": name, "type": rtype})
    cmd = ["curl.exe", "-4", "-sS", "--max-time", "20", "-A", UA, "-H", "accept: application/dns-json",
           "-w", "\n%{http_code}", "--url", url]
    r = subprocess.run(cmd, capture_output=True)
    body, _, code = r.stdout.rpartition(b"\n")
    rec = {"resolver": resolver, "url": url, "http": int(code) if code.strip().isdigit() else 0,
           "error": r.stderr.decode("utf-8", "replace").strip(), "raw": body.decode("utf-8", "replace"),
           "status": None, "answers": []}
    try:
        d = json.loads(body)
        rec["status"] = RCODES.get(d.get("Status"), str(d.get("Status")))
        want = TYPE_NUM.get(rtype)
        rec["answers"] = sorted(str(a.get("data")) for a in d.get("Answer") or [] if a.get("type") == want)
        rec["answer_count"] = len(d.get("Answer") or [])
    except (ValueError, AttributeError):
        pass
    return rec


def truth(q):
    name, rtype = q["params"]["domain"], q["params"]["record_type"].upper()
    a = ask("nextdns", name, rtype)
    b = ask("dnssb", name, rtype)
    agree = a["status"] is not None and a["status"] == b["status"]
    return {"query_id": q.get("id"), "domain": name, "record_type": rtype,
            "checked_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "status": a["status"] if agree else "disagree",
            "lookup_ok": (a["status"] == "NOERROR") if agree else None,
            "records": a["answers"] if agree else None,
            "records_agree": a["answers"] == b["answers"], "nextdns": a, "dnssb": b}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("queries", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    queries = json.loads(a.queries.read_text(encoding="utf-8"))
    done = set()
    if a.out.exists():
        done = {json.loads(l)["query_id"] for l in a.out.read_text(encoding="utf-8").splitlines() if l.strip()}
    with open(a.out, "a", encoding="utf-8", newline="\n") as fh:
        for q in queries:
            if q.get("id") in done:
                continue
            fh.write(json.dumps(truth(q), ensure_ascii=False) + "\n")
            fh.flush()
            time.sleep(1.0)
    rows = [json.loads(l) for l in a.out.read_text(encoding="utf-8").splitlines() if l.strip()]
    counts = {}
    for r in rows:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print(json.dumps({"rows": len(rows), "by_status": counts}))


if __name__ == "__main__":
    sys.exit(main())
