"""Independent CSV, metadata, four-form, archive and complete-input checks."""
import argparse
import collections
import csv
import gzip
import hashlib
import json
from pathlib import Path
import re

from tokenizers import Tokenizer
from audit_claim_visibility import verdict_spans
from binding_benchmark import render
from collect_miners import save


def canonical(name):
    return " ".join(sorted(re.findall(r"[a-z0-9]+", name.lower())))


def prose_claim(text, q):
    yes = (f"An exact SDN name entry was found for {q}.",
           f"Exact-name screening of {q}: a list entry matches.",
           f"The requested name {q} has an exact entry in this SDN snapshot.")
    no = (f"No exact SDN name entry was found for {q}.",
          f"Exact-name screening of {q}: no matching entry in this snapshot.",
          f"The requested name {q} has no exact entry in this SDN snapshot.")
    if text.startswith(yes):
        return True
    assert text.startswith(no), text[:100]
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--archive", type=Path, required=True)
    a = ap.parse_args()
    manifest = json.loads((a.data / "manifest.json").read_text(encoding="utf-8"))
    sdn, alt = [a.home / f"data/sanctions/{n}.csv" for n in ("sdn", "alt")]
    with sdn.open(encoding="latin-1", newline="") as stream:
        primary = {r[0]: r for r in csv.reader(stream) if len(r) >= 12 and r[0].isdigit()}
    with alt.open(encoding="latin-1", newline="") as stream:
        aliases = [r for r in csv.reader(stream) if len(r) >= 4 and r[0] in primary]
    names = {canonical(r[1]) for r in primary.values()} | {canonical(r[3]) for r in aliases}
    meta = manifest["neutral_metadata"]
    assert meta["primary_records"] == len(primary)
    assert meta["alias_records"] == len(aliases)
    assert meta["alias_type_counts"] == dict(collections.Counter(r[2].strip() for r in aliases))
    assert meta["entity_type_counts"] == dict(collections.Counter("entity" if r[2].strip() == "-0-" else r[2].strip() for r in primary.values()))
    assert meta["sdn_sha256"] == hashlib.sha256(sdn.read_bytes()).hexdigest()
    assert meta["alt_sha256"] == hashlib.sha256(alt.read_bytes()).hexdigest()
    excluded = [q for f in manifest["excluded_query_files"] for q in json.loads(Path(f).read_text(encoding="utf-8"))]
    excluded_names = {canonical(q["name"]) for q in excluded}
    excluded_ids = {i for q in excluded for i in q["sdn_ids"]}
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    output, ids_by_split, queries_by_split = {}, {}, {}
    for split in ("train", "val", "test"):
        raw = (a.data / f"{split}.jsonl").read_bytes()
        assert raw == gzip.decompress((a.archive / f"{split}.jsonl.gz").read_bytes())
        assert hashlib.sha256(raw).hexdigest() == manifest["splits"][split]["sha256"]
        rows = [json.loads(line) for line in raw.splitlines()]
        assert len({r["rejected"] for r in rows}) == len(rows)
        queries_by_split[split] = {canonical(r["query_name"]) for r in rows}
        ids_by_split[split] = {r[k] for r in rows for k in ("sdn_entity_id", "other_entity_id")}
        assert not queries_by_split[split] & excluded_names and not ids_by_split[split] & excluded_ids
        groups, maximum = collections.defaultdict(list), 0
        for row in rows:
            q = row["query_name"]
            assert (canonical(q) in names) == row["listed"]
            if row["kind"] != "factual_representations":
                continue
            groups[row["block_id"]].append(row)
            for side, expected in (("chosen", row["listed"]), ("rejected", not row["listed"])):
                text = row[side]
                length = len(tok.encode(render(row["prompt"], text)).ids)
                maximum = max(maximum, length)
                assert length <= 512
                if text.startswith("{"):
                    body = json.loads(text)
                    assert {v for _, v, _, _ in verdict_spans(text)} == {expected}
                    for key in ("finding", "summary", "answer"):
                        if key in body:
                            assert prose_claim(body[key], q) == expected
                    metadata = next((body[k] for k in ("reference", "context", "provenance") if k in body), {})
                else:
                    assert prose_claim(text, q) == expected
                    metadata = json.loads(text.rsplit(" Reference information: ", 1)[1])
                assert all(k in meta and value == meta[k] for k, value in metadata.items())
        for group in groups.values():
            assert len(group) == 4 and len({r["query_name"] for r in group}) == 1
            assert {r["format"].split("/")[0] for r in group} == {"thin", "schema", "evidence", "prose"}
            assert {r["format"].split("/")[1] for r in group} == {"thin", "schema", "evidence", "prose"}
        output[split] = {"pairs": len(rows), "factual_groups": len(groups), "max_factual_tokens": maximum}
    for left, right in (("train", "val"), ("train", "test"), ("val", "test")):
        assert not queries_by_split[left] & queries_by_split[right]
        assert not ids_by_split[left] & ids_by_split[right]
    result = {"pass": True, "splits": output, "scope": "Independent CSV labels, neutral source counts/hashes, representation groups, complete512 inputs and split/archive checks"}
    save(a.archive / "independent-representation-audit.json", result)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
