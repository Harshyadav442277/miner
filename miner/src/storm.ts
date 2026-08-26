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

import { placeCandidates, shortPlaceName, extractCoords, extractHours, extractTimeRequest } from "./extract";

const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_TIMEOUT_MS = 8000;
const WINDOW_HOURS = 48;

export type StormVerdict = "none" | "low" | "moderate" | "high" | "severe" | "unknown";

export interface StormResult {
  location: string;
  verdict: StormVerdict;
  /** Overall storm risk from 0 (none) to 1 (severe). */
  risk_score: number;
  /** "point" answers one moment; "window" aggregates a span. */
  time_mode: "point" | "window";
  /** For a point answer, the hour the values describe. */
  valid_at: string | null;
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
  // Coordinates stated in prose ("at latitude 12.97 and longitude 77.59") are an
  // exact answer to "where" — no geocoder round-trip, and no chance of it
  // resolving the surrounding words to somewhere else.
  const coords = extractCoords(query);
  if (coords) return { name: `${coords.lat},${coords.lon}`, latitude: coords.lat, longitude: coords.lon };

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
 * A continuous 0–1 risk value alongside the category.
 *
 * Real paid questions ask for "an overall risk between 0 and 1" — a categorical
 * verdict alone does not answer that, and an agent thresholding on a number
 * cannot use "moderate". Anchored on the same Beaufort gust thresholds the
 * verdict uses, so the two can never disagree, then nudged for thunderstorms and
 * heavy rain the way the verdict is.
 */
function riskScore(gustKmh: number, thunder: boolean, precipMm: number | null): number {
  // Piecewise-linear across the Beaufort anchors: 39/62/89/118 km/h.
  const anchors: [number, number][] = [
    [0, 0.0], [39, 0.25], [62, 0.5], [89, 0.75], [118, 0.9], [160, 1.0],
  ];
  let base = 1;
  for (let i = 1; i < anchors.length; i++) {
    const [x0, y0] = anchors[i - 1]!;
    const [x1, y1] = anchors[i]!;
    if (gustKmh <= x1) {
      base = y0 + ((gustKmh - x0) / (x1 - x0)) * (y1 - y0);
      break;
    }
  }
  if (thunder) base += 0.2;
  if ((precipMm ?? 0) >= 10) base += 0.1;
  return Math.round(Math.max(0, Math.min(1, base)) * 100) / 100;
}

/** The categorical view of the same number, so the two can never contradict. */
function gradeRisk(risk: number): StormVerdict {
  if (risk >= 0.85) return "severe";
  if (risk >= 0.65) return "high";
  if (risk >= 0.4) return "moderate";
  if (risk >= 0.2) return "low";
  return "none";
}

export async function checkStorm(
  query: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  requestedHours?: number,
): Promise<StormResult> {
  // "over the next 44 hours" is part of the question. Reporting a 48-hour
  // maximum answers about six hours the caller did not ask about.
  // "in 44 hours" names a moment; "over the next 44 hours" names a span. Reporting
  // a span maximum for a point question describes weather that has not happened.
  const asked = extractTimeRequest(query);
  const mode: "point" | "window" = requestedHours !== undefined ? "window" : (asked?.mode ?? "window");
  const offsetHours = Math.max(0, Math.min(168, asked?.hours ?? 0));
  const windowHours = Math.max(
    1,
    Math.min(168, requestedHours ?? (mode === "window" ? (asked?.hours ?? WINDOW_HOURS) : offsetHours + 1)),
  );
  const now = new Date().toISOString();
  const base: StormResult = {
    location: query,
    verdict: "unknown",
    risk_score: 0,
    time_mode: mode,
    valid_at: null,
    storm_expected: false,
    max_wind_gust_kmh: null,
    max_wind_speed_kmh: null,
    max_precipitation_mm: null,
    thunderstorm: false,
    window_hours: windowHours,
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
    `&forecast_days=${Math.min(16, Math.ceil(windowHours / 24) + 1)}&timezone=UTC&wind_speed_unit=kmh`;

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
  // Open-Meteo returns whole days from midnight UTC. Trim to exactly the hours
  // asked for, counted from now, so the peak we report is inside the window the
  // caller named rather than somewhere in the leftover tail of the last day.
  const allTimes = h?.time ?? [];
  const nowMs = Date.now();
  let from = allTimes.findIndex((t) => new Date(`${t}Z`).getTime() >= nowMs);
  if (from < 0) from = 0;
  const to = from + windowHours;
  const cut = <T,>(a: T[] | undefined): T[] => (a ?? []).slice(from, to);

  const times = cut(allTimes);
  const gusts = cut(h?.wind_gusts_10m);
  const winds = cut(h?.wind_speed_10m);
  const precip = cut(h?.precipitation);
  const codes = cut(h?.weather_code);

  if (times.length === 0 || gusts.length === 0) {
    return { ...base, location: place.name, latitude: place.latitude, longitude: place.longitude,
      reason: `No forecast data available for ${place.name}.` };
  }

  // A point question is answered by one row; a window question by the worst row.
  let peakIdx = 0;
  if (mode === "point") {
    peakIdx = Math.min(Math.max(0, offsetHours), Math.max(0, times.length - 1));
  } else {
    for (let i = 1; i < gusts.length; i++) {
      if ((gusts[i] ?? -1) > (gusts[peakIdx] ?? -1)) peakIdx = i;
    }
  }

  const maxGust = mode === "point" ? (gusts[peakIdx] ?? 0) : (gusts[peakIdx] ?? 0);
  const maxWind =
    mode === "point" ? (winds[peakIdx] ?? null) : winds.length ? Math.max(...winds) : null;
  const maxPrecip =
    mode === "point" ? (precip[peakIdx] ?? null) : precip.length ? Math.max(...precip) : null;
  const thunder =
    mode === "point" ? THUNDER.has(codes[peakIdx] ?? -1) : codes.some((c) => THUNDER.has(c));

  // One number, one label, derived from it. Previously the verdict escalated in
  // discrete steps while the score added a continuous bonus, so a "low" could
  // carry a higher risk_score than a "moderate" — incoherent to any consumer
  // reading both fields.
  const risk = riskScore(maxGust, thunder, maxPrecip);
  const verdict = gradeRisk(risk);

  return {
    location: place.name,
    verdict,
    storm_expected: verdict !== "none",
    risk_score: risk,
    max_wind_gust_kmh: Math.round(maxGust * 10) / 10,
    max_wind_speed_kmh: maxWind === null ? null : Math.round(maxWind * 10) / 10,
    max_precipitation_mm: maxPrecip === null ? null : Math.round(maxPrecip * 10) / 10,
    thunderstorm: thunder,
    window_hours: windowHours,
    time_mode: mode,
    valid_at: mode === "point" ? (times[peakIdx] ?? null) : null,
    peak_at: times[peakIdx] ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    confidence: 1,
    reason: describe(shortPlaceName(place.name), verdict, maxGust, thunder, maxPrecip, windowHours, mode, offsetHours),
    checked_at: now,
  };
}

/** How a point in time reads in prose: "right now" or "in N hours". */
function when(offsetHours: number): string {
  return offsetHours <= 0 ? "right now" : `in ${offsetHours} hours`;
}

/** One factual sentence — terse for the same word-overlap reason as the SSL path. */
function describe(
  place: string,
  verdict: StormVerdict,
  gust: number,
  thunder: boolean,
  precip: number | null,
  hours: number,
  mode: "point" | "window",
  offsetHours: number,
): string {
  if (verdict === "none") {
    return mode === "point"
      ? `No storm risk for ${place} ${when(offsetHours)}, with wind gusts of ${Math.round(gust)} km/h.`
      : `No storm risk for ${place} in the next ${hours} hours, with peak wind gusts of ${Math.round(gust)} km/h.`;
  }
  // Nothing about a single hour is a "peak".
  const bits = [`${mode === "point" ? "wind gusts" : "peak wind gusts"} of ${Math.round(gust)} km/h`];
  if (thunder) bits.push("thunderstorms forecast");
  if ((precip ?? 0) >= 10) bits.push(`heavy rain up to ${Math.round(precip ?? 0)} mm/h`);
  return mode === "point"
    ? `${place} has a ${verdict} storm risk ${when(offsetHours)}: ${bits.join(", ")}.`
    : `${place} has a ${verdict} storm risk in the next ${hours} hours: ${bits.join(", ")}.`;
}
