"""python -m unittest (from track2/harness). No network beyond a loopback stub server; no adapterexec."""
import http.server
import json
import socket
import struct
import sys
import tempfile
import threading
import time
import unittest
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import capture  # noqa: E402
import compare  # noqa: E402
import fetch_champion  # noqa: E402
import freeze  # noqa: E402
import gate  # noqa: E402
import netguard  # noqa: E402
import registry  # noqa: E402


def resolver(ip):
    return lambda host, port, **kw: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port))]


def safetensors(meta=None):
    header = {"__metadata__": meta or {"rank": "16"}, "w": {"dtype": "F32", "shape": [2], "data_offsets": [0, 8]}}
    h = json.dumps(header).encode()
    return struct.pack("<Q", len(h)) + h + b"\0" * 8


class Stats(unittest.TestCase):
    def test_wilson(self):
        self.assertEqual(compare.wilson(7, 10), [0.3968, 0.8922])
        self.assertEqual(compare.wilson(0, 0), [0.0, 1.0])

    def test_mcnemar(self):
        self.assertAlmostEqual(compare.mcnemar_exact(1, 9), 22 / 1024)  # 2 * (1 + 10) / 2^10
        self.assertEqual(compare.mcnemar_exact(0, 0), 1.0)
        self.assertEqual(compare.mcnemar_exact(5, 5), 1.0)
        self.assertAlmostEqual(compare.mcnemar_exact(0, 6), 2 / 64)

    def test_bootstrap(self):
        self.assertEqual(compare.bootstrap_diff([1] * 50, [0] * 50, draws=500), [1.0, 1.0])
        self.assertEqual(compare.bootstrap_diff([1, 0] * 25, [1, 0] * 25, draws=500), [0.0, 0.0])
        lo, hi = compare.bootstrap_diff([1] * 100, [1, 0] * 50, draws=2000)
        self.assertTrue(0.35 <= lo < 0.5 < hi <= 0.65, (lo, hi))
        self.assertEqual(compare.bootstrap_diff([1, 0, 1] * 30, [0, 0, 1] * 30, draws=300),
                         compare.bootstrap_diff([1, 0, 1] * 30, [0, 0, 1] * 30, draws=300))  # seeded

    def test_p_pass(self):
        self.assertEqual(compare.p_pass([1] * 40, [0] * 40, draws=200), 1.0)
        self.assertEqual(compare.p_pass([1] * 40, [1] * 40, draws=200), 0.0)  # no 2-point margin
        self.assertLess(compare.p_pass([1, 0] * 40, [0] * 80, draws=500), 0.05)  # 50% never reaches 70%


class Freeze(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())

    def write(self, rows, name="h.jsonl"):
        p = self.dir / name
        p.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
        return p

    def test_validation(self):
        bad = [{"prompt": "", "chosen": "a", "rejected": "b"}, {"prompt": "p", "chosen": "a", "rejected": "a"},
               {"prompt": "p", "chosen": "x", "rejected": "y", "kind": 3}, {"prompt": "p", "chosen": "x", "rejected": "y"},
               {"prompt": "p", "chosen": "x", "rejected": "y"}, {"prompt": "q", "chosen": "x", "rejected": "y",
                                                                  "related_party": "yes"}]
        errs = "; ".join(freeze.validate_pairs(bad))
        for s in ("row 1: prompt", "row 2: chosen == rejected", "row 3: kind", "row 5: duplicate", "row 6: related_party"):
            self.assertIn(s, errs)
        with self.assertRaises(freeze.FreezeError):
            freeze.freeze(self.write(bad), "F", "s", "n")

    def test_freeze_verify_and_refuse_overwrite(self):
        p = self.write([{"prompt": "p", "chosen": "long answer", "rejected": "short", "kind": "flip"},
                        {"prompt": "p2", "chosen": "a", "rejected": "bb", "related_party": True}])
        target, rec = freeze.freeze(p, "F", "src", "note")
        self.assertEqual(target.name, "h.freeze.json")
        self.assertEqual((rec["rows"], rec["longer_chosen"], rec["related_party_rows"]), (2, 1, 1))
        self.assertEqual(freeze.verify(target)["sha256"], rec["sha256"])
        with self.assertRaises(freeze.FreezeError):
            freeze.freeze(p, "F", "src", "again")
        p.write_text(p.read_text() + json.dumps({"prompt": "x", "chosen": "y", "rejected": "z"}) + "\n")
        with self.assertRaises(freeze.FreezeError):
            freeze.verify(target)

    def test_queries(self):
        self.assertTrue(freeze.validate_queries([{"query": "a"}, {"query": "a"}]))
        self.assertTrue(freeze.validate_queries({"query": "a"}))
        self.assertFalse(freeze.validate_queries([{"query": "a", "id": 1}, {"query": "b"}]))


