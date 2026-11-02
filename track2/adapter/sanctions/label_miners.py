"""Replay conservative decision-only labels and cross-miner pairs from frozen public captures.

Positive: an exact SDN primary/alias name; negative: absence from that exact-name index.
This is not identity resolution or legal clearance. Other-list/fuzzy positive alerts on
negative names are abstentions, not false positives. Every full response is kept verbatim.
"""
import argparse
import collections
import csv
import gzip
import hashlib
import itertools
import json
from pathlib import Path

from collect_miners import norm, save


def label(r, q):
    if not r["queryable"]:
        return None, None, "static upstream"
    if r["curl_exit"] or r["status"] != 200:
        return None, None, "HTTP/transport failure"
    try:
        d = json.loads(r["body"])
    except ValueError:
        return None, None, "not JSON"
    if not isinstance(d, dict):
        return None, None, "not an answer object"
    if d.get("status") not in (None, "ok", "success") or d.get("error"):
        return None, None, "upstream/error status"
    echoed = [d[k] for k in ("name", "entity", "subject", "query") if isinstance(d.get(k), str)]
    if not any(norm(s) == norm(q["name"]) for s in echoed):
        return None, None, "no matching name echo"
    # General response semantics, not provider identity. Do not extract a claim from prose by eye.
    claims = []
    for k in ("matched", "match", "on_list", "sanctioned"):
        if k in d and type(d[k]) in (bool, int) and d[k] in (0, 1):
            claims.append(bool(d[k]))
    verdict = d.get("verdict")
    verdict = verdict.lower() if isinstance(verdict, str) else ""
    if verdict in ("match", "no_match"):
        claims.append(verdict == "match")
    if not claims or len(set(claims)) != 1:
        return None, None, "missing/contradictory machine verdict"
    claim = claims[0]
    scope = json.dumps({k: d.get(k) for k in ("source", "sources", "lists", "lists_checked")}).lower()
    if "ofac" not in scope or "sdn" not in scope:
        return None, claim, "no explicit OFAC SDN scope"
    if claim and not q["expected"]:
        return None, claim, "positive may be fuzzy or from another list"
    if claim:
        matches = d.get("matches", [])
        ids = {str(m.get(k)) for m in matches if isinstance(m, dict)
               for k in ("id", "entry_id", "ent_num")}
        if ids and not set(q["sdn_ids"]) & ids:
            return None, claim, "positive lacks a verified SDN entry id"
    return claim == q["expected"], claim, "exact-name SDN decision only"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    ap.add_argument("--exact-removals", action="store_true", help="opt-in source-verified literal-membership rule; historical labels unchanged")
    a = ap.parse_args()
    p = a.capture
    queries = json.loads((p / "queries.json").read_text(encoding="utf-8"))
    index, active_ids = collections.defaultdict(set), set()
    for filename, name_col in (("sdn.csv.gz", 1), ("alt.csv.gz", 3)):
        raw = gzip.decompress((p / filename).read_bytes())
        manifest = json.loads((p / "source-manifest.json").read_text())
        assert hashlib.sha256(raw).hexdigest() == manifest[filename[:-3]]["sha256"]
        for row in csv.reader(raw.decode("latin-1").splitlines()):
            if len(row) > name_col and row[0].isdigit():
                index[norm(row[name_col])].add(row[0])
                if filename == "sdn.csv.gz":
                    active_ids.add(row[0])
    for q in queries:
        assert q["expected"] == bool(index[norm(q["name"])])
        assert set(q["sdn_ids"]) == index[norm(q["name"])]
    if a.exact_removals:
        from removal_labels import verify_proofs, label_removed
        verify_proofs(p, queries, index)
    by_name = collections.defaultdict(list)
    counts = collections.defaultdict(collections.Counter)
    labels = []
    for f in sorted(p.glob("responses-*.json")):
        for i, r in enumerate(json.loads(f.read_text(encoding="utf-8"))):
            q = next(q for q in queries if q["name"] == r["name"])
            ok, claim, reason = label(r, q)
            if a.exact_removals:
                ok, claim, reason = label_removed(r, q, (ok, claim, reason), active_ids)
            key = "abstain" if ok is None else "correct" if ok else "incorrect"
            counts[r["miner_id"]][key] += 1
            item = {"capture": f.name, "row": i, "miner_id": r["miner_id"], "name": r["name"],
                    "expected": q["expected"], "claim": claim, "decision_label": key, "reason": reason}
            labels.append(item)
            if ok is not None:
                by_name[r["name"]].append({**item, "answer": r["body"], "ok": ok})
    pairs, agreement = [], collections.defaultdict(collections.Counter)
    for name, records in by_name.items():
        for left, right in itertools.combinations(records, 2):
            key = "/".join(sorted((left["miner_id"], right["miner_id"])))
            agreement[key]["compared"] += 1
            agreement[key]["agree"] += left["claim"] == right["claim"]
            if left["ok"] == right["ok"]:
                continue
            good, bad = (left, right) if left["ok"] else (right, left)
            pairs.append({"prompt": f"Screen {name} against the OFAC SDN list. Report name matches.",
                          "chosen": good["answer"], "rejected": bad["answer"],
                          "kind": "listed" if good["expected"] else "exact_name_absent",
                          "format": "unaltered_miner_json", "name": name,
                          "chosen_capture": [good["capture"], good["row"]],
                          "rejected_capture": [bad["capture"], bad["row"]]})
    (p / "pairs.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in pairs),
                                  encoding="utf-8")
    save(p / "labels.json", labels)
    summary = {"queries": len(queries), "responses": len(labels), "pairs": len(pairs),
               "label_rule": "source-confirmed-removals-v1" if a.exact_removals else "historical-conservative-v1",
               "paired_names": len({r["name"] for r in pairs}),
               "pairs_by_kind": dict(collections.Counter(r["kind"] for r in pairs)),
               "by_miner": {k: dict(v) for k, v in counts.items()},
               "agreement": {k: {**v, "rate": v["agree"] / v["compared"]} for k, v in agreement.items()},
               "longer_answer_baseline": sum(len(r["chosen"]) > len(r["rejected"]) for r in pairs) / len(pairs)
               if pairs else None,
               "limitations": ["Decision labels only, not verification of every response field",
                               "No fuzzy/other-list positive treated as wrong from exact-name absence",
                               "Cross-miner pairs share queries: pair count is not independent sample size",
                               "LiveCert is related-party; no adoption or miner superiority claim",
                               "Engine ids are catalog identities, not registration ids"]}
    save(p / "label-summary.json", summary)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
