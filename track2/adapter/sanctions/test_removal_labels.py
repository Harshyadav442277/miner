"""Keep ambiguous alerts separate from source-refutable membership assertions."""
import copy
import json
import unittest

from label_miners import label
from removal_labels import label_removed
from removal_notices import deletion_records, organization_names


class RemovalLabels(unittest.TestCase):
    def setUp(self):
        self.q = {"name": "EXAMPLE FORMER COMPANY LTD", "expected": False, "sdn_ids": [],
                  "removed_reference": {"notice_url": "https://ofac.treasury.gov/recent-actions/20260727"},
                  "removed_family_names": ["company example former ltd"]}

    def evaluate(self, body, query=None, active=()):
        q = query or self.q
        r = {"queryable": True, "status": 200, "curl_exit": 0,
             "body": json.dumps({"entity": q["name"], "source": "ofac_sdn_xml", **body})}
        return label_removed(r, q, label(r, q), set(active))

    def test_literal_membership_is_refutable(self):
        self.assertEqual(self.evaluate({"on_list": 1, "sanctioned": 1})[:2], (False, True))
        self.assertEqual(self.evaluate({"on_list": 0, "sanctioned": 0})[:2], (True, False))

    def test_old_cohort_without_proof_is_unchanged(self):
        q = {k: v for k, v in self.q.items() if k not in ("removed_reference", "removed_family_names")}
        self.assertIsNone(self.evaluate({"on_list": 1}, q)[0])

    def test_fuzzy_and_ownership_cues_abstain(self):
        for extra in ({"threshold": .88}, {"closest": {}}, {"scope": "ownership_based"}, {"summary": "Possible fuzzy alert"}):
            self.assertIsNone(self.evaluate({"on_list": 1, **extra})[0])

    def test_other_list_scope_abstains(self):
        for source in ("ofac_sdn_xml_and_uk_sanctions", "ofac_non_sdn", "ofac_sdn_and_un"):
            self.assertIsNone(self.evaluate({"on_list": 1, "source": source})[0])

    def test_match_or_sanctioned_alone_are_not_exact_membership(self):
        self.assertIsNone(self.evaluate({"match": True})[0])
        self.assertIsNone(self.evaluate({"sanctioned": 1})[0])

    def test_conflicting_claim_and_wrong_echo_abstain(self):
        self.assertIsNone(self.evaluate({"on_list": 1, "sanctioned": 0})[0])
        self.assertIsNone(self.evaluate({"on_list": 1, "entity": "OTHER NAME"})[0])

    def test_nonofficial_proof_abstains(self):
        q = copy.deepcopy(self.q)
        q["removed_reference"]["notice_url"] = "https://example.com/20260727"
        self.assertIsNone(self.evaluate({"on_list": 1}, q)[0])

    def record(self):
        return {"list": "OFAC SDN", "name": self.q["name"], "matched_name": self.q["name"],
                "match_type": "normalized_exact", "id": "123", "url": "https://sanctionssearch.ofac.treas.gov/Details.aspx?id=123"}

    def test_exact_stale_uid_refuted(self):
        self.assertEqual(self.evaluate({"matched": True, "matches": [self.record()]})[:2], (False, True))
        self.assertIsNone(self.evaluate({"matched": True, "matches": [self.record()]}, active=("123",))[0])

    def test_fuzzy_record_or_unverified_link_abstains(self):
        for changes in ({"match_type": "fuzzy"}, {"url": "https://example.com/Details.aspx?id=123"},
                        {"id": "124"}, {"name": "DIFFERENT CURRENT ENTITY"}):
            record = {**self.record(), **changes}
            self.assertIsNone(self.evaluate({"matched": True, "matches": [record]})[0])


class NoticeParsing(unittest.TestCase):
    def test_section_boundary_and_consolidated_names(self):
        text = '<table><tr><th>Name</th><th>Deleted UID</th><th>Retained UID</th></tr><tr><td>STILL LISTED LTD</td><td>1</td><td>2</td></tr></table><h4>The following deletions have been made to OFAC\'s SDN List:</h4><p>FIRST LTD, London [IRAQ2].<br><br>SECOND LTD, London [IRAQ2].</p><h4>The following additions:</h4><p>NOT A DELETION LTD, London.</p>'
        records, excluded = deletion_records(text)
        self.assertEqual(len(records), 2)
        self.assertIn("listed ltd still", excluded)
        self.assertNotIn("NOT A DELETION", " ".join(records))

    def test_aliases_and_legal_suffix_preserved(self):
        self.assertEqual(organization_names('EXAMPLE CASTINGS, LTD., London [IRAQ2].')[0], "EXAMPLE CASTINGS, LTD.")
        name, aliases = organization_names('FORMER LTD (a.k.a. OLD LTD; a.k.a. LEGACY LTD), London [IRAQ2].')
        self.assertEqual(name, "FORMER LTD")
        self.assertEqual(set(aliases), {"FORMER LTD", "OLD LTD", "LEGACY LTD"})
        self.assertIsNone(organization_names('PERSON, Example; DOB 01 Jan 1970 (individual) [SDNT].'))


if __name__ == "__main__":
    unittest.main()
