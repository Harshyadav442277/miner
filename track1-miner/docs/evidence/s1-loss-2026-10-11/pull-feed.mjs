// Page the explorer question feed (oldest first) into compact rows: who served what, for whom.
import { writeFile } from "node:fs/promises";
const HOURS = Number(process.argv[2]);
const STOP_AT = process.argv[3]; // ISO; stop once a page starts after this
const OUT = process.argv[4];
const LIMIT = 50, STEP = 40; // 10-row overlap, deduped by id
const base = "https://explorer.telegraphprotocol.com/api/daemon/api/questions";
async function page(off) {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(`${base}?sort=recent&order=asc&since_hours=${HOURS}&limit=${LIMIT}&offset=${off}`,
        { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(60_000) });
      if (r.ok) return (await r.json()).results;
    } catch {}
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error(`page ${off} failed`);
}
const rows = new Map();
let next = 0, done = false, pages = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (!done) {
    const off = next; next += STEP;
    const res = await page(off);
    pages++;
    if (!res.length || res[0].created_at > STOP_AT) { done = true; break; }
    for (const q of res) rows.set(q.id, {
      t: q.created_at, type: q.type, src: q.source, st: q.status,
      miner: q.routing?.subnet_name ?? "", mid: q.routing?.subnet_id ?? "",
      intent: q.routing?.intent ?? "", cost: q.execution?.cost_usd ?? 0,
      q: (q.question?.text ?? "").slice(0, 160),
    });
    if (pages % 100 === 0) console.log(`pages ${pages}, rows ${rows.size}, at ${res[0].created_at}`);
  }
}));
const all = [...rows.values()].sort((a, b) => a.t.localeCompare(b.t));
await writeFile(OUT, JSON.stringify(all));
console.log(`done: ${all.length} rows ${all[0]?.t} .. ${all.at(-1)?.t}`);
