#!/usr/bin/env node

/**
 * Request-shape bench for the five intents in the 2026-09-19 rebuild's
 * `request-shapes` lane: GAME_RESULT, CURRENCY_EXCHANGE, WEATHER_CHECK,
 * TVL_LOOKUP and URL_SCAN.
 *
 * WHAT IT MEASURES. The node builds each miner's HTTP request with an LLM, so
 * what arrives is a spelling a model chose, not the one our manifest gives.
 * When a route cannot read that spelling it refuses, or answers about the wrong
 * subject, and the epoch is lost. This tool takes ONE question per intent, sends
 * it in the shape the route DOES read and in the shapes it did not, and scores
 * every answer under the intent's live champion against the answer the readable
 * shape produced. That is the band the unreadable shape falls into.
 *
 * WHAT IT DOES NOT MEASURE. The reference here is our own answer for the
 * readable shape, not an independent crossing miner's, so a row says "this shape
 * scores like a different answer to the same question" and nothing about whether
 * the answer itself is right — G114's rule. URL_SCAN carries the independent
 * check the others cannot: `proofgate-url-intelligence` and
 * `preflight-ssl-verification` both cross this intent every epoch, so their live
 * answers are scored against each other first and that row is the gate.
 *
 * A bench is a filter, not a verdict (G62). Only a scored epoch is a verdict,
 * and this tool claims nothing about rank.
 *
 *   node track1-miner/tools/request-shape-bench.mjs                   # prod vs prod
 *   node track1-miner/tools/request-shape-bench.mjs --after http://127.0.0.1:8791
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const EVIDENCE = "track1-miner/docs/evidence/rank-rebuild-2026-09-19/request-shapes";

const BEFORE = argValue("--before") ?? "https://miner-wine.vercel.app";
/** Defaults to production too, so a plain run is a pure "what does live do" read. */
const AFTER = argValue("--after") ?? BEFORE;

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : null;
}

/**
 * Per intent: the champion, the question, the shape the route reads (the
 * reference), and the shapes it did not.
 */
const INTENTS = {
  GAME_RESULT: {
    champion: "game_result_reg1265.wasm",
    path: "/game-result",
    question: "Who won the most recent Yankees game?",
    reference: { query: "Who won the Yankees vs Diamondbacks game?" },
    shapes: [
      { team: "Yankees" },
      { team1: "Yankees" },
      { teams: "Yankees vs Diamondbacks" },
      { home_team: "Yankees", away_team: "Diamondbacks" },
      { query: "Who won the most recent Yankees game?" },
    ],
  },
  CURRENCY_EXCHANGE: {
    champion: "currency_exchange_reg2945.wasm",
    path: "/convert",
    question: "What is the exchange rate from USD to JPY?",
    reference: { from: "USD", to: "JPY" },
    shapes: [
      { base: "USD", symbols: "JPY" },
      { source: "USD", target: "JPY" },
      { currency_from: "USD", currency_to: "JPY" },
      { from: "Dollar", to: "Yen" },
      { pair: "USD/JPY" },
    ],
  },
  WEATHER_CHECK: {
    champion: "wchk_tol45_reg510.wasm",
    path: "/weather-forecast",
    question: "What is the current weather in Cairo?",
    reference: { query: "What is the current weather in Cairo?" },
    shapes: [
      { location: "unknown", query: "What is the current weather in Cairo?" },
      { location: "N/A", query: "What is the current weather in Cairo?" },
      { location: "none", query: "What is the current weather in Cairo?" },
    ],
  },
  TVL_LOOKUP: {
    champion: "tvl_lookup_reg49.wasm",
    path: "/tvl",
    question: "What is the total value locked (TVL) in USD for Aave V3?",
    reference: { protocol: "Aave V3" },
    shapes: [
      { query: "What is the total value locked (TVL) in USD for Aave V3?" },
      { protocol: "Aave V3", chain: "ethereum" },
      { protocol: "Aave V3", chain: "eth" },
      { slug: "aave-v3" },
    ],
  },
  URL_SCAN: {
    champion: "url_scan_reg220.wasm",
    path: "/url-scan",
    question: "Is https://example.com safe to visit? Check it for phishing, malware and scams.",
    reference: { url: "https://example.com" },
    shapes: [
      { url: "https%3A%2F%2Fexample.com" },
      { website: "https://example.com" },
      { target: "https://example.com" },
      { target_url: "https://example.com" },
    ],
    /**
     * Two miners that cross this intent every epoch, for the validity gate.
     * Endpoint, method and field are each miner's own, from its `yaml_url` in
     * `/api/miners` (read 2026-09-19): proofgate's `/scan` is a POST to
     * `/api/miner/scan` whose `reason_field` is `answer`; preflight's
     * `/url-scan` is a GET whose `reason_field` is `reason`.
     */
    crossing: [
      { name: "proofgate", field: "answer", method: "POST",
        url: "https://proofgate-six.vercel.app/api/miner/scan",
        body: { url: "https://example.com" } },
      { name: "preflight", field: "reason",
        url: "https://preflight-ssl-verification.vercel.app/url-scan?url=https%3A%2F%2Fexample.com" },
    ],
  },
};

