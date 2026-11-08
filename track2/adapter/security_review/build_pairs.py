"""Build SECURITY_REVIEW preference pairs with entity-disjoint train / val / holdout splits.

Sources: the GHSA snapshot (CC-BY-4.0) for dependency findings; self-authored code,
configuration and fake-credential templates (sr_code, sr_config, sr_deps). No pool row, no
miner answer and no OOT-probe package is read. Splits are by entity: package name, code
template id, config template id, secret file format. Holdout entities never reach training.

    python build_pairs.py --ghsa .../ghsa/advisories.jsonl --out .../pairs/security_review_v1 \
        --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --reserve oot_packages.txt
"""
import argparse
import hashlib
import json
import random
from collections import Counter
from pathlib import Path

from tokenizers import Tokenizer

import sr_code
import sr_config
import sr_deps
from sr_render import KINDS, corrupt, pair_answers, prompt_text

MAX_TOKENS = 500  # the package scores 512; keep every rendered text whole


def split_list(items, rng, holdout, val):
    items = sorted(items)
    rng.shuffle(items)
    nh, nv = max(1, round(len(items) * holdout)), round(len(items) * val)
    return {"holdout": items[:nh], "val": items[nh:nh + nv], "train": items[nh + nv:]}


def make_splits(rng, by_pkg):
    pk = split_list(list(by_pkg), rng, 0.18, 0.08)
    for _ in range(200):  # holdout code templates must span languages and families
        code = split_list([t[0] for t in sr_code.T], rng, 0.24, 0.10)
        ht = [t for t in sr_code.T if t[0] in code["holdout"]]
        if len({t[1] for t in ht}) >= 3 and len({t[2] for t in ht}) >= 6 and \
                len({t[1] for t in sr_code.T if t[0] in code["val"]}) >= 2:
            break
    cfg = split_list(list(sr_config.C), rng, 0.28, 0.0)
    sec = split_list(sr_deps.SECRET_FORMATS, rng, 0.25, 0.0)
    for d in (cfg, sec):  # too few templates for a third split: val shares train's
        d["val"] = d["train"]
    return {"packages": pk, "code": code, "config": cfg, "secret": sec}


def one_scenario(rng, split, sp, by_pkg):
    cat = rng.choices(["dependency", "code", "secret", "config"], [0.34, 0.30, 0.16, 0.20])[0]
    clean = rng.random() < 0.12
    if cat == "dependency":
        eco = {}
        for key in sp["packages"][split]:
            eco.setdefault(key[0], []).append(key)
        return sr_deps.dep_scenario(rng, eco, by_pkg, 0 if clean else rng.choice([1, 1, 2]))
    if cat == "code":
        tpl = [t for t in sr_code.T if t[0] in sp["code"][split]]
        return sr_code.code_scenario(rng, tpl, 0 if clean else rng.choice([1, 1, 2]), rng.choice([0, 1, 1, 2]))
    if cat == "secret":
        return sr_deps.secret_scenario(rng, rng.choice(sp["secret"][split]), 0 if clean else rng.choice([1, 1, 2]),
                                       rng.choice([0, 1, 1, 2]))
    return sr_config.config_scenario(rng, rng.choice(sp["config"][split]), 0 if clean else rng.choice([1, 1, 2, 3]))


def scenario(rng, split, sp, by_pkg):
    s = None
    while s is None:
        s = one_scenario(rng, split, sp, by_pkg)
    if rng.random() < 0.2:  # two files of different kinds in one request
        t = None
        while t is None or t["category"] == s["category"]:
            t = one_scenario(rng, split, sp, by_pkg)
        s = {"category": s["category"], "entity": s["entity"] + t["entity"], "files": s["files"] + t["files"],
             "findings": s["findings"] + t["findings"], "traps": s["traps"] + t["traps"],
             "cats": [s["category"], t["category"]], "_parts": [s, t]}
    for part in s.get("_parts", [s]):
        for x in part["findings"] + part["traps"]:
            x["cat"] = part["category"]
    for i, x in enumerate(s["findings"]):
        x["_i"] = ("c", i)
    for i, x in enumerate(s["traps"]):
        x["_i"] = ("t", i)
    s.pop("_parts", None)
    return s


