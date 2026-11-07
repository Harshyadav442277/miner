#!/usr/bin/env node
/**
 * Replay FACT_CHECK claims through a built miner tree, against live Wikipedia.
 *
 *   node --dns-result-order=ipv4first track1-miner/tools/factcheck-replay.mjs <dist-test-dir> <inputs.json> <out.json>
 *
 * <inputs.json> is an array of { claim, truth } where truth is true, false, or null (not a checkable claim).
 * Each claim is checked with the tree's own checkFact(). A verdict is scored right when it is decisive and agrees
 * with the label, wrong when it is decisive and disagrees, and open when it is unverified or unknown. A decisive
 * verdict on a null-labelled text is counted separately: a sentence that is not a claim should not be settled.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [dist, inputsFile, out] = process.argv.slice(2);
if (!dist || !inputsFile || !out) {
  console.error("usage: factcheck-replay.mjs <dist-test-dir> <inputs.json> <out.json>");
  process.exit(2);
}
const { checkFact } = await import(pathToFileURL(join(resolve(dist), "src", "factcheck.js")).href);
const inputs = JSON.parse(readFileSync(inputsFile, "utf8"));

const results = [];
const tally = { right: 0, wrong: 0, open: 0, settled_non_claim: 0 };
for (const { claim, truth } of inputs) {
  const r = await checkFact(claim);
  const decisive = r.verdict === "supported" || r.verdict === "contradicted";
  const said = r.verdict === "supported";
  let grade;
  if (truth === null) grade = decisive ? "settled_non_claim" : "open";
  else if (!decisive) grade = "open";
  else grade = said === truth ? "right" : "wrong";
  tally[grade]++;
  const title = (r.reason.match(/article "([^"]+)"/) ?? [])[1] ?? null;
  results.push({ claim, truth, verdict: r.verdict, confidence: r.confidence, grade, article: title, evidence: r.evidence, error: r.error ?? null });
  console.log(`${grade.padEnd(17)} ${String(r.verdict).padEnd(12)} ${String(truth).padEnd(5)} ${claim.slice(0, 90)}  [${title ?? "-"}]`);
}
writeFileSync(out, JSON.stringify({ tally, results }, null, 1) + "\n");
console.log(JSON.stringify(tally));
