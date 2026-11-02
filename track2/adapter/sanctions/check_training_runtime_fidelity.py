"""Compare HF float32 and cached actual-node scores on exactly the same token IDs."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
import torch
from tokenizers import Tokenizer

from binding_benchmark import render
from collect_miners import save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--versions", default="3,12")
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    sys.path.insert(0, str(a.home / "kit-v2"))
    from float_runtime import train_adapter as kit
    from peft import get_peft_model_state_dict, set_peft_model_state_dict
    from peft.utils.save_and_load import load_peft_weights
    hp = kit.Hyperparams(lora_rank=8, lora_alpha=32, max_length=256, grad_checkpointing=False)
    available = torch.cuda.is_available
    try:
        # Load base weights directly in fp32, rather than rounding through bf16 first.
        torch.cuda.is_available = lambda: False
        model, _ = kit.build_model(kit.DEFAULT_BASE, hp)
    finally:
        torch.cuda.is_available = available
    device = torch.device("cuda" if available() else "cpu")
    model.to(device=device, dtype=torch.float32).eval()
    model.requires_grad_(False)
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    tok.enable_truncation(max_length=256)
    pairs = [json.loads(l) for l in (a.capture / "pairs.jsonl").read_text(encoding="utf-8").splitlines()]
    keys = [(tuple(tok.encode(render(p["prompt"], p["chosen"])).ids),
             tuple(tok.encode(render(p["prompt"], p["rejected"])).ids)) for p in pairs]
    results = {}
    for version in map(int, a.versions.split(",")):
        run = a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{version}"
        recorded = json.loads((a.capture / f"v{version}-node-scores.json").read_text(encoding="utf-8"))
        assert recorded["pairs_sha256"] == hashlib.sha256((a.capture / "pairs.jsonl").read_bytes()).hexdigest()
        weights = load_peft_weights(str(run / "adapter"), device="cpu")
        set_peft_model_state_dict(model, weights, adapter_name="default")
        loaded = get_peft_model_state_dict(model, adapter_name="default")
        assert set(loaded) == set(weights)
        assert all(torch.equal(loaded[k].cpu(), weights[k]) for k in weights)
        node = {}
        for (c, r), row in zip(keys, recorded["rows"], strict=True):
            for key, side in ((c, "chosen"), (r, "rejected")):
                if key in node:
                    assert node[key] == row[side]["value"]
                node[key] = row[side]["value"]
        hf = {}
        with torch.inference_mode():
            for key in node:
                ids = torch.tensor([key], dtype=torch.long, device=device)
                hf[key] = model(input_ids=ids, attention_mask=torch.ones_like(ids)).logits.item()
        agreement = sum((hf[c] > hf[r]) == row["correct"] for (c, r), row in zip(keys, recorded["rows"]))
        xs, ys = np.array(list(node.values())), np.array([hf[k] for k in node])
        result = {"version": version, "unique_inputs": len(node), "pairs": len(pairs),
                  "node_correct": sum(r["correct"] for r in recorded["rows"]),
                  "hf_correct": sum(hf[c] > hf[r] for c, r in keys),
                  "ordering_agreement": agreement/len(pairs),
                  "pearson": float(np.corrcoef(xs, ys)[0, 1]),
                  "max_abs_score_difference": float(np.abs(xs-ys).max()),
                  "rows": [{"name": p["name"], "hf_chosen": hf[c], "hf_rejected": hf[r],
                            "node_chosen": node[c], "node_rejected": node[r]}
                           for p, (c, r) in zip(pairs, keys)]}
        results[str(version)] = result
        print(json.dumps({k:v for k,v in result.items() if k != "rows"}), flush=True)
    save(a.out, {"precision": "HF float32; original base/checkpoint weights loaded without bf16 conversion",
                 "inputs": "exact same pinned-tokenizer IDs used by actual node", "versions": results})


if __name__ == "__main__":
    main()
