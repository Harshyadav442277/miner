"""Generic shared-word absent-name reversals; no external answers enter training.

All correct verdicts are checked against the complete SDN name/alias index. Optional
candidate comparisons use real records and computed token Jaccard, with explicit
scope; they are not invented fuzzy matches or claims of global nearest candidates.
"""
import argparse
import collections
import gzip
import hashlib
import json
from pathlib import Path
import random
import re

from tokenizers import Tokenizer
from binding_benchmark import PROMPT, compatible
from build_pairs import SOURCE, load, norm
from collect_miners import save


def comparison(q, entry):
    variants = [entry["name"], *entry["aliases"]]
    def similarity(name):
        a, b = set(norm(q).split()), set(norm(name).split())
        return len(a & b) / len(a | b)
    name = max(variants, key=similarity)
    return {"entry_id": entry["id"], "primary_name": entry["name"], "compared_name": name,
            "program": entry["prog"], "token_jaccard": round(similarity(name), 6),
            "meaning": "word-set overlap only, not an identity probability or positive alert"}


def answer(q, entry, style, evidence, snapshot, rng):
    candidate = comparison(q, entry)
    scope = "Normalized exact SDN primary-name and alias lookup; not fuzzy or ownership screening."
    if style == "prose":
        out = f"No exact SDN name match for {q}. {scope}"
        if evidence:
            out += (f" For comparison only, public entry {entry['id']} is {entry['name']}, "
                    f"program {entry['prog']}. Its word-set Jaccard overlap with this query is "
                    f"{candidate['token_jaccard']}; this does not establish identity.")
        return out + f" Source: {SOURCE}; snapshot {snapshot}."
    key = rng.choice(("name", "entity", "screened_name"))
    out = {key: q, "matched": False, "matches": []}
    if style != "thin":
        out.update(scope=scope, exact_entry_ids=[], source=SOURCE, snapshot_sha256=snapshot)
    if evidence:
        out["comparison_only"] = candidate
        out["comparison_scope"] = "One public source record; not a global nearest-candidate search"
    return json.dumps(out, ensure_ascii=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--exclude-queries", type=Path, nargs="+", required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--archive", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    a.archive.mkdir(parents=True, exist_ok=False)
    rng = random.Random(520261102)
    sdn, alt = [a.home / f"data/sanctions/{name}.csv" for name in ("sdn", "alt")]
    entities = {e["id"]: e for e in load(str(sdn), str(alt))}
    listed = {norm(n) for e in entities.values() for n in [e["name"], *e["aliases"]]}
    excluded = {norm(q["name"]) for p in a.exclude_queries for q in json.loads(p.read_text(encoding="utf-8"))}
    snapshot = hashlib.sha256(sdn.read_bytes()).hexdigest()
    full, tok = [Tokenizer.from_file(str(a.home / "foundation/tokenizer.json")) for _ in range(2)]
    tok.enable_truncation(max_length=256)
    used = set(excluded)
    reports = {}
    templates = ("Bank of {}", "{} Trust Bank", "{} International Bank", "Central Bank of {}",
                 "{} Commercial Bank Limited", "International {} Holdings", "{} Investment Company")
    for split, hard_count, retained_count in (("train", 1600, 800), ("val", 200, 200), ("test", 200, 200)):
        prior = [json.loads(l) for l in (a.home / f"pairs/sanctions_v7_binding/{split}.jsonl").read_text(encoding="utf-8").splitlines()]
        ids = {r[k] for r in prior for k in ("sdn_entity_id", "other_entity_id")}
        part = [entities[i] for i in sorted(ids)]
        tokens = collections.defaultdict(list)
        for entry in part:
            for word in set(re.findall(r"[A-Za-z]{4,14}", entry["name"])):
                tokens[word.title()].append(entry)
        words = sorted(tokens)
        rows, attempts = [], 0
        while len(rows) < hard_count:
            attempts += 1
            if attempts > hard_count * 100:
                raise ValueError("insufficient disjoint, invariant hard reversals")
            template = rng.choice(templates)
            w1, w2 = rng.sample(words, 2)
            q1, q2 = template.format(w1), template.format(w2)
            if any(norm(q) in listed or norm(q) in used for q in (q1, q2)):
                continue
            e1, e2 = rng.choice(tokens[w1]), rng.choice(tokens[w2])
            # Independent styles and evidence presence, then reversed labels: neither predicts the winner.
            texts = [answer(q, e, rng.choice(("thin", "schema", "prose")), rng.choice((True, False)), snapshot, rng)
                     for q, e in ((q1, e1), (q2, e2))]
            if not compatible(tok, full, {"name": q1, "answer": texts[0]}, {"name": q2, "answer": texts[1]}):
                continue
            block = f"{split}-shared-word-{len(rows)//2}"
            for i, (q, e, other) in enumerate(((q1, e1, e2), (q2, e2, e1))):
                rows.append({"prompt": PROMPT.format(q=q), "chosen": texts[i], "rejected": texts[1-i],
                             "query_name": q, "listed": False, "label_kind": "preference_pair",
                             "kind": "wrong_query:shared_words_absent", "format": "generic_computed_evidence",
                             "sdn_entity_id": e["id"], "other_entity_id": other["id"], "block_id": block,
                             "provenance": {"source_url": SOURCE, "source_kind": "public_source_synthetic_answers"}})
            used.update((norm(q1), norm(q2)))
        groups = collections.defaultdict(list)
        for row in prior:
            groups[row["block_id"]].append(row)
        invalid_groups = [key for key, group in groups.items()
                          if any(r["listed"] != (norm(r["query_name"]) in listed) for r in group)]
        for key in invalid_groups:
            del groups[key]
        retained = []
        for kind, quota in (("wrong_query:listed", retained_count//2),
                            ("wrong_query:absent", retained_count//4), ("verdict_flip", retained_count//4)):
            candidates = [g for g in groups.values() if g[0]["kind"] == kind]
            rng.shuffle(candidates)
            chosen = []
            for group in candidates:
                if any(norm(r["query_name"]) in used for r in group) or len(chosen)+len(group) > quota:
                    continue
                chosen.extend(group)
                used.update(norm(r["query_name"]) for r in group)
                if len(chosen) == quota:
                    break
            assert len(chosen) == quota, (split, kind, len(chosen), quota)
            retained.extend(chosen)
        rows.extend(retained)
        rng.shuffle(rows)
        file = a.out / f"{split}.jsonl"
        raw = "".join(json.dumps(r, ensure_ascii=False)+"\n" for r in rows).encode()
        file.write_bytes(raw)
        (a.archive / (file.name+".gz")).write_bytes(gzip.compress(raw, mtime=0))
        reports[split] = {"pairs": len(rows), "blocks": len({r["block_id"] for r in rows}),
                          "excluded_parent_blocks_with_invalid_exact_name": invalid_groups,
                          "kinds": dict(collections.Counter(r["kind"] for r in rows)),
                          "sha256": hashlib.sha256(raw).hexdigest()}
    report = {"seed": 520261102, "splits": reports, "sdn_sha256": snapshot,
              "alt_sha256": hashlib.sha256(alt.read_bytes()).hexdigest(),
              "excluded_query_files": [str(p) for p in a.exclude_queries],
              "scope": "Generic overlapping-name query binding; comparison evidence is computed, no external answers"}
    for out in (a.out, a.archive):
        save(out / "manifest.json", report)
    print(json.dumps(report))


if __name__ == "__main__":
    main()
