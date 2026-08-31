/**
 * WALLET_BALANCE_CHECK shape sweep against champion 1066.
 *
 * Epoch 296: preflight 0.004328, livecert 0.000123 — a 35x gap on answers whose
 * WORDING is nearly identical. Side by side on the same question:
 *
 *   preflight  "...has a native-coin balance of 6.64217816 ETH on Ethereum
 *               mainnet. This was determined by querying the eth_getBalance RPC
 *               method against the Ethereum network."          (27 words)
 *   livecert   "...has a native-coin balance of 6.6422 ETH on ethereum. This was
 *               determined by querying the eth_getBalance RPC method against the
 *               ethereum network, which returns the account's balance in wei at
 *               the latest block."                             (37 words)
 *
 * Two candidate causes, both testable here: we ROUND the balance to 4 decimals
 * where they print 8, so if the ground truth carries full precision our number
 * never matches at all; and we lowercase the chain where they write "Ethereum
 * mainnet".
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { loadScorer } = await import(pathToFileURL(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/wasm-abi.mjs").href);

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scorer = await loadScorer(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/champions/wallet_reg1066.wasm");
const bench = JSON.parse(await readFile(`${DIR}bench_WALLET_BALANCE_CHECK.json`, "utf8"));
const rows = Array.isArray(bench) ? bench : (bench.rows ?? Object.values(bench)[0]);
const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");

const CHAIN_LABEL = { ethereum: "Ethereum mainnet", base: "Base", arbitrum: "Arbitrum One", optimism: "OP Mainnet", polygon: "Polygon" };

/** Rebuild the sentence from the live answer's own numbers, varying one thing. */
function build({ addr, wei, symbol, chain, decimals, label, tail }) {
  const eth = Number(wei) / 1e18;
  const amount = decimals === "full"
    ? String(Number(eth.toFixed(18)))
    : eth >= 0.0001 ? eth.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "") : eth.toExponential(2);
  const where = label ? (CHAIN_LABEL[chain] ?? chain) : chain;
  return `The address ${addr} currently has a native-coin balance of ${amount} ${symbol} on ${where}. ` +
    `This was determined by querying the eth_getBalance RPC method against the ${where} network` +
    (tail ? `, which returns the account's balance in wei at the latest block.` : `.`);
}

const VARIANTS = {
  deployed: (c) => build({ ...c, decimals: 4, label: false, tail: true }),
  full8: (c) => build({ ...c, decimals: 8, label: false, tail: true }),
  full8Label: (c) => build({ ...c, decimals: 8, label: true, tail: true }),
  full8LabelNoTail: (c) => build({ ...c, decimals: 8, label: true, tail: false }),
  fullPrecision: (c) => build({ ...c, decimals: "full", label: true, tail: false }),
  fourLabelNoTail: (c) => build({ ...c, decimals: 4, label: true, tail: false }),
};

const tot = {}, wins = {}, cross = {};
for (const k of Object.keys(VARIANTS)) { tot[k] = 0; wins[k] = 0; cross[k] = 0; }
let n = 0;

for (const row of rows) {
  const q = row.q ?? row.question;
  const gt = row.gt ?? row.ground_truth;
  if (!q || !gt) continue;
  const addr = (q.match(/0x[a-fA-F0-9]{40}/) ?? [])[0];
  if (!addr) continue;
  let body;
  try {
    body = await (await fetch(
      `https://miner-wine.vercel.app/wallet-balance?query=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(30000) })).json();
  } catch { continue; }
  if (typeof body?.balance_eth !== "number") continue;
  n++;
  const ctx = { addr: body.address, wei: BigInt(Math.round(body.balance_eth * 1e18)), symbol: body.symbol, chain: body.chain };
  const sc = {};
  for (const [name, render] of Object.entries(VARIANTS)) {
    const c = scorer.score(q, gt, clip32(render(ctx)));
    tot[name] += c; sc[name] = c;
    if (c > 0.5) cross[name]++;
  }
  wins[Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0]]++;
}

console.log(`\nWALLET_BALANCE_CHECK — ${n} rows, champion 1066, clip32\n`);
console.log("  variant             mean          best-on   crossings");
for (const k of Object.keys(VARIANTS)) {
  console.log(`  ${k.padEnd(18)}  ${(tot[k] / n).toFixed(8)}    ${String(wins[k]).padStart(3)}       ${cross[k]}/${n}`);
}
console.log(`\n  epoch 296 live: preflight 0.004328, livecert 0.000123.`);
