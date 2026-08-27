#!/usr/bin/env node
/**
 * Predicts how our answers score against the incumbents', using the reference
 * scoring module's arithmetic.
 *
 * Telegraph's scorer receives three plain strings — question, ground_truth,
 * miner_answer — and the documented reference implementation returns
 *   matched words in the answer / total words in the answer
 * with a short-circuit to 1.0 on a verbatim match. That formula punishes
 * verbosity: every word the ground truth lacks lowers the fraction.
 *
 * We cannot see the real champion module for SSL_VERIFICATION, so this is a
 * prediction, not a measurement. But it is the same arithmetic the docs publish,
 * and it is the only way to compare answer shapes without paying per query.
 */

const words = (s) => String(s ?? "").toLowerCase().match(/[a-z0-9.:-]+/g) ?? [];

function wordOverlap(answer, groundTruth) {
  const a = words(answer);
  if (a.length === 0) return 0;
  const gt = new Set(words(groundTruth));
  let matched = 0;
  for (const w of a) if (gt.has(w)) matched++;
  return matched / a.length;
}

function score(groundTruth, answer) {
  if (!String(answer ?? "").trim()) return 0;
  if (answer === groundTruth) return 1;
  return wordOverlap(answer, groundTruth);
}

/** Plausible ground truths — what a scorer would hold as the correct answer. */
const CASES = [
  {
    q: "Is the SSL certificate for expired.badssl.com valid?",
    gt: "The SSL certificate for expired.badssl.com is expired and not valid. It expired on 2015-04-12 and was issued by COMODO CA Limited.",
    host: "expired.badssl.com",
  },
  {
    q: "Is the SSL certificate for github.com valid?",
    gt: "The SSL certificate for github.com is valid and trusted. It was issued by Sectigo Limited and expires on 2026-09-30.",
    host: "github.com",
  },
  {
    q: "Is the certificate for self-signed.badssl.com trusted?",
    gt: "The SSL certificate for self-signed.badssl.com is self-signed and not trusted.",
    host: "self-signed.badssl.com",
  },
];

/** How the competitors actually answer, by shape. */
function competitorAnswers(host, ours) {
  return {
    "livecert (ours)": ours,
    "ssllabs-style (full grade report)":
      `{"host":"${host}","port":443,"protocol":"HTTP","isPublic":false,"status":"READY",` +
      `"startTime":1756219000000,"testTime":1756219120000,"engineVersion":"2.3.0",` +
      `"criteriaVersion":"2009q","endpoints":[{"ipAddress":"1.2.3.4","serverName":"${host}",` +
      `"statusMessage":"Ready","grade":"B","gradeTrustIgnored":"B","hasWarnings":true,` +
      `"isExceptional":false,"progress":100,"duration":98000,"eta":0,"delegation":1}]}`,
    "certspotter-style (CT log record)":
      `[{"id":"12345678","tbs_sha256":"ab12cd34","cert_sha256":"ef56ab78",` +
      `"dns_names":["${host}"],"pubkey_sha256":"9911aabb","issuer":{"name":"C=US, O=Let's Encrypt, CN=R3"},` +
      `"not_before":"2026-01-01T00:00:00Z","not_after":"2026-04-01T00:00:00Z","revoked":false}]`,
    "txlens-style (error on odd input)":
      `{"status":"error","summary":"must include a valid \`domain\` query parameter","confidence":1}`,
  };
}

const BASE = process.argv[2] ?? "https://miner-wine.vercel.app";

async function ourAnswer(host) {
  const r = await fetch(`${BASE}/ssl-check?domain=${encodeURIComponent(host)}`);
  const j = await r.json();
  // signal_mapping points reason_field at `reason` — that is the text a scorer sees.
  return j.reason ?? "";
}

const totals = {};
for (const c of CASES) {
  const ours = await ourAnswer(c.host);
  const answers = competitorAnswers(c.host, ours);
  console.log(`\nQ: ${c.q}`);
  const rows = Object.entries(answers)
    .map(([name, a]) => [name, score(c.gt, a), a])
    .sort((x, y) => y[1] - x[1]);
  for (const [name, s, a] of rows) {
    totals[name] = (totals[name] ?? 0) + s;
    console.log(`   ${s.toFixed(4)}  ${name}`);
    if (name.includes("ours")) console.log(`           "${a.slice(0, 96)}${a.length > 96 ? "…" : ""}"`);
  }
}

console.log("\n=== mean across cases ===");
for (const [name, t] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${(t / CASES.length).toFixed(4)}  ${name}`);
}
