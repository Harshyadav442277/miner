"""V7 source-faithful query-binding pairs, no captured answers or pool material.

Use v6's entity partitions. Correct answers assert only exact SDN membership/absence;
no fabricated nearest candidate or random similarity score. Wrong-query swaps retain
their own original verdict, including two no-match answers. Reversals balance style.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import random
import sys

from tokenizers import Tokenizer
from build_pairs import SOURCE, display, load, norm, unlisted_names
from collect_miners import save

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from score_pairs import render

FORMATS = ("thin", "schema", "evidence", "prose")
PROMPT = "Screen {q} against the OFAC SDN list. Report name matches."


def answer(q, hit, entry, fmt, rng, snapshot):
    """A declared exact-lookup fixture; no fuzzy-search or legal-clearance claim."""
    hit_record = {"name": entry["name"], "id": entry["id"], "list": "OFAC SDN",
                  "program": entry["prog"], "matched_name": q, "match_type": "normalized_exact"}
    key = rng.choice(("name", "entity", "screened_name"))
    out = {key: q, "matched": hit}
    if fmt == "thin":
        return json.dumps(out, ensure_ascii=False)
    out.update(matches=[hit_record] if hit else [], lists=["OFAC SDN"],
               match_score=1 if hit else 0, scope="normalized exact names and aliases only")
    notes = ["Name similarity is not confirmed identity.", "No ownership-based screening is performed.",
             "Other sanctions lists are outside this exact-name lookup.",
             "Exact-name absence does not establish sanctions clearance.",
             "Additional identifiers are needed for an identity determination."]
    selected = rng.sample(notes, rng.randint(1, 4))
    if fmt == "schema":
        return json.dumps(out, ensure_ascii=False)
    if fmt == "evidence":
        out.update(evidence={"source_url": SOURCE, "snapshot_sha256": snapshot,
                             "exact_name_entry_ids": [entry["id"]] if hit else []}, limitations=selected)
        return json.dumps(out, ensure_ascii=False)
    if hit:
        finding = rng.choice((f"An exact SDN name entry was found for {q}.",
                              f"Exact-name screening of {q}: a list entry matches.",
                              f"The requested name {q} has an exact entry in this SDN snapshot."))
        detail = f" Entry {entry['id']}: {entry['name']}; program {entry['prog']}."
    else:
        finding = rng.choice((f"No exact SDN name entry was found for {q}.",
                              f"Exact-name screening of {q}: no matching entry in this snapshot.",
                              f"The requested name {q} has no exact entry in this SDN snapshot."))
        detail = " This is an exact primary-name and alias lookup, not a fuzzy screen."
    return finding + detail + " " + " ".join(selected) + f" Source: {SOURCE}; snapshot {snapshot}."


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--exclude-queries", type=Path, nargs="+", required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    rng = random.Random(420261102)
    sdn, alt = a.home / "data/sanctions/sdn.csv", a.home / "data/sanctions/alt.csv"
    entities = {e["id"]: e for e in load(str(sdn), str(alt))}
    listed = {norm(n) for e in entities.values() for n in [e["name"], *e["aliases"]]}
    excluded = [q for p in a.exclude_queries for q in json.loads(p.read_text(encoding="utf-8"))]
    excluded_names = {norm(q["name"]) for q in excluded}
    excluded_ids = {i for q in excluded for i in q["sdn_ids"]}
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    snapshot = hashlib.sha256(sdn.read_bytes()).hexdigest()
    used_queries, manifests = set(), {}
    for split, blocks, factual in (("train", 1200, 600), ("val", 150, 100), ("test", 150, 100)):
        original = [json.loads(l) for l in (a.home / f"pairs/sanctions_v6_pilot_r1/{split}.jsonl").read_text(encoding="utf-8").splitlines()]
        ids = {r[k] for r in original for k in ("sdn_entity_id", "other_entity_id")}
        assert not ids & excluded_ids
        part = [entities[i] for i in sorted(ids)]
        positive = [(display(e["name"], e["kind"]), True, e) for e in part]
        negative = [(q, False, rng.choice(part)) for q, _ in unlisted_names(part, listed, rng, len(part)*2)]
        rows, reserved = [], set()
        pools = {}
        for hit, candidates in ((True, positive), (False, negative)):
            buckets = collections.defaultdict(list)
            rng.shuffle(candidates)
            for q, _, entry in candidates:
                if norm(q) in excluded_names or norm(q) in used_queries or norm(q) in reserved:
                    continue
                reserved.add(norm(q))
                buckets[len(tok.encode(render(PROMPT.format(q=q), "")).ids)].append((q, hit, entry))
            paired = []
            for bucket in sorted(buckets):
                while len(buckets[bucket]) >= 2:
                    paired.append((buckets[bucket].pop(), buckets[bucket].pop()))
            rng.shuffle(paired)
            pools[hit] = (paired[:blocks//2], [item for pair in paired[blocks//2:] for item in pair])
            if len(pools[hit][0]) != blocks//2:
                raise ValueError(f"insufficient {split}/{hit} token-length matched blocks")
        block_i = 0
        for hit in (True, False):
            for left, right in pools[hit][0]:
                fmt_l, fmt_r = rng.choice(FORMATS), rng.choice(FORMATS)
                text_l = answer(*left, fmt_l, rng, snapshot)
                text_r = answer(*right, fmt_r, rng, snapshot)
                for good, bad, c, r in ((left, right, text_l, text_r), (right, left, text_r, text_l)):
                    q, _, entry = good
                    rows.append({"prompt": PROMPT.format(q=q), "chosen": c, "rejected": r,
                                 "label_kind": "preference_pair", "kind": "wrong_query:listed" if hit else "wrong_query:absent",
                                 "listed": hit, "format": fmt_l + "/" + fmt_r, "query_name": q,
                                 "sdn_entity_id": entry["id"], "other_entity_id": bad[2]["id"],
                                 "block_id": f"{split}-query-{block_i}",
                                 "provenance": {"source_url": SOURCE, "source_kind": "public_source_synthetic_answers"}})
                    used_queries.add(norm(q))
                block_i += 1
        for hit in (True, False):
            available = [item for item in pools[hit][1] if norm(item[0]) not in used_queries]
            if len(available) < factual//2:
                raise ValueError("insufficient reserved factual examples")
            for q, _, entry in available[:factual//2]:
                fmt = rng.choice(FORMATS)
                rows.append({"prompt": PROMPT.format(q=q), "chosen": answer(q, hit, entry, fmt, rng, snapshot),
                             "rejected": answer(q, not hit, entry, fmt, rng, snapshot),
                             "label_kind": "preference_pair", "kind": "verdict_flip", "listed": hit,
                             "format": fmt, "query_name": q, "sdn_entity_id": entry["id"],
                             "other_entity_id": entry["id"], "block_id": f"{split}-fact-{len(rows)}",
                             "provenance": {"source_url": SOURCE, "source_kind": "public_source_synthetic_answers"}})
                used_queries.add(norm(q))
        rng.shuffle(rows)
        file = a.out / f"{split}.jsonl"
        file.write_text("".join(json.dumps(r, ensure_ascii=False)+"\n" for r in rows), encoding="utf-8")
        manifests[split] = {"pairs": len(rows), "blocks": len({r["block_id"] for r in rows}),
                            "kinds": dict(collections.Counter(r["kind"] for r in rows)),
                            "sha256": hashlib.sha256(file.read_bytes()).hexdigest(), "entity_ids": sorted(ids)}
    save(a.out / "manifest.json", {"seed": 420261102, "splits": manifests,
                                   "sdn_sha256": snapshot, "alt_sha256": hashlib.sha256(alt.read_bytes()).hexdigest(),
                                   "excluded_queries": [str(p) for p in a.exclude_queries],
                                   "scope": "Exact SDN lookup synthetic training; never external-response or pool training"})
    print(json.dumps({k: {f: v[f] for f in ("pairs", "blocks", "kinds", "sha256")} for k, v in manifests.items()}))


if __name__ == "__main__":
    main()
