"""Independent raw-CSV/source-split audit required before bounded distillation."""
import argparse
import csv
import json
from pathlib import Path

from build_pairs import norm
from collect_miners import save
from repair_scope_negation import sha


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--plan", type=Path, required=True)
    a = ap.parse_args()
    frozen = a.plan / "frozen-inputs.json"
    p = json.loads(frozen.read_text())
    def rows(name):
        with (a.home / f"data/sanctions/{name}.csv").open(encoding="latin-1", newline="") as stream:
            raw = list(csv.reader(stream))
        # Treasury CSVs terminate with a DOS EOF marker, not an SDN record.
        valid = [r for r in raw if r and r[0].isdigit()]
        return raw, valid
    raw, primary = rows("sdn")
    _, aliases = rows("alt")
    assert len({r[0] for r in primary}) == len(primary) == p["neutral_metadata"]["primary_records"]
    lookup = {norm(r[1]) for r in primary} | {norm(r[3]) for r in aliases if len(r)>3}
    train, test = p["queries"]["train"], p["queries"]["holdout"]
    assert len(train)==64 and len(test)==96
    assert not {norm(q["name"]) for q in train} & {norm(q["name"]) for q in test}
    assert not {i for q in train for i in q["sdn_ids"]} & {i for q in test for i in q["sdn_ids"]}
    assert all((norm(q["name"]) in lookup)==q["listed"] for q in train+test)
    assert all(q["teacher_correct"]>q["teacher_wrong"] for q in train)
    for split, tag in (("train","train"),("test","holdout")):
        source=a.home/f"pairs/sanctions_v13_reference/{split}.jsonl"
        assert sha(source)==p[f"source_{split}_sha256"]
        facts={(r["query_name"],r["listed"]) for r in map(json.loads,source.read_text().splitlines())}
        assert all((q["name"],q["listed"]) in facts for q in p["queries"][tag])
    for label, count in (("primary",24),("alias",24),("absent",48)):
        assert sum(q["source_form"]==label for q in test)==count
    assert p["max_rendered_tokens"]<=512
    report={"pass":True,"frozen_inputs_sha256":sha(frozen),"source_fact_queries_verified":160,
            "raw_csv_rows":len(raw),"valid_primary_records":len(primary),"ignored_nonrecord_rows":len(raw)-len(primary),
            "train_holdout_disjoint_names":True,"train_holdout_disjoint_entities":True,
            "max_rendered_tokens":p["max_rendered_tokens"],"scope":"Raw CSV/source split and conditional-teacher input audit, no accuracy claim"}
    save(a.plan/"independent-input-audit.json",report)
    print(json.dumps(report))


if __name__=="__main__":
    main()
