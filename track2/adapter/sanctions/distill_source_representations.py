"""V19 bounded source-only distillation; ordinary forward and exported weights."""
import argparse
import json
from pathlib import Path
import random
import shutil

import torch
import torch.nn.functional as F
from peft import get_peft_model_state_dict

from binding_benchmark import render
from build_pairs import load, norm
from collect_miners import save, snapshot_index
from diagnose_fact_formats import answer, FORMATS
from hf_reward_diagnostics import load_model, score_keys, batch_scores
from repair_scope_negation import sha

SEED = 2120261103
TRAIN_FORMS = ("thin_json", "json_early", "json_late", "prose_early", "prose_late")
ALL_FORMS = tuple(dict.fromkeys((*TRAIN_FORMS, *FORMATS)))


def token_key(tok, q, hit, fmt, neutral):
    if fmt in FORMATS:
        body = answer(q["name"], hit, fmt)
    else:
        meta = dict(neutral)
        while True:
            if fmt.startswith("json"):
                items = [("name", q["name"]), ("matched", hit), ("reference", meta)]
                if fmt == "json_late":
                    items[1:] = reversed(items[1:])
                body = json.dumps(dict(items))
            else:
                claim = f"OFAC SDN exact name lookup for {q['name']} returned {'MATCH' if hit else 'NO MATCH'}."
                context = "Source information: " + json.dumps(meta)
                body = claim+" "+context if fmt == "prose_early" else context+" "+claim
            if len(tok.encode(render(q["prompt"], body)).ids) <= 512:
                break
            assert meta, "Source claim itself must fit512"
            meta.pop(next(reversed(meta)))
    ids = tuple(tok.encode(render(q["prompt"], body)).ids)
    assert len(ids) <= 512
    return ids


