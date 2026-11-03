"""Exact source-fixture spans for training-only factual/primary-verdict supervision."""
import json
import random
import re

from binding_benchmark import render
from distill_source_representations import token_key,TRAIN_FORMS
from build_pairs import norm


def annotate(tok,q,hit,fmt,neutral,seed):
    answer_name=q.get("answer_name",q["name"])
    if fmt=="thin_json":
        body=json.dumps({"name":answer_name,"matched":hit})
    else:
        meta=dict(neutral)
        while True:
            if fmt.startswith("json"):
                items=[("name",answer_name),("matched",hit),("reference",meta)]
                if fmt=="json_late":items[1:]=reversed(items[1:])
                body=json.dumps(dict(items))
            else:
                claim=f"OFAC SDN exact name lookup for {answer_name} returned {'MATCH' if hit else 'NO MATCH'}."
                context="Source information: "+json.dumps(meta)
                body=claim+" "+context if fmt=="prose_early" else context+" "+claim
            if len(tok.encode(render(q["prompt"],body)).ids)<=512:break
            assert meta;meta.pop(next(reversed(meta)))
    prefix=render(q["prompt"],"");text=prefix+body
    enc=tok.encode(text)
    assert tuple(enc.ids)==token_key(tok,{**q,"name":answer_name},hit,fmt,neutral)
    question=re.fullmatch(r"Screen (.+) against the OFAC SDN list\. Report name matches\.",q["prompt"])
    assert question and norm(question[1])==norm(q["name"])
    qstart=prefix.index(q["prompt"])+question.start(1)
    qend=prefix.index(q["prompt"])+question.end(1)
    if body.startswith("{"):
        assert json.loads(body)["matched"] is hit
        matches=list(re.finditer(r'"matched"\s*:\s*(true|false)',body))
        assert len(matches)==1
        start,end=matches[0].span(1)
    else:
        value="MATCH" if hit else "NO MATCH"
        start=body.rindex("returned ")+len("returned ");end=start+len(value)
        assert body[start:end]==value
    start+=len(prefix);end+=len(prefix)
    query=[i for i,(s,e) in enumerate(enc.offsets) if e>s and e>qstart and s<qend]
    primary=[i for i,(s,e) in enumerate(enc.offsets) if e>s and e>start and s<end]
    background=[i for i,(s,e) in enumerate(enc.offsets) if e>s and s>=len(prefix) and i not in primary]
    assert query and primary and background and not set(query)&set(primary)
    negations=[i for i in background if enc.tokens[i].lstrip("ĠĊ▁ ").lower() in ("no","not","false","true","match")]
    sampled=random.Random(seed).sample(background,min(8,len(background)))
    other=list(dict.fromkeys(negations+sampled))
    return {"ids":enc.ids,"query_positions":query,"primary_positions":primary,
            "role_positions":primary+other,"role_targets":[1 if hit else 2]*len(primary)+[0]*len(other),
            "claimed_match":hit,"format":fmt,"secondary_negations":len(negations),
            "answer_name":answer_name,"answer_is_same_query":q.get("answer_is_same_query",True),
            "is_correct":hit==q["listed"] and q.get("answer_is_same_query",True)}


def compile_queries(tok,qs,neutral,seed):
    return [{**q,"views":[annotate(tok,q,hit,fmt,neutral,seed+i*20+j)
             for j,(hit,fmt) in enumerate((h,f) for h in (q["listed"],not q["listed"]) for f in TRAIN_FORMS)]}
            for i,q in enumerate(qs)]


def compile_binding(tok,qs,neutral,seed):
    groups={True:[],False:[]};rng=random.Random(seed)
    for truth in (True,False):
        buckets={}
        for q in qs:
            if q["listed"]==truth:
                buckets.setdefault(len(tok.encode(render(q["prompt"],"")).ids),[]).append(q)
        pairs=[]
        for bucket in buckets.values():
            rng.shuffle(bucket)
            while len(bucket)>=2:
                a,b=bucket.pop(),bucket.pop()
                assert norm(a["name"])!=norm(b["name"])
                assert not set(a["sdn_ids"])&set(b["sdn_ids"])
                pairs.append((a,b))
        rng.shuffle(pairs);assert len(pairs)>=8
        for a,b in pairs[:8]:
            for q,other in ((a,b),(b,a)):
                good=annotate(tok,q,truth,"thin_json",neutral,seed)
                bad=annotate(tok,{**q,"answer_name":other["name"],"answer_is_same_query":False},truth,"thin_json",neutral,seed)
                groups[truth].append({**q,"other_name":other["name"],"views":[good,bad],
                                      "kind":"counterfactual_wrong_query_same_membership"})
    return [groups[truth][i] for i in range(16) for truth in (True,False)]


def auxiliary_losses(hidden,views,listed,query_head,role_head):
    import torch
    import torch.nn.functional as F
    pooled=torch.stack([hidden[i,v["query_positions"]].mean(0) for i,v in enumerate(views)])
    world_logits=query_head(pooled).squeeze(-1)
    truth=torch.full_like(world_logits,float(listed))
    world_loss=F.binary_cross_entropy_with_logits(world_logits,truth)
    roles=[]
    for i,v in enumerate(views):
        logits=role_head(hidden[i,v["role_positions"]])
        targets=torch.tensor(v["role_targets"],device=hidden.device)
        losses=F.cross_entropy(logits,targets,reduction="none")
        n=len(v["primary_positions"])
        roles.append(.5*losses[:n].mean()+.5*losses[n:].mean())
    return world_loss,torch.stack(roles).mean()


def supervised_loss(model,q,query_head,role_head,hidden_box):
    import torch
    import torch.nn.functional as F
    from hf_reward_diagnostics import batch_scores
    views=q["views"]
    values=batch_scores(model,[tuple(v["ids"]) for v in views])
    targets=torch.tensor([float(v["is_correct"]) for v in views],device=values.device)
    good,bad=values[targets==1],values[targets==0]
    assert len(good) and len(bad)
    world,roles=auxiliary_losses(hidden_box["value"],views,q["listed"],query_head,role_head)
    return F.binary_cross_entropy_with_logits(values,targets)+F.softplus(bad[None,:]-good[:,None]).mean()+.5*world+.5*roles
