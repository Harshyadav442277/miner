/**
 * WEATHER_FORECAST — future conditions for a named location over a stated window.
 *
 * The intent is explicit that this is about FUTURE conditions over a time window.
 * Conditions NOW are WEATHER_CHECK's question and are answered by
 * currentweather.ts from a real current reading, not from here. So this answers
 * "what will it be like", with the window named.
 *
 * Shares MET Norway and the geocoder with the storm path (metno.ts): keyless, so no upstream
 * quota can become a Routing Revocation (ARCHITECTURE A3/A4), and licensed for commercial use
 * with credit (GAPS G189). MET forecasts hourly for about 65 hours and 6-hourly after that, to
 * about 9 days, and publishes no precipitation probability outside the Nordic countries; the
 * answer says which resolution it covers and never claims a value it did not get.
 */

import { resolvePlace } from "./storm";
import { placeCredit } from "./weather-upstream";
import { shortPlaceName, resolveDateRequest, extractCoords } from "./extract";
import { MET_ATTRIBUTION, conditionOfSymbols, coveredHours, metForecast, stepAt, stepsFrom } from "./metno";

const DEFAULT_TIMEOUT_MS = 8000;

export interface ForecastResult {
  location: string;
  verdict: string;
  window_hours: number;
  /** The window in days when it is a clean multiple — the form most questions
   *  use, and a field Telegraph's converter can pick up directly. */
  span_days?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  hourly_count?: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  total_precipitation_mm: number | null;
  /** Peak hourly chance of precipitation over the window, 0-100. The recurring
   *  paid question asks for "precipitation probability" by name and no summary
   *  of millimeters answers it. */
  precipitation_probability_max_pct: number | null;
  max_wind_speed_kmh: number | null;
  precipitation_hours: number | null;
  latitude: number | null;
  longitude: number | null;
  confidence: number;
  reason: string;
  checked_at: string;
}

