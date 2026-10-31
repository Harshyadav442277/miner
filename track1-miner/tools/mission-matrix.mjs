// Mission × intent matrix: every example build on the 15 Season II mission pages, the intent families it
// buys, and which of them registration 4829 serves.
// usage: node tools/mission-matrix.mjs <out-dir>
// Writes <out-dir>/matrix.json and prints a summary. The mission data lives in a Next.js chunk on the H2
// site, so the script finds the chunk that holds `slug:"exchange"` and parses the example objects out of it.
import { mkdir, writeFile } from "node:fs/promises";

const SITE = "https://hackathon.telegraphprotocol.com";
const NODE = "https://devnode.telegraphprotocol.com";
const REGISTRATION = 4829;
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0" };
const outDir = process.argv[2];
if (!outDir) throw new Error("usage: node tools/mission-matrix.mjs <out-dir>");

const get = async (url, as = "text") => {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40_000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return as === "json" ? r.json() : r.text();
};

// 1. The chunk with the mission data.
const page = await get(`${SITE}/missions/exchange`);
const chunks = [...new Set(page.match(/\/_next\/static\/chunks\/[^"]+\.js/g))];
let source = null, chunkUrl = null;
for (const c of chunks) {
  const js = await get(SITE + c);
  if (js.includes('slug:"exchange"') && js.includes("intents:[")) { source = js; chunkUrl = SITE + c; break; }
}
if (!source) throw new Error("no chunk holds the mission data");

// 2. Split by mission, then parse each example's title, tag, output and intents.
const starts = [...source.matchAll(/\{n:(\d+),slug:"([a-z0-9-]+)",name:"([^"]+)"/g)];
const missions = starts.map((m, i) => {
  const body = source.slice(m.index, starts[i + 1]?.index ?? source.length);
  const examples = [...body.matchAll(/title:"([^"]+)",tag:"([^"]+)",body:(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'),output:"((?:[^"\\]|\\.)*)",intents:\[([^\]]*)\]/g)]
    .map((e) => ({ title: e[1], tag: e[2], output: e[3], intents: [...e[4].matchAll(/"([A-Z0-9_]+)"/g)].map((x) => x[1]) }));
  return { n: Number(m[1]), slug: m[2], name: m[3], examples };
});

// 3. Our intents, from the registration (never by slug), mapped to the families the missions name.
const reg = await get(`${NODE}/api/miners/${REGISTRATION}`, "json");
const ours = reg.miner.supported_intents.map((x) => x.intent_id ?? x);
const families = [...new Set(missions.flatMap((m) => m.examples.flatMap((e) => e.intents)))];
const familyOf = (intent) => families.filter((f) => intent === f || intent.startsWith(f + "_")).sort((a, b) => b.length - a.length)[0];
const servedFamilies = new Map();
for (const i of ours) { const f = familyOf(i); if (f) servedFamilies.set(f, [...(servedFamilies.get(f) ?? []), i]); }

// 4. Classify each example: full (we serve every family it buys), partial, none.
for (const m of missions) for (const e of m.examples) {
  e.ours = e.intents.filter((f) => servedFamilies.has(f));
  e.missing = e.intents.filter((f) => !servedFamilies.has(f));
  e.cover = e.missing.length === 0 ? "full" : e.ours.length ? "partial" : "none";
}

const all = missions.flatMap((m) => m.examples.map((e) => ({ mission: m.slug, ...e })));
const count = (c) => all.filter((e) => e.cover === c).length;
const familyUse = Object.fromEntries(families.map((f) => [f, all.filter((e) => e.intents.includes(f)).length]));
const missingDemand = Object.entries(familyUse).filter(([f]) => !servedFamilies.has(f)).sort((a, b) => b[1] - a[1]);
const result = {
  at: new Date().toISOString(), chunk: chunkUrl, registration: REGISTRATION, ours,
  served_families: Object.fromEntries(servedFamilies),
  unmapped_intents: ours.filter((i) => !familyOf(i)),
  totals: { missions: missions.length, examples: all.length, full: count("full"), partial: count("partial"), none: count("none") },
  family_use: familyUse, missions,
};
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/matrix.json`, JSON.stringify(result, null, 1));

console.log(`${all.length} example builds in ${missions.length} missions; full ${count("full")}, partial ${count("partial")}, none ${count("none")}`);
for (const m of missions) {
  const full = m.examples.filter((e) => e.cover === "full").length;
  const part = m.examples.filter((e) => e.cover === "partial").length;
  console.log(`${m.slug.padEnd(26)} examples ${m.examples.length}  full ${full}  partial ${part}`);
}
console.log("\nfamilies we serve, by example builds that buy them:");
for (const [f, is] of [...servedFamilies].sort((a, b) => familyUse[b[0]] - familyUse[a[0]])) console.log(`  ${String(familyUse[f]).padStart(3)} ${f} (${is.join(", ")})`);
console.log(`\nour intents no mission names: ${result.unmapped_intents.join(", ") || "none"}`);
console.log("\nmost-bought families we do not serve:");
for (const [f, n] of missingDemand.slice(0, 15)) console.log(`  ${String(n).padStart(3)} ${f}`);
