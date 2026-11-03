"""V26: training-only membership and primary-verdict supervision."""
import argparse
import json
from pathlib import Path
import random
import shutil

import torch
import torch.nn.functional as F
from peft import get_peft_model_state_dict, set_peft_model_state_dict

from build_pairs import load, norm
from collect_miners import save, snapshot_index
from distill_source_representations import TRAIN_FORMS, token_key, evaluate
from hf_reward_diagnostics import load_model, batch_scores
from repair_scope_negation import sha
from tokenizers import Tokenizer
from factual_role_annotations import compile_queries,compile_binding,supervised_loss

TRAIN_SEED = 2120261103
VALIDATION_SEED = 2420261103


def prepare(a):
    a.plan.mkdir(parents=True,exist_ok=False)
    evidence=Path(__file__).parent/"evidence"
    facts=evidence/"hard-fact-replay-plan/frozen-facts.json"
    f=json.loads(facts.read_text())
    audit=json.loads((facts.parent/"independent-source-audit.json").read_text())
    assert audit["pass"] and audit["facts_sha256"]==sha(facts)
    parent=evidence/"v22-plan/frozen-inputs.json"
    p=json.loads(parent.read_text())
    assert p["parent"]==f["parent"]
    hard=[{**q,"curriculum":"hard"} for q in f["hard_errors"]]
    replay=[{**q,"curriculum":"replay"} for q in f["correct_replay"]]
    p["train"]=hard+replay
    assert len(p["train"])==128
    p["hard_facts_sha256"]=sha(facts)
    p["paired_development_inputs_sha256"]=sha(parent)
    p["dependencies"]={n:sha(Path(__file__).parent/n) for n in ("probe_factual_roles.py","factual_role_annotations.py","distill_source_representations.py","hf_reward_diagnostics.py")}
    p["scope"]="128 source hard-error/replay facts, fixed32 steps. Same v22 paired DEVELOPMENT cohort, not independent validation. Parent source knowledge exposed."
    tok=Tokenizer.from_file(str(a.home/"foundation/tokenizer.json"))
    p["train"]=compile_queries(tok,p["train"],p["neutral_metadata"],TRAIN_SEED)
    p["role_validation"]=compile_queries(tok,p["validation"],p["neutral_metadata"],TRAIN_SEED+1)
    p["binding"]=compile_binding(tok,p["train"],p["neutral_metadata"],TRAIN_SEED+2)
    p["scope"]="Training-only fact/primary-verdict supervision; standard inference178 tensors. Same v22 paired DEVELOPMENT cohort, not independent validation."
    p["model_lr"]=.0001;p["auxiliary_lr"]=.001
    save(a.plan/"frozen-inputs.json",p)
    print(json.dumps({"training_queries":128,"paired_development_queries":len(p["validation"]),"steps":32}),flush=True)


def run(a):
    p=json.loads((a.plan/"frozen-inputs.json").read_text())
    assert all(sha(Path(__file__).parent/f)==v for f,v in p["dependencies"].items())
    audit=json.loads((a.plan/"annotation-audit.json").read_text())
    assert audit["pass"] and audit["inputs_sha256"]==sha(a.plan/"frozen-inputs.json")
    previous=Path(__file__).parent/"evidence/v19-plan/frozen-inputs.json"
    assert sha(previous)==p["v19_inputs_sha256"]
    out=a.home/"runs-v2/SANCTIONS_SCREENING_MATCH_v26"
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
                        "cuda_rng":torch.cuda.get_rng_state_all()},temporary)
            temporary.replace(recovery)
    hook.remove();hidden_box.clear()
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
         "scope":"Training-only auxiliary factor supervision; standard178-tensor inference, paired DEVELOPMENT cohort, not full corpus training or independent parent-held-out factual score"})
    print(json.dumps({"pass":not failures,"failures":failures}),flush=True)


if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("mode",choices=("prepare","run"))
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    a=ap.parse_args()
    (prepare if a.mode=="prepare" else run)(a)
