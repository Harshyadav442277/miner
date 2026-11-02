"""Independently check the source labels, coverage, split and archived input bytes."""
import argparse
import collections
import csv
import gzip
import hashlib
import json
from pathlib import Path
import re

from collect_miners import save


def normalize(text):
    return " ".join(sorted(re.findall(r"[a-z0-9]+", text.lower())))


def claim(text):
    if text.startswith("{"):
        body = json.loads(text)
        values = [body[k] for k in ("matched", "match", "sanctioned", "on_list", "verdict") if k in body]
        assert len(values) == 1
        value = values[0]
        assert type(value) in (bool, int, str)
        assert value in (True, False, 0, 1, "match", "no_match")
        return value in (True, 1, "match")
    if ": An exact name entry was found in the OFAC SDN snapshot." in text:
        return True
    if ": No exact name entry was found in the OFAC SDN snapshot." in text:
        return False
    if ": MATCH. Identity is not established by name alone." in text:
        return True
    if ": NO MATCH. Identity is not established by name alone." in text:
        return False
    raise ValueError("unrecognized declared fixture")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--archive", type=Path, required=True)
    ap.add_argument("--exclude-queries", type=Path, nargs="+", required=True)
    a = ap.parse_args()
    source = a.home / "data/sanctions"
    with (source / "sdn.csv").open(encoding="latin-1", newline="") as f:
        primary = {r[0]: r for r in csv.reader(f) if len(r) >= 12 and r[0].strip().isdigit()}
    names = {key: [row[1].strip()] for key, row in primary.items()}
    with (source / "alt.csv").open(encoding="latin-1", newline="") as f:
        for row in csv.reader(f):
            if len(row) >= 4 and row[0] in names:
                names[row[0]].append(row[3].strip())
    index = {normalize(name) for variants in names.values() for name in variants}
    required = {normalize(n) for key, variants in names.items() if primary[key][2].strip() == "-0-"
                for n in variants if n.isascii() and 3 <= len(n) <= 160}
    excluded = {normalize(q["name"]) for f in a.exclude_queries for q in json.loads(f.read_text(encoding="utf-8"))}
    records = json.loads((a.archive / "reference-names.json").read_text(encoding="utf-8"))["records"]
    real_names = {(r["lei"], r["name"], r["source_url"]) for r in records}
    negatives, positives, output, rejected = {}, {}, {}, {}
    for split in ("train", "val", "test"):
        raw = (a.data / f"{split}.jsonl").read_bytes()
        assert raw == gzip.decompress((a.archive / f"{split}.jsonl.gz").read_bytes())
        rows = [json.loads(line) for line in raw.splitlines()]
        knowledge = [r for r in rows if r["kind"] == "reference_knowledge"]
        counts = collections.Counter(r["listed"] for r in knowledge)
        assert counts[True] == counts[False]
        blocks = collections.defaultdict(list)
        positives[split], negatives[split], rejected[split] = set(), set(), set()
        for row in knowledge:
            q, truth = row["query_name"], row["listed"]
            key = normalize(q)
            assert row["prompt"] == f"Screen {q} against the OFAC SDN list. Report name matches."
            assert (key in index) == truth
            assert claim(row["chosen"]) == truth
            assert claim(row["rejected"]) != truth
            for side in ("chosen", "rejected"):
                if row[side].startswith("{"):
                    body = json.loads(row[side])
                    assert next(body[k] for k in ("name", "entity", "screened_name") if k in body) == q
                else:
                    assert q in row[side]
            rejected[split].add(row["rejected"])
            blocks[row["block_id"]].append(row)
            if truth:
                assert key in {normalize(n) for n in names[row["sdn_entity_id"]]}
                positives[split].add(key)
            else:
                p = row["provenance"]
                assert (p["lei"], q, p["source_url"]) in real_names
                assert key not in excluded
                negatives[split].add(key)
        assert all(len(v) == 2 and {r["listed"] for r in v} == {True, False}
                   and len({r["format"] for r in v}) == 1 for v in blocks.values())
        output[split] = {"source_checked_pairs": len(knowledge), "all_pairs": len(rows),
                         "unique_positive_names": len(positives[split]),
                         "unique_real_absent_names": len(negatives[split]),
                         "sha256": hashlib.sha256(raw).hexdigest()}
    assert positives["train"] == required
    assert positives["val"] <= positives["train"] and positives["test"] <= positives["train"]
    assert not negatives["train"] & (negatives["val"] | negatives["test"])
    assert not negatives["val"] & negatives["test"]
    assert not rejected["train"] & (rejected["val"] | rejected["test"])
    report = {"ok": True, "splits": output, "complete_eligible_positive_coverage": True,
              "negative_identity_splits_disjoint": True, "measured_absent_queries_excluded": True,
              "positive_validation_facts_seen_in_training": True,
              "scope": "Source-derived knowledge fixtures; not independent positive facts"}
    save(a.archive / "independent-source-audit.json", report)
    print(json.dumps(report))


if __name__ == "__main__":
    main()
