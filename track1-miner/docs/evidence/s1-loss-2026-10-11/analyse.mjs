// Reconstruct Track 1 performance points under several readings of the published rule.
import { readFileSync } from "node:fs";
const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
const FOCUS = (process.argv[3] ?? "livecert,txlens,chainsight-oracle").split(",");

// Epoch timeline
const at = new Map();
for (const r of rows) if (!at.has(r.epoch_id) || r.scored_at < at.get(r.epoch_id)) at.set(r.epoch_id, r.scored_at);
const epochsIn = (a, b) => [...at].filter(([, t]) => t >= a && t <= b).map(([e]) => e).sort((x, y) => x - y);

const windows = {
  "track1 Aug17-Aug31": epochsIn("2026-08-17", "2026-08-31T23:59:59Z"),
  "through Sep7": epochsIn("2026-08-17", "2026-09-07T23:59:59Z"),
  "epoch 298 only": [298],
  "Aug26-Aug31 (our life)": epochsIn("2026-08-26", "2026-08-31T23:59:59Z"),
};
for (const [k, v] of Object.entries(windows)) console.log(k, v[0], "..", v.at(-1), `(${v.length} epochs)`);

function perf(epochs, { absentAsZero }) {
  const E = new Set(epochs);
  const sub = rows.filter(r => E.has(r.epoch_id));
  // per intent, per miner: average score over epochs scored (or over all epochs the intent was scored, absent = 0)
  const byIntent = new Map();
  for (const r of sub) {
    if (!byIntent.has(r.intent_id)) byIntent.set(r.intent_id, { epochs: new Set(), miners: new Map() });
    const b = byIntent.get(r.intent_id);
    b.epochs.add(r.epoch_id);
    if (!b.miners.has(r.miner_slug)) b.miners.set(r.miner_slug, []);
    b.miners.get(r.miner_slug).push(r.score);
  }
  const out = new Map(); // miner -> [{intent, avg, ratio, n, minersInIntent}]
  for (const [intent, b] of byIntent) {
    const avgs = new Map();
    for (const [m, s] of b.miners) {
      const denom = absentAsZero ? b.epochs.size : s.length;
      avgs.set(m, s.reduce((x, y) => x + y, 0) / denom);
    }
    const top = Math.max(...avgs.values());
    for (const [m, a] of avgs) {
      if (!out.has(m)) out.set(m, []);
      out.get(m).push({ intent, avg: a, ratio: top > 0 ? a / top : 0, n: b.miners.get(m).length, of: b.epochs.size, field: avgs.size });
    }
  }
  return out;
}

for (const [wname, epochs] of Object.entries(windows)) {
  for (const absentAsZero of [false, true]) {
    const p = perf(epochs, { absentAsZero });
    const table = [...p].map(([m, list]) => {
      const sum = list.reduce((x, y) => x + y.ratio, 0);
      return { m, k: list.length, mean75: (75 * sum) / list.length, sum, r1: list.filter(x => x.ratio === 1).length };
    }).sort((a, b) => b.mean75 - a.mean75);
    console.log(`\n== ${wname} | absent epochs ${absentAsZero ? "count as 0" : "ignored"} ==`);
    const rankOfMean = m => table.findIndex(t => t.m === m) + 1;
    const bySum = [...table].sort((a, b) => b.sum - a.sum);
    console.log("top 8 by mean×75:", table.slice(0, 8).map(t => `${t.m}(${t.k}) ${t.mean75.toFixed(1)}`).join(" | "));
    console.log("top 5 by sum:", bySum.slice(0, 5).map(t => `${t.m}(${t.k}) ${t.sum.toFixed(2)}`).join(" | "));
    for (const f of FOCUS) {
      const t = table.find(x => x.m === f);
      if (!t) { console.log(` ${f}: none`); continue; }
      console.log(` ${f}: intents ${t.k}, mean×75 ${t.mean75.toFixed(2)} (rank ${rankOfMean(f)}/${table.length}), sum ${t.sum.toFixed(3)} (rank ${bySum.findIndex(x => x.m === f) + 1}), ratio=1 in ${t.r1}`);
    }
  }
}
