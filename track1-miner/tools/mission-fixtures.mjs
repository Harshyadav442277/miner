#!/usr/bin/env node
/**
 * Mission fixtures: the Season II example builds (tools/mission-matrix.mjs), run against a miner and graded step
 * by step with the steps in tools/mission-steps.mjs.
 *
 * - FULL builds buy only families LiveCert serves. Each is a build-specific chain; it passes only if every step does.
 * - PARTIAL builds buy some families LiveCert serves. LiveCert's part passes when every step proving each of
 *   those families passes (one representative step per family, FAMILY_STEPS; not build-specific inputs).
 * - A step whose reference cannot be read is `unchecked`; an honest licence refusal is `refused`. Neither is a pass.
 *
 *   node tools/mission-fixtures.mjs [base-url] [out.json] [matrix.json]
 */
import { readFile, writeFile } from "node:fs/promises";
import { FAMILY_STEPS, STEPS } from "./mission-steps.mjs";

const BASE = process.argv[2] ?? "https://miner-wine.vercel.app";
const OUT = process.argv[3];
const MATRIX = process.argv[4] ?? new URL("../docs/evidence/missions-2026-10-31/matrix.json", import.meta.url);

const FULL = [
  { mission: "institutional-markets", build: "Pre-trade diligence between strangers", steps: ["registry_unilever", "sanctions_rosneft", "sanctions_clean", "financial_msft"] },
  { mission: "legal", build: "The overnight diligence pack", steps: ["registry_unilever", "sanctions_rosneft", "websearch_ceo", "factcheck_boe", "sentiment_earnings"] },
  { mission: "conflict-intelligence", build: "Verified off-chain facts for on-chain execution", steps: ["factcheck_eiffel", "event_election", "crosschain_live"] },
  { mission: "consumer-platform", build: "The model that pays for what it does not know", steps: ["qa_capital", "websearch_ceo", "factcheck_boe"] },
  { mission: "personal-agent", build: "Give every OpenClaw instance a wallet and a market", steps: ["websearch_ceo", "qa_moons", "weather_berlin", "crypto_eth"] },
  { mission: "asset-management", build: "Open research with the inputs attached", steps: ["websearch_ceo", "factcheck_eiffel", "sec_apple", "macro_cpi"] },
  { mission: "asset-management", build: "A defensible mark on the venture book", steps: ["websearch_founders", "registry_unilever", "factcheck_stripe_year"] },
  { mission: "asset-management", build: "Forecast accountability, scored by machines", steps: ["event_btc100k", "factcheck_eiffel", "websearch_ceo"] },
  { mission: "web3-defi", build: "The self-settling conditional escrow", steps: ["event_btc100k", "transfer_first_eth"] },
];

const matrix = JSON.parse(await readFile(MATRIX, "utf8"));
const partial = matrix.missions.flatMap((m) => m.examples.filter((e) => e.cover === "partial")
  .map((e) => ({ mission: m.slug, build: e.title, families: e.ours, missing: e.missing, steps: [...new Set(e.ours.flatMap((f) => FAMILY_STEPS[f] ?? [`(no step for ${f})`]))] })));
for (const w of FULL) if (!matrix.missions.some((m) => m.examples.some((e) => e.title === w.build && e.cover === "full"))) {
  throw new Error(`matrix no longer lists "${w.build}" as fully served; regenerate the FULL list`);
}

const ask = async (path, params) => {
  const u = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const t = Date.now();
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
  return { status: r.status, ms: Date.now() - t, body: await r.json() };
};
const stateOf = (fails) => fails.length === 0 ? "pass" : fails.every((f) => f.startsWith("refused")) ? "refused"
  : fails.every((f) => f.startsWith("unchecked")) ? "unchecked" : "fail";

const results = {};
for (const id of [...new Set([...FULL, ...partial].flatMap((w) => w.steps))]) {
  const s = STEPS[id];
  if (!s) { results[id] = { state: "fail", fails: ["no such step"] }; continue; }
  try {
    const params = typeof s.params === "function" ? await s.params() : s.params;
    const r = await ask(s.path, params);
    const fails = r.status === 200 ? await s.grade(r.body) : [`HTTP ${r.status}`];
    results[id] = { intent: s.intent, path: s.path, params, state: stateOf(fails), fails, ms: r.ms, verdict: r.body.verdict, answer: String(r.body.answer ?? "").slice(0, 300) };
  } catch (e) {
    results[id] = { intent: s.intent, path: s.path, state: "unchecked", fails: [`unchecked: reference or request failed: ${e.message}`] };
  }
  console.log(`${results[id].state.padEnd(9)} ${id.padEnd(22)} ${results[id].fails.join("; ")}`);
}

const rank = ["fail", "unchecked", "refused", "pass"];
const grade = (w) => ({ ...w, state: w.steps.map((s) => results[s].state).sort((a, b) => rank.indexOf(a) - rank.indexOf(b))[0] });
const full = FULL.map(grade);
const part = partial.map(grade);

console.log("\nFULL builds (every family served by LiveCert):");
for (const w of full) console.log(`  ${w.state.padEnd(9)} ${w.mission} | ${w.build}`);
console.log("\nPARTIAL builds (LiveCert's part only):");
for (const w of part) console.log(`  ${w.state.padEnd(9)} ${w.mission} | ${w.build} | ours: ${w.families.join(", ")}`);

const missions = matrix.missions.map((m) => {
  const f = full.filter((w) => w.mission === m.slug);
  const p = part.filter((w) => w.mission === m.slug);
  return { mission: m.slug, full_pass: f.filter((w) => w.state === "pass").length, full: f.length,
    partial_pass: p.filter((w) => w.state === "pass").length, partial: p.length };
});
console.log("\nby mission: full builds passing / full builds; partial builds whose LiveCert part passes / partial builds");
for (const m of missions) console.log(`  ${m.mission.padEnd(26)} full ${m.full_pass}/${m.full}   partial ${m.partial_pass}/${m.partial}`);
const n = (xs, s) => xs.filter((w) => w.state === s).length;
const served = missions.filter((m) => m.full_pass + m.partial_pass > 0).length;
console.log(`\nfull: ${n(full, "pass")} pass, ${n(full, "fail")} fail, ${n(full, "unchecked")} unchecked of ${full.length}`);
console.log(`partial: ${n(part, "pass")} pass, ${n(part, "fail")} fail, ${n(part, "unchecked")} unchecked, ${n(part, "refused")} refused of ${part.length}`);
console.log(`missions with at least one passing build (full or LiveCert's part of a partial): ${served}/${missions.length}`);
if (OUT) await writeFile(OUT, JSON.stringify({ at: new Date().toISOString(), base: BASE, missions, full, partial: part, steps: results }, null, 1));
process.exitCode = n(full, "fail") + n(part, "fail") ? 1 : 0;
