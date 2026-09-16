/**
 * URL_SCAN answer-SHAPE bench, against competitors' live answers.
 *
 * THE QUESTION. Our live URL_SCAN scores sit in a 0.84-0.97 band (epochs
 * 329-334) while two or three miners cross at ~0.99 every epoch. Is the gap the
 * SHAPE of our sentence -- the sourcing clause, the verdict word's position, the
 * normalised URL -- or is it something the shape cannot reach?
 *
 * THE INSTRUMENT, and why it needs validating first. G24 withholds the node's
 * ground truths, so there is nothing to score against except another miner's
 * answer. G114 and G128 are what happens when that step is skipped: twice an
 * authored ground truth made our answer look good and made the miner that
 * actually crosses look terrible, and both benches were thrown away. So this
 * tool refuses to report an ours-vs-reference number until the references have
 * agreed with EACH OTHER under the same champion. If miners that all cross at
 * ~0.99 in production score each other below 0.98 here, the champion is not
 * rewarding the thing they have in common and no candidate text measured against
 * them means anything.
 *
 * G130's rule applies to the candidate side: what is scored is the text
 * PRODUCTION emits, fetched live, not a local reconstruction of it. Variants are
 * edits of that fetched text, and every edit only ever removes or reorders a
 * clause -- no variant may state a fact the deployed build did not check.
 *
 *   node track1-miner/tools/urlscan-shape-bench.mjs             # score saved refs
 *   node track1-miner/tools/urlscan-shape-bench.mjs --collect   # re-fetch them first
 *
 * The suspicious host in question 3 is never fetched by this tool. It only ever
 * appears inside a question string handed to a miner.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const here = (rel) => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const REFS = argValue("--refs") ?? here("../docs/evidence/rank1-build-2026-09-16/urlscan/refs");
const CHAMPION = argValue("--champion") ?? here("../../track2/harness/champions/url_scan_reg220.wasm");
/** Two leaders must agree this well before either is trusted as a reference. */
const VALIDATION_FLOOR = 0.98;

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : null;
}

export const QUESTIONS = [
  { id: "q1", url: "https://example.com", text: "Scan https://example.com for phishing and malware indicators." },
  { id: "q2", url: "https://github.com", text: "Is https://github.com safe to visit?" },
  { id: "q3", url: "http://paypa1-secure-login.com", text: "Is http://paypa1-secure-login.com safe?" },
];

/**
 * The three miners that cross at ~0.99, plus ours. Endpoints and reason fields
 * are the catalog's own (`/api/miners`: base_url, endpoints, signal_mapping),
 * read 2026-09-16, and cross-checked against each manifest (saved beside the
 * refs). `reasonField` is the field the node summarises.
 *
 * Each call carries the parameter the node itself sends, so what comes back is
 * the answer the node would get: netwire's manifest binds only `url`
 * (`query_params: url: { source: strings.0 }`), proofgate requires `url` in a
 * POST body and takes `question` optionally, preflight's /url-scan reads `url`.
 * The extra free-text parameter is passed where the schema documents one; it
 * cannot make an answer less faithful than the node's.
 */
export const MINERS = [
  {
    id: "preflight", slug: "preflight-ssl-verification", role: "reference", reasonField: "reason",
    build: (q) => ({ method: "GET", url: `https://preflight-ssl-verification.vercel.app/url-scan?url=${encodeURIComponent(q.url)}&query=${encodeURIComponent(q.text)}` }),
  },
  {
    id: "netwire", slug: "netwire-url-scan", role: "reference", reasonField: "summary",
    build: (q) => ({ method: "GET", url: `https://telegraph-net.margyn.workers.dev/url-scan?question=${encodeURIComponent(q.text)}&url=${encodeURIComponent(q.url)}` }),
  },
  {
    id: "proofgate", slug: "proofgate-url-intelligence", role: "reference", reasonField: "answer",
    build: (q) => ({ method: "POST", url: "https://proofgate-six.vercel.app/scan", body: JSON.stringify({ url: q.url, question: q.text }) }),
  },
  {
    id: "ours", slug: "livecert", role: "candidate", reasonField: "reason",
    build: (q) => ({ method: "GET", url: `https://miner-wine.vercel.app/url-scan?query=${encodeURIComponent(q.text)}` }),
  },
];

