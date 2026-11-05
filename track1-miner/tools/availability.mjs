#!/usr/bin/env node
/**
 * Availability sweep: every endpoint in miner.yaml, once, with the first example question from its own
 * description. Writes one JSON line per run. Run by the `uptime` workflow every 30 minutes, so the record is
 * GitHub's run history plus the uploaded artifacts, which a third party can check.
 *
 *   node track1-miner/tools/availability.mjs [base-url] [out.jsonl]
 *
 * An endpoint is "up" when it answers HTTP 200 with a non-empty `answer`, which is the bar Telegraph's spot
 * checks use ("any non-empty answer passes"). Correctness is the audit's job, not this one.
 *
 * These are direct calls from our own runner. They are availability evidence only: never count them as use,
 * demand or consumption (folder override 2).
 *
 * Exit code: 0 when every endpoint is up, 1 when any is down (the workflow's alarm opens an issue).
 */
import { readFileSync, appendFileSync } from "node:fs";
import { MANIFEST_PATH, readManifest } from "./manifest.mjs";

const manifest = readManifest();
const base = (process.argv[2] ?? manifest.baseUrl).replace(/\/+$/, "");
const out = process.argv[3] ?? null;

// The first quoted example in each endpoint's description, read in file order.
function exampleQuestions(yaml) {
  const map = new Map();
  let path = null;
  let text = "";
  const flush = () => {
    if (!path) return;
    const m = /Example questions?:\s*"([^"]+)"/.exec(text.replace(/\s+/g, " "));
    map.set(path, m ? m[1] : null);
  };
  for (const line of yaml.split(/\r?\n/)) {
    const p = line.match(/^ {2}- path: (\/\S*)$/);
    if (p) { flush(); path = p[1]; text = ""; continue; }
    text += ` ${line}`;
  }
  flush();
  return map;
}

const questions = exampleQuestions(readFileSync(MANIFEST_PATH, "utf8"));

async function probe(path) {
  const q = questions.get(path);
  const url = `${base}${path}${q ? `?query=${encodeURIComponent(q)}` : ""}`;
  const started = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "user-agent": "livecert-availability" } });
    const body = await res.text();
    const ms = Math.round(performance.now() - started);
    let answer = "";
    let refused = false;
    try {
      const j = JSON.parse(body);
      answer = String(j.answer ?? "");
      refused = j.error === "not_licensed";
    } catch { /* not JSON */ }
    // A licence refusal passes the spot-check bar, so it is "up"; `refused` keeps it from reading as service.
    return { path, status: res.status, ms, up: res.status === 200 && answer.trim().length > 0, ...(refused ? { refused } : {}) };
  } catch (e) {
    return { path, status: 0, ms: Math.round(performance.now() - started), up: false, error: e.name };
  }
}

const results = [];
// Sequential: the sweep measures availability, not load, and must not trip upstream rate limits.
for (const path of manifest.paths) results.push(await probe(path));

const down = results.filter((r) => !r.up);
const line = {
  at: new Date().toISOString(),
  base,
  up: results.length - down.length,
  total: results.length,
  results,
};
const json = JSON.stringify(line);
console.log(json);
if (out) appendFileSync(out, `${json}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map((r) => `| ${r.path} | ${r.status} | ${r.ms} | ${r.up ? "up" : "**down**"} |`).join("\n");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### ${line.up}/${line.total} endpoints up at ${line.at}\n\n| Endpoint | HTTP | ms | State |\n|---|---:|---:|---|\n${rows}\n`);
}
if (down.length) {
  console.error(`down: ${down.map((r) => `${r.path} (${r.status || r.error})`).join(", ")}`);
  process.exit(1);
}
