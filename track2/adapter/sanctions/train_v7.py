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
    ap.add_argument("--head-only", action="store_true")
    ap.add_argument("--batch-size", type=int, default=4)
    ap.add_argument("--grad-accum", type=int, default=4)
    ap.add_argument("--max-length", type=int, choices=(256, 512), default=256)
    ap.add_argument("--class-breakdown", action="store_true")
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
        if a.head_only:
            for name, module in model.named_modules():
                if name.endswith(("classifier.modules_to_save.default", "score.modules_to_save.default")):
                    module.to(dtype=torch.float32)
                    # The kit evaluates without autocast; its frozen base can emit bf16.
                    # This training-only cast keeps the ordinary linear head in fp32.
                    module.register_forward_pre_hook(
                        lambda layer, args: (args[0].to(dtype=layer.weight.dtype), *args[1:]))
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
        if a.head_only:
            for name, parameter in model.named_parameters():
                parameter.requires_grad_(any(part in name for part in
                    ("classifier.modules_to_save.default.", "score.modules_to_save.default.")))
            model.gradient_checkpointing_disable()
            model.disable_input_require_grads()
            count = sum(p.numel() for p in model.parameters() if p.requires_grad)
            if count != 769:
                raise ValueError(f"unexpected trainable head size: {count}")
            init_report.update(head_only=True, trainable_parameters=count)
        print(json.dumps({"warm_start": init_report}), flush=True)
        return model, tok

    kit.build_model = warm_model
    data = a.home / "pairs" / a.data_dir
    if a.class_breakdown:
        metadata = {}
        for split in ("train", "val", "test"):
            for line in (data / f"{split}.jsonl").read_text(encoding="utf-8").splitlines():
                row = json.loads(line)
                metadata[tuple(row[k] for k in ("prompt", "chosen", "rejected"))] = row
        original_evaluate = kit.evaluate

        def evaluate_by_class(model, tokenizer, pairs, hp, train_negatives=None):
            captured = []
            original_reward = kit._reward

            def capture_reward(*args):
                reward = original_reward(*args)
                captured.append(reward.detach().float().cpu().tolist())
                return reward

            kit._reward = capture_reward
            try:
                report = original_evaluate(model, tokenizer, pairs, hp, train_negatives)
            finally:
                kit._reward = original_reward
            assert len(captured) % 2 == 0
            outcomes = [c > r for i in range(0, len(captured), 2)
                        for c, r in zip(captured[i], captured[i+1], strict=True)]
            assert len(outcomes) == len(pairs)
            assert abs(sum(outcomes)/len(outcomes)-report["pairwise_accuracy"]) <= 0.000051
            groups = {}
            for pair, correct in zip(pairs, outcomes, strict=True):
                row = metadata[tuple(pair[k] for k in ("prompt", "chosen", "rejected"))]
                if row["kind"].startswith("wrong_query"):
                    continue
                group = groups.setdefault(str(row["listed"]), {"pairs": 0, "correct": 0})
                group["pairs"] += 1
                group["correct"] += int(correct)
            for group in groups.values():
                group["accuracy"] = group["correct"]/group["pairs"]
            report["factual_by_membership"] = groups
            print(json.dumps({"synthetic_class_diagnostics": groups}), flush=True)
            return report

        kit.evaluate = evaluate_by_class
    argv = ["--intent", "SANCTIONS_SCREENING_MATCH", "--data", str(data / "train.jsonl"),
            "--val-data", str(data / "val.jsonl"), "--test-data", str(data / "test.jsonl"),
            "--out", str(out), "--max-length", str(a.max_length), "--batch-size", str(a.batch_size), "--grad-accum", str(a.grad_accum),
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
    init_report.update(initialization_completed=bool(init_report), kit_arguments=argv, known_kit_postwrite_nameerror=postwrite_bug,
                       wrapper_exit_code=code, seconds=round(time.time()-started, 2))
    if a.head_only:
        saved = load_peft_weights(str(out / "adapter"), device="cpu")
        original = load_peft_weights(str(parent), device="cpu")
        frozen = [key for key in original if "lora_" in key]
        for key in frozen:
            if not torch.equal(saved[key], original[key]):
                raise ValueError(f"frozen encoder adapter changed: {key}")
        init_report["unchanged_encoder_adapter_tensors"] = len(frozen)
    out.mkdir(parents=True, exist_ok=True)
    (out / "initialization.json").write_text(json.dumps(init_report, indent=1), encoding="utf-8")
    return code


if __name__ == "__main__":
    sys.exit(main())
