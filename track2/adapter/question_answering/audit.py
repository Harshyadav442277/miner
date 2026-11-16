"""Audit a built QUESTION_ANSWERING pair set. Writes <pairs>/audit.json; exit 1 on any failure.

  1. the kit's dataset gate (train_adapter --check-data) on train, val and test;
  2. length (longer/shorter wins) overall, per format pair and per kind;
  3. answer-only bag-of-words probe fitted on train, scored on val and test;
  4. format-only probe (all fields, then each field group alone) fitted on train;
  5. duplicates and leakage across splits; exclusion list re-check; counts.
Bars: every probe and length baseline <= 0.60 on val and test and overall on train (the bag-of-words
bar is on the five stated-answer kinds; refusal and echo are reported, see the comment below); format
pairs with at least MIN_CELL rows in train also <= 0.60.

    C:/Users/hyada/tg-eval/.venv/Scripts/python.exe -I audit.py C:/Users/hyada/tg-eval/pairs/question_answering_v1
"""
import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import qa_probes as qp  # noqa: E402
import qa_split  # noqa: E402
import qa_text as qt  # noqa: E402

BAR = 0.60
MIN_CELL = 100
NEG_RE = re.compile(r"\b(not|no|never|none|nothing|cannot|can't|don't|doesn't|isn't|wasn't|n/a|unknown|unclear)\b", re.I)
SPLITS = ("train", "val", "test")


def load(path):
    return [json.loads(l) for l in Path(path).read_text(encoding="utf-8").splitlines() if l.strip()]


def kit_gate(kit, py, path):
    p = subprocess.run([py, "-m", "float_runtime.train_adapter", "--intent", "QUESTION_ANSWERING", "--data", str(path),
                        "--check-data"], cwd=kit, capture_output=True, text=True, encoding="utf-8",
                       env={**os.environ, "HF_HUB_OFFLINE": "1", "PYTHONIOENCODING": "utf-8"})
    text = p.stdout
    get = lambda label: (re.search(label + r"\s+([\d.]+)%", text) or [None, None])[1]
    return {"exit": p.returncode, "pass": p.returncode == 0 and "dataset gate: PASS" in text,
            "unique_negatives_pct": get("unique negatives"), "largest_single_neg_pct": get("largest single neg"),
            "length_shortcut_pct": get("length shortcut"), "held_out_leak_pct": get("held-out leak"),
            "surface_probe_pct": get("surface probe"), "output": text.strip().splitlines()}


def stated_text(answer):
    """The answer's text fields when it is a JSON body, else the whole answer."""
    try:
        obj = json.loads(answer)
    except ValueError:
        return answer
    if not isinstance(obj, dict):
        return answer
    return " ".join(str(obj.get(k) or "") for k in ("answer", "summary", "result", "question"))


