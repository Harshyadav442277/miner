"""Shared helpers for the QUESTION_ANSWERING holdout builders: download, hashing, text normalisation."""
import hashlib
import json
import re
import subprocess
import unicodedata
from pathlib import Path

SEED = 20261115
HOLDOUT_DIR = Path(__file__).resolve().parent
DATA_DIR = Path("C:/Users/hyada/tg-eval/data/qa_holdout")
RAW_DIR = DATA_DIR / "raw"
ARTICLES = {"a", "an", "the"}


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha256_file(path):
    return sha256_bytes(Path(path).read_bytes())


def download(url, dest, refresh=False):
    """Fetch url to dest with curl (IPv4, argument list, no shell). Reuses an existing file."""
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0 and not refresh:
        return dest
    tmp = dest.with_name(dest.name + ".part")
    cmd = ["curl", "-4", "-sS", "-L", "-f", "-m", "120", "-A", "Mozilla/5.0", "-o", str(tmp), url]
    subprocess.run(cmd, check=True)
    tmp.replace(dest)
    return dest


def write_json(path, obj):
    """Deterministic JSON: LF newlines, UTF-8, trailing newline, key order as given."""
    text = json.dumps(obj, ensure_ascii=False, indent=1) + "\n"
    Path(path).write_bytes(text.encode("utf-8"))


def write_lines(path, lines):
    Path(path).write_bytes(("\n".join(lines) + "\n").encode("utf-8"))


def strip_accents(text):
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def normalize(text):
    """Lowercase, strip accents, punctuation and articles, collapse spaces."""
    text = strip_accents(text).lower()
    text = re.sub(r"[^\w\s]|_", " ", text)
    return " ".join(w for w in text.split() if w not in ARTICLES)


def contains_tokens(haystack_norm, needle_norm):
    """True if needle's tokens appear as a contiguous whole-token sequence in haystack."""
    h, n = haystack_norm.split(), needle_norm.split()
    if not n:
        return False
    return any(h[i:i + len(n)] == n for i in range(len(h) - len(n) + 1))


def normalize_question(text):
    return " ".join(strip_accents(text).lower().split())
