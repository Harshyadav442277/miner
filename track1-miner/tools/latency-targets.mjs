// Latency per intent against the site's latency targets (tools/site-intents.mjs output).
// Three different questions per intent. A question asked again within 10 minutes is answered from
// llm.ts's reply cache (2026-10-25), so give each run a question file nobody has asked yet.
// The client's round trip is measured on /health (no upstream work) and subtracted; the result
// estimates the time the miner spends, not what a caller far from the function region sees.
// usage: node tools/latency-targets.mjs <site-intents.json> <out.json> [base-url] [questions.json]
// questions.json: { "INTENT": ["/path", ["question", ...]], ... }
import { readFile, writeFile } from "node:fs/promises";

const [sitePath, outPath, base = "https://miner-wine.vercel.app", questionsPath] = process.argv.slice(2);
const site = Object.fromEntries(JSON.parse(await readFile(sitePath, "utf8")).rows.map((r) => [r.intent, r]));

const DEFAULT_Q = {
  CURRENCY_EXCHANGE: ["/convert", ["What is 100 USD in EUR right now?", "Convert 250 GBP to JPY", "What is the EUR to INR exchange rate today?"]],
  LANGUAGE_TRANSLATION: ["/translate", ['Translate "Good morning" into French.', 'Translate "Where is the train station?" into Spanish.', 'Translate "Thank you very much" into German.']],
  SENTIMENT_ANALYSIS: ["/sentiment", ["What's the sentiment of this review: 'The product broke after one day, terrible quality.'?",
    "Sentiment of: 'Delivery was quick and the staff were lovely.'", "Is this positive or negative: 'It works, but the battery life is disappointing.'"]],
  TEXT_CLASSIFICATION: ["/classify", ["Classify this text into sports, politics or technology: 'The striker scored twice in the derby.'",
    "Is this email spam or not spam: 'You have won a free cruise, click now'", "Classify the topic: 'The central bank raised interest rates by 25 basis points.'"]],
  SANCTIONS_SCREENING_MATCH: ["/sanctions-screen", ["Screen Kim Jong Un against the OFAC SDN list", "Is Rosneft sanctioned?", "Screen the company Acme Widgets Ltd against sanctions lists"]],
  CORPORATE_REGISTRY_LOOKUP: ["/company-registry", ["Is Barclays Bank PLC still registered?", "What is Apple's registered address?", "Look up Siemens AG in the company registry"]],
  REGULATORY_FILING_MONITOR: ["/sec-filings", ["Has Tesla filed its latest 10-Q?", "What was Apple's most recent 8-K filing?", "Latest 10-K filing from Microsoft"]],
  CRYPTO_TRANSFER_VERIFY: ["/transfer-verify", ["Verify transfer 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
    "Did transaction 0x88df016429689c079f3b2f6ad39fa052532c56795b733da78a91ebe6a713944b succeed?",
    "Check transfer 0x2f1c5c2b44f771e942a8506148e256f94f1a464babc938ae0690c6e34cd79190 on ethereum"]],
  MACRO_ECONOMIC_INDICATOR: ["/macro", ["What was the latest US CPI year-over-year print?", "What is the current US unemployment rate?", "What is Japan's latest GDP growth rate?"]],
  URL_SAFE: ["/url-reputation", ["Is malware.testcategory.com listed on any blocklist?", "Is https://github.com safe to visit?", "Is http://example.com a phishing site?"]],
  QUESTION_ANSWERING: ["/answer", ["How many moons does Mars have?", "Who wrote War and Peace?", "When did the Berlin Wall fall?"]],
  CROSS_CHAIN_STATE_VERIFY: ["/cross-chain", ["Has the LayerZero message 0x8f5a3b1d0e9c7f2a4b6d8e0f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c delivered?",
    "Is Wormhole message 2/0000000000000000000000003ee18b2214aff97000d974cf647e7c347e8fa585/1 delivered?",
    "Verify the cross-chain transfer 0x1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00 on LayerZero"]],
  EVENT_OUTCOME_RESOLUTION: ["/event-outcome", ["Who won the 2022 FIFA World Cup final?", "Did the Fed cut rates at its September 2025 meeting?", "Who won the 2024 US presidential election?"]],
};

const Q = questionsPath ? JSON.parse(await readFile(questionsPath, "utf8")) : DEFAULT_Q;

const timed = async (path, q) => {
  const u = `${base}${path}${q === null ? "" : `?query=${encodeURIComponent(q)}`}`;
  const t = performance.now();
  const r = await fetch(u, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
  const body = r ? await r.text() : "";
  return { ms: Math.round(performance.now() - t), status: r?.status ?? 0, cache: r?.headers.get("x-vercel-cache") ?? null, verdict: /"verdict":"([^"]*)"/.exec(body)?.[1] ?? null };
};
const targetMs = (t) => { const m = /([\d.]+)\s*(ms|s)/.exec(t ?? ""); return m ? Number(m[1]) * (m[2] === "s" ? 1000 : 1) : null; };

// Sequential, and the fastest: parallel calls queue on one connection and overstate the round trip.
const rtts = [];
for (let i = 0; i < 7; i++) rtts.push((await timed("/health", null)).ms);
const baseline = Math.min(...rtts);
const out = { at: new Date().toISOString(), base, baseline_rtt_ms: baseline, intents: {} };
console.log(`baseline round trip (/health): ${baseline} ms`);
for (const [intent, [path, qs]] of Object.entries(Q)) {
  const runs = [];
  for (const q of qs) runs.push({ q, ...(await timed(path, q)) });
  const target = site[intent]?.latency_target ?? null;
  const server = runs.map((r) => Math.max(0, r.ms - baseline));
  const t = targetMs(target);
  const within = t === null ? null : server.filter((s) => s <= t).length;
  out.intents[intent] = { path, target, target_ms: t, server_ms_est: server, within_target: within, runs };
  console.log(`${intent.padEnd(26)} target ${String(target).padEnd(7)} est ${server.map((s) => String(s).padStart(5)).join(" ")} ms  within ${within}/3  ${runs.map((r) => `${r.status}:${r.verdict}`).join(" ")}`);
}
await writeFile(outPath, JSON.stringify(out, null, 1));