def leakage(rows, metas):
    rep = {}
    sets = {s: {"q": {m["qnorm"] for m in metas[s]}, "title": {m["title"] for m in metas[s] if m["title"]},
                "para": {m["para"] for m in metas[s] if m["para"]},
                "ans": {m["gold"] for m in metas[s]} | {m["r_ans"] for m in metas[s] if m["r_ans"]},
                "chosen": {r["chosen"] for r in rows[s]}, "rejected": {r["rejected"] for r in rows[s]},
                "prompt": {r["prompt"] for r in rows[s]}} for s in SPLITS}
    for a, b in (("train", "val"), ("train", "test"), ("val", "test")):
        for k in ("q", "title", "para", "ans", "prompt", "chosen", "rejected"):
            rep[f"{k}_{a}_{b}"] = len(sets[a][k] & sets[b][k])
    for s in ("val", "test"):  # the kit's leak measure against our train file
        rej_train = sets["train"]["rejected"]
        rep[f"{s}_rejected_in_train_pct"] = round(100 * sum(r["rejected"] in rej_train for r in rows[s]) / len(rows[s]), 2)
    for s in SPLITS:
        trip = Counter((r["prompt"], r["chosen"], r["rejected"]) for r in rows[s])
        rep[f"{s}_duplicate_rows"] = sum(v - 1 for v in trip.values())
        rep[f"{s}_duplicate_questions"] = len(metas[s]) - len({m["qnorm"] for m in metas[s]})
        top = Counter(r["rejected"] for r in rows[s]).most_common(1)[0]
        rep[f"{s}_top_rejected_share_pct"] = round(100 * top[1] / len(rows[s]), 2)
        rep[f"{s}_chosen_equals_rejected"] = sum(r["chosen"] == r["rejected"] for r in rows[s])
    return rep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pairs", type=Path)
    ap.add_argument("--kit", type=Path, default=Path("C:/Users/hyada/tg-eval/kit-v2"))
    ap.add_argument("--python", default="C:/Users/hyada/tg-eval/.venv/Scripts/python.exe")
    ap.add_argument("--exclusions", type=Path, default=HERE / "holdout" / "benchmark_questions.txt")
    ap.add_argument("--skip-kit", action="store_true", help="tests only")
    a = ap.parse_args()
    rows = {s: load(a.pairs / f"{s}.jsonl") for s in SPLITS}
    metas = {s: load(a.pairs / f"{s}.meta.jsonl") for s in SPLITS}
    problems, out = [], {"bar": BAR, "ties": "count half"}
    if not a.skip_kit:
        out["kit_gate"] = {s: kit_gate(a.kit, a.python, a.pairs / f"{s}.jsonl") for s in SPLITS}
        if not out["kit_gate"]["train"]["pass"]:
            problems.append("kit dataset gate fails on train")
    out["counts"] = {s: {"pairs": len(rows[s]), "kind": dict(sorted(Counter(r["kind"] for r in rows[s]).items())),
                         "format_pair": dict(sorted(Counter(r["format"] for r in rows[s]).items())),
                         "source": dict(Counter(r["source"].split("#")[0].rsplit("/", 1)[1] for r in rows[s])),
                         "cross_format_pct": round(100 * sum(a_ != b_ for a_, b_ in
                                                             (r["format"].split("-vs-") for r in rows[s])) / len(rows[s]), 2)}
                     for s in SPLITS}
    for s in SPLITS:
        if out["counts"][s]["cross_format_pct"] < 40:
            problems.append(f"{s}: cross-format share {out['counts'][s]['cross_format_pct']}% < 40%")
    out["length"] = {s: {"overall": qp.length_baselines(rows[s]), "by_format_pair": qp.length_by(rows[s], "format"),
                         "by_kind": qp.length_by(rows[s], "kind")} for s in SPLITS}
    for s in SPLITS:
        o = out["length"][s]["overall"]
        if max(o["longer"], o["shorter"]) > BAR:
            problems.append(f"{s}: length baseline {max(o['longer'], o['shorter'])}")
    # Same-format cells must be balanced. A cross-format cell (bare vs json) is decided by the
    # formats, which are drawn independently of the label, so it is checked with its mirror
    # cell (json vs bare): together they must be balanced.
    out["length_format_unordered"] = {}
    for s in SPLITS:
        merged = {}
        for r in rows[s]:
            key = "~".join(sorted(r["format"].split("-vs-")))
            merged.setdefault(key, []).append(r)
        out["length_format_unordered"][s] = {k: qp.length_baselines(v) for k, v in sorted(merged.items())}
    for cell, v in out["length_format_unordered"]["train"].items():
        if v["n"] >= MIN_CELL and max(v["longer"], v["shorter"]) > BAR:
            problems.append(f"train format pair {cell}: length baseline {max(v['longer'], v['shorter'])} (n={v['n']})")
    sys.path.insert(0, str(a.kit))
    from float_runtime.train_adapter import _tokens
    bow = qp.BowProbe(rows["train"], _tokens)
    out["bow"] = {s: round(bow.acc(rows[s]), 4) for s in SPLITS}
    out["bow_by_kind"] = {s: {k: round(bow.acc([r for r in rows[s] if r["kind"] == k]), 4)
                              for k in sorted({r["kind"] for r in rows[s]})} for s in ("val", "test")}
    out["bow_top_features"] = bow.top_features()
    # The bar applies to the five kinds whose rejected side is a stated answer or a quote. A refusal
    # or an echo of the question is wrong whatever the question was (ARCHITECTURE A3 rule 1), so an
    # answer-only probe is right to spot it: those two kinds are reported, not gated. Decided
    # 2026-11-15; the all-kinds number stays in out["bow"].
    out["bow_stated_answer_kinds"] = {s: round(bow.acc([r for r in rows[s] if r["kind"] not in ("refusal", "echo")]), 4)
                                      for s in ("val", "test")}
    for s in ("val", "test"):
        if out["bow_stated_answer_kinds"][s] > BAR:
            problems.append(f"{s}: bag-of-words probe on stated-answer kinds {out['bow_stated_answer_kinds'][s]}; "
                            f"top tokens {out['bow_top_features']}")
    out["format_probe"] = {}
    for name, groups in [("all", qp.FORMAT_GROUPS)] + [(g, [g]) for g in qp.FORMAT_GROUPS]:
        fp = qp.FormatProbe(rows["train"], metas["train"], groups)
        res = {s: round(fp.acc(rows[s], metas[s]), 4) for s in SPLITS}
        res["top_features"] = fp.top_features()
        out["format_probe"][name] = res
        for s in ("val", "test"):
            if res[s] > BAR:
                problems.append(f"{s}: format-only probe [{name}] {res[s]}; features {res['top_features']}")
    # v2: answer-only negation probe. "Prefer the side with no negation word" must not predict the label
    # (v1 preferred the non-negated statement 60/60 and 59/60 on the val-split bias probes, 2026-11-16).
    neg = lambda t: bool(NEG_RE.search(t))
    neg_acc = lambda rs: round(sum(0.5 if neg(r["chosen"]) == neg(r["rejected"]) else float(not neg(r["chosen"]))
                                   for r in rs) / len(rs), 4) if rs else None
    out["negation_probe"] = {s: neg_acc(rows[s]) for s in SPLITS}
    out["negation_probe_by_kind"] = {s: {k: neg_acc([r for r in rows[s] if r["kind"] == k])
                                         for k in sorted({r["kind"] for r in rows[s]})} for s in ("val",)}
    for s in SPLITS:
        if out["negation_probe"][s] > BAR:
            problems.append(f"{s}: negation-word probe {out['negation_probe'][s]}")
    # a true negation ("not <wrong answer>") is right without stating the gold answer
    out["chosen_missing_gold"] = {s: sum(r["kind"] != "true_negation" and not qt.contains_answer(r["chosen"], [m["gold_text"]])
                                         for r, m in zip(rows[s], metas[s])) for s in SPLITS}
    # the question itself may contain the answer ("encourage or discourage?"), so it is removed first
    # and only the stated text counts, not a citation title ("Athanasius of Alexandria")
    no_q = lambda r: stated_text(r["rejected"]).replace(r["prompt"].rstrip("?"), " ")
    out["refusal_rejected_with_gold"] = {s: sum(r["kind"] == "refusal" and qt.contains_answer(no_q(r), [m["gold_text"]])
                                                for r, m in zip(rows[s], metas[s])) for s in SPLITS}
    for k in ("chosen_missing_gold", "refusal_rejected_with_gold"):
        if any(out[k].values()):
            problems.append(f"{k}: {out[k]}")
    out["leakage"] = leakage(rows, metas)
    for k, v in out["leakage"].items():
        if re.match(r"(q|title|para|ans|prompt|chosen)_", k) and v:
            problems.append(f"cross-split overlap {k} = {v}")
    if a.exclusions.exists():
        excl = qa_split.load_exclusions(a.exclusions)
        hits = sum(bool(qt.question_keys(r["prompt"]) & excl) for s in SPLITS for r in rows[s])
        out["exclusion_hits"] = hits
        if hits:
            problems.append(f"{hits} prompts are benchmark questions")
    else:
        out["exclusion_hits"] = "exclusion file missing"
    out["problems"] = problems
    out["verdict"] = "PASS" if not problems else "FAIL"
    (a.pairs / "audit.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    brief = {"verdict": out["verdict"], "bow": out["bow"],
             "format_probe_all": {s: out["format_probe"]["all"][s] for s in SPLITS},
             "length": {s: out["length"][s]["overall"] for s in SPLITS}, "problems": problems}
    print(json.dumps(brief, indent=1))
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
