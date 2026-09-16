#!/usr/bin/env node

/**
 * ONCHAIN_TX_LOOKUP answer-shape bench.
 *
 * Scores three answers for the same transaction under the live champion
 * (reg 642) against two REAL references rather than an authored ground truth:
 *
 *   txlens    https://telegraph-onchain-tx-lookup-miner.onrender.com
 *   veyctum   https://veyctum.splitpot.xyz
 *
 * Both cross at ~0.995 in production every epoch, which is the only thing that
 * makes them usable here. G114 killed the previous instrument for this intent
 * because `candidate-corpus.json`'s authored ground truths score txlens's real,
 * crossing answer at 0.011 -- tuning against a register the actual winner fails
 * is fitting noise. The rule G114 leaves behind is that a bench must first make
 * a known crossing competitor cross, so the reference-vs-reference row is
 * printed first and is the gate: below 0.99 there, nothing under it means
 * anything.
 *
 * The two hashes are the node's own hidden test transactions, which leaked
 * through a competitor's `failure_reason` field (the method in MEMORY.md).
 *
 * A bench is a filter, not a verdict. Only a scored epoch is a verdict, and
 * this tool claims nothing about rank.
 *
 *   node track1-miner/tools/onchain-shape-bench.mjs
 *   node track1-miner/tools/onchain-shape-bench.mjs --out path/to/bench.txt
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const CHAMPION_REL = "track2/harness/champions/onchain_tx_lookup_reg642.wasm";
const DEFAULT_OUT = join(REPO, "track1-miner/docs/evidence/rank1-build-2026-09-16/onchain/bench.txt");

const HASHES = [
  { label: "success ", hash: "0xb376975e90801e36a34432c960825a0c12a56d589a77a95aa552a7a3618678ee" },
  { label: "reverted", hash: "0xe1cd7c312e8cedad3bb8b3030703a90cb93d48d35a554082001b0e2edaa97e19" },
];

/** The node's own routed template for this intent (tools/routed-questions.json). */
const question = (hash) =>
  `Is on-chain transaction ${hash} successful (status success/ok/confirmed) or failed/pending?`;

const REFERENCES = [
  { name: "txlens", field: "answer",
    url: (h) => `https://telegraph-onchain-tx-lookup-miner.onrender.com/check-tx?tx_hash=${h}` },
  { name: "veyctum", field: "answer",
    url: (h) => `https://veyctum.splitpot.xyz/lookup?tx_hash=${h}&format=answer` },
];

/** Our deployed answer, so "before" is what the node actually scored. */
const PRODUCTION = { field: "reason", url: (h) => `https://miner-wine.vercel.app/tx-lookup?query=${h}` };

/**
 * The champions folder is gitignored, so a worktree never has a copy. Fall back
 * to the primary checkout, which is the parent of the shared .git directory.
 */
function championPath() {
  const candidates = [process.env.ONCHAIN_CHAMPION, join(REPO, CHAMPION_REL)];
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: REPO, encoding: "utf8" }).trim();
    candidates.push(join(dirname(common), CHAMPION_REL));
  } catch {
    // Not a checkout. The candidates above are all there is.
  }
  const hit = candidates.find((p) => p && existsSync(p));
  if (!hit) throw new Error(`champion wasm not found; tried: ${candidates.filter(Boolean).join(", ")}`);
  return hit;
}

async function readField(url, field) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const body = await res.json();
  const text = body?.[field];
  if (typeof text !== "string" || !text.trim()) throw new Error(`no ${field} in the reply from ${url}`);
  return text;
}

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const out = outIndex === -1 ? DEFAULT_OUT : resolve(process.argv[outIndex + 1]);

  const { loadScorer } = await import(pathToFileURL(join(REPO, "track2/harness/wasm-abi.mjs")).href);
  const scorer = await loadScorer(championPath(), "reg642");

  const { lookupTransaction, resolveChain } = await import(
    pathToFileURL(join(REPO, "track1-miner/miner/dist/onchain.js")).href);

  const lines = [];
  const say = (line) => { lines.push(line); console.log(line); };

  say(`ONCHAIN_TX_LOOKUP answer shape, champion reg642 (${championPath()})`);
  say(`sha256 ${scorer.sha256}`);
  say(`scored ${new Date().toISOString()}`);
  say("");

  for (const { label, hash } of HASHES) {
    const q = question(hash);
    const answers = {};
    for (const ref of REFERENCES) answers[ref.name] = await readField(ref.url(hash), ref.field);
    answers["ours-before"] = await readField(PRODUCTION.url(hash), PRODUCTION.field);

    // The same call the handler makes: no chain named, so the chain is defaulted
    // rather than chosen, exactly as for the query string production answered.
    const { chain, conflict, explicit } = resolveChain("", q);
    answers["ours-after"] = (await lookupTransaction(hash, chain, conflict, explicit)).reason;

    say(`## ${label}  ${hash}`);
    say(`   question: ${q}`);
    say("");
    for (const [name, text] of Object.entries(answers)) say(`   [${name}] ${text}`);
    say("");
    say("   candidate      vs txlens   vs veyctum");

    const row = (name, skip) => {
      const cells = REFERENCES.map((ref) =>
        ref.name === skip ? "        -" : scorer.score(q, answers[ref.name], answers[name]).toFixed(6).padStart(9));
      say(`   ${name.padEnd(13)} ${cells.join("  ")}`);
    };
    // Reference against reference first: this row is the gate (G114).
    for (const ref of REFERENCES) row(ref.name, ref.name);
    row("ours-before");
    row("ours-after");
    say("");
  }

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${lines.join("\n")}\n`, "utf8");
  console.log(`written to ${out}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
