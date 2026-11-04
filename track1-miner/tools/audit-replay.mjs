#!/usr/bin/env node
/**
 * Weekly audit replay (WINNING.md S8): ask production the same questions as the 2026-10-21 correctness audit,
 * one at a time, and set each new answer beside the old answer and the old verdict.
 *
 *   node track1-miner/tools/audit-replay.mjs <out-dir> [base-url]
 *
 * Writes <out-dir>/answers-production.json (same shape as the October file) and <out-dir>/compare.md.
 * The replay does not judge correctness. Every question whose October verdict was not a pass, and every
 * answer whose verdict word changed, still has to be checked against its primary source by hand.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [outDir, baseArg] = process.argv.slice(2);
if (!outDir) { console.error("usage: audit-replay.mjs <out-dir> [base-url]"); process.exit(2); }
const OCT = new URL("../docs/evidence/correctness-audit-2026-10-21/", import.meta.url);
const old = JSON.parse(readFileSync(new URL("answers-production.json", OCT), "utf8"));
const base = (baseArg ?? "https://miner-wine.vercel.app").replace(/\/+$/, "");

// October verdicts, by row number, from the audit table.
const verdicts = new Map();
for (const line of readFileSync(new URL("table.md", OCT), "utf8").split(/\r?\n/)) {
  const m = /^\| (\d+) \| [A-Z_]+ \|.*\| \*\*(pass|partial|fail)\*\* \|/.exec(line);
  if (m) verdicts.set(Number(m[1]), m[2]);
}

const short = (s, n = 160) => String(s ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, n);
const rows = [];
for (const [i, q] of old.entries()) {
  const url = `${base}${q.path}?${new URLSearchParams(q.params)}`;
  const t = performance.now();
  let status = 0;
  let body = null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(45_000), headers: { "user-agent": "livecert-audit" } });
    status = res.status;
    const text = await res.text();
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 2000) }; }
  } catch (e) { body = { error: e.name }; }
  rows.push({ intent: q.intent, path: q.path, kind: q.kind, params: q.params, url, status,
    ms: Math.round(performance.now() - t), at: new Date().toISOString(), body });
  process.stderr.write(`${i + 1}/${old.length}\r`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "answers-production.json"), `${JSON.stringify(rows, null, 2)}\n`);

const lines = ["| # | intent | Oct verdict | Oct verdict word | now verdict word | HTTP | now answer |", "|---|---|---|---|---|---|---|"];
for (const [i, r] of rows.entries()) {
  const o = old[i].body ?? {};
  lines.push(`| ${i} | ${r.intent} | ${verdicts.get(i) ?? "?"} | ${o.verdict ?? ""} | ${r.body?.verdict ?? ""} | ${r.status} | ${short(r.body?.answer ?? r.body?.error ?? r.body?.raw)} |`);
}
writeFileSync(join(outDir, "compare.md"), `${lines.join("\n")}\n`);
const ok = rows.filter((r) => r.status === 200 && String(r.body?.answer ?? "").trim()).length;
console.log(`${ok}/${rows.length} answered with HTTP 200 and a non-empty answer; October verdicts read: ${verdicts.size}`);
