"""Shortcut audit of a labelled WEATHER_FORECAST_VERIFY pair file (holdout or training). Writes <pairs>.audit.json.

    python -I audit_holdout.py holdout/holdout.jsonl

Probes, each leave-one-out so a pair never informs its own prediction; ties count half; the bar is 0.65:
  longer   the longer rendered answer wins;
  service  answer-only: the service (slug) with the higher chosen-rate elsewhere wins;
  shape    answer-only: key set, which fields are null, the condition string and the location echo;
  value    answer-only: the temp_max_c nearer the median of the other pairs' chosen values wins.
Training pairs have no service field; `service` is then skipped. Exit 1 on any probe above the bar.
"""
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

BAR = 0.65


def shape_features(answer):
    try:
        o = json.loads(answer)
    except ValueError:
        return ["unparsed"]
    f = ["keys=" + ",".join(sorted(o)), "nulls=" + ",".join(sorted(k for k, v in o.items() if v is None))]
    if isinstance(o.get("condition"), str):
        f.append("cond=" + o["condition"].lower())
    if isinstance(o.get("location"), str):
        f.append("loc_has_comma=%s" % ("," in o["location"]))
    return f


def loo_probe(rows, feats):
    """feats(row) -> (chosen_features, rejected_features). Smoothed leave-one-out chosen-rate per feature."""
    pos, tot = defaultdict(float), defaultdict(float)
    cached = [feats(r) for r in rows]
    for c, j in cached:
        for f in c:
            pos[f] += 1
            tot[f] += 1
        for f in j:
            tot[f] += 1
    score, n = 0.0, 0
    for (c, j), _ in zip(cached, rows):
        def rate(fs, chosen):
            vals = []
            for f in fs:
                p, t = pos[f] - (1 if chosen else 0), tot[f] - 1
                vals.append((p + 1) / (t + 2))
            return sum(vals) / len(vals) if vals else 0.5
        a, b = rate(c, True), rate(j, False)
        score += 1.0 if a > b else 0.5 if a == b else 0.0
        n += 1
    return round(score / n, 4) if n else None


def main(path):
    rows = [json.loads(l) for l in Path(path).read_text(encoding="utf-8").splitlines() if l.strip()]
    out = {"pairs": len(rows), "bar": BAR, "ties": "count half"}
    longer = sum(1.0 if len(r["chosen"]) > len(r["rejected"]) else 0.5 if len(r["chosen"]) == len(r["rejected"]) else 0.0 for r in rows)
    out["longer"] = round(longer / len(rows), 4)
    out["shape"] = loo_probe(rows, lambda r: (shape_features(r["chosen"]), shape_features(r["rejected"])))
    if all("meta" in r and "chosen_service" in r["meta"] for r in rows):
        out["service"] = loo_probe(rows, lambda r: ([r["meta"]["chosen_service"]], [r["meta"]["rejected_service"]]))
        counts = defaultdict(int)
        for r in rows:
            counts[f"{r['meta']['chosen_service']} > {r['meta']['rejected_service']}"] += 1
        out["service_pairs"] = dict(sorted(counts.items(), key=lambda kv: -kv[1]))
    vals = [json.loads(r["chosen"]).get("temp_max_c") for r in rows]
    ok = 0.0
    for i, r in enumerate(rows):
        med = statistics.median(v for k, v in enumerate(vals) if k != i and isinstance(v, (int, float)))
        a, b = json.loads(r["chosen"]).get("temp_max_c"), json.loads(r["rejected"]).get("temp_max_c")
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            ok += 1.0 if abs(a - med) < abs(b - med) else 0.5 if abs(a - med) == abs(b - med) else 0.0
    out["value"] = round(ok / len(rows), 4)
    kinds = defaultdict(int)
    for r in rows:
        kinds[r["kind"]] += 1
    out["kinds"] = dict(kinds)
    out["problems"] = [f"{k} probe {out[k]} > {BAR}" for k in ("longer", "service", "shape", "value") if out.get(k) and out[k] > BAR]
    out["verdict"] = "PASS" if not out["problems"] else "FAIL"
    Path(path).with_suffix(".audit.json").write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=1))
    return 1 if out["problems"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
