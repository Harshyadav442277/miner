"""Download and hash the QUESTION_ANSWERING training sources into tg-eval/data/qa/.

Sources (training only):
  SQuAD v1.1 train  CC BY-SA 4.0, stated on the SQuAD explorer page and the Hugging Face card
  NQ-open train     CC BY-SA 3.0, stated in the nq_open README of the official repository

Holdout sources are never downloaded here: NQ-open dev, TruthfulQA, HaluEval, HotpotQA.
Each licence is checked by searching the fetched licence page for the quoted sentence; the
script fails if the sentence is missing. Writes sources-manifest.json next to the data.

    python -I fetch_sources.py [--out C:/Users/hyada/tg-eval/data/qa] [--refresh]
"""
import argparse
import datetime
import hashlib
import json
import re
import subprocess
from pathlib import Path

FORBIDDEN = ("NQ-open.dev", "efficientqa", "truthfulqa", "halueval", "hotpot")

SOURCES = [
    {"name": "squad_v1.1_train", "file": "squad-train-v1.1.json",
     "url": "https://rajpurkar.github.io/SQuAD-explorer/dataset/train-v1.1.json",
     "licence": "CC BY-SA 4.0",
     "licence_checks": [
         {"file": "licence-squad-explorer.html", "url": "https://rajpurkar.github.io/SQuAD-explorer/",
          "pattern": r"distributed under the\s+<a href=\"http://creativecommons.org/licenses/by-sa/4.0/legalcode\">CC BY-SA 4.0</a>"},
         {"file": "licence-squad-hf-card.md", "url": "https://huggingface.co/datasets/rajpurkar/squad/raw/main/README.md",
          "pattern": r"license:\s*\n?\s*-?\s*cc-by-sa-4\.0"}]},
    {"name": "nq_open_train", "file": "NQ-open.train.jsonl",
     "url": "https://raw.githubusercontent.com/google-research-datasets/natural-questions/master/nq_open/NQ-open.train.jsonl",
     "licence": "CC BY-SA 3.0",
     "licence_checks": [
         {"file": "licence-nq-open-readme.md",
          "url": "https://raw.githubusercontent.com/google-research-datasets/natural-questions/master/nq_open/README.md",
          "pattern": r"All of the Natural Questions data is released under the\s+\[CC BY-SA 3\.0\]"}]},
]


def fetch(url, dest):
    if any(f.lower() in url.lower() for f in FORBIDDEN):
        raise SystemExit(f"refusing a holdout source: {url}")
    tmp = dest.with_suffix(dest.suffix + ".part")
    subprocess.run(["curl", "-4", "-sS", "-L", "-f", "-m", "600", "-A", "Mozilla/5.0", "-o", str(tmp), url], check=True)
    tmp.replace(dest)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def record(path, url, fetched_at):
    return {"url": url, "file": path.name, "sha256": sha256(path), "bytes": path.stat().st_size, "fetched_at": fetched_at}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("C:/Users/hyada/tg-eval/data/qa"))
    ap.add_argument("--refresh", action="store_true", help="download again even if the file exists")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    old = {}
    man_path = a.out / "sources-manifest.json"
    if man_path.exists():
        old = {s["name"]: s for s in json.loads(man_path.read_text(encoding="utf-8"))["sources"]}
    now = lambda: datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = []
    for src in SOURCES:
        dest = a.out / src["file"]
        prev = old.get(src["name"], {})
        if a.refresh or not dest.exists():
            fetch(src["url"], dest)
            entry = record(dest, src["url"], now())
        else:
            entry = record(dest, src["url"], prev.get("fetched_at", "unknown (file present before manifest)"))
        entry.update(name=src["name"], licence=src["licence"], licence_evidence=[])
        for chk in src["licence_checks"]:
            lp = a.out / chk["file"]
            prev_ev = {e["file"]: e for e in prev.get("licence_evidence", [])}
            if a.refresh or not lp.exists():
                fetch(chk["url"], lp)
                at = now()
            else:
                at = prev_ev.get(chk["file"], {}).get("fetched_at", "unknown")
            text = lp.read_text(encoding="utf-8", errors="replace")
            m = re.search(chk["pattern"], text, re.I)
            if not m:
                raise SystemExit(f"licence sentence not found in {chk['url']}: {chk['pattern']}")
            ev = record(lp, chk["url"], at)
            ev["matched"] = re.sub(r"\s+", " ", m.group(0))
            entry["licence_evidence"].append(ev)
        out.append(entry)
        print(f"{src['name']}: {entry['bytes']} B sha256 {entry['sha256'][:16]}... licence {src['licence']} verified")
    man = {"note": "training sources for the QUESTION_ANSWERING adapter; holdout sources are never fetched here",
           "forbidden_for_training": ["NQ-open dev", "EfficientQA", "TruthfulQA", "HaluEval", "HotpotQA"],
           "sources": out}
    man_path.write_text(json.dumps(man, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {man_path}")


if __name__ == "__main__":
    main()
