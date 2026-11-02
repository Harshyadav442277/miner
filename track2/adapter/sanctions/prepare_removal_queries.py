"""Freeze current/removed organization names before any service calls or model score."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import random
import shutil

from tokenizers import Tokenizer
from binding_benchmark import render
from build_pairs import load
from collect_miners import norm, save, snapshot_index
from removal_notices import deletion_records, organization_names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--sources", type=Path, required=True)
    ap.add_argument("--notices", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    (a.out / "notices").mkdir()
    rng = random.Random(1620261103)
    sdn, alt = a.sources / "sdn.csv", a.sources / "alt.csv"
    entries = {e["id"]: e for e in load(str(sdn), str(alt))}
    _, index = snapshot_index(sdn.read_bytes(), alt.read_bytes())
    used_ids, used_names = set(), set()
    directories = ("sanctions_v6_pilot_r1", "sanctions_v7_binding", "sanctions_v8_hard_binding_r2", "sanctions_v10_alias_schema", "sanctions_v15_representations")
    for directory in directories:
        for split in ("train", "val", "test"):
            for line in (a.home / f"pairs/{directory}/{split}.jsonl").read_text(encoding="utf-8").splitlines():
                row = json.loads(line)
                used_ids.update(row[k] for k in ("sdn_entity_id", "other_entity_id"))
                name = row.get("query_name")
                if name is None:
                    assert row["prompt"].startswith("Screen ") and row["prompt"].endswith(" against the OFAC SDN list. Report name matches.")
                    name = row["prompt"][7:-len(" against the OFAC SDN list. Report name matches.")]
                used_names.add(norm(name))
    for split in ("train", "val", "test"):
        for line in (a.home / f"pairs/sanctions_v13_reference/{split}.jsonl").read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            if not row["listed"]:
                used_names.add(norm(row["query_name"]))
    evidence = Path(__file__).parent / "evidence"
    for relative in ("2026-11-01-miners-r1/queries.json", "2026-11-01-miners-fresh/queries.json", "v7-plan/queries.json", "v8-plan/bank-queries.json", "v9-plan/queries.json"):
        for query in json.loads((evidence / relative).read_text(encoding="utf-8")):
            used_names.add(norm(query["name"]))
            used_ids.update(query["sdn_ids"])
    records, consolidated, provenance = [], set(), []
    for date in ("20260727", "20260903", "20260918"):
        file = a.notices / f"{date}.json"
        raw = json.loads(file.read_text(encoding="utf-8"))
        assert raw["status"] == 200 and not raw["curl_exit"]
        assert hashlib.sha256(raw["body"].encode()).hexdigest() == raw["sha256"]
        extracted, excluded = deletion_records(raw["body"])
        consolidated.update(excluded)
        for number, text in enumerate(extracted):
            names = organization_names(text)
            if names:
                primary, variants = names
                records.append({"primary": primary, "names": variants, "record": text,
                                "record_index": number, "notice_url": raw["url"], "notice_date": date,
                                "notice_body_sha256": raw["sha256"], "notice_capture": f"notices/{date}.json"})
        shutil.copyfile(file, a.out / "notices" / file.name)
        provenance.append({k: raw[k] for k in ("url", "status", "sha256", "started_at", "finished_at")})
    groups = []
    for record in records:
        names = {norm(n) for n in record["names"]}
        connected = [g for g in groups if g["normalized_names"] & names]
        combined = {"normalized_names": names, "records": [record]}
        for group in connected:
            combined["normalized_names"].update(group["normalized_names"])
            combined["records"].extend(group["records"])
            groups.remove(group)
        groups.append(combined)
    negative = []
    for group in groups:
        names = group["normalized_names"]
        if names & (set(index) | used_names | consolidated):
            continue
        record = min(group["records"], key=lambda r: (r["notice_date"], r["record_index"]))
        negative.append({"name": record["primary"], "expected": False, "sdn_ids": [],
                         "kind": "official_removed_organization", "role": "final",
                         "source_url": record["notice_url"], "removed_reference": record,
                         "removed_family_names": sorted(names)})
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    def prefix(name):
        return len(tok.encode(render(f"Screen {name} against the OFAC SDN list. Report name matches.", "")).ids)
    positive = collections.defaultdict(list)
    eligible = [e for e in entries.values() if e["kind"] == "entity" and e["id"] not in used_ids
                and e["name"].isascii() and 4 <= len(e["name"]) <= 160]
    rng.shuffle(eligible)
    for entry in eligible:
        ids = set(index.get(norm(entry["name"]), []))
        if ids & used_ids or norm(entry["name"]) in used_names:
            continue
        positive[prefix(entry["name"])].append((entry, ids))
    rng.shuffle(negative)
    queries = []
    for no in negative:
        size = prefix(no["name"])
        while positive[size]:
            entry, ids = positive[size].pop()
            if not ids & used_ids:
                break
        else:
            continue
        used_ids.update(ids)
        yes = {"name": entry["name"], "expected": True, "sdn_ids": sorted(ids),
               "kind": "current_organization_primary", "role": "final", "program": entry["prog"],
               "source_url": f"https://sanctionssearch.ofac.treas.gov/Details.aspx?id={entry['id']}"}
        queries.extend(({**yes, "prefix_tokens": size}, {**no, "prefix_tokens": size}))
        if len(queries) == 64:
            break
    assert len(queries) >= 32, f"Only {len(queries)//2} eligible matched groups; no calls authorized by this recipe"
    assert all(q["expected"] == bool(index.get(norm(q["name"]))) for q in queries)
    source_meta = {f"{n}.csv": json.loads((a.sources / f"{n}-source.json").read_text(encoding="utf-8-sig")) for n in ("sdn", "alt")}
    save(a.out / "source-check.json", source_meta)
    save(a.out / "queries.json", queries)
    save(a.out / "selection-manifest.json", {"seed": 1620261103, "queries": len(queries),
         "classes": {"listed": len(queries)//2, "official_removed_exact_absent": len(queries)//2},
         "eligible_removed_families": len(negative), "excluded_consolidated_names": sorted(consolidated),
         "excluded_new_data_dirs": directories, "notices": provenance,
         "queries_sha256": hashlib.sha256((a.out / "queries.json").read_bytes()).hexdigest(),
         "scope": "Fresh answer bodies, not unseen public facts. Source-confirmed removals are not global/ownership clearance. No miner response or model score used in selection."})
    print(json.dumps({"queries": len(queries), "eligible_removed_families": len(negative),
                      "removed_names": [q["name"] for q in queries if not q["expected"]]}))


if __name__ == "__main__":
    main()
