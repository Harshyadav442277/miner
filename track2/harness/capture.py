"""Capture real miners' answers to frozen queries, from each miner's own public service.

    python capture.py QUESTION_ANSWERING_GENERAL queries.json --out C:/Users/hyada/tg-eval/captures/qa-<date>

Refuses to run unless queries.json has a valid queries.freeze.json next to it (freeze.py --queries),
so the questions are fixed before any answer is seen. Then it reads the intent's live miner list from
/engine/v1/intents/<id>, each miner's catalog entry and YAML, and calls each miner's public endpoint
once per query: at most one request per second per host (slower if the YAML asks), bounded retries,
a hard cap on total requests, no auth headers, a generic User-Agent, IPv4 only. No paid engine route
is used. Every raw response is stored with URL, status, timing and sha256.

Miner YAML and catalog fields are untrusted: every URL goes through netguard (http/https only,
public IPv4 hosts only, every redirect hop re-checked), and a miner id or slug that is not
^[A-Za-z0-9_-]{1,64}$ is skipped. Our own miner (slug `livecert`) is flagged related_party: it must
be disclosed and never favoured. The output directory must not exist (captures are immutable).
"""
import argparse
import datetime as dt
import json
import sys
import time
import urllib.parse
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import freeze as freezer  # noqa: E402
import netguard  # noqa: E402

NODE = "https://devnode.telegraphprotocol.com"
RELATED_PARTY_SLUGS = {"livecert"}
QUERY_PARAMS = ("query", "q", "question", "prompt", "text", "input", "claim", "name", "search")
MIN_INTERVAL = 1.0      # seconds between requests to one host, at least
MAX_RETRIES = 2         # retries after a 429, a 5xx or a transport failure
DEFAULT_CAP = 600       # hard cap on all HTTP requests in one run
TIMEOUT = 30


class Capped(RuntimeError):
    pass


