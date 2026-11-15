"""Download a family's champion adapter (or any registration) and prove it is the registered file.

    python fetch_champion.py QUESTION_ANSWERING
    python fetch_champion.py FACT_CHECK --id 54

Writes C:/Users/hyada/tg-eval/champions/<FAMILY>/<id>.safetensors and <id>.manifest.json.
keccak256(bytes) must equal the registry's wasm_hash or nothing is written.

The file is someone else's bytes and is handled as untrusted data: it is never unpickled, imported
or executed. Only its safetensors JSON header is parsed here, and the file is only ever handed to
adapterexec. The family, the registration id and the download URL are untrusted registry values:
names must match ^[A-Za-z0-9_-]{1,64}$ and the URL passes netguard's scheme and public-host checks.
"""
import argparse
import datetime as dt
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "adapter" / "security_review"))
import netguard  # noqa: E402
import registry  # noqa: E402
from keccak import keccak256  # noqa: E402

CHAMPIONS = Path("C:/Users/hyada/tg-eval/champions")
MAX_BYTES = 50 * 1024 * 1024
MAX_HEADER = 1024 * 1024
HEX64 = re.compile(r"^[0-9a-f]{64}$")


class NotSafetensors(ValueError):
    pass


def read_header(raw):
    """Parse only the safetensors header of `raw` (bytes). Return the header dict or raise."""
    if len(raw) < 8:
        raise NotSafetensors("shorter than 8 bytes")
    n = struct.unpack("<Q", raw[:8])[0]
    if n < 2 or n > MAX_HEADER or 8 + n > len(raw):
        raise NotSafetensors(f"header length {n} is not plausible for {len(raw)} bytes")
    try:
        header = json.loads(raw[8:8 + n].decode("utf-8"))
    except (UnicodeDecodeError, ValueError) as exc:
        raise NotSafetensors("header is not UTF-8 JSON") from exc
    if not isinstance(header, dict):
        raise NotSafetensors("header is not a JSON object")
    data_len = len(raw) - 8 - n
    for name, t in header.items():
        if name == "__metadata__":
            if not isinstance(t, dict) or not all(isinstance(v, str) for v in t.values()):
                raise NotSafetensors("__metadata__ must map strings to strings")
            continue
        if not (isinstance(t, dict) and isinstance(t.get("dtype"), str) and isinstance(t.get("shape"), list)
                and isinstance(t.get("data_offsets"), list) and len(t["data_offsets"]) == 2):
            raise NotSafetensors(f"tensor {name!r} lacks dtype/shape/data_offsets")
        start, end = t["data_offsets"]
        if not (isinstance(start, int) and isinstance(end, int) and 0 <= start <= end <= data_len):
            raise NotSafetensors(f"tensor {name!r} offsets {start}..{end} outside {data_len} data bytes")
    return header


def read_header_file(path):
    """Header of a local file of at most MAX_BYTES."""
    path = Path(path)
    if path.stat().st_size > MAX_BYTES:
        raise NotSafetensors(f"{path.stat().st_size} bytes exceeds {MAX_BYTES}")
    return read_header(path.read_bytes())


def verify_bytes(raw, wasm_hash):
    """Return (keccak, header) or raise. Size, header and keccak are all checked."""
    if len(raw) > MAX_BYTES:
        raise NotSafetensors(f"{len(raw)} bytes exceeds {MAX_BYTES}")
    header = read_header(raw)
    expected = str(wasm_hash or "").lower().removeprefix("0x")
    if not HEX64.match(expected):
        raise ValueError(f"registry wasm_hash is not 64 hex characters: {wasm_hash!r}")
    got = keccak256(raw)
    if got != expected:
        raise ValueError(f"KECCAK MISMATCH: registry {expected}, downloaded bytes {got}")
    return got, header


def fetch_entry(e, family, root=CHAMPIONS, fetcher=netguard.fetch):
    family = netguard.safe_name(family, "family")
    rid = netguard.safe_name(e.get("registration_id"), "registration_id")
    out_dir = Path(root) / family
    r = fetcher(e.get("wasm_url"), max_bytes=MAX_BYTES, timeout=300)
    if r["status"] != 200:
        raise RuntimeError(f"download failed: status {r['status']} {r['error']}")
    raw = r["raw"]
    k, header = verify_bytes(raw, e.get("wasm_hash"))
    out_dir.mkdir(parents=True, exist_ok=True)
    pkg = netguard.safe_path(out_dir, f"{rid}.safetensors")
    man = netguard.safe_path(out_dir, f"{rid}.manifest.json")
    pkg.write_bytes(raw)
    ev = e.get("eval") if isinstance(e.get("eval"), dict) else {}
    manifest = {"family": family, "registration_id": e.get("registration_id"),
                "author_address": e.get("author_address"), "wasm_url": e.get("wasm_url"),
                "final_url": r["hops"][-1]["url"] if r["hops"] else None,
                "wasm_hash": k, "keccak_match": True, "sha256": hashlib.sha256(raw).hexdigest(),
                "bytes": len(raw), "is_champion": e.get("is_champion"), "stage": e.get("stage"),
                "eval_score": e.get("eval_score"), "eval_reason": ev.get("reason"),
                "eval_decision": ev.get("decision"), "eval_pairs": ev.get("candidate_pairs"),
                "header_metadata": header.get("__metadata__", {}),
                "tensors": len([k2 for k2 in header if k2 != "__metadata__"]),
                "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat()}
    man.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    return pkg, manifest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("family")
    ap.add_argument("--id", help="registration id; default: the family's champion")
    ap.add_argument("--snapshot", type=Path, help="use a saved registry snapshot instead of fetching")
    ap.add_argument("--root", type=Path, default=CHAMPIONS)
    a = ap.parse_args()
    netguard.safe_name(a.family, "family")
    if a.id is not None:
        netguard.safe_name(a.id, "registration_id")
    data, snap = (registry.load(a.snapshot), a.snapshot) if a.snapshot else registry.fetch()
    e = registry.entry(data, a.family, a.id) if a.id else registry.champion(data, a.family)
    if not e:
        sys.exit(f"no {'entry ' + a.id if a.id else 'champion'} for {a.family} in {snap}")
    try:
        pkg, m = fetch_entry(e, a.family, a.root)
    except (ValueError, RuntimeError) as exc:
        sys.exit(f"REFUSED {a.family} {e.get('registration_id')}: {exc}")
    print(f"registry snapshot {snap}")
    print(f"{pkg}  bytes={m['bytes']}  keccak={m['wasm_hash']} (matches registry)  sha256={m['sha256']}")
    print(f"author={m['author_address']} eval_score={m['eval_score']} reason={m['eval_reason']}")
    print(f"header __metadata__ = {json.dumps(m['header_metadata'])}")


if __name__ == "__main__":
    main()
