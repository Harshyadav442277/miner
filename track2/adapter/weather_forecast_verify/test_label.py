import unittest

import label as L


def cand(g, e):
    return {"ghcn": {"temp_max_c": g} if g is not None else None, "era5": e}


class JudgeTests(unittest.TestCase):
    def test_right_needs_both_sources(self):
        self.assertEqual(L.judge(20.0, [cand(20.5, 19.0)])[0], "right")
        self.assertEqual(L.judge(20.0, [cand(20.5, 17.0)])[0], "drop")    # 3.0 from ERA5 but 0.5 from GHCN

    def test_wrong_needs_both_sources_far(self):
        self.assertEqual(L.judge(30.0, [cand(20.0, 21.0)])[0], "wrong")
        self.assertEqual(L.judge(23.5, [cand(20.0, 21.0)])[0], "drop")    # 2.5 from ERA5

    def test_ambiguous_any_candidate_right_all_candidates_wrong(self):
        cs = [cand(10.0, 10.5), cand(30.0, 29.0)]
        self.assertEqual(L.judge(30.5, cs)[0], "right")
        self.assertEqual(L.judge(20.0, cs)[0], "wrong")
        self.assertEqual(L.judge(20.0, cs + [cand(None, None)])[0], "drop")   # a candidate with no truth cannot be ruled out

    def test_wrong_kinds(self):
        self.assertEqual(L.wrong_kind(68.0, 40.0, [cand(20.0, 20.0)]), "unit_fahrenheit")
        self.assertEqual(L.wrong_kind(70.0, 50.0, [cand(5.0, 5.0)]), "out_of_range")
        self.assertEqual(L.wrong_kind(26.0, 6.0, [cand(20.0, 20.0)]), "near_wrong")


class ParseTests(unittest.TestCase):
    def test_statuses(self):
        ok = {"status": 200, "body": '{"temp_max_c": 21.3, "date": "d", "extra": 1}'}
        self.assertEqual(L.parse_answer(ok), ("ok", {"date": "d", "temp_max_c": 21.3}))
        self.assertEqual(L.parse_answer({"status": 200, "body": '{"temp_max_c": null}'})[0], "no_value")
        self.assertEqual(L.parse_answer({"status": 200, "body": "<html>"})[0], "non_json")
        self.assertEqual(L.parse_answer({"status": 401, "body": "{}"})[0], "transport")
        self.assertEqual(L.parse_answer({"status": 200, "body": "{}", "error": "x"})[0], "transport")

    def test_render_order_and_pick_is_deterministic(self):
        self.assertEqual(L.render({"temp_max_c": 1, "date": "d"}), '{"date": "d", "temp_max_c": 1}')
        items = [{"slug": "a"}, {"slug": "b"}, {"slug": "c"}]
        self.assertEqual(L.pick("w1", "right", items), L.pick("w1", "right", list(reversed(items))))


if __name__ == "__main__":
    unittest.main()
