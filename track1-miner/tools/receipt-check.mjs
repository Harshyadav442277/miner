// One question per declared intent against a running miner; reports each answer's receipt.
// Questions come from tools/routed-questions.json where it has the intent, else from FALLBACK.
// usage: node tools/receipt-check.mjs <base-url> <out.json>
import { readFileSync, writeFileSync } from "node:fs";

const [base = "http://localhost:8080", outPath] = process.argv.slice(2);
const yaml = readFileSync(new URL("../miner.yaml", import.meta.url), "utf8");
const routed = JSON.parse(readFileSync(new URL("./routed-questions.json", import.meta.url), "utf8"));

// Each endpoint block names external_path and then intents: [...].
const paths = {};
for (const m of yaml.matchAll(/external_path:\s*(\S+)[\s\S]*?intents:\s*\[([^\]]*)\]/g)) {
  for (const i of m[2].split(",").map((s) => s.trim().replace(/"/g, "")).filter((s) => s && s !== "*")) paths[i] ??= m[1];
}

const FALLBACK = {
  QUESTION_ANSWERING: "How many moons does Mars have?",
  TEXT_CLASSIFICATION: "Classify this ticket as billing, technical or account issue: 'I was charged twice this month.'",
  SANCTIONS_SCREENING_MATCH: "Is Rosneft sanctioned?",
  CORPORATE_REGISTRY_LOOKUP: "Is Barclays Bank PLC still registered?",
  REGULATORY_FILING_MONITOR: "Has Apple filed its latest 10-Q?",
  CRYPTO_TRANSFER_VERIFY: "Verify transfer 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
  MACRO_ECONOMIC_INDICATOR: "What is the euro area's latest inflation rate?",
  URL_SAFE: "Is https://www.bbc.co.uk safe?",
  CROSS_CHAIN_STATE_VERIFY: "Is Wormhole message 2/0000000000000000000000003ee18b2214aff97000d974cf647e7c347e8fa585/1 delivered?",
};
const SECRET = /gsk_[A-Za-z0-9]{10}|ghp_[A-Za-z0-9]{10}|api_key=(?!REDACTED)|token=(?!REDACTED)|mailto=(?!REDACTED)/;

const out = {};
for (const [intent, path] of Object.entries(paths).sort()) {
  const q = routed[intent]?.[0] ?? FALLBACK[intent];
  if (!q) { out[intent] = { path, skipped: "no sample question" }; console.log(`${intent.padEnd(27)} SKIP no question`); continue; }
  const r = await fetch(`${base}${path}?query=${encodeURIComponent(String(q).slice(0, 1500))}`, { signal: AbortSignal.timeout(30_000) })
    .then((x) => x.json()).catch((e) => ({ error: String(e) }));
  const rc = r.receipt;
  const raw = JSON.stringify(rc ?? {});
  out[intent] = { path, verdict: r.verdict, receipt: rc ?? null, secret_like: SECRET.test(raw) };
  const hosts = [...new Set((rc?.upstream ?? []).map((u) => { try { return new URL(u.url).host; } catch { return u.url; } }))];
  console.log(`${intent.padEnd(27)} ${String(r.verdict).padEnd(14)} receipt=${rc ? "yes" : "NO "} reads=${String(rc?.upstream?.length ?? 0).padStart(2)} ${SECRET.test(raw) ? "SECRET-LIKE " : ""}${hosts.slice(0, 4).join(", ")}`);
}
if (outPath) writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), base, intents: out }, null, 1));
const missing = Object.entries(out).filter(([, v]) => !v.skipped && !v.receipt).map(([k]) => k);
const leaky = Object.entries(out).filter(([, v]) => v.secret_like).map(([k]) => k);
console.log(`\n${Object.keys(out).length} intents; without a receipt: ${missing.join(", ") || "none"}; secret-like values: ${leaky.join(", ") || "none"}`);
