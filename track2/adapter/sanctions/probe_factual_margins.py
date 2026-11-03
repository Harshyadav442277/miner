"""V21: direct factual-margin distillation, ordinary inference."""
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

TRAIN_SEED = 2120261103
VALIDATION_SEED = 2320261103


def prepare(a):
    a.plan.mkdir(parents=True,exist_ok=False)
    evidence=Path(__file__).parent/"evidence"
    previous=evidence/"v19-plan/frozen-inputs.json"
    p=json.loads(previous.read_text())
    audit=json.loads((previous.parent/"independent-input-audit.json").read_text())
    assert audit["pass"] and audit["frozen_inputs_sha256"]==sha(previous)
    sdn,alt=[a.home/f"data/sanctions/{n}.csv" for n in ("sdn","alt")]
    entries={e["id"]:e for e in load(str(sdn),str(alt))}
    _,index=snapshot_index(sdn.read_bytes(),alt.read_bytes())
    names,ids=set(),set()
    def exclude(qs):
        for q in qs:
            names.add(norm(q["name"]))
            ids.update(index.get(norm(q["name"]),[]))
            ids.update(q.get("sdn_ids",[]))
    old16=json.loads((evidence/"v16-plan/frozen-inputs.json").read_text())
    for n in ("v16-plan","v17-plan","v19-plan"):
        for qs in json.loads((evidence/n/"frozen-inputs.json").read_text())["queries"].values():
            exclude(qs)
    exclude(json.loads((evidence/"listed-recall-diagnosis/frozen-protocol.json").read_text())["queries"])
    for rel in old16["external_query_files"]:
        exclude(json.loads((evidence/rel).read_text()))
    exclude(json.loads((evidence/"v20-plan/frozen-inputs.json").read_text())["validation"])
    source=a.home/"pairs/sanctions_v13_reference/val.jsonl"
    rows=[json.loads(l) for l in source.read_text().splitlines()]
    random.Random(VALIDATION_SEED).shuffle(rows)
    pools={k:[] for k in ("primary","alias","absent")}
    for r in rows:
        n=norm(r["query_name"])
        found=set(index.get(n,[]))
        assert bool(found)==r["listed"]
        if n in names or found&ids:
            continue
        kind="absent" if not r["listed"] else "primary" if n==norm(entries[r["sdn_entity_id"]]["name"]) else "alias"
        pools[kind].append({"name":r["query_name"],"listed":r["listed"],"source_form":kind,
                            "prompt":r["prompt"],"sdn_ids":sorted(found),"provenance":r["provenance"]})
    validation=[]
    for kind,count in (("primary",24),("alias",24),("absent",48)):
        for q in pools[kind]:
            if norm(q["name"]) in names or set(q["sdn_ids"])&ids:
                continue
            validation.append(q); exclude([q]); count-=1
            if not count:
                break
        assert not count,(kind,count)
    deps=("probe_factual_margins.py","distill_source_representations.py","hf_reward_diagnostics.py")
    save(a.plan/"frozen-inputs.json",{"training_seed":TRAIN_SEED,"validation_seed":VALIDATION_SEED,
         "v19_inputs_sha256":sha(previous),"parent":p["parent"],"train":p["queries"]["train"],
         "validation":validation,"neutral_metadata":p["neutral_metadata"],"source_val_sha256":sha(source),
         "dependencies":{f:sha(Path(__file__).parent/f) for f in deps},
         "scope":"New repair validation from parent13 validation source; parent exposure disclosed, not pristine parent holdout. Same training facts/targets as v19."})
    print(json.dumps({"train":64,"new_repair_validation":len(validation)}),flush=True)


def run(a):
    p=json.loads((a.plan/"frozen-inputs.json").read_text())
    assert all(sha(Path(__file__).parent/f)==v for f,v in p["dependencies"].items())
    previous=Path(__file__).parent/"evidence/v19-plan/frozen-inputs.json"
    assert sha(previous)==p["v19_inputs_sha256"]
    out=a.home/"runs-v2/SANCTIONS_SCREENING_MATCH_v21"
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
    trainable=[t for n,t in model.named_parameters() if ".lora_A." in n or ".lora_B." in n]
    assert len(trainable)==176 and sum(t.numel() for t in trainable)==1689600
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
         "dropout_modules_disabled":dropout_count,"trainable_tensors":176,"trainable_parameters":1689600,
         "checkpointing":"nonreentrant","scope":"Training-only memory/dropout settings; ordinary inference unchanged"})
    optimizer=torch.optim.AdamW(trainable,lr=.0001,weight_decay=0)
    order,rng=[],random.Random(TRAIN_SEED)
    for _ in range(2):
        part=list(range(64)); rng.shuffle(part); order.extend(part)
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
        assert len(logs)==start_step and 0<start_step<=32
        print(json.dumps({"resumed_step":start_step}),flush=True)
    for step in range(start_step,32):
        optimizer.zero_grad(set_to_none=True)
        losses=[]
        for i in order[step*4:step*4+4]:
            q=p["train"][i]
            keys=[token_key(tok,q,h,fmt,neutral) for h in (q["listed"],not q["listed"]) for fmt in TRAIN_FORMS]
            values=batch_scores(model,keys).reshape(2,len(TRAIN_FORMS))
            target=torch.tensor([q["teacher_correct"],q["teacher_wrong"]],device=values.device)[:,None].expand_as(values)
            margin_target=torch.full_like(values[0],q["teacher_correct"]-q["teacher_wrong"])
            loss=F.mse_loss(values[0]-values[1],margin_target)+.1*values.var(dim=1,unbiased=False).mean()+.2*F.softplus(1-values[0,:,None]+values[1,None,:]).mean()
            (loss/4).backward(); losses.append(float(loss.detach()))
        grad=float(torch.nn.utils.clip_grad_norm_(trainable,1))
        optimizer.step()
        logs.append({"step":step+1,"loss":sum(losses)/4,"gradient_norm":grad})
        print(json.dumps(logs[-1]),flush=True)
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
    assert len(changed)==176 and all(".lora_" in k for k in changed)
    unchanged=[k for k in final if k not in changed]
    assert len(unchanged)==2 and all("classifier" in k for k in unchanged)
    model.save_pretrained(out/"adapter")
    shutil.copyfile(a.home/"foundation/tokenizer.json",out/"adapter/tokenizer.json")
    after=evaluate(model,tok,p["validation"],neutral)
    save(a.plan/"after.json",after)
    development=json.loads(previous.read_text())["queries"]["holdout"]
    save(a.plan/"v19-development-after.json",evaluate(model,tok,development,neutral))
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
         "changed_tensors":changed,"unchanged_classifier_tensors":unchanged,
         "checkpoint_sha256":sha(out/"adapter/adapter_model.safetensors"),
         "scope":"Bounded factual-margin objective counterfactual, not full corpus training or independent parent-held-out factual score"})
    print(json.dumps({"pass":not failures,"failures":failures}),flush=True)


if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("mode",choices=("prepare","run"))
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    a=ap.parse_args()
    (prepare if a.mode=="prepare" else run)(a)
