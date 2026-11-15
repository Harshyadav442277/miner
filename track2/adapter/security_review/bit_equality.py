"""adapterbuild (node Stage-1 loader + engine) vs adapterexec (runnable URL) bit equality.

Re-renders N holdout chosen texts, scores each with `adapterbuild lora --input`, and compares the
printed score_hex with the bits adapterexec returned in node-scores.json.

    python bit_equality.py --home C:/Users/hyada/tg-eval --package P --scores node-scores.json \
        --name v1 --pairs holdout.jsonl --n 4 --out bit-equality.json
"""
import argparse
import json
import os
import subprocess
from pathlib import Path

from tokenizers import Tokenizer


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--package", type=Path, required=True)
    ap.add_argument("--scores", type=Path, required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--pairs", type=Path, required=True)
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    scores = json.loads(a.scores.read_text())["packages"][a.name]
    rows = scores["sets"]["holdout"]["rows"]
    pairs = [json.loads(l) for l in a.pairs.read_text(encoding="utf-8").splitlines() if l.strip()]
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    tok.enable_truncation(max_length=int(scores["metadata"]["max_tokens"]))
    checks = []
    for i in range(0, len(pairs), max(1, len(pairs) // a.n))[:a.n]:
        ids = tok.encode(f"### Task:\n{pairs[i]['prompt']}\n\n### Answer:\n{pairs[i]['chosen']}").ids
        inp = a.out.with_name(f"bit-input-{i}.json")
        inp.write_text(json.dumps({"input_ids": ids}))
        p = subprocess.run([str(a.home / "bin-v2/adapterbuild-live.exe"), "lora", "--intent", "SECURITY_REVIEW",
                            "--class", "judgment", "--package", str(a.package), "--out", str(a.out.parent / "bitcheck"),
                            "--foundation", str(a.home / "foundation/foundation.json"),
                            "--foundation-onnx", str(a.home / "foundation/foundation_lora_fp32.onnx"),
                            "--engine", str(a.home / "foundation/foundation_engine.wasm"), "--input", str(inp)],
                           capture_output=True, text=True, env=dict(os.environ, LIVE_CLASS_INTENTS="SECURITY_REVIEW"))
        line = [l for l in p.stdout.splitlines() if l.startswith("{")][-1]
        hexbits = json.loads(line)["score_hex"]
        exec_bits = rows[i]["chosen_bits"]
        checks.append({"pair": i, "tokens": len(ids), "adapterbuild_score_hex": hexbits,
                       "adapterexec_bits_hex": f"0x{exec_bits:08x}", "equal": int(hexbits, 16) == exec_bits})
        inp.unlink()
    out = {"package": str(a.package), "checks": checks, "all_equal": all(c["equal"] for c in checks)}
    a.out.write_text(json.dumps(out, indent=1))
    print(json.dumps(out))


if __name__ == "__main__":
    main()
