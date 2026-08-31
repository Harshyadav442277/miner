/**
 * Does /ip-geolocate need the restatement? Epoch 296 says yes, loudly.
 *
 * Epoch 295: livecert #1 at 0.9955636.
 * Epoch 296: livecert #4 at 0.0106, preflight #1 at 0.9939274.
 *
 * Those two numbers are the two sides of this scorer's cliff, and nothing about
 * our geolocation DATA changed between them. GAPS G35 recorded the mechanism
 * before the collapse: /ip-geolocate is the only route that reuses its subject
 * parameter as the question it restates —
 *
 *   const q = firstValue(url, "ip", "address", "query", ...)
 *
 * so when the engine fills the REQUIRED `ip` parameter, `q` is the bare string
 * "8.8.8.8" and sendAnswer restates against that instead of the question,
 * which drops the prefix entirely.
 *
 * This scores our live answer with and without the prefix against champion 630.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { loadScorer } = await import(pathToFileURL(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/wasm-abi.mjs").href);

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scorer = await loadScorer(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/champions/ipgeo_reg630.wasm");
const bench = JSON.parse(await readFile(`${DIR}ip_bench.json`, "utf8"));
const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");

/** Mirrors restate.ts closely enough for an A/B on the prefix alone. */
function restated(q, reason) {
  const stripped = String(q).replace(/[?.!]+\s*$/, "").trim();
  const head = stripped.charAt(0).toLowerCase() + stripped.slice(1);
  return `Regarding ${head}: ${reason}`;
}

let withN = 0, withoutN = 0, n = 0, crossWith = 0, crossWithout = 0;
const flips = [];
// Epoch 296 asked about 8.8.8.8 and we scored 0.0106 while preflight and txlens
// scored 0.993; epoch 295 asked about a TEST-NET address and we scored 0.9956.
// So split the bench the same way rather than averaging the two regimes.
const isSpecial = (ip) => {
  const [a,b] = ip.split('.').map(Number);
  return a===10 || a===127 || (a===172&&b>=16&&b<=31) || (a===192&&b===168) ||
         (a===192&&b===0) || (a===198&&b===51) || (a===203&&b===0) ||
         (a===169&&b===254) || (a===100&&b>=64&&b<=127) || a>=224;
};
const SPLIT = { special: {n:0,s:0,x:0}, public: {n:0,s:0,x:0} };

for (const row of bench) {
  const q = row.q ?? row.question;
  const gt = row.gt ?? row.ground_truth;
  if (!q || !gt) continue;
  const ip = (q.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/) ?? [])[0];
  if (!ip) continue;
  let body;
  try {
    // Ask the way the ENGINE does when it fills the declared `ip` parameter:
    // this is the call that loses the prefix in production today.
    body = await (await fetch(
      `https://miner-wine.vercel.app/ip-geolocate?ip=${encodeURIComponent(ip)}`,
      { signal: AbortSignal.timeout(30000) })).json();
  } catch { continue; }
  if (!body?.reason) continue;
  n++;
  const bare = body.reason;                    // what production sends today
  const pref = restated(q, body.reason);       // what it sends when `query` is filled
  const a = scorer.score(q, gt, clip32(bare));
  const b = scorer.score(q, gt, clip32(pref));
  withoutN += a; withN += b;
  if (a > 0.5) crossWithout++;
  if (b > 0.5) crossWith++;
  if (b > a + 0.4) flips.push(`  ${ip.padEnd(16)} ${a.toFixed(6)} -> ${b.toFixed(6)}`);
  const g = isSpecial(ip) ? SPLIT.special : SPLIT.public;
  g.n++; g.s += a; if (a > 0.5) g.x++;
  if (!isSpecial(ip)) console.log(`  PUBLIC ${ip.padEnd(16)} clip32 ${a.toFixed(6)}  ${q.slice(0,52)}`);
}

console.log(`\nIP_GEOLOCATION restatement A/B — ${n} rows, champion 630, clip32\n`);
console.log(`  without prefix (production today, when the engine fills 'ip'):`);
console.log(`     mean ${(withoutN / n).toFixed(6)}   crossings ${crossWithout}/${n}`);
console.log(`  with prefix (what it sends when 'query' is filled):`);
console.log(`     mean ${(withN / n).toFixed(6)}   crossings ${crossWith}/${n}`);
if (flips.length) {
  console.log(`\n  rows the prefix rescues:`);
  for (const f of flips) console.log(f);
}
console.log(`\n  epoch 295 livecert 0.9955636 (#1) -> epoch 296 0.0106 (#4), preflight 0.9939274.`);