// ---------------------------------------------------------------------------
// Shape edits. Each removes or moves a clause of the FETCHED production text.
// None adds a word of fact. `changed` is reported so a no-op is never presented
// as a measured variant.
// ---------------------------------------------------------------------------

const SOURCING = /\bIt is not blocked by [^.]*?URLhaus,\s*(?:and|but)\s*/;
const LOOKALIKE = /,\s*and no lookalike markers? (?:were|was) found/;
const CAVEAT = /\s*No blocklist can prove a site safe\./;
const TLS_OK = /\s*It serves a valid TLS certificate that matches the host\./;
const VERDICT_OPENER = /^(?:Yes|No),\s*/;

/**
 * Capitalise a sentence that lost its opening clause. Only a full stop counts:
 * production writes lowercase after its colons and semicolons, and a variant
 * must not quietly restyle a clause it was not asked to remove. A URL that ends
 * up starting a sentence is left alone for the same reason --
 * "Https://example.com/" is not a string the deployed build ever serves.
 */
const recase = (text) =>
  text.replace(/(^|\.\s+)([a-z])(?![a-z0-9+.-]*:\/\/)/g, (_m, lead, letter) => `${lead}${letter.toUpperCase()}`)
    .replace(/\s{2,}/g, " ")
    .trim();

/** The verdict word the answer already commits to, read from its own prose. */
function verdictWord(text) {
  if (/\bis unsafe\b/.test(text)) return "Unsafe";
  if (/\bis suspicious\b/.test(text)) return "Suspicious";
  if (/\bappears safe\b/.test(text)) return "Safe";
  if (/\bcannot be visited\b/.test(text)) return "Unreachable";
  return null;
}

export const VARIANTS = [
  { id: "prod", note: "as production serves it", apply: (t) => t },
  { id: "drop-sourcing", note: "no Cloudflare/URLhaus sourcing clause", apply: (t) => recase(t.replace(SOURCING, "")) },
  { id: "drop-lookalike", note: 'no "no lookalike markers were found"', apply: (t) => recase(t.replace(LOOKALIKE, "")) },
  { id: "drop-caveat", note: 'no "No blocklist can prove a site safe."', apply: (t) => recase(t.replace(CAVEAT, "")) },
  { id: "verdict-first", note: "verdict word leads the sentence", apply: (t) => (verdictWord(t) ? recase(`${verdictWord(t)}. ${t.replace(VERDICT_OPENER, "")}`) : t) },
  { id: "url-as-asked", note: "URL as the question wrote it, not normalised", apply: (t, q) => t.split(`${q.url}/`).join(q.url) },
  { id: "url-bare-host", note: "bare host in place of the URL", apply: (t, q) => t.split(`${q.url}/`).join(new URL(q.url).hostname).split(q.url).join(new URL(q.url).hostname) },
  { id: "lean", note: "drop sourcing + lookalike + caveat", apply: (t) => recase(t.replace(LOOKALIKE, "").replace(SOURCING, "").replace(CAVEAT, "")) },
  { id: "lean-verdict-first", note: "lean, verdict word leading", apply: (t) => { const lean = recase(t.replace(LOOKALIKE, "").replace(SOURCING, "").replace(CAVEAT, "")); const w = verdictWord(lean); return w ? recase(`${w}. ${lean.replace(VERDICT_OPENER, "")}`) : lean; } },
  { id: "first-sentence", note: "the verdict sentence alone (shortest)", apply: (t) => `${t.split(/(?<=\.)\s+/)[0] ?? t}` },
  { id: "no-tls-note", note: "drop the valid-certificate sentence", apply: (t) => recase(t.replace(TLS_OK, "")) },
  { id: "verdict-first-full", note: "verdict word prepended, nothing removed (longest)", apply: (t) => (verdictWord(t) ? `${verdictWord(t)}. ${t}` : t) },
];

