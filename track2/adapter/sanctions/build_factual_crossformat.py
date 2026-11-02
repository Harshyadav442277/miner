"""Source-derived cross-format factual negatives; no captured answers or pool data."""
import argparse
import collections
import gzip
import hashlib
import json
from pathlib import Path
import random

from build_pairs import load, norm, unlisted_names, SOURCE
from build_query_binding import answer, FORMATS, PROMPT
from collect_miners import save
from factual_formats import varied_answer


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--exclude-queries", type=Path, nargs="+", required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--archive", type=Path, required=True)
    ap.add_argument("--alias-fraction", type=float, default=0)
    ap.add_argument("--vary-claims", action="store_true")
    ap.add_argument("--seed", type=int, default=620261102)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    a.archive.mkdir(parents=True, exist_ok=False)
    rng = random.Random(a.seed)
    render_answer = varied_answer if a.vary_claims else answer
    sdn, alt = [a.home / f"data/sanctions/{n}.csv" for n in ("sdn", "alt")]
    entries = {e["id"]: e for e in load(str(sdn), str(alt))}
    index = {norm(n) for e in entries.values() for n in [e["name"], *e["aliases"]]}
    excluded = {norm(q["name"]) for f in a.exclude_queries for q in json.loads(f.read_text(encoding="utf-8"))}
    excluded_ids = {i for f in a.exclude_queries for q in json.loads(f.read_text(encoding="utf-8")) for i in q["sdn_ids"]}
    snapshot = hashlib.sha256(sdn.read_bytes()).hexdigest()
    used, report = set(excluded), {}
    for split, facts, retention in (("train", 1800, 600), ("val", 300, 100), ("test", 300, 100)):
        parent = [json.loads(l) for l in (a.home / f"pairs/sanctions_v8_hard_binding_r2/{split}.jsonl").read_text(encoding="utf-8").splitlines()]
        original = [json.loads(l) for l in (a.home / f"pairs/sanctions_v6_pilot_r1/{split}.jsonl").read_text(encoding="utf-8").splitlines()]
        ids = {r[k] for r in original for k in ("sdn_entity_id", "other_entity_id")}
        assert not ids & excluded_ids
        part = [entries[i] for i in sorted(ids)]
        # Reserve binding queries first; entity partitions are inherited, never merged.
        blocks = collections.defaultdict(list)
        for r in parent:
            if r["kind"].startswith("wrong_query"):
                blocks[r["block_id"]].append(r)
        groups = list(blocks.values())
        rng.shuffle(groups)
        kept = []
        # Keep whole reversals with listed, absent and shared-word coverage.
        absent_quota = retention//4//2*2
        for kind, quota in (("wrong_query:listed", retention//2),
                            ("wrong_query:absent", absent_quota),
                            ("wrong_query:shared_words_absent", retention-retention//2-absent_quota)):
            total = 0
            for group in groups:
                if group[0]["kind"] != kind or total+len(group) > quota:
                    continue
                if any(norm(r["query_name"]) in used for r in group):
                    continue
                kept.extend(group)
                used.update(norm(r["query_name"]) for r in group)
                total += len(group)
                if total == quota:
                    break
            assert total == quota, (split, kind, total, quota)
        rows = []
        positives, shaped = [], []
        for entry in part:
            aliases = [n for n in entry["aliases"] if norm(n) != norm(entry["name"]) and norm(n) not in used]
            q = rng.choice(aliases) if a.alias_fraction and aliases and rng.random() < a.alias_fraction else entry["name"]
            if norm(q) not in used:
                positives.append((q, entry))
            shaped.append({**entry, "name": q})
        negatives = [(q, rng.choice(part)) for q, _ in unlisted_names(shaped if a.alias_fraction else part, index, rng, len(part)*3) if norm(q) not in used]
        for hit, candidates in ((True, positives), (False, negatives)):
            rng.shuffle(candidates)
            count = 0
            for q, entry in candidates:
                if norm(q) in used:
                    continue
                good_fmt, bad_fmt = rng.choice(FORMATS), rng.choice(FORMATS)
                chosen = render_answer(q, hit, entry, good_fmt, rng, snapshot)
                rejected = render_answer(q, not hit, entry, bad_fmt, rng, snapshot)
                rows.append({"prompt": PROMPT.format(q=q), "chosen": chosen, "rejected": rejected,
                             "query_name": q, "listed": hit, "kind": "factual_crossformat",
                             "label_kind": "preference_pair", "format": good_fmt+"/"+bad_fmt,
                             "sdn_entity_id": entry["id"], "other_entity_id": entry["id"],
                             "block_id": f"{split}-crossfact-{len(rows)}",
                             "provenance": {"source_url": SOURCE, "source_kind": "public_source_synthetic_answers"}})
                assert (norm(q) in index) == hit
                used.add(norm(q))
                count += 1
                if count == facts//2:
                    break
            assert count == facts//2
        rows.extend(kept)
        rng.shuffle(rows)
        raw = "".join(json.dumps(r, ensure_ascii=False)+"\n" for r in rows).encode()
        (a.out / f"{split}.jsonl").write_bytes(raw)
        (a.archive / f"{split}.jsonl.gz").write_bytes(gzip.compress(raw, mtime=0))
        report[split] = {"pairs": len(rows), "factual_pairs": facts, "binding_pairs": retention,
                         "listed_factual": facts//2, "absent_factual": facts//2,
                         "sha256": hashlib.sha256(raw).hexdigest(),
                         "longer_baseline_tie_aware": sum((len(r["chosen"]) > len(r["rejected"]))+.5*(len(r["chosen"]) == len(r["rejected"])) for r in rows)/len(rows)}
    manifest = {"seed": a.seed, "alias_fraction": a.alias_fraction, "vary_claims": a.vary_claims,
                "splits": report, "sdn_sha256": snapshot,
                "alt_sha256": hashlib.sha256(alt.read_bytes()).hexdigest(),
                "excluded_queries": [str(p) for p in a.exclude_queries],
                "scope": "Exact-name cross-format factual fixtures; no external answer or pool training"}
    for out in (a.out, a.archive):
        save(out / "manifest.json", manifest)
    print(json.dumps(manifest))


if __name__ == "__main__":
    main()
