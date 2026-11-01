// How well `confidence` predicted correctness on the 2026-10-21 audit: 154 answers graded pass, partial or
// fail against primary sources (docs/evidence/correctness-audit-2026-10-21/). Joins table.md's row number
// with the same index in answers-production.json.
// usage: node tools/calibration.mjs [audit dir] [out.json]
import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2] ?? new URL("../docs/evidence/correctness-audit-2026-10-21/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const outPath = process.argv[3];
const answers = JSON.parse(readFileSync(`${dir}/answers-production.json`, "utf8"));
const rows = {};
for (const line of readFileSync(`${dir}/table.md`, "utf8").split(/\r?\n/)) {
  const m = /^\|\s*(\d+)\s*\|\s*([A-Z_]+)\s*\|.*\|\s*\*\*(pass|partial|fail)\*\*\s*\|/.exec(line);
  if (m) rows[Number(m[1])] = { intent: m[2], verdict: m[3] };
}

const items = answers.map((a, i) => ({
  i, intent: a.intent, confidence: typeof a.body?.confidence === "number" ? a.body.confidence : null,
  verdict: rows[i]?.verdict ?? null, error: a.body?.error ?? null, label: a.body?.verdict ?? null,
})).filter((x) => x.verdict && x.confidence !== null && rows[x.i].intent === x.intent);

// A pass is right, a fail is wrong; a partial counts as half.
const score = (v) => (v === "pass" ? 1 : v === "partial" ? 0.5 : 0);
const BUCKETS = [[0, 0.001], [0.001, 0.5], [0.5, 0.7], [0.7, 0.9], [0.9, 0.999], [0.999, 1.001]];
const buckets = BUCKETS.map(([lo, hi]) => {
  const xs = items.filter((x) => x.confidence >= lo && x.confidence < hi);
  const mean = xs.length ? xs.reduce((s, x) => s + x.confidence, 0) / xs.length : null;
  const right = xs.length ? xs.reduce((s, x) => s + score(x.verdict), 0) / xs.length : null;
  return { range: `${lo}-${Math.min(hi, 1)}`, n: xs.length, mean_confidence: mean, observed_right: right,
    pass: xs.filter((x) => x.verdict === "pass").length, partial: xs.filter((x) => x.verdict === "partial").length, fail: xs.filter((x) => x.verdict === "fail").length };
});

// The costly miscalibration: a confident answer that was wrong.
const confidentWrong = items.filter((x) => x.confidence >= 0.8 && x.verdict === "fail");
const byIntent = {};
for (const x of items) (byIntent[x.intent] ??= []).push(x);
const intents = Object.entries(byIntent).map(([intent, xs]) => ({
  intent, n: xs.length,
  mean_confidence: Number((xs.reduce((s, x) => s + x.confidence, 0) / xs.length).toFixed(2)),
  observed_right: Number((xs.reduce((s, x) => s + score(x.verdict), 0) / xs.length).toFixed(2)),
  confident_fails: xs.filter((x) => x.confidence >= 0.8 && x.verdict === "fail").length,
})).sort((a, b) => (b.mean_confidence - b.observed_right) - (a.mean_confidence - a.observed_right));

const brier = items.reduce((s, x) => s + (x.confidence - score(x.verdict)) ** 2, 0) / items.length;
console.log(`${items.length} graded answers with a confidence (of ${answers.length}); Brier score ${brier.toFixed(3)} (0 is perfect)\n`);
console.log("confidence      n  mean conf  observed right  pass/partial/fail");
for (const b of buckets) if (b.n) console.log(`${b.range.padEnd(13)} ${String(b.n).padStart(3)}  ${b.mean_confidence.toFixed(2).padStart(9)}  ${b.observed_right.toFixed(2).padStart(14)}  ${b.pass}/${b.partial}/${b.fail}`);
console.log(`\nconfident (>= 0.8) and wrong: ${confidentWrong.length}`);
for (const x of confidentWrong) console.log(`  #${x.i} ${x.intent} confidence ${x.confidence} verdict ${x.label}`);
console.log("\nintents, most over-confident first (mean confidence minus observed right):");
for (const r of intents.slice(0, 12)) console.log(`  ${r.intent.padEnd(27)} n=${r.n} conf ${r.mean_confidence.toFixed(2)} right ${r.observed_right.toFixed(2)} confident fails ${r.confident_fails}`);
if (outPath) writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), brier, buckets, confident_wrong: confidentWrong, intents }, null, 1));
