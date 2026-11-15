"""V3 response formats that copy the FIELD STRUCTURE of public URL_SCAN_VERDICT miner responses.

V2 ranked by format and length on real answers (H2 decision pairs 1/25): it never saw long,
truncated, field-heavy bodies or pairs across formats. These renderers reproduce only the shape
(field names, nesting, order, sentence frames, duplicated summaries, >512-token bodies) of the
response styles observed in public captures; every value comes from the synthetic record
(synth.make_record). No miner response text is copied and no captured answer is trained on.
"""
import json

HIT_RESULTS = {"listed", "blocked", "credential harvesting", "fake login", "suspicious", "score 0.93", "not ranked"}
SOURCE_URLS = {"CERT Polska Warning List": "https://hole.cert.pl/domains/v2/domains.csv",
               "Security DNS resolver": "https://security.cloudflare-dns.com/dns-query",
               "Unfiltered DNS": "https://dns.google/resolve", "Popularity ranking": "https://majestic.com/reports/majestic-million"}
UNREACHABLE = {"timeout", "HTTP 599", "NXDOMAIN", "error"}


def _hits(rec):
    return [s for s, r, _ in rec["evidence"] if r in HIT_RESULTS]


def _reachable(rec):
    return not any(r in UNREACHABLE for _, r, _ in rec["evidence"])


def _word(rec, safe="safe", unsafe="unsafe", none="unknown"):
    return none if rec["safe"] is None else (safe if rec["safe"] else unsafe)


def _lead(rec):
    return {True: "Yes, it is safe to visit.", False: "No, do not visit based on the observed risk.",
            None: "No verdict could be reached."}[rec["safe"]]


def m_certlist(rec):
    """Long, flat-then-nested JSON: verdict first, many null host fields, a checks list with URLs."""
    checks = [{"source": s, "source_url": SOURCE_URLS.get(s, "internal"), "host": rec["host"], "result": r,
               "detail": d, "fetched_at": rec["when"], "scope": "listed domain and its subdomains"
               if s == "CERT Polska Warning List" else "exact host, not page content"} for s, r, d in rec["evidence"]]
    ex = rec["extras"]
    return json.dumps({"intent": "URL_SCAN_VERDICT", "url": rec["url"], "safe": rec["safe"], "verdict": _word(rec),
                       "summary": f"{_lead(rec)} {rec['reason'][0].upper()}{rec['reason'][1:]}.", "risk_score": None,
                       "risk": None if rec["safe"] is None else ("no_evidence_of_risk" if rec["safe"] else "evidence_of_risk"),
                       "reachable": _reachable(rec), "https": rec["url"].startswith("https"), "tls_valid": None,
                       "status_code": None, "server": ex.get("server"), "content_type": ex.get("content_type"),
                       "final_url": None, "redirect_chain_complete": False, "redirect_chain": [],
                       "host_resolves": _reachable(rec), "flagged_by": _hits(rec), "checks": checks,
                       "reason": rec["reason"], "confidence": None if rec["risk"] is None else
                       round(1 - rec["risk"] if rec["safe"] else rec["risk"], 2), "checked_at": rec["when"],
                       "trace": rec["trace"]}, separators=(",", ":"))


def m_status_long(rec):
    """Summary sentence first, capitalised verdict word, nested tls block, the summary repeated as answer."""
    word = _word(rec, "Safe", "Suspicious" if (rec["risk"] or 0) < 0.85 else "Malicious", "Unknown")
    summary = f"{word}. {rec['reason'][0].upper()}{rec['reason'][1:]}. " + " ".join(
        f"{s}: {d}." for s, _, d in rec["evidence"])
    return json.dumps({"query": rec["url"], "status": rec["status"], "summary": summary,
                       "confidence": None if rec["risk"] is None else round(0.5 + abs(rec["risk"] - 0.5), 2),
                       "canonical": "url-scan:" + rec["host"], "verdict": word, "reachable": _reachable(rec),
                       "final_url": rec["url"] if _reachable(rec) else None, "http_status": 200 if _reachable(rec) else None,
                       "redirect_chain": None, "tls": {"checked": _reachable(rec), "reason": None if _reachable(rec)
                                                       else "connection failed"},
                       "reputation_flagged": bool(_hits(rec)), "reputation_sources": _hits(rec),
                       "checked_at": rec["when"], "answer": summary, "trace": rec["trace"]}, separators=(",", ":"))


def m_signal_answer(rec):
    """Short: verdict, numeric risk, one generated sentence repeated as signal and answer."""
    sentence = (f"The URL {rec['url']} is assessed as {_word(rec)}, with a risk score of {rec['risk']} on a 0 (safe) "
                f"to 1 (unsafe) scale: {rec['reason']}; " + "; ".join(d for _, _, d in rec["evidence"]) + ".")
    return json.dumps({"url": rec["url"], "verdict": _word(rec), "risk": rec["risk"],
                       "http_status": 200 if _reachable(rec) else 599, "source": "live-scan", "signal": sentence,
                       "answer": sentence, "ref": rec["trace"]}, separators=(",", ":"))


def m_preflight(rec):
    """URL decomposition fields, a checks_performed list, findings and an explanation."""
    scheme, _, rest = rec["url"].partition("://")
    return json.dumps({"url": rec["url"], "final_url": rec["url"] if _reachable(rec) else None, "hostname": rec["host"],
                       "scheme": scheme, "verdict": _word(rec), "reputation_checked": bool(rec["evidence"]),
                       "documented_incident": (", ".join(_hits(rec)) or None) if rec["safe"] is not None else None,
                       "documented_facts": None, "checks_performed": [s for s, _, _ in rec["evidence"]],
                       "findings": [{"check": s, "result": r, "detail": d} for s, r, d in rec["evidence"]],
                       "explanation": rec["reason"], **rec["extras"], "checked_at": rec["when"], "id": rec["trace"]},
                      separators=(",", ":"))


def m_answer_long(rec):
    """A full-sentence answer first, then verdict, confidence, sourced evidence and limitations."""
    lead = {True: f"Yes, {rec['url']} is safe to open", False: f"No, {rec['url']} is unsafe and should not be clicked",
            None: f"No verdict for {rec['url']}"}[rec["safe"]]
    return json.dumps({"answer": f"{lead}: {rec['reason']}.", "url": rec["url"], "verdict": _word(rec),
                       "confidence": None if rec["risk"] is None else round(1 - rec["risk"] if rec["safe"] else rec["risk"], 2),
                       "evidence": [{"source": s, "result": r, "detail": d, "source_url": SOURCE_URLS.get(s, "internal"),
                                     "checked_at": rec["when"]} for s, r, d in rec["evidence"]],
                       "limitations": "A listing or a clean result reflects the sources at the time checked, not the "
                                      "page's future behaviour.", **rec["extras"], "trace": rec["trace"]},
                      separators=(",", ":"))


MIMIC_FORMATS = {"m_certlist": m_certlist, "m_status_long": m_status_long, "m_signal_answer": m_signal_answer,
                 "m_preflight": m_preflight, "m_answer_long": m_answer_long}
