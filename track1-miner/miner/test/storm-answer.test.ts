import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { checkStorm } from "../src/storm";
import { resetMetCache } from "../src/metno";
import { resetGeocodeCache } from "../src/weather-upstream";
import { metBody, isMet, json } from "./weather-fixtures";

beforeEach(() => {
  resetMetCache();
  resetGeocodeCache();
});

/** 72 hourly MET Norway steps from the current UTC hour, every hour the same. */
function series(gust: number, wind: number, symbol: string): unknown {
  return metBody(72, undefined, () => ({ gustKmh: gust, windKmh: wind, dir: 270, symbol }));
}

async function withForecast<T>(body: unknown, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const u = String(input instanceof Request ? input.url : input);
    if (isMet(u)) return json(body);
    throw new Error("offline"); // reverse geocoding: the coordinates stand in for a name
  }) as typeof globalThis.fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test("'is there an active storm alert right now' gets a plain no, without emergency advice", async () => {
  const r = await withForecast(series(14, 5, "clearsky_day"), () =>
    checkStorm("Is there an active storm alert or severe weather warning at 38.72,-9.14 right now?"));
  assert.equal(r.verdict, "none");
  assert.match(r.reason, /^No storm conditions are forecast for .* right now\./);
  assert.match(r.reason, /not an official weather warning/);
  assert.match(r.reason, /Overall risk: 0/);
  assert.doesNotMatch(r.reason, /emergency|Exposed operations|^Regarding/);
});

test("a severe window leads with the grade and adds what exposed operations should do", async () => {
  const r = await withForecast(series(120, 70, "heavyrainandthunder"), () =>
    checkStorm("storm risk at 37.7749,-122.4194 over the next 48 hours"));
  assert.ok(["moderate", "high", "severe"].includes(r.verdict), r.verdict);
  assert.match(r.reason, /^(?:Moderate|High|Severe) storm risk is forecast for .* over the next 48 hours\./);
  assert.match(r.reason, /Exposed operations should secure loose equipment/);
  assert.match(r.reason, /Thunderstorms are forecast\./);
  // A window's precipitation figure is its wettest step, and says so (2026-10-21).
  assert.match(r.reason, /Precipitation: up to [\d.]+ mm in the wettest forecast step\./);
});

test("a question asking what to do leads with the guidance and keeps the forecast", async () => {
  const r = await withForecast(series(14, 5, "clearsky_day"), () =>
    checkStorm("If a storm system is forecasted to bring high winds to the plant at latitude 39.7392, longitude -104.9903 in the next 24 hours, what specific operational adjustments should crews implement to safeguard equipment and personnel?"));
  assert.match(r.reason, /^To prepare for these conditions, secure loose equipment/);
  assert.match(r.reason, /Wind speed:/);
});
