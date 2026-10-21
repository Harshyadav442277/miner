/**
 * WEATHER_CHECK's present-tense question: conditions NOW, not a forecast.
 *
 * "What is the current temperature in Cairo?" was answered, on production on
 * 2026-09-13, with "A 24-hour hourly weather forecast for Cairo ... from 22.8°C to
 * 36.5°C". Every number in that was true and none of them was the current
 * temperature. The engine sends the question without `hours`, so the route fell
 * through to its 24-hour default; and even an explicit `hours=0` produced "A
 * 1-hour hourly weather forecast", which is still a forecast of the next hour
 * rather than a reading. It is G113's defect — a true answer to a different
 * question — in the other half of the same intent.
 *
 * WHY THIS IS SHIPPED WITHOUT A BENCH. The reg-510 bench for this intent was
 * declared invalid (it put us over the line on 12 of 20 authored registers while
 * we crossed in 0 of 9 live epochs), so nothing is tuned to it. What this rests on
 * is narrower and stronger: both competitors that DO cross in this intent lead
 * their answer with a current reading, and ours never stated one. That is a
 * missing answer, not a wording preference.
 *
 * WHERE THE VALUE COMES FROM. Until 2026-10-18 this read Open-Meteo's `current` block, whose free
 * API is for non-commercial use only (GAPS G189). MET Norway publishes no separate current reading
 * outside the Nordic countries, so this is MET's model value for the step containing the present
 * hour — the first step of its forecast. Neither source was ever a station observation, and the
 * answer says it is the value for that hour rather than calling it a measurement.
 */
import { resolvePlace } from "./storm";
import { placeCredit } from "./weather-upstream";
import { extractCoords, shortPlaceName } from "./extract";
import type { ForecastResult } from "./forecast";
import { MET_ATTRIBUTION, conditionOfSymbols, metForecast, stepAt } from "./metno";

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Does the question ask about conditions now rather than later?
 *
 * Any forward-looking word wins, so "the weather now and tomorrow" and "the
 * current forecast for the next three days" stay forecasts. A storm-alert
 * question never reaches this: the route answers those first.
 */
export function asksCurrentConditions(text: string): boolean {
  const s = String(text ?? "");
  if (!/\b(?:right now|currently|at the moment|at present|as of now|current|now)\b/i.test(s)) return false;
  return !/\b(?:forecasts?|tomorrow|tonight|later|next|coming|upcoming|weekend|this (?:week|evening|afternoon|morning)|in \d+ (?:hours?|days?|minutes?)|will it|going to)\b/i.test(s);
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

export async function getCurrentConditions(query: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ForecastResult> {
  const now = new Date().toISOString();
  const base: ForecastResult = {
    location: query, verdict: "unknown", window_hours: 0,
    temp_min_c: null, temp_max_c: null, total_precipitation_mm: null,
    precipitation_probability_max_pct: null, max_wind_speed_kmh: null, precipitation_hours: null,
    latitude: null, longitude: null, confidence: 1, reason: "", checked_at: now,
  };

  const place = await resolvePlace(query, timeoutMs);
  if (!place) return { ...base, reason: `No resolvable location found for ${JSON.stringify(query)}.` };

  // A failed read throws, and the route answers that as an outage — the same
  // contract as the forecast path, so an outage is never a missing reading.
  const steps = await metForecast(place.latitude, place.longitude, timeoutMs);
  const c = steps[stepAt(steps, Date.now())];
  const located = { location: place.name, latitude: place.latitude, longitude: place.longitude };
  if (!c || c.temp_c === null || c.symbol === null) {
    return { ...base, ...located, confidence: 0, reason: `Current conditions are unavailable for ${place.name}.` };
  }

  const temp = r1(c.temp_c);
  const condition = conditionOfSymbols([c.symbol]);
  const coords = extractCoords(query);
  const where = coords ? `latitude ${coords.lat}, longitude ${coords.lon} near ${shortPlaceName(place.name)}` : place.name;
  const precip = c.precip_mm === null ? null : r1(c.precip_mm);
  const wind = c.wind_kmh === null ? null : r1(c.wind_kmh);
  const at = `${c.time.slice(11, 16)} UTC on ${c.time.slice(0, 10)}`;

  /**
   * The noun the question used leads the sentence. A lexical scorer rewards the
   * question's own vocabulary, and "What is the current temperature" and "What is
   * the weather right now" name different things, so each is answered in its own
   * words. The reading comes first and the source last, because roughly 32
   * converted words are scored and the converter drops what it reaches last.
   */
  const lead = /\btemperature\b/i.test(query)
    ? `The current temperature in ${where} is ${temp}°C, and it is ${condition}`
    : `The current weather in ${where} is ${condition} at ${temp}°C`;
  const rain = precip === null ? "" : precip >= 0.1 ? `, with ${precip} mm of precipitation this hour` : ", with no precipitation";
  const breeze = wind === null ? "" : ` and wind at ${wind} km/h`;

  return {
    ...base, ...located,
    verdict: condition,
    start_time: `${c.time}Z`, end_time: `${c.time}Z`, hourly_count: null,
    temp_min_c: temp, temp_max_c: temp,
    total_precipitation_mm: precip, max_wind_speed_kmh: wind,
    reason: `${lead}${rain}${breeze}, as of ${at}, the model value for that hour from ${MET_ATTRIBUTION}${placeCredit(place)}.`,
  };
}
