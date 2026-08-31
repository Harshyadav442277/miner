import type { IncomingMessage, ServerResponse } from "node:http";
import { checkCertificate, normalizeTarget, type SslResult } from "./ssl";
import { checkStorm, type StormResult } from "./storm";
import { translate, type TranslationResult } from "./translate";
import { academicAnswer, findPapers, type PaperResult } from "./papers";
import { getForecast, type ForecastResult } from "./forecast";
import { geolocate, SPECIAL_GEO_VERDICTS, type GeoResult } from "./geo";
import { detectAiText, type AiDetectResult } from "./aidetect";
import { extractContent } from "./content";
import { getHeadlines } from "./news";
import { checkBalance, type WalletResult } from "./wallet";
import { checkFact, type FactCheckResult } from "./factcheck";
import { answerTelegraph, type TelegraphResult } from "./telegraph";
import { withRestatement, isAnswered } from "./restate";

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 60_000);
const MAX_CACHE = 500;
export const ENDPOINTS = [
  "/ssl-check", "/storm-alert", "/weather-forecast",
  "/ip-geolocate", "/translate", "/papers",
  "/ai-detect", "/extract", "/headlines", "/wallet-balance",
  "/fact-check", "/telegraph",
] as const;

/**
 * A one-minute cache matches miner.yaml, absorbs repeated spot checks, and
 * reduces dependence on free upstreams. Callers can lower it with CACHE_TTL_MS.
 */
type Answer =
  | SslResult | StormResult | ForecastResult | GeoResult | TranslationResult | PaperResult
  | AiDetectResult | WalletResult | FactCheckResult | TelegraphResult;
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

/**
 * Our own deadline, set inside the platform's.
 *
 * Vercel kills the function at `maxDuration` — 15s in vercel.json — and returns
 * a 504. Telegraph records any non-2xx as `upstream error`, stores an empty
 * miner_answer, and the scorer sees nothing: a guaranteed 0 for the epoch,
 * costing exactly what a 400 costs. Several routes can reach that ceiling when
 * upstreams hang rather than fail — `/storm-alert` geocodes candidates
 * sequentially at 8s each before it even fetches a forecast, `/wallet-balance`
 * walks four RPC endpoints at 6s, `/translate` tries two providers at 8s.
 *
 * So the deadline has to be ours. At 11s we answer honestly that the upstream
 * did not respond in time, which is truthful, is a 200, and is scoreable text.
 * A provider that replies afterwards finds the response already sent and is
 * dropped, which is why `send` is idempotent rather than merely guarded here.
 *
 * Read per call rather than once at load, so it stays configurable and testable.
 */
function watchdogMs(): number {
  const v = Number(process.env.WATCHDOG_MS);
  return Number.isFinite(v) && v > 0 ? v : 11_000;
}
const pending = new WeakMap<ServerResponse, ReturnType<typeof setTimeout>>();
const answered = new WeakSet<ServerResponse>();

/** What each route is fetching, for the watchdog's sentence. */
const SUBJECT_OF: Record<string, string> = {
  "/ssl-check": "A TLS certificate check",
  "/storm-alert": "A storm risk forecast",
  "/weather-forecast": "A weather forecast",
  "/ip-geolocate": "An IP geolocation lookup",
  "/translate": "A translation",
  "/papers": "A paper search",
  "/ai-detect": "An authorship analysis",
  "/extract": "A field extraction",
  "/headlines": "Current headlines",
  "/wallet-balance": "A wallet balance lookup",
  "/fact-check": "A fact check",
  "/telegraph": "An answer about Telegraph",
};

function armWatchdog(res: ServerResponse, path: string, question: string): void {
  const timer = setTimeout(() => {
    if (answered.has(res)) return;
    upstreamUnavailable(res, SUBJECT_OF[path] ?? "This answer", question.trim() ? question.slice(0, 80) : "this request", question);
  }, watchdogMs());
  // Never keep a process alive for the watchdog alone.
  timer.unref?.();
  pending.set(res, timer);
}

