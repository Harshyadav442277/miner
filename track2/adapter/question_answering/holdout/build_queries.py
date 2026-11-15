"""Build the 120 held-out NQ-open questions (with gold answers) for the QUESTION_ANSWERING holdout.

    python build_queries.py

Downloads NQ-open dev, filters it, draws a seeded sample and writes queries.json, queries.gold.json and
queries.manifest.json next to this file. Deterministic: same input bytes, same outputs.
"""
import json
import random
import re
import subprocess
from pathlib import Path

from common import HOLDOUT_DIR, RAW_DIR, SEED, download, sha256_file, write_json

BASE = "https://raw.githubusercontent.com/google-research-datasets/natural-questions/master/"
SOURCE_URL = BASE + "nq_open/NQ-open.dev.jsonl"
LICENCE_FILES = {"repo_LICENSE": BASE + "LICENSE", "nq_open_LICENSE": BASE + "nq_open/LICENSE",
                 "nq_open_README": BASE + "nq_open/README.md"}
SAMPLE = 120

TIME_WORDS = re.compile(
    r"\b(current|currently|now|latest|newest|recent|recently|last|this year|today|still|so far|next|"
    r"upcoming|reigning|as of|who is the|who are the)\b", re.I)
RUNNING_COUNT = re.compile(r"\bhow many\b.*\b(have|has)\b", re.I)
SEASON_EPISODE = re.compile(r"\b(seasons?|episodes?)\b", re.I)
SPORTS_RECORD = re.compile(r"\b(most|all time|all-time|record|records)\b", re.I)
YEAR = re.compile(r"\b(\d{4})\b")


def time_sensitive(question):
    """True if the question's answer may change with time or is a running count / record."""
    if TIME_WORDS.search(question) or RUNNING_COUNT.search(question):
        return True
    if SEASON_EPISODE.search(question) or SPORTS_RECORD.search(question):
        return True
    return any(int(y) >= 2015 for y in YEAR.findall(question))


def gradable(answers):
    """1-3 gold answers, each 1-5 words and at least 2 characters."""
    if not 1 <= len(answers) <= 3:
        return False
    return all(isinstance(a, str) and len(a.strip()) >= 2 and 1 <= len(a.split()) <= 5 for a in answers)


def format_question(raw):
    q = " ".join(raw.split()).rstrip("?").strip()
    return q[:1].upper() + q[1:] + "?"


def licence_facts(paths):
    """What the repository's own files say, extracted by reading them (not recalled)."""
    facts = {}
    for name, path in paths.items():
        text = Path(path).read_text(encoding="utf-8", errors="replace")
        facts[name] = {"sha256": sha256_file(path), "bytes": len(text.encode("utf-8"))}
        if text.startswith("404"):
            facts[name]["note"] = "file does not exist in the repository (HTTP 404 body)"
        elif name.endswith("LICENSE"):
            first = next(line.strip() for line in text.splitlines() if line.strip())
            version = re.search(r"Version \d\.\d", text)
            facts[name]["title"] = first + (" " + version.group(0) if version else "")
        else:
            hit = [ln.strip() for ln in text.splitlines() if "licen" in ln.lower()]
            facts[name]["lines_mentioning_licence"] = hit
    return facts


def main():
    src = download(SOURCE_URL, RAW_DIR / "NQ-open.dev.jsonl")
    rows = [json.loads(ln) for ln in src.read_text(encoding="utf-8").splitlines() if ln.strip()]
    counts = {"source_rows": len(rows)}
    items = [(i, r["question"], r["answer"]) for i, r in enumerate(rows)]
    items = [t for t in items if not time_sensitive(t[1])]
    counts["after_time_sensitivity_filter"] = len(items)
    items = [t for t in items if gradable(t[2])]
    counts["after_gold_answer_filter"] = len(items)
    items = [t for t in items if 20 <= len(format_question(t[1])) <= 120]
    counts["after_length_filter"] = len(items)
    seen, uniq = set(), []
    for t in items:
        key = format_question(t[1]).lower()
        if key not in seen:
            seen.add(key)
            uniq.append(t)
    counts["after_duplicate_filter"] = len(uniq)
    picked = sorted(random.Random(SEED).sample(uniq, SAMPLE), key=lambda t: t[0])
    counts["sampled"] = len(picked)

    queries = [{"id": f"nq-{i}", "query": format_question(q)} for i, q, _ in picked]
    gold = {f"nq-{i}": a for i, _, a in picked}
    write_json(HOLDOUT_DIR / "queries.json", queries)
    write_json(HOLDOUT_DIR / "queries.gold.json", gold)

    lic_paths = {}
    for k, u in LICENCE_FILES.items():
        dest = RAW_DIR / ("nq_" + k + ".txt")
        try:
            lic_paths[k] = download(u, dest)
        except subprocess.CalledProcessError:  # curl -f: HTTP error, e.g. 404
            dest.write_bytes(b"404: Not Found")
            lic_paths[k] = dest
    manifest = {
        "source_url": SOURCE_URL, "source_sha256": sha256_file(src), "seed": SEED,
        "id_rule": "nq-<zero-based line index in NQ-open.dev.jsonl>",
        "filters": {"time_sensitive_words": TIME_WORDS.pattern, "running_count": RUNNING_COUNT.pattern,
                    "season_episode": SEASON_EPISODE.pattern, "sports_record": SPORTS_RECORD.pattern,
                    "year_at_least": 2015, "gold_answers": "1-3, each 1-5 words, each >= 2 chars",
                    "question_length_chars": "20-120 after adding capital and question mark"},
        "counts": counts,
        "licence_urls": LICENCE_FILES,
        "licence_facts": licence_facts(lic_paths),
        "licence_summary": ("Repository-root LICENSE is Apache License 2.0; nq_open/LICENSE does not exist; "
                            "nq_open/README.md says all Natural Questions data is released under CC BY-SA 3.0. "
                            "The two statements differ in scope (code vs data); the README's is the one that "
                            "names the data. Treat the data as CC BY-SA 3.0 (attribution, share-alike)."),
        "outputs_sha256": {n: sha256_file(HOLDOUT_DIR / n) for n in ("queries.json", "queries.gold.json")},
    }
    write_json(HOLDOUT_DIR / "queries.manifest.json", manifest)
    print(json.dumps(counts, indent=1))


if __name__ == "__main__":
    main()
