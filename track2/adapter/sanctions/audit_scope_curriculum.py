"""Independent raw source, span, grammar-balance and source-split audit for V31."""
import argparse
import ast
import collections
import csv
import json
from pathlib import Path

from tokenizers import Tokenizer
from binding_benchmark import render
from build_pairs import norm
from collect_miners import save
from distill_source_representations import ALL_FORMS, token_key
from repair_scope_negation import sha
from scope_curriculum import UNUSED


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--home",type=Path,required=True)
    ap.add_argument("--plan",type=Path,required=True)
    a=ap.parse_args();base=Path(__file__).parent;evidence=base/"evidence"
    p=json.loads((a.plan/"frozen-inputs.json").read_text())
    old_path=evidence/"v30-plan/frozen-inputs.json"
    assert sha(old_path)==p["v30_inputs_sha256"]
    old=json.loads(old_path.read_text())
    assert p["parent"]==old["parent"] and p["neutral_metadata"]==old["neutral_metadata"]
    assert len(p["train"])==64 and len(p["validation"])==96
    assert not {norm(q["name"]) for q in p["train"]}&{norm(q["name"]) for q in p["validation"]}
    assert not {i for q in p["train"] for i in q["sdn_ids"]}&{i for q in p["validation"] for i in q["sdn_ids"]}
    prior=[]
    for version in (16,17,19):
        previous=json.loads((evidence/f"v{version}-plan/frozen-inputs.json").read_text())
        prior.extend(q for qs in previous["queries"].values() for q in qs)
    for version in (20,21,22):
        previous=json.loads((evidence/f"v{version}-plan/frozen-inputs.json").read_text())
        prior.extend(previous["train"]+previous["validation"])
    previous=json.loads((evidence/"v16-plan/frozen-inputs.json").read_text())
    for rel in previous["external_query_files"]:
        prior.extend(json.loads((evidence/rel.replace('\\','/')).read_text()))
    prior.extend(json.loads((evidence/"listed-recall-diagnosis/frozen-protocol.json").read_text())["queries"])
    facts_path=evidence/"hard-fact-replay-plan/frozen-facts.json"
    assert sha(facts_path)==p["hard_facts_sha256"]
    facts=json.loads(facts_path.read_text());prior.extend(facts["hard_errors"]+facts["correct_replay"])
    assert not {norm(q["name"]) for q in prior}&{norm(q["name"]) for q in p["validation"]}
    assert not {i for q in prior for i in q.get("sdn_ids",[])}&{i for q in p["validation"] for i in q["sdn_ids"]}
    index={}
    for name,col in (("sdn",1),("alt",3)):
        file=a.home/f"data/sanctions/{name}.csv"
        assert sha(file)==p["neutral_metadata"][f"{name}_sha256"]
        for r in csv.reader(file.read_text(encoding="utf-8-sig").splitlines()):
            if len(r)>col and r[0].isdigit():index.setdefault(norm(r[col]),set()).add(int(r[0]))
    for queries,split in ((p["train"],"train"),(p["validation"],"val")):
        file=a.home/f"pairs/sanctions_v13_reference/{split}.jsonl"
        source={(r["query_name"],r["listed"]) for r in map(json.loads,file.read_text().splitlines())}
        assert sha(file)==(p["source_val_sha256"] if split=="val" else facts["source_train_sha256"])
        for q in queries:
            found=index.get(norm(q["name"]),set())
            assert bool(found)==q["listed"] and found==set(map(int,q["sdn_ids"]))
            assert (q["name"],q["listed"]) in source
    for kind,count in (("primary",24),("alias",24),("absent",48)):
        assert sum(q["source_form"]==kind for q in p["validation"])==count
    tok=Tokenizer.from_file(str(a.home/"foundation/tokenizer.json"))
    balanced={True:collections.Counter(),False:collections.Counter()};views=0
    originals={q["name"]:q for q in old["train"]}
    for q in p["train"]:
        original=originals[q["name"]]
        assert all(q[k]==original[k] for k in ("prompt","listed","sdn_ids","source_form"))
        assert len(q["views"])==10
        for v in q["views"]:
            assert v["is_correct"]==(v["claimed_match"]==q["listed"])
            value=tok.decode([v["ids"][i] for i in v["primary_positions"]]).strip()
            assert value in (("true","MATCH") if v["claimed_match"] else ("false","NO MATCH"))
            assert len(v["ids"])<=512
            if v["format"].startswith("varied"):
                balanced[q["listed"]][(v["format"],v["grammar_index"],v["scope_index"],v["claimed_match"])]+=1
            else:
                expected=next(x for x in original["views"] if x["format"]==v["format"] and x["claimed_match"]==v["claimed_match"])
                assert v["ids"]==expected["ids"]
            views+=1
    assert balanced[True]==balanced[False]
    lengths=[len(token_key(tok,q,h,f,p["neutral_metadata"])) for q in p["validation"] for h in (True,False) for f in ALL_FORMS]
    unused_lengths=[len(tok.encode(render(q["prompt"],lead.format(name=q["name"])+("MATCH" if h else "NO MATCH")+tail.format(name=q["name"]))).ids)
                    for q in p["validation"] for lead,tail in UNUSED for h in (True,False)]
    assert max(lengths)<=512 and max(unused_lengths)<=256
    def loss_ast(name):
        return ast.dump(next(n for n in ast.parse((base/name).read_text()).body if isinstance(n,ast.FunctionDef) and n.name=="quality_loss"))
    assert loss_ast("probe_scope_curriculum.py")==loss_ast("probe_primary_quality.py")
    report={"pass":True,"inputs_sha256":sha(a.plan/"frozen-inputs.json"),"source_queries":160,
            "train_views":views,"new_repair_validation":96,"unused_paraphrases":4,
            "membership_balanced_grammar_scope_claim_counts":True,"exact_original_json_views":True,
            "all_prior_experimental_external_names_entities_disjoint":True,
            "unchanged_primary_quality_loss_ast":True,"max_standard_validation_tokens":max(lengths),
            "max_unused_validation_tokens":max(unused_lengths),"script_sha256":sha(Path(__file__)),
            "scope":"Raw-CSV/source split, primary-span and grammar-balance audit before scores; parent source-validation exposure disclosed."}
    save(a.plan/"source-annotation-audit.json",report);print(json.dumps(report),flush=True)


if __name__=="__main__":main()
