"""EMAIL_SECURITY query set: real domains from the Tranco list, DNS names and types an email-security
check asks about, balanced on DNS truth. Seeded and byte-reproducible.

    python -I make_queries.py candidates TRANCO_CSV --out candidates.json      # holdout + pilot candidates
    python -I dnstruth.py candidates.json --out candidates-truth.jsonl          # pre-check truth (two resolvers)
    python -I make_queries.py select candidates.json candidates-truth.jsonl --out-dir holdout/

Split: every Tranco domain goes to one bucket by sha256("es-split-v1:" + domain) mod 100:
0-9 holdout, 10 pilot, 11-99 training. One query per holdout domain. `select` writes queries.json
(balanced: half lookup_ok true, half false, record types spread), pilot.json (3 queries: data, NODATA,
NXDOMAIN) and holdout_domains.txt (every holdout-bucket domain in the list: the training exclusion).
"""
import argparse
import csv
import hashlib
import json
import random
import sys
from pathlib import Path

SEED = 20261115
BANDS = ((1, 1000, 100), (1001, 10000, 200), (10001, 100000, 200), (100001, 1000000, 200))
SELECTORS = ("google", "selector1", "selector2", "default", "k1", "s1", "dkim", "mail")
# (template, record type, weight). {d} is the domain; {sel} a DKIM selector; {rnd} a seeded random label.
TEMPLATES = (
    ("{d}", "MX", 6), ("{d}", "TXT", 5), ("{d}", "A", 2), ("{d}", "AAAA", 2), ("{d}", "NS", 2),
    ("{d}", "SOA", 1), ("{d}", "CAA", 3),
    ("_dmarc.{d}", "TXT", 7), ("{sel}._domainkey.{d}", "TXT", 6), ("_mta-sts.{d}", "TXT", 3),
    ("_smtp._tls.{d}", "TXT", 3), ("_submission._tcp.{d}", "SRV", 2), ("_imaps._tcp.{d}", "SRV", 2),
    ("_autodiscover._tcp.{d}", "SRV", 2), ("mail.{d}", "A", 2), ("www.{d}", "MX", 2),
    ("autodiscover.{d}", "CNAME", 2), ("{rnd}.{d}", "MX", 3), ("_dmarc.{rnd}.{d}", "TXT", 2),
)
TARGET = 300


def bucket(domain):
    return int(hashlib.sha256(f"es-split-v1:{domain}".encode()).hexdigest(), 16) % 100


def question(name, rtype):
    return f"What are the {rtype} records for {name}?"


def read_tranco(path):
    with open(path, encoding="utf-8", newline="") as fh:
        return [(int(r[0]), r[1].strip().lower()) for r in csv.reader(fh) if len(r) >= 2 and r[0].isdigit()]


def candidates(tranco):
    rng = random.Random(SEED)
    out, weights = [], [w for _, _, w in TEMPLATES]
    for lo, hi, n in BANDS:
        pool = [(rank, d) for rank, d in tranco if lo <= rank <= hi and bucket(d) < 11]
        rng.shuffle(pool)
        for rank, d in pool[: n + 40]:  # +40: room for the pilot bucket and dropped rows
            tpl, rtype, _ = rng.choices(TEMPLATES, weights=weights)[0]
            rnd = "mx-" + "".join(rng.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(6))
            name = tpl.format(d=d, sel=rng.choice(SELECTORS), rnd=rnd)
            qid = "es-" + hashlib.sha256(f"{name}|{rtype}".encode()).hexdigest()[:10]
            out.append({"id": qid, "query": question(name, rtype), "params": {"domain": name, "record_type": rtype},
                        "registrable": d, "tranco_rank": rank, "template": tpl, "bucket": bucket(d)})
    return out


def select(cands, truth):
    by_id = {t["query_id"]: t for t in truth}
    rng = random.Random(SEED + 1)
    usable = [c for c in cands if by_id.get(c["id"], {}).get("lookup_ok") is not None]
    hold = [c for c in usable if c["bucket"] < 10]
    pilot_pool = [c for c in usable if c["bucket"] == 10]
    for c in hold:
        c["truth_precheck"] = by_id[c["id"]]["status"]
    true_rows = [c for c in hold if c["truth_precheck"] == "NOERROR"]
    false_rows = [c for c in hold if c["truth_precheck"] != "NOERROR"]
    rng.shuffle(true_rows)
    rng.shuffle(false_rows)
    half = min(TARGET // 2, len(true_rows), len(false_rows))

    def spread(rows, k):  # round-robin over record types so no type dominates
        by_type = {}
        for r in rows:
            by_type.setdefault(r["params"]["record_type"], []).append(r)
        picked, types = [], sorted(by_type)
        while len(picked) < k and any(by_type.values()):
            for t in types:
                if by_type[t] and len(picked) < k:
                    picked.append(by_type[t].pop())
        return picked

    chosen = spread(true_rows, half) + spread(false_rows, half)
    chosen.sort(key=lambda c: c["id"])
    pilot = []
    for want in ("data", "nodata", "nxdomain"):
        for c in pilot_pool:
            t = by_id[c["id"]]
            kind = "nxdomain" if t["status"] == "NXDOMAIN" else ("data" if t["records"] else "nodata") \
                if t["status"] == "NOERROR" else None
            if kind == want and c not in pilot:
                pilot.append(c)
                break
    return chosen, pilot


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("candidates")
    c.add_argument("tranco", type=Path)
    c.add_argument("--out", type=Path, required=True)
    s = sub.add_parser("select")
    s.add_argument("candidates", type=Path)
    s.add_argument("truth", type=Path)
    s.add_argument("--tranco", type=Path, required=True)
    s.add_argument("--out-dir", type=Path, required=True)
    a = ap.parse_args()
    if a.cmd == "candidates":
        rows = candidates(read_tranco(a.tranco))
        a.out.write_text(json.dumps(rows, indent=1) + "\n", encoding="utf-8", newline="\n")
        print(json.dumps({"candidates": len(rows), "holdout_bucket": sum(r["bucket"] < 10 for r in rows)}))
        return
    cands = json.loads(a.candidates.read_text(encoding="utf-8"))
    truth = [json.loads(l) for l in a.truth.read_text(encoding="utf-8").splitlines() if l.strip()]
    chosen, pilot = select(cands, truth)
    a.out_dir.mkdir(parents=True, exist_ok=True)
    keep = ("id", "query", "params", "registrable", "tranco_rank", "template", "truth_precheck")
    w = lambda name, rows: (a.out_dir / name).write_text(
        json.dumps([{k: r[k] for k in keep if k in r} for r in rows], indent=1) + "\n", encoding="utf-8", newline="\n")
    w("queries.json", chosen)
    w("pilot.json", pilot)
    excl = sorted({d for _, d in read_tranco(a.tranco) if bucket(d) <= 10})
    (a.out_dir / "holdout_domains.txt").write_text("\n".join(excl) + "\n", encoding="utf-8", newline="\n")
    stat = lambda rows, k: {v: sum(1 for r in rows if (r["params"]["record_type"] if k == "type" else r.get(k)) == v)
                            for v in sorted({r["params"]["record_type"] if k == "type" else r.get(k) for r in rows})}
    print(json.dumps({"queries": len(chosen), "by_truth": stat(chosen, "truth_precheck"), "by_type": stat(chosen, "type"),
                      "pilot": [p["query"] for p in pilot], "excluded_domains": len(excl)}, indent=1))


if __name__ == "__main__":
    sys.exit(main())
