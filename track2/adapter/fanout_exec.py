"""Split a validator's batch request across several adapterexec workers and merge the replies.

Why: the kit's adapterexec scores one text at a time (the engine is single-threaded by design),
about 4 s per 256-token text on our laptop CPU, so a 30-text validator batch takes ~2 minutes and
a Cloudflare quick tunnel cuts any request off at 100 s (HTTP 524, measured 2026-11-01). Each
worker runs the same foundation, engine and package, so splitting changes no bits.

The reply carries each item's score in request order, the identity the workers report (all must
agree, or the request fails with 502), and the input_root of the whole batch, computed the way
the node does (remote.BatchInputRoot). A chunk whose worker fails is retried on the others.

    python fanout_exec.py --listen 127.0.0.1:8090 --workers http://127.0.0.1:8081/,http://127.0.0.1:8082/

One process can serve several adapters, one runnable URL per family (`https://host/<FAMILY>`):

    python fanout_exec.py --route CONTRACT_OBLIGATION_AUDIT=http://127.0.0.1:8081/,http://127.0.0.1:8082/
"""
import argparse
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_executor import batch_input_root  # noqa: E402

IDENTITY = ("foundation_hash", "adapter_hash", "tokenizer_hash")
MAX_BODY = 1 << 20  # adapterexec's own limit


def post(url, body):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1800) as r:
        return json.loads(r.read())


def post_any(workers, start, body):
    """Try the chunk's own worker, then the others: one dead worker must not fail the batch."""
    err = None
    for i in range(len(workers)):
        try:
            return post(workers[(start + i) % len(workers)], body)
        except Exception as e:
            err = e
    raise err


def make_handler(routes, log_path, capture_dir=None):
    """routes maps a path's first segment ("" for any path) to that adapter's worker URLs."""
    pool = ThreadPoolExecutor(max_workers=sum(len(w) for w in routes.values()))

    class Handler(BaseHTTPRequestHandler):
        def reply(self, status, body):
            data = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            # A health page for uptime checks; it names the families served and nothing else.
            self.reply(200, {"families": sorted(k for k in routes if k)})

        def do_POST(self):
            t0 = time.time()
            name = self.path.split("?")[0].strip("/").split("/")[0].upper()
            workers = routes.get(name) or routes.get("")
            if not workers:
                return self.reply(404, {"error": f"no adapter at /{name}"})
            n = int(self.headers.get("Content-Length") or 0)
            if n > MAX_BODY:
                return self.reply(413, {"error": "body too large"})
            try:
                req = json.loads(self.rfile.read(n))
                items = req["batch"]
                assert isinstance(items, list)
            except Exception:
                return self.reply(400, {"error": 'a body with a "batch" array is required'})
            if not items:
                return self.reply(200, {"results": []})
            k = min(len(workers), len(items))
            size = -(-len(items) // k)
            chunks = [items[i:i + size] for i in range(0, len(items), size)]
            ident = {key: req[key] for key in IDENTITY if key in req}
            try:
                replies = list(pool.map(lambda ic: post_any(workers, ic[0], {"batch": ic[1], **ident}),
                                        enumerate(chunks)))
            except Exception as e:
                return self.reply(502, {"error": f"worker failed: {e}"})
            results = [r for rep in replies for r in rep.get("results", [])]
            ids = {tuple(str(rep.get(key, "")).lower() for key in IDENTITY) for rep in replies}
            if len(results) != len(items) or len(ids) != 1:
                return self.reply(502, {"error": "workers disagree or dropped items"})
            body = {"results": results, **dict(zip(IDENTITY, ids.pop()))}
            tokens = [it.get("tokens") for it in items]
            if all(isinstance(t, list) for t in tokens):
                body["input_root"] = batch_input_root(tokens)
            if capture_dir:
                # The public pairs the node sends at the remote check (ARCHITECTURE A7, amended 2026-11-23): kept
                # outside the repo, read only to name the kinds of pair the pool holds, never trained on or copied.
                stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
                with open(os.path.join(capture_dir, f"{name or 'any'}-{stamp}-{len(items)}.json"), "w",
                          encoding="utf-8") as f:
                    json.dump({"route": name, "at": stamp, "request": req, "results": results}, f)
            if log_path:
                sizes = [len(t) for t in tokens if isinstance(t, list)]
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps({"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "route": name, "items": len(items),
                                        "max_tokens": max(sizes, default=0), "seconds": round(time.time() - t0, 1),
                                        **{key: body[key] for key in IDENTITY}}) + "\n")
            self.reply(200, body)

        def log_message(self, fmt, *args):
            sys.stderr.write("fanout: " + fmt % args + "\n")

    return Handler


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--listen", default="127.0.0.1:8090")
    ap.add_argument("--workers", help="comma-separated adapterexec URLs, for any path")
    ap.add_argument("--route", action="append", default=[], help="FAMILY=url,url: the workers for /FAMILY")
    ap.add_argument("--log", help="append each scored batch's size, timing and identity here (JSON lines)")
    ap.add_argument("--capture", help="keep each batch request (token lists) as a JSON file in this folder, outside the repo")
    a = ap.parse_args()
    host, port = a.listen.rsplit(":", 1)
    split = lambda v: [w.strip() for w in v.split(",") if w.strip()]
    routes = {name.strip().upper(): split(urls) for name, urls in (r.split("=", 1) for r in a.route)}
    if a.workers:
        routes[""] = split(a.workers)
    if not routes:
        ap.error("give --workers or at least one --route")
    print(f"fanout: {routes} on {a.listen}", flush=True)
    if a.capture:
        os.makedirs(a.capture, exist_ok=True)
    ThreadingHTTPServer((host, int(port)), make_handler(routes, a.log, a.capture)).serve_forever()


if __name__ == "__main__":
    main()
