"""HF float32 class breakdown; diagnostic only, never an actual-node claim."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import torch
from tokenizers import Tokenizer

from binding_benchmark import render
from collect_miners import save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--version", type=int, required=True)
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    sys.path.insert(0, str(a.home / "kit-v2"))
    from float_runtime import train_adapter as kit
    from peft import get_peft_model_state_dict, set_peft_model_state_dict
    from peft.utils.save_and_load import load_peft_weights
    hp = kit.Hyperparams(lora_rank=8, lora_alpha=32, max_length=256, grad_checkpointing=False)
    available = torch.cuda.is_available
    try:
        torch.cuda.is_available = lambda: False
        model, _ = kit.build_model(kit.DEFAULT_BASE, hp)
    finally:
        torch.cuda.is_available = available
    weights = load_peft_weights(str(a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{a.version}/adapter"), device="cpu")
    set_peft_model_state_dict(model, weights, adapter_name="default")
    restored = get_peft_model_state_dict(model, adapter_name="default")
    assert set(restored) == set(weights)
    assert all(torch.equal(restored[k].detach().cpu(), weights[k].to(restored[k].dtype)) for k in weights)
    device = torch.device("cuda" if available() else "cpu")
    model.to(device=device, dtype=torch.float32).eval().requires_grad_(False)
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    tok.enable_truncation(max_length=256)
    rows = [json.loads(l) for l in a.data.read_text(encoding="utf-8").splitlines()]
    totals, correct, cache = {True: 0, False: 0}, {True: 0, False: 0}, {}
    with torch.inference_mode():
        for row in rows:
            scores = []
            for side in ("chosen", "rejected"):
                key = tuple(tok.encode(render(row["prompt"], row[side])).ids)
                if key not in cache:
                    ids = torch.tensor([key], dtype=torch.long, device=device)
                    cache[key] = model(input_ids=ids, attention_mask=torch.ones_like(ids)).logits.item()
                scores.append(cache[key])
            truth = row["listed"]
            totals[truth] += 1
            correct[truth] += int(scores[0] > scores[1])
    result = {"version": a.version, "precision": "HF float32, singleton inputs, pinned tokenizer256",
              "input_sha256": hashlib.sha256(a.data.read_bytes()).hexdigest(),
              "pairs": len(rows), "correct": sum(correct.values()), "accuracy": sum(correct.values())/len(rows),
              "by_membership": {str(t): {"pairs": totals[t], "correct": correct[t],
                                        "accuracy": correct[t]/totals[t]} for t in totals},
              "scope": "Synthetic diagnostic only. Positive facts are present in v13 training; v3 has partial inherited exposure. Negative identities split from v13 training. Not actual-node or external-answer accuracy."}
    save(a.out, result)
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
