"""Recompute saved benchmark labels and token invariants without calling any miner."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

from tokenizers import Tokenizer
from binding_benchmark import audit
from build_pairs import norm
from collect_miners import snapshot_index
from label_miners import label


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cohorts", type=Path, nargs="+")
    ap.add_argument("--home", type=Path, default=Path("C:/Users/hyada/tg-eval"))
    a = ap.parse_args()
    tokenizer = a.home / "foundation/tokenizer.json"
    foundation = json.loads((a.home / "foundation/foundation.json").read_text(encoding="utf-8"))
    assert hashlib.sha256(tokenizer.read_bytes()).hexdigest() == foundation["tokenizer_hash"]
    full, tok = [Tokenizer.from_file(str(tokenizer)) for _ in range(2)]
    tok.enable_truncation(max_length=256)
    used = set()
    for cohort in a.cohorts:
        expected = json.loads((cohort / "binding-audit.json").read_text(encoding="utf-8"))
        pairs = [json.loads(l) for l in (cohort / "pairs.jsonl").read_text(encoding="utf-8").splitlines()]
        assert hashlib.sha256((cohort / "pairs.jsonl").read_bytes()).hexdigest() == expected["pairs_sha256"]
        actual = audit(pairs, tok, full, require_both=expected.get("membership_scope", "both") == "both")
        assert all(expected[key] == value for key, value in actual.items())
        assert len(set(actual["source_counts"].values())) == 1
        manifest = json.loads((cohort / "source-manifest.json").read_text(encoding="utf-8"))
        sources = {}
        for name, item in manifest.items():
            sources[name] = gzip.decompress((cohort / (name+".gz")).read_bytes())
            assert hashlib.sha256(sources[name]).hexdigest() == item["sha256"]
        _, index = snapshot_index(sources["sdn.csv"], sources["alt.csv"])
        queries = {q["name"]: q for q in json.loads((cohort / "queries.json").read_text(encoding="utf-8"))}
        cache = {}
        for row in pairs:
            q = queries[row["name"]]
            assert q["expected"] == row["expected_membership"] == bool(index.get(norm(q["name"])))
            assert q["role"] == expected["role"]
            for side, name in (("chosen", row["name"]), ("rejected", row["rejected_name"])):
                file, i = row[side+"_capture"]
                path = cohort / file
                if path not in cache:
                    cache[path] = json.loads(path.read_text(encoding="utf-8"))
                record = cache[path][i]
                assert record["body"] == row[side] and record["name"] == name
                assert hashlib.sha256(record["body"].encode()).hexdigest() == record["sha256"]
                assert record["miner_id"] == row["source_id_metadata_only"]
                own_query = queries[name]
                assert own_query["expected"] == bool(index.get(norm(name)))
                assert label(record, own_query)[0] is True
            l, r = set(norm(row["name"]).split()), set(norm(row["rejected_name"]).split())
            assert len(l & r)/len(l | r) >= expected.get("min_name_token_jaccard", 0)
        names = {norm(r["name"]) for r in pairs}
        assert not names & used, "query overlap between supplied cohorts"
        used.update(names)
        print(f"PASS {cohort.name}: {len(pairs)} unaltered pairs; source labels, reversals, visibility, length and disjointness")


if __name__ == "__main__":
    main()
