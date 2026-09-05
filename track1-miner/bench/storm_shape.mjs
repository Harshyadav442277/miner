/**
 * Payload-SHAPE bench for STORM_ALERT, against the live champion (registration 453).
 *
 * G56 projected SSL, weather and wallet to {verdict, confidence, reason} and said
 * in the same breath that "IP, STORM, NEWS, CONTENT, AI_TEXT, TRANSLATION and
 * ACADEMIC are untouched" — those three were leaned because they had evidence,
 * not because the others were measured and cleared. Since then weather crossed
 * its cliff (epoch 298) and SSL crossed at 309, while STORM has stayed fat: the
 * live response carries seventeen metadata fields around the prose. At epoch 309
 * txlens crossed STORM at 0.1538 against our 0.0107, and its production payload
 * is a single `answer` string.
 *
 * So this asks the one question that decides it: with the prose byte-identical,
 * does dropping the metadata raise the payload surface the converter scores?
 *
 *   node bench/storm_shape.mjs [--base url]
 *
 * Method is acad_shape.mjs's, which measured the change that shipped: hold the
 * answer text fixed, vary only what surrounds it, score both shapes under the
 * intent's champion through the same three proxies for the converter (which is
 * still not runnable offline, G24). The payload comes from production rather
 * than a local build, so what is scored is exactly what the node would store.
 *
 * A win here is a filter, not a verdict — twelve rows cannot prove a live gain
 * (G62), and only a scored epoch can.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "https://miner-wine.vercel.app";

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const { loadScorer } = await import(
  pathToFileURL(new URL("../../track2/harness/wasm-abi.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")).href
);
const scorer = await loadScorer(`${DIR}../../track2/harness/champions/storm_rpen_reg453.wasm`);
const bench = JSON.parse(await readFile(`${DIR}../tools/storm_bench.json`, "utf8"));

const clipN = (s, n) => String(s).split(/\s+/).filter(Boolean).slice(0, n).join(" ");
function flatValues(v, out = []) {
  if (v === null || v === undefined) return out;
  if (Array.isArray(v)) { for (const x of v) flatValues(x, out); return out; }
  if (typeof v === "object") { for (const k of Object.keys(v).sort()) flatValues(v[k], out); return out; }
  out.push(String(v));
  return out;
}
function longestString(v, best = { s: "" }) {
  if (v === null || v === undefined) return best.s;
  if (Array.isArray(v)) { for (const x of v) longestString(x, best); return best.s; }
  if (typeof v === "object") { for (const k of Object.keys(v)) longestString(v[k], best); return best.s; }
  if (typeof v === "string" && v.length > best.s.length) best.s = v;
  return best.s;
}
const PROXIES = {
  reason32: (p) => clipN(longestString(p), 32),
  flat32: (p) => clipN(flatValues(p).join(" "), 32),
  desc32: (p) => clipN("The data shows " + flatValues(p).join(" "), 32),
};

/** What `lean()` in handler.ts would send, applied to the served payload. */
const lean = (b) => {
  const out = { verdict: b.verdict, confidence: b.confidence, reason: b.reason };
  if (b.error !== undefined) out.error = b.error;
  return out;
};

const SHAPES = { full: (b) => b, lean };
const sums = {};
const wins = { flat32: 0, desc32: 0, reason32: 0 };
for (const s of Object.keys(SHAPES)) sums[s] = { reason32: 0, flat32: 0, desc32: 0 };

let n = 0;
for (const { q, gt } of bench) {
  const res = await fetch(`${BASE}/storm-alert?query=${encodeURIComponent(q)}`, {
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.json();
  if (!body || typeof body !== "object") {
    console.error(`row ${n}: no JSON body`);
    continue;
  }
  n++;
  const sc = {};
  for (const [shape, project] of Object.entries(SHAPES)) {
    const payload = project(body);
    sc[shape] = {};
    for (const [name, fn] of Object.entries(PROXIES)) {
      const s = scorer.score(q, gt, fn(payload));
      sc[shape][name] = s;
      sums[shape][name] += s;
    }
  }
  for (const p of ["flat32", "desc32", "reason32"]) if (sc.lean[p] > sc.full[p]) wins[p]++;
  console.log(
    `row ${n - 1} verdict=${String(body.verdict).padEnd(8)} full=${sc.full.flat32.toFixed(6)} lean=${sc.lean.flat32.toFixed(6)}`,
  );
}

console.log(`\nSTORM_ALERT payload shapes — ${n} rows, champion 453, live production payloads\n`);
console.log("  shape   reason32-mean  flat32-mean  desc32-mean");
for (const s of Object.keys(SHAPES)) {
  console.log(
    `  ${s.padEnd(6)}  ${(sums[s].reason32 / n).toFixed(6)}       ${(sums[s].flat32 / n).toFixed(6)}     ${(sums[s].desc32 / n).toFixed(6)}`,
  );
}
console.log(`\n  lean beats full on flat32 ${wins.flat32}/${n}, desc32 ${wins.desc32}/${n}, reason32 ${wins.reason32}/${n}`);
