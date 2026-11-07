"""Fetch untrusted third-party URLs (miner catalog, YAML, endpoints) without SSRF or argv injection.

Every URL, including each redirect hop, must be https with a hostname whose every resolved
address is globally routable. curl is pinned to the address we checked (--resolve), so a DNS
answer that changes between check and fetch cannot reach a private host. The URL is passed
after `--url`, so a value starting with `-` is never read as an option. Redirects are followed
here, one validated hop at a time, never by curl.
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


class UnsafeURL(ValueError):
    pass


def check_url(url, resolve=socket.getaddrinfo):
    """Return (hostname, port, one checked IP) or raise UnsafeURL."""
    if not isinstance(url, str) or not url or url.startswith("-") or any(c.isspace() for c in url):
        raise UnsafeURL(f"not a plain URL: {url!r}")
    parts = urllib.parse.urlsplit(url)
    if parts.scheme != "https":
        raise UnsafeURL(f"scheme must be https: {url!r}")
    host = parts.hostname
    if not host or parts.username or parts.password:
        raise UnsafeURL(f"needs a hostname and no credentials: {url!r}")
    try:
        port = parts.port or 443
    except ValueError as exc:
        raise UnsafeURL(f"bad port: {url!r}") from exc
    try:
        infos = resolve(host, port, proto=socket.IPPROTO_TCP)
    except OSError as exc:
        raise UnsafeURL(f"does not resolve: {host}") from exc
    addresses = {info[4][0] for info in infos}
    if not addresses:
        raise UnsafeURL(f"does not resolve: {host}")
    for address in addresses:
        ip = ipaddress.ip_address(address.split("%")[0])
        # is_global excludes private, loopback, link-local, reserved, shared (100.64/10),
        # unspecified and documentation ranges; multicast is checked explicitly.
        if not ip.is_global or ip.is_multicast:
            raise UnsafeURL(f"{host} resolves to a non-public address {ip}")
    ipv4 = sorted(a for a in addresses if ":" not in a)
    return host, port, (ipv4 or sorted(addresses))[0]


def _curl(url, method, body, max_bytes, host, port, ip):
    pin = f"{host}:{port}:{ip if ':' not in ip else '[' + ip + ']'}"
    cmd = ["curl.exe", "-sS", "--proto", "=https", "--proto-redir", "=https", "--max-redirs", "0",
           "--max-time", "20", "--max-filesize", str(max_bytes), "--resolve", pin,
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
            host, port, ip = check_url(current, resolve)
            result, raw, code, location = _curl(current, method, body, max_bytes, host, port, ip)
            status = int(code) if code.isdigit() else 0
            record["hops"].append({"url": current, "ip": ip, "status": status})
            if 300 <= status < 400 and location:
                current = urllib.parse.urljoin(current, location)
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
