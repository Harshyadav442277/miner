/**
 * The graded steps behind tools/mission-fixtures.mjs: one request to the miner each, and a grader that compares
 * the answer with a reference fetched independently at run time, or with a settled, dated fact.
 *
 * A grader returns failure strings; empty means pass. A string starting "refused:" marks an honest licence
 * refusal (the step then does not serve its workflow), and "unchecked:" a reference that could not be read.
 */
const UA = "livecert-fixtures/1.0 (+https://github.com/Harshyadav442277)";
// SEC refuses anonymous clients. The miner's own identity is accepted; SEC_USER_AGENT overrides it.
const SEC_UA = process.env.SEC_USER_AGENT || "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

const fetchJson = async (url, headers = {}) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json", ...headers }, signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw new Error(`${r.status} ${new URL(url).host}`);
  return r.json();
};
const rpc = async (method, params) => {
  // An archive RPC: publicnode keeps no receipts as old as 2015.
  const r = await fetch("https://eth.drpc.org", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(30000) });
  return (await r.json()).result;
};
const text = (b) => `${b.answer ?? ""} ${b.reason ?? ""}`;
const near = (a, b, rel) => Math.abs(a - b) <= Math.abs(b) * rel;
const num = (s) => Number(String(s).replace(/,/g, ""));
const fails = (...xs) => xs.filter(Boolean);

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
    const x = await rpc("eth_getTransactionReceipt", [hash]);
    if (!x) throw new Error("RPC returned no receipt");
    return { ok: x.status === undefined || x.status === "0x1", block: parseInt(x.blockNumber, 16) };
  },
  async ethGas() {
    const [price, block] = await Promise.all([rpc("eth_gasPrice", []), rpc("eth_blockNumber", [])]);
    return { gwei: parseInt(price, 16) / 1e9, block: parseInt(block, 16) };
  },
  async lzDelivered() {
    const j = await fetchJson("https://scan.layerzero-api.com/v1/messages/latest?limit=50");
    const m = j.data.find((x) => x.status?.name === "DELIVERED");
    return { hash: m.source.tx.txHash, src: m.pathway.sender.chain, dst: m.pathway.receiver.chain };
  },
  async secLatest10K(cik) {
    const r = (await fetchJson(`https://data.sec.gov/submissions/CIK${cik}.json`, { "user-agent": SEC_UA })).filings.recent;
    const i = r.form.indexOf("10-K");
    return { date: r.filingDate[i], accession: r.accessionNumber[i] };
  },
  async secAnnualRevenue(cik) {
    const f = (await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { "user-agent": SEC_UA })).facts["us-gaap"];
    // Full-year values from 10-K filings only: a 10-K also carries quarterly figures.
    const rows = (f.RevenueFromContractWithCustomerExcludingAssessedTax ?? f.Revenues).units.USD
      .filter((x) => x.form === "10-K" && x.fp === "FY" && x.start && (new Date(x.end) - new Date(x.start)) > 300 * 864e5);
    return rows.sort((a, b) => b.end.localeCompare(a.end))[0].val;
  },
  async cloudflareBlocks(name) {
    const j = await fetchJson(`https://security.cloudflare-dns.com/dns-query?name=${name}&type=A`, { accept: "application/dns-json" });
    return (j.Answer ?? []).some((a) => a.data === "0.0.0.0");
  },
  async trialMentions(nct, word) {
    return new RegExp(word, "i").test(JSON.stringify(await fetchJson(`https://clinicaltrials.gov/api/v2/studies/${nct}`)));
  },
};

