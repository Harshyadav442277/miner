/** Direct endpoint probes: provider/deployment evidence, never leaderboard claims. */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const base = process.argv[2] ?? "https://miner-wine.vercel.app";
const output = process.argv[3] ?? "track1-miner/docs/evidence/rank1-2026-09-10/live-before.json";
const rpc = await fetch("https://mainnet.base.org", { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", false] }),
  signal: AbortSignal.timeout(10000) }).then(r => r.json());
const hash = rpc.result?.transactions?.[0];
if (!hash) throw new Error("No Base block fixture available");
const tests = [
  ["onchain-base-mainnet", "/tx-lookup", { query: `Look up the ETH transaction ${hash} on Base mainnet` }, b => b.verdict === "confirmed" && /on base/.test(b.reason)],
  ["tvl-base-protocol", "/tvl", { query: "What is Aave's TVL on Base mainnet?", protocol: "Aave", chain: "base" }, b => b.verdict === "found" && /on base/.test(b.reason) && !/across every chain/.test(b.reason)],
  ["cve-xz", "/cve", { cve_id: "CVE-2024-3094" }, b => b.verdict === "critical" && /5\.6\.0/.test(b.reason) && /5\.6\.1/.test(b.reason)],
  ["sports-date", "/game-result", { query: "Arsenal vs Chelsea in the Premier League on 2025-03-17" }, b => b.verdict !== "result" || /17 March 2025/.test(b.reason)],
  ["academic-window", "/papers", { query: "Find papers on quantum computing published between January 15, 2025 and June 10, 2026" }, b => b.verdict === "unknown" || /2025-01-15 and 2026-06-10/.test(b.reason)],
];
const rows = [];
for (const [name, path, params, check] of tests) {
  const at = Date.now();
  try {
    const response = await fetch(`${base}${path}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(14000) });
    const body = await response.json();
    const pass = response.ok && check(body);
    rows.push({ name, path, params, at: new Date(at).toISOString(), ms: Date.now() - at, status: response.status, pass, body });
  } catch (error) { rows.push({ name, path, params, ms: Date.now() - at, pass: false, error: String(error) }); }
  console.log(`${rows.at(-1).pass ? "PASS" : "FAIL"} ${name} ${rows.at(-1).ms}ms ${rows.at(-1).body?.reason?.slice(0, 180) ?? rows.at(-1).error}`);
}
await mkdir(dirname(resolve(output)), { recursive: true });
await writeFile(output, JSON.stringify({ base, at: new Date().toISOString(), rows }, null, 2) + "\n");
if (rows.some(r => !r.pass)) process.exitCode = 1;
