#!/usr/bin/env node
/**
 * Replay sanctions inputs through a compiled miner tree, against the live OFAC SDN and UN lists.
 *
 *   node track1-miner/tools/sanctions-replay.mjs <miner-dist-test-dir> <inputs.json> <out.json>
 *
 * <inputs.json> is a list of { name, query, wallet } as callers sent them (for example the distinct sanctions
 * inputs in the Daemon feed, `docs/evidence/sanctions-real-inputs-2026-11-05/inputs.json`). Build the tree with
 * `npm run test:unit` first, which compiles `dist-test/`. Run it on two trees to compare verdicts before and after
 * a change: the lists are the same live editions for both runs only if they run the same day.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const [dist, inputs, out] = process.argv.slice(2);
if (!dist || !inputs || !out) { console.error("usage: sanctions-replay.mjs <dist-test-dir> <inputs.json> <out.json>"); process.exit(2); }
const { screenSanctions } = await import(pathToFileURL(`${dist}/src/sanctions.js`).href);

const results = [];
for (const r of JSON.parse(readFileSync(inputs, "utf8"))) {
  const subject = r.wallet || r.name;
  const a = await screenSanctions(r.query || subject, subject);
  results.push({ input: subject || r.query, verdict: a.verdict, score: a.closest?.score ?? null,
    matched: a.closest?.matched_name ?? null, error: a.error ?? null });
}
writeFileSync(out, `${JSON.stringify(results, null, 1)}\n`);
const counts = {};
for (const r of results) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
console.log(JSON.stringify(counts));
