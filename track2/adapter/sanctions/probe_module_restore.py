"""Fixed head/MLP tensor-restoration diagnosis; paired development, no training."""
import argparse
import json
from pathlib import Path
import shutil

import torch
from peft import get_peft_model_state_dict,set_peft_model_state_dict
from safetensors.torch import load_file

from collect_miners import save
from distill_source_representations import evaluate
from hf_reward_diagnostics import load_model
from repair_scope_negation import sha


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    ap.add_argument("--version",type=int,required=True)
    ap.add_argument("--restore",choices=("head","mlp_head"),required=True)
    a=ap.parse_args()
    a.plan.mkdir(exist_ok=False)
    evidence=Path(__file__).parent/"evidence"
    source=evidence/"v22-plan/frozen-inputs.json"
    p=json.loads(source.read_text())
    baseline=json.loads((source.parent/"before.json").read_text())
    model,tok,identity=load_model(a.home,22)
    weights=get_peft_model_state_dict(model)
    original={k:v.detach().cpu().clone() for k,v in weights.items()}
    parent_path=a.home/"runs-v2/SANCTIONS_SCREENING_MATCH_v13/adapter/adapter_model.safetensors"
    parent=load_file(str(parent_path))
    restored=[k for k in weights if "classifier" in k or (a.restore=="mlp_head" and ".mlp." in k)]
    assert len(restored)==(90 if a.restore=="mlp_head" else 2)
    for k in restored:
        weights[k]=parent[k]
    set_peft_model_state_dict(model,weights,adapter_name="default")
    actual=get_peft_model_state_dict(model)
    assert len(actual)==178
    assert all(torch.equal(v.cpu(),parent[k] if k in restored else original[k]) for k,v in actual.items())
    if a.restore=="mlp_head":
        assert all(".attn." in k for k in actual if k not in restored)
    save(a.plan/"frozen-protocol.json",{"base_adapter":identity,"restored_version":13,
         "restored_checkpoint_sha256":sha(parent_path),"restored_tensors":restored,
         "retained_tensors":178-len(restored),"source_inputs_sha256":sha(source),
         "scope":"Fixed module restoration. No optimization. Same v22 paired DEVELOPMENT cohort, not an independent test."})
    out=a.home/f"runs-v2/SANCTIONS_SCREENING_MATCH_v{a.version}/adapter"
    out.mkdir(parents=True,exist_ok=False)
    model.save_pretrained(out)
    shutil.copyfile(a.home/"foundation/tokenizer.json",out/"tokenizer.json")
    after=evaluate(model,tok,p["validation"],p["neutral_metadata"])
    save(a.plan/"after.json",after)
    failures=[]
    for fmt,classes in after["by_format"].items():
        for kind,s in classes.items():
            if s["accuracy"]<.65:
                failures.append(f"{fmt}/{kind} below65%: {s['accuracy']}")
        if fmt=="thin_json":
            for kind in ("listed","absent"):
                if classes[kind]["accuracy"]<baseline["by_format"][fmt][kind]["accuracy"]-.05:
                    failures.append(f"thin_json/{kind} loss exceeds5pp")
    for kind,s in after["cross_format"].items():
        if s["accuracy"]<.65:
            failures.append(f"cross_format/{kind} below65%")
    save(a.plan/"repair-result.json",{"pass":not failures,"failures":failures,
         "checkpoint_sha256":sha(out/"adapter_model.safetensors"),
         "scope":"Paired DEVELOPMENT module-restoration diagnosis, no optimization/readiness claim"})
    print(json.dumps({"pass":not failures,"failures":failures}),flush=True)


if __name__=="__main__":
    main()
