"""Public snapshot knowledge; all eligible organization aliases are training facts.

Validation measures representations of known positive facts and new real absences.
It is explicitly not an entity-held-out factual benchmark. No miner answers read.
"""
import argparse
import collections
import csv
import gzip
import hashlib
import json
from pathlib import Path
import random

from tokenizers import Tokenizer
from build_pairs import load, norm, SOURCE
from build_query_binding import PROMPT
from binding_benchmark import render
from collect_miners import save


def response(q, hit, style, field):
    if style == "boolean":
        return json.dumps({"name": q, field: hit})
    if style == "enum":
        return json.dumps({"name": q, "verdict": "match" if hit else "no_match"})
    if style == "prose":
        return f"{q}: {'An exact name entry was found' if hit else 'No exact name entry was found'} in the OFAC SDN snapshot."
    if style == "structured":
        return json.dumps({"screened_name": q, field: int(hit), "list": "OFAC SDN",
                           "scope": "Exact primary names and aliases; not identity or ownership clearance."})
    if style == "validation":
        return json.dumps({"entity": q, "on_list": hit, "source": "OFAC SDN",
                           "method": "normalized exact name and alias lookup"})
    if style == "test":
        return f"Exact-name lookup for {q} against OFAC SDN: {'MATCH' if hit else 'NO MATCH'}. Identity is not established by name alone."
    raise ValueError(style)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--negatives", type=Path, required=True)
    ap.add_argument("--exclude-queries", type=Path, nargs="+", required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--archive", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    a.archive.mkdir(parents=True, exist_ok=False)
    rng = random.Random(1320261102)
    sdn, alt = [a.home / f"data/sanctions/{n}.csv" for n in ("sdn", "alt")]
    entries = load(str(sdn), str(alt))
    # Historical builders included aka/fka only. Full reference coverage includes nka.
    by_id = {e["id"]: e for e in entries}
    with alt.open(encoding="latin-1", newline="") as stream:
        for row in csv.reader(stream):
            if len(row) >= 4 and row[0] in by_id and row[2].strip() == "nka":
                by_id[row[0]]["aliases"].append(row[3].strip())
    index = {norm(n) for e in entries for n in [e["name"], *e["aliases"]]}
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))

    def bucket(q):
        return len(tok.encode(render(PROMPT.format(q=q), "")).ids)

    positive = {}
    for e in entries:
        if e["kind"] != "entity":
            continue
        for name in [e["name"], *e["aliases"]]:
            if name.isascii() and 3 <= len(name) <= 160:
                positive.setdefault(norm(name), {"name": name, "id": e["id"], "bucket": bucket(name),
                                                  "source_url": SOURCE})
    excluded = {norm(q["name"]) for f in a.exclude_queries for q in json.loads(f.read_text(encoding="utf-8"))}
    reference = json.loads(a.negatives.read_text(encoding="utf-8"))
    negative = {}
    for record in reference["records"]:
        original_name = record["name"]
        name = original_name.upper()
        key = norm(name)
        if name.isascii() and 3 <= len(name) <= 160 and key not in index and key not in excluded:
            negative.setdefault(key, {**record, "name": name, "key": key, "source_name": original_name, "bucket": bucket(name)})
    negatives = list(negative.values())
    rng.shuffle(negatives)
    assert len(negatives) >= 2000, len(negatives)
    pools = {"train": negatives[800:], "val": negatives[:400], "test": negatives[400:800]}
    positives = list(positive.values())
    reports, uses = {}, collections.Counter()
    all_rows = {}
    for split in ("train", "val", "test"):
        buckets = collections.defaultdict(list)
        for item in pools[split]:
            buckets[item["bucket"]].append(item)
        buckets = {k: collections.deque(v) for k, v in buckets.items()}
        forms_used = collections.defaultdict(set)
        selected = positives.copy()
        rng.shuffle(selected)
        if split != "train":
            selected = selected[:400]
        rows, distances = [], collections.Counter()
        for number, pos in enumerate(selected):
            nearest = min(buckets, key=lambda b: (abs(b-pos["bucket"]), b))
            candidates = buckets[nearest]
            neg = candidates.popleft()
            uses[(split, neg["key"])] += 1
            if split == "train" and uses[(split, neg["key"])] < 8:
                candidates.append(neg)
            if not candidates:
                del buckets[nearest]
            distances[abs(nearest-pos["bucket"])] += 1
            forms = [(style, field) for style in ("boolean", "structured") for field in ("matched", "match", "sanctioned")]+[("enum", "verdict"), ("prose", "")]
            available = [f for f in forms if f not in forms_used[neg["key"]]]
            style, field = rng.choice(available) if split == "train" else ("validation" if split == "val" else "test", "")
            forms_used[neg["key"]].add((style, field))
            for hit, item in ((True, pos), (False, neg)):
                q = item["name"]
                good, bad = response(q, hit, style, field), response(q, not hit, style, field)
                rows.append({"prompt": PROMPT.format(q=q), "chosen": good, "rejected": bad,
                             "query_name": q, "listed": hit, "kind": "reference_knowledge",
                             "label_kind": "preference_pair", "format": style,
                             "sdn_entity_id": pos["id"] if hit else None,
                             "block_id": f"{split}-knowledge-{number}",
                             "provenance": {"source_url": item["source_url"], "lei": item.get("lei"),
                                            "source_name": item.get("source_name", q),
                                            "source_kind": "public_reference_fact_not_miner_answer"}})
        # Preserve prior binding behavior with a fixed source-derived retention sample.
        if split == "train":
            parent = a.home / "pairs/sanctions_v10_alias_schema/train.jsonl"
            rows.extend(r for line in parent.read_text(encoding="utf-8").splitlines()
                        if (r := json.loads(line))["kind"].startswith("wrong_query"))
        rng.shuffle(rows)
        raw = "".join(json.dumps(r, ensure_ascii=False)+"\n" for r in rows).encode()
        (a.out / f"{split}.jsonl").write_bytes(raw)
        (a.archive / f"{split}.jsonl.gz").write_bytes(gzip.compress(raw, mtime=0))
        all_rows[split] = rows
        reports[split] = {"pairs": len(rows), "knowledge_blocks": len(selected),
                         "token_bucket_distances": dict(sorted(distances.items())),
                         "unique_absent_queries": len({norm(r["query_name"]) for r in rows if not r["listed"]}),
                         "max_absent_reuse": max((n for (s, _), n in uses.items() if s == split), default=0),
                         "uppercase_truth_reference": sum(r["query_name"].isupper() == r["listed"] for r in rows if r["kind"] == "reference_knowledge")/(2*len(selected)),
                         "sha256": hashlib.sha256(raw).hexdigest()}
    # Independently verify all knowledge labels and report actual visible length shortcuts.
    tok.enable_truncation(max_length=256)
    for split, rows in all_rows.items():
        assert all((norm(r["query_name"]) in index) == r["listed"] for r in rows if r["kind"] == "reference_knowledge")
        lengths = [tuple(len(tok.encode(render(r["prompt"], r[s])).ids) for s in ("chosen", "rejected")) for r in rows]
        deltas = [c-r for c, r in lengths]
        reports[split]["visible_length_baseline_tie_aware"] = sum((d > 0)+.5*(d == 0) for d in deltas)/len(deltas)
    save(a.archive / "reference-names.json", reference)
    manifest = {"seed": 1320261102, "splits": reports,
                "positive_reference_names": len(positive), "eligible_real_absent_names": len(negative),
                "sdn_sha256": hashlib.sha256(sdn.read_bytes()).hexdigest(),
                "alt_sha256": hashlib.sha256(alt.read_bytes()).hexdigest(),
                "negative_reference_sha256": hashlib.sha256(a.negatives.read_bytes()).hexdigest(),
                "excluded_measured_absent_queries": [str(f) for f in a.exclude_queries],
                "scope": "All eligible positive facts exposed in train. Validation/test positive facts are KNOWN; answer forms differ. Negative identities are split. No captured answers or pool material."}
    for folder in (a.out, a.archive):
        save(folder / "manifest.json", manifest)
    print(json.dumps(manifest), flush=True)


if __name__ == "__main__":
    main()
