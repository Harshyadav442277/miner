"""V28: fixed four-pass fit-duration control on the same 128 source facts."""
import argparse
import json
from pathlib import Path
import random
import shutil

import torch
import torch.nn.functional as F
from peft import get_peft_model_state_dict, set_peft_model_state_dict
from peft.utils.save_and_load import load_peft_weights

from build_pairs import load, norm
from collect_miners import save, snapshot_index
from distill_source_representations import TRAIN_FORMS, token_key, evaluate
from hf_reward_diagnostics import load_model, batch_scores
from repair_scope_negation import sha

TRAIN_SEED = 2120261103
VALIDATION_SEED = 2420261103
TOTAL_STEPS = 128


def prepare(a):
    evidence=Path(__file__).parent/"evidence"
    fit_path=evidence/"v25-plan/source-training-fit.json"
    fit=json.loads(fit_path.read_text())
    old_path=evidence/"v25-plan/frozen-inputs.json"
    assert fit["inputs_sha256"]==sha(old_path)
    assert fit["identity"]["checkpoint_sha256"]==sha(a.home/"runs-v2/SANCTIONS_SCREENING_MATCH_v25/adapter/adapter_model.safetensors")
    unfitted=[f"{fmt}/{kind}" for fmt,classes in fit["by_format"].items() for kind,s in classes.items()
              if kind in ("listed","absent","primary","alias") and s["correct"]/s["queries"]<.95]
    assert unfitted,"Duration probe not justified: source-training classes all fit >=95%"
    a.plan.mkdir(parents=True,exist_ok=False)
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
    old=json.loads(old_path.read_text())
    assert p["train"]==old["train"] and p["validation"]==old["validation"] and p["neutral_metadata"]==old["neutral_metadata"]
    p["dependencies"]={n:sha(Path(__file__).parent/n) for n in ("probe_fit_duration.py","distill_source_representations.py","hf_reward_diagnostics.py")}
    p["v25_inputs_sha256"]=sha(old_path);p["v25_source_fit_sha256"]=sha(fit_path)
    p["v25_checkpoint_sha256"]=fit["identity"]["checkpoint_sha256"]
    p["total_steps"]=TOTAL_STEPS;p["source_fit_failures_below95pct"]=unfitted
    p["scope"]="Fixed128-step/four-pass duration control on SAME128 source facts, no new objective/corpus. Final-step-only paired DEVELOPMENT, no independent validation claim."
    audit_path=evidence/"v27-plan/independent-source-audit.json"
    verified=json.loads(audit_path.read_text())
    old27_path=evidence/"v27-plan/frozen-inputs.json"
    assert verified["pass"] and verified["inputs_sha256"]==sha(old27_path)
    old27=json.loads(old27_path.read_text())
    fields=("name","prompt","listed","sdn_ids","source_form","curriculum")
    assert [[q[k] for k in fields] for q in p["train"]]==[[q[k] for k in fields] for q in old27["train"]]
    assert p["validation"]==old27["validation"]
    for name in ("sdn","alt"):
        assert sha(a.home/f"data/sanctions/{name}.csv")==f[f"{name}_sha256"]
    assert sha(a.home/"pairs/sanctions_v13_reference/train.jsonl")==f["source_train_sha256"]
    assert sha(a.home/"pairs/sanctions_v13_reference/val.jsonl")==p["source_val_sha256"]
    p["reused_source_audit_sha256"]=sha(audit_path)
    save(a.plan/"frozen-inputs.json",p)
    save(a.plan/"source-audit.json",{"pass":True,"inputs_sha256":sha(a.plan/"frozen-inputs.json"),
         "queries":224,"reused_v27_independent_audit_sha256":sha(audit_path),
         "scope":"Hash-bound reuse of v27 independent raw-CSV/split audit; exact source-query identity and current CSV/train/val hashes rechecked. No new rows or labels."})
    print(json.dumps({"training_queries":128,"paired_development_queries":len(p["validation"]),"steps":TOTAL_STEPS}),flush=True)


