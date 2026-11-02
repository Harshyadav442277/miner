"""Audit complete machine-verdict spans visible to the pinned 256-token scorer.

This is conservative: prose may convey a claim before its machine field. The
observable subset is reported separately, never substituted for the full benchmark.
"""
import argparse
import collections
import json
from pathlib import Path

from tokenizers import Tokenizer
from binding_benchmark import visible
from collect_miners import save


def root_values(text):
    decoder, i = json.JSONDecoder(), 0
    while i < len(text) and text[i].isspace():
        i += 1
    if i == len(text) or text[i] != "{":
        return []
    i += 1
    out = []
    while i < len(text):
        while text[i].isspace():
            i += 1
        if text[i] == "}":
            return out
        key, i = decoder.raw_decode(text, i)
        while text[i].isspace():
            i += 1
        assert text[i] == ":"
        i += 1
        while text[i].isspace():
            i += 1
        value, end = decoder.raw_decode(text, i)
        out.append((key, value, i, end))
        i = end
        while text[i].isspace():
            i += 1
        if text[i] == ",":
            i += 1
        elif text[i] == "}":
            return out
        else:
            raise ValueError("malformed root JSON")
    raise ValueError("unfinished JSON object")


def verdict_spans(text):
    fields = []
    for key, value, start, end in root_values(text):
        if key in ("matched", "match", "on_list", "sanctioned") and type(value) in (bool, int) and value in (0, 1):
            fields.append((key, bool(value), start, end))
        if key == "verdict" and isinstance(value, str) and value.lower() in ("match", "no_match"):
            fields.append((key, value.lower() == "match", start, end))
    return fields


def visibility_record(tok, prompt, text):
    _, shown = visible(tok, prompt, text)
    spans = verdict_spans(text)
    return {"body_characters_visible": len(shown),
            "visible_claim_fields": [k for k, v, start, end in spans if end <= len(shown)],
            "all_machine_claims_visible": bool(spans) and all(end <= len(shown) for k, v, start, end in spans)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    ap.add_argument("--tokenizer", type=Path, required=True)
    a = ap.parse_args()
    tok = Tokenizer.from_file(str(a.tokenizer))
    tok.enable_truncation(max_length=256)
    pairs = [json.loads(l) for l in (a.capture / "pairs.jsonl").read_text(encoding="utf-8").splitlines()]
    records, indices = [], []
    for i, pair in enumerate(pairs):
        item = {"pair_index": i, "name": pair["name"]}
        for side in ("chosen", "rejected"):
            item[side] = visibility_record(tok, pair["prompt"], pair[side])
        item["both_machine_claims_visible"] = all(item[s]["all_machine_claims_visible"] for s in ("chosen", "rejected"))
        if item["both_machine_claims_visible"]:
            indices.append(i)
        records.append(item)
    results = {}
    for file in sorted(a.capture.glob("v*-node-scores.json")):
        data = json.loads(file.read_text(encoding="utf-8"))
        results[str(data["version"])] = {"pairs": len(indices), "correct": sum(data["rows"][i]["correct"] for i in indices)}
    result = {"total_pairs": len(pairs), "observable_pair_indices": indices, "observable_pairs": len(indices),
              "observable_distinct_queries": len({pairs[i]["name"] for i in indices}), "scores": results,
              "scope": "Complete machine claims visible; prose-only claims not audited. Original dataset unchanged.", "rows": records}
    save(a.capture / "claim-visibility-audit.json", result)
    print(json.dumps({k:v for k,v in result.items() if k != "rows"}))


if __name__ == "__main__":
    main()
