#!/usr/bin/env node
/**
 * Pull the captured requests (src/capture.ts) and summarise them; optionally replay them against a build.
 *
 *   node tools/capture-pull.mjs <out.jsonl> [--days 3] [--replay <base-url>]
 *
 * Needs KV_REST_API_URL and KV_REST_API_TOKEN (or the UPSTASH_REDIS_REST_* names) in the environment, e.g. from
 * `vercel env pull`. The records hold callers' questions, sanctions names among them: write <out.jsonl> OUTSIDE
 * the repository, and never commit it. Only counts belong in the repo.
 *
 * Summary per route: requests, distinct questions, user-agents, verdicts, error rate, p50/p90 latency.
 * --replay sends every captured request to <base-url> and reports the answers whose verdict or lead sentence
 * changed: a regression check on the questions the network actually asks.
 */
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--days" && args[args.indexOf(a) - 1] !== "--replay");
const days = Number(args[args.indexOf("--days") + 1] ?? 0) || 3;
const replay = args.includes("--replay") ? args[args.indexOf("--replay") + 1] : null;
const url = (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "").replace(/\/$/, "");
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
if (!out || !url || !token) {
  console.error("usage: KV_REST_API_URL=… KV_REST_API_TOKEN=… node tools/capture-pull.mjs <out.jsonl> [--days N] [--replay <base-url>]");
  process.exit(2);
}

const records = [];
for (let d = 0; d < days; d++) {
  const key = `capture:${new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)}`;
  const r = await fetch(`${url}/lrange/${encodeURIComponent(key)}/0/-1`, { headers: { authorization: `Bearer ${token}` } });
  const j = await r.json();
  for (const s of j.result ?? []) {
    try { records.push(JSON.parse(s)); } catch { /* a malformed entry is skipped */ }
  }
}
records.sort((a, b) => a.at.localeCompare(b.at));
writeFileSync(out, records.map((r) => JSON.stringify(r)).join("\n") + "\n");

const pct = (xs, p) => (xs.length ? xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] : null);
const byPath = new Map();
for (const r of records) byPath.set(r.path, [...(byPath.get(r.path) ?? []), r]);
console.log(`${records.length} requests over ${days} day(s), ${byPath.size} routes -> ${out}`);
for (const [path, rs] of [...byPath].sort((a, b) => b[1].length - a[1].length)) {
  const q = new Set(rs.map((r) => JSON.stringify(r.params)));
  const tally = (f) => Object.entries(rs.reduce((m, r) => ({ ...m, [f(r) ?? "-"]: (m[f(r) ?? "-"] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(" ");
  const ms = rs.map((r) => r.ms);
  console.log(`${path.padEnd(22)} ${String(rs.length).padStart(5)} req ${String(q.size).padStart(5)} distinct  errors ${rs.filter((r) => r.error).length}  p50 ${pct(ms, 0.5)} ms p90 ${pct(ms, 0.9)} ms`);
  console.log(`${"".padEnd(22)} verdicts ${tally((r) => r.verdict)} | ua ${tally((r) => (r.ua ?? "").split("/")[0] || null)}`);
}

if (replay) {
  const base = replay.replace(/\/$/, "");
  const seen = new Set();
  let changed = 0, same = 0;
  for (const r of records) {
    const qs = new URLSearchParams(r.params).toString();
    if (seen.has(r.path + qs)) continue;
    seen.add(r.path + qs);
    const now = await fetch(`${base}${r.path}?${qs}`, { signal: AbortSignal.timeout(30_000) }).then((x) => x.json()).catch(() => ({ error: "fetch_failed" }));
    const lead = (now.answer ?? now.reason ?? "").slice(0, 300) || null;
    if ((now.verdict ?? null) !== r.verdict || lead !== r.answer) {
      changed++;
      console.log(`\nCHANGED ${r.path}?${qs.slice(0, 120)}\n  was: ${r.verdict} | ${(r.answer ?? "").slice(0, 140)}\n  now: ${now.verdict ?? now.error} | ${(lead ?? "").slice(0, 140)}`);
    } else same++;
  }
  console.log(`\nreplay against ${base}: ${same} same, ${changed} changed`);
}
