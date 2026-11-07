"""Grade every active miner on deterministic intents against the primary source.

WINNING A6: a "gap" claim needs side-by-side fixtures against the primary source,
not a miner count. This calls each registered endpoint for an intent once, the way
its own YAML declares it, with one question whose answer is read live from the
source, and records whether the answer carries it.

  DNS_RECORD_LOOKUP          MX of github.com, read from Google Public DNS
  TOKEN_TOTAL_SUPPLY_VERIFY  USDC totalSupply() on Ethereum, read by eth_call
  ONCHAIN_METRIC_VERIFY      gas used by Ethereum block 21000000, read by eth_getBlockByNumber

Grades: pass, wrong (answered without the fact), error (non-200, timeout or not
an answer), paywalled (402), auth (401/403). Direct calls only: nothing is routed
or paid through Telegraph. Each miner's YAML is untrusted data, parsed with
yaml.safe_load. Our own routes are graded the same way, as the control.

Named results are written to OUT, outside the repository on purpose: publishing
other miners' failures is the owner's decision. Only counts belong in the repo.

  python -I tools/field-check.py <miners.json from devnode /api/miners> <out-dir>
Needs PyYAML.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import yaml

UA = "livecert-field-check/1.0 (+https://miner-wine.vercel.app)"
# Public data APIs registered directly as an endpoint, not a miner's own service. They answer
# their own question shape, not the intent's, and are counted apart.
RAW_API_HOSTS = re.compile(r"(^|\.)(coingecko\.com|coinpaprika\.com|binance\.com|llama\.fi|ethplorer\.io|blockscout\.com|"
                           r"mitre\.org|osv\.dev|circl\.lu|shodan\.io|redhat\.com|ubuntu\.com|alpinelinux\.org|cisa\.gov|"
                           r"first\.org|cloudflare-dns\.com|hackertarget\.com|dns\.google|nvd\.nist\.gov)$", re.I)
OURS = "https://miner-wine.vercel.app"
USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

QUESTIONS = {
    "DNS_RECORD_LOOKUP": ("What are the MX records for github.com?", {"domain": "github.com", "type": "MX"}, "/dns"),
    "TOKEN_TOTAL_SUPPLY_VERIFY": (f"What is the total supply of USDC ({USDC}) on Ethereum?", {"token": USDC, "chain": "ethereum"}, "/token-supply"),
    "ONCHAIN_METRIC_VERIFY": ("How much gas did block 21000000 on ethereum use?", {"block": "21000000", "chain": "ethereum"}, "/onchain-metric"),
}
QUESTION_PARAM = re.compile(r"^(query|q|question|prompt|text|input|message|request)$", re.I)
FILL = [
    (re.compile(r"domain|host|hostname|^name$|fqdn", re.I), "domain"),
    (re.compile(r"record|^type$|rrtype|qtype", re.I), "type"),
    (re.compile(r"token|contract|address", re.I), "token"),
    (re.compile(r"chain|network", re.I), "chain"),
    (re.compile(r"block|height", re.I), "block"),
]


def get(url, data=None, headers=None, timeout=20):
    req = urllib.request.Request(url, data=data, headers={"user-agent": UA, **(headers or {})})
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(400_000).decode("utf-8", "replace"), int((time.time() - t) * 1000)
    except urllib.error.HTTPError as e:
        return e.code, e.read(20_000).decode("utf-8", "replace"), int((time.time() - t) * 1000)
    except Exception as e:  # timeouts, DNS, TLS: an unreachable endpoint is a result here
        return None, str(e)[:200], int((time.time() - t) * 1000)


def names(intent, listed):
    """V2 lists intents under a family (ONCHAIN_METRIC_VERIFY_GENERAL); older YAMLs name the family itself."""
    return any(i == intent or str(i).startswith(intent + "_") for i in (listed or []))


def truth():
    _, mx, _ = get("https://dns.google/resolve?name=github.com&type=MX", headers={"accept": "application/dns-json"})
    records = [a["data"].split()[-1].rstrip(".").lower() for a in json.loads(mx).get("Answer", []) if a.get("type") == 15]
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "eth_call", "params": [{"to": USDC, "data": "0x18160ddd"}, "latest"]}).encode()
    _, rpc, _ = get("https://ethereum-rpc.publicnode.com", data=body, headers={"content-type": "application/json"})
    supply = int(json.loads(rpc)["result"], 16)
    # Block gas is fixed once the block is final; Blockscout indexes it independently of the RPCs.
    _, block, _ = get("https://eth.blockscout.com/api/v2/blocks/21000000")
    gas = int(json.loads(block).get("gas_used") or 0)
    return {"mx": records, "supply_raw": supply, "supply": supply / 1e6, "block_gas": gas}


def numbers(text):
    out = []
    for m in re.finditer(r"(\d[\d,]*\.?\d*)\s*(billion|bn|b\b|million|m\b)?", text, re.I):
        try:
            v = float(m.group(1).replace(",", ""))
        except ValueError:
            continue
        unit = (m.group(2) or "").lower()
        out.append(v * (1e9 if unit in ("billion", "bn", "b") else 1e6 if unit in ("million", "m") else 1))
    return out


def strip_echo(obj):
    """The answer without fields that only repeat the question back."""
    if isinstance(obj, dict):
        return {k: strip_echo(v) for k, v in obj.items() if not QUESTION_PARAM.match(k) and k != "receipt"}
    if isinstance(obj, list):
        return [strip_echo(v) for v in obj]
    return obj


def grade(intent, status, text, facts):
    if status in (401, 403):
        return "auth"
    if status == 402:
        return "paywalled"
    if status != 200 or not text.strip():
        return "error"
    low = text.lower()
    if intent == "DNS_RECORD_LOOKUP":
        return "pass" if facts["mx"] and all(r in low for r in facts["mx"]) else "wrong"
    if intent == "TOKEN_TOTAL_SUPPLY_VERIFY":
        ok = any(abs(n - t) / t < 0.005 for n in numbers(text) for t in (facts["supply"], facts["supply_raw"]))
        return "pass" if ok else "wrong"
    try:
        scan = json.dumps(strip_echo(json.loads(text)))
    except ValueError:
        scan = text
    gas = facts["block_gas"]
    return "pass" if gas and (str(gas) in scan or f"{gas:,}" in scan or hex(gas) in scan.lower()) else "wrong"


def value_for(name, description, intent):
    """What the node would most plausibly put in a parameter, judged by its name and then its description."""
    question, values, _ = QUESTIONS[intent]
    if (name or "").lower() in ("intent", "intent_id"):
        return intent
    for text in (name, description):
        for rx, key in FILL:
            if rx.search(text or ""):
                return values.get(key, question)
    return question if QUESTION_PARAM.match(name or "") else None


def request_for(intent, ep, base):
    question, values, _ = QUESTIONS[intent]
    params = ep.get("params") or {}
    declared = []
    for where in ("query", "body", "path"):
        block = params.get(where) or {}
        for kind in ("required", "optional"):
            declared += [p for p in block.get(kind) or [] if isinstance(p, dict)]
    fill = {}
    for p in declared:
        name, desc = p.get("name", ""), str(p.get("description", ""))
        # A parameter named like the question but described as a host or address is that host or address.
        v = value_for("", desc, intent) if QUESTION_PARAM.match(name) and value_for("", desc, intent) else value_for(name, desc, intent)
        if v is not None:
            fill[name] = v
    if not any(QUESTION_PARAM.match(n) for n in fill):
        fill["query"] = question
    method = (ep.get("method") or "GET").upper()
    path = str(ep.get("external_path") or ep.get("path") or "")
    # Path templates such as /tokens/{address} or /cve/{cve_id}: the node fills them; so do we.
    for name in re.findall(r"\{([^}]+)\}", path):
        v = fill.pop(name, None) or value_for(name, "", intent) or question
        path = path.replace("{" + name + "}", urllib.parse.quote(str(v), safe=""))
    url = base.rstrip("/") + path
    if method == "GET":
        return url + ("&" if "?" in url else "?") + urllib.parse.urlencode(fill), None
    return url, json.dumps(fill).encode()


def main(miners_path, out_dir):
    miners = json.load(open(miners_path, encoding="utf-8"))
    facts = truth()
    targets = {}
    yaml_cache = {}
    for m in miners:
        if m.get("activation_status") != "active":
            continue
        for intent in QUESTIONS:
            if not names(intent, m.get("supported_intents")):
                continue
            url = m.get("yaml_url") or ""
            if url not in yaml_cache:
                status, text, _ = get(url, timeout=15) if url.startswith("https://") else (None, "", 0)
                try:
                    yaml_cache[url] = yaml.safe_load(text) if status == 200 else None
                except yaml.YAMLError:
                    yaml_cache[url] = None
            doc = yaml_cache[url]
            if not isinstance(doc, dict):
                targets.setdefault((intent, f"yaml:{url}"), {"intent": intent, "id": m["id"], "slug": m.get("slug"), "grade": "error", "note": "YAML unreadable"})
                continue
            for ep in doc.get("endpoints") or []:
                if not isinstance(ep, dict) or not names(intent, ep.get("intents")):
                    continue
                base = ep.get("endpoint_base_url") or doc.get("base_url") or m.get("base_url") or ""
                if not base.startswith("https://") or base.startswith(OURS):
                    continue
                key = (intent, base + str(ep.get("external_path") or ep.get("path")))
                targets.setdefault(key, {"intent": intent, "id": m["id"], "slug": m.get("slug"), "ep": ep, "base": base})
    for intent, (_, _, path) in QUESTIONS.items():
        targets[(intent, OURS + path)] = {"intent": intent, "id": 4829, "slug": "livecert (control, not yet registered for this intent)",
                                          "ep": {"path": path, "method": "GET", "params": {"query": {"optional": [{"name": "query"}]}}}, "base": OURS}
    results = []
    for (intent, endpoint), t in sorted(targets.items(), key=lambda kv: kv[0]):
        if "ep" in t:
            url, body = request_for(intent, t["ep"], t["base"])
            status, text, ms = get(url, data=body, headers={"content-type": "application/json"} if body else None)
            raw = bool(RAW_API_HOSTS.search(urllib.parse.urlparse(t["base"]).hostname or ""))
            t = {**{k: v for k, v in t.items() if k != "ep"}, "endpoint": endpoint, "request": url[:300], "status": status,
                 "ms": ms, "raw_api": raw, "grade": grade(intent, status, text, facts), "answer_head": text[:300]}
        results.append(t)
        print(f"{intent:26} {t['grade']:9} {str(t.get('status')):5} {t.get('ms', '')!s:>6} ms  {t.get('slug')}")
    summary = {}
    for r in results:
        if str(r.get("slug", "")).startswith("livecert"):
            continue
        kind = "raw_api" if r.get("raw_api") else "service"
        bucket = summary.setdefault(r["intent"], {}).setdefault(kind, {})
        bucket[r["grade"]] = bucket.get(r["grade"], 0) + 1
    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    json.dump({"checked_at": stamp, "facts": facts, "results": results}, open(f"{out_dir}/field-named.json", "w", encoding="utf-8"), indent=1)
    json.dump({"checked_at": stamp, "facts": facts, "competitor_endpoints_by_grade": summary,
               "livecert_control": {r["intent"]: r["grade"] for r in results if str(r.get("slug", "")).startswith("livecert")}},
              open(f"{out_dir}/field-summary.json", "w", encoding="utf-8"), indent=1)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
