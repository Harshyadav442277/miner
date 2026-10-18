import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { checkStorm } from "../src/storm";
import { getForecast } from "../src/forecast";
import { handleRequest } from "../src/handler";
import { resetMetCache } from "../src/metno";
import { resetGeocodeCache } from "../src/weather-upstream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { HOUR, hourStart, stamp, metBody, nominatimHit, nominatimReverse, isMet, isNominatimReverse, json, type FixtureHour } from "./weather-fixtures";

const start = hourStart();

beforeEach(() => {
  resetMetCache();
  resetGeocodeCache();
});

async function withWeather(body: unknown, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    const u = String(url);
    if (isMet(u)) return json(body);
    if (isNominatimReverse(u)) return json(nominatimReverse("Test City"));
    return json(nominatimHit("Test City", 13, 80));
  }) as typeof fetch;
  try { await run(); } finally { globalThis.fetch = original; }
}
const series = (count = 180, origin = start, hour?: (i: number) => FixtureHour) => metBody(count, origin, hour);

function request(params: Record<string, string>): Promise<Record<string, any>> {
  return new Promise(resolve => {
    const req = { method: "GET", url: `/storm-alert?${new URLSearchParams(params)}` } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}
/**
 * hours=0 is a current READING (currentweather.ts), not the forecast for the current hour: "What is
 * the current temperature in Cairo?" was once answered with a 24-hour range on production. This
 * pins it offline, through the route, against the step MET Norway gives for the present hour.
 */
test("weather hours zero is answered from the current reading, not a forecast slot", async () => {
  await withWeather(series(48, start, (i) => (i === 0 ? { temp: 27.4, symbol: "cloudy", windKmh: 9.2 } : {})), async () => {
    const body = await new Promise<Record<string, any>>(resolve => {
      const req = { method: "GET", url: `/weather-forecast?${new URLSearchParams({ location: "13,80", hours: "0" })}` } as IncomingMessage;
      const res = { writeHead() {}, end(b: string) { resolve(JSON.parse(b)); } } as unknown as ServerResponse;
      handleRequest(req, res);
    });
    assert.equal(body.verdict, "cloudy");
    assert.match(body.reason, /is cloudy at 27\.4°C/);
    assert.match(body.reason, new RegExp(`as of ${stamp(start).slice(11, 16)} UTC`));
    assert.match(body.reason, /MET Norway \(CC BY 4\.0\)/);
    assert.doesNotMatch(body.reason, /hourly weather forecast/);
  });
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
  // Sustained wind is what the storm grade is computed from, so it is the value whose absence
  // must not read as calm.
  await withWeather(series(180, start, () => ({ temp: null, windKmh: null })), async () => {
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