def synthetic(n, both_r, c_only, b_only, longer, shorter, sha="abc"):
    """results.json shape with exact paired counts and length-baseline accuracies."""
    cand = [True] * both_r + [True] * c_only + [False] * b_only + [False] * (n - both_r - c_only - b_only)
    base = [True] * both_r + [False] * c_only + [True] * b_only + [False] * (n - both_r - c_only - b_only)
    keys = [f"k{i}" for i in range(n)]
    rows = lambda v: {"rows": [{"pair_key": k, "correct": c} for k, c in zip(keys, v)]}
    nl, ns = round(longer * n), round(shorter * n)
    return {"pairs": {"holdout": {"sha256": sha, "pairs": n, "file_rows": n, "pair_keys": keys}},
            "baselines": {"holdout": {"longer": {"accuracy": nl / n, "correct": [True] * nl + [False] * (n - nl)},
                                      "shorter": {"accuracy": ns / n, "correct": [False] * (n - ns) + [True] * ns}}},
            "packages": {"cand": {"sets": {"holdout": rows(cand)}}, "champ": {"sets": {"holdout": rows(base)}},
                         "GENERIC": {"sets": {"holdout": rows(base)}}}}


class Gate(unittest.TestCase):
    F = {"sha256": "abc"}

    def fails(self, results, champion="champ"):
        return gate.evaluate(results, self.F, "cand", champion, "holdout")

    def test_pass(self):
        f, _ = self.fails(synthetic(200, 140, 40, 0, 0.5, 0.45))
        self.assertEqual(f, [])

    def test_generic_fallback_is_announced(self):
        f, notes = self.fails(synthetic(200, 140, 40, 0, 0.5, 0.45), champion=None)
        self.assertEqual(f, [])
        self.assertIn("GENERIC", notes[0])

    def one(self, results, text):
        f, _ = self.fails(results)
        self.assertTrue(any(text in x for x in f), f)

    def test_each_fail_reason(self):
        self.one(synthetic(200, 140, 40, 0, 0.5, 0.45, sha="other"), "holdout hash")
        self.one(synthetic(60, 45, 10, 0, 0.5, 0.45), "n = 60")
        self.one(synthetic(200, 170, 2, 2, 0.5, 0.45), "+ 0.02")
        self.one(synthetic(200, 170, 2, 2, 0.5, 0.45), "candidate-only-right 2 <= champ-only-right 2")
        self.one(synthetic(200, 100, 46, 0, 0.5, 0.3), "Wilson lower bound")
        self.one(synthetic(200, 140, 40, 0, 0.8, 0.1), "holdout unusable")
        self.one(synthetic(200, 140, 40, 0, 0.05, 0.88), "shorter-answer-wins")
        self.one(synthetic(1000, 700, 60, 30, 0.5, 0.45), "P(pass a 30-pair round")

    def test_different_pairs_refused(self):
        r = synthetic(200, 140, 40, 0, 0.5, 0.45)
        r["packages"]["champ"]["sets"]["holdout"]["rows"][0]["pair_key"] = "zzz"
        self.one(r, "not measured on the same pairs")


FIXTURE = {"count": 3, "intents": {
    "QA": {"champion": {"registration_id": 301, "author_address": "0xAB", "eval_score": 0.7,
                        "eval": {"decision": "first_canonical"}, "wasm_runnable_url": "https://x"},
           "entries": [{"registration_id": 301, "author_address": "0xAB"}, {"registration_id": 7, "author_address": "0xcd"}]},
    "FC": {"champion": None, "entries": [{"registration_id": 54, "author_address": "0xab"}]},
    "GENERIC": {"champion": {"registration_id": 900005, "author_address": "0x71", "eval_score": None,
                             "wasm_runnable_url": "manual-seed"}, "entries": []}}}


