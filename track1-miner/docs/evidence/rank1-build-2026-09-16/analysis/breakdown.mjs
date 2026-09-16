// Score candidates against a reference under a champion, with the module's own
// breakdown (precision/fact/answered/raw/score) when it exports one.
//   node breakdown.mjs <champion.wasm> <cases.json>
// cases.json: [{ label, question, reference, candidates: { name: text } }]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const REPO = "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph";
const { loadScorer } = await import(pathToFileURL(`${REPO}/track2/harness/wasm-abi.mjs`).href);
const scorer = await loadScorer(process.argv[2], "champ");
const cases = JSON.parse(readFileSync(process.argv[3], "utf8"));
const fmt = (v) => (v == null ? "   n/a" : v > 0.001 ? v.toFixed(4) : v.toExponential(2));
const hasBreakdown = scorer.exportNames().includes("breakdown_answer");
console.log(`exports: ${scorer.exportNames().join(",")}`);
for (const c of cases) {
  console.log(`\n=== ${c.label}`);
  console.log(`name`.padEnd(40) + " score   | precision fact answered raw");
  const all = { "reference vs itself": c.reference, ...c.candidates };
  for (const [name, text] of Object.entries(all)) {
    const s = scorer.score(c.question, c.reference, text);
    let b = null;
    if (hasBreakdown) { try { b = scorer.breakdown(c.question, c.reference, text); } catch (e) { b = null; } }
    console.log(name.padEnd(40) + " " + fmt(s).padStart(7) + (b ? ` | ${fmt(b.precision)} ${fmt(b.fact)} ${fmt(b.answered)} ${fmt(b.raw)}` : ""));
  }
}