// ---------------------------------------------------------------------------

export const clip32 = (text) => String(text).split(/\s+/).filter(Boolean).slice(0, 32).join(" ");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TelegraphMinerBench/1.0";

async function collect() {
  await mkdir(REFS, { recursive: true });
  for (const miner of MINERS) {
    for (const q of QUESTIONS) {
      const spec = miner.build(q);
      const headers = { "user-agent": UA, accept: "application/json" };
      if (spec.body) headers["content-type"] = "application/json";
      const started = Date.now();
      let row;
      try {
        const res = await fetch(spec.url, { method: spec.method, headers, body: spec.body, signal: AbortSignal.timeout(45_000) });
        row = { ok: res.ok, status: res.status, ms: Date.now() - started, request: spec, body: await res.text() };
      } catch (error) {
        row = { ok: false, status: null, ms: Date.now() - started, request: spec, error: String(error?.message ?? error) };
      }
      const payload = { miner: miner.slug, minerId: miner.id, question: q.text, reasonField: miner.reasonField, fetchedAt: new Date().toISOString(), ...row };
      await writeFile(`${REFS}/${miner.id}-${q.id}.json`, `${JSON.stringify(payload, null, 2)}\n`);
      console.log(`collected ${miner.id}/${q.id} status=${row.status} ${row.ms}ms`);
    }
  }
}

