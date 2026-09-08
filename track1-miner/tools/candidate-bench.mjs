#!/usr/bin/env node
/**
 * Score candidate answer shapes for an intent we do NOT yet serve, against that
 * intent's live champion WASM.
 *
 *   node track1-miner/tools/candidate-bench.mjs ONCHAIN_TX_LOOKUP
 *   node track1-miner/tools/candidate-bench.mjs            # every intent in the corpus
 *
 * WHAT THIS IS NOT
 * ----------------
 * `/scores` has published no `question`, `ground_truth` or `converted_answer`
 * since 2026-08-30 (GAPS G24), and the explorer's question feed is returning
 * 522. For an intent we do not serve there is therefore no corpus of real
 * questions and no real ground truths whatsoever.
 *
 * So every ground truth in `candidate-corpus.json` is one WE WROTE. A number
 * printed here answers "how does this scorer treat this answer against a
 * plausible ground truth" — it is NOT a reproduction of any epoch's scoring and
 * must never be reported as one. Each case carries several ground truths in
 * different registers precisely because no single authored one is authoritative:
 * a shape that only wins against one register has not been shown to generalise.
 *
 * WHAT IT IS FOR
 * --------------
 * Two things it genuinely establishes:
 *   1. Champion currency — `--verify` reproduces the live score distribution for
 *      an intent. If the local module no longer produces the bands the network
 *      is producing, the champion has been replaced and every other number here
 *      is void. Run it first.
 *   2. Relative ranking of answer SHAPES under the real scoring function. That
 *      a complete receipt scores 0.9999 and a receipt missing one field scores
 *      0.01 is a property of the scorer, not of our authored ground truth, and
 *      it survives rewording the ground truth.
 *
 * The `clip32` column exists because Telegraph scores an LLM summary of the
 * whole payload in roughly 32 words, not our raw text. Neither column is that
 * summary; clip32 is the closer proxy and the one to read.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TOOLS = dirname(fileURLToPath(import.meta.url));
const REPO = join(TOOLS, "..", "..");
const CHAMPS = join(REPO, "track2", "harness", "champions");
const NODE = "https://devnode.telegraphprotocol.com";

const { loadScorer } = await import(pathToFileURL(join(REPO, "track2", "harness", "wasm-abi.mjs")).href);

const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");
const fmt = (v) => (v > 0.001 ? v.toFixed(6) : v.toExponential(3));

/** Champion metadata straight from the node — never cached, so a replaced champion is visible. */
async function champion(intent) {
  const r = await fetch(`${NODE}/api/wasm?intent=${intent}`, { signal: AbortSignal.timeout(45_000) });
  if (!r.ok) throw new Error(`/api/wasm?intent=${intent} -> HTTP ${r.status}`);
  const c = (await r.json()).intents?.[intent]?.champion;
  if (!c) throw new Error(`${intent}: no champion registered`);
  return c;
}

/**
 * The declared `wasm_hash` is NOT a sha256 of the bytes the URL serves — that
 * holds for modules this repo has used successfully for weeks, so it is a
 * property of the field, not evidence of a wrong file. Identity is therefore
 * established behaviourally by `--verify`, and the registration id is pinned in
 * the filename so a champion swap shows up as a missing file rather than as a
 * silently different number.
 */
async function scorerFor(intent) {
  const c = await champion(intent);
  const path = join(CHAMPS, `${intent.toLowerCase()}_reg${c.registration_id}.wasm`);
  if (!existsSync(path)) {
    process.stderr.write(`  fetching champion reg ${c.registration_id} for ${intent}…\n`);
    const r = await fetch(c.wasm_url, { signal: AbortSignal.timeout(180_000) });
    if (!r.ok) throw new Error(`${c.wasm_url} -> HTTP ${r.status}`);
    await mkdir(CHAMPS, { recursive: true });
    await writeFile(path, Buffer.from(await r.arrayBuffer()));
  }
  return { scorer: await loadScorer(path, `${intent}#${c.registration_id}`), reg: c.registration_id };
}

/** Live score bands, to compare a local run against. */
async function liveBands(intent) {
  const r = await fetch(`${NODE}/scores?intent=${intent}`, { signal: AbortSignal.timeout(45_000) });
  const rows = (await r.json()).scores ?? [];
  const byEpoch = new Map();
  for (const row of rows) (byEpoch.get(row.epoch_id) ?? byEpoch.set(row.epoch_id, []).get(row.epoch_id)).push(row.score);
  return [...byEpoch.entries()]
    .sort((a, b) => b[0] - a[0]).slice(0, 6)
    .map(([e, v]) => { const s = v.sort((a, b) => b - a); return { epoch: e, top: s[0], rest: s.slice(1) }; });
}

const corpus = JSON.parse(await readFile(join(TOOLS, "candidate-corpus.json"), "utf8"));
const wanted = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const verify = process.argv.includes("--verify");
const intents = wanted.length ? wanted : Object.keys(corpus);

for (const intent of intents) {
  const cases = corpus[intent];
  if (!cases) { console.error(`${intent}: not in candidate-corpus.json`); process.exitCode = 1; continue; }
  const { scorer, reg } = await scorerFor(intent);
  console.log(`\n===== ${intent}  (champion reg ${reg}, ${cases.length} cases) =====`);

  if (verify) {
    console.log("  live bands (top | rest):");
    for (const b of await liveBands(intent)) {
      console.log(`    e${b.epoch}  ${fmt(b.top)}  |  ${fmt(Math.max(...b.rest))}..${fmt(Math.min(...b.rest))}`);
    }
  }

  // Aggregate each shape across every case AND every ground-truth register, so
  // a shape that only wins against one authored phrasing cannot look general.
  const byShape = new Map();
  for (const c of cases) {
    for (const [gtName, gt] of Object.entries(c.ground_truths)) {
      for (const [shape, answer] of Object.entries(c.answers)) {
        const raw = scorer.score(c.question, gt, answer);
        const cl = scorer.score(c.question, gt, clip32(answer));
        const agg = byShape.get(shape) ?? { raw: [], clip: [], crossed: 0, n: 0 };
        agg.raw.push(raw); agg.clip.push(cl); agg.n += 1;
        if (cl > 0.5) agg.crossed += 1;
        byShape.set(shape, agg);
        if (process.env.BENCH_VERBOSE === "1") {
          console.log(`    ${c.id}/${gtName}/${shape}: raw ${fmt(raw)} clip32 ${fmt(cl)}`);
        }
      }
    }
  }
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  console.log(`  ${"shape".padEnd(34)} ${"clip32 mean".padStart(13)} ${"raw mean".padStart(13)}   crossed`);
  for (const [shape, a] of [...byShape].sort((x, y) => mean(y[1].clip) - mean(x[1].clip))) {
    console.log(`  ${shape.padEnd(34)} ${fmt(mean(a.clip)).padStart(13)} ${fmt(mean(a.raw)).padStart(13)}   ${a.crossed}/${a.n}`);
  }
}
console.log("\nAuthored ground truths — a proxy for scorer behaviour, not a reproduction of any epoch.");