def prepare(a):
    a.plan.mkdir(parents=True, exist_ok=False)
    evidence = Path(__file__).parent / "evidence"
    sdn, alt = [a.home / f"data/sanctions/{n}.csv" for n in ("sdn", "alt")]
    entries = {e["id"]: e for e in load(str(sdn), str(alt))}
    _, index = snapshot_index(sdn.read_bytes(), alt.read_bytes())
    names, ids = set(), set()
    def exclude(qs):
        for q in qs:
            names.add(norm(q["name"]))
            ids.update(index.get(norm(q["name"]), []))
            ids.update(q.get("sdn_ids", []))
    exclude(json.loads((evidence/"listed-recall-diagnosis/frozen-protocol.json").read_text())["queries"])
    old16 = json.loads((evidence/"v16-plan/frozen-inputs.json").read_text())
    old17 = json.loads((evidence/"v17-plan/frozen-inputs.json").read_text())
    for old in (old16, old17):
        for qs in old["queries"].values():
            exclude(qs)
    for rel in old16["external_query_files"]:
        exclude(json.loads((evidence/rel).read_text()))
    source = a.home / "pairs/sanctions_v13_reference"
    def pool(split, limits):
        rows = [json.loads(l) for l in (source/f"{split}.jsonl").read_text().splitlines()]
        random.Random(SEED).shuffle(rows)
        groups = {k: [] for k in ("primary", "alias", "absent")}
        seen = set()
        for r in rows:
            n, hit = norm(r["query_name"]), r["listed"]
            found = set(index.get(n, []))
            assert bool(found) == hit
            if n in seen or n in names or found & ids:
                continue
            kind = "absent" if not hit else "primary" if n == norm(entries[r["sdn_entity_id"]]["name"]) else "alias"
            if len(groups[kind]) == limits[kind]:
                continue
            groups[kind].append({"name": r["query_name"], "listed": hit, "prompt": r["prompt"],
                                 "source_form": kind, "sdn_ids": sorted(found), "provenance": r["provenance"]})
            seen.add(n)
        return groups
    test = pool("test", {"primary": 80, "alias": 80, "absent": 180})
    holdout = []
    for kind, count in (("primary", 24), ("alias", 24), ("absent", 48)):
        for q in test[kind]:
            if set(q["sdn_ids"]) & ids:
                continue
            holdout.append(q)
            exclude([q])
            count -= 1
            if not count:
                break
        assert not count, (kind, count)
    save(a.plan/"holdout-before-scores.json", {"seed": SEED, "queries": holdout,
         "source_sha256": sha(source/"test.jsonl"), "scope": "Unconditioned new source-test questions; parent knows public positive facts"})
    manifest = evidence/"v15-plan/training-inputs/manifest.json"
    neutral = json.loads(manifest.read_text())["neutral_metadata"]
    assert neutral["sdn_sha256"] == sha(sdn) and neutral["alt_sha256"] == sha(alt)
    candidates = sum(pool("train", {"primary": 128, "alias": 128, "absent": 256}).values(), [])
    model, tok, identity = load_model(a.home, 13)
    scores = score_keys(model, [token_key(tok,q,h,"thin_json",neutral) for q in candidates for h in (True, False)])
    train = []
    for kind, count in (("primary",16), ("alias",16), ("absent",32)):
        for q in candidates:
            if q["source_form"] != kind or norm(q["name"]) in names or set(q["sdn_ids"]) & ids:
                continue
            good, bad = [scores[token_key(tok,q,h,"thin_json",neutral)] for h in (q["listed"],not q["listed"])]
            if good <= bad:
                continue
            train.append({**q,"teacher_correct":good,"teacher_wrong":bad})
            exclude([q])
            count -= 1
            if not count:
                break
        assert not count
    lengths = [len(token_key(tok,q,h,fmt,neutral)) for q in train+holdout for fmt in ALL_FORMS for h in (True,False)]
    deps = ("distill_source_representations.py","hf_reward_diagnostics.py","diagnose_fact_formats.py","audit_distillation_inputs.py")
    save(a.plan/"frozen-inputs.json", {"seed":SEED,"parent":identity,"queries":{"train":train,"holdout":holdout},
         "neutral_metadata":neutral,"source_metadata_sha256":sha(manifest),"sdn_sha256":sha(sdn),"alt_sha256":sha(alt),
         "source_train_sha256":sha(source/"train.jsonl"),"source_test_sha256":sha(source/"test.jsonl"),
         "dependencies":{f:sha(Path(__file__).parent/f) for f in deps},"max_rendered_tokens":max(lengths),
         "rendered_texts_above256":sum(n>256 for n in lengths),"texts":len(lengths),
         "scope":"Source-only known-fact distillation. No external answer, fingerprint or inference transform."})
    print(json.dumps({"train":len(train),"holdout":len(holdout),"max_tokens":max(lengths),"texts_above256":sum(n>256 for n in lengths)}),flush=True)


def evaluate(model,tok,qs,neutral):
    keys={(i,fmt,h):token_key(tok,q,h,fmt,neutral) for i,q in enumerate(qs) for fmt in ALL_FORMS for h in (True,False)}
    scores=score_keys(model,keys.values(),batch_size=4)
    rows=[{**q,"forms":{fmt:{"correct_score":scores[keys[i,fmt,q["listed"]]],"wrong_score":scores[keys[i,fmt,not q["listed"]]]} for fmt in ALL_FORMS}} for i,q in enumerate(qs)]
    stats={}
    for fmt in ALL_FORMS:
        stats[fmt]={}
        for kind in ("listed","absent","primary","alias"):
            part=[r for r in rows if (r["listed"] if kind=="listed" else not r["listed"] if kind=="absent" else r["source_form"]==kind)]
            wins=sum(r["forms"][fmt]["correct_score"]>r["forms"][fmt]["wrong_score"] for r in part)
            stats[fmt][kind]={"queries":len(part),"correct":wins,"accuracy":wins/len(part)}
    cross={}
    for kind,hit in (("listed",True),("absent",False)):
        part=[r for r in rows if r["listed"]==hit]
        wins=sum(r["forms"][good]["correct_score"]>r["forms"][bad]["wrong_score"] for r in part for good in ALL_FORMS for bad in ALL_FORMS)
        total=len(part)*len(ALL_FORMS)**2
        cross[kind]={"pairs":total,"correct":wins,"accuracy":wins/total}
    return {"by_format":stats,"cross_format":cross,"rows":rows}


