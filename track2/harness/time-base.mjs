#!/usr/bin/env node

/**
 * Per-call cost of a scoring module, which is what the gate's ten-minute
 * budget actually spends.
 *
 * Instantiation of a 24 MB module costs ~60 ms and is irrelevant. What decides
 * whether a candidate finishes is the cost of one `rank_answer` call times the
 * number of fixture pairs and historical rows, and that cost scales with answer
 * length. See recon/2026-08-31-runtime-budget-lock.md.
 *
 * Usage: node time-base.mjs <module.wasm> [more.wasm ...]
 */

import { statSync } from "node:fs";
import { basename } from "node:path";
import { loadScorer } from "./wasm-abi.mjs";

/** Distinct rows. Re-scoring one row understates cost badly: the modules cache
 *  their ground-truth embedding, so 20 identical calls pay for one. The gate
 *  never repeats a row, so neither does this. */
function rows(count, answerLength) {
  const filler = "The paper reports that scaling laws hold across four orders of magnitude. ";
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const question = `Summarise finding ${i} in the ${i * 7 + 3}-site transformer scaling review.`;
    const truth = `Study ${i} reports a power-law exponent of 0.${i}${i}5 over ${i * 11 + 40} runs, with compute-optimal training at ${i + 18} tokens per parameter.`;
    let answer = `Study ${i} found an exponent near 0.${i}${i}5 across ${i * 11 + 40} runs.`;
    while (answer.length < answerLength) answer += filler;
    out.push([question, truth, answer.slice(0, Math.max(answer.length, answerLength))]);
  }
  return out;
}

const SHORT_ROWS = rows(20, 0);
const LONG_ROWS = rows(5, 30000);

const paths = process.argv.slice(2);
if (paths.length === 0) throw new Error("usage: node time-base.mjs <module.wasm> ...");

for (const path of paths) {
  const bytes = statSync(path).size;
  const startLoad = Date.now();
  const scorer = await loadScorer(path, basename(path));
  scorer.score(SHORT_ROWS[0][0], SHORT_ROWS[0][1], SHORT_ROWS[0][2]); // fault the module in
  const load = Date.now() - startLoad;

  const startShort = Date.now();
  for (const [q, gt, a] of SHORT_ROWS) scorer.score(q, gt, a);
  const short = (Date.now() - startShort) / SHORT_ROWS.length;

  const startLong = Date.now();
  for (const [q, gt, a] of LONG_ROWS) scorer.score(q, gt, a);
  const long = (Date.now() - startLong) / LONG_ROWS.length;

  console.log(
    `${basename(path).padEnd(34)} ${String(bytes).padStart(9)} B  load ${String(load).padStart(4)} ms  ` +
    `short ${short.toFixed(1).padStart(7)} ms/call  30KB ${long.toFixed(1).padStart(7)} ms/call`,
  );
}
