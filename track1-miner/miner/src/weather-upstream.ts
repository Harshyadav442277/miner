/**
 * Keeping the three weather intents up when the upstream blinks.
 *
 * WEATHER_CHECK, WEATHER_FORECAST and STORM_ALERT all read Open-Meteo, and
 * WEATHER_CHECK and STORM_ALERT also read Open-Meteo's geocoder to turn a place
 * name into coordinates. Until this module there was no retry and no second
 * source on either, so a single momentary 5xx took all three intents to a
 * refusal in the same epoch — and a refusal scores at the floor where an answer
 * can cross.
 *
 * Both paths here are strictly additive: nothing runs until the primary has
 * already failed, so a healthy Open-Meteo produces byte-identical answers.
 *
 * Both replacements are keyless. ARCHITECTURE A3/A4 requires that — an upstream
 * that can run out of quota or have a key revoked becomes our Routing
 * Revocation, which is the failure this module exists to prevent.
 */

/** Nominatim asks callers to identify themselves; an anonymous caller is blocked. */
const USER_AGENT = "livecert-telegraph-miner/1.0 (+https://github.com/Harshyadav442277/miner)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/**
 * Failures worth a second attempt.
 *
 * A 4xx other than 429 is our request being wrong and will fail identically on
 * a retry, so it is raised immediately rather than costing the caller another
 * round trip out of its timeout budget.
 */
function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * One JSON read from a weather upstream, retried once on a transient failure.
 *
 * The retry gets its own fresh timeout rather than sharing the first one's
 * remainder: an attempt that timed out has already spent the budget, and a
 * retry with a few milliseconds left is not a retry. Callers pass a per-attempt
 * timeout on that understanding, so the worst case is roughly twice `timeoutMs`
 * plus the pause — comfortably inside the node's own patience at the 8 s
 * default these modules use.
 */
export async function getWeatherJson(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 250));
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: ac.signal, headers: { "user-agent": USER_AGENT } });
      if (!res.ok) {
        const error = new Error(`upstream ${res.status}`);
        if (!isTransient(res.status)) throw error;
        lastError = error;
        continue;
      }
      return await res.json();
    } catch (e) {
      // An abort and a network error are both worth one more attempt; a non
      // transient HTTP status thrown just above is not.
      if (e instanceof Error && /^upstream [1-4]/.test(e.message)) throw e;
      lastError = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export interface GeocodeHit {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * A place name resolved through OpenStreetMap, for when Open-Meteo's geocoder
 * is the thing that is down.
 *
 * Nominatim returns one long `display_name` ("Chennai Corporation, Chennai,
 * Tamil Nadu, India") where Open-Meteo returns name/admin1/country. The first
 * and last two components reproduce Open-Meteo's shape closely enough that the
 * prose reads the same, and de-duplication matches what `resolvePlace` already
 * does with its own parts.
 */
export async function geocodeFallback(
  query: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodeHit | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`;
  let body: unknown;
  try {
    body = await getWeatherJson(url, timeoutMs, fetchImpl);
  } catch {
    // The fallback failing is not an error to report: the caller already has a
    // primary failure to answer with, and two upstream names in one refusal
    // tell the buyer nothing they can act on.
    return null;
  }
  const hit = Array.isArray(body) ? (body[0] as Record<string, unknown> | undefined) : undefined;
  if (!hit) return null;
  const latitude = Number(hit["lat"]);
  const longitude = Number(hit["lon"]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  const display = typeof hit["display_name"] === "string" ? hit["display_name"] : "";
  const parts = display.split(",").map((p) => p.trim()).filter(Boolean);
  const named = parts.length > 2 ? [parts[0], ...parts.slice(-2)] : parts;
  const name = [...new Set(named)].join(", ");
  return { name: name || query, latitude, longitude };
}
