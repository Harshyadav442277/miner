"""Audit the V2 splits: registrable domains (target and wrong-URL partner, plus every host
named in prompt or answers) must not repeat across train/val/test/holdout, and none may be a
probe, V1-cohort or excluded domain. Writes a JSON report; exits 1 on any overlap.

    python audit_splits_v2.py C:/Users/hyada/tg-eval/pairs/urlscan_v2 --sources <sources> --out audit.json
"""
import argparse
import json
import re
import sys
from pathlib import Path

from build_pairs_v2 import PSL, V1_CASES, EXCLUDE
from synth_mimic import SOURCE_URLS

HOST = re.compile(r"https?://([a-z0-9.-]+)")
PROBE = Path(__file__).with_name("build_preflight_pairs.py")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pairs", type=Path)
    ap.add_argument("--sources", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    psl = PSL(a.sources / "public_suffix_list.dat")
    reserved = set(EXCLUDE) | {psl.registrable(h) for h in HOST.findall(PROBE.read_text(encoding="utf-8"))}
    for path in V1_CASES:
        reserved |= {psl.registrable(c["url"].split("/")[2]) for c in json.loads(Path(path).read_text(encoding="utf-8"))}
    # Evidence-source URLs cited inside answers (V3 formats) are citations, not scanned targets.
    cited = {psl.registrable(u.split("/")[2]) for u in SOURCE_URLS.values()}
    regs, report = {}, {"splits": {}, "overlaps": {}, "reserved_hits": {}, "ignored_citation_domains": sorted(cited)}
    for split in ("train", "val", "test", "holdout"):
        rows = [json.loads(l) for l in (a.pairs / f"{split}.jsonl").read_text(encoding="utf-8").splitlines()]
        found = set()
        for r in rows:
            for field in ("prompt", "chosen", "rejected"):
                found |= {psl.registrable(h) for h in HOST.findall(r[field].lower())}
        found -= cited
        regs[split] = found
        report["splits"][split] = {"pairs": len(rows), "registrable_domains": len(found)}
        report["reserved_hits"][split] = sorted(found & reserved)
    names = list(regs)
    for i, x in enumerate(names):
        for y in names[i + 1:]:
            report["overlaps"][f"{x}|{y}"] = sorted(regs[x] & regs[y])
    report["reserved"] = sorted(reserved)
    bad = any(report["overlaps"].values()) or any(report["reserved_hits"].values())
    report["pass"] = not bad
    a.out.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "reserved"})[:1500])
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
