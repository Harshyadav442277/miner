import { test } from "node:test";
import assert from "node:assert/strict";
import { checkStorm } from "../src/storm";

/** A 72-hour Open-Meteo series from the current UTC hour, every hour the same. */
function series(gust: number, wind: number, code: number): unknown {
  const start = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const n = 72;
  const time = Array.from({ length: n }, (_, i) => new Date(start + i * 3_600_000).toISOString().slice(0, 16));
  const fill = (v: number) => Array.from({ length: n }, () => v);
  return { hourly: { time, wind_gusts_10m: fill(gust), wind_speed_10m: fill(wind), wind_direction_10m: fill(270), precipitation: fill(0), weather_code: fill(code) } };
}

async function withForecast<T>(body: unknown, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const u = String(input instanceof Request ? input.url : input);
    if (u.includes("/forecast")) return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    throw new Error("offline"); // reverse geocoding: the coordinates stand in for a name
  }) as typeof globalThis.fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test("'is there an active storm alert right now' gets a plain no, without emergency advice", async () => {
  const r = await withForecast(series(14, 5, 0), () =>
    checkStorm("Is there an active storm alert or severe weather warning at 38.72,-9.14 right now?"));
  assert.equal(r.verdict, "none");
  assert.match(r.reason, /^No storm conditions are forecast for .* right now\./);
  assert.match(r.reason, /not an official weather warning/);
  assert.match(r.reason, /Overall risk: 0/);
  assert.doesNotMatch(r.reason, /emergency|Exposed operations|^Regarding/);
});

test("a severe window leads with the grade and adds what exposed operations should do", async () => {
  const r = await withForecast(series(120, 70, 95), () =>
    checkStorm("storm risk at 37.7749,-122.4194 over the next 48 hours"));
  assert.ok(["moderate", "high", "severe"].includes(r.verdict), r.verdict);
  assert.match(r.reason, /^(?:Moderate|High|Severe) storm risk is forecast for .* over the next 48 hours\./);
  assert.match(r.reason, /Exposed operations should secure loose equipment/);
  assert.match(r.reason, /Thunderstorms are forecast\./);
});

test("a question asking what to do leads with the guidance and keeps the forecast", async () => {
  const r = await withForecast(series(14, 5, 0), () =>
    checkStorm("If a storm system is forecasted to bring high winds to the plant at latitude 39.7392, longitude -104.9903 in the next 24 hours, what specific operational adjustments should crews implement to safeguard equipment and personnel?"));
  assert.match(r.reason, /^To prepare for these conditions, secure loose equipment/);
  assert.match(r.reason, /Wind speed:/);
});
