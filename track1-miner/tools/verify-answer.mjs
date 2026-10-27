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
 * URLs taken from a request would be an open proxy. Only public https hosts are
 * fetched here.
 *
 *   node tools/verify-answer.mjs "https://miner-wine.vercel.app/cve?query=CVE-2021-44228"
 *   node tools/verify-answer.mjs saved-answer.json
 */
import { readFile } from "node:fs/promises";

/** Answer fields that are prose, bookkeeping or the miner's own judgement, not values a source states. */
const SKIP = new Set(["answer", "reason", "receipt", "checked_at", "confidence", "verdict", "method", "why", "error",
  "rank", "priority", "asset_criticality", "sources", "source", "resolver", "kind"]);
const MAX_BODY = 5_000_000;

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

/** A URL this tool may fetch: https, a public hostname, no credentials, nothing redacted. Pure. */
export function fetchable(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    if (/^\[|^\d+\.\d+\.\d+\.\d+$|^localhost$|\.local$|\.internal$/i.test(u.hostname)) return false;
    return !raw.includes("REDACTED");
  } catch {
    return false;
  }
}

async function main(arg) {
  const answer = /^https?:\/\//.test(arg)
    ? await fetch(arg, { signal: AbortSignal.timeout(60_000) }).then((r) => r.json())
    : JSON.parse(await readFile(arg, "utf8"));
  const receipt = answer.receipt;
  if (!receipt?.upstream) {
    console.error("This answer has no receipt, so there is nothing to check it against.");
    process.exit(2);
  }
  console.log(`answer:   ${answer.answer ?? answer.reason ?? "(none)"}`);
  console.log(`receipt:  ${receipt.id}, ${receipt.deployment}, answered ${receipt.answered_at}${receipt.from_cache ? " (from the miner's cache)" : ""}`);
  if (receipt.note) console.log(`note:     ${receipt.note}`);

  const bodies = [];
  const seen = new Set();
  console.log("\nupstream reads, re-fetched now:");
  for (const read of receipt.upstream) {
    const key = `${read.method} ${read.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (read.method !== "GET") { console.log(`  skip  ${read.method.padEnd(4)} ${read.url}  (no request body recorded)`); continue; }
    if (!fetchable(read.url)) { console.log(`  skip  GET  ${read.url}  (not a public https URL, or redacted)`); continue; }
    const t = Date.now();
    try {
      // Cloudflare's DNS-over-HTTPS refuses any accept header but its own JSON type.
      const accept = read.url.includes("/dns-query") ? "application/dns-json" : "application/json, text/plain, */*";
      const r = await fetch(read.url, { signal: AbortSignal.timeout(20_000), headers: { accept } });
      const text = (await r.text()).slice(0, MAX_BODY);
      bodies.push({ host: new URL(read.url).hostname, text: text.toLowerCase() });
      const same = read.result ? `then: ${read.result}` : r.status === read.status ? "same as then" : `was ${read.status}`;
      console.log(`  ${String(r.status).padEnd(5)} GET  ${read.url}  ${Date.now() - t} ms, ${text.length} bytes (${same})`);
    } catch (e) {
      console.log(`  fail  GET  ${read.url}  ${e.message}`);
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
  console.log(`\nvalues a source states now: ${found.length}`);
  for (const f of found.slice(0, 60)) console.log(`  ✓ ${f.path} = ${JSON.stringify(f.value).slice(0, 80)}  [${f.hosts.join(", ")}]`);
  console.log(`\nvalues not found in a re-fetched source: ${missing.length} (derived, read by POST, or changed since)`);
  for (const m of missing.slice(0, 60)) console.log(`  · ${m.path} = ${JSON.stringify(m.value).slice(0, 80)}`);
  if (common.length) console.log(`\nnot checked, too short or common for a text match to prove anything: ${common.map((c) => c.path).join(", ")}`);
}

if (process.argv[2]) await main(process.argv[2]);
else if (import.meta.url === `file:///${process.argv[1]?.replaceAll("\\", "/").replace(/^\//, "")}`) {
  console.error("usage: node tools/verify-answer.mjs <miner request URL | saved answer .json>");
  process.exit(2);
}
