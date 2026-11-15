"""Invariants of the QUESTION_ANSWERING pair builder, on a small synthetic build (no downloads,
no tokenizer). Run: C:/Users/hyada/tg-eval/.venv/Scripts/python.exe -m unittest test_build -v
"""
import json
import random
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_pairs  # noqa: E402
import qa_probes  # noqa: E402
import qa_text as qt  # noqa: E402

FIRST = ["Alma", "Boris", "Clara", "Dmitri", "Edith", "Farid", "Greta", "Hugo", "Irene", "Jonas"]
LAST = ["Varga", "Okafor", "Lindqvist", "Moreau", "Tanaka", "Silva", "Novak", "Haddad"]
RIVERS = ["Avon", "Brisk", "Corran", "Dalle", "Esker", "Fennow", "Garra", "Hollin"]


def synthetic_squad(n_articles=60):
    data = []
    for k in range(n_articles):
        town = f"Town{k}"
        person = f"{FIRST[k % 10]} {LAST[(k // 10) % 8]}{k}"
        year, bridges, river = 1700 + 4 * k, 10 + 3 * k, f"{RIVERS[k % 8]}{k}"
        ctx = (f"{town} was founded in {year} by settlers from the coast. Its first mayor was {person}, who served "
               f"for many years. The town has {bridges} bridges across its canals. The river {river} flows through "
               f"the old quarter of {town}. Markets are held every week in the main square.")
        qas = []
        for i, (q, a) in enumerate([(f"When was {town} founded?", str(year)), (f"Who was the first mayor of {town}?", person),
                                    (f"How many bridges does {town} have?", str(bridges)),
                                    (f"Which river flows through {town}?", river)]):
            qas.append({"id": f"s{k}_{i}", "question": q, "answers": [{"text": a, "answer_start": ctx.index(" " + a) + 1}]})
        data.append({"title": f"Town_{k}", "paragraphs": [{"context": ctx, "qas": qas}]})
    return {"version": "1.1", "data": data}


def synthetic_nq(n=300):
    rows = []
    for k in range(n):
        if k % 3 == 0:
            rows.append({"question": f"who wrote the novel number {k}", "answer": [f"{FIRST[k % 10]} {LAST[k % 8]}son{k}"]})
        elif k % 3 == 1:
            rows.append({"question": f"when was bridge {k} opened", "answer": [str(1850 + k)]})
        else:
            rows.append({"question": f"how many floors does tower {k} have", "answer": [str(20 + k)]})
    return rows


class BuildTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        d = Path(cls.tmp.name)
        (d / "squad.json").write_text(json.dumps(synthetic_squad()), encoding="utf-8")
        (d / "nq.jsonl").write_text("".join(json.dumps(r) + "\n" for r in synthetic_nq()), encoding="utf-8")
        cls.excluded = ["Who was the first mayor of Town3?", "how many floors does tower 5 have"]
        (d / "excl.txt").write_text("\n".join(q.lower() for q in cls.excluded) + "\n", encoding="utf-8")
        cls.args = ["--data", str(d), "--squad", "squad.json", "--nq", "nq.jsonl", "--no-token-check",
                    "--train", "300", "--val", "35", "--test", "35"]
        cls.out = d / "pairs"
        build_pairs.main(cls.args + ["--exclusions", str(d / "excl.txt"), "--out", str(cls.out)])
        load = lambda p: [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
        cls.rows = {s: load(cls.out / f"{s}.jsonl") for s in ("train", "val", "test")}
        cls.meta = {s: load(cls.out / f"{s}.meta.jsonl") for s in ("train", "val", "test")}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_label_not_predictable_from_format_fields(self):
        sides = Counter()
        for s in self.rows:
            for m in self.meta[s]:
                sides[("chosen", m["chosen"]["format"])] += 1
                sides[("rejected", m["rejected"]["format"])] += 1
        for f in ("bare", "sentence", "supported", "json"):
            c, r = sides[("chosen", f)], sides[("rejected", f)]
            self.assertLess(abs(c - r), 0.25 * max(c + r, 1) + 8, f"format {f}: chosen {c} vs rejected {r}")
        fp = qa_probes.FormatProbe(self.rows["train"], self.meta["train"], qa_probes.FORMAT_GROUPS)
        held = self.rows["val"] + self.rows["test"]
        self.assertLessEqual(fp.acc(held, self.meta["val"] + self.meta["test"]), 0.70)

    def test_splits_disjoint(self):
        for key in ("qnorm", "title", "para", "gold"):
            sets = {s: {m[key] for m in self.meta[s] if m[key]} for s in self.meta}
            for a, b in (("train", "val"), ("train", "test"), ("val", "test")):
                self.assertFalse(sets[a] & sets[b], f"{key} shared by {a} and {b}")
        wrong = {s: {m["r_ans"] for m in self.meta[s] if m["r_ans"]} for s in self.meta}
        golds = {s: {m["gold"] for m in self.meta[s]} for s in self.meta}
        for a in self.meta:
            for b in self.meta:
                if a != b:
                    self.assertFalse(wrong[a] & golds[b], f"wrong answer of {a} is a gold of {b}")

    def test_exclusions_honoured(self):
        keys = set().union(*(qt.question_keys(q) for q in self.excluded))
        for s in self.rows:
            for r in self.rows[s]:
                self.assertFalse(qt.question_keys(r["prompt"]) & keys, r["prompt"])
        with self.assertRaises(SystemExit):
            build_pairs.main(self.args + ["--exclusions", str(Path(self.tmp.name) / "missing.txt"),
                                          "--out", str(Path(self.tmp.name) / "x")])

    def test_perturbations_never_reproduce_answer(self):
        rng = random.Random(7)
        for ans in ["1989", "9 November 1989", "1,000", "3.5", "three", "12", "May 4, 1970", "45%", "1", "2026"]:
            for _ in range(200):
                p = qt.perturb(ans, rng)
                if p is None:
                    continue
                self.assertNotEqual(qt.normalise(p), qt.normalise(ans))
                self.assertFalse(qt.same_answer(p, [ans]), (ans, p))
        for s in self.meta:
            for m in self.meta[s]:
                if m["r_ans"]:
                    self.assertNotEqual(m["r_ans"], m["gold"])

    def test_chosen_always_carries_gold_and_refusals_only_lose(self):
        """Every chosen side states the gold answer, so no pair ranks a refusal above anything,
        and no pair puts a refusal against a wrong answer."""
        n_ref = 0
        for s in self.rows:
            for r, m in zip(self.rows[s], self.meta[s]):
                self.assertTrue(qt.contains_answer(r["chosen"], [m["gold_text"]]), (r["kind"], r["chosen"], m["gold_text"]))
                if r["kind"] == "refusal":
                    n_ref += 1
                    self.assertIsNone(m["r_ans"])
                    self.assertFalse(qt.contains_answer(r["rejected"], [m["gold_text"]]), r["rejected"])
        self.assertGreater(n_ref, 0)

    def test_byte_reproducible(self):
        out2 = Path(self.tmp.name) / "pairs2"
        build_pairs.main(self.args + ["--exclusions", str(Path(self.tmp.name) / "excl.txt"), "--out", str(out2)])
        for s in ("train", "val", "test"):
            self.assertEqual((self.out / f"{s}.jsonl").read_bytes(), (out2 / f"{s}.jsonl").read_bytes())


if __name__ == "__main__":
    unittest.main()
