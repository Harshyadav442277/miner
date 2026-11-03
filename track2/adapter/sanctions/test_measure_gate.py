"""CLI must enforce frozen cohort permission before loading any foundation."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class FrozenMeasureGate(unittest.TestCase):
    def invoke(self, audit=None, max_tokens=256):
        with tempfile.TemporaryDirectory() as tmp:
            capture = Path(tmp) / "capture"
            capture.mkdir()
            # Nonempty pairs would previously permit scoring a 1-3-block cohort.
            (capture / "pairs.jsonl").write_text('{"prompt":"source fixture","chosen":"yes","rejected":"no"}\n')
            if audit is not None:
                (capture / "balanced-block-audit.json").write_text(json.dumps(audit))
            result = subprocess.run([sys.executable, str(Path(__file__).with_name("measure_miners.py")),
                                     str(capture), "--home", str(Path(tmp)/"missing-foundation"),
                                     "--max-tokens", str(max_tokens)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            return result.stderr

    def test_negative_frozen_gate_refuses_before_foundation(self):
        error = self.invoke({"score_allowed": False, "blocks": 2,
                             "minimum_blocks_for_scoring": 4, "max_tokens": 256})
        self.assertIn("gate forbids scoring", error)
        self.assertNotIn("FileNotFoundError", error)

    def test_true_flag_cannot_bypass_minimum_blocks(self):
        error = self.invoke({"score_allowed": True, "blocks": 3,
                             "minimum_blocks_for_scoring": 1, "max_tokens": 256})
        self.assertIn("at least four reversal blocks", error)
        self.assertNotIn("FileNotFoundError", error)

    def test_frozen_context_cannot_be_changed(self):
        error = self.invoke({"score_allowed": True, "blocks": 4,
                             "minimum_blocks_for_scoring": 4, "max_tokens": 256}, 512)
        self.assertIn("token limit differs", error)
        self.assertNotIn("FileNotFoundError", error)

    def test_legacy_cohort_still_reaches_foundation_validation(self):
        self.assertIn("FileNotFoundError", self.invoke())

    def test_permitted_four_blocks_reach_foundation_validation(self):
        error = self.invoke({"score_allowed": True, "blocks": 4,
                             "minimum_blocks_for_scoring": 4, "max_tokens": 256})
        self.assertIn("FileNotFoundError", error)
        self.assertNotIn("gate forbids scoring", error)


if __name__ == "__main__":
    unittest.main()
