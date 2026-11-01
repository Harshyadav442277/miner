"""Build EVENT_OUTCOME_RESOLUTION preference pairs from fetch_wikidata.py records.

A pair is one question about a settled event, a correct resolution (chosen) and a worse
one (rejected). The worse answer is one of:
  wrong_winner   names another participant
  flipped        a YES/NO market resolved the wrong way
  unresolved     says a settled event cannot be resolved
  prediction     predicts the outcome instead of resolving it
  wrong_event    resolves a different event of the same series
  contradiction  a YES verdict that names someone else as the winner
Both answers of a pair are rendered the same way, as prose from one template or as the
intent's response JSON (outcome, resolved_yes, winner, resolved_at, sources), so wording,
format and length carry no signal (ARCHITECTURE A3). The split is by event series: val and
test hold only series the model never saw. Rows carry the Wikidata URL as provenance.

    python build_pairs.py --raw raw.jsonl --out-dir C:/Users/hyada/tg-eval/pairs/event_outcome_v1
"""
import argparse
import collections
import json
import os
import random
import re

Q_WHO = [
    "Who won the {event}?",
    "Resolve this market: who won the {event}?",
    "What was the outcome of the {event}? I need it to settle a contract.",
    'Settle this prediction market: "Who will win the {event}?" What is the final result?',
    "Our conditional contract pays out on the winner of the {event}. Who won?",
    "Resolve against the official result: the winner of the {event}.",
    "Who came out on top in the {event} ({date})? Resolve the market.",
    "Event resolution needed: {event}. Who won?",
]
Q_YESNO = [
    "Did {cand} win the {event}? Resolve this market.",
    'Market: "Will {cand} win the {event}?" Resolve YES or NO.',
    "Settle this contract condition: {cand} wins the {event}. Was it met?",
    "Resolve: did {cand} win the {event} ({date})?",
    "Prediction market on the {event}: does the '{cand} wins' contract resolve YES?",
]
PROSE = {
    "who": [
        "{w} won the {event}.",
        "Resolved: {w}. {w} won the {event}, held on {date}.",
        "The winner of the {event} was {w}.",
        "Outcome: {w} won. The event took place on {date} and the result is final.",
        "{w} won the {event} ({date}). The market resolves to {w}.",
        "Final result: {w}. This is the settled outcome of the {event}.",
        "According to the official result, {w} won the {event} on {date}.",
        "The {event} was won by {w}; resolve the market to {w}.",
    ],
    "yes": [
        "YES. {cand} won the {event}.",
        "Resolves YES: {cand} won the {event} on {date}.",
        "The condition was met. {cand} won the {event}, so the market settles YES.",
        "YES. The official result of the {event} ({date}) has {cand} as the winner.",
    ],
    "no": [
        "NO. {cand} did not win the {event}; {w} did.",
        "Resolves NO: {w} won the {event} on {date}, not {cand}.",
        "The condition was not met. {w} won the {event}, so the market settles NO.",
        "NO. The official result of the {event} ({date}) has {w} as the winner, not {cand}.",
    ],
    "contradict": [
        "YES. {cand} did not win the {event}; {w} did.",
        "Resolves YES: {w} won the {event} on {date}, not {cand}.",
        "The condition was met. {w} won the {event}, so the market settles YES.",
        "YES. The official result of the {event} ({date}) has {w} as the winner, not {cand}.",
    ],
    "unresolved": [
        "The {event} has not been decided yet, so this market cannot be resolved.",
        "There is not enough information to determine who won the {event}.",
        "Unresolved: no official result for the {event} is available at this time.",
        "I cannot resolve this. The outcome of the {event} ({date}) is still pending.",
        "The {event} result is not final; the market should stay open for now.",
        "No winner has been declared for the {event}, so it cannot be settled.",
    ],
    "prediction": [
        "{w} is the favourite and will probably win the {event}.",
        "Based on recent form, {w} is likely to win the {event}.",
        "I expect {w} to take the {event}; the odds favour them.",
        "My prediction for the {event} ({date}) is a win for {w}.",
        "{w} looks strongest going into the {event} and should win it.",
        "Most forecasts give {w} the edge in the {event}.",
    ],
}
STYLE_SHARE = 0.12
_YEAR = re.compile(r"\b(1[89]|20)\d\d(\s*[–-]\s*\d{2,4})?\b")
_NUM = re.compile(r"\d+")


def series_key(event):
    """'2018 Tour of Iran, stage 3' -> 'tour of iran, stage': editions share a key."""
    return re.sub(r"\s+", " ", _NUM.sub("", _YEAR.sub("", event))).strip(" ,–-").lower()


def match_sides(event):
    """'Phoenix Suns at Golden State Warriors, 12 February 2018' -> both teams."""
    m = re.match(r"^(.+?) (?:at|vs\.?|v) (.+?)(?:, .*)?$", event)
    return [m.group(1).strip(), m.group(2).strip()] if m else []


def distractors(rec, by_series):
    winners = set(rec["winners"])
    if rec["kind"] == "election":
        pool = rec.get("candidates", [])
    else:
        pool = match_sides(rec["event"]) or [w for r in by_series[series_key(rec["event"])] for w in r["winners"]]
    return sorted({d for d in pool if d not in winners and d.lower() not in rec["event"].lower()})


