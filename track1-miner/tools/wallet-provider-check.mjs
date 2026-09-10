#!/usr/bin/env node
/** Read-only live checks for issuer-listed token decimals and BNB RPC network identity. */
import { writeFile } from "node:fs/promises";
const targets = [
  ["ethereum", "https://ethereum-rpc.publicnode.com", "0x1", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
  ["base", "https://mainnet.base.org", "0x2105", "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"],
  ["arbitrum", "https://arb1.arbitrum.io/rpc", "0xa4b1", "0xaf88d065e77c8cc2239327c5edb3a432268e5831"],
  ["optimism", "https://mainnet.optimism.io", "0xa", "0x0b2c639c533813f4aa9d7837caf62653d097ff85"],
  ["polygon", "https://polygon-bor-rpc.publicnode.com", "0x89", "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359"],
  ["ethereum-usdt", "https://ethereum-rpc.publicnode.com", "0x1", "0xdac17f958d2ee523a2206206994597c13d831ec7"],
  ["bsc", "https://bsc-dataseed.bnbchain.org", "0x38", null],
  ["bsc-spare", "https://bsc-dataseed-public.bnbchain.org", "0x38", null],
];
async function rpc(url, method, params) {
  const response = await fetch(url, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body.result;
}
const results = await Promise.all(targets.map(async ([chain, url, expectedId, contract]) => {
  try {
    const chainId = await rpc(url, "eth_chainId", []);
    const result = await rpc(url, contract ? "eth_call" : "eth_getBalance", contract
      ? [{ to: contract, data: "0x313ce567" }, "latest"]
      : ["0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "latest"]);
    return { chain, url, contract, chainId, result,
      pass: BigInt(chainId) === BigInt(expectedId) && (contract ? BigInt(result) === 6n : /^0x[\da-f]+$/i.test(result)) };
  } catch (error) { return { chain, url, contract, pass: false, error: String(error) }; }
}));
const report = { at: new Date().toISOString(), results };
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.table(results);
if (results.some(r => !r.pass)) process.exitCode = 1;