def run(a):
    p=json.loads((a.plan/"frozen-inputs.json").read_text())
    assert all(sha(Path(__file__).parent/f)==v for f,v in p["dependencies"].items())
    audit=json.loads((a.plan/"independent-input-audit.json").read_text())
    assert audit["pass"] and audit["frozen_inputs_sha256"]==sha(a.plan/"frozen-inputs.json")
    out=a.home/"runs-v2/SANCTIONS_SCREENING_MATCH_v19"
    out.mkdir(exist_ok=False)
    torch.manual_seed(SEED)
    model,tok,identity=load_model(a.home,13)
    assert identity==p["parent"]
    before=evaluate(model,tok,p["queries"]["holdout"],p["neutral_metadata"])
    save(a.plan/"before.json",before)
    initial={k:t.detach().cpu().clone() for k,t in get_peft_model_state_dict(model).items()}
    trainable=[t for n,t in model.named_parameters() if (".layers.20." in n or ".layers.21." in n) and (".lora_A." in n or ".lora_B." in n)]
    assert len(trainable)==16
    for t in trainable:
        t.requires_grad_(True)
    optimizer=torch.optim.AdamW(trainable,lr=.0001,weight_decay=0)
    order,rng=[],random.Random(SEED)
    for _ in range(2):
        part=list(range(64)); rng.shuffle(part); order.extend(part)
    logs=[]
    for step in range(32):
        optimizer.zero_grad(set_to_none=True)
        losses=[]
        for i in order[step*4:step*4+4]:
            q=p["queries"]["train"][i]
            keys=[token_key(tok,q,h,fmt,p["neutral_metadata"]) for h in (q["listed"],not q["listed"]) for fmt in TRAIN_FORMS]
            values=batch_scores(model,keys).reshape(2,len(TRAIN_FORMS))
            target=torch.tensor([q["teacher_correct"],q["teacher_wrong"]],device=values.device)[:,None].expand_as(values)
            distillation=F.mse_loss(values,target)
            rank=F.softplus(1-values[0,:,None]+values[1,None,:]).mean()
            loss=distillation+.2*rank
            (loss/4).backward()
            losses.append(float(loss.detach()))
        grad=float(torch.nn.utils.clip_grad_norm_(trainable,1))
        optimizer.step()
        logs.append({"step":step+1,"loss":sum(losses)/4,"gradient_norm":grad})
        print(json.dumps(logs[-1]),flush=True)
    model.requires_grad_(False)
    final=get_peft_model_state_dict(model)
    changed=[k for k in final if not torch.equal(final[k].detach().cpu(),initial[k])]
    assert len(changed)==16 and all(".layers.20." in k or ".layers.21." in k for k in changed)
    model.save_pretrained(out/"adapter")
    shutil.copyfile(a.home/"foundation/tokenizer.json",out/"adapter/tokenizer.json")
    after=evaluate(model,tok,p["queries"]["holdout"],p["neutral_metadata"])
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
            failures.append(f"cross_format/{kind} below65%: {stats['accuracy']}")
    save(a.plan/"repair-result.json",{"pass":not failures,"failures":failures,"steps":logs,"changed_tensors":changed,
         "unchanged_saved_tensors":178-len(changed),"checkpoint_sha256":sha(out/"adapter/adapter_model.safetensors"),
         "scope":"Bounded HF source-only distillation test, max512; no full corpus training or reserved score"})
    print(json.dumps({"pass":not failures,"failures":failures}),flush=True)


if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("mode",choices=("prepare","run"))
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    a=ap.parse_args()
    (prepare if a.mode=="prepare" else run)(a)
