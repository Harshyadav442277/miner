"""Same-query, source-verified factual margins across seven equivalent verdict forms.

HF float32 diagnosis only. No training, miner answers, pool rows or score wrappers.
"""
import argparse
import hashlib
import json
from pathlib import Path
import random
import sys

import numpy as np
import torch
from tokenizers import Tokenizer

from binding_benchmark import render
from build_pairs import load, norm
from collect_miners import save, snapshot_index


FORMATS = ("thin_json", "training_prose", "heldout_prose", "enum_json", "numeric_json", "explicit_negation", "yes_no")


def answer(name, hit, fmt):
    if fmt == "thin_json":
        return json.dumps({"name": name, "matched": hit})
    if fmt == "training_prose":
        return f"{name}: {'An exact name entry was found' if hit else 'No exact name entry was found'} in the OFAC SDN snapshot."
    if fmt == "heldout_prose":
        return f"Exact-name lookup for {name} against OFAC SDN: {'MATCH' if hit else 'NO MATCH'}. Identity is not established by name alone."
    if fmt == "enum_json":
        return json.dumps({"name": name, "verdict": "match" if hit else "no_match"})
    if fmt == "numeric_json":
        return json.dumps({"name": name, "on_list": int(hit)})
    if fmt == "explicit_negation":
        return f"The exact name {name} {'appears' if hit else 'does not appear'} in this OFAC SDN snapshot."
    if fmt == "yes_no":
        return f"{name}: {'YES' if hit else 'NO'} (exact OFAC SDN name lookup)."
    raise ValueError(fmt)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--versions", default="3,13,15")
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    sdn, alt = [a.home / f"data/sanctions/{n}.csv" for n in ("sdn", "alt")]
    entries = {e["id"]: e for e in load(str(sdn), str(alt))}
    _, index = snapshot_index(sdn.read_bytes(), alt.read_bytes())
    source = a.home / "pairs/sanctions_v13_reference/test.jsonl"
    candidates = [json.loads(l) for l in source.read_text(encoding="utf-8").splitlines()]
    groups = {"primary": [], "alias": [], "absent": []}
    for row in candidates:
        q, hit = row["query_name"], row["listed"]
        assert (norm(q) in index) == hit
        kind = "absent" if not hit else "primary" if norm(q) == norm(entries[row["sdn_entity_id"]]["name"]) else "alias"
        groups[kind].append({"name": q, "listed": hit, "source_form": kind, "prompt": row["prompt"]})
    rng = random.Random(1820261103)
    queries = []
    for kind, count in (("primary", 32), ("alias", 32), ("absent", 64)):
        rng.shuffle(groups[kind])
        assert len(groups[kind]) >= count
        queries.extend(groups[kind][:count])
    tok = Tokenizer.from_file(str(a.home / "foundation/tokenizer.json"))
    keys, lengths = {}, []
    for i, q in enumerate(queries):
        for fmt in FORMATS:
            for hit in (True, False):
                key = tuple(tok.encode(render(q["prompt"], answer(q["name"], hit, fmt))).ids)
                assert len(key) <= 256, "Diagnosis must not mix truncation with answer form"
                keys[(i, fmt, hit)] = key
                lengths.append(len(key))
    save(a.out / "frozen-protocol.json", {"seed": 1820261103, "queries": queries, "formats": FORMATS,
         "source_data_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
         "sdn_sha256": hashlib.sha256(sdn.read_bytes()).hexdigest(), "alt_sha256": hashlib.sha256(alt.read_bytes()).hexdigest(),
         "rendered_max_tokens": max(lengths), "scope": "Same questions across all forms; no text truncation, training or external-answer claim"})
    sys.path.insert(0, str(a.home / "kit-v2"))
    from float_runtime import train_adapter as kit
    from peft import get_peft_model_state_dict, set_peft_model_state_dict
    from peft.utils.save_and_load import load_peft_weights
    available = torch.cuda.is_available
    try:
        torch.cuda.is_available = lambda: False
        model, _ = kit.build_model(kit.DEFAULT_BASE, kit.Hyperparams(lora_rank=8, lora_alpha=32, grad_checkpointing=False))
    finally:
        torch.cuda.is_available = available
    device = torch.device("cuda" if available() else "cpu")
    model.to(device=device, dtype=torch.float32).eval().requires_grad_(False)
    all_results = {}
    for version in map(int, a.versions.split(",")):
        path = a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{version}/adapter"
        weights = load_peft_weights(str(path), device="cpu")
        set_peft_model_state_dict(model, weights, adapter_name="default")
        restored = get_peft_model_state_dict(model, adapter_name="default")
        assert set(restored) == set(weights)
        assert all(torch.equal(restored[k].cpu(), weights[k].to(restored[k].dtype)) for k in weights)
        scores = {}
        with torch.inference_mode():
            for key in dict.fromkeys(keys.values()):
                ids = torch.tensor([key], dtype=torch.long, device=device)
                scores[key] = model(input_ids=ids, attention_mask=torch.ones_like(ids)).logits.item()
        rows = []
        for i, q in enumerate(queries):
            values = {fmt: {"positive": scores[keys[(i, fmt, True)]], "negative": scores[keys[(i, fmt, False)]]} for fmt in FORMATS}
            rows.append({**q, "forms": {fmt: {**v, "margin_positive_minus_negative": v["positive"]-v["negative"],
                                              "correct": (v["positive"] > v["negative"]) == q["listed"] and v["positive"] != v["negative"]}
                                      for fmt, v in values.items()}})
        by_format = {}
        for fmt in FORMATS:
            stats = {}
            for kind in ("primary", "alias", "absent"):
                part = [r for r in rows if r["source_form"] == kind]
                stats[kind] = {"queries": len(part), "correct": sum(r["forms"][fmt]["correct"] for r in part)}
            thin = np.array([r["forms"]["thin_json"]["margin_positive_minus_negative"] for r in rows])
            margins = np.array([r["forms"][fmt]["margin_positive_minus_negative"] for r in rows])
            slope, intercept = np.polyfit(thin, margins, 1)
            stats["margin_vs_thin"] = {"pearson": float(np.corrcoef(thin, margins)[0, 1]), "slope": float(slope), "intercept": float(intercept),
                                      "thin_correct_but_form_wrong": sum(r["forms"]["thin_json"]["correct"] and not r["forms"][fmt]["correct"] for r in rows)}
            by_format[fmt] = stats
        cross = {}
        for good in FORMATS:
            cross[good] = {}
            for bad in FORMATS:
                cross[good][bad] = {str(hit): {"queries": sum(r["listed"] == hit for r in rows),
                    "correct": sum(r["forms"][good]["positive" if hit else "negative"] > r["forms"][bad]["negative" if hit else "positive"] for r in rows if r["listed"] == hit)} for hit in (True, False)}
        result = {"version": version, "checkpoint_sha256": hashlib.sha256((path / "adapter_model.safetensors").read_bytes()).hexdigest(),
                  "by_format": by_format, "cross_format": cross, "rows": rows,
                  "scope": "HF float32, same complete tokenized questions, no optimization. Diagnostic, not actual-node accuracy."}
        save(a.out / f"v{version}-factorial.json", result)
        print(json.dumps({"version": version, "by_format": by_format}), flush=True)
        all_results[str(version)] = by_format
    save(a.out / "summary.json", all_results)


if __name__ == "__main__":
    main()
