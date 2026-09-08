#!/usr/bin/env node
/**
 * Nothing the engine can send may produce a non-2xx or an empty answer.
 *
 * A 500 costs exactly what a 400 costs: Telegraph records an upstream error,
 * stores an empty `miner_answer`, and the scorer sees nothing. Every
 * asynchronous path ends in a `.catch()` that answers honestly, and
 * `handleRequest` wraps the synchronous ones — this is what checks that the
 * guarantee actually holds end to end, through the real deployment.
 *
 * Each hostile value is sent to the parameters that route actually declares,
 * which is what the engine does. Sending one 8KB value to twelve parameter
 * names at once is not an engine request — it is a 96KB URL, and Vercel's edge
 * answers 414 before the function is ever invoked. (A single parameter carries
 * 32KB fine, well past any realistic inline CONTENT_EXTRACTION payload.)
 *
 *   node track1-miner/tools/hostile-inputs.mjs [base-url]
 */
const BASE = process.argv[2] ?? "https://miner-wine.vercel.app";

/** endpoint -> the parameter names it reads, per miner.yaml. */
const PARAMS = {
  "/ssl-check": ["domain", "query"],
  "/storm-alert": ["location", "lat", "lon", "hours", "query"],
  "/weather-forecast": ["location", "lat", "lon", "days", "hours", "query"],
  "/ip-geolocate": ["ip", "query"],
  "/translate": ["text", "target_language", "query"],
  "/papers": ["topic", "query"],
  "/ai-detect": ["text", "query"],
  "/extract": ["text", "query"],
  "/headlines": ["topic", "query"],
  "/wallet-balance": ["address", "query"],
};

const HOSTILE = {
  "empty": "",
  "spaces": "     ",
  "long inline payload (8k)": "A".repeat(8_000),
  "unicode mix": "コーヒーを一杯お願いします。 مرحبا 🌍 Ω≈ç√∫ 中文",
  "control chars": "a\u0000\u0001\u0002bcd",
  "html/script": "<script>alert(1)</script><img src=x onerror=1>",
  "sql-ish": "'; DROP TABLE miners;-- ",
  "json blob": '{"nested":{"deep":[1,2,3]},"q":"what?"}',
  "regex bomb": "a".repeat(1200) + "!",
  "nested quotes": 'He said "she said \'they said\'" and then...',
  "newlines": "line one\nline two\r\nline three\ttabbed",
  "only punctuation": "?!.,;:'\"[]{}()<>/\\|`~@#$%^&*-_=+",
  "lone surrogate": "abc\ud800def",
  "rtl override": "abc‮def",
  "percent signs": "100%%% %00 %zz %",
  "huge number": "9".repeat(400),
  "negative coords": "-999999.999999",
  "url in text": "https://evil.example.com/../../etc/passwd?a=1&b=2#frag",
};

/**
 * Parameters that can plausibly carry a long value. A `lat`, `hours` or
 * `target_language` never does, so filling all six of /weather-forecast's
 * parameters with 8KB builds a 48KB URL the engine would never send and only
 * measures Vercel's edge limit again.
 */
const FREE_TEXT = new Set(["query", "text", "topic"]);
const isLong = (v) => v.length > 1024;

let bad = 0, n = 0;
for (const [ep, names] of Object.entries(PARAMS)) {
  for (const [label, value] of Object.entries(HOSTILE)) {
    n++;
    const u = new URL(BASE + ep);
    const targets = isLong(value) ? names.filter((k) => FREE_TEXT.has(k)) : names;
    for (const k of targets) u.searchParams.set(k, value);
    let status = 0, body = "", err = "";
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      status = r.status;
      body = await r.text();
    } catch (e) { err = e.name === "TimeoutError" ? "TIMEOUT >30s" : e.message.slice(0, 60); }
    let parsed = null;
    try { parsed = JSON.parse(body); } catch { /* a non-JSON body is itself a finding */ }
    const reason = typeof parsed?.reason === "string" ? parsed.reason : "";
    const say = (why) => { bad++; console.log(`BAD  ${ep.padEnd(18)} ${label.padEnd(26)} ${why}`); };
    if (err) say(err);
    else if (status !== 200) say(`HTTP ${status}  ${body.slice(0, 80).replace(/\s+/g, " ")}`);
    else if (!parsed) say(`non-JSON body: ${body.slice(0, 70)}`);
    else if (!reason.trim()) say("empty reason (scores 0)");
  }
}
console.log(`\n${n - bad} clean, ${bad} bad, ${n} probes`);
process.exit(bad ? 1 : 0);
