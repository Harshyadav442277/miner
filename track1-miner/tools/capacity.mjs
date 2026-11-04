#!/usr/bin/env node
/**
 * Capacity test: a fixed number of concurrent callers against one endpoint for a fixed time.
 * Reports requests completed, error rate and latency percentiles at that concurrency.
 *
 *   node track1-miner/tools/capacity.mjs <base-url> <path?query> <concurrency> <seconds> [out.json]
 *
 * Pick a route whose upstream allows the volume (the TLS check opens one handshake per call; LLM and
 * geocoding routes have quotas, so testing them measures the quota, not the miner). These are our own
 * direct calls: capacity evidence only, never use or demand.
 */
import { writeFileSync } from "node:fs";

const [base, target, conc = "10", secs = "30", out] = process.argv.slice(2);
if (!base || !target) {
  console.error("usage: capacity.mjs <base-url> <path?query> <concurrency> <seconds> [out.json]");
  process.exit(2);
}
const url = `${base.replace(/\/+$/, "")}${target}`;
const deadline = Date.now() + Number(secs) * 1000;
const samples = [];

// The handler caches each answer for a minute (src/handler.ts CACHE_TTL_MS), so a repeated question measures
// the cache. `{domain}` in the target rotates through distinct hosts; 60 hosts at under 60 calls a second
// keeps most calls uncached. Each sample records whether the answer's checked_at was older than the call.
const DOMAINS = `google.com youtube.com facebook.com wikipedia.org amazon.com reddit.com yahoo.com bing.com
linkedin.com netflix.com microsoft.com apple.com github.com stackoverflow.com mozilla.org cloudflare.com
wordpress.org adobe.com paypal.com ebay.com twitch.tv spotify.com dropbox.com zoom.us salesforce.com
nytimes.com bbc.co.uk cnn.com theguardian.com reuters.com bloomberg.com forbes.com medium.com quora.com
imdb.com pinterest.com tumblr.com vimeo.com slack.com notion.so atlassian.com gitlab.com npmjs.com pypi.org
python.org nodejs.org rust-lang.org golang.org debian.org ubuntu.com archlinux.org kernel.org w3.org
whatwg.org ietf.org iana.org icann.org letsencrypt.org digicert.com sectigo.com`.split(/\s+/);
let next = 0;
const nextUrl = () => url.replace("{domain}", DOMAINS[next++ % DOMAINS.length]);

async function caller() {
  while (Date.now() < deadline) {
    const sent = Date.now();
    const t = performance.now();
    let status = 0;
    let ok = false;
    let cached = false;
    try {
      const res = await fetch(nextUrl(), { signal: AbortSignal.timeout(30_000), headers: { "user-agent": "livecert-capacity" } });
      const body = await res.text();
      status = res.status;
      try {
        const j = JSON.parse(body);
        ok = res.status === 200 && String(j.answer ?? "").trim().length > 0;
        cached = Date.parse(j.checked_at ?? "") < sent - 1000;
      } catch { ok = false; }
    } catch { /* timeout or network error */ }
    samples.push({ ms: Math.round(performance.now() - t), status, ok, cached });
  }
}

const started = new Date().toISOString();
await Promise.all(Array.from({ length: Number(conc) }, caller));
const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
const pct = (p) => ms[Math.min(ms.length - 1, Math.floor(ms.length * p))];
const errors = samples.filter((s) => !s.ok);
const result = {
  at: started,
  url,
  concurrency: Number(conc),
  seconds: Number(secs),
  requests: samples.length,
  per_second: +(samples.length / Number(secs)).toFixed(2),
  errors: errors.length,
  error_rate: +(errors.length / Math.max(1, samples.length)).toFixed(4),
  served_from_cache: samples.filter((s) => s.cached).length,
  statuses: Object.fromEntries([...new Set(samples.map((s) => s.status))].map((c) => [c, samples.filter((s) => s.status === c).length])),
  p50_ms: pct(0.5),
  p90_ms: pct(0.9),
  p99_ms: pct(0.99),
  max_ms: ms.at(-1),
};
// The same percentiles over the calls that did the upstream work, which is the honest latency figure.
const fresh = samples.filter((s) => !s.cached).map((s) => s.ms).sort((a, b) => a - b);
if (fresh.length) {
  const fp = (p) => fresh[Math.min(fresh.length - 1, Math.floor(fresh.length * p))];
  Object.assign(result, { uncached: fresh.length, uncached_p50_ms: fp(0.5), uncached_p90_ms: fp(0.9), uncached_p99_ms: fp(0.99) });
}
console.log(JSON.stringify(result));
if (out) writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
