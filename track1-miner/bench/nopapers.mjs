/**
 * What does "no papers found" actually cost, versus an answer that lists
 * papers? The papers themselves fall OUTSIDE the ~32-word clip, so the question
 * is really whether the preamble survives — and the two preambles differ.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { loadScorer } = await import(pathToFileURL(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/wasm-abi.mjs").href);
const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scorer = await loadScorer(`${DIR}champ_acad_688.wasm`);
const bench = JSON.parse(await readFile(`${DIR}acad_bench.json`, "utf8"));
const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");
const strip = (q) => q.replace(/[?.!]+\s*$/, "").trim();
const head = (q) => { const s = strip(q); return s.charAt(0).toLowerCase() + s.slice(1); };

let withP = 0, none = 0, n = 0;
for (const { q, gt } of bench) {
  const topic = "the requested topic";
  // The two shapes, built identically apart from the clause that differs.
  const listed = `Regarding ${head(q)}: Here are 5 peer-reviewed papers on ${topic}: 1) A Paper Title by A Author (2024), cited 12 times. 2) Another Paper (2023), cited 8 times.`;
  const empty = `Regarding ${head(q)}: No peer-reviewed papers on ${topic} were found for the requested period.`;
  withP += scorer.score(q, gt, clip32(listed));
  none += scorer.score(q, gt, clip32(empty));
  n++;
}
console.log(`\nACADEMIC — cost of an empty result, ${n} rows, clip32`);
console.log(`  answer listing papers   mean ${(withP / n).toFixed(6)}`);
console.log(`  "no papers were found"  mean ${(none / n).toFixed(6)}`);
console.log(`  ratio ${(none / withP).toFixed(3)}`);
