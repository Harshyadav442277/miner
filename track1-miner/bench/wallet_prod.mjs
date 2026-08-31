/**
 * Score PRODUCTION's actual wallet answers against the frozen bench.
 * wallet_sweep.mjs rebuilds sentences from balance_eth, so it cannot see the
 * malformed-address or historical-date branches; this asks the endpoint.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { loadScorer } = await import(pathToFileURL(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/wasm-abi.mjs").href);
const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scorer = await loadScorer(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/champions/wallet_reg1066.wasm");
const raw = JSON.parse(await readFile(`${DIR}bench_WALLET_BALANCE_CHECK.json`, "utf8"));
const rows = Array.isArray(raw) ? raw : Object.values(raw)[0];
const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");
let tot = 0, cross = 0, n = 0;
for (const r of rows) {
  const q = r.q ?? r.question, gt = r.gt ?? r.ground_truth;
  if (!q || !gt) continue;
  let b;
  try {
    b = await (await fetch(`https://miner-wine.vercel.app/wallet-balance?query=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(30000) })).json();
  } catch { continue; }
  if (!b?.reason) continue;
  const c = scorer.score(q, gt, clip32(b.reason));
  tot += c; n++; if (c > 0.5) cross++;
  console.log(`  ${c.toFixed(6)}  ${q.slice(0, 74)}`);
}
console.log(`\nPRODUCTION wallet answers — ${n} rows, champion 1066, clip32`);
console.log(`  mean ${(tot / n).toFixed(6)}   crossings ${cross}/${n}`);
console.log(`  (rebuilt-sentence baseline before today's branches: 0.298, 3/10)`);
