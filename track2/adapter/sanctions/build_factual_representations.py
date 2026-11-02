"""Repeat source facts across answer forms; vary truthful neutral metadata placement."""
import argparse
import collections
import csv
import gzip
import hashlib
import json
from pathlib import Path
import random

from tokenizers import Tokenizer
from audit_claim_visibility import verdict_spans
from binding_benchmark import render
from build_pairs import load, norm
from build_query_binding import answer, FORMATS
from collect_miners import save, snapshot_index
from factual_formats import varied_answer


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--archive", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    a.archive.mkdir(parents=True, exist_ok=False)
    rng = random.Random(1520261102)
    sdn, alt = [a.home / f"data/sanctions/{name}.csv" for name in ("sdn", "alt")]
    entries = {e["id"]: e for e in load(str(sdn), str(alt))}
    _, index = snapshot_index(sdn.read_bytes(), alt.read_bytes())
    snapshot = hashlib.sha256(sdn.read_bytes()).hexdigest()
    with alt.open(encoding="latin-1", newline="") as stream:
        alias_types = collections.Counter(r[2].strip() for r in csv.reader(stream) if len(r) >= 4 and r[0] in entries)
    parent = a.home / "pairs/sanctions_v10_alias_schema"
    parent_manifest = json.loads((parent / "manifest.json").read_text(encoding="utf-8"))
    excluded = [q for f in parent_manifest["excluded_queries"] for q in json.loads(Path(f).read_text(encoding="utf-8"))]
    excluded_names = {norm(q["name"]) for q in excluded}
    excluded_ids = {i for q in excluded for i in q["sdn_ids"]}
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    neutral = {
        "dataset": "US Treasury OFAC Specially Designated Nationals snapshot",
        "source_files": ["SDN.CSV", "ALT.CSV"],
        "primary_records": len(entries), "alias_records": sum(alias_types.values()),
        "alias_type_counts": dict(alias_types),
        "entity_type_counts": dict(collections.Counter(e["kind"] for e in entries.values())),
        "sdn_sha256": snapshot, "alt_sha256": hashlib.sha256(alt.read_bytes()).hexdigest(),
        "source_urls": ["https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/"+name for name in ("SDN.CSV", "ALT.CSV")],
        "matching_rule": "Lowercase ASCII alphanumeric tokens, sorted; exact primary-name and alias lookup only.",
        "identity_scope": "A name overlap alone does not establish identity; additional identifiers require separate review.",
        "absence_scope": "Exact-name absence does not establish all-list, fuzzy, ownership-based or legal clearance.",
        "snapshot_scope": "Results refer to these frozen source bytes; no original publication date is asserted."}

    def make_text(q, hit, entry, fmt, prompt):
        text = varied_answer(q, hit, entry, fmt, rng, snapshot)
        if fmt == "thin":
            return text
        keys = list(neutral)
        rng.shuffle(keys)
        meta = {k: neutral[k] for k in keys[:rng.randint(6, len(keys))]}
        late = bool(rng.randrange(2))
        field = rng.choice(("reference", "context", "provenance"))
        if fmt == "prose":
            # Preserve a complete assertion first; metadata is factual, never an invented candidate.
            build = lambda: text + " Reference information: " + json.dumps(meta, ensure_ascii=False)
        else:
            body = json.loads(text)
            if rng.randrange(3) == 0:
                body[rng.choice(("finding", "summary", "answer"))] = answer(q, hit, entry, "prose", rng, snapshot)
            first, *rest = body.items()
            def build():
                items = [first, (field, meta), *rest] if late else [first, *rest, (field, meta)]
                return json.dumps(dict(items), ensure_ascii=False)
        result = build()
        while len(tok.encode(render(prompt, result)).ids) > 512:
            if meta:
                meta.pop(next(reversed(meta)))
            elif fmt != "prose" and any(k in body for k in ("finding", "summary", "answer")):
                for k in ("finding", "summary", "answer"):
                    body.pop(k, None)
                first, *rest = body.items()
            else:
                raise ValueError("base factual assertion exceeds512 tokens")
            result = build()
        return result

    reports, all_names, all_ids = {}, {}, {}
    for split, query_count in (("train", 600), ("val", 100), ("test", 100)):
        raw_parent = (parent / f"{split}.jsonl").read_bytes()
        original = [json.loads(line) for line in raw_parent.splitlines()]
        factual = [r for r in original if r["kind"] == "factual_crossformat"]
        chosen_queries = []
        for truth in (True, False):
            pool = [r for r in factual if r["listed"] == truth]
            rng.shuffle(pool)
            chosen_queries.extend(pool[:query_count//2])
        assert len(chosen_queries) == query_count
        rows, positions = [], []
        for number, row in enumerate(chosen_queries):
            q, hit, prompt = row["query_name"], row["listed"], row["prompt"]
            entry = entries[row["sdn_entity_id"]]
            assert (norm(q) in index) == hit
            assert norm(q) not in excluded_names and entry["id"] not in excluded_ids
            good = {fmt: make_text(q, hit, entry, fmt, prompt) for fmt in FORMATS}
            bad = {fmt: make_text(q, not hit, entry, fmt, prompt) for fmt in FORMATS}
            shift = rng.randrange(4)
            for i, fmt in enumerate(FORMATS):
                other = FORMATS[(i+shift) % 4]
                rows.append({**row, "chosen": good[fmt], "rejected": bad[other],
                             "kind": "factual_representations", "format": fmt+"/"+other,
                             "block_id": f"{split}-representations-{number}"})
                for text in (good[fmt], bad[other]):
                    assert len(tok.encode(render(prompt, text)).ids) <= 512
                    if text.startswith("{"):
                        spans = verdict_spans(text)
                        assert len(spans) == 1
                        absolute = len(render(prompt, "")) + spans[0][2]
                        enc = tok.encode(render(prompt, text))
                        positions.append(next(j for j, (_, end) in enumerate(enc.offsets) if end > absolute))
        retention = [r for r in original if r["kind"].startswith("wrong_query")]
        assert len(retention) == (600 if split == "train" else 100)
        rows.extend(retention)
        rng.shuffle(rows)
        raw = "".join(json.dumps(r, ensure_ascii=False)+"\n" for r in rows).encode()
        (a.out / f"{split}.jsonl").write_bytes(raw)
        (a.archive / f"{split}.jsonl.gz").write_bytes(gzip.compress(raw, mtime=0))
        all_names[split] = {norm(r["query_name"]) for r in rows}
        all_ids[split] = {r[k] for r in rows for k in ("sdn_entity_id", "other_entity_id")}
        assert not all_names[split] & excluded_names and not all_ids[split] & excluded_ids
        lengths = [tuple(min(512, len(tok.encode(render(r["prompt"], r[s])).ids)) for s in ("chosen", "rejected")) for r in rows]
        reports[split] = {"pairs": len(rows), "factual_queries": query_count, "factual_pairs": query_count*4,
                         "binding_pairs": len(retention), "unique_rejected": len({r["rejected"] for r in rows}),
                         "sha256": hashlib.sha256(raw).hexdigest(),
                         "parent_sha256": hashlib.sha256(raw_parent).hexdigest(),
                         "visible_length_baseline_tie_aware": sum((c > r)+.5*(c == r) for c, r in lengths)/len(lengths),
                         "json_verdicts_after_token256": sum(p >= 256 for p in positions), "json_verdicts": len(positions),
                         "max_factual_verdict_token": max(positions)}
    assert all(not all_names[x] & all_names[y] and not all_ids[x] & all_ids[y] for x, y in (("train", "val"), ("train", "test"), ("val", "test")))
    manifest = {"seed": 1520261102, "splits": reports, "neutral_metadata": neutral,
                "excluded_query_files": parent_manifest["excluded_queries"],
                "scope": "Source-derived four-representation factual groups; no captured-answer or pool training. Parent v3 inherited source knowledge disclosed separately."}
    for folder in (a.out, a.archive):
        save(folder / "manifest.json", manifest)
    print(json.dumps(manifest), flush=True)


if __name__ == "__main__":
    main()
