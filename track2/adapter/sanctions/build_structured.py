"""v6 pilot: longer public-source answers, balanced shapes, disjoint SDN entities.

No captured miner answer is read. queries.json is used ONLY to exclude measured names
and SDN entity ids. This builder remains synthetic, not independent evaluation evidence.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import random

from build_pairs import SOURCE, display, load, norm, unlisted_names

FORMATS = ("thin", "schema", "evidence_json", "evidence_prose")


def answer(q, hit, entry, fmt, rng):
    name = display(entry["name"], entry["kind"])
    score = round(rng.uniform(.88, 1), 3) if hit else round(rng.uniform(.03, .3), 3)
    record = {"name": name, "id": entry["id"], "program": entry["prog"],
              "list": "OFAC SDN", "score": score,
              "url": f"https://sanctionssearch.ofac.treas.gov/Details.aspx?id={entry['id']}"}
    obj = {"name": q, "matched": hit}
    if fmt == "thin":
        return json.dumps(obj, ensure_ascii=False)
    obj.update(matches=[record] if hit else [], lists=["OFAC SDN"], match_score=score)
    if fmt == "schema":
        return json.dumps(obj, ensure_ascii=False)
    # Evidence length is independent of preference. Public source fields, no provider signature.
    notes = ["A name alert requires review of additional identifiers before any decision.",
             "This check covers the named public list only and does not establish identity.",
             "Ownership rules and unlisted subsidiaries are outside this name-only check.",
             "Names and aliases may be reordered or transliterated; confirm the official record.",
             "The record identifier and program are provided so the underlying entry can be inspected."]
    selected = rng.sample(notes, rng.randint(2, 5))
    if fmt == "evidence_prose":
        verdict = (f"A sanctions name match was found for {q}. The named SDN candidate is {name}, "
                   f"record {entry['id']}, program {entry['prog']}, similarity {score}." if hit else
                   f"No OFAC SDN name match was found for {q}. The closest candidate considered was {name}, "
                   f"record {entry['id']}, program {entry['prog']}, similarity {score}.")
        return verdict + " " + " ".join(selected) + f" Source: {SOURCE}. Record: {record['url']}."
    obj.update(evidence={"candidate": record, "method": "public primary-name and alias screening",
                         "source_url": SOURCE}, limitations=selected)
    return json.dumps(obj, ensure_ascii=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sdn", type=Path, required=True)
    ap.add_argument("--alt", type=Path, required=True)
    ap.add_argument("--exclude-queries", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--seed", type=int, default=620261101)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    rng = random.Random(a.seed)
    entities = load(str(a.sdn), str(a.alt))
    excluded = json.loads(a.exclude_queries.read_text(encoding="utf-8"))
    excluded_ids = {i for q in excluded for i in q["sdn_ids"]}
    excluded_names = {norm(q["name"]) for q in excluded}
    all_names = {norm(n) for e in entities for n in [e["name"], *e["aliases"]]}
    eligible, seen_names = [], set(excluded_names)
    for e in entities:
        entity_names = {norm(n) for n in [e["name"], *e["aliases"]]}
        if e["id"] in excluded_ids or entity_names & seen_names:
            continue
        eligible.append(e)
        seen_names.update(entity_names)
    rng.shuffle(eligible)
    splits = {"train": eligible[:3000], "val": eligible[3000:3400], "test": eligible[3400:3800]}
    ids = {k: {e["id"] for e in part} for k, part in splits.items()}
    assert not (ids["train"] & ids["val"] or ids["train"] & ids["test"] or ids["val"] & ids["test"])
    stats, prior_queries = {}, set()
    for split, part in splits.items():
        negatives = [(q, kind) for q, kind in unlisted_names(part, all_names, rng, len(part) * 2)
                     if norm(q) not in excluded_names][:len(part)]
        rows = []
        queries = [(display(e["name"], e["kind"]), True, e) for e in part]
        queries += [(q, False, rng.choice(part)) for q, _ in negatives]
        for q, hit, entry in queries:
            if norm(q) in prior_queries:
                continue
            prior_queries.add(norm(q))
            good_fmt = rng.choice(FORMATS)
            bad_fmt = good_fmt if rng.random() < .7 else rng.choice(FORMATS)
            how = rng.choices(["flipped", "wrong_entity", "wrong_record"], [0.5, 0.25, 0.25])[0]
            other = rng.choice(part)
            while other["id"] == entry["id"]:
                other = rng.choice(part)
            good = answer(q, hit, entry, good_fmt, rng)
            if how == "flipped":
                bad = answer(q, not hit, entry, bad_fmt, rng)
            elif how == "wrong_entity":
                bad = answer(display(other["name"], other["kind"]), True, other, bad_fmt, rng)
            else:
                # For an absent name or a thin response no record can be wrong: use a factual flip.
                if not hit or bad_fmt == "thin":
                    how = "flipped"
                    bad = answer(q, not hit, entry, bad_fmt, rng)
                else:
                    bad = answer(q, True, other, bad_fmt, rng)
            if good == bad:
                continue
            rows.append({"prompt": f"Screen {q} against the OFAC SDN list. Report name matches.",
                         "chosen": good, "rejected": bad, "label_kind": "preference_pair",
                         "kind": how, "listed": hit, "format": good_fmt + "/" + bad_fmt,
                         "sdn_entity_id": entry["id"], "other_entity_id": other["id"],
                         "provenance": {"source_url": SOURCE, "source_kind": "public_source_synthetic_answers"}})
        rng.shuffle(rows)
        path = a.out / f"{split}.jsonl"
        path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
        stats[split] = {"pairs": len(rows), "entities": len(part),
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                        "by_kind": dict(collections.Counter(r["kind"] for r in rows))}
    manifest = {"seed": a.seed, "splits": stats, "excluded_ids": sorted(excluded_ids),
                "excluded_query_sha256": hashlib.sha256(a.exclude_queries.read_bytes()).hexdigest(),
                "sdn_sha256": hashlib.sha256(a.sdn.read_bytes()).hexdigest(),
                "alt_sha256": hashlib.sha256(a.alt.read_bytes()).hexdigest(),
                "note": "Small exploratory v6 pilot; synthetic templates, not a registration gate"}
    (a.out / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(json.dumps(manifest))


if __name__ == "__main__":
    main()
