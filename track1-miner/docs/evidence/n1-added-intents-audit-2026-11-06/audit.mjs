// Sourced audit of the intents the pending updateMiner adds (GAPS G277). Keyword extraction and vulnerability
// triage were dropped from the draft (6aebe0f); ONCHAIN_METRIC_VERIFY is Codex's and has its own evidence.
// Each production answer is compared with a primary source read at the same time.
//   node audit.mjs > results.txt
const MINER = process.env.MINER ?? "https://miner-wine.vercel.app";
const UA = { "user-agent": "livecert-audit/1.0 (+https://github.com/Harshyadav442277/miner)" };
const get = async (u, init = {}) => {
  const r = await fetch(u, { ...init, headers: { ...UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(40_000) });
  return r.json();
};
const ask = (path, query) => get(`${MINER}${path}?query=${encodeURIComponent(query)}`);
const out = [];
const row = (intent, q, answer, source, verdict) => out.push({ intent, q, answer, source, verdict });

// DNS_RECORD_LOOKUP against Cloudflare DNS-over-HTTPS.
const doh = async (name, type) => (await get(`https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`, { headers: { accept: "application/dns-json" } })).Answer ?? [];
for (const [name, type, q] of [
  ["example.com", "A", "What are the A records for example.com?"],
  ["gmail.com", "MX", "What MX records does gmail.com have?"],
  ["wikipedia.org", "AAAA", "What are the AAAA records of wikipedia.org?"],
  ["github.com", "NS", "Which name servers does github.com use?"],
  ["google.com", "TXT", "Show the TXT records for google.com"],
]) {
  const a = await ask("/dns", q);
  const truth = (await doh(name, type)).map((r) => String(r.data).replace(/\.$/, "").replace(/^"|"$/g, ""));
  const text = a.answer ?? a.reason ?? "";
  // The answer names up to six and counts the rest; the `records` field carries all of them.
  const said = (a.records ?? []).map((r) => String(r).replace(/\.$/, "").replace(/^"|"$/g, ""));
  const hits = truth.filter((t) => said.some((s) => s.endsWith(t.split(" ").pop())));
  // Geo-DNS (Wikipedia, CDNs) answers by the asker's region; the miner asks from Vercel, this audit from India.
  const geo = type === "A" || type === "AAAA";
  row("DNS_RECORD_LOOKUP", q, text.slice(0, 220), `Cloudflare DoH ${type}: ${truth.join(", ").slice(0, 80)}`,
    hits.length === truth.length && said.length === truth.length ? "pass"
      : geo && said.length === truth.length ? "pass on count; addresses differ by region (geo-DNS)"
      : `fail (${hits.length}/${truth.length} records match)`);
}

// TOKEN_TOTAL_SUPPLY_VERIFY against Ethereum totalSupply() via a public RPC.
const rpc = "https://ethereum-rpc.publicnode.com";
const supply = async (to) => {
  const j = await get(rpc, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data: "0x18160ddd" }, "latest"] }) });
  return BigInt(j.result);
};
for (const [sym, addr, dec, q] of [
  ["USDC", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6, "What is the total supply of USDC on Ethereum?"],
  ["DAI", "0x6B175474E89094C44Da98b954EedeAC495271d0F", 18, "Total supply of token 0x6B175474E89094C44Da98b954EedeAC495271d0F on ethereum"],
  ["USDT", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6, "What is the total supply of USDT on Ethereum?"],
  ["WETH", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 18, "What is WETH's total supply on Ethereum?"],
  ["LINK", "0x514910771AF9Ca656af840dff83E8264EcF986CA", 18, "What is the total supply of LINK on Ethereum?"],
]) {
  const a = await ask("/token-supply", q);
  const truth = Number(await supply(addr)) / 10 ** dec;
  const text = a.answer ?? a.reason ?? "";
  const said = Number((text.match(/is ([\d,]+(?:\.\d+)?)/)?.[1] ?? "").replace(/,/g, ""));
  const rel = Number.isFinite(said) && truth ? Math.abs(said - truth) / truth : 1;
  row("TOKEN_TOTAL_SUPPLY_VERIFY", q, text.slice(0, 200), `eth_call totalSupply latest: ${truth.toFixed(2)} ${sym}`, rel < 0.001 ? "pass" : `fail (off by ${(rel * 100).toFixed(3)}%)`);
}

const now = new Date().toISOString();
console.log(`# Audit of the added intents — ${now}\n\nMiner: ${MINER}\n`);
console.log("| intent | question | answer (start) | source | verdict |\n|---|---|---|---|---|");
for (const r of out) console.log(`| ${r.intent} | ${r.q.replace(/\|/g, "/")} | ${r.answer.replace(/\|/g, "/").replace(/\n/g, " ")} | ${r.source} | ${r.verdict} |`);
const pass = out.filter((r) => r.verdict.startsWith("pass")).length;
console.log(`\n**${pass}/${out.length} pass.**`);
