#!/usr/bin/env node
/**
 * Per-intent standing for one registration, from the network's own leaderboards.
 *
 * /api/miners shows only each miner's latest scored epoch, so an intent the node did not
 * test in that epoch looks "unscored". This reads every saved leaderboard snapshot
 * (record-scores output, one file per epoch) and reports each intent at the last epoch
 * that scored it for us, with the field at that epoch.
 *
 * usage: node tools/intent-table.mjs <leaderboards-dir> <out-dir> [missions-matrix.json]
 * env:   REGISTRATION_ID (default 5292), MINER_SLUG (default livecert), TELEGRAPH_NODE
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const [lbDir, outDir, matrixPath] = process.argv.slice(2);
if (!lbDir || !outDir) throw new Error("usage: node tools/intent-table.mjs <leaderboards-dir> <out-dir> [matrix.json]");
const NODE = process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com";
const REG = process.env.REGISTRATION_ID ?? "5292";
const SLUG = process.env.MINER_SLUG ?? "livecert";

const get = async p => {
  const r = await fetch(`${NODE}${p}`, { signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return r.json();
};
const reg = (await get(`/api/miners/${REG}`)).miner;
if (reg.activation_status !== "active" || reg.slug !== SLUG) throw new Error(`registration ${REG}: ${reg.slug} ${reg.activation_status}`);
const catalog = await get("/api/miners");
const miners = Array.isArray(catalog) ? catalog : catalog.miners ?? catalog.data ?? [];
// Latest epoch in which anyone was scored on an intent: tells "dormant network-wide" from "not tested this epoch".
const fieldLast = {};
for (const m of miners) for (const s of m.scores ?? []) fieldLast[s.intent_id] = Math.max(fieldLast[s.intent_id] ?? 0, s.epoch_id);

const boards = [];
for (const f of (await readdir(lbDir)).filter(f => /^leaderboard-\d+\.json$/.test(f)).sort()) {
  boards.push(JSON.parse(await readFile(join(lbDir, f), "utf8")));
}
boards.sort((a, b) => b.epoch - a.epoch);
const latest = boards[0]?.epoch;
const missions = matrixPath ? JSON.parse(await readFile(matrixPath, "utf8")).family_use ?? {} : {};
const family = id => id.replace(/_(GENERAL|US_EQUITY|USD|CERT|VERDICT|CONVERT|TEMPERATURE|CVSS)$/, "");

const rows = reg.supported_intents.slice().sort().map(intent => {
  const hit = boards.map(b => ({ epoch: b.epoch, field: (b.intents[intent] ?? []).slice().sort((x, y) => y.score - x.score) }))
    .find(b => b.field.some(r => r.miner_slug === SLUG));
  const fieldOnly = boards.find(b => (b.intents[intent] ?? []).length && !(b.intents[intent]).some(r => r.miner_slug === SLUG));
  const row = { intent, missions: missions[family(intent)] ?? 0, field_last_epoch: fieldLast[intent] ?? null };
  if (!hit) {
    row.bucket = (fieldLast[intent] ?? 0) < (boards.at(-1)?.epoch ?? 0) ? "dormant network-wide"
      : fieldOnly ? `field scored without us (epoch ${fieldOnly.epoch})` : "never scored in saved epochs";
    if (fieldOnly) Object.assign(row, { top: `${fieldOnly.intents[intent].sort((x, y) => y.score - x.score)[0].miner_slug} ${fieldOnly.intents[intent][0].score}` });
    return row;
  }
  const ours = hit.field.find(r => r.miner_slug === SLUG);
  const lead = hit.field[0];
  const tied = hit.field.filter(r => r.score === lead.score).length;
  Object.assign(row, {
    epoch: hit.epoch, score: ours.score, rank: ours.rank, n: hit.field.length,
    top: `${lead.miner_slug} ${lead.score}`, gap: +(lead.score - ours.score).toFixed(4),
    median: hit.field[Math.floor(hit.field.length / 2)].score,
    bucket: ours.score === lead.score ? `tie at top (${tied} at ${lead.score})` : hit.epoch === latest ? "scored, latest epoch" : "scored earlier, not tested in latest",
  });
  return row;
});

await mkdir(resolve(outDir), { recursive: true });
const md = ["| Intent | Missions | Epoch | Score | Rank | Field top | Gap | Median | Bucket |", "|---|---|---|---|---|---|---|---|---|",
  ...rows.map(r => `| ${r.intent} | ${r.missions} | ${r.epoch ?? "-"} | ${r.score ?? "-"} | ${r.rank ? `${r.rank}/${r.n}` : "-"} | ${r.top ?? "-"} | ${r.gap ?? "-"} | ${r.median ?? "-"} | ${r.bucket}${r.epoch ? "" : `; field last scored ${r.field_last_epoch ?? "never"}`} |`)];
await writeFile(join(outDir, "intent-table.json"), JSON.stringify({ at: new Date().toISOString(), registration: REG, latest_epoch: latest, epochs: boards.map(b => b.epoch), rows }, null, 1));
await writeFile(join(outDir, "intent-table.md"), md.join("\n") + "\n");
console.log(md.join("\n"));
