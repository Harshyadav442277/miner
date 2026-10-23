// Map each Season II mission page to the canonical intents it names, and compare with our manifest.
// usage: node missions.mjs <miner.yaml> <intents.json> <out.json>
import { readFile, writeFile } from "node:fs/promises";
const [yamlPath, intentsPath, outPath] = process.argv.slice(2);
const slugs = ["asset-management", "autonomous-systems", "commodities", "conflict-intelligence", "consumer-automation",
  "consumer-platform", "exchange", "institutional-markets", "legal", "mining-and-power", "model-economy",
  "personal-agent", "resources-and-agriculture", "stablecoin", "web3-defi"];
const canon = JSON.parse(await readFile(intentsPath, "utf8"));
const canonList = (Array.isArray(canon) ? canon : canon.intents ?? canon.data ?? Object.values(canon)[0]);
const known = new Set(canonList.map((x) => x.intent_id));
const miners = Object.fromEntries(canonList.map((x) => [x.intent_id, x.miner_count]));
const yaml = await readFile(yamlPath, "utf8");
const ours = new Set([...yaml.matchAll(/intents:\s*\[([^\]]*)\]/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().replace(/"/g, "")).filter((s) => s && s !== "*")));
const out = {};
for (const slug of slugs) {
  const r = await fetch(`https://hackathon.telegraphprotocol.com/missions/${slug}`, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }, signal: AbortSignal.timeout(40_000) });
  const html = await r.text();
  const text = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  const named = [...new Set([...text.matchAll(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g)].map((m) => m[0]).filter((t) => known.has(t)))];
  out[slug] = { status: r.status, intents: named, ours: named.filter((i) => ours.has(i)), missing: named.filter((i) => !ours.has(i)) };
}
await writeFile(outPath, JSON.stringify({ at: new Date().toISOString(), ours: [...ours], miners, missions: out }, null, 1));
let covered = 0;
for (const [slug, m] of Object.entries(out)) {
  if (m.ours.length) covered++;
  console.log(`${slug.padEnd(26)} ${m.status} buys ${String(m.intents.length).padStart(2)} | ours ${m.ours.length}: ${m.ours.join(" ") || "-"}`);
  console.log(`${"".padEnd(26)}      not ours: ${m.missing.map((i) => `${i}(${miners[i]})`).join(" ")}`);
}
console.log(`\nmissions with at least one of our intents: ${covered}/15`);
const gain = {};
for (const [slug, m] of Object.entries(out)) for (const i of m.missing) (gain[i] ??= []).push(slug);
console.log("\nintents we do not serve, by number of missions buying them:");
for (const [i, s] of Object.entries(gain).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${String(s.length).padStart(2)} ${i} (${miners[i]} miners): ${s.join(", ")}`);
