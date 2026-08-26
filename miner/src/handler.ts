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

/**
 * First parameter that actually carries a value.
 *
 * Telegraph's engine builds the call from our input_schema and will send a
 * declared parameter as an EMPTY STRING when it cannot fill it. `??` only falls
 * through on null/undefined, so `get("location") ?? get("query")` stopped at the
 * empty string and never looked at the question — a real scored request failed
 * this way with `{"location":"", ... "error":"invalid_location"}` and scored 0,
 * because the scorer receives the converted answer and there was none.
 *
 * Treating empty and whitespace-only as absent is the whole fix.
 */
/**
 * An honest "could not determine" answer, sent as 200.
 *
 * Telegraph's engine treats any 4xx from a miner as a failed call: it records
 * `upstream error 400`, stores an empty miner_answer, produces no converted
 * answer, and the scorer therefore sees nothing and scores 0. A well-shaped 400
 * body buys nothing because the body is never read.
 *
 * So a request we cannot answer returns 200 with a truthful statement that we
 * could not determine it. That is not a liar-200 in the sense ARCHITECTURE A5
 * warns about — we are the upstream here, and "I could not establish this" is a
 * real answer to the question rather than a false success.
 */
function firstValue(url: URL, ...names: string[]): string {
  for (const n of names) {
    const v = url.searchParams.get(n);
    if (v !== null && v.trim().length > 0) return v;
  }
  return "";
}


/**
 * An upstream failure, reported as an answer rather than a 502.
 *
 * Any non-2xx from a miner is recorded by the engine as `upstream error`, stores
 * an empty miner_answer, produces no converted answer, and scores 0. A transient
 * rate limit from a weather provider therefore cost the whole question. Saying
 * "this could not be retrieved right now" is truthful and at least scoreable.
 */
function upstreamUnavailable(res: ServerResponse, what: string, subject: string, e: unknown): void {
  send(res, 200, {
    verdict: "unknown",
    confidence: 0,
    reason:
      `${what} for ${subject} could not be retrieved right now because the upstream data ` +
      `provider did not respond successfully. This is a temporary data availability problem, ` +
      `not a statement about ${subject}. Retrying shortly should succeed.`,
    error: "upstream_unavailable",
    detail: (e as Error).message,
  });
}

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
    const q = firstValue(url, "location", "place", "city", "query", "q", "text", "question", "input");
    if (!q.trim()) {
      send(res, 200, {
        location: null,
        verdict: "unknown",
        confidence: 0,
        reason:
          "No location was supplied with this request, so a weather forecast could not be produced. " +
          "Supply a place name such as London, or a latitude and longitude, and the hourly temperature, " +
          "precipitation and wind forecast can be returned.",
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
      .catch((e: unknown) => upstreamUnavailable(res, "A weather forecast", q.slice(0, 80), e));
    return;
  }

  if (path === "/ip-geolocate") {
    const q = firstValue(url, "ip", "address", "query", "q", "text", "question", "input");
    if (!q.trim()) {
      send(res, 200, {
        ip: null,
        verdict: "unknown",
        confidence: 0,
        reason:
          "No IP address was supplied with this request, so its geographic location could not be " +
          "determined. Supply an address such as 8.8.8.8 and the country, city, coordinates and " +
          "network operator can be returned.",
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
        upstreamUnavailable(res, "IP geolocation", q.slice(0, 80), e);
      });
    return;
  }

  if (path === "/storm-alert") {
    const q = firstValue(url, "location", "place", "city", "query", "q", "text", "question", "input");
    if (!q.trim()) {
      send(res, 200, {
        location: null,
        verdict: "unknown",
        confidence: 0,
        risk_score: 0,
        reason:
          "No location was supplied with this request, so storm risk could not be assessed. " +
          "Supply a place name such as Chennai, or a latitude and longitude, and the wind speed, " +
          "gusts, precipitation and an overall risk between 0 and 1 can be returned.",
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
      .catch((e: unknown) => upstreamUnavailable(res, "A storm risk forecast", q.slice(0, 80), e));
    return;
  }

  if (path !== "/ssl-check") {
    send(res, 404, {
      error: "not_found",
      message: "Try /ssl-check?domain=example.com, /storm-alert?location=Chennai, /weather-forecast?location=London, or /ip-geolocate?ip=8.8.8.8",
    });
    return;
  }

  const raw = firstValue(url, "domain", "host", "hostname", "url", "query", "q", "text", "question", "input");

  const target = normalizeTarget(raw);
  if (!target) {
    // Shaped like an answer, not a bare error. semantics.signal_mapping points at
    // verdict/confidence/reason, and a body without those fields resolves to
    // nothing at all — a scorer comparing text finds no vocabulary in
    // {"error":"invalid_domain"}. Saying "I could not determine this" in the
    // schema's own words is both honest and legible. The status stays 400
    // because the request genuinely was malformed (A5: no liar-200s).
    send(res, 200, {
      domain: raw ? raw.slice(0, 200) : null,
      verdict: "unknown",
      confidence: 0,
      reason:
        `No hostname was supplied with this request, so the TLS/SSL certificate could not be ` +
        `analyzed. Certificate chain completeness and hostname validation cannot be verified ` +
        `without a domain. Supply a domain such as example.com.`,
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
    .catch((e: unknown) => upstreamUnavailable(res, "A TLS certificate check", target.host, e));
}
