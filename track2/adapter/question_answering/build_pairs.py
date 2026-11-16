"""Build QUESTION_ANSWERING preference pairs from SQuAD v1.1 train and NQ-open train.

Each row is {prompt, chosen, rejected, kind, format, source}. The chosen answer is the
dataset's gold answer; the rejected one is wrong or non-responsive in one tagged way
(qa_kinds.py). Both sides draw format, JSON layout, confidence, citations and decorations
from the same distribution (qa_render.py); a per-pair coin decides which side is longer,
so length cannot carry the label. Every rendered text fits --max-tokens with the pinned
tokenizer; rows that do not are dropped and counted.

    C:/Users/hyada/tg-eval/.venv/Scripts/python.exe -I build_pairs.py \
        --data C:/Users/hyada/tg-eval/data/qa --out C:/Users/hyada/tg-eval/pairs/question_answering_v1
Without holdout/benchmark_questions.txt the build fails unless --no-exclusions is passed.
"""
import argparse
import hashlib
import json
import math
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import qa_kinds  # noqa: E402
import qa_render  # noqa: E402
import qa_split  # noqa: E402
import qa_text as qt  # noqa: E402

SQUAD_URL = "https://rajpurkar.github.io/SQuAD-explorer/dataset/train-v1.1.json"
NQ_URL = "https://raw.githubusercontent.com/google-research-datasets/natural-questions/master/nq_open/NQ-open.train.jsonl"
VARIANTS = 4  # renderings tried per side; the pair keeps the one matching the length coin


def render_text(prompt, answer):
    return f"### Task:\n{prompt}\n\n### Answer:\n{answer}"  # the node's RenderForJudgment


def make_index(items):
    idx = {"by_type": defaultdict(list), "by_title_type": defaultdict(list), "all": items,
           "squad": [i for i in items if i["title"]], "nq": [i for i in items if not i["title"]]}
    for it in items:
        idx["by_type"][it["atype"]].append(it)
        if it["title"]:
            idx["by_title_type"][(it["title"], it["atype"])].append(it)
    return idx


def deco_for(kind, rng):
    """(chosen, rejected) decorations. Matched counterparts: in echo pairs the right answer
    usually restates the question too, so the two differ by the answer alone. Hedges whose words
    are refusal words sit on both sides of every kind at one base rate."""
    c, r = qa_render.draw_deco(rng), qa_render.draw_deco(rng)
    if kind == "echo" and rng.random() < 0.8:
        c["lead"] = rng.choice(qa_render.LEAD_INS)
    r["quote"] = rng.random() < 0.5  # only refusal and echo bodies read it
    return c, r


def prompt_for(it, rng):
    q = it["question"]
    if it["title"] is None and rng.random() < 0.5:
        q = q[:1].upper() + q[1:] + "?"
    return q


def pick_pair(cands_c, cands_r, rng):
    """Choose one rendering per side so that the longer side follows a fair coin."""
    want_c_longer = rng.random() < 0.5
    best, best_d = None, None
    for c in cands_c:
        for r in cands_r:
            if c[0] == r[0] or (len(c[0]) > len(r[0])) != want_c_longer:
                continue
            d = abs(math.log(len(c[0]) / max(1, len(r[0]))))
            if best is None or d < best_d:
                best, best_d = (c, r), d
    if best is None:
        pairs = [(c, r) for c in cands_c for r in cands_r if c[0] != r[0]]
        best = pairs[rng.randrange(len(pairs))] if pairs else None
    return best


