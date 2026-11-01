"""Check actual entity ids, primary/alias tokens and prompt tokens across synthetic splits and captures."""
import argparse
import json
from pathlib import Path

from build_pairs import load, norm


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sdn", required=True)
    ap.add_argument("--alt", required=True)
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--queries", type=Path, nargs="+", required=True)
    ap.add_argument("--out", type=Path)
    a = ap.parse_args()
    entities = {e["id"]: e for e in load(a.sdn, a.alt)}
    ids, prompts, query_names, sizes = {}, {}, {}, {}
    for split in ("train", "val", "test"):
        rows = [json.loads(l) for l in (a.data / f"{split}.jsonl").read_text(encoding="utf-8").splitlines()]
        sizes[split] = len(rows)
        ids[split] = {r[k] for r in rows for k in ("sdn_entity_id", "other_entity_id")}
        prompts[split] = {norm(r["prompt"]) for r in rows}
        query_names[split] = {norm(r["prompt"].removeprefix("Screen ").removesuffix(
            " against the OFAC SDN list. Report name matches.")) for r in rows}
    aliases = {s: {norm(n) for i in group for n in [entities[i]["name"], *entities[i]["aliases"]]}
               for s, group in ids.items()}
    checks = {}
    for left, right in (("train", "val"), ("train", "test"), ("val", "test")):
        checks[f"{left}/{right}"] = {
            "shared_ids": len(ids[left] & ids[right]),
            "shared_primary_or_alias_tokens": len(aliases[left] & aliases[right]),
            "shared_prompt_tokens": len(prompts[left] & prompts[right]),
        }
    for i, file in enumerate(a.queries):
        queries = json.loads(file.read_text(encoding="utf-8"))
        measured_ids = {entry for q in queries for entry in q["sdn_ids"]}
        measured_names = {norm(n) for entry in measured_ids
                          for n in [entities[entry]["name"], *entities[entry]["aliases"]]}
        measured_names.update(norm(q["name"]) for q in queries)
        checks[f"measurement_{i}_vs_all"] = {
            "shared_ids": len(measured_ids & set.union(*ids.values())),
            "shared_primary_or_alias_tokens": len(measured_names & set.union(*aliases.values())),
            "shared_query_tokens": len(measured_names & set.union(*query_names.values())),
        }
    result = {"sizes": sizes, "query_files": [str(f) for f in a.queries], "checks": checks,
              "pass": all(value == 0 for item in checks.values() for value in item.values())}
    if a.out:
        a.out.write_text(json.dumps(result, indent=1), encoding="utf-8")
    print(json.dumps(result))
    if not result["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