class Registry(unittest.TestCase):
    def test_lookups(self):
        d = registry.parse(json.dumps(FIXTURE).encode())
        self.assertEqual(registry.champion(d, "QA")["registration_id"], 301)
        self.assertIsNone(registry.champion(d, "FC"))
        self.assertIsNone(registry.champion(d, "MISSING"))
        self.assertEqual(len(registry.entries(d, "QA")), 2)
        self.assertEqual([e["registration_id"] for e in registry.by_author(d, "0xab")], [54, 301])
        self.assertEqual(registry.entry(d, "QA", "7")["author_address"], "0xcd")
        t = registry.table_lines(d)
        self.assertIn("gate=first_canonical", t[2])
        self.assertIn("champion=none", t[0])
        self.assertIn("gate=manual-seed", t[1])
        with self.assertRaises(ValueError):
            registry.parse(b'{"intents": []}')


class Champion(unittest.TestCase):
    def test_keccak_and_format_refusals(self):
        raw = safetensors()
        k = fetch_champion.keccak256(raw)
        self.assertEqual(fetch_champion.verify_bytes(raw, k)[0], k)
        with self.assertRaisesRegex(ValueError, "KECCAK MISMATCH"):
            fetch_champion.verify_bytes(raw, "0" * 64)
        with self.assertRaises(fetch_champion.NotSafetensors):
            fetch_champion.verify_bytes(b"\x80\x04pickle-not-safetensors", k)
        with self.assertRaises(fetch_champion.NotSafetensors):
            fetch_champion.verify_bytes(b"\0" * (fetch_champion.MAX_BYTES + 1), k)

    def test_mismatch_writes_nothing_and_names_are_checked(self):
        root = Path(tempfile.mkdtemp())
        fake = lambda url, **kw: {"status": 200, "raw": safetensors(), "hops": [{"url": url}], "error": ""}
        e = {"registration_id": 9, "wasm_url": "https://example.org/a", "wasm_hash": "1" * 64}
        with self.assertRaisesRegex(ValueError, "KECCAK MISMATCH"):
            fetch_champion.fetch_entry(e, "QA", root, fetcher=fake)
        self.assertEqual(list(root.rglob("*")), [])
        e["wasm_hash"] = fetch_champion.keccak256(safetensors())
        pkg, man = fetch_champion.fetch_entry(e, "QA", root, fetcher=fake)
        self.assertEqual((pkg.name, man["header_metadata"]), ("9.safetensors", {"rank": "16"}))
        for fam, rid in (("../QA", 9), ("QA", "1/../2"), ("QA", "..\\x")):
            with self.assertRaises(netguard.UnsafeURL):
                fetch_champion.fetch_entry({**e, "registration_id": rid}, fam, root, fetcher=fake)


class Guard(unittest.TestCase):
    def test_refusals(self):
        with self.assertRaisesRegex(netguard.UnsafeURL, "non-public"):
            netguard.check_url("https://miner.example/x", resolver("10.0.0.5"))
        with self.assertRaisesRegex(netguard.UnsafeURL, "non-public"):
            netguard.check_url("http://example.org/", resolver("169.254.169.254"))
        with self.assertRaisesRegex(netguard.UnsafeURL, "scheme"):
            netguard.check_url("file:///C:/Windows/win.ini", resolver("8.8.8.8"))
        with self.assertRaisesRegex(netguard.UnsafeURL, "host"):
            netguard.check_url("https://user@example.org/", resolver("8.8.8.8"))
        self.assertEqual(netguard.check_url("http://13.237.89.59:7148/a", resolver("13.237.89.59"))[2], 7148)
        r = netguard.fetch("http://127.0.0.1:9/")  # ALLOW_LOOPBACK is False outside the stub tests
        self.assertTrue(r["error"].startswith("refused:"))
        for bad in ("a/b", "..", "x" * 65, "1\\2", ""):
            with self.assertRaises(netguard.UnsafeURL):
                netguard.safe_name(bad)
        with self.assertRaises(netguard.UnsafeURL):
            netguard.safe_path(tempfile.mkdtemp(), "../x.json")


