"""Failure tests for the actual tokenizer's reversal/visibility invariants."""
import copy
import json
import os
from pathlib import Path
import unittest

from tokenizers import Tokenizer
from binding_benchmark import PROMPT, audit, compatible

PINNED = Path(os.environ.get("TELEGRAPH_TOKENIZER", "C:/Users/hyada/tg-eval/foundation/tokenizer.json"))


@unittest.skipUnless(PINNED.exists(), "released pinned tokenizer required")
class BindingTests(unittest.TestCase):
    def setUp(self):
        self.full = Tokenizer.from_file(str(PINNED))
        self.tok = Tokenizer.from_file(str(PINNED))
        self.tok.enable_truncation(max_length=256)
        self.rows = []
        # Toy names test the pairing contract, not factual SDN membership.
        for i, (hit, a, b) in enumerate(((False, "North Example Ltd", "South Example Ltd"),
                                        (True, "East Example Ltd", "West Example Ltd"))):
            aa = json.dumps({"name": a, "matched": hit, "details": "evidence " * 300})
            bb = json.dumps({"name": b, "matched": hit})
            for q, other, c, r in ((a, b, aa, bb), (b, a, bb, aa)):
                self.rows.append({"name": q, "rejected_name": other, "prompt": PROMPT.format(q=q),
                                  "chosen": c, "rejected": r, "expected_membership": hit,
                                  "source_id_metadata_only": "fixture", "block_id": str(i)})

    def test_valid_reversal_has_half_length_baselines(self):
        result = audit(self.rows, self.tok, self.full)
        self.assertEqual(result["character_length_baseline_tie_aware"], .5)
        self.assertEqual(result["visible_token_length_baseline_tie_aware"], .5)

    def test_unreversed_answers_rejected(self):
        rows = copy.deepcopy(self.rows)
        rows[1]["rejected"] = "different body"
        with self.assertRaises(AssertionError):
            audit(rows, self.tok, self.full)

    def test_provider_imbalance_rejected(self):
        rows = copy.deepcopy(self.rows)
        rows[1]["source_id_metadata_only"] = "other"
        with self.assertRaises(AssertionError):
            audit(rows, self.tok, self.full)

    def test_single_membership_class_rejected(self):
        with self.assertRaises(AssertionError):
            audit(self.rows[:2], self.tok, self.full)

    def test_explicit_absent_stratum_remains_narrow(self):
        result = audit(self.rows[:2], self.tok, self.full, require_both=False)
        self.assertEqual(result["membership_counts"], {"False": 2})
        with self.assertRaises(AssertionError):
            audit(self.rows, self.tok, self.full, require_both=False)

    def test_unequal_question_prefix_rejected(self):
        left = {"name": "North Example Ltd", "answer": self.rows[0]["chosen"]}
        right = {"name": "A very long unrelated company name with many extra words Ltd", "answer": self.rows[0]["rejected"]}
        self.assertFalse(compatible(self.tok, self.full, left, right))

    def test_invisible_or_ambiguous_names_rejected(self):
        left = {"name": "North Example Ltd", "answer": json.dumps({"padding": "x " * 600, "name": "North Example Ltd"})}
        right = {"name": "South Example Ltd", "answer": self.rows[0]["rejected"]}
        self.assertFalse(compatible(self.tok, self.full, left, right))
        left["answer"] = "North Example Ltd and South Example Ltd"
        self.assertFalse(compatible(self.tok, self.full, left, right))


if __name__ == "__main__":
    unittest.main()
