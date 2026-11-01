"""Check chosen exact-lookup fixtures against the source, including comparison fields."""
import argparse
import collections
import json
from pathlib import Path
import re

from build_pairs import load, norm


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sdn", required=True)
    ap.add_argument("--alt", required=True)
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    entries = {e["id"]: e for e in load(a.sdn, a.alt)}
    index = collections.defaultdict(set)
    for entry in entries.values():
        for name in [entry["name"], *entry["aliases"]]:
            index[norm(name)].add(entry["id"])
    counts = collections.Counter()
    for split in ("train", "val", "test"):
        rows = [json.loads(l) for l in (a.data / f"{split}.jsonl").read_text(encoding="utf-8").splitlines()]
        for row in rows:
            q = row["query_name"]
            actual = bool(index[norm(q)])
            assert row["listed"] == actual, (split, q)
            text = row["chosen"]
            if text.startswith("{"):
                body = json.loads(text)
                assert body["matched"] == actual
                echoed = [body[k] for k in ("name", "entity", "screened_name") if k in body]
                assert echoed == [q]
                for match in body.get("matches", []):
                    entry = entries[match["id"]]
                    assert match["id"] in index[norm(q)]
                    assert (match["name"], match["program"]) == (entry["name"], entry["prog"])
                if "comparison_only" in body:
                    c = body["comparison_only"]
                    entry = entries[c["entry_id"]]
                    assert c["entry_id"] == row["sdn_entity_id"]
                    assert c["primary_name"] == entry["name"] and c["program"] == entry["prog"]
                    assert c["compared_name"] in [entry["name"], *entry["aliases"]]
                    one, two = set(norm(q).split()), set(norm(c["compared_name"]).split())
                    assert abs(c["token_jaccard"] - len(one & two)/len(one | two)) <= .0000005
                    assert "not a global nearest" in body["comparison_scope"]
                    counts["json_comparisons"] += 1
            else:
                assert q in text
                if not actual:
                    assert text.startswith(("No exact SDN name", "Exact-name screening of", "The requested name"))
                    assert "no matching entry" in text or "no exact entry" in text or text.startswith("No exact")
                if "For comparison only, public entry" in text:
                    entry = entries[row["sdn_entity_id"]]
                    assert f"public entry {entry['id']} is {entry['name']}, program {entry['prog']}" in text
                    observed = float(re.search(r"Jaccard overlap with this query is ([0-9.]+);", text)[1])
                    names = [entry["name"], *entry["aliases"]]
                    qwords = set(norm(q).split())
                    actual_score = max(len(qwords & set(norm(n).split()))/len(qwords | set(norm(n).split())) for n in names)
                    assert abs(observed-actual_score) <= .0000005
                    counts["prose_comparisons"] += 1
            counts[split] += 1
    report = {"pass": True, "counts": dict(counts),
              "scope": "Chosen synthetic exact-name verdicts and source comparison fields; no external factual-readiness claim"}
    a.out.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
