"""Training-only membership/verdict-head diagnostics, never evaluator scores."""
import argparse
import json
from pathlib import Path

import torch
from collect_miners import save
from hf_reward_diagnostics import load_model,batch_scores
from binding_benchmark import render
from repair_scope_negation import sha


def question_only(model,tok,query,qs,identity,plan):
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
            "scope":"Existing training-only auxiliary head under question-only context shift. Paired DEVELOPMENT diagnostic, no evaluator score or inference change."}
    save(plan/"query-only-membership.json",result)
    print(json.dumps(groups),flush=True)


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    ap.add_argument("--question-only",action="store_true")
    ap.add_argument("--version",type=int,default=26)
    a=ap.parse_args()
    p=json.loads((a.plan/"frozen-inputs.json").read_text())
    out=a.home/f"runs-v2/SANCTIONS_SCREENING_MATCH_v{a.version}"
    state=torch.load(out/"training_auxiliary.pt",map_location="cpu",weights_only=True)
    assert state["training_only"] is True
    model,tok,identity=load_model(a.home,a.version)
    device=next(model.parameters()).device
    query=torch.nn.Linear(768,1,device=device)
    role=torch.nn.Linear(768,3,device=device)
    query.load_state_dict(state["query_head"]);role.load_state_dict(state["role_head"])
    query.eval().requires_grad_(False);role.eval().requires_grad_(False)
    if a.question_only:
        question_only(model,tok,query,p["role_validation"],identity,a.plan)
        return
    box={}
    def capture(module,args,output):
        box["hidden"]=output.last_hidden_state if hasattr(output,"last_hidden_state") else output[0]
    hook=model.get_base_model().model.register_forward_hook(capture)
    world={str(t):{"views":0,"correct":0} for t in (True,False)}
    primary={str(t):{"tokens":0,"correct":0} for t in (True,False)}
    negations=0;false_decisions=0;stable=0;all_correct=0;rows=[]
    try:
        with torch.inference_mode():
            for q in p["role_validation"]:
                views=q["views"]
                batch_scores(model,[tuple(v["ids"]) for v in views])
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
                rows.append({"name":q["name"],"listed":q["listed"],"membership_view_predictions":guesses})
                box.clear()
    finally:
        hook.remove()
    result={"identity":identity,"queries":len(rows),"membership_by_class":world,
            "membership_stable_across_views_queries":stable,"membership_all_views_correct_queries":all_correct,
            "primary_verdict_tokens":primary,"nonprimary_negation_tokens":negations,
            "nonprimary_negations_misread_as_primary":false_decisions,"rows":rows,
            "scope":"Training-only heads on paired DEVELOPMENT data. Correlated views/tokens, not evaluator accuracy, actual-node scores or readiness. Heads discarded for export."}
    save(a.plan/"auxiliary-diagnostics.json",result)
    print(json.dumps({k:v for k,v in result.items() if k not in ("rows","identity")}),flush=True)


if __name__=="__main__":main()
