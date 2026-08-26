/**
 * Pulling a usable parameter out of whatever the caller actually sent.
 *
 * Telegraph's engine classifies a natural-language question and then calls a
 * miner. There is no guarantee it hands over a clean parameter rather than the
 * user's raw sentence — and a miner that answers "Is the SSL certificate for
 * expired.badssl.com valid?" with HTTP 400 scores zero on a question it could
 * trivially have answered.
 *
 * So: try the strict parse first, and only fall back to extraction when it
 * fails. Clean input keeps its exact previous behaviour.
 */

/** Hostname-ish token: labels of alnum/hyphen, last label alphabetic and 2+ chars. */
const HOST_RE = /\b((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})\b/gi;

/**
 * First hostname-looking token in free text. Strips a scheme and any path, and
 * ignores trailing sentence punctuation.
 */
export function extractHostname(text: string): string | null {
  if (!text) return null;

  // Only mine free text for a hostname when the input actually reads as free
  // text. "exa mple.com" is a typo'd domain, not a sentence containing one —
  // and salvaging "mple.com" from it would answer a question nobody asked.
  // Three-plus tokens is the line: "check ssl for github.com" qualifies, a
  // two-token fragment does not.
  if (text.trim().split(/\s+/).filter(Boolean).length < 3) return null;
  const urls = text.match(/https?:\/\/[^\s"'<>]+/gi);
  if (urls) {
    for (const u of urls) {
      try {
        const h = new URL(u).hostname;
        if (h) return h.toLowerCase();
      } catch {
        /* keep looking */
      }
    }
  }
  const matches = text.match(HOST_RE);
  if (!matches) return null;
  for (const m of matches) {
    const host = m.replace(/[.,;:!?]+$/, "").toLowerCase();
    // A bare decimal like "48.5" survives the label rules but is not a host.
    if (/^\d+(\.\d+)*$/.test(host)) continue;
    if (host.includes(".")) return host;
  }
  return null;
}

/** Question scaffolding that surrounds a place name but is not part of it. */
/**
 * Question scaffolding that surrounds a place name but is not part of it.
 *
 * Written as regex literals, not strings passed to `new RegExp`. In a JS string
 * "\s" is just "s", "\d" is "d", and "\b" is a backspace character — an earlier
 * version built these from strings and silently stripped nothing at all.
 */
const LEADING =
  /^\s*(?:will there (?:be|is)( a)?|is there( a)?|are there( any)?|what(?:'s| is| are)?|how(?:'s| is)?|tell me( about)?|give me|show me|check|get|find|the (?:current )?(?:weather|forecast|storm|conditions?)|weather|forecast|storm|conditions?|alerts?|risk|warnings?|for|in|at|near|around|of|about|any)\b[\s,]*/i;

/** Trailing time windows and politeness that follow a place name. */
const TRAILING =
  /[\s,]*\b(?:over the next \d+ (?:hours?|days?)|in the next \d+ (?:hours?|days?)|next \d+ (?:hours?|days?)|for the next \d+ (?:hours?|days?)|\d+ ?(?:h|hr|hrs|hours?|days?)|today|tomorrow|tonight|this (?:week|weekend|evening|morning|afternoon)|right now|currently|now|please|thanks?( you)?)\b[\s,.!?]*$/i;

/**
 * Best-effort place name from free text.
 *
 * Returns candidates in order of confidence rather than one guess, so the caller
 * can try geocoding each and keep the first that resolves — the geocoder is the
 * real arbiter of whether a string names a place.
 */
export function placeCandidates(text: string): string[] {
  const raw = (text ?? "").trim();
  if (!raw) return [];
  const out: string[] = [raw];

  // "lat,lon" passes through untouched.
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(raw)) return [raw];

  let s = raw.replace(/[?!.]+$/, "").trim();
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(LEADING, "").replace(TRAILING, "").trim();
  }
  if (s && s !== raw) out.push(s);

  // Proper-noun runs are the strongest signal in an English question.
  const proper = raw.match(/\b[A-Z][a-z]+(?:[ -][A-Z][a-z]+)*/g);
  if (proper) {
    const stop = new Set(["will", "what", "how", "is", "the", "a", "an", "i"]);
    for (const p of proper) {
      if (!stop.has(p.toLowerCase()) && !out.includes(p)) out.push(p);
    }
  }
  const unique = [...new Set(out.filter(Boolean))];

  // Each candidate costs a geocode round-trip, and latency is scored. For a long
  // sentence the raw string is the least likely to resolve, so try the extracted
  // candidates first; for a short input it is almost certainly the place itself.
  if (raw.split(/\s+/).length > 4) return [...unique.slice(1), unique[0]!].filter(Boolean);
  return unique;
}


