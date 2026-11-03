"""V27: question-only factual supervision and answer-context invariance."""
import argparse
import json
from pathlib import Path
import random
import shutil

import torch
import torch.nn.functional as F
from peft import get_peft_model_state_dict, set_peft_model_state_dict

from build_pairs import norm
from collect_miners import save
from distill_source_representations import TRAIN_FORMS, token_key, evaluate
from hf_reward_diagnostics import load_model, batch_scores
from repair_scope_negation import sha
from tokenizers import Tokenizer
from factual_role_annotations import supervised_loss as contextual_loss
from binding_benchmark import render

TRAIN_SEED = 2120261103
METRICS = []


def supervised_loss(model,q,query_head,role_head,hidden_box):
    # The auxiliary factual target is learned without seeing an asserted answer.
    batch_scores(model,[tuple(q["question_only_ids"])])
    hidden=hidden_box["value"][0,q["views"][0]["query_positions"]].mean(0)
    query_value=query_head(hidden).squeeze()
    factual=F.binary_cross_entropy_with_logits(query_value,torch.full_like(query_value,float(q["listed"])))
    reference=F.layer_norm(hidden.detach(),(768,))
    base=contextual_loss(model,q,query_head,role_head,hidden_box)
    full=hidden_box["value"]
    pooled=torch.stack([full[i,v["query_positions"]].mean(0) for i,v in enumerate(q["views"])])
    invariant=F.mse_loss(F.layer_norm(pooled,(768,)),reference.expand_as(pooled))
    METRICS.append({"name":q["name"],"listed":q["listed"],"question_only_bce":float(factual.detach()),
                    "normalized_feature_mse":float(invariant.detach()),"contextual_loss":float(base.detach())})
    return base+.5*factual+.5*invariant


def prepare(a):
    a.plan.mkdir(parents=True,exist_ok=False)
    evidence=Path(__file__).parent/"evidence"
    previous=evidence/"v26-plan/frozen-inputs.json"
    p=json.loads(previous.read_text())
    audit_path=previous.parent/"annotation-audit.json"
    audit=json.loads(audit_path.read_text())
    assert audit["pass"] and audit["inputs_sha256"]==sha(previous)
    assert len(p["train"])==128 and len(p["role_validation"])==96 and len(p["binding"])==32
    assert not {norm(q["name"]) for q in p["train"]}&{norm(q["name"]) for q in p["role_validation"]}
    assert not {i for q in p["train"] for i in q["sdn_ids"]}&{i for q in p["role_validation"] for i in q["sdn_ids"]}
    p["v26_inputs_sha256"]=sha(previous)
    p["dependencies"]={n:sha(Path(__file__).parent/n) for n in ("probe_isolated_membership.py","factual_role_annotations.py","distill_source_representations.py","hf_reward_diagnostics.py")}
    tok=Tokenizer.from_file(str(a.home/"foundation/tokenizer.json"))
    for q in p["train"]+p["role_validation"]+p["binding"]:
        ids=tok.encode(render(q["prompt"],"")).ids
        assert len(ids)<=512
        for v in q["views"]:
            assert all(ids[i]==v["ids"][i] for i in v["query_positions"])
        q["question_only_ids"]=ids
    p["scope"]="V27 training-only question membership and query-feature invariance. Same source128 facts and paired DEVELOPMENT96, not independent validation; standard178 inference tensors."
    p["question_only_bce_weight"]=.5;p["query_feature_mse_weight"]=.5
    save(a.plan/"frozen-inputs.json",p)
    save(a.plan/"annotation-audit.json",{**audit,"inputs_sha256":sha(a.plan/"frozen-inputs.json"),
         "reused_v26_annotation_audit_sha256":sha(audit_path),"question_only_prefix_ids_verified":256,
         "scope":"Original source/claim annotation audit reused hash-bound; added question-only prefixes verified against each full-answer query span. No labels in input."})
    print(json.dumps({"training_queries":128,"paired_development_queries":len(p["validation"]),"steps":32}),flush=True)


