// Pull unfiltered /scores pages for every registered intent plus the full catalog,
// then summarise: our per-epoch rank/score/failure, per-epoch leaders, and every
// non-livecert failure_reason (the node's test inputs leak there, G144).
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const node = "https://devnode.telegraphprotocol.com";
const out = resolve(process.argv[2] ?? "history");
const minEpoch = Number(process.argv[3] ?? 326);
await mkdir(`${out}/scores`, { recursive: true });

async function get(path) {
  const r = await fetch(`${node}${path}`, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

const catalog = await get("/api/miners");
const miners = Array.isArray(catalog) ? catalog : catalog.miners ?? catalog.data ?? [];
await writeFile(`${out}/catalog.json`, JSON.stringify(catalog, null, 1) + "\n");
const us = miners.find((m) => m.slug === "livecert");
const intents = [...new Set(us.scores.map((s) => s.intent_id))].sort();

// Catalog view: every miner's per-epoch rows -> leaders per intent/epoch, ours per intent/epoch.
const byIE = new Map();
for (const m of miners) for (const s of m.scores ?? []) {
  const k = `${s.intent_id}|${s.epoch_id}`;
  if (!byIE.has(k)) byIE.set(k, []);
  byIE.get(k).push({ slug: m.slug, rank: s.rank, score: s.score });
}
const catalogEpochs = [...new Set(us.scores.map((s) => s.epoch_id))].sort((a, b) => a - b);

const summary = {};
const leaks = [];
for (let i = 0; i < intents.length; i += 4) {
  await Promise.all(intents.slice(i, i + 4).map(async (intent) => {
    let page;
    try { page = await get(`/scores?intent=${intent}&limit=200`); }
    catch (e) { page = { error: String(e), scores: [] }; }
    await writeFile(`${out}/scores/${intent}.json`, JSON.stringify(page, null, 1) + "\n");
    const rows = page.scores ?? [];
    const epochs = [...new Set(rows.map((r) => r.epoch_id))].sort((a, b) => a - b);
    const perEpoch = {};
    for (const e of epochs) {
      const field = rows.filter((r) => r.epoch_id === e).sort((a, b) => a.rank - b.rank);
      const ours = field.find((r) => r.miner_slug === "livecert");
      const lead = field.find((r) => r.rank === 1);
      perEpoch[e] = {
        rank: ours?.rank ?? null, score: ours?.score ?? null, failure: ours?.failure_reason ?? null,
        scoredAt: ours?.scored_at ?? null,
        leader: lead?.miner_slug ?? null, top: lead?.score ?? null, field: field.length,
        top3: field.slice(0, 3).map((r) => `${r.miner_slug}:${r.score}`),
      };
      for (const r of field) if (r.failure_reason && r.miner_slug !== "livecert" && e >= minEpoch)
        leaks.push({ intent, epoch: e, miner: r.miner_slug, reason: String(r.failure_reason).slice(0, 600) });
    }
    summary[intent] = { pageEpochs: epochs, perEpoch, pagination: page.pagination ?? page.meta ?? null };
  }));
}

// Catalog-only history (older epochs the /scores page may not carry).
const catalogHistory = {};
for (const intent of intents) {
  catalogHistory[intent] = {};
  for (const e of catalogEpochs) {
    const field = (byIE.get(`${intent}|${e}`) ?? []).sort((a, b) => a.rank - b.rank);
    if (!field.length) continue;
    const ours = field.find((r) => r.slug === "livecert");
    const lead = field[0];
    catalogHistory[intent][e] = { rank: ours?.rank ?? null, score: ours?.score ?? null, leader: lead.slug, top: lead.score, field: field.length };
  }
}

await writeFile(`${out}/summary.json`, JSON.stringify({ at: new Date().toISOString(), catalogEpochs, intents, summary, catalogHistory }, null, 1) + "\n");
await writeFile(`${out}/leaks.json`, JSON.stringify(leaks, null, 1) + "\n");

// Console: catalog history table, ours vs leader, per intent.
console.log(`catalog epochs for livecert: ${catalogEpochs.join(",")}`);
for (const intent of intents) {
  const h = catalogHistory[intent];
  const line = Object.entries(h).map(([e, r]) => `${e}:r${r.rank ?? "-"}/${fmt(r.score)}<${r.leader.slice(0, 10)}:${fmt(r.top)}>`).join(" ");
  console.log(`\n${intent}\n  ${line}`);
}
console.log(`\nleaked failure_reasons (non-livecert, epoch>=${minEpoch}): ${leaks.length}`);
function fmt(x) { return x == null ? "-" : x >= 0.01 ? x.toFixed(3) : x === 0 ? "0" : x.toExponential(1); }
