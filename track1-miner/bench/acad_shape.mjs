/**
 * Payload-SHAPE bench for ACADEMIC_SEARCH, against champion 688.
 *
 * G40/G42 tuned the `reason` text and lost every time — but they scored
 * clip32(reason), and the converter reads the WHOLE payload: the engine stores
 * our JSON with keys re-sorted alphabetically (verified on the archived
 * epoch-289 row), and CONVERTER_MODEL measures `reason` contributing a median
 * 36% of the converted answer. So the sweeps were tuning 36% of the surface.
 * This bench holds `reason` fixed and varies what surrounds it, through the
 * real route assembly (`academicAnswer` + the same restatement `sendAnswer`
 * applies), on live OpenAlex results fetched once per question.
 *
 * Proxies for the unrunnable converter, calibrated on the four archived
 * (miner_answer, converted_answer, reported score) rows — all four reproduce
 * their reported scores EXACTLY under this WASM (scratchpad validate688):
 *   reason32  clip32 of the longest string field (the prose surface)
 *   flat32    clip32 of all primitive values, keys alphabetized (payload surface)
 *   desc32    "The data shows" + flat            (the converter's observed voice)
 * Every proxy underestimates the real converter but tracks its direction; a
 * candidate must win on the payload proxies without moving the prose proxy.
 *
 * Result 2026-08-31 (22 rows, live OpenAlex, four shapes then implemented):
 *
 *   shape                        reason32   flat32     desc32     flat32>full
 *   full PaperResult             0.013329   0.006041   0.005940       —
 *   lean {verdict,conf,reason}   0.013329   0.013419   0.013007     22/22
 *   lean + query echo field      0.013329   0.013552   0.013357     22/22
 *   slim papers[title,yr,cit]    0.013329   0.006307   0.006350     15/22
 *
 * lean SHIPPED. lean-vs-echo is inside noise (sign flips row to row), and the
 * echo duplicates the question the restated reason already carries. slim shows
 * the papers[] JSON itself is the diluent — trimming its fields buys ~nothing.
 * For live comparison the same day: the four miners' production payloads score
 * (flat32) livecert-full 0.0061, txlens 0.0093, preflight 0.0058, scholarwire
 * 0.0092 — the epoch-297 order — while livecert's PROSE alone scores 0.0133,
 * best in field on 19/22 rows. The prose was winning; the payload was losing.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { findPapers, academicAnswer } = require("../miner/dist/papers.js");
const { withRestatement, isAnswered } = require("../miner/dist/restate.js");
const { loadScorer } = await import(pathToFileURL(
  new URL("../../track2/harness/wasm-abi.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")).href);

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scorer = await loadScorer(`${DIR}champ_acad_688.wasm`);
const bench = JSON.parse(await readFile(`${DIR}acad_bench.json`, "utf8"));

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

/** Exactly what handler.ts serves: academicAnswer through sendAnswer's restatement. */
function served(question, result, shape) {
  const body = academicAnswer(result, shape);
  const reason = typeof body.reason === "string" ? body.reason : "";
  if (!reason) return body;
  return { ...body, reason: withRestatement(question, reason, isAnswered(body)) };
}

const SHAPES = ["full", "lean"];
const sums = {}, winsVsFull = {};
for (const s of SHAPES) { sums[s] = { reason32: 0, flat32: 0, desc32: 0 }; winsVsFull[s] = { flat32: 0, desc32: 0 }; }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
for (const { q, gt } of bench) {
  const result = await findPapers(q);
  await sleep(1200); // one pass, spaced — G43: keep OpenAlex probing minimal
  n++;
  const sc = {};
  for (const shape of SHAPES) {
    const body = served(q, result, shape);
    sc[shape] = {};
    for (const [name, fn] of Object.entries(PROXIES)) {
      const s = scorer.score(q, gt, fn(body));
      sc[shape][name] = s;
      sums[shape][name] += s;
    }
    if (shape !== "full") {
      if (sc[shape].flat32 > sc.full.flat32) winsVsFull[shape].flat32++;
      if (sc[shape].desc32 > sc.full.desc32) winsVsFull[shape].desc32++;
    }
  }
  process.stdout.write(`row ${n - 1} papers=${result.papers.length} full=${sc.full.flat32.toFixed(5)} lean=${sc.lean.flat32.toFixed(5)}\n`);
}

console.log(`\nACADEMIC_SEARCH payload shapes — ${n} rows, champion 688, real route assembly\n`);
console.log("  shape   reason32-mean  flat32-mean  desc32-mean  flat32>full  desc32>full");
for (const s of SHAPES) {
  console.log(
    `  ${s.padEnd(6)}  ${(sums[s].reason32 / n).toFixed(6)}       ${(sums[s].flat32 / n).toFixed(6)}     ${(sums[s].desc32 / n).toFixed(6)}     ` +
    (s === "full" ? "    —            —" : `   ${winsVsFull[s].flat32}/${n}          ${winsVsFull[s].desc32}/${n}`),
  );
}
