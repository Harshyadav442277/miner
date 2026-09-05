/**
 * Does restoring the `10u` word boundaries change the STORM answer's score?
 *
 * `/\b(?:10|100)?u\b|u-component/i` in storm.ts had both `\b` stored as literal
 * backspace bytes (0x08) — the corruption the 2026-08-26 Codex review found and
 * fixed everywhere else by moving to regex literals, except that a raw 0x08 is
 * legal *inside* a literal and invisible in every terminal. The first
 * alternative could therefore never match, so a question naming ERA5's "10u"
 * variable never got the sentence that explains it, and the only way in was the
 * exact string "u-component".
 *
 * Bench row 0 is such a question, from real scored traffic. This scores the
 * deployed answer against the rebuilt one under the live champion (453).
 *
 *   node bench/storm_ucomp.mjs [--base url]
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { checkStorm } = require("../miner/dist/storm.js");

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
const UCOMP = /u-component of wind velocity/i;

let moved = 0;
for (const [i, { q, gt }] of bench.entries()) {
  if (!/\b(?:10|100)?u\b|u-component/i.test(q)) continue;
  const deployed = await (await fetch(`${BASE}/storm-alert?query=${encodeURIComponent(q)}`, {
    signal: AbortSignal.timeout(30_000),
  })).json();
  const rebuilt = await checkStorm(q);

  const before = String(deployed.reason ?? "");
  const after = String(rebuilt.reason ?? "");
  const sBefore = scorer.score(q, gt, clipN(before, 32));
  const sAfter = scorer.score(q, gt, clipN(after, 32));
  moved++;
  console.log(
    `row ${i}: sentence deployed=${UCOMP.test(before)} rebuilt=${UCOMP.test(after)}  ` +
      `reason32 ${sBefore.toFixed(6)} -> ${sAfter.toFixed(6)}  (${((sAfter / sBefore - 1) * 100).toFixed(1)}%)`,
  );
  console.log(`  q: ${q.slice(0, 100)}`);
}
if (moved === 0) console.log("no bench row names the wind components");
