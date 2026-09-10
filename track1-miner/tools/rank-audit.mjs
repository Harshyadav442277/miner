#!/usr/bin/env node
/** Read-only ranking evidence, tied to the registered owner and manifest. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readManifest } from "./manifest.mjs";

const node = process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com";
const registrationId = process.env.REGISTRATION_ID ?? "1378";
const out = resolve(process.argv[2] ?? "track1-miner/docs/evidence/rank1-2026-09-10");
async function get(path) {
  const r = await fetch(`${node}${path}`, { signal: AbortSignal.timeout(25_000) });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}
const [registration, catalog] = await Promise.all([get(`/api/miners/${registrationId}`), get("/api/miners")]);
const registered = registration.miner ?? registration;
if (registered.activation_status !== "active") throw new Error(`Registration ${registrationId} is ${registered.activation_status}`);
const miners = Array.isArray(catalog) ? catalog : catalog.miners ?? catalog.data ?? [];
const us = miners.find(m => m.slug === registered.slug &&
  m.wallet_address?.toLowerCase() === registered.miner_address?.toLowerCase() && m.yaml_url === registered.yaml_url);
if (!us) throw new Error("Catalog does not match registered slug, owner and YAML URL");
const intents = [...readManifest().intents];
if (intents.some(i => !registered.supported_intents.includes(i)) || registered.supported_intents.length !== intents.length) {
  throw new Error("Local and registered intent coverage differ");
}
const epoch = Math.max(...us.scores.map(s => s.epoch_id));
const rows = intents.map(intent => {
  const ours = us.scores.find(s => s.intent_id === intent && s.epoch_id === epoch);
  const field = miners.flatMap(m => (m.scores ?? []).filter(s => s.intent_id === intent && s.epoch_id === epoch)
    .map(s => ({ slug: m.slug, ...s }))).sort((a, b) => a.rank - b.rank);
  const lead = field.find(s => s.rank === 1);
  return { intent, epoch, rank: ours?.rank ?? null, score: ours?.score ?? null,
    leader: lead?.slug ?? null, top: lead?.score ?? null, competitors: field.length,
    tiedAtTop: lead ? field.filter(s => s.score === lead.score).length : 0,
    ratio: ours && lead?.score > 0 ? ours.score / lead.score : null,
    regime: !ours ? "not_scored" : lead?.score === 0 ? "all_zero" : lead?.score < 1e-6 ? "near_zero" : "scored" };
});
await mkdir(out, { recursive: true });
const failures = [];
// Small batches avoid turning a diagnostic into load on the public node.
for (let i = 0; i < intents.length; i += 4) {
  const results = await Promise.allSettled(intents.slice(i, i + 4).map(async intent => {
    const [scores, wasm] = await Promise.all([get(`/scores?intent=${intent}&limit=100`), get(`/api/wasm?intent=${intent}`)]);
    scores.scores = scores.scores.filter(s => s.miner_slug === registered.slug || s.rank === 1);
    scores.selection = "LiveCert and rank-1 rows from the returned page; pagination metadata describes the source page";
    await writeFile(`${out}/${intent}.json`, JSON.stringify({ scores, champion: wasm.intents?.[intent]?.champion ?? null }, null, 2) + "\n");
  }));
  results.forEach((r, j) => { if (r.status === "rejected") failures.push({ intent: intents[i + j], error: String(r.reason) }); });
}
const report = { at: new Date().toISOString(), source: node, registrationId, catalogId: us.id,
  owner: registered.miner_address, yamlUrl: registered.yaml_url, yamlHash: registered.yaml_hash,
  epoch, complete: rows.every(r => r.rank !== null), rank1: rows.filter(r => r.rank === 1).length,
  positiveRank1: rows.filter(r => r.rank === 1 && r.score > 0).length, target: 14, rows, failures };
await writeFile(`${out}/rank-audit.json`, JSON.stringify(report, null, 2) + "\n");
await writeFile(`${out}/registration.json`, JSON.stringify(registration, null, 2) + "\n");
console.log(`Epoch ${epoch}: ${report.rank1}/${rows.length} rank 1; complete=${report.complete}; target=14`);
console.table(rows.map(({ intent, rank, score, leader, top, regime }) => ({ intent, rank, score, leader, top, regime })));
if (failures.length) console.error(failures);