def render(side, fmt, t_index, source_url):
    """side: {"say": who|yes|no|unresolved|prediction, "event", "date", "w", "cand"}."""
    if fmt == "prose":
        ts = PROSE[side["say"]]
        return ts[t_index % len(ts)].format(**side)
    say = side["say"]
    obj = {"event": side["event"],
           "outcome": {"who": "yes", "yes": "yes", "no": "no", "contradict": "yes"}.get(say, "unresolved"),
           "resolved_yes": say in ("who", "yes", "contradict")}
    if say in ("who", "yes", "no", "contradict"):
        obj["winner"] = side["cand"] if say == "yes" else side["w"]
        obj["resolved_at"] = side["date"]
    elif say == "prediction":
        obj["winner"], obj["resolved_at"] = side["w"], None
    else:
        obj["winner"], obj["resolved_at"] = None, None
    obj["sources"] = [source_url]
    return json.dumps(obj, ensure_ascii=False)


def show_date(d):
    """Wikidata stores year-precision dates as YYYY-01-01; claim only the year then."""
    return d[:4] if d.endswith("-01-01") else d


def make_pair(rec, by_series, rng):
    w = rec["winners"][0]
    base = {"event": rec["event"], "date": show_date(rec["date"]), "w": w, "cand": w}
    wrong = distractors(rec, by_series)
    siblings = [r for r in by_series[series_key(rec["event"])] if r["id"] != rec["id"]]
    # Same-style negatives carry no surface tell; unresolved and prediction answers have their own
    # vocabulary, so they stay a small share or a word-count probe learns them (dataset gate, 65%).
    kinds = ["wrong_winner"] * 3 * bool(wrong) + ["flipped"] * 4 * bool(wrong) \
        + ["wrong_event"] * 2 * bool(siblings) + ["contradiction"] * bool(wrong)
    if not kinds:
        if rng.random() > STYLE_SHARE:
            return None
        kinds = ["unresolved", "prediction"]
    elif rng.random() < STYLE_SHARE:
        kinds = ["unresolved", "prediction"]
    kind = rng.choice(kinds)
    if kind == "contradiction":
        cand = rng.choice(wrong)
        q = rng.choice(Q_YESNO).format(**{**base, "cand": cand})
        return kind, q, {**base, "say": "no", "cand": cand}, {**base, "say": "contradict", "cand": cand}
    if kind == "flipped":
        cand = rng.choice([w, rng.choice(wrong)])
        q = rng.choice(Q_YESNO).format(**{**base, "cand": cand})
        if cand == w:
            good = {**base, "say": "yes", "cand": cand}
            bad = {**base, "say": "no", "cand": cand, "w": rng.choice(wrong)}
        else:
            good = {**base, "say": "no", "cand": cand}
            bad = {**base, "say": "yes", "cand": cand}
        return kind, q, good, bad
    q = rng.choice(Q_WHO).format(**base)
    good = {**base, "say": "who"}
    if kind == "wrong_winner":
        alt = rng.choice(wrong)
        bad = {**base, "say": "who", "w": alt, "cand": alt}
    elif kind == "wrong_event":
        s = rng.choice(siblings)
        bad = {"say": "who", "event": s["event"], "date": show_date(s["date"]), "w": s["winners"][0], "cand": s["winners"][0]}
    elif kind == "unresolved":
        bad = {**base, "say": "unresolved"}
    else:
        bad = {**base, "say": "prediction", "w": rng.choice(wrong or [w])}
    return kind, q, good, bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--json-frac", type=float, default=0.4, help="share of pairs rendered as response JSON")
    ap.add_argument("--val-frac", type=float, default=0.1)
    ap.add_argument("--test-frac", type=float, default=0.1)
    a = ap.parse_args()
    rng = random.Random(a.seed)

    recs = [json.loads(line) for line in open(a.raw, encoding="utf-8")]
    recs = [r for r in recs if r["winners"] and len(r["winners"]) <= 2 and len(r["event"]) <= 160]
    by_series = collections.defaultdict(list)
    for r in recs:
        by_series[series_key(r["event"])].append(r)
    keys = sorted(by_series)
    rng.shuffle(keys)
    n_val, n_test = int(len(keys) * a.val_frac), int(len(keys) * a.test_frac)
    split_of = {k: "val" if i < n_val else "test" if i < n_val + n_test else "train" for i, k in enumerate(keys)}

    os.makedirs(a.out_dir, exist_ok=True)
    files = {s: open(os.path.join(a.out_dir, f"{s}.jsonl"), "w", encoding="utf-8") for s in ("train", "val", "test")}
    stats = collections.Counter()
    for r in recs:
        pair = make_pair(r, by_series, rng)
        if pair is None:
            continue
        kind, q, good, bad = pair
        fmt = "json" if rng.random() < a.json_frac else "prose"
        t = rng.randrange(1000)
        chosen, rejected = render(good, fmt, t, r["source_url"]), render(bad, fmt, t, r["source_url"])
        if chosen == rejected:
            continue
        split = split_of[series_key(r["event"])]
        row = {"prompt": q, "chosen": chosen, "rejected": rejected, "label_kind": "preference_pair",
               "kind": kind, "format": fmt, "provenance": {"source_kind": "dataset", "source_url": r["source_url"]}}
        files[split].write(json.dumps(row, ensure_ascii=False) + "\n")
        stats[split] += 1
        stats[f"{split}:{kind}"] += 1
    for f in files.values():
        f.close()
    json.dump(dict(sorted(stats.items())), open(os.path.join(a.out_dir, "stats.json"), "w"), indent=1)
    print(json.dumps(dict(sorted(stats.items()))))


if __name__ == "__main__":
    main()
