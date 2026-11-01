"""Counterbalanced external-answer query-binding benchmark, not a factual activation gate.

Source bodies are unchanged. Equal question-prefix lengths AND identical visible answer
tokens under reversal remove the old truncation confound. Each query is used once.
"""
import argparse
import collections
import hashlib
import itertools
import json
from pathlib import Path
import random
import shutil
import sys

from tokenizers import Tokenizer
from build_pairs import norm
from collect_miners import save

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from score_pairs import render

PROMPT = "Screen {q} against the OFAC SDN list. Report name matches."


def visible(tok, question, answer):
    prefix = render(question, "")
    enc = tok.encode(prefix + answer)
    ids = tuple(token for token, (start, end) in zip(enc.ids, enc.offsets) if end > start >= len(prefix))
    ends = [end - len(prefix) for start, end in enc.offsets if end > start >= len(prefix)]
    return ids, answer[:max(ends, default=0)]


def compatible(tok, full, left, right):
    ql, qr = PROMPT.format(q=left["name"]), PROMPT.format(q=right["name"])
    if len(full.encode(render(ql, "")).ids) != len(full.encode(render(qr, "")).ids):
        return False
    if norm(left["name"]) == norm(right["name"]):
        return False
    for record, other in ((left, right), (right, left)):
        a, text = visible(tok, ql, record["answer"])
        b, _ = visible(tok, qr, record["answer"])
        terms = set(norm(text).split())
        if a != b or not set(norm(record["name"]).split()) <= terms:
            return False
        if set(norm(other["name"]).split()) <= terms:
            return False  # no ambiguous full-name overlap, even through an evidence field
    return visible(tok, ql, left["answer"])[0] != visible(tok, ql, right["answer"])[0]


