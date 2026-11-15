"""Fetch untrusted third-party URLs (miner catalog, YAML, endpoints) without SSRF or argv injection.

Every URL, including each redirect hop, must be https with a plain ASCII hostname
(letters, digits, dots, hyphens: no IDN, percent-encoding, userinfo or bracketed literals)
whose every IPv4 address is globally routable. IPv6 is not used at all. curl receives a URL
rebuilt from the validated parts, runs with --globoff and -4, and is pinned to the checked
address with both --resolve and --connect-to, so a DNS answer that changes between check and
fetch cannot reach a private host. The URL follows `--url`, so a value starting with `-` is
never read as an option. Redirects are followed here, one validated hop at a time.
"""
import datetime as dt
import hashlib
import ipaddress
import json
import re
import socket
import subprocess
import urllib.parse
from pathlib import Path

METHODS = {"GET", "POST"}
MAX_REDIRECTS = 5
SAFE_ID = re.compile(r"^[0-9]+$")
NETLOC = re.compile(r"^([a-z0-9.-]+)(?::([0-9]{1,5}))?$")
PRINTABLE = re.compile(r"^[\x21-\x7e]*$")


class UnsafeURL(ValueError):
    pass


def check_url(url, resolve=socket.getaddrinfo):
    """Return (canonical_url, host, port, checked IPv4) or raise UnsafeURL."""
    if not isinstance(url, str) or not url or url.startswith("-") or not PRINTABLE.match(url):
        raise UnsafeURL(f"not a plain ASCII URL: {url!r}")
    try:
        parts = urllib.parse.urlsplit(url)
    except ValueError as exc:
        raise UnsafeURL(f"unparseable URL: {url!r}") from exc
    if parts.scheme != "https":
        raise UnsafeURL(f"scheme must be https: {url!r}")
    match = NETLOC.match(parts.netloc.lower())
    if not match:
        raise UnsafeURL(f"host must be letters, digits, dots and hyphens: {parts.netloc!r}")
    host, port_text = match.groups()
    if host.startswith((".", "-")) or ".." in host:
        raise UnsafeURL(f"malformed host: {host!r}")
    port = int(port_text) if port_text else 443
    if not 0 < port < 65536:
        raise UnsafeURL(f"bad port: {port}")
    try:
        infos = resolve(host, port, family=socket.AF_INET, proto=socket.IPPROTO_TCP)
    except OSError as exc:
        raise UnsafeURL(f"does not resolve over IPv4: {host}") from exc
    addresses = sorted({info[4][0] for info in infos if info[0] == socket.AF_INET})
    if not addresses:
        raise UnsafeURL(f"does not resolve over IPv4: {host}")
    for address in addresses:
        ip = ipaddress.ip_address(address)
        # is_global excludes private, loopback, link-local, reserved, shared (100.64/10),
        # unspecified and documentation ranges; multicast is checked explicitly.
        if ip.version != 4 or not ip.is_global or ip.is_multicast:
            raise UnsafeURL(f"{host} resolves to a non-public address {ip}")
    canonical = f"https://{host}" + (f":{port}" if port_text else "") + (parts.path or "/")
    if parts.query:
        canonical += "?" + parts.query
    return canonical, host, port, addresses[0]


def _curl(url, method, body, max_bytes, host, port, ip):
    cmd = ["curl.exe", "-4", "-sS", "--globoff", "--proto", "=https", "--proto-redir", "=https",
           "--max-redirs", "0", "--max-time", "20", "--max-filesize", str(max_bytes),
           "--resolve", f"{host}:{port}:{ip}", "--connect-to", f"::{ip}:{port}",
           "-w", "\n%{http_code}\n%{redirect_url}", "-X", method]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "--data-binary", json.dumps(body)]
    cmd += ["--url", url]
    result = subprocess.run(cmd, capture_output=True)
    raw, _, tail = result.stdout.rpartition(b"\n")
    raw, _, code = raw.rpartition(b"\n")
    return result, raw, code, tail.decode("utf-8", "replace").strip()


def fetch(url, method="GET", body=None, max_bytes=1000000, resolve=socket.getaddrinfo):
    """Capture one response; refused URLs come back as a record with `error`, never fetched."""
    record = {"url": url, "request_body": body, "method": method,
              "captured_at": dt.datetime.now(dt.timezone.utc).isoformat(), "hops": []}
    try:
        if method not in METHODS:
            raise UnsafeURL(f"method not allowed: {method!r}")
        current = url
        for _ in range(MAX_REDIRECTS + 1):
            canonical, host, port, ip = check_url(current, resolve)
            result, raw, code, location = _curl(canonical, method, body, max_bytes, host, port, ip)
            status = int(code) if code.isdigit() else 0
            record["hops"].append({"url": canonical, "ip": ip, "status": status})
            if 300 <= status < 400 and location:
                current = urllib.parse.urljoin(canonical, location)
                if status in (301, 302, 303):
                    method, body = "GET", None
                continue
            record.update(status=status, exit=result.returncode, body=raw.decode("utf-8", "replace"),
                          sha256=hashlib.sha256(raw).hexdigest(),
                          error=result.stderr.decode("utf-8", "replace"))
            return record
        raise UnsafeURL("too many redirects")
    except UnsafeURL as exc:
        record.update(status=0, exit=-1, body="", sha256=hashlib.sha256(b"").hexdigest(), error=f"refused: {exc}")
        return record


def output_path(out, miner_id):
    """miner-<id>.json inside `out`, refusing ids that could name another path."""
    if not isinstance(miner_id, str) or not SAFE_ID.match(miner_id):
        raise UnsafeURL(f"miner id must be digits: {miner_id!r}")
    root = Path(out).resolve()
    path = (root / f"miner-{miner_id}.json").resolve()
    if path.parent != root:
        raise UnsafeURL(f"output escapes {root}: {path}")
    return path
