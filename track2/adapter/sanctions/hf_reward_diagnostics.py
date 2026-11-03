"""Pinned float32 diagnostic model and masked batching; no inference score changes."""
import hashlib
from pathlib import Path
import sys

import torch
from tokenizers import Tokenizer


def load_model(home, version):
    sys.path.insert(0, str(home / "kit-v2"))
    from float_runtime import train_adapter as kit
    from peft import get_peft_model_state_dict, set_peft_model_state_dict
    from peft.utils.save_and_load import load_peft_weights
    available = torch.cuda.is_available
    try:
        torch.cuda.is_available = lambda: False
        model, _ = kit.build_model(kit.DEFAULT_BASE, kit.Hyperparams(lora_rank=8, lora_alpha=32, grad_checkpointing=False))
    finally:
        torch.cuda.is_available = available
    checkpoint = home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{version}/adapter/adapter_model.safetensors"
    weights = load_peft_weights(str(checkpoint.parent), device="cpu")
    set_peft_model_state_dict(model, weights, adapter_name="default")
    restored = get_peft_model_state_dict(model, adapter_name="default")
    assert set(restored) == set(weights)
    assert all(torch.equal(restored[k].cpu(), weights[k].to(restored[k].dtype)) for k in weights)
    model.to(device="cuda" if available() else "cpu", dtype=torch.float32).eval().requires_grad_(False)
    tok = Tokenizer.from_file(str(home / "foundation/tokenizer.json"))
    return model, tok, {"version": version, "tensors_verified": len(weights),
                        "checkpoint_sha256": hashlib.sha256(checkpoint.read_bytes()).hexdigest()}


def batch_scores(model, keys):
    device = next(model.parameters()).device
    ids = torch.full((len(keys), max(map(len, keys))), model.config.pad_token_id, device=device, dtype=torch.long)
    mask = torch.zeros_like(ids)
    for i, key in enumerate(keys):
        ids[i, :len(key)] = torch.tensor(key, device=device, dtype=torch.long)
        mask[i, :len(key)] = 1
    return model(input_ids=ids, attention_mask=mask).logits.squeeze(-1)


def score_keys(model, keys, batch_size=8):
    unique = list(dict.fromkeys(keys))
    scores = {}
    with torch.inference_mode():
        for start in range(0, len(unique), batch_size):
            chunk = unique[start:start+batch_size]
            scores.update(zip(chunk, batch_scores(model, chunk).float().cpu().tolist(), strict=True))
    return scores
