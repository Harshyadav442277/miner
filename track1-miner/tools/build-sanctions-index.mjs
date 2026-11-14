#!/usr/bin/env node
/**
 * Build the prebuilt sanctions index the miner reads (src/sanctions-index.ts).
 *
 *   cd track1-miner/miner && npm run build && node ../tools/build-sanctions-index.mjs [--out <dir>]
 *
 * Downloads OFAC SDN + ALT, OFAC non-SDN CONS_PRIM + CONS_ALT, the UN Security Council consolidated XML (the
 * miner's own direct-read URLs), the UK Sanctions List XML (FCDO) and the EU financial sanctions XML v1.1, parses
 * them with the miner's compiled parsers (dist/), and writes <out>/sanctions-index.json plus
 * <out>/sanctions-index.meta.json (per-list edition, entries and source, failures, sizes, build time).
 * <out> defaults to track1-miner/miner/data/ (gitignored). Exits 1 without writing when a core list (OFAC SDN,
 * OFAC non-SDN, UN) fails, so a broken run never replaces the published index; a failed UK or EU list is
 * recorded in `failed` and the miner names it as not screened.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "miner", "dist");
const require = createRequire(import.meta.url);
const L = require(join(dist, "sanctions-lists.js"));
const X = require(join(dist, "sanctions-uk-eu.js"));
const I = require(join(dist, "sanctions-index.js"));

const args = process.argv.slice(2);
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : join(here, "..", "miner", "data");
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const t0 = Date.now();

/** One file, with two retries; the error text when all three attempts fail. */
async function get(url) {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(180_000) });
      if (r.ok) return { text: await r.text(), finalUrl: r.url };
      last = `HTTP ${r.status}`;
    } catch (e) {
      last = String(e?.message ?? e);
    }
    await new Promise((ok) => setTimeout(ok, 3_000 * (attempt + 1)));
  }
  return { error: last };
}

const keys = Object.keys(L.DIRECT_FILES);
const [direct, uk, eu] = await Promise.all([
  Promise.all(keys.map((k) => get(L.DIRECT_FILES[k]))),
  get(X.UK_URL),
  get(X.EU_URL),
]);
const errors = Object.fromEntries(keys.map((k, i) => [k, direct[i].error]));
const { reads, failed } = L.assemble(Object.fromEntries(keys.map((k, i) => [k, direct[i].error ? null : direct[i]])));
const failures = failed.map((n) => ({ n, error: Object.values(errors).filter(Boolean).join("; ") || "parse looked incomplete" }));

for (const [list, file, parse, published, url] of [
  ["UK Sanctions List", uk, X.parseUk, X.ukPublished, X.UK_URL],
  ["EU Financial Sanctions Consolidated List", eu, X.parseEu, X.euPublished, X.EU_URL],
]) {
  const parties = file.error ? [] : parse(file.text);
  if (L.looksComplete(list, parties)) reads.push({ list, published: published(file.text), parties, source: url });
  else failures.push({ n: list, error: file.error ?? `parse looked incomplete (${parties.length} parties)` });
}

const builtAt = new Date().toISOString();
const ix = I.encodeIndex(reads, failures, builtAt);
const body = JSON.stringify(ix);
const gz = gzipSync(body, { level: 9 }).length;
const meta = {
  built_at: builtAt,
  build_ms: Date.now() - t0,
  bytes: Buffer.byteLength(body),
  gzip_bytes: gz,
  sha256: createHash("sha256").update(body).digest("hex"),
  parties: ix.p.length,
  lists: ix.lists.map(({ n, pub, count, src }) => ({ list: n, published: pub, entries: count, source: src })),
  failed: failures,
};
console.log(JSON.stringify(meta, null, 1));

const core = new Set(L.CORE_LISTS);
if (failures.some((f) => core.has(f.n))) {
  console.error("a core list failed; nothing written");
  process.exit(1);
}
mkdirSync(out, { recursive: true });
writeFileSync(join(out, I.INDEX_FILE), body);
writeFileSync(join(out, "sanctions-index.meta.json"), `${JSON.stringify(meta, null, 1)}\n`);
console.error(`wrote ${join(out, I.INDEX_FILE)}`);
