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
const LEADING = new RegExp(
  "^\s*(?:" +
    [
      "will there (?:be|is)( a)?", "is there( a)?", "are there( any)?",
      "what(?:'s| is| are)?", "how(?:'s| is)?", "tell me( about)?",
      "give me", "show me", "check", "get", "find",
      "the (?:current )?(?:weather|forecast|storm|conditions?)",
      "weather|forecast|storm|conditions?|alerts?|risk|warnings?",
      "for|in|at|near|around|of|about|any",
    ].join("|") +
    ")\b[\s,]*",
  "i",
);

/** Trailing time windows and politeness that follow a place name. */
const TRAILING = new RegExp(
  "[\s,]*\b(?:" +
    [
      "over the next \d+ (?:hours?|days?)", "in the next \d+ (?:hours?|days?)",
      "next \d+ (?:hours?|days?)", "for the next \d+ (?:hours?|days?)",
      "\d+ ?(?:h|hr|hrs|hours?|days?)",
      "today|tomorrow|tonight|this (?:week|weekend|evening|morning|afternoon)",
      "right now|currently|now|please|thanks?( you)?",
    ].join("|") +
    ")\b[\s,.!?]*$",
  "i",
);

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
