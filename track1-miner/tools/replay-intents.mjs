#!/usr/bin/env node
/**
 * Replays the questions the network actually routes, for every intent we serve.
 *
 * `replay-corpus.mjs` covers three intents and selects their questions with a
 * regex over the text, which cannot tell WEATHER_CHECK from WEATHER_FORECAST and
 * silently drops the other ten. The feed labels every row with the intent the
 * Daemon classified it as (`routing.intent`), so the corpus can be built from the
 * network's own labels instead of a guess, across all thirteen.
 *
 * What it looks for is refusals, not wording. A refusal scores ~1e-11 where an
 * answer can cross to 1.0, so one recovered question outweighs any amount of
 * phrasing work — the four defects fixed on 2026-09-04 were all found this way.
 *
 *   node tools/replay-intents.mjs [baseUrl] [--refresh] [--pages N] [--intent NAME]
 *
 * Without --refresh it replays the saved corpus, so a fix can be re-measured
 * against exactly the questions that failed.
 */
import { readFile, writeFile } from "node:fs/promises";
import { readManifest } from "./manifest.mjs";

const BASE = process.argv.find((a) => a.startsWith("http")) ?? "https://miner-wine.vercel.app";
const CORPUS = new URL("./routed-questions.json", import.meta.url);
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
};
const ONLY = arg("--intent", null);
const PAGES = Number(arg("--pages", 30));

const FEED = (offset) =>
  `https://explorer.telegraphprotocol.com/api/daemon/api/questions?sort=recent&order=desc&since_hours=720&limit=100&offset=${offset}`;

/** Expansion immediately enters replay coverage, without another hand-kept list. */
const ENDPOINT = Object.fromEntries(readManifest().endpoints.flatMap(e => e.intents.map(i => [i, e.path])));

async function refresh() {
  const byIntent = {};
  const seen = new Set();
  let rows = 0;
  for (let p = 0; p < PAGES; p++) {
    let body;
    try {
      const res = await fetch(FEED(p * 100), {
        headers: { "user-agent": "Mozilla/5.0", referer: "https://explorer.telegraphprotocol.com/signals" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        console.error(`feed page ${p}: HTTP ${res.status}`);
        break;
      }
      body = await res.json();
    } catch (e) {
      console.error(`feed page ${p}: ${e.message}`);
      break;
    }
    const results = body.results ?? [];
    if (results.length === 0) break;
    rows += results.length;
    for (const r of results) {
      const intent = r?.routing?.intent;
      const text = (r?.question?.text ?? "").trim();
      // "[direct] 20260821 -> /forecast" is a call record, not a question.
      if (!intent || !ENDPOINT[intent] || !text || text.startsWith("[direct]")) continue;
      const key = `${intent}\u0000${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (byIntent[intent] ??= []).push(text);
    }
  }
  if (!rows || !Object.keys(byIntent).length) throw new Error("Feed returned no usable questions; saved corpus preserved");
  const prior = JSON.parse(await readFile(CORPUS, "utf8"));
  for (const [intent, questions] of Object.entries(byIntent)) {
    prior[intent] = [...new Set([...(prior[intent] ?? []), ...questions])];
  }
  await writeFile(CORPUS, JSON.stringify(prior, null, 1) + "\n");
  const n = Object.values(byIntent).reduce((a, b) => a + b.length, 0);
  console.log(`refreshed from ${rows} rows: ${n} distinct questions across ${Object.keys(byIntent).length} intents`);
}

/**
 * A refusal, in this miner's vocabulary. Endpoints answer with `verdict` plus a
 * prose `reason`; they decline with verdict "unknown" or "not_covered", and the
 * node turns a 4xx into a failed call. Payload metadata was stripped deliberately
 * (G56), so nothing here may require a field beyond verdict and reason.
 */
function classify(status, json) {
  if (status >= 400) return `HTTP ${status}${json?.error ? ` ${json.error}` : ""}`;
  if (!json || typeof json !== "object") return "no JSON body";
  const v = String(json.verdict ?? "");
  if (!v) return "no verdict";
  if (v === "unknown" || v === "not_covered") return `refused (${v})`;
  if (!json.reason || String(json.reason).trim().length < 20) return `verdict ${v} with no answer text`;
  return null;
}

if (process.argv.includes("--refresh")) await refresh();
if (process.argv.includes("--refresh-only")) process.exit(0);

const corpus = JSON.parse(await readFile(CORPUS, "utf8"));
const intents = Object.keys(ENDPOINT).filter((i) => (ONLY ? i === ONLY : true));
let total = 0;
let refused = 0;

for (const intent of intents) {
  const qs = corpus[intent] ?? [];
  if (qs.length === 0) {
    console.log(`${intent.padEnd(22)} — no routed questions in the corpus`);
    continue;
  }
  const bad = [];
  for (const q of qs) {
    total++;
    const url = `${BASE}${ENDPOINT[intent]}?query=${encodeURIComponent(q)}`;
    let status = 0;
    let json = null;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      status = res.status;
      json = await res.json().catch(() => null);
    } catch (e) {
      bad.push([q, `request failed: ${e.message}`]);
      refused++;
      continue;
    }
    const why = classify(status, json);
    if (why) {
      bad.push([q, why]);
      refused++;
    }
  }
  console.log(`${intent.padEnd(22)} ${String(qs.length - bad.length).padStart(3)}/${String(qs.length).padEnd(3)} answered`);
  for (const [q, why] of bad) console.log(`   ${why}\n     ${q.replace(/\s+/g, " ").slice(0, 110)}`);
}

console.log(`\n${total - refused}/${total} routed questions answered`);
process.exitCode = refused === 0 ? 0 : 1;
