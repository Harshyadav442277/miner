"""Fetch untrusted URLs (registry fields, miner YAML, miner services) without SSRF or argv injection.

The approach of the URL Scan lane fetch guard, widened to http as well as https (the GENERIC
baseline is served over plain http from a public IP):
- every URL and every redirect hop is parsed with urllib.parse; only http and https; the host must be
  plain ASCII letters, digits, dots and hyphens (no userinfo, IDN, percent-encoding or IPv6 literals);
- the host is resolved over IPv4 only and every address must be globally routable (no loopback, private,
  link-local, shared, multicast, reserved or unspecified address);
- curl gets a URL rebuilt from the checked parts after `--url`, runs with -4, --globoff, no redirects,
  `--proto =http,https`, and is pinned to the checked address with --resolve and --connect-to, so a DNS
  answer that changes between check and fetch cannot reach a private host;
- redirects are followed here, one re-checked hop at a time.
No auth headers are ever sent; the User-Agent is generic.

ALLOW_LOOPBACK exists for the unit tests' local stub server only: when True, 127.0.0.1 itself (and
nothing else non-public) is accepted. No CLI sets it.
"""
import hashlib
import ipaddress
import json
import re
import socket
import subprocess
import time
import urllib.parse
from pathlib import Path

ALLOW_LOOPBACK = False
METHODS = {"GET", "POST"}
SCHEMES = {"http": 80, "https": 443}
MAX_REDIRECTS = 5
USER_AGENT = "Mozilla/5.0 (compatible; measurement-harness)"
SAFE_NAME = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
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
    if parts.scheme not in SCHEMES:
        raise UnsafeURL(f"scheme must be http or https: {url!r}")
    match = NETLOC.match(parts.netloc.lower())
    if not match:
        raise UnsafeURL(f"host must be letters, digits, dots and hyphens: {parts.netloc!r}")
    host, port_text = match.groups()
    if host.startswith((".", "-")) or ".." in host or host.endswith("-"):
        raise UnsafeURL(f"malformed host: {host!r}")
    port = int(port_text) if port_text else SCHEMES[parts.scheme]
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
        if ALLOW_LOOPBACK and address == "127.0.0.1":
            continue
        # is_global excludes private, loopback, link-local, reserved, shared (100.64/10),
        # unspecified and documentation ranges; multicast is checked explicitly.
        if ip.version != 4 or not ip.is_global or ip.is_multicast:
            raise UnsafeURL(f"{host} resolves to a non-public address {ip}")
    canonical = f"{parts.scheme}://{host}" + (f":{port}" if port_text else "") + (parts.path or "/")
    if parts.query:
        canonical += "?" + parts.query
    return canonical, host, port, addresses[0]


def _curl(url, method, body, max_bytes, timeout, host, port, ip):
    cmd = ["curl.exe", "-4", "-sS", "--globoff", "--proto", "=http,https", "--proto-redir", "=http,https",
           "--max-redirs", "0", "--max-time", str(timeout), "--max-filesize", str(max_bytes),
           "--resolve", f"{host}:{port}:{ip}", "--connect-to", f"::{ip}:{port}", "-A", USER_AGENT,
           "-w", "\n%{http_code}\n%{redirect_url}", "-X", method]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "--data-binary", json.dumps(body)]
    cmd += ["--url", url]
    result = subprocess.run(cmd, capture_output=True)
    raw, _, location = result.stdout.rpartition(b"\n")
    raw, _, code = raw.rpartition(b"\n")
    return result, raw, code, location.decode("utf-8", "replace").strip()


def fetch(url, method="GET", body=None, max_bytes=2_000_000, timeout=30, resolve=socket.getaddrinfo):
    """One response, redirects re-checked hop by hop. A refused URL comes back as a record with
    status 0 and `error` starting with "refused:", never fetched. The bytes are in record["raw"]."""
    started = time.monotonic()
    record = {"url": url, "method": method, "request_body": body, "hops": []}
    try:
        if method not in METHODS:
            raise UnsafeURL(f"method not allowed: {method!r}")
        current = url
        for _ in range(MAX_REDIRECTS + 1):
            canonical, host, port, ip = check_url(current, resolve)
            result, raw, code, location = _curl(canonical, method, body, max_bytes, timeout, host, port, ip)
            status = int(code) if code.isdigit() else 0
            record["hops"].append({"url": canonical, "ip": ip, "status": status})
            if 300 <= status < 400 and location:
                current = urllib.parse.urljoin(canonical, location)
                if status in (301, 302, 303):
                    method, body = "GET", None
                continue
            record.update(status=status, curl_exit=result.returncode, raw=raw, bytes=len(raw),
                          sha256=hashlib.sha256(raw).hexdigest(),
                          error=result.stderr.decode("utf-8", "replace").strip())
            break
        else:
            raise UnsafeURL("too many redirects")
    except UnsafeURL as exc:
        record.update(status=0, curl_exit=-1, raw=b"", bytes=0, sha256=hashlib.sha256(b"").hexdigest(),
                      error=f"refused: {exc}")
    record["seconds"] = round(time.monotonic() - started, 3)
    return record


def safe_name(value, what="name"):
    """An untrusted value that will appear in a filename: ^[A-Za-z0-9_-]{1,64}$ or UnsafeURL."""
    value = str(value)
    if not SAFE_NAME.match(value):
        raise UnsafeURL(f"{what} must match {SAFE_NAME.pattern}: {value!r}")
    return value


def safe_path(out_dir, filename):
    """out_dir/filename, refusing any result that resolves outside out_dir."""
    root = Path(out_dir).resolve()
    path = (root / filename).resolve()
    if path.parent != root:
        raise UnsafeURL(f"output escapes {root}: {path}")
    return path
