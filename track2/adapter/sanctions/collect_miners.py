"""Freeze public SDN-name queries, capture catalog/YAML and real miner bytes; never read pool rows.

Run with the tg-eval venv (PyYAML). An engine miner id is NOT a registration id.
We retain /api/miners/<id> failures and use the catalog's yaml_url for routing.
"""
import argparse
import concurrent.futures
import csv
import datetime as dt
import gzip
import hashlib
import json
from pathlib import Path
import random
import re
import subprocess
import time
import urllib.parse

import yaml

NODE = "https://devnode.telegraphprotocol.com"
INTENT = "SANCTIONS_SCREENING_MATCH_GENERAL"
NEGATIVE = ["Microsoft Corporation", "Toyota Motor Corporation", "Siemens AG", "Apple Inc.",
            "Alphabet Inc.", "International Business Machines Corporation", "Intel Corporation",
            "Nintendo Co., Ltd.", "Marie Curie", "Albert Einstein", "Ada Lovelace", "Alan Turing",
            "Charles Darwin", "Isaac Newton", "Katherine Johnson", "Grace Hopper"]


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def norm(s):
    # Exact unordered ASCII tokens only: NOT identity, fuzzy or all-list clearance.
    return " ".join(sorted(re.findall(r"[a-z0-9]+", s.lower())))


def fetch(url, method="GET", body=None, max_bytes=2500000):
    start = now()
    cmd = ["curl.exe", "-4", "-sS", "-L", "-A", "Mozilla/5.0", "--max-time", "35",
           "--max-filesize", str(max_bytes), "-X", method, "-w", "\n%{http_code}", url]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "--data-binary", json.dumps(body)]
    p = subprocess.run(cmd, capture_output=True)
    raw, _, code = p.stdout.rpartition(b"\n")
    return {"url": url, "method": method, "request_body": body, "started_at": start,
            "finished_at": now(), "status": int(code) if code.isdigit() else 0,
            "curl_exit": p.returncode, "error": p.stderr.decode("utf-8", "replace"),
            "sha256": hashlib.sha256(raw).hexdigest(), "body": raw.decode("utf-8", "replace")}


