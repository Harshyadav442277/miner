// RESEARCH_QUERY's recorded routed questions (and the audit's own), answered by a compiled build in-process.
// Prints verdict and lead sentence per question so two builds can be diffed.
// usage: node tools/research-replay.mjs <miner dist-test dir> <out.json>
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const [dist, outPath] = process.argv.slice(2);
const { answerResearch } = require(`${dist}/src/research.js`);
const routed = JSON.parse(readFileSync(new URL("./routed-questions.json", import.meta.url), "utf8")).RESEARCH_QUERY;
const AUDIT = ["What does research say about creatine supplementation and cognition?"];
const qs = [...new Set([...routed, ...AUDIT])];

const out = [];
for (const q of qs) {
  const r = await answerResearch(q).catch((e) => ({ verdict: "threw", reason: String(e), confidence: 0 }));
  const lead = String(r.reason).split(/(?<=[.])\s+(?=[A-Z"])/)[0];
  out.push({ q, verdict: r.verdict, confidence: r.confidence, error: r.error ?? null, lead: lead.slice(0, 300) });
  console.log(`[${String(r.verdict).padEnd(11)}] ${q.slice(0, 70).replace(/\n/g, " ").padEnd(70)} | ${lead.slice(0, 110)}`);
}
const tally = out.reduce((m, x) => ((m[x.verdict] = (m[x.verdict] ?? 0) + 1), m), {});
console.log("\n", JSON.stringify(tally));
writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), tally, answers: out }, null, 1));
