#!/usr/bin/env node
/**
 * Uptime and routing watcher.
 *
 * Telegraph spot-checks roughly every 20 seconds and issues a Routing Revocation
 * if a miner's score drops more than 20% below its leaderboard score. A revoked
 * miner earns nothing until the next epoch tournament re-scores it — and nothing
 * tells you it happened. This polls for it.
 *
 *   node tools/watch.mjs --registration-id 123 --base-url https://livecert.fly.dev
 *   node tools/watch.mjs --base-url https://livecert.fly.dev --once   # single check, for cron
 *
 * Exits non-zero on a terminal rejection or a failed check in --once mode, so it
 * can be wired straight into an alert or a CI step.
 */

const NODE_API = process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com";
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i]?.replace(/^--/, "");
  if (k) args.set(k, process.argv[i + 1]);
}

const registrationId = args.get("registration-id") ?? process.env.REGISTRATION_ID ?? null;
const baseUrl = (args.get("base-url") ?? process.env.MINER_BASE_URL ?? "").replace(/\/+$/, "");
const intervalMs = Number(args.get("interval") ?? 60_000);
const probeDomain = args.get("probe") ?? "github.com";
const once = process.argv.includes("--once");

if (!registrationId && !baseUrl) {
  console.error("Need at least --registration-id or --base-url.");
  console.error("  node tools/watch.mjs --registration-id 123 --base-url https://livecert.fly.dev");
  process.exit(2);
}

const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);
let lastStatus = null;
let consecutiveEndpointFailures = 0;

async function withTimeout(url, ms = 10_000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Our own endpoint, measured the way a validator would experience it. */
async function checkEndpoint() {
  if (!baseUrl) return null;
  const started = Date.now();
  try {
    const res = await withTimeout(`${baseUrl}/ssl-check?domain=${probeDomain}`);
    const ms = Date.now() - started;
    if (!res.ok) {
      consecutiveEndpointFailures++;
      return { ok: false, ms, detail: `HTTP ${res.status}` };
    }
    const body = await res.json();
    consecutiveEndpointFailures = 0;
    return { ok: true, ms, detail: `verdict=${body.verdict}` };
  } catch (e) {
    consecutiveEndpointFailures++;
    return { ok: false, ms: Date.now() - started, detail: e.name === "AbortError" ? "timeout" : e.message };
  }
}

/** Telegraph's own view of us — the one that decides whether we earn. */
async function checkRegistration() {
  if (!registrationId) return null;
  try {
    const res = await withTimeout(`${NODE_API}/api/miners/${registrationId}`);
    // A 404 means this registration no longer exists — updateMiner deregisters
    // the old id atomically, so watching a stale REGISTRATION_ID looked exactly
    // like health. It is terminal: nothing recovers a deregistered id, and the
    // watcher must fail loudly rather than report a green tick forever.
    if (res.status === 404) {
      return {
        status: `registration ${registrationId} DOES NOT EXIST (HTTP 404)`,
        reason: "deregistered or never registered - check REGISTRATION_ID against the latest updateMiner",
        terminal: true,
      };
    }
    if (!res.ok) return { status: `lookup HTTP ${res.status}`, terminal: false };
    const body = await res.json();
    const m = body.miner ?? body;
    return {
      status: m.activation_status ?? "unknown",
      reason: m.rejection_reason ?? null,
      retrying: m.retrying ?? null,
      // "deregistered" is what updateMiner leaves behind on the OLD id, and the
      // API serves it as a 200 -- so watching a stale REGISTRATION_ID reported a
      // green tick forever. Nothing recovers a deregistered id; it is terminal.
      terminal: m.activation_status === "rejected" || m.activation_status === "deregistered",
    };
  } catch (e) {
    return { status: `lookup failed: ${e.message}`, terminal: false };
  }
}

async function tick() {
  const [endpoint, registration] = await Promise.all([checkEndpoint(), checkRegistration()]);
  const parts = [];

  if (endpoint) {
    parts.push(`endpoint=${endpoint.ok ? "ok" : "FAIL"} ${endpoint.ms}ms (${endpoint.detail})`);
  }
  if (registration) {
    parts.push(`activation=${registration.status}`);
  }
  console.log(`[${stamp()}] ${parts.join("  ")}`);

  if (consecutiveEndpointFailures >= 2) {
    console.error(
      `  !! endpoint has failed ${consecutiveEndpointFailures} checks in a row — ` +
        `spot checks run every ~20s, so this is already costing score.`,
    );
  }
  if (registration && registration.status !== lastStatus) {
    if (lastStatus !== null) console.error(`  !! activation_status changed: ${lastStatus} -> ${registration.status}`);
    lastStatus = registration.status;
  }
  if (registration?.reason) console.error(`  !! rejection_reason: ${registration.reason}`);
  if (registration?.terminal) {
    console.error("  !! TERMINAL rejection — fix the cause, then updateMiner. The slug is released meanwhile.");
    process.exitCode = 1;
    return false;
  }

  return (endpoint === null || endpoint.ok) && (registration === null || !registration.terminal);
}

const first = await tick();
if (once) {
  // Set exitCode and let the loop drain rather than calling process.exit().
  // A hard exit while fetch's sockets are still closing trips a libuv assertion
  // on Windows and returns 127 — a monitor reporting a false failure is worse
  // than no monitor at all.
  process.exitCode = first ? 0 : 1;
} else {
  setInterval(() => {
    tick().catch((e) => console.error(`[${stamp()}] watcher error: ${e.message}`));
  }, intervalMs);
}
