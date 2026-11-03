"""Fixed ridge readouts of frozen factual features; never an evaluator/export."""
import argparse
import gc
import json
from pathlib import Path

import torch

from binding_benchmark import render
from build_pairs import norm
from collect_miners import save
from hf_reward_diagnostics import batch_scores, load_model
from repair_scope_negation import sha


def contexts(tok, q):
    prefix = tok.encode(render(q["prompt"], "")).ids
    positions = q["views"][0]["query_positions"]
    # Some tokenizers append EOS: compare only actual name-token positions.
    assert all(prefix[i] == q["views"][0]["ids"][i] for i in positions)
    return [("question_only", prefix, positions)] + [
        (f"{v['format']}/claim_{int(v['claimed_match'])}", v["ids"], v["query_positions"])
        for v in q["views"]
    ]


def extract(model, tok, qs):
    box = {}
    def capture(module, args, output):
        box["hidden"] = output.last_hidden_state if hasattr(output, "last_hidden_state") else output[0]
    hook = model.get_base_model().model.register_forward_hook(capture)
    result = {}
    try:
        with torch.inference_mode():
            for q in qs:
                views = contexts(tok, q)
                # Keep memory bounded on the 4GB laptop.
                features = []
                for start in range(0, len(views), 4):
                    chunk = views[start:start+4]
                    batch_scores(model, [tuple(v[1]) for v in chunk])
                    features.extend(box["hidden"][i, v[2]].mean(0).cpu().clone()
                                    for i, v in enumerate(chunk))
                    box.clear()
                result[norm(q["name"])] = {v[0]: t for v, t in zip(views, features, strict=True)}
    finally:
        hook.remove()
        box.clear()
    return result


def ridge(train_x, train_y, test_x):
    """Fixed lambda=1, training-only centering/scaling; no development fitting."""
    mean = train_x.mean(0)
    scale = train_x.std(0, unbiased=False).clamp_min(.01)
    x = (train_x - mean) / scale / train_x.shape[1] ** .5
    z = (test_x - mean) / scale / train_x.shape[1] ** .5
    offset = train_y.mean()
    weights = torch.linalg.solve(x @ x.T + torch.eye(len(x), dtype=x.dtype), train_y-offset)
    return x @ x.T @ weights + offset, z @ x.T @ weights + offset


def summarize(qs, logits, labels):
    predictions = logits.reshape(len(qs), len(labels)) > 0
    groups = {}
    for kind in ("listed", "absent", "primary", "alias"):
        selected = [i for i, q in enumerate(qs) if
                    (kind == "listed" and q["listed"]) or
                    (kind == "absent" and not q["listed"]) or q.get("source_form") == kind]
        if not selected:
            continue
        truth = torch.tensor([qs[i]["listed"] for i in selected])[:, None]
        groups[kind] = {label: {"queries": len(selected),
                      "correct": int((predictions[selected, j] == truth[:, 0]).sum())}
                      for j, label in enumerate(labels)}
    return {"by_class": groups,
            "stable_across_contexts_queries": int((predictions == predictions[:, :1]).all(1).sum()),
            "rows": [{"name": q["name"], "listed": q["listed"],
                      "scores": dict(zip(labels, logits.reshape(len(qs), -1)[i].tolist(), strict=True))}
                     for i, q in enumerate(qs)]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--plan", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(exist_ok=False)
    p = json.loads((a.plan / "frozen-inputs.json").read_text())
    audit = json.loads((a.plan / "annotation-audit.json").read_text())
    assert audit["pass"] and audit["inputs_sha256"] == sha(a.plan / "frozen-inputs.json")
    train, dev = p["train"], p["role_validation"]
    assert len(train) == 128 and len(dev) == 96
    assert not {norm(q["name"]) for q in train} & {norm(q["name"]) for q in dev}
    assert not {i for q in train for i in q["sdn_ids"]} & {i for q in dev for i in q["sdn_ids"]}
    for qs in (train, dev):
        assert sum(q["listed"] for q in qs) * 2 == len(qs)
    protocol = {"inputs_sha256": sha(a.plan / "frozen-inputs.json"),
                "script_sha256": sha(Path(__file__)), "versions": [13, 26],
                "ridge_lambda": 1, "train_queries": 128, "development_queries": 96,
                "fitting_contexts": ["question_only", "all_answer_views"],
                "scope": "Frozen encoder readout diagnostic. Training-only preprocessing/readout, no model updates, inference wrapper, export or independent validation claim. Source facts exposed to parent; hard training facts selected on parent errors. Same v22 paired development."}
    save(a.out / "protocol.json", protocol)
    results = {}
    cache = a.home / "diagnostics/membership-features"
    cache.mkdir(parents=True, exist_ok=True)
    for version in protocol["versions"]:
        model, tok, identity = load_model(a.home, version)
        before = sha(a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{version}/adapter/adapter_model.safetensors")
        features = extract(model, tok, train + dev)
        cached = cache / f"v{version}.pt"
        torch.save({"protocol": protocol, "identity": identity, "features": features}, cached)
        labels = sorted(contexts(tok, train[0])[i][0] for i in range(11))
        train_y = torch.tensor([1. if q["listed"] else -1. for q in train], dtype=torch.float64)
        test_x = torch.stack([features[norm(q["name"])][label] for q in dev for label in labels]).double()
        record = {"identity": identity, "feature_cache_sha256": sha(cached), "readouts": {}}
        for setting in protocol["fitting_contexts"]:
            used = ["question_only"] if setting == "question_only" else [x for x in labels if x != "question_only"]
            train_x = torch.stack([features[norm(q["name"])][label] for q in train for label in used]).double()
            targets = train_y.repeat_interleave(len(used))
            fit_scores, dev_scores = ridge(train_x, targets, test_x)
            record["readouts"][setting] = {
                "train": summarize(train, fit_scores, used),
                "development": summarize(dev, dev_scores, labels)}
            print(json.dumps({"version": version, "readout": setting,
                  "development": record["readouts"][setting]["development"]["by_class"]}), flush=True)
        # A one-feature source/name-length control, fitted using the same train labels.
        train_len = torch.tensor([[len(tok.encode(q["name"]).ids)] for q in train], dtype=torch.float64)
        dev_len = torch.tensor([[len(tok.encode(q["name"]).ids)] for q in dev], dtype=torch.float64)
        _, length_scores = ridge(train_len, train_y, dev_len)
        record["name_token_length_control"] = summarize(dev, length_scores, ["question_only"])
        assert before == sha(a.home / f"runs-v2/SANCTIONS_SCREENING_MATCH_v{version}/adapter/adapter_model.safetensors")
        results[str(version)] = record
        save(a.out / "results.json", {"protocol": protocol, "models": results})
        del model, features
        gc.collect()
        torch.cuda.empty_cache()


if __name__ == "__main__":
    main()
