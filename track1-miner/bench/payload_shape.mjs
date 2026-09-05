/**
 * Payload-SHAPE bench: does the metadata around the prose cost us score?
 *
 * The engine scores the converter's summary of the WHOLE payload with its keys
 * alphabetized, so every metadata field is scored surface competing with the
 * answer. G40 measured that on ACADEMIC (+122%) and G56 shipped it for SSL,
 * weather and wallet — recording in the same breath that "IP, STORM, NEWS,
 * CONTENT, AI_TEXT, TRANSLATION and ACADEMIC are untouched". Those three were
 * leaned because they had evidence that day, not because the rest were cleared,
 * and the untouched list still holds our worst ratios.
 *
 * This generalises acad_shape.mjs so any intent with a bench can be asked the
 * same question: with the prose byte-identical, does dropping the metadata raise
 * the payload surface?
 *
 *   node bench/payload_shape.mjs STORM_ALERT
 *   node bench/payload_shape.mjs IP_GEOLOCATION --base https://preview.example
 *
 * The payload comes from a deployment rather than a local build, so what is
 * scored is what the node would actually store. A win is a filter, not a verdict
 * (G62): twelve or twenty rows cannot prove a live gain, only a scored epoch can.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/** Intents with both a (question, ground_truth) bench and a champion we hold. */
const INTENTS = {
  STORM_ALERT: { path: "/storm-alert", bench: "../tools/storm_bench.json", champion: "storm_rpen_reg453.wasm" },
  IP_GEOLOCATION: { path: "/ip-geolocate", bench: "./ip_bench.json", champion: "ipgeo_reg630.wasm" },
  SSL_VERIFICATION: { path: "/ssl-check", bench: "./ssl_bench.json", champion: "ssl_reg631.wasm" },
  WEATHER_FORECAST: { path: "/weather-forecast", bench: "../tools/wf_bench.json", champion: "wf_mini_reg636.wasm" },
  WALLET_BALANCE_CHECK: { path: "/wallet-balance", bench: "./bench_WALLET_BALANCE_CHECK.json", champion: "wallet_reg3022.wasm" },
};

const intent = process.argv[2];
if (!INTENTS[intent]) {
  console.error(`usage: node bench/payload_shape.mjs <${Object.keys(INTENTS).join("|")}> [--base url]`);
  process.exit(2);
}
const { path, bench: benchFile, champion } = INTENTS[intent];
const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "https://miner-wine.vercel.app";

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const { loadScorer } = await import(
  pathToFileURL(new URL("../../track2/harness/wasm-abi.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")).href
);
const scorer = await loadScorer(`${DIR}../../track2/harness/champions/${champion}`);
const bench = JSON.parse(await readFile(`${DIR}${benchFile}`, "utf8"));

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

/** Proxies for the converter, which is still not runnable offline (G24). */
const PROXIES = {
  reason32: (p) => clipN(longestString(p), 32),
  flat32: (p) => clipN(flatValues(p).join(" "), 32),
  desc32: (p) => clipN("The data shows " + flatValues(p).join(" "), 32),
};

/** What `lean()` in handler.ts sends. */
const lean = (b) => {
  const out = { verdict: b.verdict, confidence: b.confidence, reason: b.reason };
  if (b.error !== undefined) out.error = b.error;
  return out;
};

const SHAPES = { full: (b) => b, lean };
const sums = { full: { reason32: 0, flat32: 0, desc32: 0 }, lean: { reason32: 0, flat32: 0, desc32: 0 } };
const wins = { flat32: 0, desc32: 0 };
let n = 0;

for (const { q, gt } of bench) {
  let body;
  try {
    body = await (await fetch(`${BASE}${path}?query=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(30_000) })).json();
  } catch (e) {
    console.error(`row ${n}: ${e.message}`);
    continue;
  }
  if (!body || typeof body !== "object") continue;
  n++;
  const sc = {};
  for (const [shape, project] of Object.entries(SHAPES)) {
    sc[shape] = {};
    for (const [name, fn] of Object.entries(PROXIES)) {
      const s = scorer.score(q, gt, fn(project(body)));
      sc[shape][name] = s;
      sums[shape][name] += s;
    }
  }
  if (sc.lean.flat32 > sc.full.flat32) wins.flat32++;
  if (sc.lean.desc32 > sc.full.desc32) wins.desc32++;
  console.log(`row ${n - 1} ${String(body.verdict).slice(0, 22).padEnd(22)} full=${sc.full.flat32.toFixed(6)} lean=${sc.lean.flat32.toFixed(6)}`);
}

if (n === 0) {
  console.log("no rows scored");
  process.exit(1);
}
console.log(`\n${intent} payload shapes — ${n} rows, champion ${champion.replace(/\.wasm$/, "")}, payloads from ${BASE}\n`);
console.log("  shape   reason32-mean  flat32-mean  desc32-mean");
for (const s of Object.keys(SHAPES)) {
  console.log(
    `  ${s.padEnd(6)}  ${(sums[s].reason32 / n).toFixed(6)}       ${(sums[s].flat32 / n).toFixed(6)}     ${(sums[s].desc32 / n).toFixed(6)}`,
  );
}
const gain = (sums.lean.flat32 / sums.full.flat32 - 1) * 100;
console.log(`\n  lean beats full on flat32 ${wins.flat32}/${n}, desc32 ${wins.desc32}/${n} — flat32 mean ${gain >= 0 ? "+" : ""}${gain.toFixed(1)}%`);
