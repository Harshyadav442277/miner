"""Label captured EMAIL_SECURITY answers from DNS truth and pick one pair per query (README rules 2-8).

    python -I build_holdout.py --queries holdout/queries.json --capture CAPTURE_DIR \\
        --truth-before T1.jsonl --truth-after T2.jsonl [--readings readings.jsonl] --out-dir holdout/

Writes labels.jsonl (every answer), to_read.jsonl (answers that need a reader: query and body only, no
truth), holdout.jsonl (gated pairs, rendering 1), holdout_render2.jsonl (same pairs, bare request JSON,
report-only), holdout_report.jsonl (report-only pairs whose rejected side is a call failure) and
stats.json (length baselines, identity probe, per-service counts). No model score is read anywhere.
"""
import argparse
import hashlib
import json
import sys
import urllib.parse
from collections import Counter, defaultdict
from pathlib import Path

SEED = "es-pairs-v1"
RESOLVER_HOSTS = {"dns.google", "cloudflare-dns.com", "dns.adguard-dns.com", "dns.alidns.com", "doh.pub"}
CHAMPION_AUTHOR = "0x8b224783fe5b3c52b7db0cb9b1754f8812b75287"
RCODE_NAMES = {"NOERROR", "FORMERR", "SERVFAIL", "NXDOMAIN", "NOTIMP", "REFUSED"}
# Pilot 2026-11-16 (pilot.json): these answer an email-posture report for a mangled domain, not the
# requested name and record type, so they ignore the query: report-only, never gated.
IGNORES_QUERY = {"hub.shadrakbessanh.me/emailsec", "telegraph-onchain-tx-lookup-miner.onrender.com/email-security"}
TYPE_NAMES = {1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA", 33: "SRV",
              52: "TLSA", 65: "HTTPS", 257: "CAA"}


def norm(name):
    return str(name or "").strip().rstrip(".").lower()


def render(name, rtype, style=1):
    req = json.dumps({"domain": name, "record_type": rtype})
    return f"What are the {rtype} records for {name}?\nRequest: {req}" if style == 1 else req


def service_of(resp):
    u = urllib.parse.urlsplit(resp["url"])
    return f"{u.netloc.lower()}{u.path}"


def read_claim(body):
    """(lookup_ok claim, answered name, answered type, how) from a structured body, or None."""
    try:
        d = json.loads(body)
    except ValueError:
        return None
    if not isinstance(d, dict):
        return None
    question = d.get("Question")
    if isinstance(question, list):
        question = question[0] if question else None
    if isinstance(d.get("Status"), int) and isinstance(question, dict) and "intent" not in d:
        return d["Status"] == 0, norm(question.get("name")), TYPE_NAMES.get(question.get("type"), str(question.get("type"))), \
            "doh-json"
    name = d.get("domain") or d.get("name")
    rtype = d.get("record_type") or d.get("type")
    if isinstance(d.get("record_types"), list) and len(d["record_types"]) == 1:
        rtype = d["record_types"][0]
    for holder in (d, d.get("data"), d.get("result"), d.get("answer")):  # a stated lookup_ok wins
        if isinstance(holder, dict) and isinstance(holder.get("lookup_ok"), bool):
            name = holder.get("domain") or holder.get("name") or name
            rtype = holder.get("record_type") or holder.get("type") or rtype
            return holder["lookup_ok"], norm(name) if name else None, str(rtype).upper() if rtype else None, \
                "lookup_ok-json"
    for key in ("dns_status", "status", "rcode"):  # else a stated DNS status code
        if str(d.get(key, "")).upper() in RCODE_NAMES:
            return str(d[key]).upper() == "NOERROR", norm(name) if name else None, \
                str(rtype).upper() if rtype else None, "status-json"
    return None


def load_truth(before, after):
    rows = lambda p: {r["query_id"]: r for r in map(json.loads, Path(p).read_text(encoding="utf-8").splitlines()) if r}
    b, a = rows(before), rows(after)
    out = {}
    for qid, r in b.items():
        s1, s2 = r["status"], a.get(qid, {}).get("status")
        out[qid] = {"status": s1, "lookup_ok": r["lookup_ok"]} if s1 == s2 and s1 != "disagree" else \
            {"status": f"dropped:{s1}->{s2}", "lookup_ok": None}
    return out


