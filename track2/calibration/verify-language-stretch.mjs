#!/usr/bin/env node

import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadScorer } from "../harness/wasm-abi.mjs";

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`missing ${name}`);
  return resolve(process.argv[index + 1]);
}

const [alpha03, alpha06, alpha09] = await Promise.all([
  loadScorer(arg("--alpha03"), "alpha=0.3"),
  loadScorer(arg("--alpha06"), "alpha=0.6"),
  loadScorer(arg("--candidate"), "alpha=0.9"),
]);

const rows = [
  ["Translate 'hello' to Spanish.", "hola", "hola"],
  ["Translate 'hello' to Spanish.", "hola", "hello"],
  ["Translate 'good night' to French.", "bonne nuit", "bon nuit"],
  ["Translate 'thank you' to German.", "danke", "vielen dank"],
  ["Translate 'water' to Japanese.", "mizu", "水"],
  ["Translate 'peace' to Arabic.", "salam", "سلام"],
  ["Translate the sentence.", "The train is late.", "The train arrived late."],
  ["Translate the sentence.", "I do not know.", "I know."],
  ["Translate the sentence.", "Where is the station?", "Where's the train station?"],
  ["Translate the sentence.", "She bought three apples.", "She bought two apples."],
  ["Translate the sentence.", "cafe deja vu", "café déjà vu"],
  ["Translate the sentence.", "hello", ""],
];

let maxError = 0;
for (const row of rows) {
  const s03 = alpha03.score(...row);
  const s06 = alpha06.score(...row);
  const s09 = alpha09.score(...row);
  const expected = 2 * s06 - s03;
  const error = Math.abs(s09 - expected);
  maxError = Math.max(maxError, error);
  assert.ok(Number.isFinite(s09) && s09 >= 0 && s09 <= 1, `invalid score ${s09}`);
  assert.ok(error <= 2e-6, `calibration mismatch: got ${s09}, expected ${expected}`);
}

assert.equal(alpha09.score("q", "answer", ""), 0, "blank answer must remain exactly zero");
assert.equal(alpha09.score("q", "answer", "answer"), 1, "exact match must remain exactly one");

console.log(JSON.stringify({ fixtures: rows.length, maxAffineError: maxError, blank: 0, exactMatch: 1 }, null, 2));
