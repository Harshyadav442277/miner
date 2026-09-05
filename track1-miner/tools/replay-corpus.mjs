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

/**
 * How each intent is called, and what a usable answer looks like.
 *
 * These checks read the HTTP response, and three endpoints no longer serve the
 * metadata they were written against: SSL, weather and wallet were projected to
 * {verdict, confidence, reason} in G56, and STORM followed on 2026-09-05. The
 * weather check kept requiring `location` and so reported a working endpoint as
 * 0/48 for four days — a gate that cries wolf hides the failure it exists to
 * catch. What the projection removes is checked where it still exists: on the
 * internal result, in test/storm.test.ts and test/forecast.test.ts.
 */
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
      const prose = String(j.reason ?? "");
      if (prose.length < 40) problems.push("no answer text");

      // The grade and the number behind it are both stated in the prose, so their
      // agreement survives the projection — and the prose is the copy that is
      // actually scored, so it is the better place to check it.
      const graded = prose.match(/([0-9]*\.?[0-9]+) on a scale of 0 to 1, graded (\w+)/i);
      if (graded) {
        const bands = { none: [0, 0.2], low: [0.2, 0.4], moderate: [0.4, 0.65], high: [0.65, 0.85], severe: [0.85, 1.01] };
        const b = bands[graded[2].toLowerCase()];
        const score = Number(graded[1]);
        if (b && (score < b[0] || score >= b[1])) problems.push(`risk ${score} outside ${graded[2]}`);
      }

      // "in N hours" names a moment; "over the next N hours" names a span, and a
      // point question answered with a span maximum is wrong even though it looks
      // well formed. time_mode is no longer served, so the prose has to carry the
      // distinction: a window answer says so, a point answer names the hour it
      // describes. The drift check moved to test/storm.test.ts, on checkStorm's
      // own result, where valid_at still exists.
      const point = /\bin\s+\d{1,3}\s*hours?\b/i.test(q);
      const span = /(?:over|within|during|across)\s+(?:the\s+)?next/i.test(q);
      const now = /right now/i.test(q);
      if (span && !/over the next/i.test(prose)) problems.push("a span question was not answered over a window");
      if (!span && (point || now) && !/\b(at|around)\b.*\d/i.test(prose)) {
        problems.push("a point question was not answered at a stated hour");
      }
      return problems.length ? problems.join("; ") : null;
    },
  },
  WEATHER_FORECAST: {
    url: (q) => `${BASE}/weather-forecast?location=${encodeURIComponent(q)}`,
    // The forecast response names its condition in `verdict`. It carried `location`
    // too until G56 projected it away; requiring that field reported a working
    // endpoint as 0/48. An earlier version looked for `condition`, which never existed.
    check: (j) => (j.verdict && j.verdict !== "unknown" ? null : `no forecast (verdict=${j.verdict})`),
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
