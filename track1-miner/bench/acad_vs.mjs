/**
 * Score the LEADER's live answers against ours, on the same frozen bench and
 * the same champion (688).
 *
 * This is the technique that cracked IP_GEOLOCATION: the competitor's endpoint
 * is public, so instead of guessing what the scorer rewards, ask the miner that
 * is winning and diff the two answers.
 *
 * scholarwire scored 0.015407 in epoch 296 to our 0.011600 — while returning
 * papers that are not even on topic ("Local Models Semantics or contextual
 * reasoning=locality+compatibility" for a transformer-models query). Its papers
 * cannot be what is scoring, because at 121 words its first title sits outside
 * the ~32-word conversion clip just as ours does. So the preamble is the whole
 * contest, and this measures whose preamble wins and by how much.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { loadScorer } = await import(pathToFileURL(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/wasm-abi.mjs").href);

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scorer = await loadScorer(`${DIR}champ_acad_688.wasm`);
const bench = JSON.parse(await readFile(`${DIR}acad_bench.json`, "utf8"));
const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");

const OURS = "https://miner-wine.vercel.app/papers";
const THEIRS = "https://telegraph-scholar.margyn.workers.dev/papers";

const ask = async (base, q) => {
  try {
    const r = await fetch(`${base}?query=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(30000) });
    const b = await r.json();
    return { text: String(b.reason ?? b.summary ?? ""), body: b };
  } catch { return { text: "", body: null }; }
};

let us = 0, them = 0, n = 0, weWin = 0;
const gaps = [];
for (const { q, gt } of bench) {
  const [a, b] = await Promise.all([ask(OURS, q), ask(THEIRS, q)]);
  if (!a.text || !b.text) continue;
  n++;
  const ca = scorer.score(q, gt, clip32(a.text));
  const cb = scorer.score(q, gt, clip32(b.text));
  us += ca; them += cb;
  if (ca >= cb) weWin++;
  else gaps.push({ q, ca, cb, ours: clip32(a.text), theirs: clip32(b.text) });
}

console.log(`\nACADEMIC_SEARCH — ours vs scholarwire, ${n} rows, champion 688, clip32\n`);
console.log(`  livecert     mean ${(us / n).toFixed(6)}`);
console.log(`  scholarwire  mean ${(them / n).toFixed(6)}`);
console.log(`  we win ${weWin}/${n}`);
console.log(`\n  epoch 296 live: scholarwire 0.015407, livecert 0.011600. Target 0.020.\n`);

// The rows where they beat us are where the shape difference lives.
for (const g of gaps.slice(0, 3)) {
  console.log(`  --- they beat us ${g.cb.toFixed(6)} vs ${g.ca.toFixed(6)}`);
  console.log(`      ours  : ${g.ours}`);
  console.log(`      theirs: ${g.theirs}`);
}
