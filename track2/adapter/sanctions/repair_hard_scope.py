"""V17: fixed-budget source-anchor coverage intervention, no external answers."""
import argparse
import gc
import json
from pathlib import Path
import random
import shutil

import torch
import torch.nn.functional as F
from peft import get_peft_model_state_dict

from build_pairs import load, norm
from collect_miners import save, snapshot_index
from hf_reward_diagnostics import load_model, score_keys, batch_scores
from repair_scope_negation import FORMS, key, evaluate, sha

SEED = 2020261103


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
    exclude(json.loads((evidence / "listed-recall-diagnosis/frozen-protocol.json").read_text())["queries"])
    old = json.loads((evidence / "v16-plan/frozen-inputs.json").read_text())
    for qs in old["queries"].values():
        exclude(qs)
    for rel in old["external_query_files"]:
        qs = json.loads((evidence / rel).read_text())
        exclude(qs)
        ids.update(i for q in qs for i in q["sdn_ids"])
    source = a.home / "pairs/sanctions_v13_reference"
    def pool(split, limit):
        rows = [json.loads(l) for l in (source / f"{split}.jsonl").read_text().splitlines()]
        random.Random(SEED).shuffle(rows)
        groups = {k: [] for k in ("primary", "alias", "absent")}
        seen = set()
        for r in rows:
            n, hit = norm(r["query_name"]), r["listed"]
            found = set(index.get(n, []))
            assert bool(found) == hit
            if n in names or n in seen or found & ids:
                continue
            kind = "absent" if not hit else "primary" if n == norm(entries[r["sdn_entity_id"]]["name"]) else "alias"
            if len(groups[kind]) >= limit[kind]:
                continue
            q = {"name": r["query_name"], "listed": hit, "source_form": kind,
                 "prompt": r["prompt"], "sdn_ids": sorted(found), "provenance": r["provenance"]}
            groups[kind].append(q)
            seen.add(n)
        return groups
    test = pool("test", {"primary": 96, "alias": 96, "absent": 192})
    holdout = []
    for kind, count in (("primary", 32), ("alias", 32), ("absent", 64)):
        for q in test[kind]:
            if set(q["sdn_ids"]) & ids:
                continue
            holdout.append(q)
            exclude([q])
            count -= 1
            if not count:
                break
        assert not count
    save(a.plan / "holdout-before-scores.json", {"seed": SEED, "queries": holdout,
         "source_test_sha256": sha(source / "test.jsonl"), "scope": "Unconditioned fresh synthetic holdout, frozen before anchor scores"})
    pools = pool("train", {"primary": 512, "alias": 512, "absent": 256})
    model, tok, identity = load_model(a.home, 13)
    candidates = sum(pools.values(), [])
    scores = score_keys(model, [key(tok, q, h, fmt) for q in candidates
                               for fmt in ("thin_json", "qualified_prose") for h in (True, False)])
    selected = []
    counts = {}
    for kind, count in (("primary", 16), ("alias", 16), ("absent", 32)):
        eligible = []
        for q in pools[kind]:
            good, bad = q["listed"], not q["listed"]
            margins = {fmt: scores[key(tok, q, good, fmt)]-scores[key(tok, q, bad, fmt)]
                       for fmt in ("thin_json", "qualified_prose")}
            if margins["thin_json"] > 0 and (margins["qualified_prose"] < 0 if good else margins["qualified_prose"] > 0):
                eligible.append({**q, "parent_margins": margins,
                    "teacher_thin_correct": scores[key(tok, q, good, "thin_json")],
                    "teacher_thin_wrong": scores[key(tok, q, bad, "thin_json")]})
        counts[kind] = len(eligible)
        if kind == "absent":
            eligible.sort(key=lambda q: min(q["parent_margins"].values()))
        for q in eligible:
            if norm(q["name"]) in names or set(q["sdn_ids"]) & ids:
                continue
            selected.append(q)
            exclude([q])
            count -= 1
            if not count:
                break
        assert not count, (kind, count, counts)
    for q in selected+holdout:
        for fmt in FORMS:
            for hit in (True, False):
                key(tok, q, hit, fmt)
    dependencies = ("repair_hard_scope.py", "repair_scope_negation.py", "hf_reward_diagnostics.py", "diagnose_fact_formats.py")
    save(a.plan / "frozen-inputs.json", {"seed": SEED, "parent": identity, "queries": {"train": selected, "holdout": holdout},
         "source_train_sha256": sha(source / "train.jsonl"), "source_test_sha256": sha(source / "test.jsonl"),
         "sdn_sha256": sha(sdn), "alt_sha256": sha(alt), "mined_candidates": len(candidates), "eligible_hard_anchors": counts,
         "dependencies": {f: sha(Path(__file__).parent / f) for f in dependencies},
         "scope": "One data-selection intervention; same fixed32-step optimizer recipe. No external answers."})
    print(json.dumps({"anchors": len(selected), "holdout": len(holdout), "eligible": counts}), flush=True)


