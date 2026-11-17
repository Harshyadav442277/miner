/**
 * The nearest observed air temperature: a METAR from NOAA's Aviation Weather Center, keyless.
 *
 *   aviationweather.gov/api/data/metar?bbox=…&format=json   one call per question
 *
 * WEATHER_CHECK_TEMPERATURE scores the current air temperature, and in the first scores under registration 5292
 * (2026-11-16 21:49 UTC) the miners reading observations led (wxk-metar 1.0, Environment Canada 0.975) while every
 * model-value miner, ours and MET Norway's own, sat at 0.39. A METAR is a measurement at a named station and time;
 * it is reported as one, with the station and its distance, and never stretched past `MAX_KM` or `MAX_AGE_MS`.
 */
const API = "https://aviationweather.gov/api/data/metar";
export const MAX_KM = 60;
export const MAX_AGE_MS = 2 * 3_600_000;

export interface Observation {
  station: string;
  name: string;
  temp_c: number;
  observed_at: string;
  distance_km: number;
}

/** Great-circle distance in km. Pure. */
export function km(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** "Tokyo/Haneda Intl, 13, JP" → "Tokyo/Haneda Intl": the API appends a region code and the country. Pure. */
export function stationName(raw: string): string {
  return raw.replace(/(?:, [^,]{1,3})?, [A-Z]{2}$/, "").trim();
}

/** The nearest fresh report with a temperature, within MAX_KM. Pure. */
export function nearest(rows: unknown, lat: number, lon: number, now: number): Observation | null {
  if (!Array.isArray(rows)) return null;
  let best: Observation | null = null;
  for (const m of rows as Array<Record<string, unknown>>) {
    const t = m.temp, la = m.lat, lo = m.lon, obs = m.obsTime;
    if (typeof t !== "number" || typeof la !== "number" || typeof lo !== "number" || typeof obs !== "number") continue;
    if (now - obs * 1000 > MAX_AGE_MS || obs * 1000 > now + 600_000) continue;
    const d = km(lat, lon, la, lo);
    if (d > MAX_KM || (best && d >= best.distance_km)) continue;
    best = {
      station: String(m.icaoId ?? ""), name: stationName(String(m.name ?? m.icaoId ?? "")),
      temp_c: t, observed_at: new Date(obs * 1000).toISOString(), distance_km: Math.round(d),
    };
  }
  return best;
}

/** `null` when no station qualifies or the service did not answer: the caller keeps its model value. */
export async function nearestObservation(lat: number, lon: number, timeoutMs = 5_000, now = Date.now()): Promise<Observation | null> {
  const dLat = MAX_KM / 111;
  const dLon = Math.min(MAX_KM / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.05)), 180);
  const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((x) => x.toFixed(3)).join(",");
  try {
    const r = await fetch(`${API}?bbox=${bbox}&format=json`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return null;
    return nearest(await r.json(), lat, lon, now);
  } catch {
    return null;
  }
}