export const STEPS = {
  registry_unilever: { intent: "CORPORATE_REGISTRY_LOOKUP", path: "/company-registry",
    params: { query: "Look up Unilever PLC in the company registry: its registered number, status and LEI" },
    async grade(b) { const g = await ref.gleif("UNILEVER PLC"); const t = text(b);
      return fails(!t.includes(g.lei) && `LEI ${g.lei} (GLEIF) not in the answer`, !t.includes(g.number) && `registered number ${g.number} (GLEIF) not in the answer`); } },
  sanctions_rosneft: { intent: "SANCTIONS_SCREENING_MATCH", path: "/sanctions-screen", params: { query: "Is Rosneft on a sanctions list?" },
    async grade(b) { return fails(b.verdict !== "match" && `verdict ${b.verdict}, want match (Rosneft is on the OFAC SDN list)`, !/OFAC|SDN/.test(text(b)) && "no list named"); } },
  sanctions_clean: { intent: "SANCTIONS_SCREENING_MATCH", path: "/sanctions-screen", params: { query: "Screen the counterparty Unilever PLC against sanctions lists" },
    async grade(b) { return fails(b.verdict !== "no_match" && `verdict ${b.verdict}, want no_match`); } },
  financial_msft: { intent: "FINANCIAL_DATA", path: "/financial", params: { query: "What were Microsoft's total revenues in its latest annual report?" },
    async grade(b) { const m = /\$([\d.]+) billion/.exec(text(b)); if (!m) return ["no revenue figure in billions"];
      const sec = await ref.secAnnualRevenue("0000789019");
      return fails(!/10-K/.test(text(b)) && "no 10-K named", !near(Number(m[1]) * 1e9, sec, 0.005) && `$${m[1]} billion vs SEC XBRL ${(sec / 1e9).toFixed(2)} billion`); } },
  websearch_ceo: { intent: "WEB_SEARCH", path: "/web-search", params: { query: "Who is the current CEO of Stripe?" },
    async grade(b) { const ceos = await ref.wikidataLabels("Q7624104", "P169");
      return fails(!ceos.some((c) => text(b).includes(c)) && `answer names none of Wikidata's CEOs (${ceos.join(", ")})`); } },
  websearch_founders: { intent: "WEB_SEARCH", path: "/web-search", params: { query: "Who founded Stripe?" },
    async grade(b) { return (await ref.wikidataLabels("Q7624104", "P112")).filter((x) => !text(b).includes(x)).map((x) => `founder ${x} (Wikidata) missing`); } },
  factcheck_eiffel: { intent: "FACT_CHECK", path: "/fact-check", params: { query: "Is it true that the Eiffel Tower is located in Paris?" },
    async grade(b) { return fails(b.verdict !== "supported" && `verdict ${b.verdict}, want supported`); } },
  factcheck_boe: { intent: "FACT_CHECK", path: "/fact-check", params: { query: "Is it true that the Bank of England is headquartered in London?" },
    async grade(b) { return fails(b.verdict !== "supported" && `verdict ${b.verdict}, want supported (Threadneedle Street, City of London)`); } },
  factcheck_stripe_year: { intent: "FACT_CHECK", path: "/fact-check", params: { query: "Is it true that Stripe was founded in 2010?" },
    async grade(b) { return fails(b.verdict !== "supported" && `verdict ${b.verdict}, want supported (Wikidata P571: 2010)`); } },
  sentiment_earnings: { intent: "SENTIMENT_ANALYSIS", path: "/sentiment", params: { text: "The company beat earnings expectations and raised guidance; shares jumped 8%." },
    async grade(b) { return fails(b.verdict !== "positive" && `verdict ${b.verdict}, want positive`); } },
  event_btc100k: { intent: "EVENT_OUTCOME_RESOLUTION", path: "/event-outcome", params: { query: "Did Bitcoin reach $100k in 2024?" },
    async grade(b) { return fails(b.verdict !== "resolved" && `verdict ${b.verdict}, want resolved`, b.outcome !== "Yes" && `outcome ${b.outcome}, want Yes`); } },
  event_election: { intent: "EVENT_OUTCOME_RESOLUTION", path: "/event-outcome", params: { query: "Who won the 2024 United States presidential election?" },
    async grade(b) { return fails(b.verdict !== "resolved" && `verdict ${b.verdict}, want resolved`, !/Trump|Republican/i.test(text(b)) && "winner (Donald Trump) not named"); } },
  crosschain_live: { intent: "CROSS_CHAIN_STATE_VERIFY", path: "/cross-chain",
    params: async () => { const m = await ref.lzDelivered(); return { tx_hash: m.hash, query: `Did ${m.hash} from ${m.src} arrive on ${m.dst}?` }; },
    async grade(b) { return fails(!/deliver/i.test(`${b.verdict} ${text(b)}`) && `verdict ${b.verdict}; LayerZero Scan lists the message as DELIVERED`); } },
  qa_capital: { intent: "QUESTION_ANSWERING", path: "/answer", params: { query: "What is the capital of Australia?" },
    async grade(b) { return fails(!/Canberra/.test(text(b)) && "Canberra not named"); } },
  qa_moons: { intent: "QUESTION_ANSWERING", path: "/answer", params: { query: "How many moons does Mars have?" },
    async grade(b) { return fails(!/\b(two|2)\b/i.test(b.answer ?? "") && "the answer does not say two"); } },
  weather_berlin: { intent: "WEATHER_CHECK", path: "/weather-forecast", params: { query: "What is the current temperature in Berlin?" },
    async grade(b) { const m = /([-\d.]+)\s*°C/.exec(b.answer ?? ""); if (!m) return ["no °C figure"];
      const metno = await ref.metnoTemp(b.latitude, b.longitude, new Date().toISOString());
      return fails(!(Math.abs(Number(m[1]) - metno) <= 1.5) && `${m[1]} °C vs MET Norway ${metno} °C (tolerance 1.5)`); } },
  crypto_eth: { intent: "CRYPTO_PRICE", path: "/crypto-price", params: { query: "What is the current price of ETH in USD?" },
    async grade(b) { const last = await ref.bitstamp("ethusd"); const p = num(b.price);
      return fails(!near(p, last, 0.01) && `price ${p} vs Bitstamp ${last} (on-chain spec: within 1%)`); } },
  sec_apple: { intent: "REGULATORY_FILING_MONITOR", path: "/sec-filings", params: { query: "What was Apple's most recent 10-K filing date?" },
    async grade(b) { const t = text(b); const m = /accession (\d{10}-\d{2}-\d{6})/.exec(t); if (!m) return ["no accession number"];
      const s = await ref.secLatest10K("0000320193");
      return fails(m[1] !== s.accession && `accession ${m[1]} vs EDGAR ${s.accession}`, !t.includes(s.date) && `EDGAR filing date ${s.date} not in the answer`); } },
  macro_cpi: { intent: "MACRO_ECONOMIC_INDICATOR", path: "/macro", params: { query: "What is the latest US CPI inflation rate?" },
    async grade(b) { const c = await ref.cpiYoY(); const m = /([-\d.]+)% year on year in (\w+) (\d{4})/.exec(b.answer ?? "");
      if (!m) return ["no 'x% year on year in <month> <year>' figure"];
      return fails((m[2] !== c.month || m[3] !== c.year) && `period ${m[2]} ${m[3]} vs BLS latest ${c.month} ${c.year}`,
        !(Math.abs(Number(m[1]) - c.yoy) <= 0.1) && `${m[1]}% vs BLS CPI-U ${c.yoy.toFixed(1)}%`); } },
  transfer_first_eth: { intent: "CRYPTO_TRANSFER_VERIFY", path: "/transfer-verify",
    params: { hash: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060", chain: "ethereum", query: "Did this transfer settle?" },
    async grade(b) { const r = await ref.ethTx("0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060");
      return fails(b.verdict !== (r.ok ? "confirmed" : "failed") && `verdict ${b.verdict}; RPC status ok=${r.ok}`, !text(b).includes(String(r.block)) && `block ${r.block} (RPC) not in the answer`); } },
  gas_eth: { intent: "GAS_PRICE", path: "/gas-price", params: { query: "What is the current gas price in Gwei on Ethereum?" },
    async grade(b) { const t = text(b); const g = /on ethereum is ([\d.]+) Gwei/i.exec(t); const k = /as of block ([\d,]+)/.exec(t);
      if (!g || !k) return ["no Gwei figure or block in the answer"];
      const r = await ref.ethGas(); const ratio = Number(g[1]) / r.gwei;
      return fails(!(ratio > 1 / 3 && ratio < 3) && `${g[1]} Gwei vs RPC eth_gasPrice ${r.gwei.toFixed(3)} Gwei`, r.block - num(k[1]) > 300 && `block ${k[1]} is ${r.block - num(k[1])} behind the chain head`); } },
  url_malware: { intent: "URL_SAFE", path: "/url-reputation", params: { query: "Before paying, check the merchant site malware.testcategory.com: is it on a blocklist?" },
    async grade(b) { const blocked = await ref.cloudflareBlocks("malware.testcategory.com");
      return fails(!blocked && "unchecked: Cloudflare's filter no longer blocks its own test domain", b.listed !== true && `listed ${b.listed}, want true (Cloudflare 1.1.1.2 answers 0.0.0.0)`); } },
  url_clean: { intent: "URL_SAFE", path: "/url-reputation", params: { url: "https://github.com" },
    async grade(b) { return fails(b.listed !== false && `github.com listed ${b.listed}, want false`); } },
  classify_incident: { intent: "TEXT_CLASSIFICATION", path: "/classify",
    params: { query: "Classify this field report as hardware fault, software fault, or operator error: 'The drone's left motor overheated and the propeller stopped spinning.'" },
    async grade(b) { return fails(!/^hardware fault\b/i.test(String(b.reason ?? b.answer ?? "")) && `label ${String(b.reason ?? "").slice(0, 60)}, want hardware fault`); } },
  extract_invoice: { intent: "CONTENT_EXTRACTION", path: "/extract",
    params: { text: "Invoice INV-2041 from Acme Ltd, total $1,250.00, due 2026-11-30. Contact billing@acme.example.", query: "Extract the invoice number, total, due date and contact email." },
    async grade(b) { const t = JSON.stringify(b);
      return ["INV-2041", "1,250.00|1250", "2026-11-30", "billing@acme.example"].filter((x) => !new RegExp(x).test(t)).map((x) => `${x} not extracted`); } },
  translate_shipment: { intent: "LANGUAGE_TRANSLATION", path: "/translate", params: { query: 'Translate "The shipment has arrived at the port" into French.' },
    async grade(b) { const t = String(b.translation ?? b.answer ?? "");
      return fails(!/\bport\b/i.test(t) && "no 'port' in the French", !/arriv/i.test(t) && "no form of 'arriver' in the French"); } },
  research_lepodisiran: { intent: "RESEARCH_QUERY", path: "/research", params: { query: "Will Lepodisiran reduce coronary plaque?" },
    async grade(b) { const nct = /NCT\d{8}/.exec(text(b))?.[0]; if (b.verdict !== "evidence" || !nct) return [`verdict ${b.verdict}, trial ${nct ?? "none"} cited`];
      return fails(!(await ref.trialMentions(nct, "lepodisiran")) && `${nct} (ClinicalTrials.gov) does not mention lepodisiran`); } },
  stock_apple: { intent: "STOCK_PRICE", path: "/stock-price", params: { query: "What is Apple's share price?" },
    async grade(b) { return b.error === "not_licensed" && b.verdict === "unknown" ? ["refused: no licensed stock-price source (GAPS G230)"] : [`verdict ${b.verdict}, error ${b.error}: want an honest not_licensed`]; } },
};

/** The step(s) that prove LiveCert serves each family a mission build buys. */
export const FAMILY_STEPS = {
  WEB_SEARCH: ["websearch_ceo"], FACT_CHECK: ["factcheck_boe"], QUESTION_ANSWERING: ["qa_capital"],
  CORPORATE_REGISTRY_LOOKUP: ["registry_unilever"], REGULATORY_FILING_MONITOR: ["sec_apple"],
  SANCTIONS_SCREENING_MATCH: ["sanctions_rosneft", "sanctions_clean"], MACRO_ECONOMIC_INDICATOR: ["macro_cpi"],
  CRYPTO_PRICE: ["crypto_eth"], CRYPTO_TRANSFER_VERIFY: ["transfer_first_eth"], WEATHER_CHECK: ["weather_berlin"],
  FINANCIAL_DATA: ["financial_msft"], EVENT_OUTCOME_RESOLUTION: ["event_btc100k"], TEXT_CLASSIFICATION: ["classify_incident"],
  CONTENT_EXTRACTION: ["extract_invoice"], CROSS_CHAIN_STATE_VERIFY: ["crosschain_live"], SENTIMENT_ANALYSIS: ["sentiment_earnings"],
  URL_SAFE: ["url_malware", "url_clean"], LANGUAGE_TRANSLATION: ["translate_shipment"], GAS_PRICE: ["gas_eth"],
  RESEARCH_QUERY: ["research_lepodisiran"], STOCK_PRICE: ["stock_apple"],
};