class Client:
    """Guarded fetches with a per-host clock, bounded retries and a total request cap."""

    def __init__(self, cap, fetcher=netguard.fetch, clock=time.monotonic, sleep=time.sleep):
        self.cap, self.used, self.last = cap, 0, {}
        self.fetcher, self.clock, self.sleep = fetcher, clock, sleep

    def get(self, url, method="GET", body=None, max_bytes=2_000_000, interval=MIN_INTERVAL):
        host = urllib.parse.urlsplit(str(url)).netloc.lower()
        attempts = []
        for attempt in range(MAX_RETRIES + 1):
            if self.used >= self.cap:
                raise Capped(f"request cap {self.cap} reached")
            wait = self.last.get(host, -1e9) + max(MIN_INTERVAL, interval) - self.clock()
            if wait > 0:
                self.sleep(wait)
            self.last[host] = self.clock()
            self.used += 1
            r = self.fetcher(url, method=method, body=body, max_bytes=max_bytes, timeout=TIMEOUT)
            r["requested_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
            attempts.append({k: r[k] for k in ("status", "seconds", "error")})
            refused = str(r.get("error", "")).startswith("refused:")
            if refused or not (r["status"] == 0 or r["status"] == 429 or r["status"] >= 500):
                break
        r["attempts"] = attempts
        return r


def text(record):
    """A JSON-safe copy of a fetch record: body as text, raw bytes dropped (sha256 kept)."""
    out = {k: v for k, v in record.items() if k != "raw"}
    out["body"] = record.get("raw", b"").decode("utf-8", "replace")
    return out


def load_frozen_queries(path):
    path = Path(path)
    ff = freezer.freeze_path(path)
    if not ff.exists():
        raise freezer.FreezeError(f"{path} has no {ff.name} next to it: freeze the queries first "
                                  "(freeze.py --queries) so they are fixed before any answer is seen")
    record = freezer.verify(ff, path)
    if record.get("kind") != "queries":
        raise freezer.FreezeError(f"{ff.name} is not a queries freeze")
    return json.loads(path.read_text(encoding="utf-8")), record


def plan(miner, doc, intent):
    """Which endpoint, method and parameter carry the query, from the miner's own YAML."""
    family = intent.removesuffix("_GENERAL")
    eps = [e for e in doc.get("endpoints") or [] if isinstance(e, dict)
           and any(str(i).removesuffix("_GENERAL") == family for i in e.get("intents") or [])]
    if len(eps) != 1:
        return {"error": f"YAML lists {len(eps)} endpoints for {intent}, need exactly 1"}
    e = eps[0]
    params = ((e.get("params") or {}).get("query") or {}) if isinstance(e.get("params"), dict) else {}
    required = [str(v.get("name")) for v in params.get("required") or [] if isinstance(v, dict)]
    dynamic = [p for p in required if p in QUERY_PARAMS]
    props = (doc.get("input_schema") or {}).get("properties") or {}
    if not dynamic:
        dynamic = [p for p in QUERY_PARAMS if p in props][:1] or ["query"]
    try:
        rate = float(doc.get("rate_limit_per_sec") or 1)
    except (TypeError, ValueError):
        rate = 1.0
    base = str(doc.get("base_url") or miner.get("base_url") or "")
    return {"base_url": base, "path": str(e.get("external_path") or e.get("path") or "/"),
            "method": str(e.get("method") or "GET").upper(), "parameters": dynamic,
            "min_interval_seconds": max(MIN_INTERVAL, 1.0 / rate if rate > 0 else MIN_INTERVAL)}


def capture_miner(client, m, catalog_entry, intent, queries, out):
    mid, slug = netguard.safe_name(m.get("id"), "miner id"), str(m.get("slug", ""))
    record = {"miner_id": mid, "slug": slug, "related_party": slug in RELATED_PARTY_SLUGS,
              "base_url": m.get("base_url"), "yaml_url": (catalog_entry or {}).get("yaml_url")}
    path = netguard.safe_path(out, f"miner-{mid}.json")
    if not record["yaml_url"]:
        record["plan"] = {"error": "no catalog entry or yaml_url"}
    else:
        y = client.get(record["yaml_url"], max_bytes=500_000)
        record["yaml"] = text(y)
        try:
            doc = yaml.safe_load(record["yaml"]["body"]) if y["status"] == 200 else None
            record["plan"] = plan(m, doc, intent) if isinstance(doc, dict) else {"error": "YAML not a mapping"}
        except yaml.YAMLError as exc:
            record["plan"] = {"error": f"YAML parse: {exc}"}
    responses = []
    if "error" not in record["plan"]:
        p = record["plan"]
        for q in queries:
            params = {name: q["query"] for name in p["parameters"]}
            url = p["base_url"].rstrip("/") + "/" + p["path"].lstrip("/")
            body = params if p["method"] == "POST" else None
            if body is None:
                url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
            r = client.get(url, method=p["method"] if p["method"] in netguard.METHODS else "GET", body=body,
                           interval=p["min_interval_seconds"])
            responses.append({"query_id": q.get("id"), "query": q["query"], **text(r)})
    record["responses"] = responses
    path.write_text(json.dumps(record, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return {"miner_id": mid, "slug": slug, "related_party": record["related_party"],
            "plan_error": record["plan"].get("error"), "requests": len(responses),
            "http_200": sum(r["status"] == 200 for r in responses)}


def run(intent, queries_path, out, node=NODE, cap=DEFAULT_CAP, fetcher=netguard.fetch, sleep=time.sleep):
    netguard.safe_name(intent, "intent id")
    queries, frozen = load_frozen_queries(queries_path)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    client = Client(cap, fetcher=fetcher, sleep=sleep)
    summary = {"intent": intent, "queries_sha256": frozen["sha256"], "queries": len(queries),
               "started_at": dt.datetime.now(dt.timezone.utc).isoformat(), "miners": [], "skipped": []}
    try:
        live = client.get(f"{node}/engine/v1/intents/{intent}")
        catalog = client.get(f"{node}/api/miners", max_bytes=40_000_000)
        (out / "intent.json").write_text(json.dumps(text(live), indent=1), encoding="utf-8")
        (out / "catalog.sha256").write_text(catalog.get("sha256", "") + "\n", encoding="ascii")
        if live["status"] != 200 or catalog["status"] != 200:
            raise RuntimeError(f"node: intent {live['status']} {live['error']}, catalog {catalog['status']}")
        miners = json.loads(live["raw"]).get("miners") or []
        by_id = {str(c.get("id")): c for c in json.loads(catalog["raw"]) if isinstance(c, dict)}
        for m in miners:
            try:
                summary["miners"].append(capture_miner(client, m, by_id.get(str(m.get("id"))), intent, queries, out))
            except netguard.UnsafeURL as exc:
                summary["skipped"].append({"miner": str(m.get("id"))[:80], "reason": str(exc)})
    except Capped as exc:
        summary["stopped"] = str(exc)
    summary["requests"] = client.used
    summary["finished_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    (out / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("intent", help="e.g. QUESTION_ANSWERING_GENERAL")
    ap.add_argument("queries", type=Path, help="frozen JSON list of {query, id?}")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--cap", type=int, default=DEFAULT_CAP, help="hard cap on total HTTP requests")
    a = ap.parse_args()
    try:
        s = run(a.intent, a.queries, a.out, cap=a.cap)
    except (freezer.FreezeError, netguard.UnsafeURL, FileExistsError) as exc:
        sys.exit(f"REFUSED: {exc}")
    print(json.dumps(s, indent=1))


if __name__ == "__main__":
    main()
