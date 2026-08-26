import * as http from "node:http";
import { load, save, latest, type State } from "./store.js";
import { runOnce, checkDomain } from "./monitor.js";
import { record } from "./store.js";
import { payerAddress } from "./telegraph.js";
import { DASHBOARD_HTML } from "./dashboard.js";
import { bearerFrom, tokenMatches, RateLimiter, checkCap, emptySpend, rollDay, type SpendState } from "./limits.js";

const PORT = Number(process.env.PORT ?? 3000);
const INTERVAL_MS = Number(process.env.CHECK_INTERVAL_MS ?? 6 * 60 * 60 * 1000);

let state: State = await load();

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}

async function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  void (async () => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/" && req.method === "GET") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(DASHBOARD_HTML);
        return;
      }

      if (path === "/api/state" && req.method === "GET") {
        json(res, 200, {
          domains: state.domains,
          latest: latest(state),
          totals: state.totals,
          payer: payerAddress(),
          keyConfigured: Boolean(process.env.EVM_PRIVATE_KEY),
          writesEnabled: Boolean(ADMIN_TOKEN),
          paidCallsToday: spend.paidToday,
          paidCallsPerDayCap: MAX_PAID_CALLS_PER_DAY,
        });
        return;
      }

      if (path === "/api/domains" && req.method === "POST") {
        // Adding a domain immediately checks it, which is a paid call.
        if (!guardPaid(req, res, 1)) return;
        const body = await readBody(req);
        const domain = String(body["domain"] ?? "").trim().toLowerCase();
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
          json(res, 400, { error: "invalid domain" });
          return;
        }
        if (!state.domains.includes(domain)) {
          state.domains.push(domain);
          await save(state);
          // Check it immediately so the dashboard is never empty on first add.
          const check = await checkDomain(domain);
          record(state, check);
          await save(state);
        }
        json(res, 200, { ok: true, domains: state.domains });
        return;
      }

      if (path === "/api/domains" && req.method === "DELETE") {
        // Costs nothing, but still a mutation — same token, no rate/cap charge.
        if (!ADMIN_TOKEN || !tokenMatches(bearerFrom(req.headers.authorization), ADMIN_TOKEN)) {
          json(res, ADMIN_TOKEN ? 401 : 503, { error: ADMIN_TOKEN ? "unauthorized" : "ADMIN_TOKEN is not set" });
          return;
        }
        const domain = String(url.searchParams.get("domain") ?? "").toLowerCase();
        state.domains = state.domains.filter((d) => d !== domain);
        await save(state);
        json(res, 200, { ok: true, domains: state.domains });
        return;
      }

      if (path === "/api/check" && req.method === "POST") {
        // One paid call per monitored domain.
        if (!guardPaid(req, res, Math.max(1, state.domains.length))) return;
        state = await runOnce(state);
        json(res, 200, { ok: true, latest: latest(state), totals: state.totals });
        return;
      }

      json(res, 404, { error: "not found" });
    } catch (e) {
      json(res, 500, { error: (e as Error).message });
    }
  })();
}

/**
 * Paid-call guards. MAX_PAID_CALLS_PER_DAY defaults to 0 so a deployment without
 * an explicit budget cannot spend anything, however it is reached.
 */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const MAX_PAID_CALLS_PER_DAY = Number(process.env.MAX_PAID_CALLS_PER_DAY ?? 0);
const paidLimiter = new RateLimiter(
  Number(process.env.PAID_RATE_MAX ?? 6),
  Number(process.env.PAID_RATE_WINDOW_MS ?? 60_000),
);
let spend: SpendState = emptySpend(Date.now());

/** Everything that can spend money goes through here first. */
function guardPaid(req: http.IncomingMessage, res: http.ServerResponse, calls: number): boolean {
  if (!ADMIN_TOKEN) {
    json(res, 503, { error: "ADMIN_TOKEN is not set — write endpoints are disabled" });
    return false;
  }
  if (!tokenMatches(bearerFrom(req.headers.authorization), ADMIN_TOKEN)) {
    json(res, 401, { error: "unauthorized" });
    return false;
  }
  const now = Date.now();
  const rate = paidLimiter.take(now);
  if (!rate.allowed) {
    res.setHeader("retry-after", String(rate.retryAfterS));
    json(res, 429, { error: "rate limited", retry_after_s: rate.retryAfterS });
    return false;
  }
  spend = rollDay(spend, now);
  const cap = checkCap(spend, calls, MAX_PAID_CALLS_PER_DAY, now);
  if (!cap.allowed) {
    json(res, 402, { error: "spending cap", detail: cap.reason, remaining_today: cap.remaining });
    return false;
  }
  spend.paidToday += calls;
  return true;
}

const app = http.createServer(handleRequest);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`certwatch dashboard on http://localhost:${PORT}`);
    console.log(`paying from ${payerAddress() ?? "(EVM_PRIVATE_KEY not set — checks will fail)"}`);
  });
}

// Background sweeps only make sense on a long-lived process. A serverless instance
// is frozen between requests, so the interval would never reliably fire.
if (INTERVAL_MS > 0 && !process.env.VERCEL) {
  setInterval(() => {
    console.log(`[${new Date().toISOString()}] scheduled sweep`);
    runOnce(state).catch((e) => console.error("sweep failed:", (e as Error).message));
  }, INTERVAL_MS);
}

/**
 * Vercel's Node runtime uses this module's default export as the entrypoint and
 * accepts an http.Server directly. Locally the listen() above runs instead; on
 * Vercel it is skipped and the platform drives this server.
 */
export default app;
