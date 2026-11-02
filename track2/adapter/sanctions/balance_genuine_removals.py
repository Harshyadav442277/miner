"""Disjoint-name provider-role reversals from genuine unchanged same-query pairs."""
import argparse
import collections
import json
from pathlib import Path
import random
import shutil

from tokenizers import Tokenizer
from audit_claim_visibility import visibility_record
from binding_benchmark import render
from collect_miners import save


def sign(value):
    return (value > 0)-(value < 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    ap.add_argument("--tokenizer", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    if a.out.exists():
        raise ValueError("Refusing to overwrite a balanced measurement")
    pairs = [json.loads(l) for l in (a.capture / "pairs.jsonl").read_text(encoding="utf-8").splitlines()]
    queries = {q["name"]: q for q in json.loads((a.capture / "queries.json").read_text(encoding="utf-8"))}
    labels = {(r["capture"], r["row"]): r for r in json.loads((a.capture / "labels.json").read_text(encoding="utf-8"))}
    tok = Tokenizer.from_file(str(a.tokenizer))
    tok.enable_truncation(max_length=256)
    eligible, rejected = [], collections.Counter()
    for row in pairs:
        if not all(visibility_record(tok, row["prompt"], row[s])["all_machine_claims_visible"] for s in ("chosen", "rejected")):
            rejected["machine claim not fully visible256"] += 1
            continue
        good = labels[tuple(row["chosen_capture"])]["miner_id"]
        bad = labels[tuple(row["rejected_capture"])]["miner_id"]
        char_sign = sign(len(row["chosen"])-len(row["rejected"]))
        lengths = [len(tok.encode(render(row["prompt"], row[s])).ids) for s in ("chosen", "rejected")]
        eligible.append({"pair": row, "good": good, "bad": bad, "char": char_sign,
                         "token": sign(lengths[0]-lengths[1]), "prefix": queries[row["name"]]["prefix_tokens"]})
    yes = [r for r in eligible if queries[r["pair"]["name"]]["expected"]]
    no = [r for r in eligible if not queries[r["pair"]["name"]]["expected"]]
    rng = random.Random(1720261103)
    edges = collections.defaultdict(list)
    for positive in yes:
        for negative in no:
            if (positive["good"], positive["bad"]) != (negative["bad"], negative["good"]):
                continue
            if positive["prefix"] != negative["prefix"] or positive["char"]+negative["char"] != 0 or positive["token"]+negative["token"] != 0:
                continue
            edges[positive["pair"]["name"]].append((negative["pair"]["name"], positive["pair"], negative["pair"]))
    for items in edges.values():
        items.sort(key=lambda item: (item[0], item[1]["chosen_capture"], item[1]["rejected_capture"]))
        rng.shuffle(items)
    order = sorted(edges)
    rng.shuffle(order)
    matched = {}
    def augment(name, seen):
        for other, positive, negative in edges[name]:
            if other in seen:
                continue
            seen.add(other)
            if other not in matched or augment(matched[other][0], seen):
                matched[other] = (name, positive, negative)
                return True
        return False
    for name in order:
        augment(name, set())
    selected = []
    for number, (_, positive, negative) in enumerate(sorted(matched.values(), key=lambda value: value[0])):
        for row in (positive, negative):
            selected.append({**row, "block_id": f"genuine-source-reversal-{number}"})
    assert len({r["name"] for r in selected}) == len(selected)
    shutil.copytree(a.capture, a.out, ignore=shutil.ignore_patterns("v*-node-scores.json", "v*-worker-*.txt", "v*-package-manifest.json"))
    shutil.copyfile(a.out / "pairs.jsonl", a.out / "all-pairs.jsonl")
    (a.out / "pairs.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False)+"\n" for r in selected), encoding="utf-8")
    summary = json.loads((a.out / "label-summary.json").read_text(encoding="utf-8"))
    summary.update(pairs=len(selected), paired_names=len(selected),
                   pairs_by_kind=dict(collections.Counter(r["kind"] for r in selected)),
                   longer_answer_baseline=.5 if selected else None, registration_eligible=False,
                   measurement_scope="Genuine disjoint-name source reversals only; old factual failures remain unresolved")
    save(a.out / "label-summary.json", summary)
    roles = collections.defaultdict(collections.Counter)
    for row in selected:
        roles[labels[tuple(row["chosen_capture"])]["miner_id"]]["chosen"] += 1
        roles[labels[tuple(row["rejected_capture"])]["miner_id"]]["rejected"] += 1
    assert all(r["chosen"] == r["rejected"] for r in roles.values())
    result = {"seed": 1720261103, "unfiltered_pairs": len(pairs), "eligible_visible_pairs": len(eligible),
              "blocks": len(matched), "pairs": len(selected), "distinct_names": len(selected),
              "provider_roles": {k: dict(v) for k, v in roles.items()}, "excluded": dict(rejected),
              "diagnostic_models": [3, 8], "minimum_blocks_for_scoring": 4,
              "score_allowed": len(matched) >= 4, "max_tokens": 256,
              "scope": "Maximum-cardinality disjoint-name matching, no model scores used; unchanged response bodies"}
    save(a.out / "balanced-block-audit.json", result)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
