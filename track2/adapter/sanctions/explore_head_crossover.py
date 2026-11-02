"""Development-only screening of two fixed encoder/head crossovers, no optimization."""
import argparse
import json
from pathlib import Path
import sys

import torch
from tokenizers import Tokenizer

from binding_benchmark import render
from collect_miners import save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    sys.path.insert(0, str(a.home / "kit-v2"))
    from float_runtime import train_adapter as kit
    from peft import set_peft_model_state_dict
    from peft.utils.save_and_load import load_peft_weights
    available = torch.cuda.is_available
    try:
        torch.cuda.is_available = lambda: False
        model, _ = kit.build_model(kit.DEFAULT_BASE, kit.Hyperparams(lora_rank=8, lora_alpha=32, grad_checkpointing=False))
    finally:
        torch.cuda.is_available = available
    model.to(device="cuda" if available() else "cpu", dtype=torch.float32).eval().requires_grad_(False)
    device = next(model.parameters()).device
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    tok.enable_truncation(max_length=256)
    pairs = [json.loads(l) for l in (a.capture / "pairs.jsonl").read_text(encoding="utf-8").splitlines()]
    keys = [(tuple(tok.encode(render(p["prompt"], p["chosen"])).ids),
             tuple(tok.encode(render(p["prompt"], p["rejected"])).ids)) for p in pairs]
    unique = list(dict.fromkeys(k for pair in keys for k in pair))
    positions = {k:i for i,k in enumerate(unique)}
    weights = {v:load_peft_weights(str(a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{v}/adapter"), device="cpu") for v in (3,8)}
    results = {}
    for encoder in (3,8):
        set_peft_model_state_dict(model, weights[encoder], adapter_name="default")
        vectors = []
        head = dict(model.named_modules())["base_model.model.classifier.modules_to_save.default"]
        handle = head.register_forward_pre_hook(lambda layer, args: vectors.append(args[0].detach().float().cpu()))
        with torch.inference_mode():
            for key in unique:
                ids = torch.tensor([key], dtype=torch.long, device=device)
                model(input_ids=ids, attention_mask=torch.ones_like(ids))
        handle.remove()
        features = torch.cat(vectors)
        assert features.shape == (len(unique),768)
        for classifier in (3,8):
            w = weights[classifier]["base_model.model.classifier.weight"].float()
            b = weights[classifier]["base_model.model.classifier.bias"].float()
            scores = torch.nn.functional.linear(features,w,b).squeeze(-1).tolist()
            correct = sum(scores[positions[c]] > scores[positions[r]] for c,r in keys)
            result = {"encoder":encoder,"head":classifier,"pairs":len(pairs),"hf_correct":correct,"hf_accuracy":correct/len(pairs),
                      "scope":"HF development screen only; requires export and actual-node verification"}
            if encoder == classifier:
                node = json.loads((a.capture / f"v{encoder}-node-scores.json").read_text(encoding="utf-8"))
                assert correct == sum(r["correct"] for r in node["rows"])
                difference = max(abs(scores[positions[key]]-row[side]["value"])
                                 for (c,r),row in zip(keys,node["rows"])
                                 for key,side in ((c,"chosen"),(r,"rejected")))
                assert difference < .002
                result["self_reference_max_abs_node_difference"] = difference
            results[f"encoder{encoder}_head{classifier}"] = result
            print(json.dumps(result),flush=True)
    save(a.out,{"fixed_candidates":"3-encoder/8-head and 8-encoder/3-head; no weight search or fitting", "results":results})


if __name__ == "__main__":
    main()
