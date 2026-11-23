"""Keep short US bills and their CRS summaries from dreamproit/bill_summary_us (CC0; texts from govinfo.gov), read as a
stream on stdin, so the 3.65 GB file is never stored.

    curl -sL <bill_summary_us.jsonl URL> | python -I filter_bills.py --out C:/Users/hyada/tg-eval/data/bills/short.jsonl

Kept: the 116th and 117th Congress only (the pool's described bills are 118th), a joined text of at most --max-chars,
and a summary of 150 to 700 characters. One version per bill (the first seen).
"""
import argparse
import json
import sys


def joined(text):
    if isinstance(text, list):
        return "\n".join(" ".join(str(s.get(k) or "") for k in ("header", "text")).strip() for s in text)
    return str(text or "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-chars", type=int, default=1500)
    a = ap.parse_args()
    kept, seen, n = 0, set(), 0
    with open(a.out, "w", encoding="utf-8", newline="\n") as f:
        for line in sys.stdin.buffer:
            n += 1
            try:
                r = json.loads(line)
            except ValueError:
                continue
            if str(r.get("congress")) not in ("116", "117"):
                continue
            text, summary = joined(r.get("text")).strip(), " ".join(str(r.get("summary") or "").split())
            bill = str(r.get("id", ""))[:-2] if r.get("id") else None
            if not (40 < len(text) <= a.max_chars and 150 <= len(summary) <= 700) or bill in seen:
                continue
            seen.add(bill)
            f.write(json.dumps({"id": r.get("id"), "congress": r.get("congress"), "title": r.get("title"),
                                "text": text, "summary": summary}, ensure_ascii=False) + "\n")
            kept += 1
    print(f"read {n} rows, kept {kept}", flush=True)


if __name__ == "__main__":
    main()
