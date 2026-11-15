"""Freeze a holdout (or a query list) before any model or answer is seen, so it cannot drift later.

    python freeze.py holdout.jsonl --family FACT_CHECK --sources "who wrote the answers" --note "..."
    python freeze.py queries.json --queries --family QUESTION_ANSWERING --sources "..." --note "..."
    python freeze.py --verify holdout.freeze.json

Pairs: JSON lines with non-empty string prompt, chosen, rejected; chosen != rejected; no duplicate
(prompt, chosen, rejected); optional kind, format, source (strings) and related_party (bool).
Queries: a JSON list of objects with a non-empty string `query`, no duplicates, optional `id`.
The freeze file is <file stem>.freeze.json next to the file (or --out) and is never overwritten.
"""
import argparse
import datetime as dt
import hashlib
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

OPTIONAL_STR = ("kind", "format", "source")


class FreezeError(ValueError):
    pass


def sha256_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def freeze_path(path):
    path = Path(path)
    return path.with_name(path.stem + ".freeze.json")


def validate_pairs(rows):
    errors, seen = [], set()
    for i, r in enumerate(rows, 1):
        if not isinstance(r, dict):
            errors.append(f"row {i}: not an object")
            continue
        for k in ("prompt", "chosen", "rejected"):
            if not isinstance(r.get(k), str) or not r[k].strip():
                errors.append(f"row {i}: {k} must be a non-empty string")
        if r.get("chosen") == r.get("rejected"):
            errors.append(f"row {i}: chosen == rejected")
        for k in OPTIONAL_STR:
            if k in r and not isinstance(r[k], str):
                errors.append(f"row {i}: {k} must be a string")
        if "related_party" in r and not isinstance(r["related_party"], bool):
            errors.append(f"row {i}: related_party must be true or false")
        key = (r.get("prompt"), r.get("chosen"), r.get("rejected"))
        if key in seen:
            errors.append(f"row {i}: duplicate (prompt, chosen, rejected)")
        seen.add(key)
    return errors


def validate_queries(rows):
    if not isinstance(rows, list):
        return ["queries file must be a JSON list"]
    errors, seen = [], set()
    for i, r in enumerate(rows, 1):
        if not isinstance(r, dict) or not isinstance(r.get("query"), str) or not r["query"].strip():
            errors.append(f"query {i}: needs a non-empty string `query`")
            continue
        params = r.get("params")
        if params is not None and not (isinstance(params, dict) and all(
                isinstance(k, str) and k and isinstance(v, str) for k, v in params.items())):
            errors.append(f"query {i}: `params` must map non-empty names to strings")
        if r["query"] in seen:
            errors.append(f"query {i}: duplicate")
        seen.add(r["query"])
    return errors


def load_pairs(path):
    rows = []
    for n, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if line.strip():
            try:
                rows.append(json.loads(line))
            except ValueError as exc:
                raise FreezeError(f"line {n}: not JSON ({exc})") from exc
    return rows


def git_head():
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True,
                              cwd=Path(__file__).resolve().parent, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def freeze(path, family, sources, note, queries=False, out=None):
    path = Path(path).resolve()
    target = Path(out) if out else freeze_path(path)
    if target.exists():
        raise FreezeError(f"{target} exists; a freeze is never overwritten")
    if queries:
        rows = json.loads(path.read_text(encoding="utf-8"))
        errors = validate_queries(rows)
    else:
        rows = load_pairs(path)
        errors = validate_pairs(rows)
    if not rows:
        errors.append("no rows")
    if errors:
        raise FreezeError("; ".join(errors[:20]) + (f" (+{len(errors) - 20} more)" if len(errors) > 20 else ""))
    record = {"file": str(path), "kind": "queries" if queries else "pairs", "sha256": sha256_file(path),
              "rows": len(rows), "family": family, "sources": sources, "note": note,
              "created_at": dt.datetime.now(dt.timezone.utc).isoformat(), "git_head": git_head()}
    if not queries:
        meta = lambda r, k: r.get(k, (r.get("meta") or {}).get(k) if isinstance(r.get("meta"), dict) else None)
        record["by_kind"] = dict(Counter(str(meta(r, "kind")) for r in rows))
        record["by_format"] = dict(Counter(str(meta(r, "format")) for r in rows))
        record["by_source"] = dict(Counter(str(r.get("source")) for r in rows))
        record["related_party_rows"] = sum(r.get("related_party") is True for r in rows)
        record["longer_chosen"] = sum(len(r["chosen"]) > len(r["rejected"]) for r in rows)
        record["shorter_chosen"] = sum(len(r["chosen"]) < len(r["rejected"]) for r in rows)
    with open(target, "x", encoding="utf-8") as fh:  # "x": fail if it appeared meanwhile
        json.dump(record, fh, indent=1)
    return target, record


def verify(freeze_file, data_file=None):
    """Return the freeze record if the data file still hashes to it, else raise FreezeError."""
    freeze_file = Path(freeze_file)
    if not freeze_file.exists():
        raise FreezeError(f"no freeze file {freeze_file}")
    record = json.loads(freeze_file.read_text(encoding="utf-8"))
    data = Path(data_file) if data_file else Path(record["file"])
    if not data.exists():
        raise FreezeError(f"frozen file {data} is missing")
    got = sha256_file(data)
    if got != record["sha256"]:
        raise FreezeError(f"{data} sha256 {got} != frozen {record['sha256']}")
    return record


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?")
    ap.add_argument("--family")
    ap.add_argument("--sources", default="")
    ap.add_argument("--note", default="")
    ap.add_argument("--queries", action="store_true", help="the file is a JSON list of queries")
    ap.add_argument("--out", help="freeze file path (default: <stem>.freeze.json next to the file)")
    ap.add_argument("--verify", metavar="FREEZE_JSON")
    a = ap.parse_args()
    try:
        if a.verify:
            r = verify(a.verify, a.file)
            print(f"OK {r['file']} sha256 {r['sha256']} rows {r['rows']}")
            return
        if not a.file or not a.family or not a.sources:
            ap.error("file, --family and --sources are required to freeze")
        target, r = freeze(a.file, a.family, a.sources, a.note, a.queries, a.out)
    except FreezeError as exc:
        sys.exit(f"REFUSED: {exc}")
    print(f"wrote {target}")
    print(json.dumps({k: v for k, v in r.items() if k != "note"}, indent=1))


if __name__ == "__main__":
    main()
