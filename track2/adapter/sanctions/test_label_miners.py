"""Keep unknown, other-list matches and transport failures out of correctness labels."""
import json
import unittest

from label_miners import label


class LabelTests(unittest.TestCase):
    def check(self, body, expected=True, **overrides):
        q = {"name": "Bank Example", "expected": expected, "sdn_ids": ["123"] if expected else []}
        r = {"queryable": True, "curl_exit": 0, "status": 200,
             "body": json.dumps({"name": "Bank Example", "source": "OFAC SDN", **body}), **overrides}
        return label(r, q)[0]

    def test_false_negative(self):
        self.assertIs(self.check({"matched": False}), False)

    def test_exact_positive(self):
        self.assertIs(self.check({"matched": True, "matches": [{"entry_id": "123"}]}), True)

    def test_wrong_evidence_abstains(self):
        self.assertIsNone(self.check({"matched": True, "matches": [{"entry_id": "999"}]}))

    def test_negative_not_global_clearance(self):
        self.assertIs(self.check({"matched": False}, expected=False), True)
        self.assertIsNone(self.check({"matched": True}, expected=False))

    def test_transport_error_not_incorrect(self):
        self.assertIsNone(self.check({"matched": False}, curl_exit=28))
        self.assertIsNone(self.check({"matched": False}, status=500))

    def test_static_and_unrelated_answers_abstain(self):
        self.assertIsNone(self.check({"matched": False}, queryable=False))
        self.assertIsNone(self.check({"name": "Another bank", "matched": True}))

    def test_contradiction_abstains(self):
        self.assertIsNone(self.check({"matched": True, "sanctioned": False}))

    def test_scope_and_unknown_abstain(self):
        self.assertIsNone(self.check({"matched": False, "source": "UN list"}))
        self.assertIsNone(self.check({"matched": False, "status": "unknown"}))

    def test_numeric_and_alternate_boolean(self):
        self.assertIs(self.check({"on_list": 0}), False)
        self.assertIs(self.check({"match": True}), True)
        self.assertIsNone(self.check({"on_list": "0"}))


if __name__ == "__main__":
    unittest.main()
