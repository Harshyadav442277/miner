// The rank-loss report's reproduced failures, re-asked of a base URL, with the
// champion score where a champion and a recorded or authored ground truth exist.
// usage: node report-probes.mjs <base> [--json out.json]
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
// Repository root: this file sits in track1-miner/docs/evidence/rank-loss-2026-09-15/.
const ROOT = fileURLToPath(new URL("../../../../", import.meta.url)).replace(/[\\/]$/, "");
const { loadScorer } = await import(pathToFileURL(`${ROOT}/track2/harness/wasm-abi.mjs`).href);
const C = `${ROOT}/track2/harness/champions`;
const champ = {
  CE: await loadScorer(`${C}/content_extraction_reg935.wasm`),
  TC: await loadScorer(`${C}/text_classification_reg687.wasm`),
  SA: await loadScorer(`${C}/sentiment_analysis_reg646.wasm`),
};
const BASE = process.argv[2];
const clip = (s, n = 32) => String(s).split(/\s+/).filter(Boolean).slice(0, n).join(" ");
function flat(v, out = []) {
  if (v == null) return out;
  if (Array.isArray(v)) { for (const x of v) flat(x, out); return out; }
  if (typeof v === "object") { for (const k of Object.keys(v).sort()) flat(v[k], out); return out; }
  out.push(String(v)); return out;
}

// gt: R = recorded ground truth, A = authored (G24: real ones are hidden).
const P = [
  ["F1", "/extract", { query: "Extract people, organizations and places from: Alice Johnson works for OpenAI in New York." }, "CE", "A:Person: Alice Johnson. Organization: OpenAI. Place: New York."],
  ["F1", "/extract", { query: "Extract quantities and units from: Add 1/2 cup milk, 250ml water and 2.5kg flour." }, "CE", "A:1/2 cup milk, 250ml water, 2.5kg flour."],
  ["F1", "/extract", { query: "Extract merchant name, date and total amount from this receipt: Acme Store. Date: 2026-09-14. Total: $42.50." }, "CE", "A:Merchant: Acme Store, Date: 2026-09-14, Total: $42.50"],
  ["E333", "/extract", { text: "Reach us at support@example.com or call 555-0192." }, "CE", "R:Email: support@example.com. Phone number: 555-0192."],
  ["E332", "/extract", { text: "The recipe calls for 2 cups of flour and 1 teaspoon of salt." }, "CE", "R:2 cups of flour, 1 teaspoon of salt."],
  ["E331", "/extract", { text: "The new laptop is priced at $1,299 and features a 16-inch display." }, "CE", "A:Price: $1,299. Display size: 16-inch."],
  ["E330", "/extract", { text: "From: John Smith, Subject: Quarterly Budget Review Meeting." }, "CE", "A:Sender: John Smith. Subject: Quarterly Budget Review Meeting."],
  ["E329", "/extract", { text: "Revenue grew by 12% to reach $4.5 million in Q3." }, "CE", "R:12% growth rate, $4.5 million revenue, Q3 time period."],
  ["REC", "/extract", { text: "Please submit the report by Friday and schedule a follow-up call." }, "CE", "R:1) Submit the report by Friday. 2) Schedule a follow-up call."],
  ["F2", "/classify", { query: 'Classify this ticket as billing, technical, or account issue: "I was charged twice on my invoice."' }, "TC", "A:This ticket is a billing issue."],
  ["F2", "/classify", { query: "Classify this support ticket as billing, technical, or account issue: 'I can't log into my account.'" }, "TC", "A:This support ticket is an account issue."],
  ["F2", "/classify", { query: "What category does this review belong to: quality, shipping, or price? 'The package took three weeks to arrive.'" }, "TC", "A:This review belongs to the shipping category."],
  ["F3", "/sentiment", { query: 'What is the sentiment of this review: "Fantastic, another three hours wasted because your app deleted my work."' }, "SA", "A:The sentiment is negative."],
  ["F3", "/sentiment", { query: "What's the sentiment of this review: 'The product broke after one day, terrible quality.'" }, "SA", "A:The sentiment is negative."],
  ["F4", "/telegraph", { query: "Which miner is currently rank 1 for WEATHER_FORECAST?" }],
  ["F4", "/telegraph", { query: "Who leads the WEB_SEARCH leaderboard in the latest epoch?" }],
  ["F6", "/papers", { query: "Find three peer-reviewed papers about transformer language models." }],
  ["F7", "/research", { query: "What are the main differences between proof of work and proof of stake? Cite sources." }],
  ["F9", "/event-outcome", { query: "Resolve this prediction market: who won the 2022 FIFA World Cup?" }],
];

const out = [];
for (const [id, path, params, c, gt] of P) {
  const q = params.query ?? params.text;
  let body, status;
  try {
    const r = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(30000) });
    status = r.status; body = await r.json();
  } catch (e) { body = { error: String(e) }; }
  const row = { id, path, params, status, verdict: body.verdict, reason: body.reason };
  if (c) {
    const g = gt.slice(2);
    row.gt = gt;
    row.score_reason32 = champ[c].score(q, g, clip(body.reason));
    row.score_flat32 = champ[c].score(q, g, clip(flat(body).join(" ")));
  }
  out.push(row);
  console.log(`${id.padEnd(5)} ${String(status)} ${c ? `r=${row.score_reason32.toFixed(3)} f=${row.score_flat32.toFixed(3)}` : "             "} ${body.verdict}: ${String(body.reason).slice(0, 170)}`);
}
const i = process.argv.indexOf("--json");
if (i > 0) writeFileSync(process.argv[i + 1], JSON.stringify(out, null, 2));