def build(rng, split, n, per_scenario, sp, by_pkg, real_cves, tok, seen_prompts):
    rows, kinds = [], Counter()
    while len(rows) < n:
        s = scenario(rng, split, sp, by_pkg)
        prompt = prompt_text(rng, s)
        if prompt in seen_prompts:
            continue
        # least-used applicable kinds first, so the kinds stay balanced
        order = sorted(KINDS, key=lambda k: (kinds[k], rng.random()))
        made = 0
        for kind in order:
            rej = corrupt(kind, rng, s, real_cves)
            if rej is None:
                continue
            out = pair_answers(rng, s, rej, s["category"])
            if out is None:
                continue
            chosen, rejected, fmt = out
            if chosen == rejected:
                continue
            lens = [len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{a}").ids) for a in (chosen, rejected)]
            if max(lens) > MAX_TOKENS:
                break
            rows.append({"prompt": prompt, "chosen": chosen, "rejected": rejected, "kind": kind,
                         "category": "+".join(s.get("cats", [s["category"]])), "format": fmt,
                         "clean": not s["findings"], "entities": s["entity"], "tokens": max(lens), "split": split})
            kinds[kind] += 1
            made += 1
            if made >= per_scenario or len(rows) >= n:
                break
        if made:
            seen_prompts.add(prompt)
    return rows


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ghsa", required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--reserve", help="package names (one per line) kept out of every split, for the OOT probe")
    ap.add_argument("--seed", type=int, default=20261108)
    ap.add_argument("--n-train", type=int, default=3600)
    ap.add_argument("--n-val", type=int, default=360)
    ap.add_argument("--n-holdout", type=int, default=200)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    tok = Tokenizer.from_file(a.tokenizer)
    reserved = set(Path(a.reserve).read_text().split()) if a.reserve else set()
    by_pkg = {k: v for k, v in sr_deps.load_advisories(a.ghsa).items()
              if k[0] in sr_deps.ECOS and k[1] not in reserved}
    real_cves = {adv["cve"] for advs in by_pkg.values() for adv in advs if adv["cve"]}
    sp = make_splits(rng, by_pkg)
    a.out.mkdir(parents=True, exist_ok=True)
    seen, out = set(), {}
    # holdout first: it is frozen before any training row exists
    for split, n, per in (("holdout", a.n_holdout, 1), ("val", a.n_val, 1), ("train", a.n_train, 2)):
        rows = build(rng, split, n, per, sp, by_pkg, real_cves, tok, seen)
        path = a.out / f"{split}.jsonl"
        path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
        out[split] = {"pairs": len(rows), "sha256": sha(path),
                      "longer_is_chosen": round(sum(len(r["chosen"]) > len(r["rejected"]) for r in rows) / len(rows), 4),
                      "by_kind": dict(Counter(r["kind"] for r in rows)), "by_category": dict(Counter(r["category"] for r in rows)),
                      "by_format": dict(Counter(r["format"] for r in rows)), "clean": sum(r["clean"] for r in rows),
                      "max_tokens": max(r["tokens"] for r in rows)}
    splits = {k: {s: [list(x) if isinstance(x, tuple) else x for x in v] for s, v in d.items()} for k, d in sp.items()}
    manifest = {"seed": a.seed, "ghsa": {"path": a.ghsa, "sha256": sha(a.ghsa), "licence": "CC-BY-4.0"},
                "builder_sha256": {f: sha(Path(__file__).with_name(f)) for f in
                                   ("build_pairs.py", "sr_deps.py", "sr_code.py", "sr_config.py", "sr_render.py")},
                "reserved_packages": sorted(reserved), "files": out, "entity_splits": splits,
                "self_authored": "code, config and credential templates; credentials are random fakes"}
    (a.out / "MANIFEST.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in out.items()}, indent=1))


if __name__ == "__main__":
    main()
