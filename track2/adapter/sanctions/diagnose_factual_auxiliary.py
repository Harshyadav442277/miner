"""Training-only membership/verdict-head diagnostics, never evaluator scores."""
import argparse
import json
from pathlib import Path

import torch
from collect_miners import save
from hf_reward_diagnostics import load_model,batch_scores
from binding_benchmark import render
from repair_scope_negation import sha
from diagnose_fact_formats import answer


def qualified_views(tok,q):
    """Exact same heldout-prose fixture used by the main factual gate."""
    views=[]
    prefix=render(q["prompt"],"")
    for claim in (q["listed"],not q["listed"]):
        body=answer(q["name"],claim,"heldout_prose")
        text=prefix+body;enc=tok.encode(text)
        value="MATCH" if claim else "NO MATCH"
        start=len(prefix)+body.index("against OFAC SDN: ")+len("against OFAC SDN: ")
        end=start+len(value)
        assert text[start:end]==value and len(enc.ids)<=256
        primary=[i for i,(s,e) in enumerate(enc.offsets) if e>s and e>start and s<end]
        background=[i for i,(s,e) in enumerate(enc.offsets) if e>s and s>=len(prefix) and i not in primary]
        negations=[i for i in background if enc.tokens[i].lstrip("ĠĊ▁ ").lower() in ("no","not","false","true","match")]
        other=list(dict.fromkeys(negations+background[:8]))
        positions=q["views"][0]["query_positions"]
        assert all(enc.ids[i]==q["views"][0]["ids"][i] for i in positions)
        views.append({"ids":enc.ids,"query_positions":positions,"primary_positions":primary,
                      "role_positions":primary+other,"role_targets":[1 if claim else 2]*len(primary)+[0]*len(other),
                      "claimed_match":claim,"secondary_negations":len(negations),"format":"heldout_prose"})
    return views


