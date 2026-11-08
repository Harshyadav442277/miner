"""Build v2 SECURITY_REVIEW pairs: mostly counterfactual siblings (sr_cf), on v1's entity splits.

Every counterfactual scenario yields two pairs over two near-identical inputs, with the same two
answer texts in swapped roles. The rest of train/val ("extras") reuse v1's operators for kinds
that have no natural sibling: wrong severity, a fake CVE id on a real dependency finding,
a moved location, and a few non-answers. The v2 holdout is counterfactual only.
Entity splits are v1's (MANIFEST entity_splits): v1 holdout entities stay out of v2 training,
so the frozen v1 holdout remains a valid second test.

    python build_cf.py --ghsa .../advisories.jsonl --v1 .../security_review_v1 --out .../security_review_v2 \
        --tokenizer .../tokenizer.json --reserve oot_packages.txt
"""
import argparse
import hashlib
import json
import random
from collections import Counter
from pathlib import Path

from tokenizers import Tokenizer

import build_pairs
import sr_cf
import sr_code
import sr_deps
from sr_render import CHECKED, GENERIC, NOTES, QUALITY, corrupt, pair_answers, prompt_text, render

EXTRA_KINDS = (["wrong_severity"] * 35 + ["hallucinated_cve"] * 25 + ["wrong_location"] * 20 +
               ["generic"] * 10 + ["code_quality"] * 10)


def shared_answers(rng, s1, s2):
    """Render S1's and S2's true findings with one shared format, style and padding."""
    cat = s1["category"]
    fmt, style = rng.choice(["md", "md", "json", "table", "plain", "prose"]), rng.choice(["upper", "title", "lower"])
    pool = NOTES[cat] + [f"Also consider: {t} ({r}); {fx}." for r, t, fx in rng.sample(GENERIC + QUALITY, 2)]
    rng.shuffle(pool)
    elab = {}
    for f in s1["findings"] + s2["findings"]:
        f["_i"] = (f["loc"], f["title"])
        elab.setdefault(f["_i"], rng.choice([0, 0, 1, 2]))
    pad = {"notes": pool[:rng.choice([0, 1, 1, 2])], "checked": rng.random() < 0.3, "elab": elab}
    return render(s1["findings"], fmt, style, pad, cat), render(s2["findings"], fmt, style, pad, cat), fmt


def tokens(tok, prompt, answer):
    return len(tok.encode(f"### Task:\n{prompt}\n\n### Answer:\n{answer}").ids)


def cf_pairs(rng, split, sp, by_pkg, tok, seen):
    cat = rng.choices(["dependency", "code", "secret", "config"], [0.32, 0.32, 0.16, 0.20])[0]
    if cat == "dependency":
        eco = {}
        for key in sp["packages"][split]:
            eco.setdefault(key[0], []).append(key)
        got = sr_cf.cf_dep(rng, eco, by_pkg)
    elif cat == "code":
        got = sr_cf.cf_code(rng, [t for t in sr_code.T if t[0] in sp["code"][split]])
    elif cat == "secret":
        got = sr_cf.cf_secret(rng, rng.choice(sp["secret"][split]))
    else:
        got = sr_cf.cf_config(rng, rng.choice(sp["config"][split]))
    if not got:
        return []
    s1, s2, mode = got
    a, b, fmt = shared_answers(rng, s1, s2)
    p1, p2 = prompt_text(rng, s1), prompt_text(rng, s2)
    if a == b or p1 == p2 or p1 in seen or p2 in seen:
        return []
    if max(tokens(tok, p, x) for p in (p1, p2) for x in (a, b)) > build_pairs.MAX_TOKENS:
        return []
    k1 = "wrong_location" if mode == "swap" else ("missed_finding" if s2["findings"] else "false_no_issues")
    k2 = "wrong_location" if mode == "swap" else ("false_positive" if s2["findings"] else "false_positive_clean")
    seen.update((p1, p2))
    base = {"category": cat, "format": fmt, "counterfactual": True, "entities": sorted(set(s1["entity"] + s2["entity"])),
            "split": split}
    return [{**base, "prompt": p1, "chosen": a, "rejected": b, "kind": k1, "sibling": 0},
            {**base, "prompt": p2, "chosen": b, "rejected": a, "kind": k2, "sibling": 1}]


