"""Fixed v3 weights, official 512-token export, exact tensor identity and node test.

Run only after other training and foundation-worker jobs finish. This is a
context-transfer diagnostic; it does not claim the parent trained at 512.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

import numpy as np
from safetensors.numpy import load_file

from collect_miners import save


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--version", type=int, default=14)
    ap.add_argument("--parent-version", type=int, default=3)
    ap.add_argument("--plan", type=Path, required=True)
    a = ap.parse_args()
    repo = Path(__file__).resolve().parents[3]
    a.plan = a.plan.resolve()
    a.plan.mkdir(parents=True, exist_ok=False)
    parent = a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{a.parent_version}"
    out = a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{a.version}"
    out.mkdir(parents=True, exist_ok=False)
    package_name = "SANCTIONS_SCREENING_MATCH.safetensors"
    package = out / package_name
    env = dict(os.environ, HF_HOME=str(a.home / "hf"), HF_HUB_OFFLINE="1",
               LIVE_CLASS_INTENTS="SANCTIONS_SCREENING_MATCH")
    py = str(a.home / ".venv/Scripts/python.exe")

    def run(command, label, cwd=repo):
        save(a.plan / f"{label}.command.json", {"argv": command, "cwd": str(cwd)})
        with (a.plan / f"{label}.txt").open("w", encoding="utf-8") as log:
            subprocess.run(command, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)

    run([py, "-m", "float_runtime.export_adapter", "--adapter", str(parent / "adapter"),
         "--intent", "SANCTIONS_SCREENING_MATCH", "--class", "judgment", "--foundation",
         str(a.home / "foundation/foundation.json"), "--max-tokens", "512", "--out", str(package)],
        "export", a.home / "kit-v2")
    run([str(a.home / "bin-v2/adapterbuild-live.exe"), "lora", "--intent", "SANCTIONS_SCREENING_MATCH",
         "--package", str(package), "--out", str(out), "--foundation", str(a.home / "foundation/foundation.json"),
         "--foundation-onnx", str(a.home / "foundation/foundation_lora_fp32.onnx"),
         "--engine", str(a.home / "foundation/foundation_engine.wasm")], "stage1", a.home / "kit-v2")
    old, new = load_file(str(parent / package_name)), load_file(str(package))
    assert set(old) == set(new) and len(old) == 178
    assert all(old[k].dtype == new[k].dtype and np.array_equal(old[k], new[k]) for k in old)
    manifest = json.loads(package.with_suffix(package.suffix+".manifest.json").read_text())
    assert manifest["max_tokens"] == 512 and manifest["package"]["sha256"] == digest(package)
    save(a.plan / "context-initialization.json", {"parent_version": a.parent_version,
         "parent_package_sha256": digest(parent / package_name), "package_sha256": digest(package),
         "exact_equal_tensors": len(old), "parent_training_max_tokens": 256, "runtime_max_tokens": 512,
         "scope": "Fixed-weight context-transfer diagnostic, no training or readiness claim"})
    base = "track2/adapter/sanctions"
    capture = f"{base}/evidence/v7-miner-capture"
    run([py, f"{base}/measure_miners.py", capture, "--home", str(a.home), "--versions", str(a.version),
         "--max-tokens", "512"], "old-factual-node")
    run([py, f"{base}/verify_evidence.py", capture], "old-factual-verify")
    audit_path = a.plan / "old-512-visibility.json"
    run([py, f"{base}/audit_claim_visibility.py", capture, "--tokenizer",
         str(a.home / "foundation/tokenizer.json"), "--max-tokens", "512", "--out", str(audit_path)],
        "old-512-visibility")
    scored = json.loads((repo / capture / f"v{a.version}-node-scores.json").read_text())
    audit = json.loads(audit_path.read_text())
    reference = audit["observable_visible_length_baseline_tie_aware"]
    assert audit["observable_pairs"] == scored["pairs"] == 62
    report = {"accuracy": scored["accuracy"], "visible_length_baseline": reference,
              "pass": scored["accuracy"] > reference, "scope": "Development context diagnostic only"}
    save(a.plan / "development-gate.json", report)
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    main()
