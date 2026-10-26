// Does docs/openapi.json describe what the miner really returns? Asks one question per endpoint and reports
// top-level answer fields the spec does not name, either in the shared Answer schema or in that route's own.
// usage: node tools/openapi-check.mjs <spec.json> [base-url] [out.json]
import { readFileSync, writeFileSync } from "node:fs";

const [specPath, base = "https://miner-wine.vercel.app", outPath] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const routed = JSON.parse(readFileSync(new URL("./routed-questions.json", import.meta.url), "utf8"));
const documented = new Set(Object.keys(spec.components.schemas.Answer.properties));
const FALLBACK = {
  "/sanctions-screen": "Is Rosneft sanctioned?", "/company-registry": "Is Barclays Bank PLC still registered?",
  "/sec-filings": "Has Apple filed its latest 10-Q?", "/transfer-verify": "Verify transfer 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
  "/macro": "What is the euro area's latest inflation rate?", "/url-reputation": "Is https://www.bbc.co.uk safe?",
  "/answer": "Who wrote War and Peace?", "/classify": "Classify this ticket as billing, technical or account issue: 'I was charged twice.'",
  "/cross-chain": "Is Wormhole message 2/0000000000000000000000003ee18b2214aff97000d974cf647e7c347e8fa585/1 delivered?",
};

const undocumented = {};
const results = {};
// One real answer per path, without its per-call receipt: openapi.py reads these to type each route's own fields.
const samples = {};
for (const [path, ops] of Object.entries(spec.paths)) {
  const intents = Object.values(ops)[0]["x-telegraph-intents"];
  const q = intents.map((i) => routed[i]?.[0]).find(Boolean) ?? FALLBACK[path];
  if (!q) { results[path] = "no sample question"; continue; }
  const body = await fetch(`${base}${path}?query=${encodeURIComponent(String(q).slice(0, 1500))}`, { signal: AbortSignal.timeout(30_000) })
    .then((r) => r.json()).catch((e) => ({ fetch_error: String(e) }));
  const { receipt: _r, ...kept } = body;
  if (!body.fetch_error) samples[path] = { question: q, body: kept };
  const missing = Object.keys(body).filter((k) => !documented.has(k) && !(spec.paths[path]?.get?.responses?.["200"]?.content?.["application/json"]?.schema?.allOf?.[1]?.properties ?? {})[k]);
  for (const k of missing) (undocumented[k] ??= []).push(path);
  results[path] = { verdict: body.verdict ?? null, undocumented: missing };
  console.log(`${path.padEnd(22)} ${String(body.verdict).padEnd(16)} ${missing.length ? `undocumented: ${missing.join(", ")}` : "all fields documented"}`);
}
const n = Object.keys(undocumented).length;
console.log(`\n${n} undocumented top-level field${n === 1 ? "" : "s"}${n ? `: ${Object.entries(undocumented).map(([k, v]) => `${k} (${v.join(" ")})`).join("; ")}` : ""}`);
if (outPath) writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), base, undocumented, results, samples }, null, 1));