def save(path, value):
    path.write_text(json.dumps(value, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def snapshot_index(sdn, alt):
    rows = list(csv.reader(sdn.decode("latin-1").splitlines()))
    aliases = list(csv.reader(alt.decode("latin-1").splitlines()))
    index = {}
    for r in rows:
        if len(r) >= 12 and r[0].isdigit():
            index.setdefault(norm(r[1]), []).append(r[0])
    for r in aliases:
        if len(r) >= 4 and r[0].isdigit():
            index.setdefault(norm(r[3]), []).append(r[0])
    return rows, index


def names(sdn, alt):
    rows, index = snapshot_index(sdn, alt)
    rng = random.Random(20261101)
    # Random primary names, stratified across people and entities; no miner outputs consulted.
    selected = []
    for kind in ("individual", "-0-"):
        eligible = [r for r in rows if len(r) >= 12 and r[2].strip() == kind]
        selected += rng.sample(eligible, 8)
    out = [{"name": r[1], "expected": True, "sdn_ids": sorted(set(index[norm(r[1])])),
            "kind": r[2], "program": r[3]} for r in selected]
    for q in NEGATIVE:
        if norm(q) in index:
            raise ValueError(f"negative exact-name collision: {q}")
        out.append({"name": q, "expected": False, "sdn_ids": [], "kind": "real_negative"})
    return out


def plan(miner, doc):
    endpoints = doc.get("endpoints", [])
    matching = [e for e in endpoints if any(i.removesuffix("_GENERAL") == "SANCTIONS_SCREENING_MATCH"
                                           for i in e.get("intents", []))]
    if len(matching) != 1:
        return {"error": "YAML does not identify exactly one sanctions endpoint"}
    e = matching[0]
    params = e.get("params", {}).get("query", {})
    required = [v["name"] for v in params.get("required", [])]
    dynamic = [p for p in required if p in ("name", "entity", "query", "q", "search")]
    schema = doc.get("input_schema") or {}
    if not dynamic and "name" in schema.get("properties", {}):
        dynamic = ["name"]
    return {"base_url": doc.get("base_url", miner["base_url"]),
            "path": e.get("external_path", e["path"]), "method": e.get("method", "GET"),
            "parameters": dynamic, "queryable": bool(dynamic), "required": required,
            "min_interval_seconds": max(1.0, 1.0 / float(doc.get("rate_limit_per_sec", 1) or 1))}


def capture_miner(args):
    m, out, queries = args
    detail = fetch(f"{NODE}/api/miners/{m['id']}")
    y = fetch(m["yaml_url"])
    save(out / f"detail-{m['id']}.json", detail)
    save(out / f"yaml-{m['id']}.json", y)
    try:
        doc = yaml.safe_load(y["body"])
        route = plan(m, doc) if isinstance(doc, dict) else {"error": "YAML not a mapping"}
    except Exception as exc:
        route = {"error": str(exc)}
    save(out / f"plan-{m['id']}.json", route)
    if "error" in route:
        return {"id": m["id"], **route}
    captures = []
    # A static upstream is probed once, never inflated into N answer samples.
    for q in queries if route["queryable"] else queries[:1]:
        params = {"name": q["name"]}
        params.update({p: q["name"] for p in route["parameters"]})
        url = route["base_url"].rstrip("/") + route["path"]
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
        body = params if route["method"].upper() == "POST" else None
        r = fetch(url, route["method"], body)
        captures.append({"miner_id": m["id"], "name": q["name"], "queryable": route["queryable"], **r})
        # Per-miner sequential calls, bounded total concurrency; no paid engine requests.
        time.sleep(route["min_interval_seconds"])
    save(out / f"responses-{m['id']}.json", captures)
    return {"id": m["id"], "queryable": route["queryable"], "requests": len(captures),
            "http_200": sum(r["status"] == 200 and r["curl_exit"] == 0 for r in captures)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sdn", type=Path, required=True)
    ap.add_argument("--alt", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--queries", type=Path, help="optional pre-frozen queries; validated against the same snapshot")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)  # immutable captures; choose a new directory to re-collect
    snapshots = {}
    for path in (a.sdn, a.alt):
        raw = path.read_bytes()
        (a.out / (path.name + ".gz")).write_bytes(gzip.compress(raw, mtime=0))
        snapshots[path.name] = {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
                                "source": "https://sanctionslist.ofac.treas.gov/Home/SdnList",
                                "note": "Existing local snapshot; original HTTP retrieval time not recorded"}
    save(a.out / "source-manifest.json", snapshots)
    queries = (json.loads(a.queries.read_text(encoding="utf-8")) if a.queries else
               names(a.sdn.read_bytes(), a.alt.read_bytes()))
    _, index = snapshot_index(a.sdn.read_bytes(), a.alt.read_bytes())
    for q in queries:
        assert q["expected"] == bool(index.get(norm(q["name"])))
        assert set(q["sdn_ids"]) == set(index.get(norm(q["name"]), []))
    save(a.out / "queries.json", queries)
    catalog = fetch(NODE + "/api/miners", max_bytes=25000000)
    live = fetch(NODE + "/engine/v1/intents/" + INTENT)
    save(a.out / "catalog.json", catalog)
    save(a.out / "intent.json", live)
    ids = {m["id"] for m in json.loads(live["body"])["miners"]}
    miners = [m for m in json.loads(catalog["body"]) if m["id"] in ids]
    save(a.out / "miners.json", miners)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(capture_miner, [(m, a.out, queries) for m in miners]))
    save(a.out / "collection-summary.json", {"finished_at": now(), "queries": len(queries),
                                             "live_miners": len(ids), "results": results})
    print(json.dumps(results), flush=True)


if __name__ == "__main__":
    main()
