"""Conservative development rejection screen, not an actual-node measurement."""
import argparse
import json
from pathlib import Path

from binding_benchmark import render
from collect_miners import save
from hf_reward_diagnostics import load_model, score_keys
from repair_scope_negation import sha


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    ap.add_argument("--version",type=int,required=True)
    a=ap.parse_args()
    assert json.loads((a.plan/"repair-result.json").read_text())["pass"], "Synthetic guards must pass first"
    evidence=Path(__file__).parent/"evidence"
    source=evidence/"v7-miner-capture/pairs.jsonl"
    pairs=[json.loads(l) for l in source.read_text().splitlines()]
    reference=json.loads((evidence/"v7-miner-capture/v18-node-scores.json").read_text())
    assert reference["pairs_sha256"]==sha(source) and reference["tokens"]["max_tokens"]==512
    audit=json.loads((evidence/"v18-plan/old-512-visibility.json").read_text())
    assert audit["max_tokens"]==512 and audit["observable_pairs"]==len(pairs)==62
    model,tok,identity=load_model(a.home,a.version)
    tok.enable_truncation(max_length=512)
    keys=[tuple(tuple(tok.encode(render(p["prompt"],p[k])).ids) for k in ("chosen","rejected")) for p in pairs]
    baseline=audit["observable_visible_length_baseline_tie_aware"]
    recomputed=sum((len(c)>len(r))+.5*(len(c)==len(r)) for c,r in keys)/len(keys)
    assert abs(recomputed-baseline)<1e-12, "Visible-length reference differs from exact measured inputs"
    scores=score_keys(model,[k for pair in keys for k in pair],batch_size=4)
    rows=[{"name":p["name"],"chosen":scores[c],"rejected":scores[r],"correct":scores[c]>scores[r]}
          for p,(c,r) in zip(pairs,keys,strict=True)]
    wins=sum(r["correct"] for r in rows)
    save(a.plan/"old512-hf-screen.json",{"version":a.version,"identity":identity,"max_tokens":512,
         "pairs_sha256":sha(source),"pairs":len(rows),"correct":wins,"accuracy":wins/len(rows),
         "visible_length_baseline":baseline,"pass":wins/len(rows)>baseline,"rows":rows,
         "scope":"HF float32 historical DEVELOPMENT screen only. A failure permits conservative rejection, never an actual-node score or readiness claim. Reserved bodies not read."})
    print(json.dumps({"hf_correct":wins,"pairs":len(rows),"baseline":baseline,"pass":wins/len(rows)>baseline}))


if __name__=="__main__":
    main()
