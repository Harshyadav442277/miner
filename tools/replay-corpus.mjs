#!/usr/bin/env node
/**
 * Replays real paid questions against the deployed miner.
 *
 * The public question feed exposes what buyers actually paid to ask. That is a
 * far better acceptance corpus than tests written from imagination: replaying it
 * found three defects the local suite could not — coordinates stated in prose,
 * a stated time window being ignored, and "right now" answered with a 48-hour
 * outlook.
 *
 *   node tools/replay-corpus.mjs [baseUrl]
 *
 * Refresh the corpus with --refresh (needs network to the explorer).
 */
const BASE = process.argv.find((a) => a.startsWith("http")) ?? "https://miner-wine.vercel.app";
const FEED =
  "https://explorer.telegraphprotocol.com/api/daemon/api/questions?sort=recent&order=desc&since_hours=72&limit=100&offset=0";

import { readFile, writeFile } from "node:fs/promises";

const CORPUS = new URL("./corpus-storm.json", import.meta.url);

async function refresh() {
  const res = await fetch(FEED);
  const body = await res.json();
  const qs = (body.results ?? [])
    .map((x) => x?.question?.text ?? "")
    .filter((t) => /\bstorm risk\b/i.test(t));
  await writeFile(CORPUS, JSON.stringify(qs, null, 1));
  console.log(`refreshed corpus: ${qs.length} questions`);
}

/** The window the question asked for, or null if it did not state one. */
function expectedWindow(q) {
  const m = q.match(/\bin (\d+) hours?\b/i);
  if (m) return Number(m[1]);
  if (/\bright now\b/i.test(q)) return 1;
  return null;
}

/** verdict and risk_score must agree — they are two views of one number. */
const BANDS = { none: [0, 0.2], low: [0.2, 0.4], moderate: [0.4, 0.65], high: [0.65, 0.85], severe: [0.85, 1.01] };

if (process.argv.includes("--refresh")) await refresh();

const qs = JSON.parse(await readFile(CORPUS, "utf8"));
let pass = 0;
const failures = [];

for (const q of qs) {
  const url = `${BASE}/storm-alert?location=${encodeURIComponent(q)}`;
  let j;
  try {
    j = await (await fetch(url)).json();
  } catch (e) {
    failures.push([q, `request failed: ${e.message}`]);
    continue;
  }
  const want = expectedWindow(q);
  const problems = [];
  if (!j.verdict || j.verdict === "unknown") problems.push(`verdict=${j.verdict}`);
  if (typeof j.risk_score !== "number") problems.push("no risk_score");
  if (want !== null && j.window_hours !== want) problems.push(`window ${j.window_hours} != ${want}`);
  const band = BANDS[j.verdict];
  if (band && (j.risk_score < band[0] || j.risk_score >= band[1]))
    problems.push(`risk ${j.risk_score} outside ${j.verdict}`);
  if (problems.length === 0) pass++;
  else failures.push([q, problems.join("; ")]);
}

console.log(`${pass}/${qs.length} real paid questions answered correctly`);
for (const [q, why] of failures) console.log(`  FAIL  ${why}\n        ${q.slice(0, 100)}`);
process.exitCode = failures.length === 0 ? 0 : 1;
