#!/usr/bin/env node
/**
 * Availability, latency and serving-cost report from the `uptime` workflow's sweeps (tools/availability.mjs).
 *
 *   node track1-miner/tools/availability-report.mjs <cache-dir> [out.md]
 *
 * Downloads every `availability-<run>` artifact not already in <cache-dir> (needs an authenticated `gh`), then
 * reports: sweeps, the share of sweeps with every endpoint up, and per endpoint its availability and p50/p90
 * latency, beside the upstreams its code can reach (src/sources.ts ENDPOINT_SOURCES) and what each costs.
 *
 * Latency is measured from a GitHub-hosted runner, one call per endpoint per sweep, so it includes the runner's
 * round trip to Vercel. The answer cache is not bypassed: a sweep repeats each question every 30 minutes, longer
 * than the 1-minute answer cache and the 10-minute model-reply cache.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [cache, out] = process.argv.slice(2);
if (!cache) { console.error("usage: availability-report.mjs <cache-dir> [out.md]"); process.exit(2); }
mkdirSync(cache, { recursive: true });

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const runs = JSON.parse(gh("run", "list", "--workflow", "uptime", "--limit", "1000", "--json", "databaseId,createdAt"));
for (const r of runs) {
  const dir = join(cache, String(r.databaseId));
  if (existsSync(dir)) continue;
  try { gh("run", "download", String(r.databaseId), "-n", `availability-${r.databaseId}`, "-D", dir); }
  catch { mkdirSync(dir, { recursive: true }); } // a run with no sweep (cancelled, or before the sweep existed)
}

const sweeps = [];
for (const d of readdirSync(cache)) {
  const f = join(cache, d, "availability.jsonl");
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) if (line.trim()) sweeps.push(JSON.parse(line));
}
sweeps.sort((a, b) => a.at.localeCompare(b.at));
if (!sweeps.length) { console.error("no sweeps found"); process.exit(1); }

// Upstreams per endpoint, read from the miner's own source registry.
const src = readFileSync(new URL("../miner/src/sources.ts", import.meta.url), "utf8");
const block = /ENDPOINT_SOURCES[^{]*\{([\s\S]*?)\n\};/.exec(src)?.[1] ?? "";
const upstreams = Object.fromEntries([...block.matchAll(/"(\/[^"]+)":\s*\[([^\]]*)\]/g)]
  .map(([, path, ids]) => [path, [...ids.matchAll(/"([^"]+)"/g)].map((m) => m[1])]));
// Every upstream is keyless or on a free key; these are the ones whose limits bind first.
const LIMITS = {
  groq: "Groq free-tier key: per-minute and per-day quotas",
  nominatim: "Nominatim policy: 1 request a second (places table answers most weather places first)",
  openalex: "OpenAlex free key: metered daily",
  nvd: "NVD free key: rate-limited",
  tavily: "Tavily paid key: not set in production, unused",
};

const pct = (xs, p) => xs[Math.min(xs.length - 1, Math.floor(xs.length * p))];
const paths = [...new Set(sweeps.flatMap((s) => s.results.map((r) => r.path)))];
const rows = paths.map((path) => {
  const rs = sweeps.flatMap((s) => s.results.filter((r) => r.path === path));
  const ms = rs.filter((r) => r.up).map((r) => r.ms).sort((a, b) => a - b);
  const ids = upstreams[path] ?? [];
  return {
    path, n: rs.length, up: rs.filter((r) => r.up).length, refused: rs.filter((r) => r.refused).length,
    p50: ms.length ? pct(ms, 0.5) : null, p90: ms.length ? pct(ms, 0.9) : null,
    upstreams: ids.length ? ids.join(", ") : "none (computed in the function)",
    limits: ids.filter((id) => LIMITS[id]).map((id) => LIMITS[id]).join("; ") || "—",
  };
});

const allUp = sweeps.filter((s) => s.up === s.total).length;
const calls = rows.reduce((a, r) => a + r.n, 0);
const ups = rows.reduce((a, r) => a + r.up, 0);
const md = [
  `# LiveCert availability, latency and serving cost`,
  ``,
  `Generated ${new Date().toISOString()} from ${sweeps.length} sweeps, ${sweeps[0].at} to ${sweeps.at(-1).at}, of ` +
    `${sweeps[0].base} (tools/availability.mjs, run by the \`uptime\` workflow every 30 minutes).`,
  ``,
  `- **Sweeps with every endpoint up:** ${allUp}/${sweeps.length} (${(100 * allUp / sweeps.length).toFixed(2)}%)`,
  `- **Endpoint calls answered:** ${ups}/${calls} (${(100 * ups / calls).toFixed(2)}%). Up = HTTP 200 with a non-empty \`answer\`.`,
  `- **Upstream cost per request: $0.** Every upstream is keyless or on a free key; the binding limits are listed per endpoint.`,
  ``,
  `| Endpoint | Up | Availability | Licence refusals | p50 ms | p90 ms | Upstreams | Binding limit |`,
  `|---|---:|---:|---:|---:|---:|---|---|`,
  ...rows.map((r) => `| ${r.path} | ${r.up}/${r.n} | ${(100 * r.up / r.n).toFixed(1)}% | ${r.refused} | ${r.p50 ?? "—"} | ${r.p90 ?? "—"} | ${r.upstreams} | ${r.limits} |`),
  ``,
  `A licence refusal (\`not_licensed\`) passes the spot-check bar and counts as up; the refusals column shows it is not service.`,
  `Sweeps before 2026-11-05 did not record refusals, so their refusals read 0.`,
  `Latency is one call per endpoint per sweep from a GitHub-hosted runner, so it includes that runner's round trip to Vercel.`,
  `These are our own direct calls: availability evidence only, never use or demand.`,
].join("\n");
if (out) writeFileSync(out, `${md}\n`);
console.log(md);