class Stub(http.server.BaseHTTPRequestHandler):
    hits = []

    def log_message(self, *a):
        pass

    def reply(self, code, body, ctype="application/json", headers=()):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        for k, v in headers:
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        Stub.hits.append((time.monotonic(), self.path, self.headers.get("Authorization")))
        u = urllib.parse.urlsplit(self.path)
        base = f"http://127.0.0.1:{self.server.server_port}"
        if u.path == "/engine/v1/intents/QUESTION_ANSWERING_GENERAL":
            ms = [{"id": i, "slug": s, "base_url": base} for i, s in (("1", "alpha"), ("2", "livecert"), ("3", "priv"))]
            self.reply(200, json.dumps({"miners": ms + [{"id": "../evil", "slug": "x", "base_url": base}]}))
        elif u.path == "/api/miners":
            self.reply(200, json.dumps([{"id": i, "yaml_url": f"{base}/yaml/{i}"} for i in ("1", "2", "3", "../evil")]))
        elif u.path.startswith("/yaml/"):
            mb = "http://10.0.0.9" if u.path.endswith("/3") else base
            self.reply(200, f"base_url: {mb}\nendpoints:\n  - path: /answer\n    method: GET\n"
                            "    intents: [QUESTION_ANSWERING_GENERAL]\n    params:\n      query:\n"
                            "        required:\n          - name: q\n", "text/yaml")
        elif u.path == "/answer":
            self.reply(200, json.dumps({"answer": urllib.parse.parse_qs(u.query)["q"][0]}))
        elif u.path == "/redirect":
            self.reply(302, "", headers=[("Location", "http://10.1.2.3/internal")])
        else:
            self.reply(404, "{}")


