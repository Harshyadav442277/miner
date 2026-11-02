"""Collect public legal names, not screening answers, for source-knowledge training."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import time

from collect_miners import fetch, save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw-dir", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--start", type=int, default=7)
    ap.add_argument("--pages", type=int, default=44)
    a = ap.parse_args()
    a.raw_dir.mkdir(parents=True, exist_ok=True)
    if a.out.exists():
        raise ValueError("refusing to overwrite a reference collection")

    def page(number):
        path = a.raw_dir / f"page-{number}.json"
        if path.exists():
            raw = json.loads(path.read_text(encoding="utf-8"))
        else:
            url = f"https://api.gleif.org/api/v1/lei-records?page%5Bsize%5D=200&page%5Bnumber%5D={number}"
            for attempt in range(3):
                raw = fetch(url, max_bytes=5000000)
                if raw["status"] == 200 and not raw["curl_exit"]:
                    break
                save(a.raw_dir / f"page-{number}-failed-{attempt}.json", raw)
                if raw["status"] in (400, 401, 403, 404):
                    break
                time.sleep(2)
            if raw["status"] != 200 or raw["curl_exit"]:
                raise ValueError(f"GLEIF page {number}: HTTP {raw['status']} {raw['error']}")
            save(path, raw)
            time.sleep(0.5)
        assert hashlib.sha256(raw["body"].encode()).hexdigest() == raw["sha256"]
        records = [{"name": r["attributes"]["entity"]["legalName"]["name"], "lei": r["id"],
                    "source_url": "https://api.gleif.org/api/v1/lei-records/"+r["id"]}
                   for r in json.loads(raw["body"])["data"]]
        print(json.dumps({"page": number, "records": len(records)}), flush=True)
        return records, {k: raw[k] for k in ("url", "started_at", "finished_at", "sha256", "status")}

    records, sources = [], []
    with ThreadPoolExecutor(max_workers=2) as pool:
        for names, source in pool.map(page, range(a.start, a.start+a.pages)):
            records.extend(names)
            sources.append(source)
    save(a.out, {"records": records, "fetches": sources,
                 "terms_url": "https://www.gleif.org/en/meta/lei-data-terms-of-use",
                 "scope": "Public legal names and LEI references only. No miner or pool answers."})


if __name__ == "__main__":
    main()
