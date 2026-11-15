"""Build the public-benchmark half of the holdout: 150 TruthfulQA pairs and 150 HaluEval QA pairs.

    python build_benchmarks.py

Needs queries.json (run build_queries.py first). Writes benchmarks.jsonl, benchmarks.manifest.json and
benchmark_questions.txt (every benchmark and NQ question, normalised, for excluding from training data).
Deterministic. The answers are other people's: TruthfulQA's authors wrote both sides; HaluEval's
right answers come from HotpotQA and its wrong answers were machine-written by its authors.
"""
import csv
import json
import random
import re
import subprocess
from pathlib import Path

from common import HOLDOUT_DIR, RAW_DIR, SEED, download, normalize_question, sha256_file, write_json, write_lines

TQA_BASE = "https://raw.githubusercontent.com/sylinrl/TruthfulQA/main/"
HALU_BASE = "https://raw.githubusercontent.com/RUCAIBox/HaluEval/main/"
URLS = {"truthfulqa": TQA_BASE + "TruthfulQA.csv", "halueval": HALU_BASE + "data/qa_data.json"}
LICENCE_URLS = {"truthfulqa": TQA_BASE + "LICENSE", "halueval": HALU_BASE + "LICENSE"}
N = 150


def same(a, b):
    return " ".join(a.lower().split()) == " ".join(b.lower().split())


def usable(prompt, chosen, rejected):
    return all(s.strip() for s in (prompt, chosen, rejected)) and not same(chosen, rejected)


def truthfulqa_rows(path, rng):
    with open(path, encoding="utf-8", newline="") as fh:
        records = list(csv.DictReader(fh))
    need = {"Question", "Best Answer", "Incorrect Answers"}
    if not need <= set(records[0]):
        raise SystemExit(f"TruthfulQA columns changed: {list(records[0])}")
    rows, dropped = [], 0
    for i in sorted(rng.sample(range(len(records)), N)):
        r = records[i]
        wrong = [w.strip() for w in r["Incorrect Answers"].split("; ") if w.strip()]
        pick = rng.choice(wrong) if wrong else ""
        if usable(r["Question"].strip(), r["Best Answer"].strip(), pick):
            rows.append(mk(r["Question"].strip(), r["Best Answer"].strip(), pick, "misconception", "truthfulqa"))
        else:
            dropped += 1
    return rows, len(records), dropped


def halueval_rows(path, rng):
    records = [json.loads(ln) for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    need = {"question", "right_answer", "hallucinated_answer"}
    if not need <= set(records[0]):
        raise SystemExit(f"HaluEval columns changed: {list(records[0])}")
    # HaluEval's wrong answers are usually the longer side (a plain sample had the shorter answer
    # right in 142 of 150 pairs), so "prefer shorter" would nearly solve it. Sample half the rows
    # from pairs whose right answer is longer and half from pairs where it is shorter. The strata
    # use text length only and were fixed on 2026-11-15, before any model was scored on the set.
    strata, dropped = {"longer": [], "shorter": []}, 0
    for i, r in enumerate(records):
        q, c, w = r["question"].strip(), r["right_answer"].strip(), r["hallucinated_answer"].strip()
        if not usable(q, c, w):
            dropped += 1
        elif len(c) != len(w):
            strata["longer" if len(c) > len(w) else "shorter"].append(i)
    picked = sorted(rng.sample(strata["longer"], N // 2) + rng.sample(strata["shorter"], N - N // 2))
    rows = []
    for i in picked:
        r = records[i]
        rows.append(mk(r["question"].strip(), r["right_answer"].strip(), r["hallucinated_answer"].strip(),
                       "hallucinated", "halueval"))
    return rows, len(records), dropped


def mk(prompt, chosen, rejected, kind, source):
    return {"prompt": prompt, "chosen": chosen, "rejected": rejected, "kind": kind, "source": source,
            "format": "bare", "related_party": False}


def licence_title(path):
    text = Path(path).read_text(encoding="utf-8")
    first = next(ln.strip() for ln in text.splitlines() if ln.strip())
    version = re.search(r"Version \d\.\d", text)
    return first + (" " + version.group(0) if version else "")


def main():
    srcs = {k: download(u, RAW_DIR / Path(u).name) for k, u in URLS.items()}
    lic = {}
    for k, u in LICENCE_URLS.items():
        try:
            lic[k] = download(u, RAW_DIR / (k + "_LICENSE.txt"))
        except subprocess.CalledProcessError:
            raise SystemExit(f"no LICENSE file at {u}")
    tq, tq_total, tq_drop = truthfulqa_rows(srcs["truthfulqa"], random.Random(SEED))
    hl, hl_total, hl_drop = halueval_rows(srcs["halueval"], random.Random(SEED))
    rows = tq + hl
    (HOLDOUT_DIR / "benchmarks.jsonl").write_bytes(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows).encode("utf-8"))

    nq = json.loads((HOLDOUT_DIR / "queries.json").read_text(encoding="utf-8"))
    questions = [normalize_question(r["prompt"]) for r in rows] + [normalize_question(q["query"]) for q in nq]
    write_lines(HOLDOUT_DIR / "benchmark_questions.txt", questions)

    def stats(rs, total, dropped):
        return {"source_rows": total, "sampled": N, "dropped_unusable": dropped, "rows": len(rs),
                "longer_chosen": sum(len(r["chosen"]) > len(r["rejected"]) for r in rs),
                "shorter_chosen": sum(len(r["chosen"]) < len(r["rejected"]) for r in rs),
                "equal_length": sum(len(r["chosen"]) == len(r["rejected"]) for r in rs)}

    manifest = {
        "seed": SEED,
        "sources": {
            "truthfulqa": {"url": URLS["truthfulqa"], "sha256": sha256_file(srcs["truthfulqa"]),
                           "licence_url": LICENCE_URLS["truthfulqa"], "licence_sha256": sha256_file(lic["truthfulqa"]),
                           "licence": licence_title(lic["truthfulqa"]),
                           "columns_used": ["Question", "Best Answer", "Incorrect Answers (split on '; ')"],
                           **stats(tq, tq_total, tq_drop)},
            "halueval": {"url": URLS["halueval"], "sha256": sha256_file(srcs["halueval"]),
                         "licence_url": LICENCE_URLS["halueval"], "licence_sha256": sha256_file(lic["halueval"]),
                         "licence": licence_title(lic["halueval"]),
                         "columns_used": ["question", "right_answer", "hallucinated_answer"],
                         **stats(hl, hl_total, hl_drop)},
        },
        "rows_total": len(rows),
        "benchmark_questions_lines": len(questions),
        "outputs_sha256": {n: sha256_file(HOLDOUT_DIR / n) for n in ("benchmarks.jsonl", "benchmark_questions.txt")},
    }
    write_json(HOLDOUT_DIR / "benchmarks.manifest.json", manifest)
    print(json.dumps({k: {x: v[x] for x in ("rows", "longer_chosen", "shorter_chosen", "dropped_unusable")}
                      for k, v in manifest["sources"].items()}, indent=1))


if __name__ == "__main__":
    main()
