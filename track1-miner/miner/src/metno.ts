/**
 * MET Norway's Locationforecast 2.0 ("complete"): the weather source for WEATHER_FORECAST,
 * WEATHER_CHECK and STORM_ALERT since 2026-10-18 (GAPS G189).
 *
 * Why not Open-Meteo: its free API may "only [be used] for non-commercial purposes"
 * (open-meteo.com/en/terms, read 2026-10-14), and answers sold through Telegraph are commercial.
 * MET Norway's data is licensed NLOD 2.0 and CC BY 4.0 (api.met.no/doc/License, read
 * 2026-10-18): commercial use is allowed with credit.
 *
 * Its terms of service (api.met.no/doc/TermsOfService, read 2026-10-18), and where each is kept:
 * - identify with a User-Agent naming the application and a contact: `WEATHER_USER_AGENT`;
 * - truncate coordinates to at most 4 decimals ("requests with 5+ decimals will return a 403"):
 *   `coord()`;
 * - do not ask again before the Expires header: the cache below;
 * - credit MET Norway: `MET_ATTRIBUTION`, which every weather answer ends with;
 * - never appear to be a service of Yr, NRK or MET: we only credit the data.
 *
 * What it does not publish, measured 2026-10-18 for London and Chennai: precipitation probability
 * and wind gusts (both exist only around the Nordic countries). They come back null and are never
 * estimated. Steps are hourly for about the first 65 hours, then 6-hourly, to about 9 days out.
 */

import { getWeatherJsonWithExpiry } from "./weather-upstream";

const LOCATIONFORECAST = "https://api.met.no/weatherapi/locationforecast/2.0/complete";

/** The credit CC BY 4.0 requires, in the words MET Norway suggests. */
export const MET_ATTRIBUTION = "MET Norway (CC BY 4.0)";

/** One forecast step, in the units the answers use. */
export interface MetStep {
  /** Start of the step, "YYYY-MM-DDTHH:MM" in UTC: the shape the callers parse with `${t}Z`. */
  time: string;
  /** Hours this step's precipitation, symbol and temperature range cover: 1 or 6. */
  hours: number;
  temp_c: number | null;
  /** Range over the step's period; for a 1-hour step, the instant temperature. */
  temp_min_c: number | null;
  temp_max_c: number | null;
  precip_mm: number | null;
  precip_prob_pct: number | null;
  wind_kmh: number | null;
  gust_kmh: number | null;
  wind_dir_deg: number | null;
  /** MET's symbol code, e.g. "lightrainshowers_day". */
  symbol: string | null;
}

/** At most four decimals, truncated rather than rounded, as the terms ask. */
export function coord(n: number): number {
  return Math.trunc(n * 1e4) / 1e4;
}

const cache = new Map<string, { steps: MetStep[]; expiresMs: number }>();
const CACHE_LIMIT = 500;

/** Test hook: forget every cached forecast. */
export function resetMetCache(): void {
  cache.clear();
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const kmh = (ms: number | null): number | null => (ms === null ? null : Math.round(ms * 3.6 * 10) / 10);

type Period = { summary?: { symbol_code?: string }; details?: Record<string, unknown> } | undefined;

/** The timeseries as steps. Exported for tests; `metForecast` is the caller's entry point. */
export function parseMet(body: unknown): MetStep[] {
  const ts = ((body as { properties?: { timeseries?: unknown[] } })?.properties?.timeseries ?? []) as Array<{
    time?: string;
    data?: { instant?: { details?: Record<string, unknown> }; next_1_hours?: Period; next_6_hours?: Period };
  }>;
  const steps: MetStep[] = [];
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (!t?.time || !t.data) continue;
    // A step covers the time to the next one: hourly at first, then six hours. Its period block
    // is the one of that length, so precipitation is never counted twice or skipped.
    const next = ts[i + 1]?.time;
    const gapHours = next ? (Date.parse(next) - Date.parse(t.time)) / 3_600_000 : 6;
    const hourly = gapHours <= 1 && t.data.next_1_hours;
    const period: Period = hourly ? t.data.next_1_hours : t.data.next_6_hours;
    const instant = t.data.instant?.details ?? {};
    const d = period?.details ?? {};
    const temp = num(instant["air_temperature"]);
    steps.push({
      time: t.time.slice(0, 16),
      hours: hourly ? 1 : 6,
      temp_c: temp,
      temp_min_c: hourly ? temp : num(d["air_temperature_min"]) ?? temp,
      temp_max_c: hourly ? temp : num(d["air_temperature_max"]) ?? temp,
      precip_mm: num(d["precipitation_amount"]),
      precip_prob_pct: num(d["probability_of_precipitation"]),
      wind_kmh: kmh(num(instant["wind_speed"])),
      gust_kmh: kmh(num(instant["wind_speed_of_gust"])),
      wind_dir_deg: num(instant["wind_from_direction"]),
      symbol: typeof period?.summary?.symbol_code === "string" ? period.summary.symbol_code : null,
    });
  }
  return steps;
}

