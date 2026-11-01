"""Fetch settled events with known outcomes from Wikidata (CC0) for EVENT_OUTCOME_RESOLUTION.

Two record kinds, one JSON object per line in --out:
  contest   an event with a winner (P1346) and a date (P585), e.g. a final or a match
  election  an election with its winner (P991) and every listed candidate (P726)

Only items with at least --min-sitelinks Wikipedia articles are kept, so each fact is
documented in several places and a reviewer can check it. Each record carries its
Wikidata URL, which becomes the row's provenance.

    python fetch_wikidata.py --out C:/Users/hyada/tg-eval/data/event_outcome/raw.jsonl
"""
import argparse
import json
import time
import urllib.parse
import urllib.request

ENDPOINT = "https://query.wikidata.org/sparql"
UA = "telegraph-evaluator-research/0.1 (harsh.2024a@vitstudent.ac.in)"

CONTESTS = """
SELECT ?item ?il ?winner ?wl ?date ?sl WHERE {
  ?item wdt:P1346 ?winner; wdt:P585 ?date; wikibase:sitelinks ?sl.
  FILTER(?sl >= %(min)d)
  FILTER(?date >= "%(y)d-01-01T00:00:00Z"^^xsd:dateTime && ?date < "%(y1)d-01-01T00:00:00Z"^^xsd:dateTime)
  ?item rdfs:label ?il FILTER(lang(?il) = "en")
  ?winner rdfs:label ?wl FILTER(lang(?wl) = "en")
}"""

ELECTIONS = """
SELECT ?item ?il ?winner ?wl ?cand ?cl ?date ?sl WHERE {
  ?item wdt:P991 ?winner; wdt:P726 ?cand; wdt:P585 ?date; wikibase:sitelinks ?sl.
  FILTER(?sl >= %(min)d)
  FILTER(?date >= "%(y)d-01-01T00:00:00Z"^^xsd:dateTime && ?date < "%(y1)d-01-01T00:00:00Z"^^xsd:dateTime)
  ?item rdfs:label ?il FILTER(lang(?il) = "en")
  ?winner rdfs:label ?wl FILTER(lang(?wl) = "en")
  ?cand rdfs:label ?cl FILTER(lang(?cl) = "en")
}"""


def query(sparql):
    url = ENDPOINT + "?" + urllib.parse.urlencode({"query": sparql})
    req = urllib.request.Request(url, headers={"Accept": "application/sparql-results+json", "User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                # strict=False: some labels carry raw control characters
                return json.loads(r.read(), strict=False)["results"]["bindings"]
        except Exception as e:  # 429/504 from the public endpoint: back off and retry
            print("retry", attempt, e)
            time.sleep(20 * (attempt + 1))
    return []


def qid(uri):
    return uri.rsplit("/", 1)[-1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--from-year", type=int, default=1990)
    ap.add_argument("--to-year", type=int, default=2025)
    ap.add_argument("--min-sitelinks", type=int, default=3)
    a = ap.parse_args()

    contests, elections = {}, {}
    for y in range(a.from_year, a.to_year + 1):
        params = {"min": a.min_sitelinks, "y": y, "y1": y + 1}
        for b in query(CONTESTS % params):
            rec = contests.setdefault(qid(b["item"]["value"]), {
                "kind": "contest", "id": qid(b["item"]["value"]), "event": b["il"]["value"],
                "date": b["date"]["value"][:10], "sitelinks": int(b["sl"]["value"]), "winners": []})
            if b["wl"]["value"] not in rec["winners"]:
                rec["winners"].append(b["wl"]["value"])
        for b in query(ELECTIONS % params):
            rec = elections.setdefault(qid(b["item"]["value"]), {
                "kind": "election", "id": qid(b["item"]["value"]), "event": b["il"]["value"],
                "date": b["date"]["value"][:10], "sitelinks": int(b["sl"]["value"]),
                "winners": [], "candidates": []})
            for key, label in (("winners", b["wl"]["value"]), ("candidates", b["cl"]["value"])):
                if label not in rec[key]:
                    rec[key].append(label)
        print(y, "contests", len(contests), "elections", len(elections), flush=True)

    with open(a.out, "w", encoding="utf-8") as f:
        for rec in list(contests.values()) + list(elections.values()):
            rec["source_url"] = f"https://www.wikidata.org/wiki/{rec['id']}"
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
