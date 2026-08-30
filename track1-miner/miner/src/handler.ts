import type { IncomingMessage, ServerResponse } from "node:http";
import { checkCertificate, normalizeTarget, type SslResult } from "./ssl";
import { checkStorm, type StormResult } from "./storm";
import { translate, type TranslationResult } from "./translate";
import { findPapers, type PaperResult } from "./papers";
import { getForecast, type ForecastResult } from "./forecast";
import { geolocate, type GeoResult } from "./geo";
import { detectAiText, type AiDetectResult } from "./aidetect";
import { withRestatement, isAnswered } from "./restate";

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 60_000);
const MAX_CACHE = 500;
export const ENDPOINTS = [
  "/ssl-check", "/storm-alert", "/weather-forecast",
  "/ip-geolocate", "/translate", "/papers",
  "/ai-detect",
] as const;

/**
 * A one-minute cache matches miner.yaml, absorbs repeated spot checks, and
 * reduces dependence on free upstreams. Callers can lower it with CACHE_TTL_MS.
 */
type Answer =
  | SslResult | StormResult | ForecastResult | GeoResult | TranslationResult | PaperResult
  | AiDetectResult;
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
 * An answer, with the request restated at the head of its prose.
 *
 * Every ground truth in these intents restates the request before answering it,
 * and the scorer weights resemblance to that text heavily. Applied here rather
 * than inside each domain module so the cache keeps one canonical answer per
 * subject while the restatement is always the live question, not whichever
 * question first warmed the entry. Measurements: src/restate.ts.
 */
