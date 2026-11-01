"""Offline checks: source hashes, raw bodies, verbatim pairs, exact f32 ordering and historical numbers."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import struct


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    a = ap.parse_args()
    p = a.capture
    manifest = json.loads((p / "source-manifest.json").read_text())
    for name, item in manifest.items():
        assert digest(gzip.decompress((p / (name + ".gz")).read_bytes())) == item["sha256"]
    raw_count = 0
    for f in p.glob("*.json"):
        data = json.loads(f.read_text(encoding="utf-8"))
        records = data if isinstance(data, list) else [data]
        for r in records:
            if isinstance(r, dict) and "body" in r and "sha256" in r:
                assert digest(r["body"].encode()) == r["sha256"], f
                raw_count += 1
    pairs = [json.loads(l) for l in (p / "pairs.jsonl").read_text(encoding="utf-8").splitlines()]
    for pair in pairs:
        for side in ("chosen", "rejected"):
            file, row = pair[side + "_capture"]
            original = json.loads((p / file).read_text(encoding="utf-8"))[row]
            assert original["body"] == pair[side]
            assert original["name"] == pair["name"]
    print(f"PASS sources; {raw_count} raw body hashes; {len(pairs)} verbatim pairs")
    for f in sorted(p.glob("v*-node-scores.json")):
        data = json.loads(f.read_text())
        assert data["pairs_sha256"] == digest((p / "pairs.jsonl").read_bytes()), f
        correct = 0
        for row in data["rows"]:
            values = []
            for side in ("chosen", "rejected"):
                value = struct.unpack("<f", struct.pack("<I", row[side]["bits"]))[0]
                assert value == row[side]["value"]
                values.append(value)
            assert row["correct"] == (values[0] > values[1])
            correct += row["correct"]
        assert correct / len(data["rows"]) == data["accuracy"]
        print(f"PASS v{data['version']} {correct}/{len(data['rows'])} = {data['accuracy']:.6f}; gate={data['registration_gate_pass']}")
    hist = p / "historical"
    data_manifest = json.loads((hist / "dataset-manifest.json").read_text())
    for version, item in data_manifest.items():
        for split, entry in item["files"].items():
            raw = gzip.decompress((hist / f"v{version}/{split}.jsonl.gz").read_bytes())
            assert digest(raw) == entry["sha256"]
        probe = hist / f"v{version}" / ("ood_probe48.json" if version == "1" else "ood_probe80.json")
        data = json.loads(probe.read_text())
        correct = sum(r["chosen"] > r["rejected"] for r in data["rows"])
        assert correct / len(data["rows"]) == data["accuracy"]
        print(f"PASS historical v{version} probe {correct}/{len(data['rows'])} = {data['accuracy']:.6f}")


if __name__ == "__main__":
    main()