def run(a):
    p=json.loads((a.plan/"frozen-inputs.json").read_text())
    assert all(sha(Path(__file__).parent/f)==v for f,v in p["dependencies"].items())
    previous=Path(__file__).parent/"evidence/v19-plan/frozen-inputs.json"
    assert sha(previous)==p["v19_inputs_sha256"]
    evidence=Path(__file__).parent/"evidence"
    assert sha(evidence/"v25-plan/frozen-inputs.json")==p["v25_inputs_sha256"]
    assert sha(evidence/"v25-plan/source-training-fit.json")==p["v25_source_fit_sha256"]
    assert p["total_steps"]==TOTAL_STEPS
    audit=json.loads((a.plan/"source-audit.json").read_text())
    assert audit["pass"] and audit["inputs_sha256"]==sha(a.plan/"frozen-inputs.json")
    out=a.home/"runs-v2/SANCTIONS_SCREENING_MATCH_v28"
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
    optimizer=torch.optim.AdamW(trainable,lr=.0001,weight_decay=0)
    order,rng=[],random.Random(TRAIN_SEED)
    groups=[[i for i,q in enumerate(p["train"]) if q["curriculum"]==kind and q["listed"]==hit] for kind in ("hard","replay") for hit in (True,False)]
    assert all(len(group)==32 for group in groups)
    for epoch in range(4):
        for group in groups: rng.shuffle(group)
        for step in range(32): order.extend(group[step] for group in groups)
    assert len(order)==TOTAL_STEPS*4
    logs=[]
    start_step=0
    if recovery.exists():
        state=torch.load(recovery,map_location="cpu",weights_only=True)
        assert state["inputs_sha256"]==sha(a.plan/"frozen-inputs.json")
        assert set(state["weights"])==set(initial)
        set_peft_model_state_dict(model,state["weights"],adapter_name="default")
        optimizer.load_state_dict(state["optimizer"])
        torch.set_rng_state(state["cpu_rng"])
        torch.cuda.set_rng_state_all(state["cuda_rng"])
        start_step=state["step"]
        logs=state["logs"]
        assert len(logs)==start_step and 0<start_step<=TOTAL_STEPS
        print(json.dumps({"resumed_step":start_step}),flush=True)
    for step in range(start_step,TOTAL_STEPS):
        optimizer.zero_grad(set_to_none=True)
        losses=[]
        for i in order[step*4:step*4+4]:
            q=p["train"][i]
            keys=[token_key(tok,q,h,fmt,neutral) for h in (q["listed"],not q["listed"]) for fmt in TRAIN_FORMS]
            values=batch_scores(model,keys).reshape(2,len(TRAIN_FORMS))
            loss=F.softplus(values[1,None,:]-values[0,:,None]).mean()
            (loss/4).backward(); losses.append(float(loss.detach()))
        grad=float(torch.nn.utils.clip_grad_norm_(trainable,1))
        optimizer.step()
        logs.append({"step":step+1,"loss":sum(losses)/4,"gradient_norm":grad})
        print(json.dumps(logs[-1]),flush=True)
        if step+1==32:
            checkpoint=a.home/"runs-v2/SANCTIONS_SCREENING_MATCH_v25/adapter"
            assert sha(checkpoint/"adapter_model.safetensors")==p["v25_checkpoint_sha256"]
            expected=load_peft_weights(str(checkpoint),device="cpu")
            actual=get_peft_model_state_dict(model)
            exact=set(actual)==set(expected) and all(torch.equal(actual[k].detach().cpu(),expected[k]) for k in actual)
            old_logs=json.loads((evidence/"v25-plan/repair-result.json").read_text())["steps"]
            loss_error=max(abs(a["loss"]-b["loss"]) for a,b in zip(logs,old_logs,strict=True))
            save(a.plan/"step32-replay-check.json",{"pass":exact and loss_error<.0001,
                 "exact_saved_tensors":len(actual) if exact else 0,"max_loss_difference":loss_error,
                 "scope":"Same first32 updates as v25 before extra duration, not quality."})
            assert exact and loss_error<.0001,"First32 updates do not reproduce v25; duration comparison invalid"
        if (step+1)%4==0:
            temporary=out/"recovery.pt.tmp"
            torch.save({"step":step+1,"logs":logs,"inputs_sha256":sha(a.plan/"frozen-inputs.json"),
                        "weights":{k:t.detach().cpu() for k,t in get_peft_model_state_dict(model).items()},
                        "optimizer":optimizer.state_dict(),"cpu_rng":torch.get_rng_state(),
                        "cuda_rng":torch.cuda.get_rng_state_all()},temporary)
            temporary.replace(recovery)
    model.eval().requires_grad_(False)
    final=get_peft_model_state_dict(model)
    changed=[k for k in final if not torch.equal(final[k].detach().cpu(),initial[k])]
    assert all(".lora_" in k or "classifier" in k for k in changed)
    assert any("classifier" in k and "weight" in k for k in changed)
    unchanged=[k for k in final if k not in changed]
    assert len(changed)+len(unchanged)==178
    model.save_pretrained(out/"adapter")
    shutil.copyfile(a.home/"foundation/tokenizer.json",out/"adapter/tokenizer.json")
    training_fit=evaluate(model,tok,p["train"],neutral)
    save(a.plan/"source-training-final.json",training_fit)
    after=evaluate(model,tok,p["validation"],neutral)
    save(a.plan/"after.json",after)
    failures=[]
    for fmt in TRAIN_FORMS:
        for kind,stats in training_fit["by_format"][fmt].items():
            if stats["accuracy"]<.95:
                failures.append(f"training_fit/{fmt}/{kind} below95%")
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
         "scope":"Fixed four-pass duration control on128 source facts; final-step paired DEVELOPMENT, not full corpus training or independent parent-held-out factual score"})
    print(json.dumps({"pass":not failures,"failures":failures}),flush=True)


if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("mode",choices=("prepare","run"))
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    a=ap.parse_args()
    (prepare if a.mode=="prepare" else run)(a)