def question_only(model,tok,query,qs,identity,plan,training=False):
    box={}
    def capture(module,args,output):
        box["hidden"]=output.last_hidden_state if hasattr(output,"last_hidden_state") else output[0]
    hook=model.get_base_model().model.register_forward_hook(capture)
    groups={str(t):{"queries":0,"correct":0} for t in (True,False)}
    rows=[]
    try:
        with torch.inference_mode():
            for q in qs:
                ids=tok.encode(render(q["prompt"],"")).ids
                positions=q["views"][0]["query_positions"]
                assert all(ids[i]==q["views"][0]["ids"][i] for i in positions)
                batch_scores(model,[tuple(ids)])
                value=float(query(box["hidden"][0,positions].mean(0)).squeeze())
                correct=(value>0)==q["listed"]
                groups[str(q["listed"])]["queries"]+=1
                groups[str(q["listed"])]["correct"]+=correct
                rows.append({"name":q["name"],"listed":q["listed"],"score":value,"correct":correct})
                box.clear()
    finally:
        hook.remove()
    result={"identity":identity,"by_membership":groups,"rows":rows,
            "inputs_sha256":sha(plan/"frozen-inputs.json"),"script_sha256":sha(Path(__file__)),
            "scope":("Source TRAINING" if training else "Paired DEVELOPMENT")+" existing training-only auxiliary head under question-only context shift. No evaluator score or inference change."}
    save(plan/("training-query-only-membership.json" if training else "query-only-membership.json"),result)
    print(json.dumps(groups),flush=True)


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    ap.add_argument("--question-only",action="store_true")
    ap.add_argument("--version",type=int,default=26)
    ap.add_argument("--qualified-prose",action="store_true")
    ap.add_argument("--training",action="store_true")
    a=ap.parse_args()
    p=json.loads((a.plan/"frozen-inputs.json").read_text())
    out=a.home/f"runs-v2/SANCTIONS_SCREENING_MATCH_v{a.version}"
    state=torch.load(out/"training_auxiliary.pt",map_location="cpu",weights_only=True)
    assert state["training_only"] is True
    model,tok,identity=load_model(a.home,a.version)
    if a.training:
        p["role_validation"]=p["train"]
    if a.qualified_prose:
        p["role_validation"]=[{**q,"views":qualified_views(tok,q)} for q in p["role_validation"]]
    device=next(model.parameters()).device
    query=torch.nn.Linear(768,1,device=device)
    role=torch.nn.Linear(768,3,device=device)
    query.load_state_dict(state["query_head"]);role.load_state_dict(state["role_head"])
    query.eval().requires_grad_(False);role.eval().requires_grad_(False)
    if a.question_only:
        question_only(model,tok,query,p["role_validation"],identity,a.plan,a.training)
        return
    box={}
    def capture(module,args,output):
        box["hidden"]=output.last_hidden_state if hasattr(output,"last_hidden_state") else output[0]
    hook=model.get_base_model().model.register_forward_hook(capture)
    world={str(t):{"views":0,"correct":0} for t in (True,False)}
    primary={str(t):{"tokens":0,"correct":0} for t in (True,False)}
    negations=0;false_decisions=0;stable=0;all_correct=0;rows=[];main={}
    try:
        with torch.inference_mode():
            for q in p["role_validation"]:
                views=q["views"]
                values=batch_scores(model,[tuple(v["ids"]) for v in views]).cpu().tolist()
                hidden=box["hidden"]
                pooled=torch.stack([hidden[i,v["query_positions"]].mean(0) for i,v in enumerate(views)])
                guesses=(query(pooled).squeeze(-1)>0).cpu().tolist()
                group=world[str(q["listed"])]
                group["views"]+=len(views);group["correct"]+=sum(g==q["listed"] for g in guesses)
                stable+=len(set(guesses))==1
                all_correct+=all(g==q["listed"] for g in guesses)
                for i,v in enumerate(views):
                    predictions=role(hidden[i,v["role_positions"]]).argmax(-1).cpu().tolist()
                    n=len(v["primary_positions"]);count=v["secondary_negations"]
                    group=primary[str(v["claimed_match"])]
                    group["tokens"]+=n
                    group["correct"]+=sum(g==t for g,t in zip(predictions[:n],v["role_targets"][:n],strict=True))
                    negations+=count
                    false_decisions+=sum(g!=0 for g in predictions[n:n+count])
                margins={}
                for fmt in dict.fromkeys(v["format"] for v in views):
                    good=[s for v,s in zip(views,values,strict=True) if v["format"]==fmt and v["claimed_match"]==q["listed"]]
                    bad=[s for v,s in zip(views,values,strict=True) if v["format"]==fmt and v["claimed_match"]!=q["listed"]]
                    assert len(good)==len(bad)==1
                    margins[fmt]=good[0]-bad[0]
                    for kind in (["listed",q["source_form"]] if q["listed"] else ["absent"]):
                        group=main.setdefault(fmt,{}).setdefault(kind,{"queries":0,"correct":0})
                        group["queries"]+=1;group["correct"]+=good[0]>bad[0]
                rows.append({"name":q["name"],"listed":q["listed"],"membership_view_predictions":guesses,"main_margins":margins})
                box.clear()
    finally:
        hook.remove()
    result={"identity":identity,"queries":len(rows),"membership_by_class":world,
            "membership_stable_across_views_queries":stable,"membership_all_views_correct_queries":all_correct,
            "primary_verdict_tokens":primary,"nonprimary_negation_tokens":negations,
            "nonprimary_negations_misread_as_primary":false_decisions,"rows":rows,
            "inputs_sha256":sha(a.plan/"frozen-inputs.json"),"script_sha256":sha(Path(__file__)),
            "context":"heldout_prose" if a.qualified_prose else "five_training_forms","main_by_format":main,
            "scope":("Source TRAINING" if a.training else "Paired DEVELOPMENT")+" diagnostics. Correlated views/tokens; auxiliary counts are not evaluator accuracy. Main margins are HF, not actual-node scores/readiness. Heads discarded for export."}
    filename=("training-" if a.training else "")+("qualified-prose-" if a.qualified_prose else "")+"auxiliary-diagnostics.json"
    save(a.plan/filename,result)
    print(json.dumps({k:v for k,v in result.items() if k not in ("rows","identity")}),flush=True)


if __name__=="__main__":main()
