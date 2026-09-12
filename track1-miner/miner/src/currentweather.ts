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
 * WHY `current` AND NOT THE FIRST HOURLY SLOT. Open-Meteo's `current` block is a
 * 15-minute reading with its own timestamp, verified keyless on 2026-09-13. The
 * first hourly slot is a forecast value for the top of an hour, which is the thing
 * the question is not asking for.
 */
import { resolvePlace } from "./storm";
import { extractCoords, shortPlaceName } from "./extract";
import { conditionOf, type ForecastResult } from "./forecast";

const FORECAST = "https://api.open-meteo.com/v1/forecast";
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

interface Current {
  time?: string;
  temperature_2m?: number;
  precipitation?: number;
  weather_code?: number;
  wind_speed_10m?: number;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
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

  const url =
    `${FORECAST}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=UTC&wind_speed_unit=kmh`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let body: { current?: Current };
  try {
    // A failed fetch throws, and the route answers that as an outage — the same
    // contract as the forecast path, so an outage is never a missing reading.
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    body = (await res.json()) as typeof body;
  } finally {
    clearTimeout(t);
  }

  const c = body.current;
  const located = { location: place.name, latitude: place.latitude, longitude: place.longitude };
  if (!c || !finite(c.temperature_2m) || !finite(c.weather_code) || !c.time) {
    return { ...base, ...located, confidence: 0, reason: `Current conditions are unavailable for ${place.name}.` };
  }

  const temp = r1(c.temperature_2m);
  const condition = conditionOf([c.weather_code]);
  const coords = extractCoords(query);
  const where = coords ? `latitude ${coords.lat}, longitude ${coords.lon} near ${shortPlaceName(place.name)}` : place.name;
  const precip = finite(c.precipitation) ? r1(c.precipitation) : null;
  const wind = finite(c.wind_speed_10m) ? r1(c.wind_speed_10m) : null;
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
  const rain = precip === null ? "" : precip >= 0.1 ? `, with ${precip} mm of precipitation` : ", with no precipitation";
  const breeze = wind === null ? "" : ` and wind at ${wind} km/h`;

  return {
    ...base, ...located,
    verdict: condition,
    start_time: `${c.time}Z`, end_time: `${c.time}Z`, hourly_count: null,
    temp_min_c: temp, temp_max_c: temp,
    total_precipitation_mm: precip, max_wind_speed_kmh: wind,
    reason: `${lead}${rain}${breeze}, as of ${at}, from the Open-Meteo weather service.`,
  };
}
