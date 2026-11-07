#!/usr/bin/env node
/**
 * Every scored epoch of LiveCert in the named intents, with the field size and the third-place score.
 *
 *   node track1-miner/tools/epoch-history.mjs <out.json> <INTENT_ID>...
 *
 * `/api/miners` carries only the latest epoch; `/scores?intent=` pages through all of them. Rows are matched
 * by `miner_slug` because `/scores` has no registration id; check the slug's wallet in `/api/miners` (LiveCert:
 * catalogue id 4433, wallet 0xdad2…a39e) before trusting a row. Third place matters: routed requests go to the
 * top three only (70/20/10).
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const NODE = process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com";
const SLUG = process.env.MINER_SLUG ?? "livecert";
const [outPath, ...intents] = process.argv.slice(2);
if (!outPath || !intents.length) {
  console.error("usage: node epoch-history.mjs <out.json> <INTENT_ID>...");
  process.exit(2);
}

// curl -4: Node's fetch can hang on IPv6 from the owner's machine.
const get = (path) => JSON.parse(execFileSync("curl", ["-4", "-s", "--max-time", "40", "-A", "Mozilla/5.0", `${NODE}${path}`],
  { encoding: "utf8", maxBuffer: 64 << 20 }));

const out = { fetched_at_utc: new Date().toISOString(), source: `${NODE}/scores?intent=<id>&limit=100&offset=<n>`, slug: SLUG, intents: {} };
for (const intent of intents) {
  const rows = [];
  let total = Infinity;
  for (let offset = 0; offset < total && offset < 20_000; offset += 100) {
    const page = get(`/scores?intent=${encodeURIComponent(intent)}&limit=100&offset=${offset}`);
    total = page.total ?? 0;
    if (!page.scores?.length) break;
    rows.push(...page.scores);
  }
  const byEpoch = new Map();
  for (const r of rows) {
    const e = byEpoch.get(r.epoch_id) ?? { epoch: r.epoch_id, field: 0, third: null, ours: null };
    e.field += 1;
    if (r.rank === 3) e.third = r.score;
    if (r.miner_slug === SLUG) e.ours = { rank: r.rank, score: r.score, scored_at: r.scored_at, failure_reason: r.failure_reason || null };
    byEpoch.set(r.epoch_id, e);
  }
  out.intents[intent] = { rows_read: rows.length, total, epochs: [...byEpoch.values()].sort((a, b) => a.epoch - b.epoch) };
}
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
for (const [intent, v] of Object.entries(out.intents)) {
  console.log(`${intent}  rows ${v.rows_read}/${v.total}`);
  for (const e of v.epochs) {
    const ours = e.ours ? `${e.ours.rank} ${e.ours.score} ${e.ours.scored_at.slice(0, 16)}Z` : "-";
    console.log(`  ${e.epoch}  ours ${ours}  3rd ${e.third}  field ${e.field}`);
  }
}