/** The one prose field the node summarises, out of a saved raw response. */
function reasonOf(saved) {
  let parsed;
  try { parsed = JSON.parse(saved.body ?? "null"); } catch { return null; }
  const flat = parsed && typeof parsed === "object" ? (parsed.data ?? parsed.result ?? parsed) : parsed;
  const value = flat?.[saved.reasonField];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function loadAnswers() {
  const files = (await readdir(REFS)).filter((n) => n.endsWith(".json") && n !== "index.json");
  const byMiner = new Map();
  for (const name of files) {
    const saved = JSON.parse(await readFile(`${REFS}/${name}`, "utf8"));
    const reason = reasonOf(saved);
    if (!reason) continue;
    const [minerId, qid] = name.replace(/\.json$/, "").split("-");
    if (!byMiner.has(minerId)) byMiner.set(minerId, new Map());
    byMiner.get(minerId).set(qid, reason);
  }
  return byMiner;
}

const fmt = (n) => (n === null || n === undefined ? "     -" : n.toFixed(4).padStart(6));
const lines = [];
const say = (text = "") => { lines.push(text); console.log(text); };

async function main() {
  if (process.argv.includes("--collect")) await collect();
  const { loadScorer } = await import(pathToFileURL(here("../../track2/harness/wasm-abi.mjs")).href);
  const scorer = await loadScorer(CHAMPION, "reg220");
  const answers = await loadAnswers();

  const score = (q, reference, candidate) => scorer.score(q.text, reference, candidate);
  const both = (q, reference, candidate) => ({
    full: score(q, reference, candidate),
    clip: score(q, clip32(reference), clip32(candidate)),
  });

  say("URL_SCAN answer-shape bench — champion reg220 (url_scan_reg220.wasm)");
  say(`sha256 ${scorer.sha256}`);
  say(`refs   ${REFS}`);
  say(`run    ${new Date().toISOString()}`);
  say();

  const refIds = MINERS.filter((m) => m.role === "reference" && answers.has(m.id)).map((m) => m.id);
  const missing = MINERS.filter((m) => !answers.has(m.id)).map((m) => m.id);
  if (missing.length) say(`WARNING: no usable answer saved for ${missing.join(", ")}`);

  say("THE ANSWERS SCORED (live, verbatim)");
  say("=".repeat(78));
  for (const q of QUESTIONS) {
    say(`${q.id}: ${q.text}`);
    for (const m of MINERS) {
      const text = answers.get(m.id)?.get(q.id);
      say(`  ${m.id.padEnd(10)} ${text ? `${String(text.split(/\s+/).length).padStart(3)}w  ${text}` : "(no answer)"}`);
    }
    say();
  }

  say("STAGE 1 — VALIDATION MATRIX: do the crossing miners agree with each other?");
  say(`Gate: every ordered leader pair must score >= ${VALIDATION_FLOOR} on the full text.`);
  say("=".repeat(78));
  let floor = 1;
  const failures = [];
  for (const q of QUESTIONS) {
    say(`${q.id}  ${q.text}`);
    say(`  ${"reference \\ candidate".padEnd(24)}${refIds.map((id) => id.padStart(17)).join("")}`);
    for (const refId of refIds) {
      const cells = refIds.map((candId) => {
        if (refId === candId) return "        .        ";
        const r = both(q, answers.get(refId).get(q.id), answers.get(candId).get(q.id));
        floor = Math.min(floor, r.full);
        if (r.full < VALIDATION_FLOOR) failures.push({ q: q.id, refId, candId, ...r });
        return `${fmt(r.full)}/${fmt(r.clip)}`.padStart(17);
      });
      say(`  ${refId.padEnd(24)}${cells.join("")}`);
    }
    say();
  }
  say(`Cells are full/clip32. Lowest cross-leader full score: ${floor.toFixed(4)}`);
  say();

  if (failures.length) {
    say(`VALIDATION FAILED — ${failures.length} of ${refIds.length * (refIds.length - 1) * QUESTIONS.length} ordered pairs scored below ${VALIDATION_FLOOR}.`);
    say("Worst pairs:");
    for (const f of failures.slice().sort((a, b) => a.full - b.full).slice(0, 6)) {
      say(`  ${f.q}  reference=${f.refId.padEnd(10)} candidate=${f.candId.padEnd(10)} full=${fmt(f.full)} clip32=${fmt(f.clip)}`);
    }
    say();
    say("These miners all cross at ~0.99 in production against the node's hidden ground");
    say("truth, so a champion that scores them far apart is not rewarding what they share.");
    say("Nothing they produce can serve as a reference for our text (G114, G128), and no");
    say("ours-vs-reference or variant number is reported. NO CODE CHANGE IS JUSTIFIED BY");
    say("THIS RUN.");
    say();
    diagnose(answers, refIds, both);
    say("Reported anyway, for the record only — scored against an INVALID instrument:");
    say("=".repeat(78));
    reportCandidates(answers, refIds, both, { invalid: true });
    return { validated: false };
  }

  say("VALIDATION PASSED — every leader pair agrees. Their answers are usable references.");
  say();
  reportCandidates(answers, refIds, both, { invalid: false });
  return { validated: true };
}

/**
 * STAGE 1b — the mechanism behind the disagreement, so the failure is a finding
 * and not just a shrug. Three probes on our own verdict sentence, measured
 * against each leader in turn. The third is the risk-score convention both
 * crossing leaders write; it is a DIAGNOSTIC, never a candidate, because this
 * miner does not compute a 0-to-1 risk score and writing one it did not
 * calculate would be inventing a fact.
 */
function diagnose(answers, refIds, both) {
  say("STAGE 1b — WHY THEY DISAGREE: the same clause, measured against each leader");
  say("=".repeat(78));
  for (const q of QUESTIONS) {
    const prod = answers.get("ours")?.get(q.id);
    if (!prod) continue;
    const head = prod.split(/(?<=\.)\s+/)[0] ?? prod;
    const probes = [
      ["our verdict sentence alone", head],
      ["+ a sentence carrying no number", `${head} The page was not opened.`],
      ["+ the leaders' risk-score clause", `${head.replace(/\.$/, "")}, with a risk of 0.5 on a 0 (safe) to 1 (unsafe) scale.`],
    ];
    say(`${q.id}  ${"probe".padEnd(34)}${refIds.map((id) => id.padStart(11)).join("")}`);
    for (const [label, text] of probes) {
      say(`    ${label.padEnd(36)}${refIds.map((refId) => fmt(both(q, answers.get(refId).get(q.id), text).full).padStart(11)).join("")}`);
    }
  }
  say();
  say("A clause that is a perfect match against one leader and a total miss against");
  say("another is the whole problem: there is no single reference to aim at.");
  say();
}

function reportCandidates(answers, refIds, both, { invalid }) {
  const ours = answers.get("ours");
  if (!ours) { say("No production answer of ours was saved; nothing to compare."); return; }

  say("STAGE 2 — OUR PRODUCTION TEXT AND ITS VARIANTS, against each reference");
  say("Cells are full/clip32. A variant only ever removes or reorders a clause of the");
  say("live production text; none states a fact the deployed build did not check.");
  say("=".repeat(78));

  const crossings = new Map();
  for (const q of QUESTIONS) {
    const prod = ours.get(q.id);
    if (!prod) { say(`${q.id}: no production answer saved.`); continue; }
    say(`${q.id}  ${q.text}`);
    say(`  ${"variant".padEnd(22)}${refIds.map((id) => id.padStart(17)).join("")}   text`);
    // An edit that does not apply to this verdict path yields text another
    // variant already produced. Its score is still that variant's score on this
    // question, so it is recorded -- dropping it would let a variant reach the
    // decision table having skipped the question it loses on.
    const scored = new Map();
    for (const v of VARIANTS) {
      const text = v.apply(prod, q);
      if (!text) continue;
      if (!scored.has(text)) scored.set(text, refIds.map((refId) => both(q, answers.get(refId).get(q.id), text)));
      const cells = scored.get(text);
      if (!crossings.has(v.id)) crossings.set(v.id, []);
      crossings.get(v.id).push({ q: q.id, min: Math.min(...cells.map((c) => c.full)), minClip: Math.min(...cells.map((c) => c.clip)) });
      const row = cells.map((c) => `${fmt(c.full)}/${fmt(c.clip)}`.padStart(17)).join("");
      const shape = text === prod ? "(unchanged)" : `${text.split(/\s+/).length}w`;
      say(`  ${v.id.padEnd(22)}${row}   ${shape}`);
      if (text !== prod) say(`  ${" ".repeat(22)}${" ".repeat(refIds.length * 17)}   ${text}`);
    }
    say();
  }

  say("STAGE 3 — DECISION: the worst score each variant reaches against ANY reference,");
  say("on ANY question. A variant is only worth shipping if this minimum crosses 0.98.");
  say("=".repeat(78));
  say(`  ${"variant".padEnd(22)}${"min full".padStart(10)}${"min clip32".padStart(12)}   per-question minima`);
  const ranked = [...crossings.entries()].map(([id, rows]) => ({
    id,
    min: Math.min(...rows.map((r) => r.min)),
    minClip: Math.min(...rows.map((r) => r.minClip)),
    rows,
  })).sort((a, b) => b.min - a.min);
  for (const r of ranked) {
    say(`  ${r.id.padEnd(22)}${fmt(r.min).padStart(10)}${fmt(r.minClip).padStart(12)}   ${r.rows.map((x) => `${x.q}=${x.min.toFixed(4)}`).join("  ")}`);
  }
  say();
  const prodRow = ranked.find((r) => r.id === "prod");
  const winners = ranked.filter((r) => r.id !== "prod" && r.min >= 0.98 && prodRow && prodRow.min < 0.98);
  if (invalid) {
    say("DECISION: none. Stage 1 failed, so every number above is uninterpretable.");
  } else if (winners.length) {
    say(`DECISION: ship ${winners[0].id} — it crosses ${VALIDATION_FLOOR} against every validated`);
    say(`reference on every question while production sits at ${prodRow ? prodRow.min.toFixed(4) : "?"}.`);
  } else {
    say("DECISION: change nothing. No variant crosses 0.98 against every validated");
    say("reference on every question, so the shape is not what separates us from them.");
  }
}

// A failed validation is a measurement, not a tool error, so this exits 0
// either way. What it must never do is exit 0 quietly having reported a number
// it could not justify — hence the banner Stage 1 prints instead.
await main();
const out = argValue("--out");
if (out) { await writeFile(out, `${lines.join("\n")}\n`); console.error(`written ${out}`); }
