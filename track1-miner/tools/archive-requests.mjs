#!/usr/bin/env node
/**
 * Appends production request log lines to a durable JSON Lines file.
 *
 * Vercel keeps about an hour of request logs on this plan (oldest line 17:33 UTC when read at 18:30 UTC on
 * 2026-11-16) and the CLI returns at most 50 lines per call, so a score of 0 could not be read against what the node
 * sent (GAPS G310). Run every 30 minutes: it reads the last `MINUTES` in 5-minute windows and keeps each line once.
 * A row is one invocation: its route, status, time, and `lines`, every log line it wrote (the REQ with parameter
 * names, values only for route and short-list params per handler.ts `logParam`, then the RES verdict), never a
 * person's text.
 *
 * usage: node tools/archive-requests.mjs [out.jsonl]   env: MINUTES (default 40), VERCEL_SCOPE, VERCEL_PROJECT
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const out = process.argv[2] ?? "requests.jsonl";
const minutes = Number(process.env.MINUTES ?? 40);
const scope = process.env.VERCEL_SCOPE ?? "wukong4";
const project = process.env.VERCEL_PROJECT ?? "miner";
const vercel = process.platform === "win32" ? "vercel.cmd" : "vercel";

// The CLI gives one row per invocation: `message` is one of its log lines and `logs` holds all of them, so the REQ
// and its RES sit in one row (GAPS G362). A row archived before `lines` existed is written again once with them.
const seen = new Set(existsSync(out) ? readFileSync(out, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
  .filter((r) => Array.isArray(r.lines)).map((r) => r.id) : []);
const now = Date.now();
const CAP = 50; // the CLI returned at most 50 lines per call whatever --limit said (2026-11-16)
let added = 0;
let truncated = 0;
/** Lines in [a, b). A window that comes back full is split in half until it is under the cap or 30 s wide. */
function fetchWindow(a, b) {
  const since = new Date(a).toISOString();
  const until = new Date(b).toISOString();
  let raw = "";
  try {
    raw = execFileSync(vercel, ["logs", "--project", project, "--scope", scope, "--environment", "production",
      "--since", since, "--until", until, "--limit", "100", "--json"], { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "ignore"], shell: process.platform === "win32" });
  } catch (e) {
    console.error(`${since}: ${e.message.split("\n")[0]}`);
    return [];
  }
  const lines = raw.split("\n").filter((l) => l.startsWith("{"));
  if (lines.length < CAP) return lines;
  if (b - a <= 30_000) { truncated++; return lines; }
  const mid = a + Math.floor((b - a) / 2);
  return [...fetchWindow(a, mid), ...fetchWindow(mid, b)];
}
/** Every log line of the invocation, REQ first; `message` alone when the CLI sends no `logs` array. */
function entryLines(l) {
  const lines = Array.isArray(l.logs) ? l.logs.map((x) => x?.message).filter((m) => typeof m === "string") : [];
  if (!lines.length && typeof l.message === "string") lines.push(l.message);
  return lines.sort((a, b) => Number(!a.startsWith("REQ ")) - Number(!b.startsWith("REQ ")));
}
for (let t = now - minutes * 60_000; t < now; t += 5 * 60_000) {
  for (const line of fetchWindow(t, Math.min(t + 5 * 60_000, now))) {
    const l = JSON.parse(line);
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    appendFileSync(out, JSON.stringify({ id: l.id, at: new Date(l.timestamp).toISOString(), deployment: l.deploymentId,
      method: l.requestMethod, status: l.responseStatusCode, message: l.message, lines: entryLines(l) }) + "\n");
    added++;
  }
}
console.log(`${new Date(now).toISOString()} archived ${added} new request lines to ${out}` +
  (truncated ? `; ${truncated} 30-second window(s) still hit the ${CAP}-line cap, so lines may be missing` : ""));
