"""Unit tests for the holdout builders. Run from this folder: python -m unittest"""
import json
import tempfile
import unittest
from pathlib import Path

import label
from build_queries import format_question, gradable, time_sensitive
from common import contains_tokens, normalize


def response(qid, query, body, status=200):
    return {"query_id": qid, "query": query, "status": status, "body": body}


def miner(slug, responses, related=False):
    return {"slug": slug, "related_party": related, "responses": responses}


class TimeFilter(unittest.TestCase):
    def test_dropped(self):
        for q in ["who is the president of france", "Who are the current members of the senate",
                  "when did the latest iphone come out", "how many movies have been made about batman",
                  "what season does the walking dead return", "who has the most goals of all time",
                  "who won the 2016 election", "when is the next solar eclipse", "what is the reigning champion"]:
            self.assertTrue(time_sensitive(q), q)

    def test_kept(self):
        for q in ["who painted the mona lisa", "what is the capital of france", "when did the berlin wall fall",
                  "who won the 1998 world cup", "where is the louvre located"]:
            self.assertFalse(time_sensitive(q), q)

    def test_gradable_and_format(self):
        self.assertTrue(gradable(["Paris"]))
        self.assertFalse(gradable(["a"]))
        self.assertFalse(gradable(["one two three four five six"]))
        self.assertFalse(gradable(["a1", "b2", "c3", "d4"]))
        self.assertEqual(format_question("who painted it"), "Who painted it?")


class Matching(unittest.TestCase):
    def test_whole_token(self):
        self.assertFalse(contains_tokens(normalize("a comparison of cities"), normalize("paris")))
        self.assertTrue(contains_tokens(normalize("It is Paris, France."), normalize("paris")))
        self.assertTrue(contains_tokens(normalize("The Eiffel Tower"), normalize("eiffel tower")))

    def test_accents_articles(self):
        self.assertEqual(normalize("The Café"), "cafe")

    def test_json_answer_field(self):
        label_, text = label.classify(200, json.dumps({"answer": "Leonardo da Vinci painted it.[1]"}),
                                      ["Leonardo da Vinci"])
        self.assertEqual((label_, text), ("correct", "Leonardo da Vinci painted it.[1]"))

    def test_key_order_and_fallback(self):
        body = json.dumps({"summary": "", "result": "Au is gold", "text": "x"})
        self.assertEqual(label.extract_answer(body)[0], "Au is gold")
        self.assertEqual(label.extract_answer("plain words")[0], "plain words")


class Refusal(unittest.TestCase):
    def test_no_answer(self):
        self.assertEqual(label.classify(200, "I could not find an answer.", ["Au"])[0], "no_answer")
        self.assertEqual(label.classify(200, json.dumps({"verdict": "not_found", "answer": "x"}), ["Au"])[0],
                         "no_answer")
        self.assertEqual(label.classify(200, json.dumps({"found": False, "summary": "n/a"}), ["Au"])[0],
                         "no_answer")

    def test_unusable_and_review(self):
        self.assertEqual(label.classify(401, '{"error":"missing key"}', ["Au"])[0], "unusable")
        self.assertEqual(label.classify(200, '{"error":"boom"}', ["Au"])[0], "unusable")
        self.assertEqual(label.classify(200, "", ["Au"])[0], "unusable")
        self.assertEqual(label.classify(200, "Silver is Ag.", ["Au"])[0], "needs_review")
        self.assertEqual(label.classify(200, "<rss>Au</rss>", ["Au"])[0], "needs_review")


class Systems(unittest.TestCase):
    def test_one_per_system_first_sorted_slug(self):
        gold = {"q1": ["Au"]}
        miners = {
            "zk-qa-source": miner("zk-qa-source", [response("q1", "Q?", json.dumps({"summary": "Au."}))]),
            "zk-qa-claims": miner("zk-qa-claims", [response("q1", "Q?", json.dumps({"summary": "Au!"}))]),
            "textwire-question-answering": miner("textwire-question-answering", [response("q1", "Q?", "x", 500)]),
            "other": miner("other", [response("q1", "Q?", "Au")]),
        }
        rows, _ = label.label_capture(miners, gold)
        by_sys = {r["system"]: r for r in rows}
        self.assertEqual(sorted(by_sys), ["other", "zk-text"])
        self.assertEqual(by_sys["zk-text"]["slug"], "zk-qa-claims")  # textwire unusable, claims first usable


class Pairs(unittest.TestCase):
    def setUp(self):
        gold = {"q1": ["Au"]}
        self.miners = {
            "good": miner("good", [response("q1", "What is gold's symbol?", json.dumps({"answer": "Au"}))]),
            "livecert": miner("livecert", [response("q1", "What is gold's symbol?", "It is Ag")], related=True),
            "none": miner("none", [response("q1", "What is gold's symbol?", "No answer found")]),
            "unreviewed": miner("unreviewed", [response("q1", "What is gold's symbol?", "Probably Pb")]),
            "skipped": miner("skipped", [response("q1", "What is gold's symbol?", "Unable to say")]),
        }
        self.rows, _ = label.label_capture(self.miners, gold)
        self.bodies = {(s, r["query_id"]): r["body"] for s, d in self.miners.items() for r in d["responses"]}

    def test_pairs(self):
        verdicts = {("q1", "livecert"): "incorrect", ("q1", "skipped"): "skip"}
        pairs = label.build_pairs(self.rows, verdicts, self.bodies)
        self.assertEqual({p["systems"] for p in pairs}, {"good>livecert", "good>none"})
        self.assertEqual(len(pairs), 4)  # two rejected sides x two formats
        self.assertFalse(any("Probably Pb" in p["rejected"] for p in pairs))  # unreviewed needs_review never used
        self.assertFalse(any("Unable to say" in p["rejected"] for p in pairs))
        live = [p for p in pairs if p["systems"] == "good>livecert"]
        self.assertTrue(all(p["related_party"] and p["kind"] == "wrong_answer" for p in live))
        none = [p for p in pairs if p["systems"] == "good>none"]
        self.assertTrue(all(not p["related_party"] and p["kind"] == "no_answer" for p in none))
        self.assertEqual({p["format"] for p in pairs}, {"body", "text"})
        body = next(p for p in live if p["format"] == "body")
        self.assertEqual((body["chosen"], body["rejected"]), ('{"answer": "Au"}', "It is Ag"))

    def test_body_cut(self):
        long = "x" * 9000 + " Ag"
        self.bodies[("livecert", "q1")] = long
        pairs = label.build_pairs(self.rows, {("q1", "livecert"): "incorrect"}, self.bodies)
        b = next(p for p in pairs if p["format"] == "body" and p["systems"] == "good>livecert")
        self.assertEqual(len(b["rejected"]), 6000)

    def test_files_roundtrip(self):
        with tempfile.TemporaryDirectory() as td:
            td = Path(td)
            (td / "cap").mkdir()
            for s, m in self.miners.items():
                (td / "cap" / f"miner-{s}.json").write_text(json.dumps(m), encoding="utf-8")
            (td / "gold.json").write_text(json.dumps({"q1": ["Au"]}), encoding="utf-8")
            label.main([str(td / "cap"), "--gold", str(td / "gold.json"), "--out", str(td / "o")])
            review = (td / "o" / "review.tsv").read_text(encoding="utf-8")
            self.assertIn("unreviewed", review)
            self.assertNotIn("\tgood\t", review)


if __name__ == "__main__":
    unittest.main()
