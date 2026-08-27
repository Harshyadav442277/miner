#!/usr/bin/env node
/**
 * Appends this epoch's per-intent scores to track1-miner/docs/score-history.jsonl.
 *
 * Scoring is the only feedback loop we have, it runs on the network's schedule
 * rather than ours, and the API only exposes the latest epoch — so a score not
 * captured when it appears is gone. Polling by hand across a week-long window is
 * not a plan; this runs on the uptime cadence and keeps a durable record.
 *
 * Writes nothing when the epoch is already recorded, so it is safe to run often.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const NODE = process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com";
const SLUG = process.env.MINER_SLUG ?? "livecert";
// Resolved against this file, not the working directory. A relative default wrote
// a stray docs/score-history.jsonl at the repo root when run from anywhere but
// track1-miner/, silently splitting the history in two.
const OUT =
  process.env.SCORE_HISTORY ?? fileURLToPath(new URL("../docs/score-history.jsonl", import.meta.url));
const INTENTS = ["SSL_VERIFICATION", "STORM_ALERT", "WEATHER_FORECAST"];

const res = await fetch(`${NODE}/api/miners`, { signal: AbortSignal.timeout(25_000) });
if (!res.ok) {
  console.error(`node returned ${res.status}`);
  process.exit(1);
}
const body = await res.json();
const miners = Array.isArray(body) ? body : (body.miners ?? body.data ?? []);

const us = miners.find((m) => m?.slug === SLUG);
if (!us) {
  console.error(`${SLUG} not in the catalog — registration may be rejected or the node stale`);
  process.exit(1);
}
const scores = us.scores ?? [];
if (scores.length === 0) {
  console.log("not scored yet");
  process.exit(0);
}

const epoch = Math.max(...scores.map((s) => s.epoch_id));

let existing = "";
try {
  existing = await readFile(OUT, "utf8");
} catch {
  /* first run */
}
if (existing.includes(`"epoch":${epoch},`)) {
  console.log(`epoch ${epoch} already recorded`);
  process.exit(0);
}

/** Rank 1's score in each intent — the only number that matters, since 75 points go to whoever holds it. */
const leaders = {};
for (const intent of INTENTS) {
  let best = null;
  for (const m of miners) {
    for (const s of m.scores ?? []) {
      if (s.intent_id === intent && s.epoch_id === epoch) {
        if (!best || s.score > best.score) best = { slug: m.slug, score: s.score, rank: s.rank };
      }
    }
  }
  if (best) leaders[intent] = best;
}

const row = {
  epoch,
  at: new Date().toISOString(),
  ours: Object.fromEntries(
    scores.filter((s) => s.epoch_id === epoch).map((s) => [s.intent_id, { rank: s.rank, score: s.score }]),
  ),
  leaders,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, existing + JSON.stringify(row) + "\n");

console.log(`epoch ${epoch}`);
for (const [intent, v] of Object.entries(row.ours)) {
  const lead = leaders[intent];
  const gap = lead ? (lead.score - v.score).toFixed(8) : "?";
  const flag = v.rank === 1 ? "  <-- RANK 1" : "";
  console.log(`  ${intent.padEnd(20)} rank ${String(v.rank).padEnd(3)} ${v.score.toFixed(8)}  gap ${gap}${flag}`);
}