def run(a):
    p=json.loads((a.plan/"frozen-inputs.json").read_text())
    assert all(sha(Path(__file__).parent/f)==v for f,v in p["dependencies"].items())
    audit=json.loads((a.plan/"annotation-audit.json").read_text())
    assert audit["pass"] and audit["inputs_sha256"]==sha(a.plan/"frozen-inputs.json")
    previous=Path(__file__).parent/"evidence/v19-plan/frozen-inputs.json"
    assert sha(previous)==p["v19_inputs_sha256"]
    assert sha(Path(__file__).parent/"evidence/v26-plan/frozen-inputs.json")==p["v26_inputs_sha256"]
    assert p["question_only_bce_weight"]==.5 and p["query_feature_mse_weight"]==.5
    out=a.home/"runs-v2/SANCTIONS_SCREENING_MATCH_v27"
    recovery=out/"recovery.pt"
    if out.exists():
        assert recovery.exists(), "Existing run has no verified recovery checkpoint"
    else:
        out.mkdir()
    torch.manual_seed(TRAIN_SEED)
    model,tok,identity=load_model(a.home,13)
    assert identity==p["parent"]
    neutral=p["neutral_metadata"]
    before=evaluate(model,tok,p["validation"],neutral)
    save(a.plan/"before.json",before)
    initial={k:t.detach().cpu().clone() for k,t in get_peft_model_state_dict(model).items()}
    trainable=[t for n,t in model.named_parameters() if ".lora_A." in n or ".lora_B." in n or "classifier.modules_to_save.default." in n]
    assert len(trainable)==178 and sum(t.numel() for t in trainable)==1690369
    for t in trainable:
        t.requires_grad_(True)
    q=p["train"][0]
    probe=[token_key(tok,q,h,fmt,neutral) for h in (q["listed"],not q["listed"]) for fmt in TRAIN_FORMS]
    with torch.no_grad():
        eval_logits=batch_scores(model,probe).detach().cpu()
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant":False})
    model.enable_input_require_grads()
    model.train()
    dropout_count=0
    for module in model.modules():
        if isinstance(module,torch.nn.Dropout):
            module.p=0.; dropout_count+=1
    with torch.no_grad():
        train_logits=batch_scores(model,probe).detach().cpu()
    mode_error=float((eval_logits-train_logits).abs().max())
    assert mode_error<.001,mode_error
    save(a.plan/"training-forward-check.json",{"max_abs_eval_train_difference":mode_error,
         "dropout_modules_disabled":dropout_count,"trainable_tensors":178,"trainable_parameters":1690369,
         "checkpointing":"nonreentrant","scope":"Training-only memory/dropout settings; ordinary inference unchanged"})
    device=next(model.parameters()).device
    query_head=torch.nn.Linear(768,1,device=device)
    role_head=torch.nn.Linear(768,3,device=device)
    assert sum(t.numel() for t in list(query_head.parameters())+list(role_head.parameters()))==3076
    hidden_box={}
    def capture(module,args,output):
        hidden_box["value"]=output.last_hidden_state if hasattr(output,"last_hidden_state") else output[0]
    hook=model.get_base_model().model.register_forward_hook(capture)
    optimizer_parameters=trainable+list(query_head.parameters())+list(role_head.parameters())
    optimizer=torch.optim.AdamW([{"params":trainable,"lr":p["model_lr"]},
        {"params":list(query_head.parameters())+list(role_head.parameters()),"lr":p["auxiliary_lr"]}],weight_decay=0)
    order,rng=[],random.Random(TRAIN_SEED)
    groups=[[i for i,q in enumerate(p["train"]) if q["curriculum"]==kind and q["listed"]==hit] for kind in ("hard","replay") for hit in (True,False)]
    assert all(len(group)==32 for group in groups)
    for group in groups: rng.shuffle(group)
    for step in range(32): order.extend(group[step] for group in groups)
    logs=[]
    start_step=0
    if recovery.exists():
        state=torch.load(recovery,map_location="cpu",weights_only=True)
        assert state["inputs_sha256"]==sha(a.plan/"frozen-inputs.json")
        assert set(state["weights"])==set(initial)
        set_peft_model_state_dict(model,state["weights"],adapter_name="default")
        query_head.load_state_dict(state["query_head"])
        role_head.load_state_dict(state["role_head"])
        optimizer.load_state_dict(state["optimizer"])
        torch.set_rng_state(state["cpu_rng"])
        torch.cuda.set_rng_state_all(state["cuda_rng"])
        start_step=state["step"]
        logs=state["logs"]
        assert len(logs)==start_step and 0<start_step<=32
        METRICS[:]=state["aux_metrics"]
        assert len(METRICS)==start_step*5
        print(json.dumps({"resumed_step":start_step}),flush=True)
    for step in range(start_step,32):
        optimizer.zero_grad(set_to_none=True)
        losses=[]
        for i in order[step*4:step*4+4]:
            q=p["train"][i]
            loss=supervised_loss(model,q,query_head,role_head,hidden_box)
            (loss/4).backward(); losses.append(float(loss.detach()))
            hidden_box.clear()
        binding_loss=supervised_loss(model,p["binding"][step],query_head,role_head,hidden_box)
        (.25*binding_loss).backward();hidden_box.clear()
        binding_value=float(binding_loss.detach())
        grad=float(torch.nn.utils.clip_grad_norm_(optimizer_parameters,1))
        optimizer.step()
        logs.append({"step":step+1,"loss":sum(losses)/4+.25*binding_value,"binding_loss":binding_value,"gradient_norm":grad})
        print(json.dumps(logs[-1]),flush=True)
        if (step+1)%4==0:
            temporary=out/"recovery.pt.tmp"
            torch.save({"step":step+1,"logs":logs,"inputs_sha256":sha(a.plan/"frozen-inputs.json"),
                        "weights":{k:t.detach().cpu() for k,t in get_peft_model_state_dict(model).items()},
                        "query_head":query_head.state_dict(),"role_head":role_head.state_dict(),
                        "optimizer":optimizer.state_dict(),"cpu_rng":torch.get_rng_state(),
                        "cuda_rng":torch.cuda.get_rng_state_all(),"aux_metrics":METRICS},temporary)
            temporary.replace(recovery)
    hook.remove();hidden_box.clear()
    save(a.plan/"aux-training-losses.json",{"rows":METRICS,"scope":"Training losses, not independent accuracy."})
    torch.save({"query_head":query_head.state_dict(),"role_head":role_head.state_dict(),"training_only":True},out/"training_auxiliary.pt")
    model.eval().requires_grad_(False)
    final=get_peft_model_state_dict(model)
    assert len(final)==178 and not any("query_head" in k or "role_head" in k for k in final)
    changed=[k for k in final if not torch.equal(final[k].detach().cpu(),initial[k])]
    assert all(".lora_" in k or "classifier" in k for k in changed)
    assert any("classifier" in k and "weight" in k for k in changed)
    unchanged=[k for k in final if k not in changed]
    assert len(changed)+len(unchanged)==178
    model.save_pretrained(out/"adapter")
    shutil.copyfile(a.home/"foundation/tokenizer.json",out/"adapter/tokenizer.json")
    after=evaluate(model,tok,p["validation"],neutral)
    save(a.plan/"after.json",after)
    failures=[]
    for fmt,classes in after["by_format"].items():
        for kind,stats in classes.items():
            if stats["accuracy"]<.65:
                failures.append(f"{fmt}/{kind} below65%: {stats['accuracy']}")
        if fmt=="thin_json":
            for kind in ("listed","absent"):
                if classes[kind]["accuracy"]<before["by_format"][fmt][kind]["accuracy"]-.05:
                    failures.append(f"thin_json/{kind} loss exceeds5pp")
    for kind,stats in after["cross_format"].items():
        if stats["accuracy"]<.65:
            failures.append(f"cross_format/{kind} below65%")
    save(a.plan/"repair-result.json",{"pass":not failures,"failures":failures,"steps":logs,
         "changed_tensors":changed,"unchanged_saved_tensors":unchanged,
         "checkpoint_sha256":sha(out/"adapter/adapter_model.safetensors"),
         "scope":"Training-only question factual supervision/query-feature invariance; standard178-tensor inference, paired DEVELOPMENT, not full corpus or independent parent-held-out factual accuracy"})
    print(json.dumps({"pass":not failures,"failures":failures}),flush=True)


if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("mode",choices=("prepare","run"))
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    a=ap.parse_args()
    (prepare if a.mode=="prepare" else run)(a)
