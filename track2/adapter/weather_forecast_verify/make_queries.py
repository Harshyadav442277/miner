"""Draw the frozen holdout query set and its ground truth. Run once, before any miner answer for these queries exists.

    python -I make_queries.py --out holdout/queries.json --truth holdout/truth.json

Seeded (SEED). Each place gets up to PER_PLACE dates from 2019-01-01 to 2026-09-30 (GHCN has had at least six weeks
to settle). A query is kept only when ground truth exists: a GHCN-Daily station within 25 km with an unflagged TMAX
on the date, and an ERA5 value within TOLERANCE_PRE of it (so the label rule can name a right answer). No miner answer
is read here. Ambiguous bare names keep every candidate place; a query is kept if any candidate has such a truth.
"""
import argparse
import datetime as dt
import json
import random
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import places  # noqa: E402
import wx_truth as wt  # noqa: E402

SEED = 20261116
PER_PLACE = 3
TRIES = 10
TOLERANCE_PRE = 3.0
FIRST, LAST = dt.date(2019, 1, 1), dt.date(2026, 9, 30)


def random_date(rng):
    while True:
        y, m = rng.randint(FIRST.year, LAST.year), rng.randint(1, 12)
        d = dt.date(y, m, 1) + dt.timedelta(days=rng.randint(0, 27))
        if FIRST <= d <= LAST:
            return d.isoformat()


def candidate_truth(stations, era, cand, date):
    g, e = wt.ghcn_truth(stations, cand, date), wt.era5_truth(era, cand, date)
    ok = g is not None and e is not None and abs(g["temp_max_c"] - e) <= TOLERANCE_PRE
    return {"candidate": cand, "ghcn": g, "era5": e, "consistent": ok}


def one_place(spec, stations, geo, era):
    """Everything for one place; its dates come from a per-place seed so the result is order-independent."""
    group, name, admin1, cc, bare = spec
    tag = f"{name}|{admin1}|{cc}"
    cands = wt.geocode(geo, name, admin1, cc, bare=bare)
    if not cands or (bare and len(cands) < 2):
        return [], [{"place": tag, "reason": "geocoder: no match" if not cands else "one candidate"}]
    rng = random.Random(f"{SEED}|{tag}")
    shown = cands[0]["name"] if bare else ", ".join(
        dict.fromkeys(x for x in (cands[0]["name"], cands[0]["admin1"], cands[0]["country"]) if x))
    found, seen = [], set()
    for _ in range(TRIES):
        if len(found) >= PER_PLACE:
            break
        date = random_date(rng)
        if date in seen:
            continue
        seen.add(date)
        rows = [candidate_truth(stations, era, c, date) for c in (cands if bare else cands[:1])]
        if any(r["consistent"] for r in rows):
            found.append((date, shown, group, bare, rows))
    return found, ([] if found else [{"place": tag, "reason": "no date with consistent truth"}])


def build():
    stations, geo, era = wt.Stations(), wt.Cache("geocode.json"), wt.Cache("era5.json")
    specs = [(g, n, a, c, False) for g, n, a, c in places.all_places()]
    specs += [("ambiguous", n, "", "", True) for n in places.HOLDOUT_AMBIGUOUS]
    def work(s):
        r = one_place(s, stations, geo, era)
        print(f"{s[1]}|{s[2]}|{s[3]}: {len(r[0])} dates", file=sys.stderr, flush=True)
        return r

    with ThreadPoolExecutor(24) as pool:
        results = list(pool.map(work, specs))
    geo.save(), era.save()
    queries, truths, skipped = [], {}, []
    for found, skip in results:
        skipped += skip
        for date, shown, group, bare, rows in found:
            qid = f"w{len(queries) + 1:04d}"
            queries.append({"id": qid, "query": f"What was the high temperature in {shown} on {date}?",
                            "params": {"location": shown, "date": date}})
            truths[qid] = {"group": group, "ambiguous": bare, "date": date, "location": shown, "candidates": rows}
    return queries, truths, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--truth", type=Path, required=True)
    a = ap.parse_args()
    if a.out.exists() or a.truth.exists():
        sys.exit("REFUSED: outputs exist; the query set is immutable once drawn")
    queries, truths, skipped = build()
    a.out.write_text(json.dumps(queries, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    a.truth.write_text(json.dumps({"seed": SEED, "tolerance_pre": TOLERANCE_PRE, "skipped": skipped, "truth": truths},
                                  indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(len(queries), "queries;", len(skipped), "places skipped")


if __name__ == "__main__":
    main()
