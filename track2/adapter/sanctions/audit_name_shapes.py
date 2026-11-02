"""Fit simple name-membership shortcuts on training only, then report each split.

These are membership diagnostics, not scores on external answer comparisons.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from tokenizers import Tokenizer

from binding_benchmark import render
from collect_miners import save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--tokenizer", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    tok = Tokenizer.from_file(str(a.tokenizer))
    data = {}
    for split in ("train", "val", "test"):
        rows = [json.loads(l) for l in (a.data / f"{split}.jsonl").read_text(encoding="utf-8").splitlines()]
        rows = [r for r in rows if r["kind"] == "reference_knowledge"]
        data[split] = (np.array([r["listed"] for r in rows]), {
            "characters": np.array([len(r["query_name"]) for r in rows]),
            "words": np.array([len(r["query_name"].split()) for r in rows]),
            "prompt_tokens": np.array([len(tok.encode(render(r["prompt"], "")).ids) for r in rows])})
    report = {}
    truth, features = data["train"]
    for feature, values in features.items():
        candidates = [(float(((values >= cut) == truth).mean()), int(cut), True) for cut in np.unique(values)]
        candidates += [(float(((values < cut) == truth).mean()), int(cut), False) for cut in np.unique(values)]
        score, cut, greater = max(candidates, key=lambda item: (item[0], -item[1], item[2]))
        report[feature] = {"threshold_fit_on_train_only": cut, "predict_listed_if_greater_equal": greater,
                           "accuracy": {s: float((((v[feature] >= cut) if greater else (v[feature] < cut)) == y).mean())
                                        for s, (y, v) in data.items()}}
    result = {"scope": "Name-only membership classification diagnostics, not external-answer ranking. Thresholds fit on train only. Positive validation facts are source-exposed.",
              "features": report, "split_sha256": {
                  s: hashlib.sha256((a.data / f"{s}.jsonl").read_bytes()).hexdigest() for s in data}}
    save(a.out, result)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
