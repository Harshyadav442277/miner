// Requests served per miner per judging window, from the compact feed rows.
import { readFileSync } from "node:fs";
const feed = JSON.parse(readFileSync(process.argv[2], "utf8"));
const catalog = JSON.parse(readFileSync(process.argv[3], "utf8"));
const FOCUS = ["livecert", "txlens", "chainsight-oracle", "oathcast-weather"];

// The feed labels a miner by slug in older rows and by display name in newer ones; ids are stable.
const byId = new Map(catalog.map(m => [String(m.id), m.slug]));
const byName = new Map(catalog.map(m => [m.name, m.slug]));
const slugOf = r => byId.get(String(r.mid)) ?? byName.get(r.miner) ?? r.miner;

const windows = [
  ["Track 1  Aug 17-31", "2026-08-17", "2026-09-01"],
  ["Track 3  Aug 31-Sep 7", "2026-08-31", "2026-09-08"],
  ["Judging  Sep 8-28", "2026-09-08", "2026-09-29"],
  ["All  Aug 17-Sep 28", "2026-08-17", "2026-09-29"],
];
console.log(`feed rows ${feed.length}: ${feed[0].t} .. ${feed.at(-1).t}`);
const sources = {};
for (const r of feed) sources[`${r.type}/${r.src.split(":")[0]}`] = (sources[`${r.type}/${r.src.split(":")[0]}`] ?? 0) + 1;
console.log("type/source:", sources);

for (const [name, a, b] of windows) {
  const rows = feed.filter(r => r.t >= a && r.t < b && r.st === "success");
  const per = new Map();
  for (const r of rows) {
    const s = slugOf(r);
    if (!s) continue;
    const p = per.get(s) ?? { direct: 0, daemon: 0, nl: 0, intents: new Set() };
    p[r.type === "daemon" ? "daemon" : "direct"]++;
    // A direct call written as a natural-language question (not the "[direct] id → {...}" form) is
    // what an app or the explorer's ask box sends; the bracketed form is a raw endpoint call.
    if (r.type !== "daemon" && !r.q.startsWith("[direct]")) p.nl++;
    per.set(s, p);
  }
  const rank = [...per].map(([s, p]) => ({ s, ...p, total: p.direct + p.daemon })).sort((x, y) => y.total - x.total);
  const routed = [...per].map(([s, p]) => ({ s, d: p.daemon })).sort((x, y) => y.d - x.d);
  console.log(`\n== ${name}: ${rows.length} successful rows, ${per.size} miners ==`);
  console.log("top 8 by total:", rank.slice(0, 8).map(x => `${x.s} ${x.total}`).join(" | "));
  console.log("top 5 by routed:", routed.slice(0, 5).map(x => `${x.s} ${x.d}`).join(" | "));
  for (const f of FOCUS) {
    const i = rank.findIndex(x => x.s === f);
    const x = rank[i];
    console.log(`  ${f.padEnd(18)} ${x ? `total ${x.total} (#${i + 1}) = direct ${x.direct} [nl ${x.nl}] + routed ${x.daemon} (#${routed.findIndex(y => y.s === f) + 1})` : "0"}`);
  }
}
