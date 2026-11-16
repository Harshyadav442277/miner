"""Label captured miner answers against ground truth and build the gated holdout, mechanically.

    python -I label.py --captures C:/Users/hyada/tg-eval/captures/weather-<date> --truth holdout/truth.json \
        --queries holdout/queries.json --out-dir holdout

The label rule is in holdout/FREEZE_NOTE.md and was written before any answer was read. Values are `temp_max_c`
(the only scored field). No model score is used anywhere. Selection of the one pair per query is a seeded hash.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

RIGHT_BAND, WRONG_BAND = 1.5, 3.0            # degC, from BOTH sources (GHCN station and ERA5)
SEED = "wfv-holdout-v1"
FIELDS = ("location", "date", "temp_max_c", "temp_min_c", "precipitation_mm", "condition")
DEDUPE = {"zk-wxrecord": "station", "zk-wxobs": "station", "chainsight-oracle": "station"}   # one backend (pilot)
OUR_SLUGS = {"livecert"}
CHAMPION_AUTHOR_SLUGS = {"counterproof-weather-verify"}   # wallet 0x8d1a7ca0..., the champion's author


def number(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.strip())
        except ValueError:
            return None
    return None


def parse_answer(response):
    """(status, mapped dict or None). status: ok | transport | non_json | no_value."""
    if response.get("status") != 200 or response.get("error"):
        return "transport", None
    try:
        body = json.loads(response.get("body", ""))
    except ValueError:
        return "non_json", None
    if not isinstance(body, dict):
        return "non_json", None
    mapped = {k: body[k] for k in FIELDS if k in body}
    return ("ok" if number(body.get("temp_max_c")) is not None else "no_value"), mapped


def judge(value, candidates):
    """right | wrong | drop, plus the nearest deviation. Candidates: truth rows with both sources."""
    best = None
    for c in candidates:
        if c["ghcn"] is None or c["era5"] is None:
            continue
        dev = max(abs(value - c["ghcn"]["temp_max_c"]), abs(value - c["era5"]))
        near = min(abs(value - c["ghcn"]["temp_max_c"]), abs(value - c["era5"]))
        best = (dev, near) if best is None or dev < best[0] else best
        if dev <= RIGHT_BAND:
            return "right", dev
    complete = all(c["ghcn"] is not None and c["era5"] is not None for c in candidates)
    if complete and best and best[1] >= WRONG_BAND:
        return "wrong", best[1]
    return "drop", best[1] if best else None


def wrong_kind(value, dev, candidates):
    for c in candidates:
        t = c["ghcn"]["temp_max_c"] if c["ghcn"] else None
        if t is not None and abs(value - (t * 9 / 5 + 32)) <= 1.0 and abs(t) > 5:
            return "unit_fahrenheit"
    if not -90 <= value <= 60:
        return "out_of_range"
    return "near_wrong" if dev < 8 else "far_wrong" if dev < 20 else "gross_wrong"


def render(mapped):
    return json.dumps({k: mapped[k] for k in FIELDS if k in mapped}, ensure_ascii=False)


def pick(qid, role, items):
    return sorted(items, key=lambda x: hashlib.sha256(f"{SEED}|{qid}|{role}|{x['slug']}".encode()).hexdigest())[0]


def run(captures, truth_path, queries_path, out_dir):
    queries = {q["id"]: q for q in json.loads(Path(queries_path).read_text(encoding="utf-8"))}
    truth = json.loads(Path(truth_path).read_text(encoding="utf-8"))["truth"]
    answers = {}
    captures = [captures] if isinstance(captures, (str, Path)) else list(captures)
    cap_name = "+".join(Path(c).name for c in captures)
    for f in sorted(p for c in captures for p in Path(c).glob("miner-*.json")):
        rec = json.loads(f.read_text(encoding="utf-8"))
        for r in rec.get("responses", []):
            status, mapped = parse_answer(r)
            answers.setdefault(r["query_id"], []).append({
                "slug": rec["slug"], "miner_id": rec["miner_id"], "status": status, "mapped": mapped,
                "related_party": rec["related_party"] or rec["slug"] in OUR_SLUGS, "raw": r.get("body", ""),
                "http": r.get("status"), "backend": DEDUPE.get(rec["slug"], rec["slug"])})
    gated, report, strata = [], [], {"queries": len(queries), "no_pair": {}, "answers": {}}
    for qid, q in queries.items():
        cands = truth[qid]["candidates"]
        side = {"right": [], "wrong": []}
        seen_backend = set()
        for a in answers.get(qid, []):
            strata["answers"][a["status"]] = strata["answers"].get(a["status"], 0) + 1
            if a["status"] != "ok":
                report.append({"query_id": qid, "slug": a["slug"], "status": a["status"], "http": a["http"],
                               "mapped": a["mapped"], "body_head": a["raw"][:300]})
                continue
            if a["related_party"] or a["backend"] in seen_backend:
                continue
            seen_backend.add(a["backend"])
            v = number(a["mapped"]["temp_max_c"])
            verdict, dev = judge(v, cands)
            a.update(value=v, verdict=verdict, dev=dev)
            if verdict in side:
                side[verdict].append(a)
        if not (side["right"] and side["wrong"]):
            reason = "no_right" if not side["right"] else "no_wrong"
            strata["no_pair"][reason] = strata["no_pair"].get(reason, 0) + 1
            continue
        ch, rj = pick(qid, "right", side["right"]), pick(qid, "wrong", side["wrong"])
        kind = wrong_kind(rj["value"], rj["dev"], cands)
        gated.append({
            "prompt": q["query"], "chosen": render(ch["mapped"]), "rejected": render(rj["mapped"]),
            "kind": kind, "format": "mapped_fields", "source": f"capture {cap_name} {qid}",
            "related_party": False,
            "meta": {"query_id": qid, "group": truth[qid]["group"], "ambiguous": truth[qid]["ambiguous"],
                     "chosen_service": ch["slug"], "rejected_service": rj["slug"],
                     "chosen_value": ch["value"], "rejected_value": rj["value"],
                     "champion_author_service": bool({ch["slug"], rj["slug"]} & CHAMPION_AUTHOR_SLUGS),
                     "n_right": len(side["right"]), "n_wrong": len(side["wrong"])}})
    out = Path(out_dir)
    (out / "holdout.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in gated), encoding="utf-8", newline="\n")
    (out / "report_only.json").write_text(json.dumps({"strata": strata, "rows": report}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return gated, strata


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--captures", nargs="+", required=True)
    for k in ("truth", "queries", "out-dir"):
        ap.add_argument(f"--{k}", required=True)
    a = ap.parse_args()
    g, s = run(a.captures, a.truth, a.queries, a.out_dir)
    print(len(g), "gated pairs;", json.dumps(s))
