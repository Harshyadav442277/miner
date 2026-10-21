/**
 * The weather intents' upstream reads: MET Norway forecasts (metno.ts) and OpenStreetMap's
 * Nominatim for turning place names into coordinates and back.
 *
 * Every read retries once on a transient failure, because a single momentary 5xx used to take
 * WEATHER_CHECK, WEATHER_FORECAST and STORM_ALERT to a refusal in the same epoch.
 *
 * Licences (GAPS G189). Until 2026-10-18 the forecast and the geocoder were Open-Meteo's, whose
 * free API is for non-commercial use only, and reverse geocoding was BigDataCloud's
 * "client-side only" endpoint called from a server. Nominatim's data is ODbL (credit
 * OpenStreetMap), and its usage policy (operations.osmfoundation.org/policies/nominatim) asks for
 * an identifying User-Agent, at most one request per second, and caching: all three are kept here.
 * One request per second is per instance; serverless instances do not share the spacing (G196), so
 * the cities asked about most are answered from a built-in table first (places.ts).
 */

/** Identifies us to MET Norway and Nominatim, both of which block anonymous callers. */
export const WEATHER_USER_AGENT = "livecert-telegraph-miner/1.0 (+https://github.com/Harshyadav442277/miner)";
/**
 * The policy also says an app must be able to switch away "at our request at any time ... without
 * requiring a software update" (read 2026-10-20): NOMINATIM_URL points at another instance, or a
 * paid one, with an environment change and a redeploy of the same code.
 */
const NOMINATIM = (process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org").replace(/\/+$/, "");

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
 * One JSON read from a weather upstream, retried once on a transient failure, with the time the
 * upstream says the answer stays valid (its Expires header) when it gives one.
 *
 * The retry gets its own fresh timeout rather than sharing the first one's
 * remainder: an attempt that timed out has already spent the budget, and a
 * retry with a few milliseconds left is not a retry.
 */
export async function getWeatherJsonWithExpiry(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<{ body: unknown; expiresMs: number | null }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 250));
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: ac.signal, headers: { "user-agent": WEATHER_USER_AGENT } });
      if (!res.ok) {
        const error = new Error(`upstream ${res.status}`);
        if (!isTransient(res.status)) throw error;
        lastError = error;
        continue;
      }
      const expires = Date.parse(res.headers?.get?.("expires") ?? "");
      return { body: await res.json(), expiresMs: Number.isFinite(expires) ? expires : null };
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

/** The body alone; see `getWeatherJsonWithExpiry`. */
export async function getWeatherJson(url: string, timeoutMs: number, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  return (await getWeatherJsonWithExpiry(url, timeoutMs, fetchImpl)).body;
}

export interface GeocodeHit {
  name: string;
  latitude: number;
  longitude: number;
  /** Set when the name or the coordinates came from OpenStreetMap, which must then be credited. */
  credit?: string;
}

/**
 * ODbL credit, which the Nominatim policy says to "clearly display" (read 2026-10-20). Answers from
 * the built-in table use Wikidata's CC0 data and carry none.
 */
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors (ODbL)";

/** The clause an answer appends after its forecast source when its place came from OpenStreetMap. */
export function placeCredit(place: { credit?: string }): string {
  return place.credit ? `; place from ${place.credit}` : "";
}

/** Nominatim answers do not change; a day bounds how stale a renamed place can get. */
const GEOCODE_TTL_MS = 86_400_000;
const geocodeCache = new Map<string, { value: unknown; at: number }>();
let nextNominatimAt = 0;

/** Test hook: forget cached places and the request spacing. */
export function resetGeocodeCache(): void {
  geocodeCache.clear();
  nextNominatimAt = 0;
}

/** Nominatim did not answer: an outage, which is not the same finding as "no such place". */
const UNAVAILABLE = Symbol("nominatim unavailable");

/**
 * A Nominatim read, from the cache when possible and otherwise spaced one second after the last.
 * UNAVAILABLE when it could not be asked or did not answer.
 */
async function nominatim(path: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<unknown> {
  const hit = geocodeCache.get(path);
  if (hit && Date.now() - hit.at < GEOCODE_TTL_MS) return hit.value;
  // Only a request that will actually be sent takes a slot; one that cannot fit its own timeout
  // gives up without pushing every later caller back another second.
  const wait = nextNominatimAt - Date.now();
  if (wait >= timeoutMs) return UNAVAILABLE;
  nextNominatimAt = Math.max(Date.now(), nextNominatimAt) + 1000;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  let value: unknown;
  try {
    value = await getWeatherJson(`${NOMINATIM}${path}`, timeoutMs, fetchImpl);
  } catch {
    return UNAVAILABLE;
  }
  if (geocodeCache.size >= 1000) geocodeCache.delete(geocodeCache.keys().next().value as string);
  geocodeCache.set(path, { value, at: Date.now() });
  return value;
}

/**
 * A place name resolved through OpenStreetMap: null when no such place is known, and a THROW when
 * Nominatim could not be asked or did not answer. The routes answer a throw as an outage. Folding the
 * two together answered "No resolvable location found for London" whenever Nominatim was busy, a
 * false statement about London (seen 2026-10-18 under parallel test load).
 *
 * Nominatim returns one long `display_name` ("Chennai Corporation, Chennai, Tamil Nadu, India").
 * Its first and last two components name the place the way a person would.
 */
export async function geocode(
  query: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodeHit | null> {
  // English names: without accept-language, Nominatim names Cairo "القاهرة, مصر" (measured 2026-10-18).
  const body = await nominatim(
    `/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0&accept-language=en`,
    timeoutMs,
    fetchImpl,
  );
  if (body === UNAVAILABLE) throw new Error("geocoder unavailable");
  const hit = Array.isArray(body) ? (body[0] as Record<string, unknown> | undefined) : undefined;
  if (!hit) return null;
  const latitude = Number(hit["lat"]);
  const longitude = Number(hit["lon"]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  const display = typeof hit["display_name"] === "string" ? hit["display_name"] : "";
  // A postcode is one of the last components ("Lagos, Lagos Island, Lagos
  // State, 100242, Nigeria"), and the answer read "Lagos, 100242, Nigeria"
  // (routed 2026-10-10 with location=Lagos Nigeria). It is not part of a place name.
  const postcode = (p: string): boolean => /\d/.test(p) && /^[A-Za-z0-9 -]{2,10}$/.test(p);
  const parts = display.split(",").map((p) => p.trim()).filter((p) => p && !postcode(p));
  const named = parts.length > 2 ? [parts[0], ...parts.slice(-2)] : parts;
  const name = [...new Set(named)].join(", ");
  return { name: name || query, latitude, longitude, credit: OSM_ATTRIBUTION };
}

/** The nearest named place to a coordinate pair ("Chennai, Tamil Nadu, India"), or null. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const body = (await nominatim(
    `/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10&accept-language=en`,
    Math.min(timeoutMs, 5000),
    fetchImpl,
  )) as { address?: Record<string, unknown> } | null;
  const a = body?.address;
  if (!a) return null;
  const pick = (...keys: string[]): string | null => {
    for (const k of keys) if (typeof a[k] === "string" && (a[k] as string).trim()) return a[k] as string;
    return null;
  };
  const parts = [pick("city", "town", "village", "municipality", "county"), pick("state", "region"), pick("country")]
    .filter((x): x is string => x !== null);
  // Drop a subdivision that merely repeats the city ("New York, New York").
  const deduped = parts.filter((x, i) => i === 0 || !parts[0]!.includes(x));
  return deduped.length ? deduped.join(", ") : null;
}
