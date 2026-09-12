import { test } from "node:test";
import assert from "node:assert/strict";
import { checkStorm } from "../src/storm";
import { getForecast } from "../src/forecast";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";

const HOUR = 3_600_000;
const start = Math.floor(Date.now() / HOUR) * HOUR;
const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 16);
function series(count = 180, origin = start): Record<string, any> {
  return { time: Array.from({ length: count }, (_, i) => stamp(origin + i * HOUR)),
    temperature_2m: Array.from({ length: count }, (_, i) => 20 + i),
    wind_speed_10m: Array(count).fill(10), wind_gusts_10m: Array(count).fill(15),
    wind_direction_10m: Array(count).fill(90), precipitation: Array(count).fill(0),
    precipitation_probability: Array(count).fill(0), weather_code: Array(count).fill(0) };
}
async function withWeather(hourly: Record<string, any>, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async url => new Response(JSON.stringify(String(url).includes("/v1/forecast")
    ? { hourly } : { city: "Test City", results: [{ name: "Test City", latitude: 13, longitude: 80 }] }))) as typeof fetch;
  try { await run(); } finally { globalThis.fetch = original; }
}
function request(params: Record<string, string>): Promise<Record<string, any>> {
  return new Promise(resolve => {
    const req = { method: "GET", url: `/storm-alert?${new URLSearchParams(params)}` } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}
/**
 * hours=0 used to be answered here, by getForecast, as the forecast for the
 * current hour. It is now a current READING from Open-Meteo's `current` block
 * (currentweather.ts), because a forecast slot is not what "right now" asks for:
 * "What is the current temperature in Cairo?" was being answered with a 24-hour
 * range on production. This pins the replacement offline, through the route.
 */
test("weather hours zero is answered from the current reading, not a forecast slot", async () => {
  const original = globalThis.fetch;
  const current = { time: stamp(start), temperature_2m: 27.4, precipitation: 0, weather_code: 3, wind_speed_10m: 9.2 };
  globalThis.fetch = (async (url: string | URL | Request) => new Response(JSON.stringify(String(url).includes("/v1/forecast")
    ? { current } : { city: "Test City", results: [{ name: "Test City", latitude: 13, longitude: 80 }] }))) as typeof fetch;
  try {
    const body = await new Promise<Record<string, any>>(resolve => {
      const req = { method: "GET", url: `/weather-forecast?${new URLSearchParams({ location: "13,80", hours: "0" })}` } as IncomingMessage;
      const res = { writeHead() {}, end(b: string) { resolve(JSON.parse(b)); } } as unknown as ServerResponse;
      handleRequest(req, res);
    });
    assert.equal(body.verdict, "cloudy");
    assert.match(body.reason, /is cloudy at 27\.4°C/);
    assert.match(body.reason, new RegExp(`as of ${stamp(start).slice(11, 16)} UTC`));
    assert.doesNotMatch(body.reason, /hourly weather forecast/);
  } finally {
    globalThis.fetch = original;
  }
});

test("a forecast window is still a forecast", async () => {
  await withWeather(series(), async () => {
    const r = await getForecast("13,80", 24);
    assert.equal(r.window_hours, 24);
    assert.match(r.reason, /A 24-hour hourly weather forecast/);
  });
});
test("storm right now describes the current hourly interval", async () => {
  await withWeather(series(), async () => {
    const r = await checkStorm("storm risk at 13,80 right now");
    assert.equal(r.valid_at, stamp(start));
  });
});
test("storm explicit zero selects a point even when the question names a future span", async () => {
  await withWeather(series(), async () => {
    const r = await checkStorm("storm risk at 13,80 over the next 48 hours", undefined, 0);
    assert.equal(r.valid_at, stamp(start));
    assert.equal(r.peak_at, null);
  });
});
test("stale weather and storm arrays cannot support a current forecast", async () => {
  await withWeather(series(24, start - 72 * HOUR), async () => {
    assert.equal((await getForecast("13,80")).verdict, "unknown");
    assert.equal((await checkStorm("13,80")).verdict, "unknown");
  });
});
test("a future storm point beyond supplied data is not replaced by the last available hour", async () => {
  await withWeather(series(3), async () => {
    assert.equal((await checkStorm("storm risk at 13,80 in 12 hours")).verdict, "unknown");
  });
});
test("missing weather values cannot become zero temperature or no storm", async () => {
  const h = series();
  h.temperature_2m.fill(null); h.wind_gusts_10m.fill(null);
  await withWeather(h, async () => {
    assert.equal((await getForecast("13,80")).verdict, "unknown");
    assert.equal((await checkStorm("13,80")).verdict, "unknown");
  });
});
test("storm cache distinguishes days and forecast_hours aliases", async () => {
  await withWeather(series(), async () => {
    const one = await request({ location: "Cache City", days: "1" });
    const two = await request({ location: "Cache City", days: "2" });
    const six = await request({ location: "Cache City", forecast_hours: "6" });
    assert.match(one.reason, /next 24 hours/);
    assert.match(two.reason, /next 48 hours/);
    assert.match(six.reason, /next 6 hours/);
  });
});
test("storm handler preserves an explicit zero parameter", async () => {
  await withWeather(series(), async () => {
    const r = await request({ location: "Zero City", hours: "0" });
    assert.match(r.reason, /right now/);
  });
});
