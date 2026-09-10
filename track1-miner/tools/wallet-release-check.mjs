#!/usr/bin/env node
/** Public production probes for the wallet fixes; read-only, no signing or routed traffic. */
import { writeFile } from "node:fs/promises";
const base = process.argv[2] ?? "https://miner-wine.vercel.app";
const wallet = "0x8b224783FE5b3c52B7DB0cb9B1754f8812b75287";
const cases = [
  ["base-usdc", { query: `What is the USDC balance of ${wallet} on base?` },
    r => /\d+(?:\.\d+)? USDC/.test(r.reason) && /balanceOf.*0x833589fcd6edb6e08f4c7c32d4f71b54bda02913/i.test(r.reason)],
  ["ethereum-usdt-and-native", { query: `ETH and USDT balance of ${wallet} on Ethereum` },
    r => /\d+(?:\.\d+)? ETH/.test(r.reason) && /\d+(?:\.\d+)? USDT/.test(r.reason) && /balanceOf.*0xdac17f958d2ee523a2206206994597c13d831ec7/i.test(r.reason)],
  ["bnb-native", { query: "What is the native balance of the wallet 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 on bsc (chain id 56)?" },
    r => /\d+(?:\.\d+)? BNB on bsc/.test(r.reason) && !/ethereum/i.test(r.reason)],
  ["explicit-chain", { address: wallet, query: "balance on Base", chain: "ethereum" },
    r => /ETH on ethereum/.test(r.reason)],
  ["chain-id", { address: wallet, query: "native balance", chain: "8453" },
    r => /ETH on base/.test(r.reason)],
  ["invalid-wallet", { query: "wallet balance of 0x1234567890abcdef1234567890abcdef123456789" },
    r => r.verdict === "unknown" && /not a valid 20-byte/.test(r.reason)],
  ["bridged-token", { query: `USDC.e balance of ${wallet} on Arbitrum` },
    r => r.verdict === "unknown" && /USDC\.e balance is unavailable/.test(r.reason)],
];
const results = [];
for (const [name, params, accepts] of cases) {
  const url = `${base}/wallet-balance?${new URLSearchParams(params)}`;
  const start = Date.now();
  try {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    const body = await response.json();
    results.push({ name, url, status: response.status, ms: Date.now() - start, pass: response.ok && accepts(body), body });
  } catch (error) { results.push({ name, url, ms: Date.now() - start, pass: false, error: String(error) }); }
}
const report = { at: new Date().toISOString(), base, results };
if (process.argv[3]) await writeFile(process.argv[3], JSON.stringify(report, null, 2) + "\n");
console.table(results.map(({ name, status, ms, pass, body }) => ({ name, status, ms, pass, verdict: body?.verdict })));
if (results.some(r => !r.pass)) process.exitCode = 1;
