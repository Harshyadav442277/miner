"""V30: training-only primary-claim quality, attention-only LoRA updates."""
import argparse
import json
from pathlib import Path
import random
import shutil

import torch
import torch.nn.functional as F
from peft import get_peft_model_state_dict, set_peft_model_state_dict
from tokenizers import Tokenizer

from collect_miners import save
from distill_source_representations import evaluate
from factual_role_annotations import compile_binding
from hf_reward_diagnostics import load_model, batch_scores
from repair_scope_negation import sha

SEED = 2120261103


def prepare(a):
    evidence = Path(__file__).parent / "evidence"
    source = evidence / "v26-plan/frozen-inputs.json"
    p = json.loads(source.read_text())
    annotated = json.loads((source.parent / "annotation-audit.json").read_text())
    assert annotated["pass"] and annotated["inputs_sha256"] == sha(source)
    verified_path = evidence / "v27-plan/independent-source-audit.json"
    verified = json.loads(verified_path.read_text())
    assert verified["pass"] and verified["inputs_sha256"] == sha(evidence / "v27-plan/frozen-inputs.json")
    facts_path = evidence / "hard-fact-replay-plan/frozen-facts.json"
    facts = json.loads(facts_path.read_text())
    assert p["hard_facts_sha256"] == sha(facts_path)
    for name in ("sdn", "alt"):
        assert sha(a.home / f"data/sanctions/{name}.csv") == facts[f"{name}_sha256"]
    assert sha(a.home / "pairs/sanctions_v13_reference/train.jsonl") == facts["source_train_sha256"]
    assert sha(a.home / "pairs/sanctions_v13_reference/val.jsonl") == p["source_val_sha256"]
    p["train"] = [q for q in p["train"] if q["curriculum"] == "replay"]
    p.pop("role_validation", None)
    p.pop("auxiliary_lr", None)
    assert len(p["train"]) == 64 and all(q["teacher_correct"] > q["teacher_wrong"] for q in p["train"])
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    p["binding"] = compile_binding(tok, p["train"], p["neutral_metadata"], SEED+2)
    assert len(p["binding"]) == 32
    for q in p["train"] + p["binding"]:
        for v in q["views"]:
            value = tok.decode([v["ids"][i] for i in v["primary_positions"]]).strip()
            assert value in (("true", "MATCH") if v["claimed_match"] else ("false", "NO MATCH"))
            assert len(v["ids"]) <= 512
    p["v26_inputs_sha256"] = sha(source)
    p["source_audit_sha256"] = sha(verified_path)
    p["baseline_sha256"] = sha(source.parent / "before.json")
    names = ("probe_primary_quality.py", "factual_role_annotations.py", "distill_source_representations.py", "hf_reward_diagnostics.py")
    p["dependencies"] = {n: sha(Path(__file__).parent/n) for n in names}
    p["scope"] = "64 parent-thin-correct source facts,32 updates, attention-only. Shared existing head on primary spans is TRAINING ONLY. Same96 paired DEVELOPMENT, no independent-test claim."
    a.plan.mkdir(exist_ok=False)
    save(a.plan / "frozen-inputs.json", p)
    save(a.plan / "source-annotation-audit.json", {"pass": True, "inputs_sha256": sha(a.plan / "frozen-inputs.json"),
         "training_queries": 64, "paired_development_queries": 96, "binding_rows": 32,
         "primary_spans_decoded": True, "source_audit_reused_sha256": sha(verified_path),
         "scope": "Hash-bound subset of independently source-audited facts; inherited exact-token annotations, new binding spans independently decoded. No labels in input."})
    print(json.dumps({"source_queries": 64, "steps": 32, "trainable_attention_tensors": 88}), flush=True)


def quality_loss(model, q, box):
    values = batch_scores(model, [tuple(v["ids"]) for v in q["views"]])
    hidden = box["hidden"]
    pooled = torch.stack([hidden[i, v["primary_positions"]].mean(0) for i, v in enumerate(q["views"])])
    base = model.get_base_model()
    # The SAME frozen head gets an additional training gradient at primary spans.
    local = base.classifier(base.drop(base.head(pooled))).squeeze(-1)
    good = torch.tensor([v["is_correct"] for v in q["views"]], device=values.device)
    assert bool(good.any()) and bool((~good).any())
    global_loss = F.softplus(values[~good][None, :] - values[good][:, None]).mean()
    local_loss = F.softplus(local[~good][None, :] - local[good][:, None]).mean()
    return global_loss + .5*local_loss


