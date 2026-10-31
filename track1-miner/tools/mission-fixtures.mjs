#!/usr/bin/env node
/**
 * Mission fixtures: the 9 Season II example builds whose every intent family LiveCert serves
 * (tools/mission-matrix.mjs), each run as a workflow against a miner and graded step by step.
 *
 * Every check compares the answer with a reference fetched independently at run time (Bitstamp, MET Norway,
 * GLEIF, Wikidata, BLS, an Ethereum RPC, LayerZero Scan, SEC EDGAR) or with a settled, dated fact. A workflow
 * passes only if every step passes. A step whose reference cannot be fetched is `unchecked`, never a pass.
 *
 *   node tools/mission-fixtures.mjs [base-url] [out.json]
 *   SEC_USER_AGENT="Name contact@domain" enables the SEC cross-checks (SEC refuses anonymous clients).
 */
import { writeFile } from "node:fs/promises";

const BASE = process.argv[2] ?? "https://miner-wine.vercel.app";
const OUT = process.argv[3];
const UA = "livecert-fixtures/1.0 (+https://github.com/Harshyadav442277)";
const SEC_UA = process.env.SEC_USER_AGENT;

const fetchJson = async (url, headers = {}) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json", ...headers }, signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw new Error(`${r.status} ${new URL(url).host}`);
  return r.json();
};
const ask = async (path, params) => {
  const u = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const t = Date.now();
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
  return { status: r.status, ms: Date.now() - t, body: await r.json() };
};
const text = (b) => `${b.answer ?? ""} ${b.reason ?? ""}`;
const near = (a, b, rel) => Math.abs(a - b) <= Math.abs(b) * rel;
const num = (s) => Number(String(s).replace(/,/g, ""));

