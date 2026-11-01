#!/usr/bin/env node
/**
 * Check a LiveCert answer against its own receipt, on your machine.
 *
 * Every answer ends with a `receipt` listing the upstream requests made to produce
 * it (src/receipt.ts). This re-fetches the receipt's GET requests now, then looks
 * for each value the answer states in what those sources return, and reports which
 * values a source still states and which it does not.
 *
 * A value that is not found is not proof of an error. Derived values (a total net of
 * burns, an affected-version range), values read with POST (JSON-RPC: the receipt
 * keeps no request bodies), and values that changed since the answer (prices,
 * supplies, TTLs) are not found. A value that is found appears in the source as the
 * answer states it: a text match, not a parse. Small whole numbers and short words
 * appear in almost any document, so they are listed as unchecked rather than ticked.
 *
 * Runs on the caller's machine, not on the miner. A miner endpoint that fetched
 * URLs taken from a request would be an open proxy. The answer is untrusted input
 * here too, so: only https URLs on a dotted hostname that resolves only to public
 * addresses are fetched, redirects are refused, and every string from the answer is
 * printed with control characters replaced. Not covered: a host that resolves
 * differently between the check and the fetch (DNS rebinding); the connection is not
 * pinned to the checked address.
 *
 *   node tools/verify-answer.mjs "https://miner-wine.vercel.app/cve?query=CVE-2021-44228"
 *   node tools/verify-answer.mjs saved-answer.json
 */
import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { BlockList, isIP } from "node:net";

/** Answer fields that are prose, bookkeeping or the miner's own judgement, not values a source states. */
const SKIP = new Set(["answer", "reason", "receipt", "checked_at", "confidence", "verdict", "method", "why", "error",
  "rank", "priority", "asset_criticality", "sources", "source", "resolver", "kind"]);
const MAX_BODY = 5_000_000;
const METHODS = new Set(["GET", "POST", "TLS", "DNS"]);

/** Every scalar worth looking for, with its path; `common` ones prove nothing by a text match. Pure. */
export function values(obj, path = "", out = []) {
  if (obj === null || obj === undefined) return out;
  if (Array.isArray(obj)) { obj.forEach((v, i) => values(v, `${path}[${i}]`, out)); return out; }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) if (!SKIP.has(k)) values(v, path ? `${path}.${k}` : k, out);
    return out;
  }
  if (typeof obj === "number" && Number.isFinite(obj) && obj !== 0 && obj !== 1) {
    out.push({ path, value: obj, common: Number.isInteger(obj) && Math.abs(obj) < 100 });
  }
  if (typeof obj === "string" && !/^\d{4}-\d{2}-\d{2}T/.test(obj)) {
    const v = obj.trim();
    if (v.length >= 4) out.push({ path, value: v, common: v.length < 6 && !/\d/.test(v) });
  }
  return out;
}

/** The spellings a source might use for a value. A long text is matched on its opening 60 characters. Pure. */
export function spellings(value) {
  if (typeof value === "number") {
    const s = new Set([String(value)]);
    if (Number.isInteger(value)) s.add(value.toLocaleString("en-US"));
    else s.add(value.toFixed(1));
    return [...s];
  }
  const v = value.toLowerCase().replace(/…$/, "").slice(0, 60);
  return [...new Set([v, v.replaceAll("/", "\\/"), v.replace(/\.$/, "")])];
}

/** A string from the answer, safe to print: control characters (terminal escapes) replaced. Pure. */
export function clean(s) {
  return String(s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, "?");
}

const RESERVED = new BlockList();
for (const [net, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4]]) {
  RESERVED.addSubnet(net, bits, "ipv4");
}
// No ::ffff:0:0/96 rule: BlockList applies it to every IPv4 address. Mapped addresses are unwrapped below.
for (const [net, bits] of [["::", 127], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["64:ff9b::", 96]]) {
  RESERVED.addSubnet(net, bits, "ipv6");
}

/** An address that is not loopback, private, link-local, CGNAT, multicast or otherwise reserved. Pure. */
export function publicAddress(address) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return publicAddress(mapped);
  const family = isIP(address);
  return family !== 0 && !RESERVED.check(address, family === 4 ? "ipv4" : "ipv6");
}

