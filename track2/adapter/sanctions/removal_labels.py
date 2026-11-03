"""Narrow membership predicates for source-confirmed removals, not fuzzy clearance."""
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import parse_qs, urlsplit

from collect_miners import norm
from removal_notices import deletion_records, organization_names


def verify_proofs(capture, queries, index):
    stability = json.loads((capture / "source-stability.json").read_text(encoding="utf-8-sig"))
    assert stability["stable"] is True, "Source changed or was not rechecked after capture"
    recorded = stability["response_files"]
    assert {f.name for f in capture.glob("responses-*.json")} == set(recorded)
    assert all(hashlib.sha256((capture / name).read_bytes()).hexdigest() == value for name, value in recorded.items())
    manifest = json.loads((capture / "selection-manifest.json").read_text(encoding="utf-8"))
    assert hashlib.sha256((capture / "queries.json").read_bytes()).hexdigest() == manifest["queries_sha256"]
    for q in queries:
        if q["expected"]:
            continue
        ref = q["removed_reference"]
        assert re.fullmatch(r"notices/\d{8}\.json", ref["notice_capture"])
        url = urlsplit(ref["notice_url"])
        assert url.scheme == "https" and url.hostname == "ofac.treasury.gov"
        assert re.fullmatch(r"/recent-actions/\d{8}", url.path)
        raw = json.loads((capture / ref["notice_capture"]).read_text(encoding="utf-8"))
        assert raw["status"] == 200 and not raw["curl_exit"] and raw["url"] == ref["notice_url"]
        assert hashlib.sha256(raw["body"].encode()).hexdigest() == ref["notice_body_sha256"] == raw["sha256"]
        records, consolidated = deletion_records(raw["body"])
        assert records[ref["record_index"]] == ref["record"]
        parsed = organization_names(ref["record"])
        assert parsed is not None and parsed[0] == q["name"]
        family = set(q["removed_family_names"])
        assert {norm(n) for n in parsed[1]} <= family
        assert norm(q["name"]) in family and not family & consolidated
        assert not any(index.get(name) for name in family)


def label_removed(response, query, ordinary, active_ids):
    if ordinary[2] != "positive may be fuzzy or from another list" or query["expected"]:
        return ordinary
    ref = query.get("removed_reference", {})
    if not re.fullmatch(r"https://ofac\.treasury\.gov/recent-actions/\d{8}", ref.get("notice_url", "")):
        return None, ordinary[1], "no source-confirmed removal proof"
    d = json.loads(response["body"])
    scope = json.dumps({k: d.get(k) for k in ("source", "sources", "lists", "lists_checked")}).lower()
    if re.search(r"\b(?:un|eu|uk|hmt|consolidated|ownership)\b|\bnon\s*sdn\b", re.sub(r"[_-]", " ", scope)):
        return None, True, "positive scope includes unverified other lists or ownership"
    fuzzy_keys = ("closest", "threshold", "similarity", "similarity_score", "score", "match_score", "confidence", "match_type")
    if d.get("on_list") == 1 and "matches" not in d and not any(k in d for k in fuzzy_keys):
        if re.search(r"\b(?:fuzzy|ownership|similarity|approximate|possible|potential|threshold)\b", re.sub(r"[_-]", " ", json.dumps(d)), re.I):
            return None, True, "literal membership mixed with unverifiable alert semantics"
        return False, True, "literal current OFAC SDN on_list claim refuted by removal and frozen exact source"
    matches = d.get("matches")
    if not isinstance(matches, list) or not matches:
        return ordinary
    family = set(query.get("removed_family_names", []))
    for match in matches:
        if not isinstance(match, dict) or str(match.get("list", "")).upper() != "OFAC SDN":
            return None, True, "positive includes unverified other-list match"
        if match.get("match_type") not in ("exact", "normalized_exact", "normalized_exact_alias", "normalized_exact_primary"):
            return ordinary
        name = match.get("listed_name", match.get("name", ""))
        if norm(name) not in family or norm(match.get("matched_name", "")) != norm(query["name"]):
            return ordinary
        link = match.get("record_url", match.get("url", ""))
        url = urlsplit(link)
        ids = parse_qs(url.query).get("id", [])
        if url.scheme != "https" or url.username or url.hostname != "sanctionssearch.ofac.treas.gov" or url.path.lower() != "/details.aspx" or len(ids) != 1 or not ids[0].isdigit():
            return ordinary
        if ids[0] in active_ids:
            return None, True, "OFAC UID remains current; exact absence cannot refute this alert"
        declared = {str(match[k]) for k in ("id", "entry_id", "ent_num") if k in match}
        if declared and declared != {ids[0]}:
            return None, True, "record UID and official link disagree"
    return False, True, "exact removed-family OFAC record cites UID absent from current primary source"
