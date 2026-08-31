#!/usr/bin/env node

/**
 * Registry ceiling screen.
 *
 * For every canonical intent, reads the live champion's margin `m` and its
 * `comparable_cases` N, and reports what calibration alone can still win.
 *
 * The margin the node publishes is the mean score gap over comparable fixture
 * pairs, so a scorer that separates n pairs perfectly scores exactly n/N. That
 * gives two things directly from public data:
 *
 *   - `sep = floor(N*m)` — how many pairs the champion already separates;
 *   - `target = (n+1)/N`  — the margin of a module that separates one more.
 *
 * A champion at exactly 1.0 is unbeatable: the margin cannot exceed 1. Those
 * intents are closed to everyone, permanently, and are worth no registrations.
 *
 * Usage: node screen-registry.mjs [--json]
 */

const URL = "https://devnode.telegraphprotocol.com/api/wasm";
const US = "0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e";

const response = await fetch(URL);
if (!response.ok) throw new Error(`${URL}: HTTP ${response.status}`);
const registry = await response.json();

const rows = [];
for (const [intent, block] of Object.entries(registry.intents)) {
  const champion = block.champion;
  if (!champion) continue;
  const margin = champion.eval_score;
  const cases = champion.eval.comparable_cases;
  // +1e-4 absorbs the f32 noise that makes an exact 14/15 read as 14.0000001.
  const separated = Math.floor(cases * margin + 1e-4);
  const target = (separated + 1) / cases;
  rows.push({
    intent,
    registration: champion.registration_id,
    ours: (champion.author_address || "").toLowerCase() === US,
    margin,
    cases,
    historicalRows: champion.eval.historical_rows_evaluated,
    separated,
    target,
    gain: target - margin,
    closed: margin >= 0.999999,
    pending: block.entries.filter((entry) => entry.activation_status === "pending").length,
  });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  rows.sort((a, b) => Number(a.closed) - Number(b.closed) || a.historicalRows - b.historicalRows || b.gain - a.gain);
  const pad = (value, width) => String(value).padEnd(width);
  console.log(`${pad("intent", 26)}${pad("champion", 10)}${pad("margin", 13)}${pad("N/hr", 9)}${pad("separated", 11)}${pad("target", 10)}verdict`);
  for (const row of rows) {
    const verdict = row.closed ? "CLOSED at 1.0" : row.ours ? "ours" : `open +${row.gain.toFixed(5)}`;
    console.log(
      pad(row.intent, 26) + pad(row.registration, 10) + pad(row.margin, 13) +
      pad(`${row.cases}/${row.historicalRows}`, 9) + pad(`${row.separated}/${row.cases}`, 11) +
      pad(row.target.toFixed(5), 10) + verdict,
    );
  }
  const closed = rows.filter((row) => row.closed).length;
  console.log(`\n${rows.length} intents · ${closed} closed at an unbeatable 1.0 · ${rows.filter((r) => r.ours).length} held by us`);
}
