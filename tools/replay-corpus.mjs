#!/usr/bin/env node
/**
 * Replays real paid questions against the deployed miner, for every intent we serve.
 *
 * The public question feed exposes what buyers actually paid to ask. That is a far
 * better acceptance corpus than tests written from imagination: replaying it found
 * coordinates stated in prose, ignored time windows, and "right now" answered with
 * a 48-hour outlook — none of which the local suite could catch.
 *
 * It is also the only fast feedback loop available. Epochs are 9 hours long, so a
 * scoring theory takes most of a day to test and has been wrong twice; this
 * answers in seconds.
 *
 *   node tools/replay-corpus.mjs [baseUrl] [--refresh]
 */
import { readFile, writeFile } from "node:fs/promises";

const BASE = process.argv.find((a) => a.startsWith("http")) ?? "https://miner-wine.vercel.app";
const CORPUS = new URL("./corpus.json", import.meta.url);
const FEED = (offset) =>
  `https://explorer.telegraphprotocol.com/api/daemon/api/questions?sort=recent&order=desc&since_hours=720&limit=100&offset=${offset}`;

const MATCH = {
  SSL_VERIFICATION: /\b(ssl|tls|certificat)/i,
  STORM_ALERT: /\bstorm risk\b/i,
  WEATHER_FORECAST: /\b(forecast|weather)/i,
};

async function refresh() {
  const seen = new Set();
  const texts = [];
  for (let off = 0; off < 600; off += 100) {
    const res = await fetch(FEED(off), {
      headers: { "user-agent": "Mozilla/5.0", referer: "https://explorer.telegraphprotocol.com/signals" },
    });
    if (!res.ok) break;
    const body = await res.json();
    for (const r of body.results ?? []) {
      const t = (r?.question?.text ?? "").trim();
      // "[direct] 20260821 -> /forecast" is a direct-target call record, not a question.
      if (t && !t.startsWith("[direct]") && !seen.has(t)) {
        seen.add(t);
        texts.push(t);
      }
    }
  }
  const out = {};
  for (const [intent, re] of Object.entries(MATCH)) {
    out[intent] = texts.filter(
      (t) => re.test(t) && (intent === "STORM_ALERT" || !MATCH.STORM_ALERT.test(t)),
    );
  }
  await writeFile(CORPUS, JSON.stringify(out, null, 1));
  console.log(`refreshed: ${Object.entries(out).map(([k, v]) => `${k}=${v.length}`).join(" ")}`);
}

/** How each intent is called, and what a usable answer looks like. */
const PROBES = {
  SSL_VERIFICATION: {
    url: (q) => `${BASE}/ssl-check?query=${encodeURIComponent(q)}`,
    check: (j) => (j.verdict && j.verdict !== "unknown" ? null : `verdict=${j.verdict}`),
  },
  STORM_ALERT: {
    url: (q) => `${BASE}/storm-alert?location=${encodeURIComponent(q)}`,
    check: (j, q) => {
      const problems = [];
      if (!j.verdict || j.verdict === "unknown") problems.push(`verdict=${j.verdict}`);
      if (typeof j.risk_score !== "number") problems.push("no risk_score");
      const m = q.match(/\bin (\d+) hours?\b/i);
      const want = m ? Math.max(1, Number(m[1])) : /right now/i.test(q) ? 1 : null;
      if (want !== null && j.window_hours !== want) problems.push(`window ${j.window_hours} != ${want}`);
      const bands = { none: [0, 0.2], low: [0.2, 0.4], moderate: [0.4, 0.65], high: [0.65, 0.85], severe: [0.85, 1.01] };
      const b = bands[j.verdict];
      if (b && (j.risk_score < b[0] || j.risk_score >= b[1])) problems.push(`risk ${j.risk_score} outside ${j.verdict}`);
      return problems.length ? problems.join("; ") : null;
    },
  },
  WEATHER_FORECAST: {
    url: (q) => `${BASE}/weather-forecast?location=${encodeURIComponent(q)}`,
    // The forecast response names its condition in `verdict`, matching the shared
    // signal_mapping — an earlier version of this check looked for `condition` and
    // reported a working endpoint as broken.
    check: (j) => (j.verdict && j.verdict !== "unknown" && j.location ? null : `no forecast (verdict=${j.verdict})`),
  },
};

if (process.argv.includes("--refresh")) await refresh();

const corpus = JSON.parse(await readFile(CORPUS, "utf8"));
let total = 0;
let failed = 0;

for (const [intent, probe] of Object.entries(PROBES)) {
  const qs = corpus[intent] ?? [];
  if (qs.length === 0) {
    console.log(`${intent}: no real questions in the corpus`);
    continue;
  }
  let pass = 0;
  const bad = [];
  for (const q of qs) {
    total++;
    let j;
    try {
      j = await (await fetch(probe.url(q))).json();
    } catch (e) {
      bad.push([q, `request failed: ${e.message}`]);
      failed++;
      continue;
    }
    const why = probe.check(j, q);
    if (why) {
      bad.push([q, why]);
      failed++;
    } else pass++;
  }
  console.log(`${intent}: ${pass}/${qs.length}`);
  for (const [q, why] of bad) console.log(`  FAIL  ${why}\n        ${q.slice(0, 96)}`);
}

console.log(`\n${total - failed}/${total} real paid questions answered correctly`);
process.exitCode = failed === 0 ? 0 : 1;
