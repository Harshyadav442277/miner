"""Freeze matched-length, new entity names before any miner calls. No pool access.

SDN exact-name members are paired in token-length strata with public GLEIF legal
names absent from the exact-name index. Absence does not imply sanctions clearance.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import random
import sys
import time

from tokenizers import Tokenizer
from build_pairs import load, norm
from collect_miners import fetch, save, snapshot_index

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from score_pairs import render


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--seed", type=int, default=720261102)
    ap.add_argument("--gleif-page-start", type=int, default=1)
    ap.add_argument("--raw-dir", type=Path)
    ap.add_argument("--training-dirs", nargs="+", default=["sanctions_v6_pilot_r1"])
    ap.add_argument("--exclude-queries", type=Path, nargs="+", default=[])
    ap.add_argument("--all-final", action="store_true")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    rng = random.Random(a.seed)
    sdn, alt = a.home / "data/sanctions/sdn.csv", a.home / "data/sanctions/alt.csv"
    entities = load(str(sdn), str(alt))
    _, index = snapshot_index(sdn.read_bytes(), alt.read_bytes())
    used_ids, used_names = set(), set()
    for directory in a.training_dirs:
        for split in ("train", "val", "test"):
            file = a.home / f"pairs/{directory}/{split}.jsonl"
            for line in file.read_text(encoding="utf-8").splitlines():
                row = json.loads(line)
                used_ids.update((row["sdn_entity_id"], row["other_entity_id"]))
                used_names.add(norm(row["prompt"].removeprefix("Screen ").removesuffix(
                    " against the OFAC SDN list. Report name matches.")))
    old_evidence = Path(__file__).parent / "evidence"
    for cohort in ("2026-11-01-miners-r1", "2026-11-01-miners-fresh"):
        for q in json.loads((old_evidence / cohort / "queries.json").read_text(encoding="utf-8")):
            used_ids.update(q["sdn_ids"])
            used_names.add(norm(q["name"]))
    for file in a.exclude_queries:
        for q in json.loads(file.read_text(encoding="utf-8")):
            used_ids.update(q["sdn_ids"])
            used_names.add(norm(q["name"]))
    used_names.update(norm(n) for e in entities if e["id"] in used_ids for n in [e["name"], *e["aliases"]])
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))

    def bucket(q):
        return len(tok.encode(render(f"Screen {q} against the OFAC SDN list. Report name matches.", "")).ids)

    negative = collections.defaultdict(list)
    local_raw = a.raw_dir or a.home / "data/v7-gleif"
    local_raw.mkdir(exist_ok=True)
    source_records = []
    for page in range(a.gleif_page_start, a.gleif_page_start+3):
        url = f"https://api.gleif.org/api/v1/lei-records?page%5Bsize%5D=200&page%5Bnumber%5D={page}"
        raw = fetch(url, max_bytes=5000000)
        if raw["status"] != 200 or raw["curl_exit"]:
            raise ValueError(f"GLEIF fetch failed: {raw['status']} {raw['error']}")
        save(local_raw / f"page-{page}.json", raw)  # full legal records kept outside the public repo
        for record in json.loads(raw["body"])["data"]:
            name = record["attributes"]["entity"]["legalName"]["name"]
            if not name.isascii() or not 6 <= len(name) <= 100 or norm(name) in index or norm(name) in used_names:
                continue
            used_names.add(norm(name))
            entry = {"name": name, "expected": False, "sdn_ids": [], "kind": "legal_entity_exact_absent",
                     "source_url": "https://api.gleif.org/api/v1/lei-records/" + record["id"],
                     "lei": record["id"]}
            negative[bucket(name)].append(entry)
        source_records.append({k: raw[k] for k in ("url", "started_at", "finished_at", "sha256", "status")})
        time.sleep(1)
    positive = []
    eligible = [e for e in entities if e["kind"] == "entity" and e["id"] not in used_ids and
                not {norm(n) for n in [e["name"], *e["aliases"]]} & used_names]
    rng.shuffle(eligible)
    # One query per SDN entity; primary/alias choices are frozen, not chosen from response outcomes.
    for e in eligible:
        variants = [e["name"], *e["aliases"]]
        rng.shuffle(variants)
        for name in variants:
            ids = sorted(set(index.get(norm(name), [])))
            if (not name.isascii() or not 6 <= len(name) <= 100 or set(ids) & used_ids or
                    not negative.get(bucket(name))):
                continue
            positive.append(({"name": name, "expected": True, "sdn_ids": ids, "kind": "entity",
                              "program": e["prog"], "name_form": "primary" if name == e["name"] else "alias",
                              "source_url": f"https://sanctionssearch.ofac.treas.gov/Details.aspx?id={e['id']}"},
                             negative[bucket(name)].pop()))
            used_ids.update(ids)
            break
        if len(positive) == 64:
            break
    if len(positive) != 64:
        raise ValueError(f"only {len(positive)} matched positive/negative names; expand primary sources")
    rng.shuffle(positive)
    queries = []
    for i, pair in enumerate(positive):
        role = "final" if a.all_final else "development" if i < 32 else "final"
        for q in pair:
            queries.append({**q, "role": role, "prefix_tokens": bucket(q["name"])})
    save(a.out / "queries.json", queries)
    save(a.out / "selection-manifest.json", {
        "seed": a.seed, "queries": len(queries), "roles": dict(collections.Counter(q["role"] for q in queries)),
        "all_final": a.all_final,
        "excluded_query_files": [str(p) for p in a.exclude_queries], "training_dirs": a.training_dirs,
        "classes_per_role": {"listed": 64 if a.all_final else 32, "exact_name_absent": 64 if a.all_final else 32}, "sdn_entity_names_only": True,
        "negative_source": "GLEIF legal names, CC0; only name/LEI/source refs published",
        "terms_url": "https://www.gleif.org/en/meta/lei-data-terms-of-use", "source_fetches": source_records,
        "sdn_sha256": hashlib.sha256(sdn.read_bytes()).hexdigest(),
        "alt_sha256": hashlib.sha256(alt.read_bytes()).hexdigest(),
        "queries_sha256": hashlib.sha256((a.out / "queries.json").read_bytes()).hexdigest(),
        "note": "Exact absence is not all-list, fuzzy or ownership clearance. No miner answers consulted."})
    print(json.dumps({"queries": len(queries), "roles": dict(collections.Counter(q["role"] for q in queries)),
                      "positive_aliases": sum(q.get("name_form") == "alias" for q in queries)}))


if __name__ == "__main__":
    main()
