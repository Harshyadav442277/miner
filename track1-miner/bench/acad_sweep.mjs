/**
 * ACADEMIC_SEARCH answer-shape sweep, scored by the live champion (688).
 *
 * Production currently crosses 0 of 22 rows after the 32-word conversion clip.
 * The hypothesis under test: our restatement echoes the question VERBATIM, and
 * these questions are long ("Find papers published in 2023 in the field of
 * 'artificial intelligence' that mention 'transformer models' in their
 * abstract, returning only the paper title, year, and citation count, limited
 * to 10 results" is 33 words), so the clip can contain nothing but the
 * restatement — no paper ever reaches the scorer.
 *
 * Ground truths open with a compact paraphrase and get to paper 1 fast:
 *   "Here are 10 papers published in 2023 in the field of artificial
 *    intelligence mentioning transformer models in their abstracts, including
 *    title, year, and citation count where available: 1. Transformer models:
 *    an introduction and catalog (2023) - Cited by 352..."
 *
 * Variants are rendered from the SAME live paper data, so only the shape
 * differs — no variant gets an unfair data advantage.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { loadScorer } = await import(pathToFileURL(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/wasm-abi.mjs").href);

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scorer = await loadScorer(`${DIR}champ_acad_688.wasm`);
const bench = JSON.parse(await readFile(`${DIR}acad_bench.json`, "utf8"));
const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");

const cite = (p) => (p.citations != null ? ` - Cited by ${p.citations}` : "");
const authors = (p) => (p.authors?.length ? ` by ${p.authors.join(", ")}` : "");

/** Every variant is built from the same `papers` array. */
const VARIANTS = {
  // What production sends today: full verbatim restatement, then prose entries.
  deployed: (q, ps, r) => r,

  // No restatement at all — papers start immediately.
  bare: (q, ps) =>
    `Here are ${ps.length} papers: ` +
    ps.map((p, i) => `${i + 1}. ${p.title} (${p.year ?? "n.d."})${cite(p)}`).join(" "),

  // The ground truth's own opening formula, compact, then straight to paper 1.
  gtShape: (q, ps) =>
    `Here are ${ps.length} papers matching this search, including title, year, and citation ` +
    `count where available: ` +
    ps.map((p, i) => `${i + 1}. ${p.title} (${p.year ?? "n.d."})${cite(p)}`).join(" "),

  // Same, but echoing the topic so some question vocabulary survives the clip.
  gtShapeTopic: (q, ps, r, topic) =>
    `Here are ${ps.length} papers on ${topic}, including title, year, and citation count ` +
    `where available: ` +
    ps.map((p, i) => `${i + 1}. ${p.title} (${p.year ?? "n.d."})${cite(p)}`).join(" "),

  // Keep authors, which the deployed answer includes and the GT sometimes does.
  gtShapeAuthors: (q, ps, r, topic) =>
    `Here are ${ps.length} papers on ${topic}, including title, year, and citation count ` +
    `where available: ` +
    ps.map((p, i) => `${i + 1}. ${p.title}${authors(p)} (${p.year ?? "n.d."})${cite(p)}`).join(" "),

  // Title-first, no preamble at all: maximum content inside the budget.
  titlesFirst: (q, ps) =>
    ps.map((p, i) => `${i + 1}. ${p.title} (${p.year ?? "n.d."})${cite(p)}`).join(" "),
};

const totals = {}, wins = {}, crossings = {};
for (const k of Object.keys(VARIANTS)) { totals[k] = { raw: 0, clip: 0 }; wins[k] = 0; crossings[k] = 0; }
let n = 0;

for (const { q, gt } of bench) {
  let body;
  try {
    const r = await fetch(`https://miner-wine.vercel.app/papers?query=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(30000) });
    body = await r.json();
  } catch { console.log(`  skip (fetch failed): ${q.slice(0, 50)}`); continue; }
  const ps = body.papers ?? [];
  if (!ps.length || !body.reason) { console.log(`  skip (no papers): ${q.slice(0, 50)}`); continue; }
  const topic = body.topic || "this topic";
  n++;

  const scores = {};
  for (const [name, render] of Object.entries(VARIANTS)) {
    const text = render(q, ps, body.reason, topic);
    const raw = scorer.score(q, gt, text);
    const clip = scorer.score(q, gt, clip32(text));
    totals[name].raw += raw; totals[name].clip += clip;
    if (clip > 0.5) crossings[name]++;
    scores[name] = clip;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  wins[best]++;
}

console.log(`\nACADEMIC_SEARCH — ${n} rows, champion 688, clip32 is the column that matches live\n`);
console.log("  variant           raw mean    clip32 mean   best-on   crossings");
for (const k of Object.keys(VARIANTS)) {
  console.log(
    `  ${k.padEnd(16)}  ${(totals[k].raw / n).toFixed(6)}    ${(totals[k].clip / n).toFixed(6)}` +
    `      ${String(wins[k]).padStart(3)}       ${crossings[k]}/${n}`,
  );
}
