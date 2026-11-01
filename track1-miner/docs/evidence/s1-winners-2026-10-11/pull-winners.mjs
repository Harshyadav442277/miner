// Page the explorer feed and keep full rows (question, routing, execution.result) for four miners.
// usage: node pull-winners.mjs <since_hours> <order asc|desc> <max_pages> <stop_iso|-> <out.json>
import { writeFile } from "node:fs/promises";
const [HOURS, ORDER, MAXP, STOP, OUT] = process.argv.slice(2);
const KEEP = new Set(["9002", "302", "64173", "4433"]);
const LIMIT = 50, STEP = 40;
const base = "https://explorer.telegraphprotocol.com/api/daemon/api/questions";
async function page(off) {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(`${base}?sort=recent&order=${ORDER}&since_hours=${HOURS}&limit=${LIMIT}&offset=${off}`,
        { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(60_000) });
      if (r.ok) return (await r.json()).results;
    } catch {}
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error(`page ${off} failed`);
}
const kept = new Map(), seen = new Set();
let next = 0, done = false, pages = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (!done) {
    const off = next; next += STEP;
    if (off / STEP >= Number(MAXP)) { done = true; break; }
    const res = await page(off);
    pages++;
    if (!res.length) { done = true; break; }
    if (STOP !== "-" && ORDER === "asc" && res[0].created_at > STOP) { done = true; break; }
    for (const q of res) {
      seen.add(q.id);
      if (KEEP.has(q.routing?.subnet_id ?? "")) kept.set(q.id, q);
    }
  }
}));
const all = [...kept.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
await writeFile(OUT, JSON.stringify(all));
console.log(`pages ${pages}, rows seen ${seen.size}, kept ${all.length}: ${all[0]?.created_at} .. ${all.at(-1)?.created_at}`);
