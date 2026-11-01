// Same questions to TxLens, ChainSight and LiveCert, called directly (not through Telegraph, so no
// request is billed or counted). Records status, latency and the full body.
// usage: node probes.mjs <out.json>
import { writeFile } from "node:fs/promises";
const TX = "https://telegraph-onchain-tx-lookup-miner.onrender.com";
const CS = "https://hub.shadrakbessanh.me";
const LC = "https://miner-wine.vercel.app";
const H = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060"; // first ETH value transfer
const q = (o) => new URLSearchParams(o).toString();
const STORM = "Is there an active storm alert or severe weather warning for Lagos right now?";
const FC = "The Eiffel Tower is in Berlin.";
const WS = "What did the US Federal Reserve decide at its most recent rate meeting?";
const cases = [
  // intent, label, miner, method, url, body
  ["ONCHAIN_TX_LOOKUP", "explicit hash", "txlens", "GET", `${TX}/check-tx?${q({ tx_hash: H })}`],
  ["ONCHAIN_TX_LOOKUP", "explicit hash", "chainsight", "GET", `${CS}/tx?${q({ hash: H })}`],
  ["ONCHAIN_TX_LOOKUP", "explicit hash", "livecert", "GET", `${LC}/tx-lookup?${q({ query: H })}`],
  ["ONCHAIN_TX_LOOKUP", "question only", "txlens", "GET", `${TX}/check-tx?${q({ query: `Did transaction ${H} succeed?` })}`],
  ["ONCHAIN_TX_LOOKUP", "question only", "chainsight", "GET", `${CS}/tx?${q({ query: `Did transaction ${H} succeed?` })}`],
  ["ONCHAIN_TX_LOOKUP", "question only", "livecert", "GET", `${LC}/tx-lookup?${q({ query: `Did transaction ${H} succeed?` })}`],
  ["ONCHAIN_TX_LOOKUP", "malformed hash", "txlens", "GET", `${TX}/check-tx?${q({ tx_hash: "0x1234" })}`],
  ["ONCHAIN_TX_LOOKUP", "malformed hash", "chainsight", "GET", `${CS}/tx?${q({ hash: "0x1234" })}`],
  ["ONCHAIN_TX_LOOKUP", "malformed hash", "livecert", "GET", `${LC}/tx-lookup?${q({ query: "0x1234" })}`],
  ["CRYPTO_PRICE", "ETH", "txlens", "GET", `${TX}/crypto-price?${q({ coin_id: "ethereum" })}`],
  ["CRYPTO_PRICE", "ETH", "chainsight", "GET", `${CS}/price?${q({ symbol: "ETH" })}`],
  ["CRYPTO_PRICE", "ETH", "livecert", "GET", `${LC}/crypto-price?${q({ query: "What is the price of ETH in USD?" })}`],
  ["STORM_ALERT", "Lagos app question", "txlens", "GET", `${TX}/storm-alert?${q({ query: STORM })}`],
  ["STORM_ALERT", "Lagos app question", "chainsight", "GET", `${CS}/wstorm?${q({ query: STORM })}`],
  ["STORM_ALERT", "Lagos app question", "livecert", "GET", `${LC}/storm-alert?${q({ location: "Lagos", query: STORM })}`],
  ["WEATHER_FORECAST", "Lagos 24h", "txlens", "GET", `${TX}/weather-forecast?${q({ query: "What is the 24-hour weather forecast for Lagos, Nigeria?" })}`],
  ["WEATHER_FORECAST", "Lagos 24h", "chainsight", "GET", `${CS}/wforecast?${q({ query: "What is the 24-hour weather forecast for Lagos, Nigeria?" })}`],
  ["WEATHER_FORECAST", "Lagos 24h", "livecert", "GET", `${LC}/weather-forecast?${q({ location: "Lagos Nigeria", hours: "24", query: "What is the 24-hour weather forecast for Lagos, Nigeria?" })}`],
  ["SSL_VERIFICATION", "github.com", "txlens", "GET", `${TX}/ssl-check?${q({ domain: "github.com" })}`],
  ["SSL_VERIFICATION", "github.com", "chainsight", "GET", `${CS}/ssl?${q({ query: "github.com" })}`],
  ["SSL_VERIFICATION", "github.com", "livecert", "GET", `${LC}/ssl-check?${q({ domain: "github.com" })}`],
  ["FACT_CHECK", "false claim", "txlens", "GET", `${TX}/fact-check?${q({ claim: FC })}`],
  ["FACT_CHECK", "false claim", "chainsight", "POST", `${CS}/factcheck`, { query: FC }],
  ["FACT_CHECK", "false claim", "livecert", "GET", `${LC}/fact-check?${q({ query: FC })}`],
  ["WEB_SEARCH", "Fed decision", "txlens", "GET", `${TX}/web-search?${q({ query: WS })}`],
  ["WEB_SEARCH", "Fed decision", "chainsight", "POST", `${CS}/websearch`, { query: WS }],
  ["WEB_SEARCH", "Fed decision", "livecert", "GET", `${LC}/web-search?${q({ query: WS })}`],
  ["GAS_PRICE", "eth", "txlens", "GET", `${TX}/gas-price?${q({ chain: "eth" })}`],
  ["GAS_PRICE", "eth", "chainsight", "GET", `${CS}/gas?${q({ chain: "ethereum" })}`],
  ["GAS_PRICE", "eth", "livecert", "GET", `${LC}/gas-price?${q({ query: "What is the gas price on Ethereum right now?" })}`],
  // Season II mission intents we do not serve yet
  ["SANCTIONS_SCREENING_MATCH", "listed person", "txlens", "GET", `${TX}/sanctions-screening?${q({ name: "Vladimir Putin" })}`],
  ["SANCTIONS_SCREENING_MATCH", "listed person", "chainsight", "POST", `${CS}/sanctions`, { query: "Is Vladimir Putin on a sanctions list?" }],
  ["CORPORATE_REGISTRY_LOOKUP", "Apple", "txlens", "GET", `${TX}/corporate-registry?${q({ name: "Apple Inc." })}`],
  ["CORPORATE_REGISTRY_LOOKUP", "Apple", "chainsight", "POST", `${CS}/corp`, { query: "Apple Inc." }],
  ["REGULATORY_FILING_MONITOR", "Pfizer", "txlens", "GET", `${TX}/regulatory-filing-monitor?${q({ company: "Pfizer" })}`],
  ["MACRO_ECONOMIC_INDICATOR", "Japan inflation", "txlens", "GET", `${TX}/macro-economic-indicator?${q({ country: "Japan", economic_indicator: "inflation" })}`],
  ["MACRO_ECONOMIC_INDICATOR", "Japan inflation", "chainsight", "POST", `${CS}/macro`, { query: "What is Japan's inflation rate?" }],
  ["URL_SAFE", "known-good", "txlens", "GET", `${TX}/url-safe?${q({ url: "https://github.com" })}`],
  // misrouted question: weather asked of the transaction endpoint
  ["MISROUTE", "weather to tx endpoint", "txlens", "GET", `${TX}/check-tx?${q({ query: "Will it rain in London tomorrow?" })}`],
  ["MISROUTE", "weather to tx endpoint", "chainsight", "GET", `${CS}/tx?${q({ query: "Will it rain in London tomorrow?" })}`],
  ["MISROUTE", "weather to tx endpoint", "livecert", "GET", `${LC}/tx-lookup?${q({ query: "Will it rain in London tomorrow?" })}`],
];
const out = [];
for (const [intent, label, miner, method, url, body] of cases) {
  const t0 = Date.now();
  let status = 0, text = "";
  try {
    const r = await fetch(url, {
      method, headers: { "user-agent": "Mozilla/5.0", ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(90_000),
    });
    status = r.status; text = await r.text();
  } catch (e) { text = `ERROR ${e.name}: ${e.message}`; }
  const ms = Date.now() - t0;
  let json = null; try { json = JSON.parse(text); } catch {}
  out.push({ intent, label, miner, method, url, body, status, ms, json, text: json ? undefined : text.slice(0, 3000) });
  console.log(`${status} ${String(ms).padStart(6)}ms ${miner.padEnd(10)} ${intent} / ${label}`);
  await new Promise(r => setTimeout(r, 400));
}
await writeFile(process.argv[2], JSON.stringify({ at: new Date().toISOString(), out }, null, 1));