/**
 * The bare place name, without administrative subdivisions.
 *
 * Geocoders return "Chennai, Tamil Nadu, India"; a question asks about "Chennai"
 * and a ground-truth answer will say "Chennai". The extra components are words
 * the scorer cannot match, and each one dilutes every other word in the answer.
 * The full resolved name stays in the structured `location` field — this is only
 * for the prose a scorer reads.
 */
export function shortPlaceName(resolved: string): string {
  const s = String(resolved ?? "").trim();
  // A coordinate pair is one value, not a place hierarchy — splitting it on the
  // comma leaves a bare latitude, which reads as nonsense in an answer.
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(s)) return s;
  const first = s.split(",")[0]?.trim();
  return first && first.length > 0 ? first : s;
}


/**
 * Latitude/longitude from free text.
 *
 * Real paid questions name coordinates in prose — "at latitude 12.97 and
 * longitude 77.59", "lat 12.97 lon 77.59", "12.97, 77.59" — not only as the bare
 * `lat,lon` pair a parser is tempted to accept. A miner that recognises just the
 * bare form answers `unknown` to a question it holds all the data for.
 */
export function extractCoords(text: string): { lat: number; lon: number } | null {
  const s = String(text ?? "");
  if (!s.trim()) return null;

  const ok = (lat: number, lon: number): { lat: number; lon: number } | null =>
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
      ? { lat, lon }
      : null;

  // Labelled, in either order: "latitude 12.97 ... longitude 77.59".
  const lat = s.match(/\blat(?:itude)?\b[^\d+-]{0,12}(-?\d{1,3}(?:\.\d+)?)/i);
  const lon = s.match(/\blon(?:g|gitude)?\b[^\d+-]{0,12}(-?\d{1,3}(?:\.\d+)?)/i);
  if (lat?.[1] && lon?.[1]) {
    const hit = ok(Number(lat[1]), Number(lon[1]));
    if (hit) return hit;
  }

  // A comma-separated pair anywhere in the sentence.
  const pair = s.match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (pair?.[1] && pair[2]) {
    const hit = ok(Number(pair[1]), Number(pair[2]));
    if (hit) return hit;
  }
  return null;
}

export type TimeMode = "point" | "window";

export interface TimeRequest {
  /** "point" asks about one moment; "window" asks about a span. */
  mode: TimeMode;
  /** Hours ahead of now — for a window its length, for a point its offset. */
  hours: number;
}

/**
 * How the question frames time, not merely how many hours it names.
 *
 * "in 44 hours" and "over the next 44 hours" are different questions. The first
 * asks what conditions will be at one moment; the second asks for the worst of
 * everything between now and then. Answering a point question with a window
 * maximum reports weather that has not happened yet as though it were the
 * forecast — on a real paid question the responder gave gusts of 49.7 at hour
 * 44 where we returned 70.9 from somewhere in between.
 */