def run(a):
    p = json.loads((a.plan / "frozen-inputs.json").read_text())
    assert all(sha(Path(__file__).parent/f) == value for f, value in p["dependencies"].items())
    out = a.home / "runs-v2/SANCTIONS_SCREENING_MATCH_v17"
    out.mkdir(exist_ok=False)
    torch.manual_seed(SEED)
    model, tok, identity = load_model(a.home, 13)
    assert identity == p["parent"]
    diagnosis = Path(__file__).parent / "evidence/listed-recall-diagnosis/frozen-protocol.json"
    groups = {"holdout": p["queries"]["holdout"], "development": json.loads(diagnosis.read_text())["queries"]}
    before = evaluate(model, tok, groups)
    save(a.plan / "before.json", before)
    initial = {k: t.detach().cpu().clone() for k, t in get_peft_model_state_dict(model).items()}
    trainable = [p for n, p in model.named_parameters() if (".layers.20." in n or ".layers.21." in n) and (".lora_A." in n or ".lora_B." in n)]
    assert len(trainable) == 16
    for param in trainable:
        param.requires_grad_(True)
    optimizer = torch.optim.AdamW(trainable, lr=.0001, weight_decay=0)
    order, rng = [], random.Random(SEED)
    for _ in range(2):
        part = list(range(64))
        rng.shuffle(part)
        order.extend(part)
    logs = []
    for step in range(32):
        optimizer.zero_grad(set_to_none=True)
        losses = []
        for i in order[step*4:step*4+4]:
            q = p["queries"]["train"][i]
            values = batch_scores(model, [key(tok,q,h,fmt) for h in (q["listed"],not q["listed"]) for fmt in FORMS]).reshape(2,4)
            rank = F.softplus(1-values[0,:,None]+values[1,None,:]).mean()
            teacher = torch.tensor([q["teacher_thin_correct"],q["teacher_thin_wrong"]],device=values.device)
            loss = rank+.1*values.var(dim=1,unbiased=False).mean()+.2*F.mse_loss(values[:,0],teacher)
            (loss/4).backward()
            losses.append(float(loss.detach()))
        grad = float(torch.nn.utils.clip_grad_norm_(trainable,1))
        optimizer.step()
        logs.append({"step":step+1,"loss":sum(losses)/4,"gradient_norm":grad})
        print(json.dumps(logs[-1]),flush=True)
    model.requires_grad_(False)
    final = get_peft_model_state_dict(model)
    changed = [k for k in final if not torch.equal(final[k].detach().cpu(),initial[k])]
    assert len(changed)==16 and all(".layers.20." in k or ".layers.21." in k for k in changed)
    model.save_pretrained(out/"adapter")
    shutil.copyfile(a.home/"foundation/tokenizer.json",out/"adapter/tokenizer.json")
    after = evaluate(model,tok,groups)
    save(a.plan/"after.json",after)
    failures=[]
    for fmt,classes in after["holdout"]["by_format"].items():
        for kind in ("listed","absent"):
            value=classes[kind]["accuracy"]
            if value<.65:
                failures.append(f"holdout/{fmt}/{kind} below65%: {value}")
            if fmt=="thin_json" and value<before["holdout"]["by_format"][fmt][kind]["accuracy"]-.05:
                failures.append(f"holdout/thin_json/{kind} loss exceeds5pp")
    save(a.plan/"repair-result.json",{"pass":not failures,"failures":failures,"steps":logs,"changed_tensors":changed,
         "unchanged_saved_tensors":178-len(changed),"checkpoint_sha256":sha(out/"adapter/adapter_model.safetensors"),
         "scope":"HF synthetic repair only; no export, actual-node, reserved-body or submission claim"})
    print(json.dumps({"pass":not failures,"failures":failures}),flush=True)


if __name__ == "__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("mode",choices=("prepare","run"))
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    a=ap.parse_args()
    (prepare if a.mode=="prepare" else run)(a)
