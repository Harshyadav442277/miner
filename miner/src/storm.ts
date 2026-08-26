/**
 * STORM_ALERT — severe-weather risk for a named location.
 *
 * The intent is specifically about "active or upcoming storm systems, high winds,
 * or disruption risk", NOT general current conditions. So this reports a risk
 * verdict over a forward window rather than a temperature.
 *
 * Backed by Open-Meteo: free, no API key, no rate-limit paperwork. That matters —
 * an upstream quota becomes our Routing Revocation (ARCHITECTURE A3/A4).
 */

import { placeCandidates } from "./extract";

const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_TIMEOUT_MS = 8000;
const WINDOW_HOURS = 48;

export type StormVerdict = "none" | "low" | "moderate" | "high" | "severe" | "unknown";

export interface StormResult {
  location: string;
  verdict: StormVerdict;
  storm_expected: boolean;
  max_wind_gust_kmh: number | null;
  max_wind_speed_kmh: number | null;
  max_precipitation_mm: number | null;
  thunderstorm: boolean;
  window_hours: number;
  peak_at: string | null;
  latitude: number | null;
  longitude: number | null;
  confidence: number;
  reason: string;
  checked_at: string;
}

/** WMO codes that mean a thunderstorm specifically. */
const THUNDER = new Set([95, 96, 99]);

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
}

/** Accepts a place name, or "lat,lon" directly. */
/**
 * Geocode the query, falling back to candidates extracted from a natural-language
 * question. The geocoder is the arbiter — we just give it better strings to try.
 */
export async function resolvePlace(query: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Place | null> {
  for (const candidate of placeCandidates(query)) {
    const hit = await geocodeOnce(candidate, timeoutMs);
    if (hit) return hit;
  }
  return null;
}

async function geocodeOnce(query: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Place | null> {
  const q = (query ?? "").trim();
  if (!q) return null;

  const coords = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (coords && coords[1] && coords[2]) {
    const latitude = Number(coords[1]);
    const longitude = Number(coords[2]);
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    return { name: `${latitude},${longitude}`, latitude, longitude };
  }

  const body = (await getJson(
    `${GEOCODE}?name=${encodeURIComponent(q)}&count=1&language=en&format=json`,
    timeoutMs,
  )) as { results?: Array<Record<string, unknown>> };

  const hit = body.results?.[0];
  if (!hit) return null;
  const parts = [hit["name"], hit["admin1"], hit["country"]].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return {
    name: [...new Set(parts)].join(", "),
    latitude: Number(hit["latitude"]),
    longitude: Number(hit["longitude"]),
  };
}

/**
 * Gust thresholds follow the Beaufort scale, which is what meteorological
 * warnings are actually issued against — not an invented scale.
 *   >=118 km/h hurricane force · >=89 storm · >=62 gale · >=39 strong breeze
 */
function gradeGusts(gustKmh: number): StormVerdict {
  if (gustKmh >= 118) return "severe";
  if (gustKmh >= 89) return "high";
  if (gustKmh >= 62) return "moderate";
  if (gustKmh >= 39) return "low";
  return "none";
}

const ORDER: StormVerdict[] = ["none", "low", "moderate", "high", "severe"];
function escalate(v: StormVerdict, steps: number): StormVerdict {
  const i = ORDER.indexOf(v);
  if (i < 0) return v;
  return ORDER[Math.min(ORDER.length - 1, i + steps)] ?? v;
}

export async function checkStorm(query: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<StormResult> {
  const now = new Date().toISOString();
  const base: StormResult = {
    location: query,
    verdict: "unknown",
    storm_expected: false,
    max_wind_gust_kmh: null,
    max_wind_speed_kmh: null,
    max_precipitation_mm: null,
    thunderstorm: false,
    window_hours: WINDOW_HOURS,
    peak_at: null,
    latitude: null,
    longitude: null,
    confidence: 1,
    reason: "",
    checked_at: now,
  };

  const place = await resolvePlace(query, timeoutMs);
  if (!place) {
    return { ...base, reason: `No resolvable location found for ${JSON.stringify(query)}.` };
  }

  const url =
    `${FORECAST}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&hourly=wind_speed_10m,wind_gusts_10m,precipitation,weather_code` +
    `&forecast_days=2&timezone=UTC&wind_speed_unit=kmh`;

  const body = (await getJson(url, timeoutMs)) as {
    hourly?: {
      time?: string[];
      wind_speed_10m?: number[];
      wind_gusts_10m?: number[];
      precipitation?: number[];
      weather_code?: number[];
    };
  };

  const h = body.hourly;
  const times = h?.time ?? [];
  const gusts = h?.wind_gusts_10m ?? [];
  const winds = h?.wind_speed_10m ?? [];
  const precip = h?.precipitation ?? [];
  const codes = h?.weather_code ?? [];

  if (times.length === 0 || gusts.length === 0) {
    return { ...base, location: place.name, latitude: place.latitude, longitude: place.longitude,
      reason: `No forecast data available for ${place.name}.` };
  }

  let peakIdx = 0;
  for (let i = 1; i < gusts.length; i++) {
    if ((gusts[i] ?? -1) > (gusts[peakIdx] ?? -1)) peakIdx = i;
  }
  const maxGust = gusts[peakIdx] ?? 0;
  const maxWind = winds.length ? Math.max(...winds) : null;
  const maxPrecip = precip.length ? Math.max(...precip) : null;
  const thunder = codes.some((c) => THUNDER.has(c));

  let verdict = gradeGusts(maxGust);
  // A thunderstorm is disruption in its own right, independent of wind speed.
  if (thunder) verdict = escalate(verdict, verdict === "none" ? 2 : 1);
  // Heavy rain compounds it.
  if ((maxPrecip ?? 0) >= 10) verdict = escalate(verdict, 1);

  return {
    location: place.name,
    verdict,
    storm_expected: verdict !== "none",
    max_wind_gust_kmh: Math.round(maxGust * 10) / 10,
    max_wind_speed_kmh: maxWind === null ? null : Math.round(maxWind * 10) / 10,
    max_precipitation_mm: maxPrecip === null ? null : Math.round(maxPrecip * 10) / 10,
    thunderstorm: thunder,
    window_hours: WINDOW_HOURS,
    peak_at: times[peakIdx] ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    confidence: 1,
    reason: describe(place.name, verdict, maxGust, thunder, maxPrecip),
    checked_at: now,
  };
}

/** One factual sentence — terse for the same word-overlap reason as the SSL path. */
function describe(
  place: string,
  verdict: StormVerdict,
  gust: number,
  thunder: boolean,
  precip: number | null,
): string {
  if (verdict === "none") {
    return `No storm risk for ${place} in the next ${WINDOW_HOURS} hours, with peak wind gusts of ${Math.round(gust)} km/h.`;
  }
  const bits = [`peak wind gusts of ${Math.round(gust)} km/h`];
  if (thunder) bits.push("thunderstorms forecast");
  if ((precip ?? 0) >= 10) bits.push(`heavy rain up to ${Math.round(precip ?? 0)} mm/h`);
  return `${place} has a ${verdict} storm risk in the next ${WINDOW_HOURS} hours: ${bits.join(", ")}.`;
}
