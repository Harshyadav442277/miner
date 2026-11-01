"""Check the saved training tokenizer against the pinned tokenizer on every rendered pilot text."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

from tokenizers import Tokenizer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from score_pairs import render


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trained", type=Path, required=True)
    ap.add_argument("--pinned", type=Path, required=True)
    ap.add_argument("--pairs", type=Path, nargs="+", required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    left, right = Tokenizer.from_file(str(a.trained)), Tokenizer.from_file(str(a.pinned))
    left.enable_truncation(max_length=256)
    right.enable_truncation(max_length=256)
    n, different = 0, 0
    for path in a.pairs:
        for line in path.read_text(encoding="utf-8").splitlines():
            p = json.loads(line)
            for key in ("chosen", "rejected"):
                text = render(p["prompt"], p[key])
                different += left.encode(text).ids != right.encode(text).ids
                n += 1
    report = {"texts": n, "different_token_sequences": different, "max_tokens": 256,
              "trained_sha256": hashlib.sha256(a.trained.read_bytes()).hexdigest(),
              "pinned_sha256": hashlib.sha256(a.pinned.read_bytes()).hexdigest(), "pass": different == 0}
    a.out.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(json.dumps(report))
    if different:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
