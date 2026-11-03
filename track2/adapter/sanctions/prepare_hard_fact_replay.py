"""Prepare source-verified parent factual errors plus unchanged correct replay.

Data preparation only: no optimizer, captured answers, pool rows or inference changes.
"""
import argparse
import json
from pathlib import Path
import random

from binding_benchmark import render
from build_pairs import load,norm
from collect_miners import save,snapshot_index
from diagnose_fact_formats import answer
from hf_reward_diagnostics import load_model,score_keys
from repair_scope_negation import sha

SEED=2520261103


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--out",type=Path,required=True)
    a=ap.parse_args();a.out.mkdir(exist_ok=False)
    evidence=Path(__file__).parent/"evidence"
    source=a.home/"pairs/sanctions_v13_reference/train.jsonl"
    sdn,alt=[a.home/f"data/sanctions/{n}.csv" for n in ("sdn","alt")]
    entries={e["id"]:e for e in load(str(sdn),str(alt))}
    _,index=snapshot_index(sdn.read_bytes(),alt.read_bytes())
    names,ids=set(),set()
    def exclude(qs):
        for q in qs:
            names.add(norm(q["name"]))
            ids.update(index.get(norm(q["name"]),[]))
            ids.update(q.get("sdn_ids",[]))
    p16=json.loads((evidence/"v16-plan/frozen-inputs.json").read_text())
    for n in (16,17,19):
        for qs in json.loads((evidence/f"v{n}-plan/frozen-inputs.json").read_text())["queries"].values():exclude(qs)
    for n in (20,21,22):
        p=json.loads((evidence/f"v{n}-plan/frozen-inputs.json").read_text())
        exclude(p["validation"]);exclude(p["train"])
    exclude(json.loads((evidence/"listed-recall-diagnosis/frozen-protocol.json").read_text())["queries"])
    for rel in p16["external_query_files"]:exclude(json.loads((evidence/rel).read_text()))
    rows=[json.loads(l) for l in source.read_text().splitlines()]
    random.Random(SEED).shuffle(rows)
    pools={k:[] for k in ("primary","alias","absent")};seen=set()
    for r in rows:
        n=norm(r["query_name"]);found=set(index.get(n,[]))
        assert bool(found)==r["listed"]
        if n in names or n in seen or found&ids:continue
        kind="absent" if not r["listed"] else "primary" if n==norm(entries[r["sdn_entity_id"]]["name"]) else "alias"
        if len(pools[kind])>=768:continue
        pools[kind].append({"name":r["query_name"],"prompt":r["prompt"],"listed":r["listed"],
                            "source_form":kind,"sdn_ids":sorted(found),"provenance":r["provenance"]})
        seen.add(n)
    model,tok,identity=load_model(a.home,13)
    candidates=sum(pools.values(),[])
    def key(q,hit):return tuple(tok.encode(render(q["prompt"],answer(q["name"],hit,"thin_json"))).ids)
    scores=score_keys(model,[key(q,h) for q in candidates for h in (True,False)])
    hard=[];counts={}
    for kind,count in (("primary",16),("alias",16),("absent",32)):
        errors=[]
        for q in pools[kind]:
            good,bad=[scores[key(q,h)] for h in (q["listed"],not q["listed"])]
            if good<=bad:errors.append({**q,"parent_correct_score":good,"parent_wrong_score":bad})
        counts[kind]=len(errors)
        for q in errors:
            if set(q["sdn_ids"])&ids:continue
            if q["listed"]:
                entry=entries[q["sdn_ids"][0]]
                q={**q,"source_record":{"entry_number":entry["id"],"primary_name":entry["name"],"matched_name":q["name"]}}
            hard.append(q);exclude([q]);count-=1
            if not count:break
        assert not count,(kind,count,counts)
    replay=json.loads((evidence/"v19-plan/frozen-inputs.json").read_text())["queries"]["train"]
    assert len(replay)==64 and len(hard)==64
    assert not {norm(q["name"]) for q in replay}&{norm(q["name"]) for q in hard}
    save(a.out/"frozen-facts.json",{"seed":SEED,"parent":identity,"hard_errors":hard,"correct_replay":replay,
         "eligible_parent_errors":counts,"source_train_sha256":sha(source),"sdn_sha256":sha(sdn),"alt_sha256":sha(alt),
         "scope":"Prepared facts only.64 genuine source-verified parent factual errors +64 previously verified correct replay, balanced64 listed/64 absent. Positive source knowledge exposed to parent. No training or validation score."})
    print(json.dumps({"hard_errors":64,"correct_replay":64,"eligible_errors":counts,"optimizer_steps":0}),flush=True)


if __name__=="__main__":main()
