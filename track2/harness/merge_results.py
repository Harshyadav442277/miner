"""Merge measure.py result files measured one package at a time into one file for compare.py and gate.py.

    python merge_results.py holdout-OURS.json holdout-QA301.json holdout-GENERIC.json --out holdout-all.json

Refuses unless every file measured the same pair sets (same sha256 per set), with the same foundation and
engine hashes, and no package name appears twice. Baselines come from the first file (they depend only on
the pairs, and the pairs are checked equal).
"""
import argparse
import json
import sys
from pathlib import Path


class MergeError(ValueError):
    pass


def merge(docs):
    if not docs:
        raise MergeError("no files")
    base = docs[0]
    out = {"pairs": base["pairs"], "baselines": base["baselines"], "foundation_hash": base["foundation_hash"],
           "engine_hash": base["engine_hash"], "packages": {}}
    for i, d in enumerate(docs):
        for key in ("foundation_hash", "engine_hash"):
            if d.get(key) != base.get(key):
                raise MergeError(f"file {i}: {key} {d.get(key)} != {base.get(key)}")
        if set(d["pairs"]) != set(base["pairs"]):
            raise MergeError(f"file {i}: pair sets {sorted(d['pairs'])} != {sorted(base['pairs'])}")
        for s, meta in d["pairs"].items():
            if meta["sha256"] != base["pairs"][s]["sha256"]:
                raise MergeError(f"file {i}: set {s} sha256 {meta['sha256']} != {base['pairs'][s]['sha256']}")
        for name, pkg in d["packages"].items():
            if name in out["packages"]:
                raise MergeError(f"package {name!r} appears twice")
            out["packages"][name] = pkg
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    try:
        merged = merge([json.loads(f.read_text(encoding="utf-8")) for f in a.files])
    except MergeError as exc:
        sys.exit(f"REFUSED: {exc}")
    a.out.write_text(json.dumps(merged, indent=1) + "\n", encoding="utf-8")
    print(f"merged {sorted(merged['packages'])} over sets {sorted(merged['pairs'])} -> {a.out}")


if __name__ == "__main__":
    main()
