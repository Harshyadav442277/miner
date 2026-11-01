"""Separate synthetic wrong-query controls from real, unmodified response bodies.

The answer paired as rejected really answered another name. Both sides come from
the same service, so a fixed source/shape preference cannot solve these controls.
No response text is written or edited and controls are never training or a registration gate.
"""
import argparse
import collections
import json
from pathlib import Path
import shutil

from collect_miners import save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capture", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    labels = json.loads((a.capture / "labels.json").read_text(encoding="utf-8"))
    groups = collections.defaultdict(list)
    for r in labels:
        if r["decision_label"] == "correct":
            groups[r["miner_id"]].append(r)
    pairs = []
    for miner, records in sorted(groups.items()):
        for expected in (True, False):
            chosen = [r for r in records if r["expected"] == expected][:2]
            if len(chosen) != 2:
                continue
            for good, other in (chosen, chosen[::-1]):
                file = good["capture"]
                assert file == other["capture"]
                rows = json.loads((a.capture / file).read_text(encoding="utf-8"))
                pairs.append({"prompt": f"Screen {good['name']} against the OFAC SDN list. Report name matches.",
                              "chosen": rows[good["row"]]["body"], "rejected": rows[other["row"]]["body"],
                              "name": good["name"], "rejected_name": other["name"],
                              "kind": "wrong_query:list_member" if expected else "wrong_query:exact_name_absent",
                              "format": "synthetic_wrong_query_control",
                              "chosen_capture": [file, good["row"]],
                              "rejected_capture": [file, other["row"]],
                              "source_id_metadata_only": miner})
                shutil.copyfile(a.capture / file, a.out / file)
    for file in ("source-manifest.json", "sdn.csv.gz", "alt.csv.gz", "queries.json"):
        shutil.copyfile(a.capture / file, a.out / file)
    (a.out / "pairs.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in pairs),
                                      encoding="utf-8")
    summary = {"pairs": len(pairs), "paired_names": len({r["name"] for r in pairs}),
               "pairs_by_kind": dict(collections.Counter(r["kind"] for r in pairs)),
               "longer_answer_baseline": sum(len(r["chosen"]) > len(r["rejected"]) for r in pairs)/len(pairs),
               "registration_eligible": False, "purpose": "synthetic wrong-query robustness control",
               "note": "Not real miner errors; no text edits; source ids stay outside model inputs",
               "related_miner_id": "4433", "by_source": dict(collections.Counter(r["source_id_metadata_only"] for r in pairs))}
    save(a.out / "label-summary.json", summary)
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
