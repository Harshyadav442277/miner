#!/usr/bin/env node
/**
 * Which intents are worth entering, and which of ours are worth working on.
 *
 * Occupancy alone is a bad signal — it is what cost this project SENTIMENT_ANALYSIS.
 * Two things decide it instead:
 *
 *  1. **Is the intent crossable?** These scorers are cliffs. An intent whose
 *     all-time best is ~0.01 has never had a crossable question, so entering it
 *     means competing for third-decimal noise (ACADEMIC_SEARCH is exactly this,
 *     see GAPS G42). An intent where someone has scored ~0.99 has a reachable
 *     ceiling.
 *  2. **How weak is the field RIGHT NOW?** Judging normalises by the best score
 *     in the intent, so what matters is the leader's score, not the average.
 *
 * Also reports, for the intents we already serve, our ratio to the leader — the
 * quantity actually judged — so improvement effort can be aimed at whichever is
 * furthest from 1.0 rather than at whichever feels worst.
 *
 *   node track1-miner/tools/opportunity-scan.mjs
 */
const NODE = "https://devnode.telegraphprotocol.com";
const OURS = new Set([
  "SSL_VERIFICATION", "STORM_ALERT", "WEATHER_FORECAST", "IP_GEOLOCATION",
  "LANGUAGE_TRANSLATION", "ACADEMIC_SEARCH", "AI_TEXT_DETECTION",
  "CONTENT_EXTRACTION", "NEWS_HEADLINES", "WALLET_BALANCE_CHECK",
]);

const intents = await (await fetch(`${NODE}/engine/v1/intents`, { signal: AbortSignal.timeout(30000) })).json();
const list = (Array.isArray(intents) ? intents : intents.intents ?? []).filter((i) => i.canonical);

const rows = [];
for (const it of list) {
  let scores = [];
  try {
    const r = await fetch(`${NODE}/scores?intent=${it.intent_id}&limit=400`, { signal: AbortSignal.timeout(30000) });
    const d = await r.json();
    scores = Array.isArray(d) ? d : d.scores ?? [];
  } catch { /* an intent with no feed is simply unmeasurable */ }

  const allTime = scores.length ? Math.max(...scores.map((s) => s.score)) : 0;
  const epochs = [...new Set(scores.map((s) => s.epoch_id))].sort((a, b) => a - b);
  const latest = epochs.at(-1);
  const cur = scores.filter((s) => s.epoch_id === latest);
  const leader = cur.length ? Math.max(...cur.map((s) => s.score)) : 0;
  const us = cur.find((s) => s.miner_slug === "livecert");
  // How often has ANY miner crossed? That is the ceiling worth entering for.
  const crossableEpochs = epochs.filter((e) => scores.some((s) => s.epoch_id === e && s.score > 0.5)).length;

  rows.push({
    intent: it.intent_id,
    miners: it.miner_count,
    ours: OURS.has(it.intent_id),
    allTime,
    leader,
    crossableEpochs,
    epochs: epochs.length,
    rank: us?.rank ?? null,
    ratio: us && leader > 0 ? us.score / leader : null,
    rowsSeen: scores.length,
  });
}

const f = (n, d = 6) => (n === null ? "  —  " : n.toFixed(d));

console.log("\n=== INTENTS WE ALREADY SERVE — ratio to the leader is what is judged\n");
console.log("  intent                  miners  rank   ratio    leader now   all-time  crossable epochs");
for (const r of rows.filter((r) => r.ours).sort((a, b) => (a.ratio ?? 9) - (b.ratio ?? 9))) {
  console.log(
    `  ${r.intent.padEnd(22)} ${String(r.miners).padStart(4)}   ${String(r.rank ?? "-").padStart(3)}  ${f(r.ratio, 3).padStart(6)}   ` +
    `${f(r.leader).padStart(11)}  ${f(r.allTime).padStart(9)}   ${r.crossableEpochs}/${r.epochs}`,
  );
}

console.log("\n=== INTENTS WE DO NOT SERVE — sorted by how weak the leader is\n");
console.log("  intent                  miners   leader now   all-time  crossable  score rows");
const others = rows.filter((r) => !r.ours).sort((a, b) => a.leader - b.leader);
for (const r of others) {
  const flag = r.rowsSeen === 0 ? "  UNMEASURABLE (no score rows)"
    : r.crossableEpochs === 0 ? "  never crossed — third-decimal noise"
    : r.leader < 0.01 ? "  <== weak leader AND crossable"
    : "";
  console.log(
    `  ${r.intent.padEnd(22)} ${String(r.miners).padStart(4)}  ${f(r.leader).padStart(11)}  ${f(r.allTime).padStart(9)}` +
    `   ${r.crossableEpochs}/${r.epochs}      ${String(r.rowsSeen).padStart(4)}${flag}`,
  );
}