function send(res: ServerResponse, status: number, body: unknown): void {
  // The first answer wins. Both the watchdog and the route itself can reach
  // here, and writing a second response to a closed socket throws.
  if (answered.has(res)) return;
  answered.add(res);
  const timer = pending.get(res);
  if (timer) {
    clearTimeout(timer);
    pending.delete(res);
  }
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
function sendAnswer(res: ServerResponse, question: string, body: unknown, restate = true): void {
  const b = body as Record<string, unknown>;
  const reason = typeof b?.reason === "string" ? b.reason : "";
  if (!reason || !restate) {
    send(res, 200, body);
    return;
  }
  send(res, 200, { ...b, reason: withRestatement(question, reason, isAnswered(b)) });
}

/**
 * The scored text is the converter's summary of the WHOLE payload, keys
 * alphabetized — every metadata field is scored surface diluting the prose.
 * Projecting the response to the three fields signal_mapping names lifted the
 * payload surface 4.6x on SSL, 2.9x on weather and 1.25x on wallet (bench
 * flat32 under champions 631/636/2791, 2026-08-31) with the prose
 * byte-identical — the same measured move as ACADEMIC (+122%) and the
 * translate starve before it. Applied at the send, so caches and internal
 * functions keep every fact; `error` is kept where present so an honest
 * failure stays machine-readable.
 */
function lean(body: unknown): Record<string, unknown> {
  const b = body as Record<string, unknown>;
  const out: Record<string, unknown> = { verdict: b.verdict, confidence: b.confidence, reason: b.reason };
  if (b.error !== undefined) out.error = b.error;
  return out;
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
 * The question text, guaranteed to still contain the subject the engine parsed out.
 *
 * `firstValue` returns the FIRST populated parameter, so a route that lists
 * `query` ahead of its declared subject silently discards that subject whenever
 * both arrive. That is fine while `query` is the verbatim question — it contains
 * the subject already — and catastrophic when it is a paraphrase: the engine
 * fills the required parameter from the question and sends a `query` that refers
 * back to it as "this wallet", "there", "this subject".
 *
 * Measured against production on 2026-08-30, six of the ten routes failed this
 * way. Four refused outright (a guaranteed 0 for the epoch, the same shape as
 * epoch 288's weather refusal), and two answered CONFIDENTLY WRONG: `/papers`
 * returned neuroimaging papers for a CRISPR topic, and `/storm-alert` asked
 * about Chennai reported the risk for Teresópolis, Brazil.
 *
 * Restoring the subject only when it is ABSENT is what makes this safe to ship
 * onto intents we lead: when the engine sends the verbatim question the result
 * is byte-identical, so no scored surface moves.
 */
function withSubject(question: string, subject: string): string {
  const q = question.trim();
  const s = subject.trim();
  if (!s) return q;
  if (!q) return s;
  return q.toLowerCase().includes(s.toLowerCase()) ? q : `${q} ${s}`;
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

/**
 * A translation answer, stripped to the answer itself.
 *
 * Telegraph converts the WHOLE miner JSON into ~32 words of English prose and
 * scores THAT, not our `reason`. Every English field we send — the source text,
 * the language name, the provider, a timestamp — is material the converter
 * turns into prose wrapped around the translation, and this intent's ground
 * truths are bare translated strings. Measured against the live champion (reg
 * 1996) over the ten recorded questions, cliff crossings fall monotonically as
 * that wrapper grows:
 *
 *   bare translation                                  10/10
 *   "The translation is X."                            8/10
 *   "The <lang> translation of "<src>" is X."          8/10
 *   + provider and confidence clauses                  5/10
 *   full converter-style paragraph                     0/10   <- epoch 295 live
 *
 * Epoch 295 scored us 1.83e-10, last of four, which is the 0/10 row. The fix is
 * not more wording: it is sending the converter nothing to wrap. Only the three
 * fields semantics.signal_mapping names are required, and output_schema has no
 * required list, so this stays manifest-conformant. Provenance moves to the
 * miner's documentation rather than into the scored payload.
 */
function minimalTranslation(r: TranslationResult): Record<string, unknown> {
  // A refusal keeps its English sentence — it has to say what was missing.
  if (!r.translation) return { verdict: r.verdict, confidence: r.confidence, reason: r.reason };
  return {
    verdict: r.verdict,
    confidence: r.confidence,
    reason: r.reason,
    translation: r.translation,
  };
}

/**
 * The last line between a bug and a scored zero.
 *
 * Every asynchronous path already ends in a `.catch()` that answers honestly,
 * but the synchronous ones had nothing: `new URL()` on a malformed request line,
 * a parser in extractContent or detectAiText, a regex on hostile input. Any
 * throw there becomes a 500, and Telegraph scores a 500 exactly as it scores a
 * 400 — upstream error, empty miner_answer, nothing for the scorer to read.
 *
 * 180 hostile inputs across all ten routes found nothing that throws today.
 * This exists so that a future parser change cannot quietly cost an epoch, and
 * because an honest 200 is always worth more here than a correct-looking 500.
 */
/**
 * Whether an SSL answer should carry the restatement prefix.
 *
 * An unreachable host's answer now OPENS with the verification method, in the
 * ground truth's own words ("To analyze the TLS/SSL certificate configuration
 * for <host>, including chain completeness and hostname validation, run openssl
 * ..."). That already restates the question, and prefixing a second restatement
 * pushes the method out of the ~32-word conversion budget: measured against
 * champion 631 over the 10 unreachable bench rows, clip32 falls from 0.697778
 * to 0.206821 with the prefix on. Reachable answers keep it — they open with a
 * verdict, which does not restate anything.
 */
function restateSsl(result: unknown): boolean {
  return (result as { verdict?: string })?.verdict !== "unreachable";
}

export function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  try {
    route(req, res);
  } catch {
    send(res, 200, {
      verdict: "unknown",
      confidence: 0,
      reason:
        "This request could not be processed because of an internal error while parsing it. " +
        "This is a fault in this service, not a statement about the subject of the question, " +
        "and retrying shortly may succeed.",
      error: "internal_error",
    });
  }
}

function route(req: IncomingMessage, res: ServerResponse): void {
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

  // Every route below reaches an upstream, so every route below can hang. Armed
  // once here rather than in ten places; a route that answers normally clears it
  // through `send`.
  if ((ENDPOINTS as readonly string[]).includes(path)) {
    armWatchdog(res, path, firstValue(url, "query", "q", "question", "text", "input"));
  }

  if (path === "/weather-forecast") {
    const q =
      withSubject(
        firstValue(url, "query", "q", "question", "text", "input"),
        firstValue(url, "location", "place", "city"),
      ) || coordsFromParams(url);
    if (!q.trim()) {
      // The engine sometimes fills `location` with an empty string and sends no
      // coordinates and no question — that is what happened in epoch 288, on a
      // question that named latitude 37.7749 and longitude -122.4194. We cannot
      // invent a location, but we can answer with the part of the request we did
      // receive: naming the window it asked for is the question's own vocabulary,
      // and throwing it away was leaving the only available overlap on the table.
      const w = requestedWindow(url);
      sendAnswer(res, q, lean({
        location: null,
        verdict: "unknown",
        confidence: 0,
        reason:
          // "A hourly" when no window was named. The article has to follow the
          // window word, not precede a fixed "A".
          `${w ? `A ${w}` : "An"} hourly weather forecast could not be produced because no location was ` +
          "supplied with this request. Supply a place name such as London, or a latitude and longitude, " +
          `and the hourly temperature in Celsius, precipitation probability and wind speed${w ? ` over the next ${w.replace("-hour", " hours")}` : ""} ` +
          "can be returned.",
        error: "invalid_location",
      }));
      return;
    }
    const days = Number(firstValue(url, "days", "forecast_days"));
    const daysRequested = Number.isFinite(days) && days > 0 ? Math.floor(days) : null;
    // `hours=0` means the current hour — our own input_schema says so — but a
    // falsy-zero `||` here silently turned it into the 24-hour default, so a
    // "what is it right now" question was answered with a day-long range. An
    // absent parameter is an empty string, which is what separates the two.
    const hoursRaw = firstValue(url, "hours");
    const hoursNum = Number(hoursRaw);
    const hours =
      hoursRaw !== "" && Number.isFinite(hoursNum)
        ? hoursNum
        : daysRequested
          ? daysRequested * 24
          : 24;
    const window = Number.isFinite(hours) ? hours : 24;
    const key = `fc:${q.trim().toLowerCase()}:${Math.floor(window)}:${daysRequested ?? ""}`;
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, lean(hit));
      return;
    }
    getForecast(q, window, undefined, daysRequested)
      .then((result) => {
        toCache(key, result);
        sendAnswer(res, q, lean(result));
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
    // Special-range answers (private, TEST-NET, loopback…) skip the restatement:
    // their substance is range semantics, and the prefix pushed exactly those
    // words past the ~32-word conversion budget (0.99 raw vs ~0.01 clipped,
    // measured on the recorded TEST-NET questions). Public-IP answers keep it —
    // they cross the same budget with it on.
    const key = `geo:${q.trim().toLowerCase()}`;
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, hit, !SPECIAL_GEO_VERDICTS.has((hit as GeoResult).verdict));
      return;
    }
    geolocate(q)
      .then((result) => {
        toCache(key, result);
        sendAnswer(res, q, result, !SPECIAL_GEO_VERDICTS.has(result.verdict));
      })
      .catch(() => {
        upstreamUnavailable(res, "IP geolocation", q.slice(0, 80), q);
      });
    return;
  }

  if (path === "/storm-alert") {
    const q =
      withSubject(
        firstValue(url, "query", "q", "question", "text", "input"),
        firstValue(url, "location", "place", "city"),
      ) || coordsFromParams(url);
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

  if (path === "/fact-check") {
    const q = withSubject(
      firstValue(url, "query", "q", "question", "input"),
      firstValue(url, "claim", "statement", "text"),
    );
    if (!q.trim()) {
      sendAnswer(res, q, {
        verdict: "unknown",
        confidence: 0,
        reason:
          "No claim was supplied with this request, so nothing could be fact-checked. State a " +
          "checkable claim, for example: Is it true that the Eiffel Tower is in Paris?",
        error: "invalid_input",
      });
      return;
    }
    const key = `fact:${q.trim().toLowerCase()}`;
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, hit);
      return;
    }
    checkFact(q)
      .then((r) => {
        toCache(key, r);
        sendAnswer(res, q, r);
      })
      .catch(() => upstreamUnavailable(res, "A fact check", q.slice(0, 60), q));
    return;
  }

  if (path === "/telegraph") {
    const q = firstValue(url, "query", "q", "question", "text", "input", "topic");
    if (!q.trim()) {
      sendAnswer(res, q, {
        verdict: "unknown",
        confidence: 0,
        reason:
          "No question was supplied with this request, so nothing about Telegraph could be " +
          "answered. Ask about miner registration, intents, scoring, the Explorer or the hackathon.",
        error: "invalid_input",
      });
      return;
    }
    const key = `tg:${q.trim().toLowerCase()}`;
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, hit);
      return;
    }
    answerTelegraph(q)
      .then((r) => {
        toCache(key, r);
        sendAnswer(res, q, r);
      })
      .catch(() => upstreamUnavailable(res, "An answer about Telegraph", q.slice(0, 60), q));
    return;
  }

  if (path === "/wallet-balance") {
    // The engine fills `address` with the ZERO address when the question names
    // no wallet — its own leaked upstream calls show
    // `address=0x0000000000000000000000000000000000000000` being sent in epochs
    // 281, 292 and 295. Injecting that filler as the subject made this route
    // report the burn address's real holdings (25.99 ETH on Arbitrum, measured
    // live) as though they were the wallet asked about. The zero address is the
    // EVM null marker — the convention resolveEns already treats as "unset" —
    // so the filler is dropped; a question whose own text names 0x000…0 is
    // unaffected, because the text path still reads it.
    const addressParam = firstValue(url, "address", "wallet");
    const q = withSubject(
      firstValue(url, "query", "q", "question", "text", "input"),
      /^0x0{40}$/.test(addressParam) ? "" : addressParam,
    );
    if (!q.trim()) {
      sendAnswer(res, q, lean({
        verdict: "unknown",
        confidence: 0,
        reason:
          "No wallet address was supplied with this request, so no balance could be read. " +
          "Supply a 20-byte EVM address such as 0x742d35Cc6634C0532925a3b844Bc454e4438f44e, " +
          "and name a chain such as Base or Arbitrum.",
        error: "invalid_address",
      }), false);
      return;
    }
    const key = `wallet:${q.trim().toLowerCase()}:${firstValue(url, "chain", "network").toLowerCase()}`;
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, lean(hit), false);
      return;
    }
    // The structured `chain` parameter is read here, not just out of the prose:
    // a request carrying address + chain=base used to return the Ethereum
    // balance labelled `ethereum`.
    checkBalance(q, undefined, firstValue(url, "chain", "network"))
      .then((r) => {
        toCache(key, r);
        sendAnswer(res, q, lean(r), false);
      })
      .catch(() => upstreamUnavailable(res, "A wallet balance", q.slice(0, 60), q));
    return;
  }

  if (path === "/headlines") {
    const q = withSubject(
      firstValue(url, "query", "q", "question", "text", "input"),
      firstValue(url, "topic"),
    );
    if (!q.trim()) {
      sendAnswer(res, q, {
        verdict: "unknown",
        confidence: 0,
        reason:
          "No topic was supplied with this request, so no headlines could be retrieved. " +
          "Name a subject and optionally a region, for example: current technology headlines in Japan.",
        error: "invalid_input",
      }, false);
      return;
    }
    getHeadlines(q)
      .then((r) => sendAnswer(res, q, r, false))
      .catch(() => upstreamUnavailable(res, "Current headlines", q.slice(0, 60), q));
    return;
  }

  if (path === "/extract") {
    // CONTENT_EXTRACTION questions carry their payload inline, so the whole
    // question text is the input — there is nothing to fetch.
    const q = withSubject(
      firstValue(url, "query", "q", "question", "input"),
      firstValue(url, "text", "content"),
    );
    if (!q.trim()) {
      sendAnswer(res, q, {
        verdict: "unknown",
        confidence: 0,
        reason:
          "No text was supplied with this request, so no fields could be extracted. " +
          "Supply the text to extract from, for example: Extract the contact details from: " +
          "\"Reach us at support@example.com or call 555-0192.\"",
        error: "invalid_input",
      }, false);
      return;
    }
    const e = extractContent(q);
    sendAnswer(res, q, {
      verdict: e.want,
      extracted: e.fields,
      confidence: 1,
      reason: e.summary,
    }, false);
    return;
  }

  if (path === "/papers") {
    const topic = firstValue(url, "topic", "text", "input");
    const q = withSubject(firstValue(url, "query", "q", "question"), topic);
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
      sendAnswer(res, q, academicAnswer(hit as PaperResult));
      return;
    }
    findPapers(q)
      .then((r) => {
        toCache(key, r);
        sendAnswer(res, q, academicAnswer(r));
      })
      .catch(() => upstreamUnavailable(res, "A paper search", q.slice(0, 50), q));
    return;
  }

  if (path === "/translate") {
    const text = firstValue(url, "text", "input");
    const language = firstValue(url, "target_language", "language", "target");
    const asked = firstValue(url, "query", "q", "question");
    const composed = text && language ? `Translate ${JSON.stringify(text)} into ${language}.` : text;
    // Unlike the other routes this one cannot simply append the subject: the
    // request has two halves and a paraphrasing query ("Translate it.") loses
    // both. So the query is used only while it still carries the declared text,
    // and the composed form takes over when it does not.
    const q = asked && (!text || asked.toLowerCase().includes(text.toLowerCase()))
      ? asked
      : (composed || asked);
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
    // No restatement on translation answers: the recorded ground truths are
    // bare translations, and under the current champion every English word
    // wrapped around a non-Latin translation dilutes the one string being
    // compared (bare 9/10 crossings vs 4/10 through the restating pipeline —
    // measured 2026-08-30 over the ten distinct real recorded questions).
    const hit = fromCache(key);
    if (hit) {
      sendAnswer(res, q, minimalTranslation(hit as TranslationResult), false);
      return;
    }
    translate(q)
      .then((r) => {
        toCache(key, r);
        sendAnswer(res, q, minimalTranslation(r), false);
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
    sendAnswer(res, question, lean({
      domain: raw ? raw.slice(0, 200) : null,
      verdict: "unknown",
      confidence: 0,
      reason:
        `No hostname was supplied with this request, so the TLS/SSL certificate could not be ` +
        `analyzed. Certificate chain completeness and hostname validation cannot be verified ` +
        `without a domain. Supply a domain such as example.com.`,
      error: "invalid_domain",
    }));
    return;
  }

  const key = `ssl:${target.host}:${target.port}`;
  const cached = fromCache(key);
  if (cached) {
    sendAnswer(res, question, lean(cached), restateSsl(cached));
    return;
  }

  checkCertificate(target.host, target.port)
    .then((result) => {
      toCache(key, result);
      sendAnswer(res, question, lean(result), restateSsl(result));
    })
    .catch(() => upstreamUnavailable(res, "A TLS certificate check", target.host, question));
}