def run(a):
    p = json.loads((a.plan / "frozen-inputs.json").read_text())
    assert all(sha(Path(__file__).parent/n) == h for n, h in p["dependencies"].items())
    audit = json.loads((a.plan / "source-annotation-audit.json").read_text())
    assert audit["pass"] and audit["inputs_sha256"] == sha(a.plan / "frozen-inputs.json")
    source = Path(__file__).parent / "evidence/v26-plan"
    assert sha(source / "frozen-inputs.json") == p["v26_inputs_sha256"]
    assert sha(source / "before.json") == p["baseline_sha256"]
    before = json.loads((source / "before.json").read_text())
    save(a.plan / "before.json", before)
    out = a.home / "runs-v2/SANCTIONS_SCREENING_MATCH_v30"
    recovery = out / "recovery.pt"
    if out.exists():
        assert recovery.exists()
    else:
        out.mkdir()
    torch.manual_seed(SEED)
    model, tok, identity = load_model(a.home, 13)
    assert identity == p["parent"]
    initial = {k: v.detach().cpu().clone() for k, v in get_peft_model_state_dict(model).items()}
    params = [v for n, v in model.named_parameters() if ".attn." in n and (".lora_A." in n or ".lora_B." in n)]
    assert len(params) == 88 and sum(v.numel() for v in params) == 811008
    for v in params:
        v.requires_grad_(True)
    probe = [tuple(v["ids"]) for v in p["train"][0]["views"]]
    with torch.no_grad():
        eval_values = batch_scores(model, probe).cpu()
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    model.enable_input_require_grads()
    model.train()
    for module in model.modules():
        if isinstance(module, torch.nn.Dropout):
            module.p = 0.
    with torch.no_grad():
        mode_error = float((batch_scores(model, probe).cpu() - eval_values).abs().max())
    assert mode_error < .001
    save(a.plan / "training-forward-check.json", {"max_abs_eval_train_difference": mode_error,
         "trainable_tensors": 88, "trainable_parameters": 811008, "head_and_mlp_frozen": True,
         "baseline_reused_sha256": p["baseline_sha256"], "scope": "Extra local pooling exists only in training loss."})
    box = {}
    def capture(module, args, output):
        box["hidden"] = output.last_hidden_state if hasattr(output, "last_hidden_state") else output[0]
    hook = model.get_base_model().model.register_forward_hook(capture)
    optimizer = torch.optim.AdamW(params, lr=.0001, weight_decay=0)
    rng = random.Random(SEED)
    groups = [[i for i, q in enumerate(p["train"]) if q["source_form"] == k] for k in ("primary", "alias", "absent")]
    assert list(map(len, groups)) == [16, 16, 32]
    order = []
    for epoch in range(2):
        for group in groups:
            rng.shuffle(group)
        for i in range(16):
            order.extend([groups[0][i], groups[1][i], *groups[2][2*i:2*i+2]])
    logs = []
    start = 0
    if recovery.exists():
        state = torch.load(recovery, map_location="cpu", weights_only=True)
        assert state["inputs_sha256"] == sha(a.plan / "frozen-inputs.json")
        set_peft_model_state_dict(model, state["weights"], adapter_name="default")
        optimizer.load_state_dict(state["optimizer"])
        torch.set_rng_state(state["cpu_rng"])
        torch.cuda.set_rng_state_all(state["cuda_rng"])
        start, logs = state["step"], state["logs"]
        assert len(logs) == start and 0 < start <= 32
    for step in range(start, 32):
        optimizer.zero_grad(set_to_none=True)
        losses = []
        for i in order[4*step:4*step+4]:
            loss = quality_loss(model, p["train"][i], box)
            (loss/4).backward()
            losses.append(float(loss.detach()))
            box.clear()
        binding = quality_loss(model, p["binding"][step], box)
        (.25*binding).backward()
        box.clear()
        grad = float(torch.nn.utils.clip_grad_norm_(params, 1))
        optimizer.step()
        logs.append({"step": step+1, "loss": sum(losses)/4+.25*float(binding.detach()), "gradient_norm": grad})
        print(json.dumps(logs[-1]), flush=True)
        if (step+1)%4 == 0:
            tmp = out / "recovery.pt.tmp"
            torch.save({"step": step+1, "logs": logs, "inputs_sha256": sha(a.plan / "frozen-inputs.json"),
                        "weights": {k: v.detach().cpu() for k, v in get_peft_model_state_dict(model).items()},
                        "optimizer": optimizer.state_dict(), "cpu_rng": torch.get_rng_state(),
                        "cuda_rng": torch.cuda.get_rng_state_all()}, tmp)
            tmp.replace(recovery)
    hook.remove()
    model.eval().requires_grad_(False)
    final = get_peft_model_state_dict(model)
    changed = [k for k, v in final.items() if not torch.equal(v.cpu(), initial[k])]
    unchanged = [k for k in final if k not in changed]
    assert len(final) == 178 and len(unchanged) >= 90
    assert all(".attn." in k for k in changed)
    model.save_pretrained(out / "adapter")
    shutil.copyfile(a.home / "foundation/tokenizer.json", out / "adapter/tokenizer.json")
    after = evaluate(model, tok, p["validation"], p["neutral_metadata"])
    save(a.plan / "after.json", after)
    failures = []
    for fmt, classes in after["by_format"].items():
        for kind, s in classes.items():
            if s["accuracy"] < .65:
                failures.append(f"{fmt}/{kind} below65%")
        if fmt == "thin_json":
            for kind in ("listed", "absent"):
                if classes[kind]["accuracy"] < before["by_format"][fmt][kind]["accuracy"]-.05:
                    failures.append(f"thin_json/{kind} loss exceeds5pp")
    for kind, s in after["cross_format"].items():
        if s["accuracy"] < .65:
            failures.append(f"cross_format/{kind} below65%")
    save(a.plan / "repair-result.json", {"pass": not failures, "failures": failures, "steps": logs,
         "changed_tensors": changed, "unchanged_saved_tensors": unchanged,
         "checkpoint_sha256": sha(out / "adapter/adapter_model.safetensors"),
         "scope": "Training-only local-quality supervision, standard178-tensor ordinary inference. Paired DEVELOPMENT, no full-corpus or readiness claim."})
    print(json.dumps({"pass": not failures, "failures": failures}), flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=("prepare", "run"))
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--plan", type=Path, required=True)
    args = ap.parse_args()
    (prepare if args.mode == "prepare" else run)(args)
