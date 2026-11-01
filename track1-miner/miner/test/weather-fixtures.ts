/**
 * Offline stand-ins for MET Norway's Locationforecast and OpenStreetMap's Nominatim, in the shapes
 * both returned live on 2026-10-18, for the weather and storm tests.
 */

export const HOUR = 3_600_000;
export const hourStart = (ms = Date.now()): number => Math.floor(ms / HOUR) * HOUR;
/** A step time as the routes report it: "YYYY-MM-DDTHH:MM". */
export const stamp = (ms: number): string => new Date(ms).toISOString().slice(0, 16);

export interface FixtureHour {
  temp?: number | null;
  windKmh?: number | null;
  gustKmh?: number | null;
  dir?: number;
  precip?: number | null;
  prob?: number | null;
  symbol?: string | null;
}

/**
 * `count` hourly steps from `origin`. Every value defaults to calm, clear and 20 °C rising one
 * degree an hour; `hour(i)` overrides any of them, and null removes it as MET does.
 */
export function metBody(count: number, origin = hourStart(), hour: (i: number) => FixtureHour = () => ({})): unknown {
  const timeseries = Array.from({ length: count }, (_, i) => {
    const h: FixtureHour = { temp: 20 + i, windKmh: 10, dir: 90, precip: 0, symbol: "clearsky_day", ...hour(i) };
    const instant: Record<string, unknown> = {
      air_temperature: h.temp,
      wind_speed: h.windKmh == null ? null : h.windKmh / 3.6,
      wind_from_direction: h.dir,
    };
    if (h.gustKmh != null) instant["wind_speed_of_gust"] = h.gustKmh / 3.6;
    const details: Record<string, unknown> = { precipitation_amount: h.precip };
    if (h.prob != null) details["probability_of_precipitation"] = h.prob;
    return {
      time: new Date(origin + i * HOUR).toISOString().replace(".000", ""),
      data: { instant: { details: instant }, next_1_hours: { summary: { symbol_code: h.symbol }, details } },
    };
  });
  return { type: "Feature", properties: { meta: { units: { wind_speed: "m/s" } }, timeseries } };
}

/** Nominatim's /search answer for one hit. */
export function nominatimHit(displayName: string, lat: number, lon: number): unknown {
  return [{ lat: String(lat), lon: String(lon), display_name: displayName }];
}

/** Nominatim's /reverse answer. */
export function nominatimReverse(city: string, state?: string, country?: string): unknown {
  return { address: { city, ...(state ? { state } : {}), ...(country ? { country } : {}) } };
}

export const isMet = (url: string): boolean => url.includes("api.met.no");
export const isNominatimSearch = (url: string): boolean => url.includes("nominatim") && url.includes("/search");
export const isNominatimReverse = (url: string): boolean => url.includes("nominatim") && url.includes("/reverse");

export const json = (body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", ...headers } });
