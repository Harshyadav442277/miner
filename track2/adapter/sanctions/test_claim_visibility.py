"""Boundary tests for JSON verdict visibility, including misleading nested/string keys."""
import json
from pathlib import Path
import unittest

from tokenizers import Tokenizer

from audit_claim_visibility import root_values, verdict_spans, visibility_record


class ClaimVisibilityTests(unittest.TestCase):
    def test_nested_and_quoted_claims_do_not_count_as_root_verdicts(self):
        raw = json.dumps({"details": {"match": False}, "text": 'escaped "matched": false', "matched": True})
        spans = verdict_spans(raw)
        self.assertEqual([(k, v) for k, v, _, _ in spans], [("matched", True)])

    @unittest.skipUnless(Path('C:/Users/hyada/tg-eval/foundation/tokenizer.json').exists(), 'pinned tokenizer required')
    def test_actual_token_budget_hides_late_verdict_but_keeps_early_verdict(self):
        tok = Tokenizer.from_file('C:/Users/hyada/tg-eval/foundation/tokenizer.json')
        tok.enable_truncation(max_length=256)
        late = json.dumps({"padding": "many words " * 400, "matched": False})
        early = json.dumps({"matched": False, "padding": "many words " * 400})
        self.assertFalse(visibility_record(tok, 'Screen Example.', late)['all_machine_claims_visible'])
        self.assertTrue(visibility_record(tok, 'Screen Example.', early)['all_machine_claims_visible'])

    def test_only_declared_machine_value_types_are_claims(self):
        raw = '{"matched":"false", "match":null, "on_list":2, "sanctioned":0, "verdict":"MATCH"}'
        self.assertEqual([(k, v) for k, v, _, _ in verdict_spans(raw)], [("sanctioned", False), ("verdict", True)])

    def test_escaped_unicode_and_punctuation_preserve_exact_spans(self):
        raw = ' { "name":"A \\u263a \\"B\\"", "matched": true, "tail":[1,2] } '
        fields = root_values(raw)
        for _, value, start, end in fields:
            self.assertEqual(json.loads(raw[start:end]), value)


if __name__ == "__main__":
    unittest.main()
