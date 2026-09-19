#!/usr/bin/env node

/**
 * TEXT_CLASSIFICATION / SENTIMENT_ANALYSIS answer-register bench.
 *
 * Scores, under each intent's live champion, the answer our production miner
 * gives today against the answers of the miners that actually cross, and
 * against the same answer rephrased by the Groq path in src/llm.ts.
 *
 * NO HIDDEN INPUT IS AVAILABLE FOR THESE TWO INTENTS. Every competitor
 * `failure_reason` on /scores for TEXT_CLASSIFICATION and SENTIMENT_ANALYSIS
 * over epochs 288-343 is an upstream/transport error ("upstream error 400",
 * "unrecognised response type", ngrok offline); none carries a question, unlike
 * the intents G152 lists. So the inputs below are OURS, in the shapes the
 * canonical descriptions and the competitors' own manifests describe. That
 * weakens the bench: it measures register against a real crossing miner's real
 * answer, not the node's hidden ground truth.
 *
 * THE VALIDITY GATE (G114). A reference is only usable if a second independent
 * crossing miner scores >=0.98 against it under the champion. The gate is
 * printed per input and per direction, and a failing gate is labelled rather
 * than hidden: for SENTIMENT_ANALYSIS it fails almost everywhere, which is
 * itself the finding.
 *
 * A bench is a filter, not a verdict. Only a scored epoch is a verdict, and this
 * tool claims nothing about rank.
 *
 *   node --env-file=<path to .env.local> track1-miner/tools/prose-llm-bench.mjs
 *   ... --out path/to/bench.txt   --only TEXT_CLASSIFICATION
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const DEFAULT_OUT = join(REPO, "track1-miner/docs/evidence/rank-rebuild-2026-09-19/llm-phrasing/bench.txt");
const PRODUCTION = "https://miner-wine.vercel.app";

/** Champions, by the relative path the gitignored champions folder uses. */
const CHAMPIONS = {
  TEXT_CLASSIFICATION: "track2/harness/champions/text_classification_reg687.wasm",
  SENTIMENT_ANALYSIS: "track2/harness/champions/sentiment_analysis_reg646.wasm",
};

const CLASSIFY_CASES = [
  { noun: "support ticket", labels: ["billing", "technical", "account issue"],
    text: "Do not cancel my subscription; I only need to update my card." },
  { noun: "support ticket", labels: ["billing", "technical", "account issue"],
    text: "The app crashes every time I open the settings page." },
  { noun: "article", labels: ["world news", "business and finance", "science and technology", "sport"],
    text: "Researchers have sequenced the genome of a 40,000-year-old mammoth using a new extraction method." },
  { noun: "email", labels: ["spam", "not spam"],
    text: "Congratulations! You have been selected for a free iPhone. Click here to claim within 24 hours." },
  { noun: "review", labels: ["quality", "shipping", "price"],
    text: "The parcel arrived three days late and the box was crushed." },
  { noun: "headline", labels: ["politics", "sport", "technology", "health"],
    text: "A vaccine trial reported a 40 percent reduction in hospital admissions this winter." },
];

const SENTIMENT_CASES = [
  { noun: "review", text: "I just love being charged twice and ignored by support." },
  { noun: "review", text: "The product broke after one day, terrible quality." },
  { noun: "review", text: "Delivery was quick and the instructions were clear, but the battery drains fast." },
  { noun: "message", text: "The parcel arrived on Tuesday in a brown box." },
  { noun: "review", text: "Absolutely thrilled with the service, the team went out of their way to help." },
  { noun: "message", text: "I have not received my package and no one has replied to my emails." },
];

const classifyQuestion = (c) =>
  `Classify this ${c.noun} as ${c.labels.slice(0, -1).join(", ")} or ${c.labels[c.labels.length - 1]}: '${c.text}'`;
const sentimentQuestion = (c) => `What is the sentiment of this ${c.noun}: '${c.text}'`;

/** The live crossing miners, from their registered manifests (catalog yaml_url). */
const REFERENCES = {
  TEXT_CLASSIFICATION: [
    { name: "txlens", get: (c) => `https://telegraph-onchain-tx-lookup-miner.onrender.com/text-classify?text=${encodeURIComponent(c.text)}&labels=${encodeURIComponent(c.labels.join(","))}` },
    { name: "chainsight", post: ["https://hub.shadrakbessanh.me/classify", (c) => ({ query: classifyQuestion(c) })] },
  ],
  SENTIMENT_ANALYSIS: [
    { name: "txlens", get: (c) => `https://telegraph-onchain-tx-lookup-miner.onrender.com/sentiment-analyze?text=${encodeURIComponent(c.text)}` },
    { name: "chainsight", post: ["https://hub.shadrakbessanh.me/sentiment", (c) => ({ query: sentimentQuestion(c) })] },
  ],
};

