"""Freeze the separate v8 absent-bank stratum, without consulting miner responses.

Replay with the original raw fetch envelopes; a new API fetch is a new cohort.
Full legal-entity records stay outside the public evidence directory.
"""
import argparse
import hashlib
import json
from pathlib import Path
import random
import urllib.parse

from build_pairs import load, norm
from collect_miners import fetch, save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--raw", type=Path, required=True)
    ap.add_argument("--replay", action="store_true")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    a.raw.mkdir(parents=True, exist_ok=True)
    excluded = set()
    for version in ("sanctions_v6_pilot_r1", "sanctions_v7_binding"):
        for split in ("train", "val", "test"):
            for line in (a.home / f"pairs/{version}/{split}.jsonl").read_text(encoding="utf-8").splitlines():
                row = json.loads(line)
                excluded.add(norm(row.get("query_name") or row["prompt"].removeprefix("Screen ").removesuffix(
                    " against the OFAC SDN list. Report name matches.")))
    evidence = Path(__file__).parent / "evidence"
    for cohort in ("2026-11-01-miners-r1", "2026-11-01-miners-fresh", "v7-plan"):
        excluded.update(norm(q["name"]) for q in json.loads((evidence / cohort / "queries.json").read_text(encoding="utf-8")))
    listed = {norm(n) for e in load(str(a.home / "data/sanctions/sdn.csv"), str(a.home / "data/sanctions/alt.csv"))
              for n in [e["name"], *e["aliases"]]}
    records, sources, seen = [], [], set()
    for page in (1, 2, 3):
        file = a.raw / f"page-{page}.json"
        url = "https://api.gleif.org/api/v1/lei-records?" + urllib.parse.urlencode(
            {"filter[fulltext]": "bank", "page[size]": 200, "page[number]": page})
        if a.replay:
            response = json.loads(file.read_text(encoding="utf-8"))
        else:
            if file.exists():
                raise ValueError("refusing to overwrite original source envelopes")
            response = fetch(url, max_bytes=5000000)
            save(file, response)
        assert response["url"] == url and response["status"] == 200
        assert hashlib.sha256(response["body"].encode()).hexdigest() == response["sha256"]
        sources.append({k: response[k] for k in ("url", "sha256", "started_at", "finished_at")})
        for record in json.loads(response["body"])["data"]:
            name = record["attributes"]["entity"]["legalName"]["name"]
            key = norm(name)
            if not name.isascii() or not 6 <= len(name) <= 100 or "bank" not in key.split():
                continue
            if key in listed or key in excluded or key in seen:
                continue
            seen.add(key)
            records.append({"name": name, "expected": False, "sdn_ids": [], "role": "final",
                            "kind": "new_bank_exact_absent", "lei": record["id"],
                            "source_url": "https://api.gleif.org/api/v1/lei-records/" + record["id"]})
    random.Random(920261102).shuffle(records)
    selected = records[:64]
    assert len(selected) >= 32
    save(a.out / "bank-queries.json", selected)
    save(a.out / "bank-sources.json", {"sources": sources, "queries": len(selected), "seed": 920261102,
         "scope": "Untested bank-name query binding only; exact absence is not sanctions clearance. No response-based selection."})
    print(f"Frozen {len(selected)} bank queries; replay={a.replay}")


if __name__ == "__main__":
    main()
