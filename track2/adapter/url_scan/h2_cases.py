"""Freeze the H2 real-answer cases before any miner call: hosts from the reserved `real` bucket
(registrable-domain hash 95-99, never used for training or H1), ordered by a fixed SHA-256 seed.
Unsafe = on the CERT Polska snapshot; safe = Majestic Million top 50,000 and not on CERT.

    python h2_cases.py --sources <sources> --out cases-h2.json [--unsafe 12 --safe 8]
"""
import argparse
import hashlib
import json
from pathlib import Path

from build_pairs_v2 import PSL, load_hosts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sources", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--unsafe", type=int, default=12)
    ap.add_argument("--safe", type=int, default=8)
    a = ap.parse_args()
    unsafe, safe, _ = load_hosts(a.sources, PSL(a.sources / "public_suffix_list.dat"))
    order = lambda h: hashlib.sha256(("urlscan-h2:" + h[0]).encode()).hexdigest()
    cases, seen = [], set()
    for label, pool, n in ((False, unsafe["real"], a.unsafe), (True, safe["real"], a.safe)):
        for host, reg, rank in sorted(pool, key=order):
            if len([c for c in cases if c["expected_safe"] == label]) == n:
                break
            if reg in seen:
                continue
            seen.add(reg)
            cases.append({"case": f"{'safe' if label else 'certpl'}-{len(cases)}", "url": f"https://{host}/",
                          "expected_safe": label, "registrable": reg, "majestic_rank": rank,
                          "source": "https://downloads.majestic.com/majestic_million.csv" if label
                          else "https://hole.cert.pl/domains/v2/domains.txt"})
    if a.out.exists():
        raise SystemExit("cases already frozen")
    a.out.write_text(json.dumps(cases, indent=1), encoding="utf-8")
    print(json.dumps(cases, indent=1))


if __name__ == "__main__":
    main()