// References, each fetched independently of the miner.
const ref = {
  async bitstamp(pair) { return Number((await fetchJson(`https://www.bitstamp.net/api/v2/ticker/${pair}/`)).last); },
  async metnoTemp(lat, lon, isoHour) {
    const j = await fetchJson(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
    const row = j.properties.timeseries.find((t) => t.time.slice(0, 13) === isoHour.slice(0, 13)) ?? j.properties.timeseries[0];
    return row.data.instant.details.air_temperature;
  },
  async gleif(name) {
    const j = await fetchJson(`https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(name)}`);
    const hit = j.data.find((x) => x.attributes.entity.legalName.name.toUpperCase() === name.toUpperCase());
    if (!hit) throw new Error(`GLEIF has no exact legal name ${name}`);
    return { lei: hit.id, number: hit.attributes.entity.registeredAs };
  },
  async wikidataLabels(qid, prop) {
    const j = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
    const ids = (j.entities[qid].claims[prop] ?? []).filter((c) => !c.qualifiers?.P582).map((c) => c.mainsnak.datavalue?.value?.id).filter(Boolean);
    const labels = await fetchJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=labels&languages=en&format=json`);
    return ids.map((id) => labels.entities[id].labels.en.value);
  },
  async cpiYoY() {
    const s = (await fetchJson("https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SA0")).Results.series[0].data;
    const last = s[0];
    const prior = s.find((d) => d.period === last.period && Number(d.year) === Number(last.year) - 1);
    return { yoy: (Number(last.value) / Number(prior.value) - 1) * 100, month: last.periodName, year: last.year };
  },
  async ethTx(hash) {
    // An archive RPC: publicnode has no receipts this old. Pre-Byzantium receipts may carry `root`, not `status`.
    const r = await fetch("https://eth.drpc.org", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [hash] }), signal: AbortSignal.timeout(30000) });
    const x = (await r.json()).result;
    if (!x) throw new Error("RPC returned no receipt");
    return { ok: x.status === undefined || x.status === "0x1", block: parseInt(x.blockNumber, 16) };
  },
  async lzDelivered() {
    const j = await fetchJson("https://scan.layerzero-api.com/v1/messages/latest?limit=50");
    const m = j.data.find((x) => x.status?.name === "DELIVERED");
    return { hash: m.source.tx.txHash, src: m.pathway.sender.chain, dst: m.pathway.receiver.chain };
  },
  async secLatest10K(cik) {
    if (!SEC_UA) throw new Error("SEC_USER_AGENT not set");
    const j = await fetchJson(`https://data.sec.gov/submissions/CIK${cik}.json`, { "user-agent": SEC_UA });
    const r = j.filings.recent;
    const i = r.form.indexOf("10-K");
    return { date: r.filingDate[i], accession: r.accessionNumber[i] };
  },
};

// Each step: an intent, a request, and a grader returning failure strings (empty = pass).
const STEPS = {
  registry_unilever: { intent: "CORPORATE_REGISTRY_LOOKUP", path: "/company-registry",
    params: { query: "Look up Unilever PLC in the company registry: its registered number, status and LEI" },
    async grade(b) { const g = await ref.gleif("UNILEVER PLC"); const t = text(b);
      return [!t.includes(g.lei) && `LEI ${g.lei} (GLEIF) not in the answer`, !t.includes(g.number) && `registered number ${g.number} (GLEIF) not in the answer`].filter(Boolean); } },
  sanctions_rosneft: { intent: "SANCTIONS_SCREENING_MATCH", path: "/sanctions-screen", params: { query: "Is Rosneft on a sanctions list?" },
    async grade(b) { return [b.verdict !== "match" && `verdict ${b.verdict}, want match (Rosneft is on the OFAC SDN list)`, !/OFAC|SDN/.test(text(b)) && "no list named"].filter(Boolean); } },
  sanctions_clean: { intent: "SANCTIONS_SCREENING_MATCH", path: "/sanctions-screen", params: { query: "Screen the counterparty Unilever PLC against sanctions lists" },
    async grade(b) { return [b.verdict !== "no_match" && `verdict ${b.verdict}, want no_match`].filter(Boolean); } },
  financial_msft: { intent: "FINANCIAL_DATA", path: "/financial", params: { query: "What were Microsoft's total revenues in its latest annual report?" },
    async grade(b) { const t = text(b);
      return [!/10-K/.test(t) && "no 10-K named as the source", !/\$[\d.]+ billion/.test(t) && "no revenue figure", !SEC_UA && "unchecked: SEC_USER_AGENT not set"].filter(Boolean); } },
  websearch_ceo: { intent: "WEB_SEARCH", path: "/web-search", params: { query: "Who is the current CEO of Stripe?" },
    async grade(b) { const ceos = await ref.wikidataLabels("Q7624104", "P169");
      return [!ceos.some((c) => text(b).includes(c)) && `answer names none of Wikidata's CEOs (${ceos.join(", ")})`].filter(Boolean); } },
  websearch_founders: { intent: "WEB_SEARCH", path: "/web-search", params: { query: "Who founded Stripe?" },
    async grade(b) { const f = await ref.wikidataLabels("Q7624104", "P112");
      return f.filter((x) => !text(b).includes(x)).map((x) => `founder ${x} (Wikidata) missing`); } },
  factcheck_eiffel: { intent: "FACT_CHECK", path: "/fact-check", params: { query: "Is it true that the Eiffel Tower is located in Paris?" },
    async grade(b) { return [b.verdict !== "supported" && `verdict ${b.verdict}, want supported`].filter(Boolean); } },
  factcheck_boe: { intent: "FACT_CHECK", path: "/fact-check", params: { query: "Is it true that the Bank of England is headquartered in London?" },
    async grade(b) { return [b.verdict !== "supported" && `verdict ${b.verdict}, want supported (Threadneedle Street, City of London)`].filter(Boolean); } },
  factcheck_stripe_year: { intent: "FACT_CHECK", path: "/fact-check", params: { query: "Is it true that Stripe was founded in 2010?" },
    async grade(b) { return [b.verdict !== "supported" && `verdict ${b.verdict}, want supported (Wikidata P571: 2010)`].filter(Boolean); } },
  sentiment_earnings: { intent: "SENTIMENT_ANALYSIS", path: "/sentiment", params: { text: "The company beat earnings expectations and raised guidance; shares jumped 8%." },
    async grade(b) { return [b.verdict !== "positive" && `verdict ${b.verdict}, want positive`].filter(Boolean); } },
  event_btc100k: { intent: "EVENT_OUTCOME_RESOLUTION", path: "/event-outcome", params: { query: "Did Bitcoin reach $100k in 2024?" },
    async grade(b) { return [b.verdict !== "resolved" && `verdict ${b.verdict}, want resolved`, b.outcome !== "Yes" && `outcome ${b.outcome}, want Yes`].filter(Boolean); } },
  event_election: { intent: "EVENT_OUTCOME_RESOLUTION", path: "/event-outcome", params: { query: "Who won the 2024 United States presidential election?" },
    async grade(b) { return [b.verdict !== "resolved" && `verdict ${b.verdict}, want resolved`, !/Trump|Republican/i.test(text(b)) && "winner (Donald Trump) not named"].filter(Boolean); } },
  crosschain_live: { intent: "CROSS_CHAIN_STATE_VERIFY", path: "/cross-chain", params: async () => { const m = await ref.lzDelivered(); return { tx_hash: m.hash, query: `Did ${m.hash} from ${m.src} arrive on ${m.dst}?` }; },
    async grade(b) { return [!/deliver/i.test(`${b.verdict} ${text(b)}`) && `verdict ${b.verdict}; LayerZero Scan lists the message as DELIVERED`].filter(Boolean); } },
  qa_capital: { intent: "QUESTION_ANSWERING", path: "/answer", params: { query: "What is the capital of Australia?" },
    async grade(b) { return [!/Canberra/.test(text(b)) && "Canberra not named"].filter(Boolean); } },
  qa_moons: { intent: "QUESTION_ANSWERING", path: "/answer", params: { query: "How many moons does Mars have?" },
    async grade(b) { return [!/\b(two|2)\b/i.test(b.answer ?? "") && "the answer does not say two"].filter(Boolean); } },
  weather_berlin: { intent: "WEATHER_CHECK", path: "/weather-forecast", params: { query: "What is the current temperature in Berlin?" },
    async grade(b) { const m = /([-\d.]+)\s*°C/.exec(b.answer ?? ""); if (!m) return ["no °C figure"];
      const metno = await ref.metnoTemp(b.latitude, b.longitude, new Date().toISOString());
      return [!(Math.abs(Number(m[1]) - metno) <= 1.5) && `${m[1]} °C vs MET Norway ${metno} °C (tolerance 1.5)`].filter(Boolean); } },
  crypto_eth: { intent: "CRYPTO_PRICE", path: "/crypto-price", params: { query: "What is the current price of ETH in USD?" },
    async grade(b) { const last = await ref.bitstamp("ethusd"); const p = num(b.price);
      return [!near(p, last, 0.01) && `price ${p} vs Bitstamp ${last} (on-chain spec: within 1%)`].filter(Boolean); } },
  sec_apple: { intent: "REGULATORY_FILING_MONITOR", path: "/sec-filings", params: { query: "What was Apple's most recent 10-K filing date?" },
    async grade(b) { const t = text(b); const m = /accession (\d{10}-\d{2}-\d{6})/.exec(t);
      if (!m) return ["no accession number"];
      if (!SEC_UA) return ["unchecked: SEC_USER_AGENT not set"];
      const s = await ref.secLatest10K("0000320193");
      return [m[1] !== s.accession && `accession ${m[1]} vs EDGAR ${s.accession}`, !t.includes(s.date) && `EDGAR filing date ${s.date} not in the answer`].filter(Boolean); } },
  macro_cpi: { intent: "MACRO_ECONOMIC_INDICATOR", path: "/macro", params: { query: "What is the latest US CPI inflation rate?" },
    async grade(b) { const c = await ref.cpiYoY(); const m = /([-\d.]+)% year on year in (\w+) (\d{4})/.exec(b.answer ?? "");
      if (!m) return ["no 'x% year on year in <month> <year>' figure"];
      return [(m[2] !== c.month || m[3] !== c.year) && `period ${m[2]} ${m[3]} vs BLS latest ${c.month} ${c.year}`,
        !(Math.abs(Number(m[1]) - c.yoy) <= 0.1) && `${m[1]}% vs BLS CPI-U ${c.yoy.toFixed(1)}%`].filter(Boolean); } },
  transfer_first_eth: { intent: "CRYPTO_TRANSFER_VERIFY", path: "/transfer-verify",
    params: { hash: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060", chain: "ethereum", query: "Did this transfer settle?" },
    async grade(b) { const r = await ref.ethTx("0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060");
      return [b.verdict !== (r.ok ? "confirmed" : "failed") && `verdict ${b.verdict}; RPC status ok=${r.ok}`, !text(b).includes(String(r.block)) && `block ${r.block} (RPC) not in the answer`].filter(Boolean); } },
};

const WORKFLOWS = [
  { mission: "institutional-markets", build: "Pre-trade diligence between strangers", steps: ["registry_unilever", "sanctions_rosneft", "sanctions_clean", "financial_msft"] },
  { mission: "legal", build: "The overnight diligence pack", steps: ["registry_unilever", "sanctions_rosneft", "websearch_ceo", "factcheck_boe", "sentiment_earnings"] },
  { mission: "conflict-intelligence", build: "Verified off-chain facts for on-chain execution", steps: ["factcheck_eiffel", "event_election", "crosschain_live"] },
  { mission: "consumer-platform", build: "The model that pays for what it does not know", steps: ["qa_capital", "websearch_ceo", "factcheck_boe"] },
  { mission: "personal-agent", build: "Give every OpenClaw instance a wallet and a market", steps: ["websearch_ceo", "qa_moons", "weather_berlin", "crypto_eth"] },
  { mission: "asset-management", build: "Open research with the inputs attached", steps: ["websearch_ceo", "factcheck_eiffel", "sec_apple", "macro_cpi"] },
  { mission: "asset-management", build: "A defensible mark on the venture book", steps: ["websearch_founders", "registry_unilever", "factcheck_stripe_year"] },
  { mission: "asset-management", build: "Forecast accountability, scored by machines", steps: ["event_btc100k", "factcheck_eiffel", "websearch_ceo"] },
  { mission: "web3-defi", build: "The self-settling conditional escrow", steps: ["event_btc100k", "transfer_first_eth"] },
];

const results = {};
for (const id of [...new Set(WORKFLOWS.flatMap((w) => w.steps))]) {
  const s = STEPS[id];
  try {
    const params = typeof s.params === "function" ? await s.params() : s.params;
    const r = await ask(s.path, params);
    const fails = r.status === 200 ? await s.grade(r.body) : [`HTTP ${r.status}`];
    const state = fails.length === 0 ? "pass" : fails.every((f) => f.startsWith("unchecked")) ? "unchecked" : "fail";
    results[id] = { intent: s.intent, path: s.path, params, state, fails, ms: r.ms, verdict: r.body.verdict, answer: String(r.body.answer ?? "").slice(0, 300) };
  } catch (e) {
    results[id] = { intent: s.intent, path: s.path, state: "unchecked", fails: [`reference or request failed: ${e.message}`] };
  }
  console.log(`${results[id].state.padEnd(9)} ${id.padEnd(22)} ${results[id].fails.join("; ")}`);
}

console.log("");
const workflows = WORKFLOWS.map((w) => {
  const states = w.steps.map((s) => results[s].state);
  const state = states.includes("fail") ? "fail" : states.includes("unchecked") ? "unchecked" : "pass";
  console.log(`${state.padEnd(9)} ${w.mission} | ${w.build}`);
  return { ...w, state };
});
const n = (s) => workflows.filter((w) => w.state === s).length;
console.log(`\nworkflows: ${n("pass")} pass, ${n("fail")} fail, ${n("unchecked")} unchecked of ${workflows.length}`);
if (OUT) await writeFile(OUT, JSON.stringify({ at: new Date().toISOString(), base: BASE, workflows, steps: results }, null, 1));
process.exitCode = n("fail") ? 1 : 0;
