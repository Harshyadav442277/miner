"""Pairwise accuracy of an adapter as the node runs it, not as PyTorch trains it.

The kit's converter (telegraph-wasm-baseline 992f2650) builds every layer as global attention with
RoPE theta 10000. ModernBERT-base itself slides a 128-token window on two layers in three and uses
theta 160000 on the global ones. So the node scores a different network from the one the kit
trains. Scored in float with the node's architecture, probe answers land within about 0.1 of the
packaged .wasm run in the node's own runtime; scored with the trained architecture, they are off
by up to 6.4 (track2/GAPS.md G32). This script measures both.

Run from the kit root with the kit venv:
    python <this> --pairs <test.jsonl> --adapter <runs/INTENT/adapter> [--base <dir>]
"""
import argparse
import json
import sys
from collections import Counter

import torch

sys.path.insert(0, ".")
from wide_runtime.train_adapter import DEFAULT_BASE, NODE_MAX_LEN, render  # noqa: E402


def node_config(cfg):
    """Rewrite a ModernBERT config into what the node's interpreter computes."""
    cfg.layer_types = ["full_attention"] * cfg.num_hidden_layers
    cfg.rope_parameters = {k: {"rope_type": "default", "rope_theta": 10000.0} for k in cfg.rope_parameters}
    return cfg


def load(base, adapter, deployed):
    from peft import PeftModel
    from transformers import AutoConfig, AutoModelForSequenceClassification
    cfg = AutoConfig.from_pretrained(base, num_labels=1)
    if deployed:
        node_config(cfg)
    m = AutoModelForSequenceClassification.from_pretrained(base, config=cfg, attn_implementation="eager")
    return PeftModel.from_pretrained(m, adapter).merge_and_unload().eval()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", required=True)
    ap.add_argument("--adapter", required=True)
    ap.add_argument("--base", default=DEFAULT_BASE)
    a = ap.parse_args()
    from transformers import AutoTokenizer
    tok = AutoTokenizer.from_pretrained(a.base)
    rows = [json.loads(line) for line in open(a.pairs, encoding="utf-8")]
    dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    for deployed in (False, True):
        model = load(a.base, a.adapter, deployed).to(dev)
        wins, kinds, totals = 0, Counter(), Counter()
        for r in rows:
            enc = tok([render(r["prompt"], r["chosen"]), render(r["prompt"], r["rejected"])], truncation=True,
                      max_length=NODE_MAX_LEN, padding=True, return_tensors="pt").to(dev)
            with torch.no_grad():
                c, rj = model(**enc).logits.squeeze(-1).tolist()
            kind = r.get("meta", {}).get("kind", "?")
            totals[kind] += 1
            if c > rj:
                wins += 1
                kinds[kind] += 1
        per_kind = ", ".join(f"{k} {kinds[k] / totals[k]:.1%}" for k in sorted(totals))
        label = "node architecture   " if deployed else "trained architecture"
        print(f"{label}: {wins}/{len(rows)} = {wins / len(rows):.1%}  ({per_kind})")
        del model
        torch.cuda.empty_cache()


if __name__ == "__main__":
    main()
