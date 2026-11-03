"""Separate verdict capitalization, wrapper and identity disclaimer on fixed known facts."""
import argparse
import json
from pathlib import Path

from binding_benchmark import render
from collect_miners import save
from hf_reward_diagnostics import load_model, score_keys


def text(name, hit, case, disclaimer, short=False):
    claim = "MATCH" if hit else "NO MATCH"
    if case == "lower":
        claim = claim.lower()
    body = f"{name}: {claim}" if short else f"Exact-name lookup for {name} against OFAC SDN: {claim}."
    extra = {"none": "", "not": " Identity is not established by name alone.",
             "affirmative": " Identity requires corroborating identifiers beyond this name."}
    return body+extra[disclaimer]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--diagnosis", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    original = json.loads((a.diagnosis / "v13-factorial.json").read_text(encoding="utf-8"))
    queries = []
    for kind, count in (("primary", 8), ("alias", 8), ("absent", 16)):
        candidates = [r for r in original["rows"] if r["source_form"] == kind and r["forms"]["thin_json"]["correct"]]
        queries.extend(candidates[:count])
        assert len(candidates) >= count
    model, tok, identity = load_model(a.home, 13)
    variants = [(case, clause, False) for case in ("upper", "lower") for clause in ("none", "not", "affirmative")]
    variants += [(case, "none", True) for case in ("upper", "lower")]
    keys = {}
    for i, q in enumerate(queries):
        for variant in variants:
            for hit in (True, False):
                key = tuple(tok.encode(render(q["prompt"], text(q["name"], hit, *variant))).ids)
                assert len(key) <= 256
                keys[(i, variant, hit)] = key
    scores = score_keys(model, keys.values())
    # Independently check masked batching against singleton evaluation.
    singles = score_keys(model, list(scores)[:16], batch_size=1)
    maximum = max(abs(scores[k]-v) for k, v in singles.items())
    assert maximum < .001, maximum
    result = {}
    for variant in variants:
        by_class = {}
        for hit in (True, False):
            selected = [(i, q) for i, q in enumerate(queries) if q["listed"] == hit]
            correct = sum(scores[keys[(i, variant, hit)]] > scores[keys[(i, variant, not hit)]] for i, _ in selected)
            by_class[str(hit)] = {"queries": len(selected), "correct": correct}
        result["/".join(map(str, variant))] = by_class
    save(a.out, {"identity": identity, "queries": [{k: q[k] for k in ("name", "listed", "source_form")} for q in queries],
                 "results": result, "singleton_batch_max_abs_difference": maximum,
                 "scope": "HF paired wording ablation conditional on correct thin-format facts; same names, no truncation or training"})
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
