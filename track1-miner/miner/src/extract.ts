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

  // Trailing junk, not just punctuation: real routed questions arrive as
  // "Whast the weather in gujranwala>?" and the stray ">" survived a "[?!.]"
  // strip, leaving "gujranwala>" for the geocoder to fail on.
  let s = raw.replace(/[?!.,;:>»<"'\s]+$/, "").trim();
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(LEADING, "").replace(TRAILING, "").trim();
  }
  if (s && s !== raw) out.push(s);

  // The tail after a locative preposition. Proper-noun matching only sees
  // capitalised names, so "hows weather in lahore" and "HI whats the weather in
  // lahore?" — both real routed questions — produced no candidate at all: the
  // greeting and the misspelling block LEADING, and the place is lowercase.
  const after = raw
    .replace(/[?!.,;:>»<"'\s]+$/, "")
    .match(/\b(?:in|at|near|around|for)\s+([^,?.!]{2,40})$/i);
  if (after?.[1]) {
    // The tail runs to the end of the string, so it picks up any time expression
    // trailing the place: "…for New York City starting next Monday" would hand
    // the geocoder the weekday too, and "next Monday" resolves to Munday, Texas.
    let tail = after[1].replace(/\b(?:starting|beginning|start(?:s|ing)? on|from|over|during|next|this|later)\b.*$/i, "").trim();
    let t = "";
    while (tail !== t) {
      t = tail;
      // Deliberately only TRAILING here. Peeling clock times as well ("in
      // bangalore tomorrow 9 am" -> "bangalore") was tried and reverted: the
      // Open-Meteo gazetteer indexes the Indian city as "Bengaluru", so bare
      // "bangalore" resolves to Bangalore Town, Sindh, Pakistan — a place with
      // no population record. It turned two honest refusals into two confident
      // answers about the wrong country, which is the failure this miner
      // refuses everywhere else.
      tail = tail.replace(TRAILING, "").trim();
    }
    // A measurement is not a place: "…extreme heat over 40°C" handed the
    // geocoder "40°C". Neither is a question word left dangling by "karachi in
    // which city". Each candidate costs a round-trip, and latency is scored.
    const first = tail.split(/\s+/)[0]!.toLowerCase();
    const junk = /^\d/.test(tail) || !/[a-z]{2}/i.test(tail) ||
      ["which", "the", "a", "an", "what", "how", "that", "this"].includes(first);
    if (!junk && !out.includes(tail)) out.push(tail);
  }

  // Proper-noun runs are the strongest signal in an English question.
  const proper = raw.match(/\b[A-Z][a-z]+(?:[ -][A-Z][a-z]+)*/g);
  if (proper) {
    const stop = new Set([
      "will", "what", "how", "is", "are", "the", "a", "an", "i", "can", "could",
      "would", "please", "give", "show", "tell", "provide", "report", "include",
      "celsius", "fahrenheit", "utc", "gmt",
      // Weekdays and months are time expressions, not places. "next Monday"
      // geocoded to Munday, a real town, and produced a confident forecast for
      // the wrong continent.
      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
      "january", "february", "march", "april", "may", "june", "july",
      "august", "september", "october", "november", "december",
      "today", "tomorrow", "tonight", "morning", "afternoon", "evening",
      // "Which ocean is the deepest point on Earth found in?" is not a weather
      // question, but "Earth" geocoded and it was answered with conditions
      // somewhere. A planet is not a resolvable location.
      "which", "earth",
    ]);
    // A run is matched greedily, so "Will Riyadh issue heat warning?" yields the
    // single run "Will Riyadh" — filtering whole runs against the stop list left
    // "Will Riyadh" intact and "Riyadh" never became a candidate at all. Fourteen
    // of the fifty WEATHER_CHECK questions the Daemon actually routes are that
    // shape ("Will Dubai experience extreme heat today?"), and every one of them
    // was refused. Trim stop words off both ends of a run before keeping it.
    const trimRun = (p: string): string => {
      // Spaces only: a hyphen belongs to the name ("Baden-Baden").
      let w = p.split(" ");
      while (w.length > 1 && stop.has(w[0]!.toLowerCase())) w = w.slice(1);
      while (w.length > 1 && stop.has(w[w.length - 1]!.toLowerCase())) w = w.slice(0, -1);
      return w.join(" ");
    };
    const kept = proper
      .map(trimRun)
      .filter((p) => p && !stop.has(p.toLowerCase()));
    // "Tokyo, Japan" reads as one place; the pair beats either half alone.
    for (let i = 0; i + 1 < kept.length; i++) {
      const joined = `${kept[i]}, ${kept[i + 1]}`;
      if (raw.includes(joined) && !out.includes(joined)) out.push(joined);
    }
    for (const p of kept) if (!out.includes(p)) out.push(p);
  }
  // A place name is not a sentence. Handing the geocoder 90 characters of
  // question resolved "Can you provide a 48-hour forecast for Tokyo, Japan..."
  // to Guangzhou — a confident answer about the wrong city.
  const unique = [...new Set(out.filter(Boolean))].filter((c) => c.length <= 60);

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

  // Degree-and-hemisphere notation first — it carries signs that a bare pair does not.
  const hemi = extractHemisphereCoords(s);
  if (hemi) return hemi;

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

  const count = s.match(/\b(\d{1,3})[-\s]*(?:hourly values|hourly|hours?)\b/i);
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

export interface WindThreshold {
  /** The number the question asked about. */
  value: number;
  /** Unit as the question expressed it. */
  unit: "knots" | "kmh" | "mph" | "ms";
}

/**
 * A wind threshold the question asks us to flag, e.g. "above 25 knots".
 *
 * Real paid questions do not just ask "what is the wind" — they ask whether it
 * crosses an operational limit. An answer that reports wind speed but never says
 * whether the limit is exceeded has not answered the question, and measuring
 * against the live champion scorer shows the difference is large.
 */
export function extractWindThreshold(text: string): WindThreshold | null {
  const s = String(text ?? "");
  const m = s.match(
    /\b(?:above|over|exceed(?:ing|s)?|greater than|more than|beyond|>)\s*(\d{1,3}(?:\.\d+)?)\s*(knots?|kts?|km\/h|kph|kmh|mph|m\/s)\b/i,
  );
  if (!m?.[1] || !m[2]) return null;
  const u = m[2].toLowerCase();
  const unit: WindThreshold["unit"] = /^k(?:no|t)/.test(u)
    ? "knots"
    : /mph/.test(u)
      ? "mph"
      : /m\/s/.test(u)
        ? "ms"
        : "kmh";
  return { value: Number(m[1]), unit };
}

/** Whether the question wants speeds expressed in knots. */
export function asksForKnots(text: string): boolean {
  return /\bkn(?:ot|)s?\b|\bkts?\b/i.test(String(text ?? ""));
}

/**
 * A threshold expressed in some unit, converted TO km/h for comparison against
 * forecast values.
 *
 * The direction matters and is easy to invert: 25 knots is 46.3 km/h, not 13.5.
 * Getting it backwards produced an answer claiming winds of 13.2 knots exceeded
 * a 25-knot limit — a confidently stated falsehood, which is worse than
 * declining to answer.
 */
export function toKmh(value: number, unit: WindThreshold["unit"]): number {
  switch (unit) {
    case "knots":
      return value * 1.852;
    case "mph":
      return value * 1.60934;
    case "ms":
      return value * 3.6;
    default:
      return value;
  }
}

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const WORD_COUNTS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, twelve: 12, fourteen: 14,
};
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * How many hours a question asks for, across the forms people actually write.
 *
 * Benchmarking against real paid questions showed "48 hourly values" handled and
 * "7-day", "5-day", "five-day" not — eleven of twelve weather questions were
 * falling back to a default window and answering a different period.
 */
export function extractSpanHours(text: string): number | null {
  const s = String(text ?? "");
  const num = s.match(/\b(\d{1,3})[-\s]*(?:hourly values|hourly|hours?|hrs?)\b/i);
  if (num?.[1]) return Number(num[1]);
  const days = s.match(/\b(\d{1,2})[-\s]*days?\b/i);
  if (days?.[1]) return Number(days[1]) * 24;
  const worded = s.match(/\b([a-z]+)[-\s]*days?\b/i);
  const w = worded?.[1]?.toLowerCase();
  if (w && WORD_COUNTS[w]) return WORD_COUNTS[w]! * 24;
  return null;
}

/**
 * A start date written the way people write them, in UTC.
 *
 * Handles "September 1, 2026", "1 September 2026", "next Monday" and "tomorrow"
 * alongside ISO. `now` is injectable so the relative forms stay testable.
 */
export function extractWrittenStart(text: string, now = new Date()): string | null {
  const s = String(text ?? "");

  const md = s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?\b/);
  const m1 = md?.[1]?.toLowerCase();
  if (m1 && MONTHS[m1] !== undefined && md?.[2]) {
    const year = md[3] ? Number(md[3]) : now.getUTCFullYear();
    const d = new Date(Date.UTC(year, MONTHS[m1]!, Number(md[2])));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const dm = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?\b/);
  const m2 = dm?.[2]?.toLowerCase();
  if (m2 && MONTHS[m2] !== undefined && dm?.[1]) {
    const year = dm[3] ? Number(dm[3]) : now.getUTCFullYear();
    const d = new Date(Date.UTC(year, MONTHS[m2]!, Number(dm[1])));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const wd = s.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  const target = wd?.[1] ? WEEKDAYS.indexOf(wd[1].toLowerCase()) : -1;
  if (target >= 0) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let delta = (target - d.getUTCDay() + 7) % 7;
    if (delta === 0) delta = 7;
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString();
  }

  if (/\btomorrow\b/i.test(s)) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
  }
  return null;
}