class Capture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        netguard.ALLOW_LOOPBACK = True
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Stub)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.node = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        netguard.ALLOW_LOOPBACK = False

    def queries(self, frozen=True):
        d = Path(tempfile.mkdtemp())
        q = d / "queries.json"
        q.write_text(json.dumps([{"id": "q1", "query": "capital of France?"}, {"id": "q2", "query": "2+2?"}]))
        if frozen:
            freeze.freeze(q, "QUESTION_ANSWERING", "test", "", queries=True)
        return d, q

    def test_missing_or_stale_freeze_refused(self):
        d, q = self.queries(frozen=False)
        with self.assertRaisesRegex(freeze.FreezeError, "freeze the queries first"):
            capture.run("QUESTION_ANSWERING_GENERAL", q, d / "out", node=self.node)
        d, q = self.queries()
        q.write_text(json.dumps([{"query": "changed after freezing"}]))
        with self.assertRaises(freeze.FreezeError):
            capture.run("QUESTION_ANSWERING_GENERAL", q, d / "out", node=self.node)
        self.assertFalse((d / "out").exists())

    def test_redirect_to_private_host_refused(self):
        r = netguard.fetch(self.node + "/redirect")
        self.assertTrue(r["error"].startswith("refused:") and "10.1.2.3" in r["error"], r["error"])
        self.assertEqual(len(r["hops"]), 1)

    def test_capture_against_stub(self):
        d, q = self.queries()
        Stub.hits.clear()
        s = capture.run("QUESTION_ANSWERING_GENERAL", q, d / "out", node=self.node)
        by = {m["miner_id"]: m for m in s["miners"]}
        self.assertEqual((by["1"]["http_200"], by["2"]["http_200"]), (2, 2))
        self.assertTrue(by["2"]["related_party"] and not by["1"]["related_party"])
        self.assertEqual(by["3"]["http_200"], 0)  # YAML points at a private address
        m3 = json.loads((d / "out" / "miner-3.json").read_text())
        self.assertTrue(all(r["error"].startswith("refused:") for r in m3["responses"]))
        self.assertEqual(s["skipped"][0]["miner"], "../evil")
        self.assertEqual(sorted(p.name for p in (d / "out").iterdir()),
                         ["catalog.sha256", "intent.json", "miner-1.json", "miner-2.json", "miner-3.json", "summary.json"])
        rec = json.loads((d / "out" / "miner-1.json").read_text())["responses"][0]
        self.assertEqual(json.loads(rec["body"]), {"answer": "capital of France?"})
        for k in ("url", "status", "seconds", "sha256", "requested_at"):
            self.assertIn(k, rec)
        gaps = [b[0] - a[0] for a, b in zip(Stub.hits, Stub.hits[1:])]
        self.assertGreaterEqual(min(gaps), 0.95, gaps)  # one host: at most one request per second
        self.assertTrue(all(h[2] is None for h in Stub.hits))  # no auth header ever sent
        with self.assertRaises(FileExistsError):
            capture.run("QUESTION_ANSWERING_GENERAL", q, d / "out", node=self.node)

    def test_structured_params(self):
        intent = "EMAIL_SECURITY_GENERAL"
        q = {"query": "What are the MX records for gmail.com?", "params": {"domain": "gmail.com", "record_type": "MX"}}
        req = lambda name, tags=("*",): {"name": name, "intents": list(tags)}
        doh = {"base_url": "https://dns.example", "endpoints": [{"external_path": "/resolve", "method": "GET",
               "intents": ["EMAIL_SECURITY"], "params": {"query": {"required": [req("name"), req("type")]}}}]}
        url, method, body, missing = capture.build_request(capture.plan({}, doh, intent), q, intent, capture.ALIASES)
        self.assertEqual((url, method, body, missing), ("https://dns.example/resolve?name=gmail.com&type=MX", "GET", None, []))
        post = {"base_url": "https://v.example", "endpoints": [{"path": "/v1/intent", "method": "POST",
                "intents": ["FACT_CHECK_GENERAL", intent], "params": {"body": {"required": [
                    req("intent"), req("claim", ["FACT_CHECK_GENERAL"]), req("domain", [intent]),
                    req("record_type", [intent])]}}}]}
        url, method, body, missing = capture.build_request(capture.plan({}, post, intent), q, intent, capture.ALIASES)
        self.assertEqual((url, method, missing), ("https://v.example/v1/intent", "POST", []))
        self.assertEqual(body, {"intent": intent, "domain": "gmail.com", "record_type": "MX"})
        opt = {"base_url": "https://p.example", "endpoints": [{"path": "/dns", "method": "GET", "intents": [intent],
               "params": {"query": {"required": [req("query")], "optional": [req("domain"), req("type"), req("text")]}}}]}
        url, _, _, _ = capture.build_request(capture.plan({}, opt, intent), q, intent, capture.ALIASES)
        self.assertEqual(urllib.parse.parse_qs(urllib.parse.urlsplit(url).query),
                         {"query": [q["query"]], "domain": ["gmail.com"], "type": ["MX"]})
        need = {"base_url": "https://n.example", "endpoints": [{"path": "/x", "method": "GET", "intents": [intent],
                "params": {"query": {"required": [req("selector")]}}}]}
        self.assertEqual(capture.build_request(capture.plan({}, need, intent), q, intent, capture.ALIASES)[3], ["selector"])
        url, _, _, missing = capture.build_request(capture.plan({}, need, intent), q, intent, {"selector": ("domain",)})
        self.assertEqual((url, missing), ("https://n.example/x?selector=gmail.com", []))
        cveq = {"query": "What is the CVSS of CVE-2021-44228?", "params": {"cve_id": "CVE-2021-44228"}}
        pathy = {"base_url": "https://o.example", "endpoints": [{"external_path": "/v1/vulns/{cve_id}", "method": "GET",
                 "intents": ["VULNERABILITY_TRIAGE_GENERAL"], "params": {"path": {"required": [req("cve_id")]}}}]}
        vi = "VULNERABILITY_TRIAGE_GENERAL"
        self.assertEqual(capture.build_request(capture.plan({}, pathy, vi), cveq, vi, capture.ALIASES)[:2],
                         ("https://o.example/v1/vulns/CVE-2021-44228", "GET"))
        self.assertEqual(freeze.validate_queries([{"query": "x", "params": {"domain": 3}}]),
                         ["query 1: `params` must map non-empty names to strings"])

    def test_cap_and_retries(self):
        calls = []
        fake = lambda url, **kw: calls.append(url) or {"status": 503, "seconds": 0, "error": "", "raw": b""}
        c = capture.Client(cap=4, fetcher=fake, clock=lambda: 0.0, sleep=lambda s: None)
        r = c.get("https://a.example/x")
        self.assertEqual(len(r["attempts"]), capture.MAX_RETRIES + 1)
        with self.assertRaises(capture.Capped):
            c.get("https://a.example/y")
        self.assertEqual(len(calls), 4)


if __name__ == "__main__":
    unittest.main()