export function extractTimeRequest(text: string): TimeRequest | null {
  const s = String(text ?? "");
  if (!s.trim()) return null;

  const hrs = (n: number, unit: string): number => (/^d/i.test(unit) ? n * 24 : n);

  // Explicit span wording always means a window.
  const span = s.match(/\b(?:over|within|during|across)\s+(?:the\s+)?(?:next\s+)?(\d{1,3})\s*(hours?|hrs?|h|days?|d)\b/i);
  if (span?.[1] && span[2]) return { mode: "window", hours: hrs(Number(span[1]), span[2]) };

  // "right now" is a point at the current hour.
  if (/\b(?:right now|at present|currently|at the moment)\b/i.test(s)) return { mode: "point", hours: 0 };

  // "in N hours" / "N hours ahead" / "N hours from now" name one moment.
  const point =
    s.match(/\bin\s+(\d{1,3})\s*(hours?|hrs?|h|days?|d)\b/i) ??
    s.match(/\b(\d{1,3})\s*(hours?|hrs?|h|days?|d)\s+(?:ahead|from now|out)\b/i);
  if (point?.[1] && point[2]) return { mode: "point", hours: hrs(Number(point[1]), point[2]) };

  // Bare "next N hours" is ambiguous — treat as a window and label the maxima.
  const next = s.match(/\b(?:the\s+)?next\s+(\d{1,3})\s*(hours?|hrs?|h|days?|d)\b/i);
  if (next?.[1] && next[2]) return { mode: "window", hours: hrs(Number(next[1]), next[2]) };

  return null;
}


/**
 * A requested forecast window in hours.
 *
 * "over the next 44 hours" is part of the question, not decoration: answering a
 * 48-hour maximum to a 44-hour question reports a risk the caller did not ask
 * about. Returns null when no window is stated, so the caller keeps its default.
 */
export function extractHours(text: string): number | null {
  const s = String(text ?? "");
  const m =
    s.match(/\b(?:over |in |for |within )?the next\s+(\d{1,3})\s*(hours?|hrs?|h|days?|d)\b/i) ??
    s.match(/\bnext\s+(\d{1,3})\s*(hours?|hrs?|h|days?|d)\b/i) ??
    s.match(/\b(\d{1,3})\s*(hours?|hrs?|h|days?|d)\s+(?:ahead|out|from now)\b/i) ??
    // Bare "in 44 hours" / "within 3 days", with no "the next" in front.
    s.match(/\b(?:in|within|over)\s+(\d{1,3})\s*(hours?|hrs?|h|days?|d)\b/i);

  // "right now" is a window too — the shortest one. Real paid questions use it,
  // and answering them with a 48-hour outlook reports a risk that has not
  // happened yet as though it were current.
  if (!m && /\b(right now|at present|currently|at the moment)\b/i.test(s)) return 1;
  if (!m?.[1] || !m[2]) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0) return null;
  // A real paid question asks for storm risk "in 0 hours" — that is "right now",
  // not an absent window. Falling through to the 48-hour default answered a
  // question about the next two days instead.
  if (n === 0) return 1;
  const hours = /^d/i.test(m[2]) ? n * 24 : n;
  return hours >= 1 && hours <= 384 ? Math.round(hours) : null;
}

export interface DateRequest {
  /** UTC start of the requested period. */
  startIso: string;
  /** How many hourly values were asked for, if stated. */
  hours: number | null;
}

/**
 * An explicit start time named in the question.
 *
 * Real paid weather questions say things like "48 hourly values starting
 * 2026-09-01T06:00:00Z". Answering those with "the next 48 hours from now"
 * describes a different period entirely — the single largest scoring defect
 * found so far. Returns null when the question names no start, so the caller
 * keeps its "from now" default.
 */
export function extractDateRequest(text: string): DateRequest | null {
  const s = String(text ?? "");
  if (!s.trim()) return null;

  const count = s.match(/\b(\d{1,3})\s*(?:hourly values|hourly|hours?)\b/i);
  const hours = count?.[1] ? Number(count[1]) : null;

  // Full ISO 8601, with or without the Z.
  const iso = s.match(/\b(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?\s*(Z|UTC)?/i);
  if (iso?.[1] && iso[2] && iso[3]) {
    const d = new Date(`${iso[1]}T${iso[2]}:${iso[3]}:00Z`);
    if (!Number.isNaN(d.getTime())) return { startIso: d.toISOString(), hours };
  }

  // A bare date, optionally with "starting"/"from"/"on". Midnight UTC.
  const day = s.match(/\b(?:start(?:ing)?|from|on|for)?\s*(\d{4}-\d{2}-\d{2})\b/i);
  if (day?.[1]) {
    const d = new Date(`${day[1]}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) return { startIso: d.toISOString(), hours };
  }

  return null;
}
