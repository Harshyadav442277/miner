#!/usr/bin/env node

import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadScorer } from "../harness/wasm-abi.mjs";

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`missing ${name}`);
  return process.argv[index + 1];
}

const delta = Number(arg("--delta"));
const [base, candidate] = await Promise.all([
  loadScorer(resolve(arg("--base")), "base"),
  loadScorer(resolve(arg("--candidate")), "candidate"),
]);
const rows = [
  ["Question", "The verified answer is 42.", "The verified answer is 42."],
  ["Question", "The verified answer is 42.", "The answer is 41."],
  ["Question", "positive", "negative"],
  ["Question", "New York, United States", "New York, USA"],
  ["Question", "No active warning.", "There is an active warning."],
  ["Question", "bonjour", "bonsoir"],
  ["Question", "A long ground truth with several relevant terms and one figure: 18.5.", "Relevant terms with 18.5."],
  ["Question", "A long ground truth with several relevant terms and one figure: 18.5.", "Unrelated response."],
  ["Question", "answer", ""],
];

let maxError = 0;
for (const row of rows) {
  const raw = base.score(...row);
  const actual = candidate.score(...row);
  const expected = raw + delta * raw * (1 - raw) * (2 * raw - 1);
  const error = Math.abs(actual - expected);
  maxError = Math.max(maxError, error);
  assert.ok(error <= 3e-6, `${raw} transformed to ${actual}, expected ${expected}`);
  assert.ok(Number.isFinite(actual) && actual >= 0 && actual <= 1, `invalid score ${actual}`);
}
assert.equal(candidate.score("q", "answer", ""), 0);
const baseSelfMatch = base.score("q", "answer", "answer");
const candidateSelfMatch = candidate.score("q", "answer", "answer");
assert.ok(candidateSelfMatch >= baseSelfMatch && candidateSelfMatch >= 0.75);
console.log(JSON.stringify({ fixtures: rows.length, delta, maxError, blank: 0, baseSelfMatch, candidateSelfMatch }, null, 2));
