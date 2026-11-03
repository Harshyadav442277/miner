"""Source-only alias/primary record-context comparison, HF diagnostic, no training."""
import argparse
import gc
import json
from pathlib import Path

import torch
from binding_benchmark import render
from build_pairs import load,norm
from collect_miners import save,snapshot_index
from hf_reward_diagnostics import load_model,score_keys
from repair_scope_negation import sha

FORMATS=("thin","id_only","primary_name","primary_and_echo")


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--out",type=Path,required=True)
    a=ap.parse_args();a.out.mkdir(exist_ok=False)
    evidence=Path(__file__).parent/"evidence"
    original=json.loads((evidence/"old-query-form-diagnosis/protocol.json").read_text())["queries"]
    sdn,alt=[a.home/f"data/sanctions/{n}.csv" for n in ("sdn","alt")]
    entries={e["id"]:e for e in load(str(sdn),str(alt))}
    _,index=snapshot_index(sdn.read_bytes(),alt.read_bytes())
    questions=[]
    for q in original:
        if q["source_form"]!="alias":continue
        entity=entries[q["sdn_ids"][0]]
        for role,name in (("alias",q["name"]),("primary",entity["name"])):
            assert entity["id"] in index[norm(name)]
            questions.append({"name":name,"role":role,"family_id":entity["id"],
                              "primary_name":entity["name"],"prompt":f"Screen {name} against the OFAC SDN list. Report name matches."})
    save(a.out/"protocol.json",{"questions":questions,"formats":FORMATS,"models":[13,22,24],
         "sdn_sha256":sha(sdn),"alt_sha256":sha(alt),"families":len({q["family_id"] for q in questions}),
         "scope":"All-listed source-only alias/primary question control with truthful reference metadata shared across verdicts. Not genuine responses, independent factual accuracy or training."})
    def response(q,hit,fmt):
        body={"name":q["name"],"matched":hit}
        if fmt!="thin":
            ref={"entry_number":q["family_id"]}
            if fmt in ("primary_name","primary_and_echo"):ref["primary_name"]=q["primary_name"]
            if fmt=="primary_and_echo":ref["matched_name"]=q["name"]
            body["source_reference"]=ref
        return json.dumps(body)
    summary={}
    for version in (13,22,24):
        model,tok,identity=load_model(a.home,version)
        keys={(i,fmt,h):tuple(tok.encode(render(q["prompt"],response(q,h,fmt))).ids)
              for i,q in enumerate(questions) for fmt in FORMATS for h in (True,False)}
        assert max(map(len,keys.values()))<=256
        scores=score_keys(model,keys.values())
        rows=[{**q,"forms":{fmt:{"positive":scores[keys[i,fmt,True]],"negative":scores[keys[i,fmt,False]],
                                 "margin":scores[keys[i,fmt,True]]-scores[keys[i,fmt,False]],
                                 "correct":scores[keys[i,fmt,True]]>scores[keys[i,fmt,False]]} for fmt in FORMATS}}
              for i,q in enumerate(questions)]
        stats={fmt:{role:{"queries":sum(r["role"]==role for r in rows),
                               "correct":sum(r["forms"][fmt]["correct"] for r in rows if r["role"]==role)}
                     for role in ("alias","primary")} for fmt in FORMATS}
        save(a.out/f"v{version}.json",{"identity":identity,"by_format":stats,"rows":rows,"max_tokens":max(map(len,keys.values()))})
        summary[str(version)]=stats
        print(json.dumps({"version":version,"by_format":stats}),flush=True)
        del model;gc.collect();torch.cuda.empty_cache()
    save(a.out/"summary.json",summary)


if __name__=="__main__":main()
