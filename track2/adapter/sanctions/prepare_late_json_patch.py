"""Mine source-only thin-correct/late-JSON-wrong absent anchors, never validation rows."""
import argparse
import json
from pathlib import Path
import random

from build_pairs import load, norm
from collect_miners import save, snapshot_index
from distill_source_representations import token_key
from factual_role_annotations import compile_queries
from hf_reward_diagnostics import load_model, score_keys
from repair_scope_negation import sha
from scope_curriculum import varied_view


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    a=ap.parse_args();a.plan.mkdir(exist_ok=False)
    evidence=Path(__file__).parent/"evidence";source=evidence/"v31-plan/frozen-inputs.json"
    p=json.loads(source.read_text());p["v31_inputs_sha256"]=sha(source)
    sdn,alt=[a.home/f"data/sanctions/{n}.csv" for n in ("sdn","alt")]
    assert sha(sdn)==p["neutral_metadata"]["sdn_sha256"] and sha(alt)==p["neutral_metadata"]["alt_sha256"]
    entries={e["id"]:e for e in load(str(sdn),str(alt))}
    _,index=snapshot_index(sdn.read_bytes(),alt.read_bytes())
    names,ids=set(),set()
    def exclude(qs):
        for q in qs:
            names.add(norm(q["name"]));ids.update(index.get(norm(q["name"]),[]));ids.update(q.get("sdn_ids",[]))
    old16=json.loads((evidence/"v16-plan/frozen-inputs.json").read_text())
    for version in (16,17,19):
        for qs in json.loads((evidence/f"v{version}-plan/frozen-inputs.json").read_text())["queries"].values():exclude(qs)
    for version in (20,21,22,31):
        prior=json.loads((evidence/f"v{version}-plan/frozen-inputs.json").read_text());exclude(prior["train"]);exclude(prior["validation"])
    facts_path=evidence/"hard-fact-replay-plan/frozen-facts.json";facts=json.loads(facts_path.read_text())
    exclude(facts["hard_errors"]);exclude(facts["correct_replay"])
    exclude(json.loads((evidence/"listed-recall-diagnosis/frozen-protocol.json").read_text())["queries"])
    for rel in old16["external_query_files"]:exclude(json.loads((evidence/rel.replace('\\','/')).read_text()))
    train_path=a.home/"pairs/sanctions_v13_reference/train.jsonl"
    assert sha(train_path)==facts["source_train_sha256"]
    rows=[json.loads(line) for line in train_path.read_text().splitlines()];random.Random(3220261104).shuffle(rows)
    pools={k:[] for k in ("primary","alias","absent")};seen=set()
    for r in rows:
        name=norm(r["query_name"]);found=set(index.get(name,[]));assert bool(found)==r["listed"]
        if name in names or name in seen or found&ids or len(found)>1:continue
        kind="absent" if not found else "primary" if name==norm(entries[r["sdn_entity_id"]]["name"]) else "alias"
        if len(pools[kind])==256:continue
        pools[kind].append({"name":r["query_name"],"prompt":r["prompt"],"listed":r["listed"],"source_form":kind,
                            "sdn_ids":sorted(found),"provenance":r["provenance"],"curriculum":"hard"});seen.add(name)
    assert all(len(x)==256 for x in pools.values())
    save(a.plan/"mining-protocol.json",{"source_inputs_sha256":sha(source),"candidate_pool_sizes":{k:len(v) for k,v in pools.items()},
         "seed":3220261104,"source_train_sha256":sha(train_path),"exclusion_names":len(names),"exclusion_entities":len(ids),
         "scope":"Before model scoring:32 absent thin-correct/late-wrong plus16 primary/16 alias thin-and-late-correct source anchors; all prior/external entities excluded. No optimizer."})
    model,tok,identity=load_model(a.home,31)
    assert identity["checkpoint_sha256"]==json.loads((source.parent/"repair-result.json").read_text())["checkpoint_sha256"]
    candidates=sum(pools.values(),[])
    def key(q,h,f):return token_key(tok,q,h,f,p["neutral_metadata"])
    keys=sorted({key(q,h,f) for q in candidates for h in (True,False) for f in ("thin_json","json_late")},key=len)
    scores=score_keys(model,keys,batch_size=4)
    chosen=[];eligible={}
    for kind,count in (("primary",16),("alias",16),("absent",32)):
        qualified=[]
        for q in pools[kind]:
            thin=scores[key(q,q["listed"],"thin_json")]-scores[key(q,not q["listed"],"thin_json")]
            late=scores[key(q,q["listed"],"json_late")]-scores[key(q,not q["listed"],"json_late")]
            if thin>1e-4 and (late < -1e-4 if kind=="absent" else late>1e-4):
                qualified.append({**q,"mining_thin_margin":thin,"mining_late_json_margin":late})
        eligible[kind]=len(qualified)
        for q in qualified:
            if norm(q["name"]) in names or set(q["sdn_ids"])&ids:continue
            chosen.append(q);exclude([q]);count-=1
            if not count:break
        assert not count,(kind,count,eligible)
    compiled=compile_queries(tok,chosen,p["neutral_metadata"],3220261104)
    counters={True:0,False:0}
    for q in compiled:
        n=counters[q["listed"]];counters[q["listed"]]+=1;original=q["views"]
        q["views"]=[next(v for v in original if v["format"]==f and v["claimed_match"]==h)
                    if f in ("thin_json","json_early","json_late") else varied_view(tok,{**q,"views":original},h,n,int(f[-1]),p["neutral_metadata"])
                    for h in (q["listed"],not q["listed"]) for f in ("thin_json","json_early","json_late","varied_prose_0","varied_prose_1")]
    replay=[{**q,"curriculum":"replay"} for q in p["train"]]
    p["train"]=compiled+replay
    all_keys=sorted({tuple(v["ids"]) for q in p["train"] for v in q["views"]},key=len)
    teacher=score_keys(model,all_keys,batch_size=4)
    for q in p["train"]:
        retained=[]
        for fmt in dict.fromkeys(v["format"] for v in q["views"]):
            indices=[i for i,v in enumerate(q["views"]) if v["format"]==fmt]
            good=next(i for i in indices if q["views"][i]["is_correct"]);bad=next(i for i in indices if not q["views"][i]["is_correct"])
            if teacher[tuple(q["views"][good]["ids"]) ]>teacher[tuple(q["views"][bad]["ids"])]:retained.extend(indices)
        q["retain_indices"]=retained;q["teacher_scores"]=[teacher[tuple(v["ids"])] for v in q["views"]]
    p["original_parent"]=p["parent"];p["parent"]=identity
    p["baseline_sha256"]=sha(source.parent/"before.json")
    p["scope"]="V32 source-only hard-format anchors+replay128 facts; final-global-attention4 tensors only,32 fixed updates. Same v31 cohort is paired DEVELOPMENT, not independent."
    p["eligible_mining_anchors"]=eligible
    deps=("probe_late_json_patch.py","prepare_late_json_patch.py","probe_primary_quality.py","scope_curriculum.py","hf_reward_diagnostics.py","factual_role_annotations.py")
    p["dependencies"]={n:sha(Path(__file__).parent/n) for n in deps}
    save(a.plan/"frozen-inputs.json",p)
    save(a.plan/"mining-result.json",{"parent":identity,"eligible":eligible,"new_source_anchors":64,"replay_queries":64,
         "scope":"Own source train facts only. New absent anchors thin-correct/late-wrong; listed controls thin/late correct. No validation rows, bodies or scores used for selection."})
    print(json.dumps({"eligible":eligible,"new_source_anchors":64,"replay":64}),flush=True)


if __name__=="__main__":main()
