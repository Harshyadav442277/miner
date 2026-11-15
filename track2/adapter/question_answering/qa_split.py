"""Load SQuAD v1.1 train and NQ-open train into question items and split them.

Splits: SQuAD by article title, NQ-open by normalised question (sha256 bucket, fixed salt).
Then, so that no question or answer string crosses splits:
  - a normalised question in more than one split is kept only in the rarest split (test > val > train);
  - a train item whose gold answer (any acceptable answer) is a val/test gold answer is dropped;
  - a val item whose gold answer is a test gold answer is dropped.
Benchmark questions (the evaluation holdout) are dropped everywhere.
"""
import hashlib
import json
from pathlib import Path
from urllib.parse import unquote

import qa_text as qt

SALT = "qa-v1"
ORDER = {"test": 2, "val": 1, "train": 0}


def bucket(key):
    h = int(hashlib.sha256(f"{SALT}|{key}".encode("utf-8")).hexdigest()[:8], 16) % 100
    return "train" if h < 80 else ("val" if h < 90 else "test")


def load_exclusions(path):
    if path is None:
        return set()
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    return set().union(*(qt.question_keys(l) for l in lines if l.strip() and not l.lstrip().startswith("#")))


def squad_items(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    items = []
    for art in data["data"]:
        title = unquote(art["title"])  # SQuAD stores some titles URL-encoded ("Bill_%26_Melinda...")
        for pi, para in enumerate(art["paragraphs"]):
            ctx = para["context"]
            sents = qt.sentences(ctx)
            if len(sents) < 3:
                continue
            for qa in para["qas"]:
                a = qa["answers"][0]
                gold, start = qt.clean(a["text"]), a["answer_start"]
                idx = [i for i, (s, e, _) in enumerate(sents) if s <= start < e]
                if not idx or not gold:
                    continue
                gi = idx[0]
                if a["text"] not in sents[gi][2] or not qt.contains_answer(sents[gi][2], [gold]):
                    continue  # the span crosses a sentence break or is part of a word ("Bohm" in "Bohmann")
                q = qt.clean(qa["question"])
                items.append({"id": "squad:" + qa["id"], "source": "squad_v1.1_train", "question": q,
                              "qnorm": qt.normalise(q), "gold": gold, "golds": [gold], "raw_gold": a["text"],
                              "atype": qt.answer_type(q, gold), "title": title, "para": f"{title}#{pi}",
                              "sents": [qt.clean(s[2]) for s in sents], "gold_sent": gi,
                              "split": bucket("squad|" + title)})
    return items


def nq_items(path):
    items = []
    for n, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines()):
        if not line.strip():
            continue
        r = json.loads(line)
        golds = [qt.clean(a) for a in r["answer"] if qt.clean(a)]
        if not golds:
            continue
        q = qt.clean(r["question"])
        qn = qt.normalise(q)
        items.append({"id": f"nq:{n}", "source": "nq_open_train", "question": q, "qnorm": qn, "gold": golds[0],
                      "golds": golds, "raw_gold": golds[0], "atype": qt.answer_type(q, golds[0]), "title": None,
                      "para": None, "sents": [], "gold_sent": None, "split": bucket("nq|" + qn)})
    return items


def split_items(items, exclusions):
    """Apply exclusions and cross-split disjointness. Returns (items_by_split, report)."""
    report = {"excluded_benchmark": 0, "dropped_question_cross_split": 0, "dropped_answer_cross_split": 0}
    kept = []
    for it in items:
        if qt.question_keys(it["question"]) & exclusions:
            report["excluded_benchmark"] += 1
        else:
            kept.append(it)
    q_split = {}
    for it in kept:
        cur = q_split.get(it["qnorm"])
        if cur is None or ORDER[it["split"]] > ORDER[cur]:
            q_split[it["qnorm"]] = it["split"]
    stage = []
    for it in kept:
        if q_split[it["qnorm"]] != it["split"]:
            report["dropped_question_cross_split"] += 1
        else:
            stage.append(it)
    golds = {s: set() for s in ORDER}
    for it in stage:
        golds[it["split"]].update(qt.normalise(g) for g in it["golds"])
    above = {"train": golds["val"] | golds["test"], "val": golds["test"], "test": set()}
    out = {s: [] for s in ORDER}
    for it in stage:
        if any(qt.normalise(g) in above[it["split"]] for g in it["golds"]):
            report["dropped_answer_cross_split"] += 1
            continue
        out[it["split"]].append(it)
    # answer strings that each split's wrong answers must avoid (other splits' golds)
    final = {s: {qt.normalise(g) for it in out[s] for g in it["golds"]} for s in ORDER}
    forbidden = {s: set().union(*(final[o] for o in ORDER if o != s)) for s in ORDER}
    report["items"] = {s: len(v) for s, v in out.items()}
    return out, forbidden, report