/**
 * The requested period, combining every form above.
 *
 * Supersedes the ISO-only parser: that one handled the single question shape it
 * was written against and left eleven others answering a default window.
 */
export function resolveDateRequest(text: string): DateRequest | null {
  const iso = extractDateRequest(text);
  const hours = extractSpanHours(text) ?? iso?.hours ?? null;
  if (iso) return { startIso: iso.startIso, hours };

  const written = extractWrittenStart(text);
  if (written) return { startIso: written, hours };
  if (hours !== null) return { startIso: new Date().toISOString(), hours };
  return null;
}

/**
 * Coordinates written with degree symbols and hemisphere letters.
 *
 * A real paid question gave "39.6438° N, 104.8669° W" and we resolved nothing at
 * all. The hemisphere letter is not decoration: 104.8669° W is -104.8669, and
 * reading it as positive puts the answer in China rather than Colorado.
 *
 * Also tolerates the mojibake that appears when a degree sign survives a
 * round-trip through the wrong encoding.
 */
export function extractHemisphereCoords(text: string): { lat: number; lon: number } | null {
  const s = String(text ?? "");
  // The separator between the number and the hemisphere letter is usually a
  // degree sign, but it survives encoding round-trips badly — real traffic
  // carries "°", "Â°", and the U+FFFD replacement character. Accept a few
  // characters of whatever it became rather than requiring one exact symbol.
  const PART = /(\d{1,3}(?:\.\d+)?)\s*[^\dA-Za-z,;]{0,4}\s*([NSEW])\b/i;
  const re = new RegExp(PART.source + /\s*[,;]?\s*/.source + PART.source, "i");
  const m = s.match(re);
  if (!m?.[1] || !m[2] || !m[3] || !m[4]) return null;

  const signed = (v: string, hemi: string): number => {
    const n = Number(v);
    const h = hemi.toUpperCase();
    return h === "S" || h === "W" ? -n : n;
  };
  const a = { v: signed(m[1], m[2]), h: m[2].toUpperCase() };
  const b = { v: signed(m[3], m[4]), h: m[4].toUpperCase() };

  // Whichever carries N/S is the latitude, regardless of the order written.
  const lat = "NS".includes(a.h) ? a.v : b.v;
  const lon = "NS".includes(a.h) ? b.v : a.v;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** A named stretch of the forecast, as a caller would talk about it. */
export interface Period {
  label: string;
  windMin: number;
  windMax: number;
  gustMax: number;
}

/**
 * Splits an hourly series into the periods people actually ask about.
 *
 * A question asking for "a 48-hour wind speed forecast" is asking for a series,
 * not a single maximum. Measured against the live champion, reporting the
 * period breakdown instead of one peak moved a real question from 0.0082 to
 * 0.6136 — the largest single gain found in this intent.
 *
 * Hours are local to the forecast location, so "morning" means morning there.
 */
export function summarisePeriods(
  times: string[],
  winds: number[],
  gusts: number[],
  maxPeriods = 6,
): Period[] {
  const bucketOf = (hour: number): string =>
    hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  const out: Period[] = [];
  let current: { key: string; label: string; w: number[]; g: number[] } | null = null;
  const firstDay = times[0]?.slice(0, 10);

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (!t) continue;
    const hour = Number(t.slice(11, 13));
    const day = t.slice(0, 10);
    const dayNo = day === firstDay ? 1 : 2 + Math.max(0, daysBetween(firstDay ?? day, day) - 1);
    const key = `${day}:${bucketOf(hour)}`;
    if (!current || current.key !== key) {
      if (current) out.push(finish(current));
      current = { key, label: `Day ${dayNo} ${bucketOf(hour)}`, w: [], g: [] };
    }
    const w = winds[i];
    const g = gusts[i];
    if (typeof w === "number") current.w.push(w);
    if (typeof g === "number") current.g.push(g);
  }
  if (current) out.push(finish(current));
  return out.filter((p) => Number.isFinite(p.windMax)).slice(0, maxPeriods);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function finish(c: { label: string; w: number[]; g: number[] }): Period {
  const r1 = (n: number): number => Math.round(n * 10) / 10;
  return {
    label: c.label,
    windMin: c.w.length ? r1(Math.min(...c.w)) : NaN,
    windMax: c.w.length ? r1(Math.max(...c.w)) : NaN,
    gustMax: c.g.length ? r1(Math.max(...c.g)) : NaN,
  };
}
