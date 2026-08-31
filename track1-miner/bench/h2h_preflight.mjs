/**
 * Head-to-head: livecert vs preflight-ssl-verification, scored by the live champions.
 * Engine-shaped calls (subject param + query) to both miners on every bench row.
 * Usage: node h2h.mjs ssl|ip
 */
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const ROOT = "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph";
const { loadScorer } = await import(pathToFileURL(`${ROOT}/track2/harness/wasm-abi.mjs`).href);
const clip32 = (s) => String(s).split(/\s+/).slice(0, 32).join(" ");

const MODE = process.argv[2] ?? "ssl";
const CFG = {
  ssl: {
    wasm: `${ROOT}/track2/harness/champions/ssl_reg631.wasm`,
    bench: `${ROOT}/track1-miner/bench/ssl_bench.json`,
    us: (subj, q) => `https://miner-wine.vercel.app/ssl-check?domain=${encodeURIComponent(subj)}&query=${encodeURIComponent(q)}`,
    them: (subj, q) => `https://preflight-ssl-verification.vercel.app/ssl-check?domain=${encodeURIComponent(subj)}&query=${encodeURIComponent(q)}`,
    subject: (q) => q.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b/i)?.[1] ?? "",
  },
  ip: {
    wasm: `${ROOT}/track2/harness/champions/ipgeo_reg630.wasm`,
    bench: `${ROOT}/track1-miner/bench/ip_bench.json`,
    us: (subj, q) => `https://miner-wine.vercel.app/ip-geolocate?ip=${encodeURIComponent(subj)}&query=${encodeURIComponent(q)}`,
    them: (subj, q) => `https://preflight-ssl-verification.vercel.app/ip-geolocation?ip=${encodeURIComponent(subj)}&query=${encodeURIComponent(q)}`,
    subject: (q) =>
      q.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/)?.[1] ??
      q.match(/\b([0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7})\b/i)?.[1] ?? "",
  },
}[MODE];

const scorer = await loadScorer(CFG.wasm);
const raw = JSON.parse(await readFile(CFG.bench, "utf8"));
const rows = Array.isArray(raw) ? raw : Object.values(raw)[0];

const get = async (url) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    return await r.json();
  } catch (e) {
    return { reason: null, _err: String(e).slice(0, 80) };
  }
};

const out = [];
let usTot = 0, themTot = 0, usCross = 0, themCross = 0, usWins = 0, n = 0;
for (const { q, gt } of rows) {
  const subj = CFG.subject(q);
  if (!subj) { console.log("  [skip: no subject] " + q.slice(0, 60)); continue; }
  const [us, them] = await Promise.all([get(CFG.us(subj, q)), get(CFG.them(subj, q))]);
  if (!us.reason || !them.reason) {
    console.log(`  [skip: missing reason us=${!!us.reason} them=${!!them.reason}] ${subj}`);
    continue;
  }
  n++;
  const usC = scorer.score(q, gt, clip32(us.reason));
  const themC = scorer.score(q, gt, clip32(them.reason));
  usTot += usC; themTot += themC;
  if (usC > 0.5) usCross++;
  if (themC > 0.5) themCross++;
  if (usC > themC) usWins++;
  const flag = usC > themC ? "WIN " : usC === themC ? "TIE " : "LOSS";
  console.log(`  ${flag} us=${usC.toFixed(6)} them=${themC.toFixed(6)} ${subj.padEnd(24)} ${q.slice(0, 55)}`);
  out.push({ q, gt, subject: subj, us, them, usClip: usC, themClip: themC });
}
console.log(`\n${MODE.toUpperCase()} head-to-head over ${n} rows (clip32 of reason, live champion):`);
console.log(`  livecert  mean ${(usTot / n).toFixed(6)}  crossings ${usCross}/${n}  row-wins ${usWins}/${n}`);
console.log(`  preflight mean ${(themTot / n).toFixed(6)}  crossings ${themCross}/${n}`);
await writeFile(
  `C:/Users/hyada/AppData/Local/Temp/claude/C--Users-hyada-OneDrive-Documents-Work-Related-Hackathons-Telegraph/52ada15e-eaac-4a36-8678-a2a40be870d0/scratchpad/h2h-${MODE}.json`,
  JSON.stringify(out, null, 1),
);
console.log(`saved h2h-${MODE}.json`);
