#!/usr/bin/env node
/**
 * Appends production request log lines to a durable JSON Lines file.
 *
 * Vercel keeps about an hour of request logs on this plan (oldest line 17:33 UTC when read at 18:30 UTC on
 * 2026-11-16) and the CLI returns at most 50 lines per call, so a score of 0 could not be read against what the node
 * sent (GAPS G310). Run every 30 minutes: it reads the last `MINUTES` in 5-minute windows and keeps each line once.
 * A line holds the route, status, time and parameter names; values only for route and short-list params
 * (handler.ts `logParam`), never a person's text.
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

const seen = new Set(existsSync(out) ? readFileSync(out, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).id) : []);
const now = Date.now();
let added = 0;
for (let t = now - minutes * 60_000; t < now; t += 5 * 60_000) {
  const since = new Date(t).toISOString();
  const until = new Date(Math.min(t + 5 * 60_000, now)).toISOString();
  let raw = "";
  try {
    raw = execFileSync(vercel, ["logs", "--project", project, "--scope", scope, "--environment", "production",
      "--since", since, "--until", until, "--limit", "100", "--json"], { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "ignore"], shell: process.platform === "win32" });
  } catch (e) {
    console.error(`${since}: ${e.message.split("\n")[0]}`);
    continue;
  }
  for (const line of raw.split("\n").filter((l) => l.startsWith("{"))) {
    const l = JSON.parse(line);
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    appendFileSync(out, JSON.stringify({ id: l.id, at: new Date(l.timestamp).toISOString(), deployment: l.deploymentId,
      method: l.requestMethod, status: l.responseStatusCode, message: l.message }) + "\n");
    added++;
  }
}
console.log(`${new Date(now).toISOString()} archived ${added} new request lines to ${out}`);
