"""Warm-start the unmodified kit trainer from our v6 PEFT weights; no scorer wrapper.

Every adapter/head tensor is checked after loading. Only our training initialization
changes; validation/checkpoint selection and the model/optimizer stay in the kit.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--version", type=int, default=7)
    ap.add_argument("--parent-version", type=int, default=6)
    ap.add_argument("--data-dir", default="sanctions_v7_binding")
    ap.add_argument("--lr", type=float, default=0.00005)
    ap.add_argument("--epochs", type=int, default=2)
    a = ap.parse_args()
    sys.path.insert(0, str(a.home / "kit-v2"))
    from float_runtime import train_adapter as kit
    from peft import get_peft_model_state_dict, set_peft_model_state_dict
    from peft.utils.save_and_load import load_peft_weights
    import torch

    parent = a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{a.parent_version}/adapter"
    out = a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{a.version}"
    if (out / "result.json").exists():
        raise ValueError("refusing to overwrite a completed experiment")
    original_builder = kit.build_model
    init_report = {}

    def warm_model(base_model, hp):
        model, tok = original_builder(base_model, hp)
        weights = load_peft_weights(str(parent), device="cpu")
        set_peft_model_state_dict(model, weights, adapter_name="default")
        loaded = get_peft_model_state_dict(model, adapter_name="default")
        if set(loaded) != set(weights):
            raise ValueError(f"parent key mismatch: {set(loaded)^set(weights)}")
        for key, tensor in loaded.items():
            if not torch.equal(tensor.detach().cpu(), weights[key].to(tensor.dtype)):
                raise ValueError(f"parent tensor not restored: {key}")
        init_report.update(parent_checkpoint=str(parent), tensors_verified=len(loaded),
                           parent_checkpoint_sha256=hashlib.sha256((parent / "adapter_model.safetensors").read_bytes()).hexdigest())
        print(json.dumps({"warm_start": init_report}), flush=True)
        return model, tok

    kit.build_model = warm_model
    data = a.home / "pairs" / a.data_dir
    argv = ["--intent", "SANCTIONS_SCREENING_MATCH", "--data", str(data / "train.jsonl"),
            "--val-data", str(data / "val.jsonl"), "--test-data", str(data / "test.jsonl"),
            "--out", str(out), "--max-length", "256", "--batch-size", "4", "--grad-accum", "4",
            "--eval-batch", "1", "--lora-rank", "8", "--lora-alpha", "32", "--epochs", str(a.epochs),
            "--lr", str(a.lr), "--seed", "42"]
    started = time.time()
    postwrite_bug = False
    try:
        code = kit.main(argv)
    except NameError as exc:
        # The pinned kit references pkg only in the final Next-command print, after writing result.json.
        report_file = out / "result.json"
        if exc.name != "pkg" or not report_file.exists() or report_file.stat().st_mtime < started:
            raise
        report = json.loads(report_file.read_text(encoding="utf-8"))
        if report.get("intent") != "SANCTIONS_SCREENING_MATCH" or not init_report:
            raise
        postwrite_bug = True
        code = 0 if report.get("verdict") == "PASS" else 1
        print("Recorded known kit post-write NameError: pkg; result and checkpoint exist.", flush=True)
    init_report.update(kit_arguments=argv, known_kit_postwrite_nameerror=postwrite_bug,
                       wrapper_exit_code=code, seconds=round(time.time()-started, 2))
    (out / "initialization.json").write_text(json.dumps(init_report, indent=1), encoding="utf-8")
    return code


if __name__ == "__main__":
    sys.exit(main())
