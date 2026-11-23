"""Decode a batch that fanout_exec.py --capture kept, with the pinned tokenizer, into a text file beside it.

    python -I decode_capture.py --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json <capture.json> ...

The output stays outside the repo with the capture. It is read to name the kinds of pair the pool holds
(ARCHITECTURE A7, amended 2026-11-23); no text from it is trained on, copied into a generator or committed.
"""
import argparse
import json
import struct


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("captures", nargs="+")
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    for path in a.captures:
        cap = json.load(open(path, encoding="utf-8"))
        items, results = cap["request"]["batch"], cap.get("results", [])
        out = path[:-5] + ".txt"
        with open(out, "w", encoding="utf-8") as f:
            f.write(f"route {cap['route']}  at {cap['at']}  items {len(items)}\n")
            for i, it in enumerate(items):
                score = results[i].get("score") if i < len(results) else None
                value = struct.unpack("<f", struct.pack("<I", score))[0] if isinstance(score, int) else None
                f.write(f"\n===== item {i}  tokens {len(it.get('tokens', []))}  score {value}\n")
                f.write(tok.decode(it.get("tokens", []), skip_special_tokens=True) + "\n")
        print(out)


if __name__ == "__main__":
    main()
