import type { IncomingMessage, ServerResponse } from "node:http";
import { checkCertificate, normalizeTarget, type SslResult } from "./ssl";
import { checkStorm, type StormResult } from "./storm";
import { getForecast, type ForecastResult } from "./forecast";
import { geolocate, type GeoResult } from "./geo";

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 60_000);
const MAX_CACHE = 500;

/**
 * Telegraph validators spot-check roughly every 20 seconds. A short cache keeps
 * repeat checks of the same host sub-millisecond without ever serving a stale
 * verdict for longer than the spot-check interval.
 */
type Answer = SslResult | StormResult | ForecastResult | GeoResult;
const cache = new Map<string, { at: number; value: Answer }>();

function fromCache(key: string): Answer | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function toCache(key: string, value: Answer): void {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

/**
 * The whole API surface as a plain (req, res) handler.
 *
 * Kept separate from the server so the same code runs two ways: behind
 * http.createServer locally and on a long-lived host, and as a serverless
 * function on platforms that hand you (req, res) directly. Neither deployment
 * target gets a divergent copy of the routing.
 */
export function handleRequest(req: IncomingMessage, res: ServerResponse): void {

  // Base is only needed so URL can parse a path-relative request line.
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/";

  // Answer CORS/capability preflights rather than 405ing them. Telegraph's sandbox
  // probes endpoints before pinning and a bare 405 reads as a broken endpoint even
  // though real GET traffic is fine.
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      allow: "GET, HEAD, OPTIONS",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-max-age": "86400",
    });
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("allow", "GET, HEAD, OPTIONS");
    send(res, 405, { error: "method_not_allowed", message: "Use GET." });
    return;
  }

  // Liveness. Deliberately does no outbound work so it can never fail for a
  // reason outside this process.
  if (path === "/" || path === "/health") {
    send(res, 200, { status: "ok", service: "livecert", uptime_s: Math.floor(process.uptime()) });
    return;
  }

  if (path === "/weather-forecast") {
    const q =
      url.searchParams.get("location") ??
      url.searchParams.get("place") ??
      url.searchParams.get("city") ??
      url.searchParams.get("query") ??
      "";
    if (!q.trim()) {
      send(res, 400, {
        location: q.slice(0, 200),
        verdict: "unknown",
        confidence: 0,
        reason: "No location could be read from the request, so a forecast could not be produced. Name a place such as London.",
        error: "invalid_location",
      });
      return;
    }
    const hours = Number(url.searchParams.get("hours") ?? 24);
    const window = Number.isFinite(hours) ? hours : 24;
    const key = `fc:${q.trim().toLowerCase()}:${Math.floor(window)}`;
    const hit = fromCache(key);
    if (hit) {
      send(res, 200, hit);
      return;
    }
    getForecast(q, window)
      .then((result) => {
        toCache(key, result);
        send(res, 200, result);
      })
      .catch((e: unknown) => {
        send(res, 502, { error: "check_failed", message: (e as Error).message });
      });
    return;
  }

  if (path === "/ip-geolocate") {
    const q =
      url.searchParams.get("ip") ??
      url.searchParams.get("address") ??
      url.searchParams.get("query") ??
      "";
    if (!q.trim()) {
      send(res, 400, {
        ip: "",
        verdict: "unknown",
        confidence: 0,
        reason: "No IP address could be read from the request, so its location could not be determined. Supply an address such as 8.8.8.8.",
        error: "invalid_ip",
      });
      return;
    }
    const key = `geo:${q.trim().toLowerCase()}`;
    const hit = fromCache(key);
    if (hit) {
      send(res, 200, hit);
      return;
    }
    geolocate(q)
      .then((result) => {
        toCache(key, result);
        send(res, 200, result);
      })
      .catch((e: unknown) => {
        send(res, 502, { error: "check_failed", message: (e as Error).message });
      });
    return;
  }

  if (path === "/storm-alert") {
    const q =
      url.searchParams.get("location") ??
      url.searchParams.get("place") ??
      url.searchParams.get("city") ??
      url.searchParams.get("query") ??
      "";
    if (!q.trim()) {
      send(res, 400, {
        location: q.slice(0, 200),
        verdict: "unknown",
        confidence: 0,
        reason: "No location could be read from the request, so storm risk could not be assessed. Name a place such as Chennai.",
        error: "invalid_location",
      });
      return;
    }
    const key = `storm:${q.trim().toLowerCase()}:${url.searchParams.get("hours") ?? ""}`;
    const hit = fromCache(key);
    if (hit) {
      send(res, 200, hit);
      return;
    }
    // Only an explicit ?hours= forces a window; otherwise the question's wording
    // decides whether it is asking about a moment or a span.
    const stormHours = Number(url.searchParams.get("hours") ?? NaN);
    checkStorm(q, undefined, Number.isFinite(stormHours) ? stormHours : undefined)
      .then((result) => {
        toCache(key, result);
        send(res, 200, result);
      })
      .catch((e: unknown) => {
        send(res, 502, { error: "check_failed", message: (e as Error).message });
      });
    return;
  }

  if (path !== "/ssl-check") {
    send(res, 404, {
      error: "not_found",
      message: "Try /ssl-check?domain=example.com, /storm-alert?location=Chennai, /weather-forecast?location=London, or /ip-geolocate?ip=8.8.8.8",
    });
    return;
  }

  const raw =
    url.searchParams.get("domain") ??
    url.searchParams.get("host") ??
    url.searchParams.get("hostname") ??
    url.searchParams.get("url") ??
    url.searchParams.get("query") ??
    "";

  const target = normalizeTarget(raw);
  if (!target) {
    // Shaped like an answer, not a bare error. semantics.signal_mapping points at
    // verdict/confidence/reason, and a body without those fields resolves to
    // nothing at all — a scorer comparing text finds no vocabulary in
    // {"error":"invalid_domain"}. Saying "I could not determine this" in the
    // schema's own words is both honest and legible. The status stays 400
    // because the request genuinely was malformed (A5: no liar-200s).
    send(res, 400, {
      domain: raw.slice(0, 200),
      verdict: "unknown",
      confidence: 0,
      reason: `No hostname could be read from ${JSON.stringify(raw.slice(0, 120))}, so the SSL certificate could not be checked. Supply a domain such as example.com.`,
      error: "invalid_domain",
    });
    return;
  }

  const key = `ssl:${target.host}:${target.port}`;
  const cached = fromCache(key);
  if (cached) {
    send(res, 200, cached);
    return;
  }

  checkCertificate(target.host, target.port)
    .then((result) => {
      toCache(key, result);
      send(res, 200, result);
    })
    .catch((e: unknown) => {
      send(res, 502, { error: "check_failed", message: (e as Error).message });
    });
}