def extra_pair(rng, split, sp, by_pkg, real_cves, tok, seen):
    kind = rng.choice(EXTRA_KINDS)
    s = build_pairs.scenario(rng, split, sp, by_pkg)
    if kind == "hallucinated_cve" and s["category"] != "dependency":
        return []  # on first-party code a CVE id is an answer-only tell
    rej = corrupt(kind, rng, s, real_cves)
    prompt = prompt_text(rng, s)
    if rej is None or prompt in seen:
        return []
    out = pair_answers(rng, s, rej, s["category"])
    if out is None or out[0] == out[1] or max(tokens(tok, prompt, x) for x in out[:2]) > build_pairs.MAX_TOKENS:
        return []
    seen.add(prompt)
    return [{"prompt": prompt, "chosen": out[0], "rejected": out[1], "kind": kind, "category": s["category"],
             "format": out[2], "counterfactual": False, "entities": s["entity"], "split": split}]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ghsa", required=True)
    ap.add_argument("--v1", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--reserve", required=True)
    ap.add_argument("--seed", type=int, default=20261109)
    ap.add_argument("--n-train", type=int, default=4000)
    ap.add_argument("--n-val", type=int, default=400)
    ap.add_argument("--n-holdout", type=int, default=240)
    ap.add_argument("--extra-share", type=float, default=0.2)
    a = ap.parse_args()
    rng, tok = random.Random(a.seed), Tokenizer.from_file(a.tokenizer)
    reserved = set(Path(a.reserve).read_text().split())
    by_pkg = {k: v for k, v in sr_deps.load_advisories(a.ghsa).items() if k[0] in sr_deps.ECOS and k[1] not in reserved}
    real_cves = {x["cve"] for v in by_pkg.values() for x in v if x["cve"]}
    v1 = json.loads((a.v1 / "MANIFEST.json").read_text(encoding="utf-8"))
    sp = v1["entity_splits"]
    sp["packages"] = {s: [tuple(k) for k in v if tuple(k) in by_pkg] for s, v in sp["packages"].items()}
    seen = {json.loads(l)["prompt"] for s in ("train", "val", "holdout") for l in (a.v1 / f"{s}.jsonl").open(encoding="utf-8")}
    a.out.mkdir(parents=True, exist_ok=True)
    files, train_answers, used_rejected = {}, set(), set()
    # holdout first (frozen before any training row exists), then train, then val. Val shares
    # config/secret templates with train, so val pairs whose answer texts occur in train are
    # dropped: the kit's gate refuses >10% held-out negatives seen in training.
    for split, n, extra in (("holdout", a.n_holdout, 0.0), ("train", a.n_train, a.extra_share), ("val", a.n_val, a.extra_share)):
        rows = []
        while len(rows) < n:
            if rng.random() < extra:
                got = []
                while not got:
                    got = extra_pair(rng, split, sp, by_pkg, real_cves, tok, seen)
            else:
                got = cf_pairs(rng, split, sp, by_pkg, tok, seen)
            if split == "val" and any(r[k] in train_answers for r in got for k in ("chosen", "rejected")):
                continue
            # a repeated negative (mostly the input-free "no issues" text) is memorisable
            if any(r["rejected"] in used_rejected for r in got):
                continue
            used_rejected.update(r["rejected"] for r in got)
            rows += got
        if split == "train":
            train_answers = {r[k] for r in rows for k in ("chosen", "rejected")}
        path = a.out / f"{split}.jsonl"
        path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
        files[split] = {"pairs": len(rows), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                        "counterfactual": sum(r["counterfactual"] for r in rows),
                        "longer_is_chosen": round(sum(len(r["chosen"]) > len(r["rejected"]) for r in rows) / len(rows), 4),
                        "by_kind": dict(Counter(r["kind"] for r in rows)),
                        "by_category": dict(Counter(r["category"] for r in rows))}
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    manifest = {"seed": a.seed, "ghsa_sha256": sha(a.ghsa), "v1_manifest_sha256": sha(a.v1 / "MANIFEST.json"),
                "reserved_packages": sorted(reserved), "files": files, "entity_splits": "v1 MANIFEST entity_splits",
                "builder_sha256": {f: sha(Path(__file__).with_name(f)) for f in
                                   ("build_cf.py", "sr_cf.py", "build_pairs.py", "sr_deps.py", "sr_code.py",
                                    "sr_config.py", "sr_render.py")}}
    (a.out / "MANIFEST.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(json.dumps(files, indent=1))


if __name__ == "__main__":
    main()
