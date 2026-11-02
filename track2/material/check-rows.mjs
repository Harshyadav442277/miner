#!/usr/bin/env node
/**
 * Checks a JSON Lines file against the evaluation pool's published row rules before anyone signs it
 * (anjoman.ai/docs/scoring/contribute-evaluation-data, read 2026-11-01).
 *
 *   node track2/material/check-rows.mjs <file.jsonl> <INTENT_ID>
 *
 * Exits 1 on any row the node would refuse or reject. The node's near-duplicate measure is not
 * published; this uses a normalised edit-distance ratio and fails at 0.80, below the node's 0.85.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const [file, intent] = process.argv.slice(2);
if (!file || !intent) { console.error("usage: check-rows.mjs <file.jsonl> <INTENT_ID>"); process.exit(2); }
const raw = fs.readFileSync(file);
const norm = (t) => String(t).normalize("NFC").replace(/\s+/g, " ").trim();
const KINDS = new Set(["preference_pair", "ground_truth", "graded_exemplar"]);
const bad = [];
const rows = raw.toString("utf8").split("\n").filter(Boolean).map((l, i) => {
  if (Buffer.byteLength(l) > 64 * 1024) bad.push(`row ${i + 1}: over 64 KiB`);
  if (l.includes("\u0000")) bad.push(`row ${i + 1}: NUL`);
  try { return JSON.parse(l); } catch (e) { bad.push(`row ${i + 1}: invalid JSON`); return {}; }
});

function ratio(a, b) {
  // 1 - Levenshtein / max length, on normalised text.
  if (a === b) return 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

const prompts = [], rejecteds = new Set();
rows.forEach((r, i) => {
  const n = i + 1, kind = r.label_kind ?? "preference_pair";
  const [p, c, x] = [norm(r.prompt ?? ""), norm(r.chosen ?? ""), norm(r.rejected ?? "")];
  if (!KINDS.has(kind)) bad.push(`row ${n}: unknown label_kind ${kind}`);
  if (r.intent_id && r.intent_id !== intent) bad.push(`row ${n}: intent_id ${r.intent_id}`);
  if ([...p].length < 16 || [...p].length > 16000) bad.push(`row ${n}: prompt length ${[...p].length}`);
  if (!c) bad.push(`row ${n}: empty chosen`);
  for (const [f, v] of [["chosen", c], ["rejected", x]]) if (v && ([...v].length < 8 || [...v].length > 32000)) bad.push(`row ${n}: ${f} length ${[...v].length}`);
  if (kind === "preference_pair" && !x) bad.push(`row ${n}: empty rejected`);
  if (x && x === c) bad.push(`row ${n}: identical answers`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(`${r.prompt}${r.chosen}${r.rejected}`)) bad.push(`row ${n}: control characters`);
  if (rejecteds.has(x)) bad.push(`row ${n}: rejected answer repeated`);
  rejecteds.add(x);
  if (!/^https?:\/\//.test(r.provenance?.source_url ?? "")) bad.push(`row ${n}: no http(s) source_url (would be unverified)`);
  if (/^(llm|synthetic|generated|model)$/i.test(r.provenance?.source_kind ?? "")) bad.push(`row ${n}: source_kind marks it unverified`);
  prompts.push(p);
});

let worst = [0, 0, 0];
for (let i = 0; i < prompts.length; i++)
  for (let j = i + 1; j < prompts.length; j++) {
    const v = ratio(prompts[i], prompts[j]);
    if (v > worst[0]) worst = [v, i + 1, j + 1];
    if (v >= 0.8) bad.push(`rows ${i + 1} and ${j + 1}: prompts ${(v * 100).toFixed(0)}% similar`);
  }

const lens = rows.map((r) => norm(r.chosen ?? "").length / Math.max(1, norm(r.rejected ?? "").length));
console.log(`${rows.length} rows, ${intent}`);
console.log(`body sha256 ${crypto.createHash("sha256").update(raw).digest("hex")}`);
console.log(`most similar prompts: rows ${worst[1]} and ${worst[2]}, ${(worst[0] * 100).toFixed(1)}%`);
console.log(`chosen/rejected length ratio: min ${Math.min(...lens).toFixed(2)}, max ${Math.max(...lens).toFixed(2)}`);
for (const b of bad.slice(0, 40)) console.log(`  FAIL ${b}`);
console.log(bad.length ? `${bad.length} problems` : "OK: every row passes the published rules");
process.exit(bad.length ? 1 : 0);
