"""One frozen, bounded LoRA repair. No inference transform or external answers."""
import argparse
import hashlib
import json
from pathlib import Path
import random
import shutil

import torch
import torch.nn.functional as F

from binding_benchmark import render
from build_pairs import load, norm
from collect_miners import save, snapshot_index
from diagnose_fact_formats import answer, FORMATS
from hf_reward_diagnostics import load_model, score_keys, batch_scores

SEED = 1920261103
FORMS = ("thin_json", "scope_prose", "qualified_json", "qualified_prose")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def response(q, hit, fmt):
    if fmt == "thin_json":
        return answer(q, hit, fmt)
    if fmt == "scope_prose":
        return f"{q}: {'An exact name entry was found' if hit else 'No exact name entry was found'} in the OFAC SDN snapshot. A name result does not verify identity."
    if fmt == "qualified_json":
        return json.dumps({"name": q, "matched": hit, "scope": "Name membership only; no identity verification or ownership determination."})
    if fmt == "qualified_prose":
        return f"Exact SDN name result for {q}: {'MATCH' if hit else 'NO MATCH'}. This lookup does not establish identity or ownership."
    return answer(q, hit, fmt)


def key(tok, q, hit, fmt):
    ids = tuple(tok.encode(render(q["prompt"], response(q["name"], hit, fmt))).ids)
    assert len(ids) <= 256
    return ids


def prepare(a):
    a.plan.mkdir(parents=True, exist_ok=False)
    source = a.home / "pairs/sanctions_v13_reference/train.jsonl"
    sdn, alt = [a.home / f"data/sanctions/{n}.csv" for n in ("sdn", "alt")]
    entries = {e["id"]: e for e in load(str(sdn), str(alt))}
    _, index = snapshot_index(sdn.read_bytes(), alt.read_bytes())
    excluded_names, excluded_ids = set(), set()
    evidence = Path(__file__).parent / "evidence"
    query_files = [evidence / p for p in (
        "2026-11-01-miners-r1/queries.json", "2026-11-01-miners-fresh/queries.json",
        "v7-plan/queries.json", "v8-plan/bank-queries.json", "v9-plan/queries.json",
        "removals-plan/queries.json")]
    diagnosis = json.loads((evidence / "listed-recall-diagnosis/frozen-protocol.json").read_text())
    for q in diagnosis["queries"]:
        excluded_names.add(norm(q["name"]))
        excluded_ids.update(index.get(norm(q["name"]), []))
    for file in query_files:
        for q in json.loads(file.read_text()):
            excluded_names.add(norm(q["name"]))
            excluded_ids.update(q["sdn_ids"])
    candidates, seen = {k: [] for k in ("primary", "alias", "absent")}, set()
    rows = [json.loads(line) for line in source.read_text(encoding="utf-8").splitlines()]
    random.Random(SEED).shuffle(rows)
    for r in rows:
        name, hit = r["query_name"], r["listed"]
        name_key = norm(name)
        ids = set(index.get(name_key, []))
        assert bool(ids) == hit
        if name_key in excluded_names or ids & excluded_ids or name_key in seen:
            continue
        kind = "absent" if not hit else "primary" if name_key == norm(entries[r["sdn_entity_id"]]["name"]) else "alias"
        if len(candidates[kind]) >= 96:
            continue
        candidates[kind].append({"name": name, "listed": hit, "prompt": r["prompt"],
                                 "source_form": kind, "sdn_ids": sorted(ids), "provenance": r["provenance"]})
        seen.add(name_key)
    model, tok, identity = load_model(a.home, 13)
    all_q = sum(candidates.values(), [])
    teacher = score_keys(model, [key(tok, q, h, "thin_json") for q in all_q for h in (True, False)])
    selected, used_ids = {}, set()
    for split in ("train", "validation"):
        selected[split] = []
        for kind, n in (("primary", 16), ("alias", 16), ("absent", 32)):
            for q in candidates[kind]:
                if set(q["sdn_ids"]) & used_ids or norm(q["name"]) in excluded_names:
                    continue
                good = teacher[key(tok, q, q["listed"], "thin_json")]
                bad = teacher[key(tok, q, not q["listed"], "thin_json")]
                if good <= bad:
                    continue
                q = {**q, "teacher_thin_correct": good, "teacher_thin_wrong": bad}
                for fmt in FORMS:
                    for hit in (True, False):
                        key(tok, q, hit, fmt)
                selected[split].append(q)
                used_ids.update(q["sdn_ids"])
                excluded_names.add(norm(q["name"]))
                n -= 1
                if not n:
                    break
            assert n == 0, (split, kind, n)
    save(a.plan / "frozen-inputs.json", {"seed": SEED, "parent": identity, "source_sha256": sha(source),
         "sdn_sha256": sha(sdn), "alt_sha256": sha(alt), "script_sha256": sha(Path(__file__)),
         "external_query_files": {str(p.relative_to(evidence)): sha(p) for p in query_files},
         "forms": FORMS, "steps": 32, "lr": .0001, "max_tokens": 256,
         "queries": selected, "scope": "Thin-correct conditional source-training anchors; disjoint repair/validation entities. No external answers."})
    print(json.dumps({"frozen": str(a.plan), "queries": {k: len(v) for k, v in selected.items()}}), flush=True)