const OURS_LIVE = {
  TEXT_CLASSIFICATION: (c) => `${PRODUCTION}/classify?query=${encodeURIComponent(classifyQuestion(c))}`,
  SENTIMENT_ANALYSIS: (c) => `${PRODUCTION}/sentiment?query=${encodeURIComponent(sentimentQuestion(c))}`,
};

const UA = { "user-agent": "Mozilla/5.0 (livecert-bench)", accept: "application/json" };

/** The champions folder is gitignored, so a worktree never has its own copy. */
function championPath(rel) {
  const candidates = [join(REPO, rel)];
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: REPO, encoding: "utf8" }).trim();
    candidates.push(join(dirname(common), rel));
  } catch {
    // Not a checkout; the candidate above is all there is.
  }
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) throw new Error(`champion wasm not found; tried: ${candidates.join(", ")}`);
  return hit;
}

/** The first non-empty string among the fields a miner might answer in. */
function answerOf(body) {
  for (const k of ["answer", "reason", "signal", "summary", "ai_response", "result"]) {
    if (typeof body?.[k] === "string" && body[k].trim()) return body[k].trim();
  }
  return null;
}

async function readAnswer(ref, c) {
  try {
    const res = ref.get
      ? await fetch(ref.get(c), { headers: UA, signal: AbortSignal.timeout(90_000) })
      : await fetch(ref.post[0], {
        method: "POST", headers: { ...UA, "content-type": "application/json" },
        body: JSON.stringify(ref.post[1](c)), signal: AbortSignal.timeout(90_000),
      });
    if (!res.ok) return null;
    return answerOf(await res.json());
  } catch {
    return null;
  }
}

/** Groq calls, observed by wrapping fetch so production code stays lean. */
const usage = [];
function instrument() {
  const real = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (!String(input).includes("api.groq.com")) return real(input, init);
    const model = JSON.parse(String(init?.body ?? "{}")).model ?? "?";
    const t0 = Date.now();
    const res = await real(input, init);
    const ms = Date.now() - t0;
    const clone = res.clone();
    try {
      const b = await clone.json();
      usage.push({ model, ms, status: res.status, ...(b.usage ?? {}) });
    } catch {
      usage.push({ model, ms, status: res.status });
    }
    return res;
  };
}

const pct = (xs, p) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))] : 0);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