/**
 * The forecast for a point, from the cache while MET's Expires header allows. A failed read
 * throws; the routes answer that as an outage, never as a place with no weather.
 */
export async function metForecast(
  latitude: number,
  longitude: number,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<MetStep[]> {
  const lat = coord(latitude);
  const lon = coord(longitude);
  const key = `${lat},${lon}`;
  const hit = cache.get(key);
  if (hit && hit.expiresMs > Date.now()) return hit.steps;
  const { body, expiresMs } = await getWeatherJsonWithExpiry(`${LOCATIONFORECAST}?lat=${lat}&lon=${lon}`, timeoutMs, fetchImpl);
  const steps = parseMet(body);
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  // Without an Expires header, five minutes: short enough to stay current, long enough not to
  // re-ask on every request.
  cache.set(key, { steps, expiresMs: expiresMs ?? Date.now() + 300_000 });
  return steps;
}

/** Index of the step whose period contains `ms`, or -1. */
export function stepAt(steps: MetStep[], ms: number): number {
  return steps.findIndex((s) => {
    const start = Date.parse(`${s.time}Z`);
    return start <= ms && ms < start + s.hours * 3_600_000;
  });
}

/**
 * The steps an answer is built from: from the step containing `startMs`, until they cover `hours`,
 * stopping early at the first step missing a value the answer needs. Empty when the series does
 * not reach `startMs`, or its first step is incomplete: a missing value is never read as zero.
 */
export function stepsFrom(all: MetStep[], startMs: number, hours: number, needs: (s: MetStep) => boolean): MetStep[] {
  const from = stepAt(all, startMs);
  if (from < 0) return [];
  const out: MetStep[] = [];
  let covered = 0;
  for (let i = from; i < all.length && covered < hours; i++) {
    const s = all[i]!;
    if (!needs(s)) break;
    out.push(s);
    covered += s.hours;
  }
  return out;
}

/** Hours covered by `steps`. */
export const coveredHours = (steps: MetStep[]): number => steps.reduce((a, s) => a + s.hours, 0);

/** MET symbol codes name day and night variants; the weather is the same. */
const baseSymbol = (s: string): string => s.replace(/_(?:day|night|polartwilight)$/, "");

export function isThunder(symbol: string | null): boolean {
  return symbol !== null && symbol.includes("thunder");
}

/** The plain word a person would use for the worst weather among `symbols`. */
export function conditionOfSymbols(symbols: Array<string | null>): string {
  const rank = (s: string): [number, string] => {
    const b = baseSymbol(s);
    if (b.includes("thunder")) return [8, "thunderstorms"];
    if (b.includes("snow") || b.includes("sleet")) return [7, "snow"];
    if (b.startsWith("heavyrain")) return [6, "heavy rain"];
    if (b.startsWith("lightrain")) return [4, "light rain"];
    if (b.startsWith("rain")) return [5, "rain"];
    if (b === "fog") return [3, "fog"];
    if (b === "cloudy" || b === "partlycloudy") return [2, "cloudy"];
    if (b === "fair") return [1, "mostly clear"];
    return [0, "clear"];
  };
  let best: [number, string] = [-1, "clear"];
  for (const s of symbols) {
    if (!s) continue;
    const r = rank(s);
    if (r[0] > best[0]) best = r;
  }
  return best[1];
}