/** A URL this tool may fetch: https, a dotted hostname (no IP literal), no credentials, nothing redacted. Pure. */
export function fetchable(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || raw.includes("REDACTED")) return false;
    const host = u.hostname.replace(/\.$/, "");
    if (host.startsWith("[") || isIP(host) !== 0) return false;
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host) && !/(^|\.)(localhost|local|internal|home|lan|corp)$/i.test(host);
  } catch {
    return false;
  }
}

/** Every address the host resolves to is public. */
async function resolvesPublic(raw) {
  try {
    const all = await lookup(new URL(raw).hostname.replace(/\.$/, ""), { all: true, verbatim: true });
    return all.length > 0 && all.every((a) => publicAddress(a.address));
  } catch {
    return false;
  }
}

async function main(arg) {
  const answer = /^https?:\/\//.test(arg)
    ? await fetch(arg, { signal: AbortSignal.timeout(60_000) }).then((r) => r.json())
    : JSON.parse(await readFile(arg, "utf8"));
  const receipt = answer.receipt;
  if (!Array.isArray(receipt?.upstream)) {
    console.error("This answer has no receipt, so there is nothing to check it against.");
    process.exit(2);
  }
  console.log(`answer:   ${clean(answer.answer ?? answer.reason ?? "(none)")}`);
  console.log(`receipt:  ${clean(receipt.id)}, ${clean(receipt.deployment)}, answered ${clean(receipt.answered_at)}${receipt.from_cache ? " (from the miner's cache)" : ""}`);
  if (receipt.note) console.log(`note:     ${clean(receipt.note)}`);

  const bodies = [];
  const seen = new Set();
  console.log("\nupstream reads, re-fetched now:");
  for (const read of receipt.upstream) {
    const method = METHODS.has(read?.method) ? read.method : "?";
    const url = clean(read?.url ?? "");
    if (seen.has(`${method} ${url}`)) continue;
    seen.add(`${method} ${url}`);
    if (method !== "GET") { console.log(`  skip  ${method.padEnd(4)} ${url}  (no request body recorded)`); continue; }
    if (!fetchable(read.url) || !(await resolvesPublic(read.url))) { console.log(`  skip  GET  ${url}  (not a public https host, or redacted)`); continue; }
    const t = Date.now();
    try {
      // Cloudflare's DNS-over-HTTPS refuses any accept header but its own JSON type.
      const accept = read.url.includes("/dns-query") ? "application/dns-json" : "application/json, text/plain, */*";
      const r = await fetch(read.url, { signal: AbortSignal.timeout(20_000), headers: { accept }, redirect: "manual" });
      if (r.status >= 300 && r.status < 400) { console.log(`  skip  GET  ${url}  (redirect refused)`); continue; }
      const text = (await r.text()).slice(0, MAX_BODY);
      bodies.push({ host: new URL(read.url).hostname, text: text.toLowerCase() });
      const same = read.result ? `then: ${clean(read.result)}` : r.status === read.status ? "same as then" : `was ${clean(read.status)}`;
      console.log(`  ${String(r.status).padEnd(5)} GET  ${url}  ${Date.now() - t} ms, ${text.length} bytes (${same})`);
    } catch (e) {
      console.log(`  fail  GET  ${url}  ${clean(e.message)}`);
    }
  }

  const found = [];
  const missing = [];
  const common = [];
  for (const v of values(answer)) {
    if (v.common) { common.push(v); continue; }
    const hosts = bodies.filter((b) => spellings(v.value).some((s) => b.text.includes(s))).map((b) => b.host);
    (hosts.length ? found : missing).push({ ...v, hosts: [...new Set(hosts)] });
  }
  const show = (v) => `${clean(v.path)} = ${clean(JSON.stringify(v.value).slice(0, 80))}`;
  console.log(`\nvalues a source states now: ${found.length}`);
  for (const f of found.slice(0, 60)) console.log(`  ✓ ${show(f)}  [${f.hosts.join(", ")}]`);
  console.log(`\nvalues not found in a re-fetched source: ${missing.length} (derived, read by POST, or changed since)`);
  for (const m of missing.slice(0, 60)) console.log(`  · ${show(m)}`);
  if (common.length) console.log(`\nnot checked, too short or common for a text match to prove anything: ${common.map((c) => clean(c.path)).join(", ")}`);
}

if (process.argv[2]) await main(process.argv[2]);
else if (process.argv[1]?.endsWith("verify-answer.mjs")) {
  console.error("usage: node tools/verify-answer.mjs <miner request URL | saved answer .json>");
  process.exit(2);
}