/** The champions folder is gitignored, so a worktree never has its own copy. */
function championPath(file) {
  const rel = `track2/harness/champions/${file}`;
  const candidates = [join(REPO, rel)];
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: REPO, encoding: "utf8" }).trim();
    candidates.push(join(dirname(common), rel));
  } catch {
    // Not a checkout. The candidate above is all there is.
  }
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) throw new Error(`champion not found; tried: ${candidates.join(", ")}`);
  return hit;
}

async function answer(base, path, params, field = "reason") {
  const target = `${base}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(target, { signal: AbortSignal.timeout(60_000) });
  const body = await res.json();
  return String(body?.[field] ?? "").replace(/\s+/g, " ").trim();
}

async function main() {
  const { loadScorer } = await import(pathToFileURL(join(REPO, "track2/harness/wasm-abi.mjs")).href);
  const stamp = new Date().toISOString();

  for (const [intent, spec] of Object.entries(INTENTS)) {
    const scorer = await loadScorer(championPath(spec.champion), intent);
    const lines = [];
    const say = (line) => { lines.push(line); console.log(line); };

    say(`${intent} request-shape bench, champion ${spec.champion}`);
    say(`sha256 ${scorer.sha256}`);
    say(`scored ${stamp}`);
    say(`question ${spec.question}`);
    say(`before ${BEFORE}`);
    say(`after  ${AFTER}`);
    say("");

    const reference = await answer(BEFORE, spec.path, spec.reference);
    say(`reference shape  ${new URLSearchParams(spec.reference)}`);
    say(`reference answer ${reference}`);
    say("");

    if (spec.crossing) {
      say("validity gate — two miners that cross this intent, scored against each other:");
      const refs = [];
      for (const c of spec.crossing) {
        try {
          const res = await fetch(c.url, {
            method: c.method ?? "GET",
            ...(c.body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(c.body) } : {}),
            signal: AbortSignal.timeout(60_000),
          });
          const body = await res.json();
          const text = String(body?.[c.field] ?? "").replace(/\s+/g, " ").trim();
          // An empty read is a broken probe, not a reference worth zero.
          if (text) refs.push({ name: c.name, text });
          else say(`  ${c.name}: no ${c.field} in the reply (HTTP ${res.status}) — not used as a reference`);
        } catch (e) {
          say(`  ${c.name}: unreachable (${e.message})`);
        }
      }
      for (const r of refs) {
        for (const other of refs) {
          if (r.name === other.name) continue;
          say(`  ${r.name} vs ${other.name}  ${scorer.score(spec.question, other.text, r.text).toFixed(6)}`);
        }
        say(`  ${r.name} vs ours       ${scorer.score(spec.question, reference, r.text).toFixed(6)}`);
      }
      say("");
    }

    say("shape                                              BEFORE     AFTER");
    for (const shape of spec.shapes) {
      const qs = String(new URLSearchParams(shape));
      const before = await answer(BEFORE, spec.path, shape);
      const after = AFTER === BEFORE ? before : await answer(AFTER, spec.path, shape);
      const b = scorer.score(spec.question, reference, before).toFixed(6).padStart(9);
      const a = scorer.score(spec.question, reference, after).toFixed(6).padStart(9);
      say(`${qs.slice(0, 50).padEnd(50)} ${b} ${a}`);
      say(`  BEFORE ${before}`);
      if (AFTER !== BEFORE) say(`  AFTER  ${after}`);
    }
    say("");

    const out = join(REPO, EVIDENCE, intent.toLowerCase(), "bench.txt");
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, `${lines.join("\n")}\n`, "utf8");
    console.log(`written to ${out}\n`);
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exit(1);
});
