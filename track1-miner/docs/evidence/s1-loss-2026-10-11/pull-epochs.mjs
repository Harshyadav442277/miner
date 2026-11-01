// Pull every score row for epochs [from, to] from the public node API into one JSON file.
import { writeFile } from "node:fs/promises";
const [from, to, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
const NODE = "https://devnode.telegraphprotocol.com";
async function get(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (r.ok) return r.json();
    } catch {}
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error(`failed ${url}`);
}
async function epoch(e) {
  const rows = [];
  for (let off = 0; ; off += 500) {
    const j = await get(`${NODE}/scores?epoch=${e}&limit=500&offset=${off}`);
    rows.push(...j.scores);
    if (rows.length >= j.total || j.scores.length === 0) break;
  }
  return rows;
}
const all = [];
const queue = [];
for (let e = from; e <= to; e++) queue.push(e);
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const e = queue.shift();
    const rows = await epoch(e);
    all.push(...rows.map(({ id, created_at, ...r }) => r));
  }
}));
all.sort((a, b) => a.epoch_id - b.epoch_id || a.intent_id.localeCompare(b.intent_id) || a.rank - b.rank);
await writeFile(out, JSON.stringify(all));
const ep = [...new Set(all.map(r => r.epoch_id))];
console.log(`rows ${all.length}, epochs with data ${ep.length}: ${ep[0]}..${ep.at(-1)}`);
