// Starts the built miner locally, asks /token-holders six questions against the real upstreams, stops it.
//   node probe-holders.mjs <miner dir>
import { spawn } from "node:child_process";

const dir = process.argv[2];
const PORT = 8787;
const child = spawn(process.execPath, ["dist/server.js"], { cwd: dir, env: { ...process.env, PORT: String(PORT) } });
await new Promise((ok, bad) => {
  child.stdout.on("data", (d) => String(d).includes("listening") && ok());
  child.on("exit", (c) => bad(new Error(`server exited ${c}`)));
  setTimeout(() => bad(new Error("no listen in 20 s")), 20_000);
});

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const QUESTIONS = [
  `How many addresses hold the token ${USDC_BASE} on base?`,
  "How many addresses hold usdc on base?",
  "How many addresses hold usdc on optimism?",
  "How many holders does USDC have?",
  `How many addresses hold ${USDC_BASE}?`,
  "How many addresses hold CRV on ethereum?",
];

const rows = [];
for (const query of QUESTIONS) {
  const t = Date.now();
  const r = await fetch(`http://127.0.0.1:${PORT}/token-holders?query=${encodeURIComponent(query)}`);
  const b = await r.json();
  const reads = (b.receipt?.upstream ?? []).map((x) => `${x.status ?? "-"} ${x.ms}ms ${new URL(x.url).host}${new URL(x.url).pathname}`);
  rows.push({ query, http: r.status, ms: Date.now() - t, verdict: b.verdict, error: b.error ?? null, holders: b.holders ?? null, chain: b.chain ?? null, reason: b.reason, upstream: reads });
}
child.kill();
console.log(JSON.stringify({ checked_at: new Date().toISOString(), rows }, null, 1));