def evaluate(model, tok, groups):
    forms = tuple(dict.fromkeys((*FORMS, *FORMATS)))
    keys = {(group, i, fmt, hit): key(tok, q, hit, fmt)
            for group, qs in groups.items() for i, q in enumerate(qs) for fmt in forms for hit in (True, False)}
    scores = score_keys(model, keys.values())
    result = {}
    for group, qs in groups.items():
        rows, stats = [], {}
        for i, q in enumerate(qs):
            values = {fmt: {"correct_score": scores[keys[group, i, fmt, q["listed"]]],
                            "wrong_score": scores[keys[group, i, fmt, not q["listed"]]]} for fmt in forms}
            rows.append({**q, "forms": values})
        for fmt in forms:
            stats[fmt] = {}
            for kind in ("listed", "absent", "primary", "alias"):
                part = [r for r in rows if (r["listed"] if kind == "listed" else not r["listed"] if kind == "absent" else r["source_form"] == kind)]
                correct = sum(r["forms"][fmt]["correct_score"] > r["forms"][fmt]["wrong_score"] for r in part)
                stats[fmt][kind] = {"queries": len(part), "correct": correct, "accuracy": correct/len(part)}
        cross = {kind: {"queries": sum(q["listed"] == hit for q in qs), "correct": 0, "pairs": 0}
                 for kind, hit in (("listed", True), ("absent", False))}
        for row in rows:
            target = cross["listed" if row["listed"] else "absent"]
            for good in forms:
                for bad in forms:
                    target["pairs"] += 1
                    target["correct"] += row["forms"][good]["correct_score"] > row["forms"][bad]["wrong_score"]
        result[group] = {"by_format": stats, "cross_format": cross, "rows": rows}
    return result


def run(a):
    p = json.loads((a.plan / "frozen-inputs.json").read_text())
    assert p["script_sha256"] == sha(Path(__file__))
    out = a.home / "runs-v2/SANCTIONS_SCREENING_MATCH_v16"
    out.mkdir(exist_ok=False)
    torch.manual_seed(SEED)
    model, tok, identity = load_model(a.home, 13)
    assert identity == p["parent"]
    evidence = Path(__file__).parent / "evidence"
    diagnostic = json.loads((evidence / "listed-recall-diagnosis/frozen-protocol.json").read_text())["queries"]
    groups = {"validation": p["queries"]["validation"], "diagnostic": diagnostic}
    save(a.plan / "before.json", evaluate(model, tok, groups))
    from peft import get_peft_model_state_dict
    initial = {k: t.detach().cpu().clone() for k, t in get_peft_model_state_dict(model).items()}
    trainable = []
    for name, param in model.named_parameters():
        if ".layers.20." in name or ".layers.21." in name:
            if ".lora_A." in name or ".lora_B." in name:
                param.requires_grad_(True)
                trainable.append(name)
    assert len(trainable) == 16
    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=.0001, weight_decay=0)
    qs = p["queries"]["train"]
    sequence = []
    rng = random.Random(SEED)
    for _ in range(2):
        order = list(range(64))
        rng.shuffle(order)
        sequence.extend(order)
    logs = []
    for step in range(32):
        optimizer.zero_grad(set_to_none=True)
        losses = []
        for j in sequence[step*4:step*4+4]:
            q = qs[j]
            ids = [key(tok, q, h, fmt) for h in (q["listed"], not q["listed"]) for fmt in FORMS]
            values = batch_scores(model, ids).reshape(2, len(FORMS))
            rank = F.softplus(1-values[0, :, None]+values[1, None, :]).mean()
            consistency = values.var(dim=1, unbiased=False).mean()
            teacher = torch.tensor([q["teacher_thin_correct"], q["teacher_thin_wrong"]], device=values.device)
            retention = F.mse_loss(values[:, 0], teacher)
            loss = rank + .1*consistency + .2*retention
            (loss/4).backward()
            losses.append(float(loss.detach()))
        norm_grad = float(torch.nn.utils.clip_grad_norm_([p for p in model.parameters() if p.requires_grad], 1))
        optimizer.step()
        logs.append({"step": step+1, "loss": sum(losses)/4, "gradient_norm": norm_grad})
        print(json.dumps(logs[-1]), flush=True)
    model.requires_grad_(False)
    final = get_peft_model_state_dict(model)
    changed = [k for k in final if not torch.equal(final[k].detach().cpu(), initial[k])]
    assert changed and all(".layers.20." in k or ".layers.21." in k for k in changed)
    assert len(initial) == len(final) == 178
    adapter = out / "adapter"
    model.save_pretrained(adapter)
    shutil.copyfile(a.home / "foundation/tokenizer.json", adapter / "tokenizer.json")
    after = evaluate(model, tok, groups)
    save(a.plan / "after.json", after)
    before = json.loads((a.plan / "before.json").read_text())
    failures = []
    for group in groups:
        for fmt, classes in after[group]["by_format"].items():
            for kind in ("listed", "absent"):
                value = classes[kind]["accuracy"]
                if value < .65:
                    failures.append(f"{group}/{fmt}/{kind} below65%: {value}")
                if fmt == "thin_json" and value < before[group]["by_format"][fmt][kind]["accuracy"]-.05:
                    failures.append(f"{group}/thin_json/{kind} lost more than5pp")
    save(a.plan / "repair-result.json", {"pass": not failures, "failures": failures, "steps": logs,
         "changed_tensors": changed, "frozen_tensors_verified": 178-len(changed), "trainable_names": trainable,
         "checkpoint_sha256": sha(adapter / "adapter_model.safetensors"),
         "scope": "Bounded HF repair diagnostic only. No external answers, export, reserved scoring or submission."})
    print(json.dumps({"pass": not failures, "failures": failures}), flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=("prepare", "run"))
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--plan", type=Path, required=True)
    a = ap.parse_args()
    (prepare if a.mode == "prepare" else run)(a)
