"""Old development QUESTIONS in generic forms; no captured answer is rendered."""
import argparse
import gc
import json
from pathlib import Path

import torch

from binding_benchmark import render
from build_pairs import load, norm
from collect_miners import save, snapshot_index
from diagnose_fact_formats import answer, FORMATS
from hf_reward_diagnostics import load_model, score_keys
from repair_scope_negation import sha


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(exist_ok=False)
    pair_file = Path(__file__).parent / "evidence/v7-miner-capture/pairs.jsonl"
    metadata = {}
    for line in pair_file.read_text().splitlines():
        p = json.loads(line)
        assert p["kind"] == "listed"
        metadata[p["name"]] = p["prompt"]
    sdn, alt = [a.home / f"data/sanctions/{n}.csv" for n in ("sdn", "alt")]
    entries = {e["id"]: e for e in load(str(sdn), str(alt))}
    _, index = snapshot_index(sdn.read_bytes(), alt.read_bytes())
    queries = []
    for name, prompt in sorted(metadata.items()):
        ids = index.get(norm(name))
        assert ids
        primary = any(norm(name) == norm(entries[i]["name"]) for i in ids)
        queries.append({"name": name, "prompt": prompt, "listed": True,
                        "source_form": "primary" if primary else "alias", "sdn_ids": ids})
    save(a.out / "protocol.json", {"queries": queries, "formats": FORMATS,
         "old_pairs_sha256": sha(pair_file), "sdn_sha256": sha(sdn), "alt_sha256": sha(alt),
         "scope": "Known old development questions only, generic synthetic responses; all listed, no population factual estimate. Captured responses never rendered or trained."})
    result = {}
    for version in (3, 13, 17):
        model, tok, identity = load_model(a.home, version)
        keys = {(i, fmt, hit): tuple(tok.encode(render(q["prompt"], answer(q["name"], hit, fmt))).ids)
                for i, q in enumerate(queries) for fmt in FORMATS for hit in (True, False)}
        assert max(map(len, keys.values())) <= 256
        scores = score_keys(model, keys.values())
        rows = [{**q, "forms": {fmt: {"positive": scores[keys[i,fmt,True]], "negative": scores[keys[i,fmt,False]],
                                      "correct": scores[keys[i,fmt,True]] > scores[keys[i,fmt,False]]} for fmt in FORMATS}}
                for i, q in enumerate(queries)]
        stats = {fmt: {kind: {"queries": sum(kind == "listed" or r["source_form"] == kind for r in rows),
                             "correct": sum(r["forms"][fmt]["correct"] for r in rows if kind == "listed" or r["source_form"] == kind)}
                       for kind in ("listed", "primary", "alias")} for fmt in FORMATS}
        result[str(version)] = {"identity": identity, "by_format": stats, "rows": rows,
                                "scope": "HF float32, old development questions, complete generic answers, no actual-node factual score"}
        save(a.out / f"v{version}.json", result[str(version)])
        print(json.dumps({"version": version, "by_format": stats}), flush=True)
        del model
        gc.collect()
        torch.cuda.empty_cache()
    save(a.out / "summary.json", {v: r["by_format"] for v, r in result.items()})


if __name__ == "__main__":
    main()