async function main() {
  const argv = process.argv.slice(2);
  const out = argv.includes("--out") ? resolve(argv[argv.indexOf("--out") + 1]) : DEFAULT_OUT;
  const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not in the environment; run with node --env-file=<.env.local>");

  instrument();
  const { loadScorer } = await import(pathToFileURL(join(REPO, "track2/harness/wasm-abi.mjs")).href);
  const dist = (m) => pathToFileURL(join(REPO, "track1-miner/miner/dist", m)).href;
  const { phraseClassification, analyseSentimentPhrased } = await import(dist("prose-phrase.js"));

  const lines = [];
  const say = (l) => { lines.push(l); console.log(l); };

  say(`prose register bench — Groq phrasing vs production templates`);
  say(`run ${new Date().toISOString()}`);
  say(`production ${PRODUCTION}`);
  say("");
  say("Hidden inputs for these two intents do NOT leak in any competitor failure_reason");
  say("(epochs 288-343 checked); the inputs below are ours, in the canonical shapes.");
  say("");

  const summary = [];
  for (const intent of Object.keys(CHAMPIONS)) {
    if (only && intent !== only) continue;
    const scorer = await loadScorer(championPath(CHAMPIONS[intent]), intent);
    const cases = intent === "TEXT_CLASSIFICATION" ? CLASSIFY_CASES : SENTIMENT_CASES;
    const question = intent === "TEXT_CLASSIFICATION" ? classifyQuestion : sentimentQuestion;
    const refs = REFERENCES[intent];

    say(`\n${"=".repeat(78)}`);
    say(`${intent} — champion ${CHAMPIONS[intent].split("/").pop()} sha256 ${scorer.sha256}`);
    say("=".repeat(78));

    const rows = [];
    for (const c of cases) {
      const q = question(c);
      const answers = {};
      for (const r of refs) answers[r.name] = await readAnswer(r, c);
      try {
        const res = await fetch(OURS_LIVE[intent](c), { headers: UA, signal: AbortSignal.timeout(60_000) });
        answers["ours-before"] = res.ok ? answerOf(await res.json()) : null;
      } catch { answers["ours-before"] = null; }

      if (intent === "TEXT_CLASSIFICATION") {
        const got = await phraseClassification(c.noun, c.text, c.labels);
        answers["ours-after"] = got?.reason ?? null;
      } else {
        const got = await analyseSentimentPhrased(q);
        answers["ours-after"] = got?.reason ?? null;
      }

      const names = refs.map((r) => r.name);
      const gate = names.length === 2 && answers[names[0]] && answers[names[1]]
        ? Math.max(scorer.score(q, answers[names[0]], answers[names[1]]), scorer.score(q, answers[names[1]], answers[names[0]]))
        : null;

      say(`\n## ${q}`);
      for (const [n, t] of Object.entries(answers)) say(`   [${n}] ${t ?? "(no answer)"}`);
      say("");
      say(`   candidate        ${names.map((n) => `vs ${n}`.padStart(14)).join("")}`);
      const cells = (name) => names.map((n) => (answers[name] && answers[n]
        ? scorer.score(q, answers[n], answers[name]).toFixed(4) : "     -").padStart(14)).join("");
      for (const n of [...names, "ours-before", "ours-after"]) say(`   ${n.padEnd(16)}${cells(n)}`);
      say(`   gate (best direction, needs >=0.98): ${gate === null ? "n/a" : gate.toFixed(4)}${gate !== null && gate < 0.98 ? "   *** GATE FAILS ***" : ""}`);

      const scoreOf = (name) => names.map((n) => (answers[name] && answers[n] ? scorer.score(q, answers[n], answers[name]) : null)).filter((x) => x !== null);
      const min = (xs) => (xs.length ? Math.min(...xs) : null);
      rows.push({ q, gate, beforeMin: min(scoreOf("ours-before")), afterMin: min(scoreOf("ours-after")),
        beforeMax: scoreOf("ours-before").length ? Math.max(...scoreOf("ours-before")) : null,
        afterMax: scoreOf("ours-after").length ? Math.max(...scoreOf("ours-after")) : null });
    }

    say(`\n-- ${intent} summary (min / max across references)`);
    say(`   ${"input".padEnd(46)} gate    before(min/max)  after(min/max)`);
    for (const r of rows) {
      const f = (v) => (v === null ? "  -  " : v.toFixed(3));
      say(`   ${r.q.slice(0, 46).padEnd(46)} ${r.gate === null ? " -   " : r.gate.toFixed(3)}   ${f(r.beforeMin)}/${f(r.beforeMax)}      ${f(r.afterMin)}/${f(r.afterMax)}`);
    }
    const crossed = (xs) => xs.filter((v) => v !== null && v >= 0.9).length;
    summary.push({ intent, n: rows.length,
      gatePass: rows.filter((r) => r.gate !== null && r.gate >= 0.98).length,
      beforeCross: crossed(rows.map((r) => r.beforeMax)), afterCross: crossed(rows.map((r) => r.afterMax)) });
  }

  const ok = usage.filter((u) => u.status === 200);
  const lat = ok.map((u) => u.ms);
  const tok = ok.map((u) => u.total_tokens ?? 0).filter(Boolean);
  say(`\n${"=".repeat(78)}`);
  say("MODEL CALLS");
  say("=".repeat(78));
  say(`   calls ${usage.length} (ok ${ok.length}, non-200 ${usage.length - ok.length})`);
  say(`   latency  p50 ${pct(lat, 0.5)}ms   p95 ${pct(lat, 0.95)}ms   max ${Math.max(0, ...lat)}ms`);
  say(`   tokens   mean ${mean(tok).toFixed(0)}  p95 ${pct(tok, 0.95)}  (prompt ${mean(ok.map((u) => u.prompt_tokens ?? 0)).toFixed(0)}, completion ${mean(ok.map((u) => u.completion_tokens ?? 0)).toFixed(0)})`);
  for (const m of [...new Set(ok.map((u) => u.model))]) {
    const mine = ok.filter((u) => u.model === m);
    say(`   ${m.padEnd(22)} n=${String(mine.length).padStart(3)}  p50 ${pct(mine.map((u) => u.ms), 0.5)}ms  mean tokens ${mean(mine.map((u) => u.total_tokens ?? 0)).toFixed(0)}`);
  }
  const t = mean(tok) || 1;
  say("");
  say(`   Free-plan headroom per model: 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD.`);
  say(`   At ${t.toFixed(0)} tokens/call: ${Math.floor(200_000 / t)} calls/day/model on tokens, 1,000 on requests`);
  say(`   -> binding limit ${Math.min(1_000, Math.floor(200_000 / t))} calls/day/model, ${3 * Math.min(1_000, Math.floor(200_000 / t))} across the three models.`);
  say(`   Per minute: ${Math.min(30, Math.floor(8_000 / t))} calls/model, ${3 * Math.min(30, Math.floor(8_000 / t))} across three.`);

  say(`\n${"=".repeat(78)}`);
  say("SUMMARY");
  say("=".repeat(78));
  for (const s of summary) {
    say(`   ${s.intent.padEnd(22)} inputs ${s.n}  gate passes ${s.gatePass}/${s.n}  crossed(>=0.9) before ${s.beforeCross}/${s.n} -> after ${s.afterCross}/${s.n}`);
  }
  say("");
  say("A bench is a filter, not a verdict (G62). Only a scored epoch is a verdict.");

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${lines.join("\n")}\n`, "utf8");
  console.log(`\nwritten to ${out}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
