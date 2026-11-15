"""Audit a built SECURITY_REVIEW pair set: entity, text and source isolation between splits.

    python audit_splits.py <pairs dir> [--oot oot.jsonl] [--out audit.json]

Fails (exit 1) when a holdout entity (package, code template, config template, secret file
format) or a holdout prompt/answer string appears in training or validation, when a reserved
OOT package appears as an entity anywhere, or when an OOT prompt is in any split.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path


def load(path):
    return [json.loads(l) for l in Path(path).read_text(encoding="utf-8").splitlines() if l.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pairs", type=Path)
    ap.add_argument("--oot", type=Path)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--frozen", type=Path, help="an earlier holdout.jsonl that this train/val must not touch")
    a = ap.parse_args()
    man = json.loads((a.pairs / "MANIFEST.json").read_text(encoding="utf-8"))
    split = {s: load(a.pairs / f"{s}.jsonl") for s in ("train", "val", "holdout")}
    problems, report = [], {"files": {}}
    for s, rows in split.items():
        h = hashlib.sha256((a.pairs / f"{s}.jsonl").read_bytes()).hexdigest()
        if h != man["files"][s]["sha256"]:
            problems.append(f"{s}.jsonl sha256 differs from MANIFEST")
        report["files"][s] = {"pairs": len(rows), "sha256": h}
    ent = {s: {e for r in rows for e in r["entities"]} for s, rows in split.items()}
    # config templates and secret formats are too few for a third split: val shares train's
    shared_ok = lambda e: e.startswith(("cfg:", "secretfmt:"))
    overlaps = {
        "holdout_train": sorted(ent["holdout"] & ent["train"]),
        "holdout_val": sorted(ent["holdout"] & ent["val"]),
        "val_train_packages_templates": sorted(e for e in ent["val"] & ent["train"] if not shared_ok(e)),
    }
    for k, v in overlaps.items():
        if v:
            problems.append(f"entity overlap {k}: {v[:5]}")
    report["entity_overlap"] = {k: len(v) for k, v in overlaps.items()}
    report["entities"] = {s: {p: sum(e.startswith(p) for e in v) for p in ("pkg:", "tpl:", "cfg:", "secretfmt:")}
                          for s, v in ent.items()}
    # A no-findings answer names nothing from its input, so the same text can recur across
    # splits; it is counted, not failed. Any other shared string is a leak.
    no_findings = lambda t: "No security issues found" in t
    for field in ("prompt", "chosen", "rejected"):
        held = {r[field] for r in split["holdout"]}
        shared = held & {r[field] for s in ("train", "val") for r in split[s]}
        leaks = [t for t in shared if not no_findings(t)]
        report[f"holdout_{field}_in_train_or_val"] = {"no_findings_answers": len(shared) - len(leaks), "other": len(leaks)}
        if leaks:
            problems.append(f"{len(leaks)} holdout {field} strings also in train/val")
    reserved = set(man["reserved_packages"])
    hit = sorted(e for v in ent.values() for e in v if e.startswith("pkg:") and e.split(":", 2)[2] in reserved)
    report["reserved_package_entities"] = len(hit)
    if hit:
        problems.append(f"reserved OOT packages used: {hit[:5]}")
    if a.frozen:  # an earlier frozen holdout (v1) must stay unseen by this set's train and val
        frozen = load(a.frozen)
        fe = {e for r in frozen for e in r["entities"]}
        hit = sorted(fe & (ent["train"] | ent["val"]))
        fp = {r["prompt"] for r in frozen} & {r["prompt"] for s in ("train", "val") for r in split[s]}
        report["frozen_holdout_entity_overlap"], report["frozen_holdout_prompt_overlap"] = len(hit), len(fp)
        if hit or fp:
            problems.append(f"frozen holdout overlap: {len(hit)} entities, {len(fp)} prompts")
    if a.oot:
        oot = {r["prompt"] for r in load(a.oot)}
        n = sum(r["prompt"] in oot for rows in split.values() for r in rows)
        report["oot_prompts_in_splits"] = n
        if n:
            problems.append(f"{n} OOT prompts inside the built splits")
    report["problems"] = problems
    report["verdict"] = "PASS" if not problems else "FAIL"
    text = json.dumps(report, indent=1)
    print(text)
    if a.out:
        a.out.write_text(text, encoding="utf-8")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