def build_split(name, items, forbidden, target, seed, tok, max_tokens, titles, kinds=qa_kinds.KINDS):
    rng = random.Random(f"{seed}|{name}")
    index = make_index(items)
    squad = [i for i in items if i["title"]]
    nq = [i for i in items if not i["title"]]
    rng.shuffle(squad)
    rng.shuffle(nq)
    per_kind = {k: target // len(kinds) + (1 if j < target % len(kinds) else 0) for j, k in enumerate(kinds)}
    counts, rows, metas, drops = Counter(), [], [], Counter()
    si = ni = 0
    while len(rows) < target and (si < len(squad) or ni < len(nq)):
        use_squad = ni >= len(nq) or (si < len(squad) and rng.random() < 0.6)
        if use_squad:
            it, si = squad[si], si + 1
        else:
            it, ni = nq[ni], ni + 1
        kinds_now = [k for k in qa_kinds.feasible(it, kinds) if counts[k] < per_kind[k]]
        kinds_now.sort(key=lambda k: (counts[k] / per_kind[k], rng.random()))
        for kind in kinds_now[:2]:
            made = qa_kinds.build(kind, it, index, rng, forbidden)
            if made is None:
                drops[f"no_{kind}"] += 1
                continue
            c_content, r_content, fmts, inner, r_ans = made
            prompt = prompt_for(it, rng)
            ctx = {"title": it["title"], "titles": titles, "json_inner": inner}
            fc, fr = rng.choice(fmts), rng.choice(fmts)  # independent of the label
            c_content["deco"], r_content["deco"] = deco_for(kind, rng)
            # Where only the rejected side is not an answer (refusal, echo), only it varies, so
            # length matching never picks the chosen side's template or decoration.
            n_c = 1 if kind in ("refusal", "echo") else VARIANTS
            cands_c = [qa_render.render(fc, c_content, prompt, rng, ctx) for _ in range(n_c)]
            cands_r = [qa_render.render(fr, r_content, prompt, rng, ctx) for _ in range(VARIANTS)]
            pair = pick_pair(cands_c, cands_r, rng)
            if pair is None:
                drops["identical"] += 1
                continue
            (ct, cm), (rt, rm) = pair
            if r_ans is not None and qt.same_answer(r_ans, it["golds"]):
                raise AssertionError(f"rejected answer equals gold for {it['id']}")
            if tok is not None and max(len(tok.encode(render_text(prompt, t)).ids) for t in (ct, rt)) > max_tokens:
                drops["over_max_tokens"] += 1
                continue
            src_url = (f"{SQUAD_URL}#{it['id'][6:]}" if it["title"] else f"{NQ_URL}#L{int(it['id'][3:]) + 1}")
            rows.append({"prompt": prompt, "chosen": ct, "rejected": rt, "kind": kind,
                         "format": f"{cm['format']}-vs-{rm['format']}", "source": src_url})
            metas.append({"id": it["id"], "kind": kind, "qnorm": it["qnorm"], "title": it["title"],
                          "para": it["para"], "atype": it["atype"], "gold": qt.normalise(it["gold"]), "gold_text": it["gold"],
                          "r_ans": qt.normalise(r_ans) if r_ans else None, "chosen": cm, "rejected": rm})
            counts[kind] += 1
            break
    return rows, metas, {"kinds": dict(counts), "drops": dict(drops), "items_used": si + ni}


def write_jsonl(path, rows):
    data = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows).encode("utf-8")
    path.write_bytes(data)
    return hashlib.sha256(data).hexdigest()


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, default=Path("C:/Users/hyada/tg-eval/data/qa"))
    ap.add_argument("--out", type=Path, default=Path("C:/Users/hyada/tg-eval/pairs/question_answering_v1"))
    ap.add_argument("--exclusions", type=Path, default=HERE / "holdout" / "benchmark_questions.txt")
    ap.add_argument("--no-exclusions", action="store_true")
    ap.add_argument("--tokenizer", type=Path, default=Path("C:/Users/hyada/tg-eval/foundation/tokenizer.json"))
    ap.add_argument("--no-token-check", action="store_true", help="tests only")
    ap.add_argument("--max-tokens", type=int, default=384)
    ap.add_argument("--train", type=int, default=9000)
    ap.add_argument("--val", type=int, default=900)
    ap.add_argument("--test", type=int, default=900)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--negation", action="store_true", help="v2: add the two negation kinds (qa_kinds.NEGATION_KINDS)")
    ap.add_argument("--squad", default="squad-train-v1.1.json")
    ap.add_argument("--nq", default="NQ-open.train.jsonl")
    a = ap.parse_args(argv)
    if a.no_exclusions:
        excl, excl_info = set(), {"applied": False, "reason": "--no-exclusions"}
    else:
        if not a.exclusions.exists():
            raise SystemExit(f"exclusion list missing: {a.exclusions} (pass --no-exclusions to build without it)")
        excl = qa_split.load_exclusions(a.exclusions)
        excl_info = {"applied": True, "file": a.exclusions.name, "lines": sum(1 for l in a.exclusions.read_text(
            encoding="utf-8").splitlines() if l.strip()), "keys": len(excl),
                     "sha256": hashlib.sha256(a.exclusions.read_bytes()).hexdigest()}
    tok = None
    if not a.no_token_check:
        from tokenizers import Tokenizer
        tok = Tokenizer.from_file(str(a.tokenizer))
    items = qa_split.squad_items(a.data / a.squad) + qa_split.nq_items(a.data / a.nq)
    by_split, forbidden, split_rep = qa_split.split_items(items, excl)
    a.out.mkdir(parents=True, exist_ok=True)
    manifest = {"builder": "track2/adapter/question_answering/build_pairs.py", "seed": a.seed,
                "max_tokens": a.max_tokens, "exclusions": excl_info, "split_report": split_rep, "files": {}}
    if tok is not None:
        manifest["tokenizer_sha256"] = hashlib.sha256(a.tokenizer.read_bytes()).hexdigest()
    src_man = a.data / "sources-manifest.json"
    if src_man.exists():
        manifest["sources"] = [{k: s[k] for k in ("name", "url", "sha256", "licence")}
                               for s in json.loads(src_man.read_text(encoding="utf-8"))["sources"]]
    kinds = qa_kinds.KINDS + (qa_kinds.NEGATION_KINDS if a.negation else [])
    manifest["kinds"] = kinds
    used_wrong = set()
    for name, target in (("train", a.train), ("val", a.val), ("test", a.test)):
        titles = sorted({i["title"] for i in by_split[name] if i["title"]})
        rows, metas, rep = build_split(name, by_split[name], forbidden[name] | used_wrong, target, a.seed, tok,
                                       a.max_tokens, titles, kinds)
        used_wrong |= {m["r_ans"] for m in metas if m["r_ans"]}  # later splits never reuse a wrong answer
        h = write_jsonl(a.out / f"{name}.jsonl", rows)
        write_jsonl(a.out / f"{name}.meta.jsonl", metas)
        manifest["files"][name] = {"pairs": len(rows), "sha256": h, **rep,
                                   "formats": dict(sorted(Counter(r["format"] for r in rows).items()))}
        print(f"{name}: {len(rows)} pairs {rep['kinds']} drops {rep['drops']}")
        if len(rows) < target:
            print(f"WARNING {name}: {len(rows)} < target {target}")
    (a.out / "MANIFEST.json").write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    if not excl_info["applied"]:
        print("WARNING: built WITHOUT benchmark exclusions; rebuild once holdout/benchmark_questions.txt exists")
    return manifest


if __name__ == "__main__":
    main()