def label_all(queries, capture, truth, readings, owners):
    labels = []
    for f in sorted(Path(capture).glob("miner-*.json")):
        m = json.loads(f.read_text(encoding="utf-8"))
        for r in m.get("responses") or []:
            q, t = queries.get(r["query_id"]), truth.get(r["query_id"])
            if q is None or t is None:
                continue
            row = {"query_id": r["query_id"], "miner_id": m["miner_id"], "slug": m["slug"], "service": service_of(r),
                   "champion_author": owners.get(m["miner_id"]) == CHAMPION_AUTHOR, "http": r["status"],
                   "body": r["body"], "truth": t["status"], "related_party": m.get("related_party", False)}
            want_name, want_type = norm(q["params"]["domain"]), q["params"]["record_type"].upper()
            if t["lookup_ok"] is None:
                row["label"] = "no_truth"
            elif row["service"] in IGNORES_QUERY:
                row["label"] = "ignores_query"
            elif r["status"] != 200 or not r["body"].strip():
                row["label"] = "call_failure"
            else:
                c = read_claim(r["body"])
                rd = readings.get((r["query_id"], m["miner_id"]))
                if c is None and rd is not None:
                    claim = {"true": True, "false": False}.get(str(rd.get("claim")).lower())
                    c = (claim, want_name if rd.get("addresses") is True else "?", want_type, "read") \
                        if claim is not None else None
                    row["reader_note"] = rd.get("note")
                if c is None:
                    row["label"] = "needs_reading" if rd is None else "unclear"
                else:
                    claim, name, rtype, how = c
                    row["how"] = how
                    if (name is not None and name != want_name) or (rtype is not None and rtype != want_type):
                        row["label"], row["kind"] = "wrong", "wrong_name_or_type"
                    elif claim == t["lookup_ok"]:
                        row["label"] = "right"
                    else:
                        row["label"], row["kind"] = "wrong", "wrong_outcome"
            labels.append(row)
    return labels


def pick_pairs(labels, queries):
    by_q = defaultdict(lambda: {"right": {}, "wrong": {}, "fail": {}})
    for r in labels:  # one answer per service per query: identical miners count once
        slot = {"right": "right", "wrong": "wrong", "call_failure": "fail"}.get(r["label"])
        if slot and r["service"] not in by_q[r["query_id"]][slot] and not r["related_party"]:
            by_q[r["query_id"]][slot][r["service"]] = r
    order = sorted(by_q, key=lambda q: hashlib.sha256(f"{SEED}:{q}".encode()).hexdigest())
    longer, n, chosen_ct, seen_ct = 0, 0, Counter(), Counter()
    gated, report = [], []
    for qid in order:
        g = by_q[qid]
        cands = [(rr, ww) for rr in g["right"].values() for ww in g["wrong"].values() if rr["body"] != ww["body"]]
        if cands:
            def cost(p):
                rr, ww = p
                generic = not (urllib.parse.urlsplit("https://" + rr["service"]).netloc in RESOLVER_HOSTS or
                               urllib.parse.urlsplit("https://" + ww["service"]).netloc in RESOLVER_HOSTS)
                lshare = (longer + (len(rr["body"]) > len(ww["body"]))) / (n + 1)
                ident = abs((chosen_ct[rr["service"]] + 1) / (seen_ct[rr["service"]] + 1) - 0.5) + \
                    abs(chosen_ct[ww["service"]] / (seen_ct[ww["service"]] + 1) - 0.5)
                tie = hashlib.sha256(f"{SEED}:{qid}:{rr['service']}:{ww['service']}".encode()).hexdigest()
                return (not generic, round(abs(lshare - 0.5), 6), round(ident, 6), tie)
            rr, ww = min(cands, key=cost)
            longer, n = longer + (len(rr["body"]) > len(ww["body"])), n + 1
            chosen_ct[rr["service"]] += 1
            seen_ct[rr["service"]] += 1
            seen_ct[ww["service"]] += 1
            gated.append(pair(queries[qid], rr, ww, ww.get("kind", "wrong")))
        for rr in g["right"].values():
            for ff in list(g["fail"].values())[:1]:
                report.append(pair(queries[qid], rr, ff, "call_failure"))
            break
    return gated, report