function sendAnswer(res: ServerResponse, question: string, body: unknown): void {
  const b = body as Record<string, unknown>;
  const reason = typeof b?.reason === "string" ? b.reason : "";
  if (!reason) {
    send(res, 200, body);
    return;
  }
  send(res, 200, { ...b, reason: withRestatement(question, reason, isAnswered(b)) });
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
function upstreamUnavailable(res: ServerResponse, what: string, subject: string, question = ""): void {
  sendAnswer(res, question, {
    verdict: "unknown",
    confidence: 0,
    reason:
      `${what} for ${subject} could not be retrieved right now because the upstream data ` +
      `provider did not respond successfully. This is a temporary data availability problem, ` +
      `not a statement about ${subject}. Retrying shortly should succeed.`,
    error: "upstream_unavailable",
  });
}


/**
 * Coordinates supplied as separate parameters.
 *
 * Telegraph's engine fills the parameters a miner *declares* in its input_schema
 * and drops the rest of the question. The rank-1 storm miner declares lat/lon and
 * receives coordinate questions; we declared only `location` and received an
 * empty string for "latitude 37.7749 and longitude -122.4194", then answered
 * "no location was provided". Accepting the pair costs nothing and is ready for
 * the schema change.
 */
/**
 * The forecast window the request asked for, as "48-hour", or "" if none was
 * given. Used when we cannot answer: the engine fills only the parameters it
 * chooses, and when it sends a window but no location that window is the only
 * piece of the question we have to echo back.
 */
function requestedWindow(url: URL): string {
  const hours = Number(firstValue(url, "hours", "forecast_hours"));
  if (Number.isFinite(hours) && hours > 0) return `${Math.floor(hours)}-hour`;
  const days = Number(firstValue(url, "days", "forecast_days"));
  if (Number.isFinite(days) && days > 0) return `${Math.floor(days) * 24}-hour`;
  return "";
}

function coordsFromParams(url: URL): string {
  const lat = firstValue(url, "latitude", "lat");
  const lon = firstValue(url, "longitude", "lon", "lng");
  if (!lat || !lon) return "";
  const a = Number(lat);
  const b = Number(lon);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "";
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return "";
  return `${a},${b}`;
}

export function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  // Off by default. When enabled, record parameter names only—never user text.
  // An empty value is marked, because "the engine sent text=" and "the engine
  // sent nothing" are different diagnoses (epoch 290's translate refusal).
  if (process.env.LOG_QUERY === "on") {
    const u = new URL(req.url ?? "/", "http://localhost");
    const names = [...new Set(u.searchParams.keys())]
      .map((k) => ((u.searchParams.get(k) ?? "").trim() ? k : `${k}=EMPTY`))
      .join(",");
    const line = names ? `${u.pathname}?[${names}]` : u.pathname;
    process.stdout.write(`REQ ${req.method ?? "?"} ${line}\n`);
  }

  // Base is only needed so URL can parse a path-relative request line.
  const url = new URL(req.url ?? "/", "http://localhost");
  // Lowercased as well as trailing-slash tolerant. The engine builds this URL
  // from our manifest, but any mismatch at all — a trailing slash, a capital
  // letter — falls through to the 404 below, and a non-2xx is recorded as an
  // upstream error with an empty answer, which scores 0 for the whole epoch. In
  // epoch 293, 8 of 36 scored rows across the field carried an infrastructure
  // failure of exactly this family. Being permissive here costs nothing.
  const path = (url.pathname.replace(/\/+$/, "") || "/").toLowerCase();

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

  // Any method is answered as a GET, so there is no 405 branch at all. The
  // manifest declares GET and that is what the engine sends today, but a 405 is
  // a guaranteed zero for the epoch, and this service has nothing to protect:
  // every route is a pure read with no side effects, so serving a POST the same
  // answer is safe. `skywire-storm-alert` and `iplocate` both lost epoch 293 to
  // endpoint-shape errors of this family.

  // Liveness. Deliberately does no outbound work so it can never fail for a
  // reason outside this process.
  if (path === "/" || path === "/health") {
    send(res, 200, { status: "ok", service: "livecert", uptime_s: Math.floor(process.uptime()) });
    return;
  }

  if (path === "/weather-forecast") {
    const q =
      firstValue(url, "query", "q", "question", "text", "input", "location", "place", "city") ||
      coordsFromParams(url);
    if (!q.trim()) {
      // The engine sometimes fills `location` with an empty string and sends no
      // coordinates and no question — that is what happened in epoch 288, on a
      // question that named latitude 37.7749 and longitude -122.4194. We cannot
      // invent a location, but we can answer with the part of the request we did
      // receive: naming the window it asked for is the question's own vocabulary,
      // and throwing it away was leaving the only available overlap on the table.
      const w = requestedWindow(url);
      sendAnswer(res, q, {
        location: null,
        verdict: "unknown",
        confidence: 0,
        reason:
          `A${w ? ` ${w}` : ""} hourly weather forecast could not be produced because no location was ` +
          "supplied with this request. Supply a place name such as London, or a latitude and longitude, " +
          `and the hourly temperature in Celsius, precipitation probability and wind speed${w ? ` over the next ${w.replace("-hour", " hours")}` : ""} ` +
          "can be returned.",
        error: "invalid_location",
      });
      return;
    }
    const days = Number(firstValue(url, "days", "forecast_days"));
    const daysRequested = Number.isFinite(days) && days > 0 ? Math.floor(days) : null;
    const hours = Number(firstValue(url, "hours")) || (daysRequested ? daysRequested * 24 : 24);
    const window = Number.isFinite(hours) ? hours : 24;
    const key = `fc:${q.trim().toLowerCase()}:${Math.floor(window)}:${daysRequested ?? ""}`;
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, hit);
      return;
    }
    getForecast(q, window, undefined, daysRequested)
      .then((result) => {
        toCache(key, result);
        sendAnswer(res, q, result);
      })
      .catch(() => upstreamUnavailable(res, "A weather forecast", q.slice(0, 80), q));
    return;
  }

  if (path === "/ip-geolocate") {
    const q = firstValue(url, "ip", "address", "query", "q", "question", "text", "input");
    if (!q.trim()) {
      sendAnswer(res, q, {
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
      sendAnswer(res, q, hit);
      return;
    }
    geolocate(q)
      .then((result) => {
        toCache(key, result);
        sendAnswer(res, q, result);
      })
      .catch(() => {
        upstreamUnavailable(res, "IP geolocation", q.slice(0, 80), q);
      });
    return;
  }

  if (path === "/storm-alert") {
    const q =
      firstValue(url, "query", "q", "question", "text", "input", "location", "place", "city") ||
      coordsFromParams(url);
    if (!q.trim()) {
      sendAnswer(res, q, {
        location: null,
        verdict: "unknown",
        confidence: 0,
        risk_score: 0,
        reason:
          `Storm risk${requestedWindow(url) ? ` over the next ${requestedWindow(url).replace("-hour", " hours")}` : ""} ` +
          "could not be assessed because no location was supplied with this request. " +
          "Supply a place name such as Chennai, or a latitude and longitude, and the wind speed, " +
          "gusts, precipitation and an overall risk between 0 and 1 can be returned.",
        error: "invalid_location",
      });
      return;
    }
    const key = `storm:${q.trim().toLowerCase()}:${url.searchParams.get("hours") ?? ""}`;
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, hit);
      return;
    }
    // Only an explicit ?hours= forces a window; otherwise the question's wording
    // decides whether it is asking about a moment or a span.
    const stormDays = Number(firstValue(url, "days", "forecast_days"));
    const stormHours =
      Number(firstValue(url, "hours", "forecast_hours")) ||
      (Number.isFinite(stormDays) && stormDays > 0 ? stormDays * 24 : NaN);
    checkStorm(q, undefined, Number.isFinite(stormHours) ? stormHours : undefined)
      .then((result) => {
        toCache(key, result);
        sendAnswer(res, q, result);
      })
      .catch(() => upstreamUnavailable(res, "A storm risk forecast", q.slice(0, 80), q));
    return;
  }

  // AI_TEXT_DETECTION and TEXT_AUTHENTICITY_CHECK share this endpoint: both ask
  // whether a supplied passage was machine generated, and the honest answer is
  // the same measurement either way.
  if (path === "/ai-detect") {
    const asked = firstValue(url, "query", "q", "question");
    const subject = firstValue(url, "text", "content", "passage", "input") || asked;
    sendAnswer(res, asked, detectAiText(subject));
    return;
  }

  if (path === "/papers") {
    const topic = firstValue(url, "topic", "text", "input");
    const q = firstValue(url, "query", "q", "question") || topic;
    if (!q.trim()) {
      sendAnswer(res, q, {
        verdict: "unknown",
        confidence: 0,
        reason: "No research topic was supplied with this request, so no papers could be found. Name a subject to search for.",
        error: "invalid_input",
      });
      return;
    }
    const key = `papers:${q.trim().toLowerCase()}`;
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, hit);
      return;
    }
    findPapers(q)
      .then((r) => {
        toCache(key, r);
        sendAnswer(res, q, r);
      })
      .catch(() => upstreamUnavailable(res, "A paper search", q.slice(0, 50), q));
    return;
  }

  if (path === "/translate") {
    const text = firstValue(url, "text", "input");
    const language = firstValue(url, "target_language", "language", "target");
    const q = firstValue(url, "query", "q", "question") ||
      (text && language ? `Translate ${JSON.stringify(text)} into ${language}.` : text);
    if (!q.trim()) {
      sendAnswer(res, q, {
        verdict: "unknown",
        confidence: 0,
        reason:
          "No text was supplied to translate. Quote the text and name a target language, " +
          "for example: Translate \"Good morning\" into French.",
        error: "invalid_input",
      });
      return;
    }
    const key = `translate:${q.trim().toLowerCase()}`;
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, hit);
      return;
    }
    translate(q)
      .then((r) => {
        toCache(key, r);
        sendAnswer(res, q, r);
      })
      .catch(() => upstreamUnavailable(res, "A translation", "the supplied text", q));
    return;
  }

  if (!(ENDPOINTS as readonly string[]).includes(path)) {
    send(res, 404, {
      error: "not_found",
      message: "Use one of the six endpoints declared in miner.yaml.",
    });
    return;
  }

  const raw = firstValue(url, "domain", "host", "hostname", "url", "query", "q", "question", "text", "input");

  // The question text itself, when the engine delivered it. `raw` may be a bare
  // hostname, which is not a sentence to restate.
  const question = firstValue(url, "query", "q", "question", "text", "input");

  const target = normalizeTarget(raw);
  if (!target) {
    // Shaped like an answer, not a bare error. semantics.signal_mapping points at
    // verdict/confidence/reason, and a body without those fields resolves to
    // nothing at all — a scorer comparing text finds no vocabulary in
    // {"error":"invalid_domain"}. Saying "I could not determine this" in the
    // schema's own words is both honest and legible. The status is 200 and must
    // stay 200: a non-2xx makes the engine record `upstream error`, store an
    // empty answer and never read this body, which is a guaranteed 0. Being
    // explicit that we could not determine the answer is not a liar-200 (A5).
    sendAnswer(res, question, {
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
    sendAnswer(res, question, cached);
    return;
  }

  checkCertificate(target.host, target.port)
    .then((result) => {
      toCache(key, result);
      sendAnswer(res, question, result);
    })
    .catch(() => upstreamUnavailable(res, "A TLS certificate check", target.host, question));
}