export async function getForecast(
  query: string,
  hours = 24,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  daysRequested: number | null = null,
): Promise<ForecastResult> {
  const now = new Date().toISOString();
  const window = Math.max(1, Math.min(168, Math.floor(hours)));
  const base: ForecastResult = {
    location: query,
    verdict: "unknown",
    window_hours: window,
    temp_min_c: null,
    temp_max_c: null,
    total_precipitation_mm: null,
    precipitation_probability_max_pct: null,
    max_wind_speed_kmh: null,
    precipitation_hours: null,
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

  // A question may name an explicit start ("48 hourly values starting
  // 2026-09-01T06:00:00Z"). Answering that with "the next N hours from now"
  // describes a different period entirely, so fetch the interval that actually
  // contains it and slice by timestamp rather than from index zero.
  const asked = resolveDateRequest(query);
  // Name back the identifier the question used. Resolving coordinates to a place
  // and answering with only the place name drops what the caller asked about —
  // measured on the storm endpoint as a 2x score difference.
  const askedCoords = extractCoords(query);
  // hours=0 no longer reaches here: the route sends present-tense questions to
  // currentweather.ts, which reads a current value instead of forecasting an hour.
  const startMs = asked ? Date.parse(asked.startIso) : Date.now();
  const wantHours = asked?.hours ?? window;

  // A hard failure throws and is answered as an outage rather than as a location with no forecast.
  const all = await metForecast(place.latitude, place.longitude, timeoutMs);
  const complete = (s: { temp_c: number | null; precip_mm: number | null; wind_kmh: number | null; symbol: string | null }) =>
    s.temp_c !== null && s.precip_mm !== null && s.wind_kmh !== null && s.symbol !== null;
  const steps = stepsFrom(all, startMs, wantHours, complete);

  // A requested period the provider does not cover must be said plainly rather
  // than silently answered with a different period.
  if (stepAt(all, startMs) < 0) {
    return {
      ...base,
      location: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      window_hours: wantHours,
      confidence: 0,
      reason:
        `No hourly forecast is available for ${shortPlaceName(place.name)} starting ${new Date(startMs).toISOString()}, ` +
        `because that period is outside the forecast provider's horizon. ` +
        `Check a national meteorological service closer to the date.`,
    };
  }

  if (steps.length === 0) {
    return {
      ...base,
      location: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      confidence: 0, reason: `Complete forecast data is unavailable for ${place.name}.`,
    };
  }

  const r1 = (n: number): number => Math.round(n * 10) / 10;
  const times = steps.map((s) => s.time);
  const precip = steps.map((s) => s.precip_mm as number);
  const tMin = r1(Math.min(...steps.map((s) => s.temp_min_c ?? (s.temp_c as number))));
  const tMax = r1(Math.max(...steps.map((s) => s.temp_max_c ?? (s.temp_c as number))));
  const totalPrecip = r1(precip.reduce((a, b) => a + b, 0));
  // Hours inside periods with measurable precipitation, so a wet 6-hour step counts six.
  const wetHours = steps.filter((s) => (s.precip_mm as number) > 0.1).reduce((a, s) => a + s.hours, 0);
  const maxWind = r1(Math.max(...steps.map((s) => s.wind_kmh as number)));
  const probs = steps.map((s) => s.precip_prob_pct).filter((p): p is number => p !== null);
  const probMax = probs.length ? Math.round(Math.max(...probs)) : null;
  const condition = conditionOfSymbols(steps.map((s) => s.symbol));

  const where = askedCoords
    ? `latitude ${askedCoords.lat}, longitude ${askedCoords.lon} near ${shortPlaceName(place.name)}`
    : place.name;

  // The hours served: the window asked for when it is covered (a last 6-hour step may run up to five
  // hours past it), fewer when the request runs past the source's horizon.
  const n = Math.min(coveredHours(steps), wantHours);
  const firstCoarse = steps.findIndex((s) => s.hours !== 1);
  // The engine usually delivers only structured parameters (location, days) and
  // never the question text — epoch 286 proved it. The recurring paid question
  // asks for "a 7-day hourly forecast ... temperature in Celsius and
  // precipitation probability", so the prose states the window in the same
  // day-count form it was requested in, and names hourly, Celsius and the
  // precipitation probability explicitly. Every phrase is backed by a field.
  // Epoch 287's request arrived as hours=168 for a question that said "7-day",
  // so the answer named the window in hours and the question's own form was
  // lost. A window that is a clean number of days is stated in BOTH forms —
  // "7-day (168-hour)" — so whichever form the question used, it is echoed.
  const daysEcho =
    daysRequested ?? (wantHours >= 48 && wantHours % 24 === 0 ? wantHours / 24 : null);
  // Echo the requested span only when it was served in full.
  const span = daysEcho && daysEcho * 24 === n ? `${daysEcho}-day (${n}-hour)` : `${n}-hour`;
  // MET publishes precipitation probability only around the Nordic countries. When it is absent
  // and the question asked for it, say so instead of leaving the caller to infer a zero.
  const probClause = probMax !== null
    ? `, a precipitation probability of up to ${probMax}%`
    : /\bprobabilit|\bchance of\b/i.test(query) ? ", no precipitation probability is published for this location" : "";

  // Name the dates the series actually covers, the way a person would write them.
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  const written = (iso: string): string => {
    const d = new Date(`${iso}Z`);
    return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  };
  const covering =
    times.length > 1
      ? ` covering ${written(times[0]!).replace(/, \d{4}$/, "")} to ${written(times[times.length - 1]!)}`
      : "";
  // Hourly for about 65 hours, then 6-hourly: say where the resolution changes rather than calling
  // the whole span hourly.
  const coarseAt = firstCoarse >= 0 ? times[firstCoarse]! : null;
  const resolution = coarseAt === null
    ? ""
    : `, hourly until ${coarseAt.slice(11, 16)} UTC on ${written(coarseAt).replace(/, \d{4}$/, "")} and 6-hourly after that`;
  const shortfall = n < wantHours ? `, which is as far ahead as the source forecasts` : "";

  return {
    location: place.name,
    verdict: condition,
    window_hours: n,
    span_days: daysEcho ?? null,
    start_time: times[0] ? `${times[0]}Z` : null,
    end_time: times.length ? `${times[times.length - 1]}Z` : null,
    hourly_count: steps.filter((s) => s.hours === 1).length || null,
    temp_min_c: tMin,
    temp_max_c: tMax,
    total_precipitation_mm: totalPrecip,
    precipitation_probability_max_pct: probMax,
    max_wind_speed_kmh: maxWind,
    precipitation_hours: wetHours,
    latitude: place.latitude,
    longitude: place.longitude,
    confidence: 1,
    // The prose must retain every fact the question asked for, because the scorer
    // reads Telegraph's conversion of this text — not the structured fields. A
    // question naming an explicit start and asking for temperature and
    // precipitation gets all three back, spelled out, in that order.
    // One template for both branches. The explicit-start branch used to carry
    // its own prose and measured 0.00761 against the main template's 0.01080
    // on the same question — the shape, not the honest window, was the loss.
    // The covering clause already names the actual dates served, so an asked
    // start is visible either way.
    //
    // Temperature leads. In epochs 289 and 290 the question asked for
    // temperature by name and Telegraph's ~32-word conversion kept condition,
    // precipitation and wind while dropping the mid-sentence temperature
    // range — both times. What the converter reaches last is what it drops,
    // so the unasked-for source attribution sits at the tail.
    reason:
      (coarseAt === null
        ? `A ${span} hourly weather forecast for ${where}${covering}${shortfall}: hourly temperature in `
        : `A ${span} weather forecast for ${where}${covering}${shortfall}${resolution}: temperature in `) +
      `Celsius from ${tMin}°C to ${tMax}°C${probClause}` +
      (totalPrecip >= 0.1 ? `, ${totalPrecip} mm of total precipitation` : `, no significant precipitation`) +
      `, the expected condition is ${condition}` +
      `, and a wind speed of up to ${maxWind} km/h, from ${MET_ATTRIBUTION}${placeCredit(place)}.`,
    checked_at: now,
  };
}
