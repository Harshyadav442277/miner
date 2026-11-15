"""The adapter registry (/api/wasm): fetch over IPv4, keep a timestamped raw snapshot, answer lookups.

    python registry.py table                     # one line per family
    python registry.py champion QUESTION_ANSWERING
    python registry.py author 0x8b22...          # every entry by one author
    python registry.py table --snapshot path.json  # read a saved snapshot instead of the network

Snapshots go to C:/Users/hyada/tg-eval/champions/registry/wasm-<UTC>.json with a .sha256 sidecar.
Registry values are untrusted data: nothing here builds a path or a command from them.
"""
import argparse
import datetime as dt
import hashlib
import json
import sys
from pathlib import Path

import netguard

REGISTRY_URL = "https://devnode.telegraphprotocol.com/api/wasm"
SNAPSHOT_DIR = Path("C:/Users/hyada/tg-eval/champions/registry")
GENERIC = "GENERIC"


def utc_stamp():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def fetch(snapshot_dir=SNAPSHOT_DIR, url=REGISTRY_URL):
    """Download the registry, save raw bytes + sha256, return (parsed, snapshot_path)."""
    r = netguard.fetch(url, max_bytes=50_000_000, timeout=60)
    if r["status"] != 200:
        raise RuntimeError(f"registry fetch failed: status {r['status']} {r['error']}")
    snapshot_dir = Path(snapshot_dir)
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    path = snapshot_dir / f"wasm-{utc_stamp()}.json"
    path.write_bytes(r["raw"])
    path.with_suffix(".sha256").write_text(f"{r['sha256']}  {path.name}\n", encoding="ascii")
    return parse(r["raw"]), path


def load(path):
    return parse(Path(path).read_bytes())


def parse(raw):
    data = json.loads(raw)
    if not isinstance(data, dict) or not isinstance(data.get("intents"), dict):
        raise ValueError("registry: expected {'count': N, 'intents': {...}}")
    for family, block in data["intents"].items():
        if not isinstance(block, dict) or not isinstance(block.get("entries", []), list):
            raise ValueError(f"registry: bad block for {family!r}")
    return data


def snapshot_sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def families(data):
    return sorted(data["intents"])


def champion(data, family):
    """The family's champion entry, or None (no family or no champion)."""
    block = data["intents"].get(family) or {}
    return block.get("champion") or None


def entries(data, family):
    block = data["intents"].get(family) or {}
    return list(block.get("entries") or [])


def entry(data, family, registration_id):
    for e in entries(data, family):
        if str(e.get("registration_id")) == str(registration_id):
            return e
    return None


def by_author(data, address):
    address = address.lower()
    return [e for f in families(data) for e in entries(data, f)
            if str(e.get("author_address", "")).lower() == address]


def gate_kind(e):
    """How the entry got its place: the eval decision, else the runnable URL tag (e.g. manual-seed)."""
    ev = e.get("eval") or {}
    if isinstance(ev, dict) and ev.get("decision"):
        return str(ev["decision"])
    if str(e.get("wasm_runnable_url", "")).startswith("http"):
        return "no-eval"
    return str(e.get("wasm_runnable_url") or "no-eval")


def table_lines(data):
    lines = []
    for f in families(data):
        c = champion(data, f)
        n = len(entries(data, f))
        if c:
            lines.append(f"{f:32s} champion={c.get('registration_id')!s:7s} "
                         f"author={str(c.get('author_address', ''))[:10]} "
                         f"eval_score={c.get('eval_score')!s:5s} gate={gate_kind(c)} entries={n}")
        else:
            lines.append(f"{f:32s} champion=none    entries={n}")
    return lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["table", "champion", "entries", "author"])
    ap.add_argument("arg", nargs="?")
    ap.add_argument("--snapshot", type=Path, help="read this saved snapshot instead of fetching")
    a = ap.parse_args()
    if a.snapshot:
        data, path = load(a.snapshot), a.snapshot
    else:
        data, path = fetch()
    print(f"snapshot {path} sha256 {snapshot_sha256(path)} count {data.get('count')} "
          f"families {len(data['intents'])}")
    if a.command == "table":
        print("\n".join(table_lines(data)))
    elif a.command == "champion":
        c = champion(data, a.arg)
        print(json.dumps(c, indent=1) if c else f"no champion for {a.arg}")
        if not c:
            sys.exit(1)
    elif a.command == "entries":
        print(json.dumps(entries(data, a.arg), indent=1))
    else:
        print(json.dumps(by_author(data, a.arg), indent=1))


if __name__ == "__main__":
    main()
