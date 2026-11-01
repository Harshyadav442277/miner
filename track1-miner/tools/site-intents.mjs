// The hackathon site's Intents table, read from its script bundle (the rows are not in the HTML).
// Each row: [missions, category, INTENT, tier, tierWhy, _, job, serviceType, sources, differ, latency, difficulty, _, note].
// The tier is a variable; the bundle defines them as `let t="Deterministic",i="Hybrid",r="Judgment"`.
// usage: node tools/site-intents.mjs <out.json>
import { writeFile } from "node:fs/promises";

const SITE = "https://hackathon.telegraphprotocol.com";
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const get = async (u) => {
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40_000) });
  if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`);
  return r.text();
};

/** The JS literal at `i`: a string, number, null or a variable name. Returns [value, next index]. */
function literal(js, i) {
  const quote = js[i];
  if (quote === '"' || quote === "'" || quote === "`") {
    let j = i + 1;
    let out = "";
    while (js[j] !== quote) {
      if (js[j] === "\\") { out += js[j + 1] === "n" ? "\n" : js[j + 1]; j += 2; } else out += js[j++];
    }
    return [out, j + 1];
  }
  const tok = /^[\w.$-]+/.exec(js.slice(i))?.[0];
  if (!tok) throw new Error(`unreadable literal at ${i}: ${js.slice(i - 80, i + 80)}`);
  return [tok === "null" ? null : /^-?\d/.test(tok) ? Number(tok) : { var: tok }, i + tok.length];
}

function parseRows(js) {
  const tiers = Object.fromEntries([...js.matchAll(/\b([a-z])="(Deterministic|Hybrid|Judgment)"/g)].map((m) => [m[1], m[2]]));
  const rows = [];
  for (const m of js.matchAll(/\[(\d+),"[^"]*","[A-Z][A-Z0-9_]+",/g)) {
    const vals = [];
    let i = m.index + 1;
    while (js[i] !== "]") {
      const [v, next] = literal(js, i);
      vals.push(v);
      i = js[next] === "," ? next + 1 : next;
    }
    rows.push({
      intent: vals[2], missions: vals[0], category: vals[1], tier: tiers[vals[3]?.var] ?? null, tier_why: vals[4],
      job: vals[6], service_type: vals[7], example_sources: vals[8], how_miners_differ: vals[9],
      latency_target: vals[10], difficulty: vals[11], note: vals[13] ?? null,
    });
  }
  return rows;
}

const html = await get(`${SITE}/intents`);
const chunks = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"]+\.js/g)].map((m) => m[0]))];
let rows = [];
for (const c of chunks) {
  const js = await get(`${SITE}${c}`);
  // Other chunks name intents too; the table is the chunk with the most rows.
  const found = js.includes("SANCTIONS_SCREENING_MATCH") ? parseRows(js) : [];
  if (found.length > rows.length) rows = found;
}
await writeFile(process.argv[2], JSON.stringify({ at: new Date().toISOString(), source: `${SITE}/intents`, rows }, null, 1));
console.log(`${rows.length} rows, ${rows.filter((r) => !r.tier).length} without a tier`);
