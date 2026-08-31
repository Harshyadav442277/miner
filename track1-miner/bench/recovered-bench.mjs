#!/usr/bin/env node
/**
 * Score our production answers against RECOVERED score receipts.
 *
 * GAPS G24 removed `question`, `ground_truth` and `converted_answer` from the
 * public feed, which froze every bench in this repo. A competitor's public
 * repository retained 1,056 receipts captured before that change
 * (github.com/shreshth006/Preflight, fixtures/live/scored-receipts.json) — these
 * are public protocol records, not their implementation, and they restore the
 * measurement G24 took away for the intents they cover:
 *
 *   WALLET_BALANCE_CHECK  85 receipts / 16 distinct questions   (our own bench: 13)
 *   IP_GEOLOCATION        29 receipts                           (our own bench: 21)
 *   SSL_VERIFICATION      64 receipts                           (our own bench: 12)
 *
 * They also carry `converted_answer`, so for the first time the ~32-word text
 * the scorer actually reads can be inspected rather than approximated. One
 * receipt is worth quoting because it overturns an assumption:
 *
 *   Q     malformed 41-hex placeholder, on Arbitrum
 *   GT    "...currently has a native-coin balance of **0 ETH** on Arbitrum"
 *   CONV  "This data shows that the Ethereum address ... has a balance of
 *          0.0091 ETH on the Arbitrum network as of August 26, 2026."
 *   score 0.99199706
 *
 * The winning answer reported 0.0091 ETH where the truth says 0, and still
 * crossed. **The figure is not what is scored** — the shape and the identifiers
 * are. That is consistent with precision-weighted token scoring and with our own
 * finding that balance formatting moved nothing (G44).
 *
 *   node track1-miner/bench/recovered-bench.mjs <path-to-scored-receipts.json> [intent]
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { loadScorer } = await import(pathToFileURL(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/wasm-abi.mjs").href);

const RECEIPTS = process.argv[2];
const ONLY = process.argv[3];
if (!RECEIPTS) {
  console.error("usage: recovered-bench.mjs <scored-receipts.json> [INTENT]");
  process.exit(2);
}

const CHAMPIONS = "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/champions";
const INTENTS = {
  // Champion rotated 2026-08-31T05:58Z: reg 2575 is reg 1066 with score² applied
  // (GAPS G52). Re-download: /api/wasm?intent=WALLET_BALANCE_CHECK -> wasm_url.
  WALLET_BALANCE_CHECK: { wasm: `${CHAMPIONS}/wallet_reg2575.wasm`, path: "/wallet-balance" },
  IP_GEOLOCATION: { wasm: `${CHAMPIONS}/ipgeo_reg630.wasm`, path: "/ip-geolocate" },
};

const all = JSON.parse(await readFile(RECEIPTS, "utf8"));
const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");

for (const [intent, cfg] of Object.entries(INTENTS)) {
  if (ONLY && ONLY !== intent) continue;
  const rows = all.filter((r) => r.intent === intent);
  if (!rows.length) continue;

  // One row per distinct question; keep the best score anyone achieved on it,
  // which is the bar we actually have to clear.
  const byQ = new Map();
  for (const r of rows) {
    const prev = byQ.get(r.question);
    if (!prev || r.score > prev.best) {
      byQ.set(r.question, { question: r.question, gt: r.ground_truth, best: r.score, by: r.miner });
    }
  }
  const scorer = await loadScorer(cfg.wasm);
  let mine = 0, cross = 0, beatBar = 0, n = 0;
  const losses = [];

  for (const q of byQ.values()) {
    let ans = "";
    try {
      const r = await fetch(
        `https://miner-wine.vercel.app${cfg.path}?query=${encodeURIComponent(q.question)}`,
        { signal: AbortSignal.timeout(30000) },
      );
      ans = (await r.json()).reason ?? "";
    } catch { /* counted as a miss */ }
    if (!ans) { console.log(`  (no answer) ${q.question.slice(0, 60)}`); continue; }
    const s = scorer.score(q.question, q.gt, clip32(ans));
    mine += s; n++;
    if (s > 0.5) cross++;
    if (s >= q.best) beatBar++;
    else losses.push({ q: q.question, mine: s, best: q.best, by: q.by });
  }

  console.log(`\n=== ${intent} — ${n} distinct recovered questions`);
  console.log(`  our mean        ${(mine / n).toFixed(6)}`);
  console.log(`  our crossings   ${cross}/${n}`);
  console.log(`  we match/beat the best recorded answer on ${beatBar}/${n}`);
  if (losses.length) {
    console.log(`  where we trail the best recorded answer:`);
    for (const l of losses.sort((a, b) => (b.best - b.mine) - (a.best - a.mine)).slice(0, 6)) {
      console.log(`    ours ${l.mine.toFixed(6)}  best ${l.best.toFixed(6)} (${l.by})`);
      console.log(`      ${l.q.slice(0, 100)}`);
    }
  }
}
