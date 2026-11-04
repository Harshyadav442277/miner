"""Raw-source, disjointness and training-only teacher-retention audit for V32."""
import argparse
import csv
import json
from pathlib import Path

from tokenizers import Tokenizer
from build_pairs import norm
from collect_miners import save
from repair_scope_negation import sha


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    a=ap.parse_args();evidence=Path(__file__).parent/"evidence"
    p=json.loads((a.plan/"frozen-inputs.json").read_text());old_path=evidence/"v31-plan/frozen-inputs.json"
    assert p["v31_inputs_sha256"]==sha(old_path)
    old=json.loads(old_path.read_text());assert p["validation"]==old["validation"] and p["binding"]==old["binding"]
    assert len(p["train"])==128 and len(p["validation"])==96
    prior=[]
    for version in (16,17,19):
        r=json.loads((evidence/f"v{version}-plan/frozen-inputs.json").read_text())
        prior.extend(q for qs in r["queries"].values() for q in qs)
    for version in (20,21,22,31):
        r=json.loads((evidence/f"v{version}-plan/frozen-inputs.json").read_text());prior.extend(r["train"]+r["validation"])
    r=json.loads((evidence/"v16-plan/frozen-inputs.json").read_text())
    for rel in r["external_query_files"]:prior.extend(json.loads((evidence/rel.replace('\\','/')).read_text()))
    prior.extend(json.loads((evidence/"listed-recall-diagnosis/frozen-protocol.json").read_text())["queries"])
    facts_path=evidence/"hard-fact-replay-plan/frozen-facts.json";facts=json.loads(facts_path.read_text())
    assert sha(facts_path)==p["hard_facts_sha256"]
    prior.extend(facts["hard_errors"]+facts["correct_replay"])
    hard=[q for q in p["train"] if q["curriculum"]=="hard"];replay=[q for q in p["train"] if q["curriculum"]=="replay"]
    assert len(hard)==len(replay)==64
    assert not {norm(q["name"]) for q in hard}&{norm(q["name"]) for q in prior}
    assert not {i for q in hard for i in q["sdn_ids"]}&{i for q in prior for i in q.get("sdn_ids",[])}
    index={}
    for file,col in (("sdn",1),("alt",3)):
        path=a.home/f"data/sanctions/{file}.csv";assert sha(path)==facts[f"{file}_sha256"]
        for r in csv.reader(path.read_text(encoding="utf-8-sig").splitlines()):
            if len(r)>col and r[0].isdigit():index.setdefault(norm(r[col]),set()).add(int(r[0]))
    source=a.home/"pairs/sanctions_v13_reference/train.jsonl";assert sha(source)==facts["source_train_sha256"]
    known={(r["query_name"],r["listed"]) for r in map(json.loads,source.read_text().splitlines())}
    tok=Tokenizer.from_file(str(a.home/"foundation/tokenizer.json"));retained=0
    for q in p["train"]:
        found=index.get(norm(q["name"]),set())
        assert bool(found)==q["listed"] and found==set(map(int,q["sdn_ids"]))
        assert (q["name"],q["listed"]) in known and len(q["views"])==len(q["teacher_scores"])==10
        if q["curriculum"]=="hard":
            assert q["mining_thin_margin"]>1e-4
            assert q["mining_late_json_margin"] < -1e-4 if not q["listed"] else q["mining_late_json_margin"]>1e-4
        for v in q["views"]:
            value=tok.decode([v["ids"][i] for i in v["primary_positions"]]).strip()
            assert value in (("true","MATCH") if v["claimed_match"] else ("false","NO MATCH"))
            assert v["is_correct"]==(v["claimed_match"]==q["listed"]) and len(v["ids"])<=512
        for fmt in dict.fromkeys(v["format"] for v in q["views"]):
            indices=[i for i,v in enumerate(q["views"]) if v["format"]==fmt]
            good=next(i for i in indices if q["views"][i]["is_correct"]);bad=next(i for i in indices if not q["views"][i]["is_correct"])
            should=q["teacher_scores"][good]>q["teacher_scores"][bad]
            assert all((i in q["retain_indices"])==should for i in indices)
        retained+=len(q["retain_indices"])
    assert [sum(q["source_form"]==k for q in hard) for k in ("primary","alias","absent")]==[16,16,32]
    r={"pass":True,"inputs_sha256":sha(a.plan/"frozen-inputs.json"),"source_training_queries":128,
       "new_source_anchors":64,"paired_development_queries_unchanged":96,"prior_external_entities_disjoint":True,
       "new_absent_anchors_thin_correct_late_wrong":32,"teacher_only_retains_source_correct_formats":True,
       "retained_view_logits":retained,"primary_spans_decoded":True,"script_sha256":sha(Path(__file__)),
       "scope":"Independent raw-CSV/split/span/mining-condition/retention-mask audit; teacher is not ground truth; same v31 DEVELOPMENT is not independent."}
    save(a.plan/"source-annotation-audit.json",r);print(json.dumps(r),flush=True)


if __name__=="__main__":main()