def audit(pairs, tok, full, require_both=True):
    blocks = collections.defaultdict(list)
    for row in pairs:
        blocks[row["block_id"]].append(row)
    names, memberships, sources = [], collections.Counter(), collections.Counter()
    raw_lengths, visible_lengths = [], []
    for block, rows in blocks.items():
        if len(rows) != 2:
            raise ValueError(f"block is not a reversal: {block}")
        left, right = rows
        assert left["chosen"] == right["rejected"] and left["rejected"] == right["chosen"]
        assert left["name"] == right["rejected_name"] and right["name"] == left["rejected_name"]
        assert left["source_id_metadata_only"] == right["source_id_metadata_only"]
        assert left["expected_membership"] == right["expected_membership"]
        assert compatible(tok, full, {"name": left["name"], "answer": left["chosen"]},
                          {"name": right["name"], "answer": right["chosen"]})
        for row in rows:
            assert row["prompt"] == PROMPT.format(q=row["name"])
            names.append(norm(row["name"]))
            memberships[str(row["expected_membership"])] += 1
            sources[row["source_id_metadata_only"]] += 1
            raw_lengths.append((len(row["chosen"]), len(row["rejected"])))
            visible_lengths.append((len(visible(tok, row["prompt"], row["chosen"])[0]),
                                    len(visible(tok, row["prompt"], row["rejected"])[0])))
    assert len(names) == len(set(names)), "queries reused across providers/blocks"
    if require_both:
        assert memberships["True"] == memberships["False"] > 0
    else:
        assert memberships["False"] > 0 and memberships["True"] == 0
    baseline = lambda seq: sum((c > r) + .5*(c == r) for c, r in seq)/len(seq)
    assert baseline(raw_lengths) == baseline(visible_lengths) == .5
    return {"pairs": len(pairs), "independent_reversal_blocks": len(blocks), "distinct_queries": len(names),
            "membership_counts": dict(memberships), "source_counts": dict(sources),
            "character_length_baseline_tie_aware": baseline(raw_lengths),
            "visible_token_length_baseline_tie_aware": baseline(visible_lengths),
            "fixed_answer_only_upper_bound": .5, "query_name_overlap_reference": 1.0,
            "prefix_length_and_visible_token_invariance": True}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    ap.add_argument("--tokenizer", type=Path, required=True)
    ap.add_argument("--role", choices=("development", "final"), required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--blocks-per-class-source", type=int, default=2)
    ap.add_argument("--membership", choices=("both", "absent"), default="both")
    ap.add_argument("--min-name-overlap", type=float, default=0)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    full, tok = Tokenizer.from_file(str(a.tokenizer)), Tokenizer.from_file(str(a.tokenizer))
    tok.enable_truncation(max_length=256)
    queries = {q["name"]: q for q in json.loads((a.capture / "queries.json").read_text(encoding="utf-8"))}
    labels = json.loads((a.capture / "labels.json").read_text(encoding="utf-8"))
    grouped, cached = collections.defaultdict(list), {}
    for record in labels:
        if record["decision_label"] != "correct" or queries[record["name"]]["role"] != a.role:
            continue
        file = record["capture"]
        if file not in cached:
            cached[file] = json.loads((a.capture / file).read_text(encoding="utf-8"))
        grouped[record["miner_id"]].append({**record, "answer": cached[file][record["row"]]["body"]})
    order = sorted(grouped, key=lambda s: (min(sum(r["expected"] == hit for r in grouped[s])
                                             for hit in (True, False)), s))
    rng, used, pairs, exclusions = random.Random(820261102), set(), [], {}
    for source in order:
        source_rows = []
        source_names = set()
        for hit in ((True, False) if a.membership == "both" else (False,)):
            records = [r for r in grouped[source] if r["expected"] == hit and norm(r["name"]) not in used]
            combos = list(itertools.combinations(records, 2))
            rng.shuffle(combos)
            selected = []
            for left, right in combos:
                if norm(left["name"]) in source_names or norm(right["name"]) in source_names:
                    continue
                if not compatible(tok, full, left, right):
                    continue
                words_l, words_r = set(norm(left["name"]).split()), set(norm(right["name"]).split())
                if len(words_l & words_r)/len(words_l | words_r) < a.min_name_overlap:
                    continue
                selected.append((left, right))
                source_names.update((norm(left["name"]), norm(right["name"])))
                if len(selected) == a.blocks_per_class_source:
                    break
            if len(selected) != a.blocks_per_class_source:
                exclusions[source] = "insufficient equally tokenized, visible, unambiguous disjoint pairs in both classes"
                source_rows = []
                break
            for i, (left, right) in enumerate(selected):
                for good, bad in ((left, right), (right, left)):
                    source_rows.append({"prompt": PROMPT.format(q=good["name"]), "name": good["name"],
                                        "rejected_name": bad["name"], "chosen": good["answer"], "rejected": bad["answer"],
                                        "kind": "binding:listed" if hit else "binding:exact_absent",
                                        "expected_membership": hit, "format": "unchanged_external_wrong_query_control",
                                        "source_id_metadata_only": source, "block_id": f"{a.role}-{source}-{hit}-{i}",
                                        "chosen_capture": [(a.capture.relative_to(a.out.parent) / good["capture"]).as_posix(), good["row"]],
                                        "rejected_capture": [(a.capture.relative_to(a.out.parent) / bad["capture"]).as_posix(), bad["row"]]})
        if source_rows:
            # References are relative to this benchmark directory, not its parent.
            for row in source_rows:
                row["chosen_capture"][0] = "../" + row["chosen_capture"][0]
                row["rejected_capture"][0] = "../" + row["rejected_capture"][0]
            pairs.extend(source_rows)
            used.update(source_names)
    if not pairs:
        raise ValueError("no valid balanced blocks; do not relax invariants")
    report = audit(pairs, tok, full, require_both=a.membership == "both")
    for file in ("source-manifest.json", "sdn.csv.gz", "alt.csv.gz", "queries.json"):
        shutil.copyfile(a.capture / file, a.out / file)
    (a.out / "pairs.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False)+"\n" for r in pairs), encoding="utf-8")
    report.update(role=a.role, seed=820261102, exclusions=exclusions, registration_eligible=False,
                  membership_scope=a.membership, min_name_token_jaccard=a.min_name_overlap,
                  benchmark_axis="query binding only; not independent factual accuracy",
                  pairs_sha256=hashlib.sha256((a.out / "pairs.jsonl").read_bytes()).hexdigest())
    save(a.out / "binding-audit.json", report)
    save(a.out / "label-summary.json", {**report, "pairs_by_kind": dict(collections.Counter(r["kind"] for r in pairs)),
                                        "longer_answer_baseline": .5})
    print(json.dumps(report))


if __name__ == "__main__":
    main()