def pair(q, rr, ww, kind):
    name, rtype = q["params"]["domain"], q["params"]["record_type"].upper()
    return {"prompt": render(name, rtype), "chosen": rr["body"], "rejected": ww["body"], "kind": kind,
            "format": f"{rr.get('how', '?')}>{ww.get('how', '?')}", "source": f"{q['id']}|{rr['service']}|{ww['service']}",
            "related_party": False, "meta": {"query_id": q["id"], "truth": rr["truth"], "record_type": rtype,
                                              "chosen_service": rr["service"], "rejected_service": ww["service"],
                                              "champion_author": rr["champion_author"] or ww["champion_author"]}}


def identity_probe(gated, labels):
    rate = defaultdict(lambda: [0, 0])  # service -> per-query right/total, for leave-one-query-out
    per_q = defaultdict(list)
    for r in labels:
        if r["label"] in ("right", "wrong"):
            per_q[r["query_id"]].append((r["service"], r["label"] == "right"))
            rate[r["service"]][0] += r["label"] == "right"
            rate[r["service"]][1] += 1
    score = 0.0
    for p in gated:
        own = Counter()
        for s, ok in per_q[p["meta"]["query_id"]]:
            own[(s, "r")] += ok
            own[(s, "n")] += 1
        def rr(s):
            k, n = rate[s][0] - own[(s, "r")], rate[s][1] - own[(s, "n")]
            return k / n if n else 0.5
        a, b = rr(p["meta"]["chosen_service"]), rr(p["meta"]["rejected_service"])
        score += 1.0 if a > b else 0.5 if a == b else 0.0
    return round(score / len(gated), 4) if gated else None


def main():
    ap = argparse.ArgumentParser()
    for k in ("--queries", "--capture", "--truth-before", "--truth-after", "--out-dir"):
        ap.add_argument(k, type=Path, required=True)
    ap.add_argument("--readings", type=Path)
    ap.add_argument("--catalog", type=Path, help="/api/miners JSON, for owner wallets")
    a = ap.parse_args()
    queries = {q["id"]: q for q in json.loads(a.queries.read_text(encoding="utf-8"))}
    truth = load_truth(a.truth_before, a.truth_after)
    readings = {}
    if a.readings and a.readings.exists():
        for line in a.readings.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                readings[(r["query_id"], str(r["miner_id"]))] = r
    owners = {}
    if a.catalog:
        owners = {str(c.get("id")): str(c.get("wallet_address", "")).lower()
                  for c in json.loads(a.catalog.read_text(encoding="utf-8")) if isinstance(c, dict)}
    labels = label_all(queries, a.capture, truth, readings, owners)
    gated, report = pick_pairs(labels, queries)
    out = a.out_dir
    out.mkdir(parents=True, exist_ok=True)
    jl = lambda name, rows: (out / name).write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows),
                                                   encoding="utf-8", newline="\n")
    jl("labels.jsonl", labels)
    jl("to_read.jsonl", [{"query_id": r["query_id"], "miner_id": r["miner_id"], "query": queries[r["query_id"]]["query"],
                          "body": r["body"]} for r in labels if r["label"] == "needs_reading"])
    jl("holdout.jsonl", gated)
    jl("holdout_render2.jsonl", [{**p, "prompt": render(queries[p["meta"]["query_id"]]["params"]["domain"],
                                                         p["meta"]["record_type"], 2)} for p in gated])
    jl("holdout_report.jsonl", report)
    n = len(gated)
    stats = {"labels": dict(Counter(r["label"] for r in labels)), "truth": dict(Counter(t["status"] for t in truth.values())),
             "gated_pairs": n, "report_pairs": len(report),
             "longer_wins": round(sum(len(p["chosen"]) > len(p["rejected"]) for p in gated) / n, 4) if n else None,
             "shorter_wins": round(sum(len(p["chosen"]) < len(p["rejected"]) for p in gated) / n, 4) if n else None,
             "identity_probe": identity_probe(gated, labels),
             "champion_author_pairs": sum(p["meta"]["champion_author"] for p in gated),
             "by_kind": dict(Counter(p["kind"] for p in gated)), "by_format": dict(Counter(p["format"] for p in gated)),
             "chosen_service": dict(Counter(p["meta"]["chosen_service"] for p in gated)),
             "rejected_service": dict(Counter(p["meta"]["rejected_service"] for p in gated)),
             "by_truth": dict(Counter(p["meta"]["truth"] for p in gated))}
    (out / "stats.json").write_text(json.dumps(stats, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(stats, indent=1))


if __name__ == "__main__":
    sys.exit(main())
