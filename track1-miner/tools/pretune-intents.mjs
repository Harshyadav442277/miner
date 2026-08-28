// Pre-tuning bench for the two newest intents in miner.yaml.
// For each intent: validate the champion WASM reproduces reported scores,
// then score OUR live endpoint's answer for every recorded real question.
import { readFile } from "node:fs/promises";

const SCRATCH = process.env.PRETUNE_DIR ?? ".";
const BASE = process.env.BASE ?? "https://miner-wine.vercel.app";

const INTENTS = [
  { name: "LANGUAGE_TRANSLATION", wasm: "translate.wasm", path: "/translate", param: "query" },
  { name: "ACADEMIC_SEARCH", wasm: "papers.wasm", path: "/papers", param: "query" },
];

async function loadScorer(file) {
  const bytes = await readFile(`${SCRATCH}/${file}`);
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const { memory, alloc, rank_answer } = instance.exports;
  const enc = new TextEncoder();
  const put = (s) => {
    const b = enc.encode(String(s ?? ""));
    const p = alloc(b.length);
    new Uint8Array(memory.buffer, p, b.length).set(b);
    return [p, b.length];
  };
  return (q, gt, ma) => {
    const [qp, ql] = put(q);
    const [gp, gl] = put(gt);
    const [mp, ml] = put(ma);
    return rank_answer(qp, ql, gp, gl, mp, ml);
  };
}

const mode = process.argv[2] ?? "validate";

for (const it of INTENTS) {
  const raw = JSON.parse(await readFile(`${SCRATCH}/scores_${it.name}.json`, "utf8"));
  const rows = raw.scores ?? raw.data ?? raw;
  const score = await loadScorer(it.wasm);
  console.log(`\n===== ${it.name} — ${rows.length} rows =====`);

  // Distinct questions, most recent first.
  const byQ = new Map();
  for (const r of rows) {
    if (!byQ.has(r.question)) byQ.set(r.question, []);
    byQ.get(r.question).push(r);
  }

  if (mode === "validate") {
    // Reproduce reported scores from converted_answer.
    let exact = 0, close = 0, off = 0, n = 0;
    for (const r of rows) {
      if (!r.converted_answer) continue;
      n++;
      const s = score(r.question, r.ground_truth, r.converted_answer);
      const d = Math.abs(s - r.score);
      if (d < 1e-4) exact++; else if (d < 5e-3) close++; else off++;
    }
    console.log(`WASM check: ${exact} exact, ${close} close, ${off} off, of ${n} scoreable`);
    console.log(`distinct questions: ${byQ.size}`);
    let i = 0;
    for (const [q, rs] of byQ) {
      if (i++ >= 6) break;
      const best = rs.slice().sort((a, b) => b.score - a.score)[0];
      console.log(`  Q${i}: [best ${best.score.toFixed(4)} ${best.miner_slug}] ${q.slice(0, 110)}`);
    }
  } else {
    // Bench: our live answer per distinct question.
    let sum = 0, n = 0;
    for (const [q, rs] of byQ) {
      const best = rs.slice().sort((a, b) => b.score - a.score)[0];
      const url = `${BASE}${it.path}?${it.param}=${encodeURIComponent(q)}`;
      let ours = null, reason = "";
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
        const body = await res.json();
        reason = String(body.reason ?? "");
        ours = score(q, rs[0].ground_truth, reason);
      } catch (e) {
        reason = `FETCH FAILED: ${e.message}`;
      }
      sum += ours ?? 0; n++;
      const flag = ours !== null && ours > best.score ? "WIN " : "LOSE";
      console.log(`${flag} ours=${(ours ?? 0).toFixed(4)} best=${best.score.toFixed(4)} (${best.miner_slug})`);
      console.log(`   Q: ${q.slice(0, 120)}`);
      console.log(`   A: ${reason.slice(0, 160)}`);
    }
    console.log(`${it.name} mean over ${n} questions: ${(sum / Math.max(1, n)).toFixed(5)}`);
  }
}
