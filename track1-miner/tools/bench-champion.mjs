#!/usr/bin/env node
/**
 * Scores our live answers against a champion WASM over many real questions.
 *
 * A single question proves very little — three of the improvements made today
 * looked good on one question and two of my scoring theories died on contact
 * with a second. The public /scores API carries hundreds of real questions with
 * their ground truths, so generalisation can actually be checked.
 *
 *   node tools/bench-champion.mjs --wasm champ.wasm --bench ssl_bench.json --path /ssl-check
 *
 * Prints per-question scores and the mean, so a change that helps one question
 * and hurts five is visible rather than flattering.
 */
import { readFile } from "node:fs/promises";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i]?.replace(/^--/, "");
  if (k) args.set(k, process.argv[i + 1]);
}
const WASM = args.get("wasm");
const BENCH = args.get("bench");
// Git Bash rewrites a leading "/" argument into a Windows path, so "/ssl-check"
// arrives as "C:/Program Files/Git/ssl-check". Accept the bare name too.
const rawPath = args.get("path") ?? "";
const PATH = rawPath.startsWith("/") && !rawPath.includes(":")
  ? rawPath
  : `/${rawPath.split(/[\/]/).pop()}`;
const PARAM = args.get("param") ?? "query";
const BASE = args.get("base") ?? "https://miner-wine.vercel.app";
if (!WASM || !BENCH || !PATH) {
  console.error("need --wasm FILE --bench FILE --path /endpoint [--param name] [--base url]");
  process.exit(2);
}

/** The scorer ABI: alloc, dealloc, rank_answer(qPtr,qLen,gtPtr,gtLen,maPtr,maLen) -> f32. */
async function loadScorer(file) {
  const bytes = await readFile(file);
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const { memory, alloc, rank_answer } = instance.exports;
  const enc = new TextEncoder();
  const put = (s) => {
    const b = enc.encode(s);
    const p = alloc(b.length);
    new Uint8Array(memory.buffer, p, b.length).set(b);
    return [p, b.length];
  };
  return (q, gt, ma) => {
    const [qp, ql] = put(q);
    const [gp, gl] = put(gt);
    const [mp, ml] = put(ma);
    return rank_answer(qp, ql, gp, gl, mp, ml);
  };
}

const score = await loadScorer(WASM);
const bench = JSON.parse(await readFile(BENCH, "utf8"));

let total = 0;
let n = 0;
const rows = [];
for (const { q, gt } of bench) {
  let answer = "";
  try {
    const url = `${BASE}${PATH}?${PARAM}=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const j = await res.json();
    answer = j.reason ?? "";
    if (!answer) console.error(`  (no reason field: ${JSON.stringify(j).slice(0, 120)})`);
  } catch (e) {
    // Swallowing this was hiding every failure behind a score of 0.
    console.error(`  (fetch failed: ${e.cause?.message ?? e.message})`);
    answer = "";
  }
  const s = answer ? score(q, gt, answer) : 0;
  rows.push([s, q]);
  total += s;
  n++;
}

rows.sort((a, b) => b[0] - a[0]);
for (const [s, q] of rows) console.log(`  ${s.toFixed(8)}  ${q.slice(0, 88)}`);
console.log(`\n  mean ${(total / n).toFixed(8)} over ${n} real questions`);
