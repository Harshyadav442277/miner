import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { coord, conditionOfSymbols, isThunder, metForecast, parseMet, resetMetCache, stepAt, stepsFrom } from "../src/metno";

/**
 * Steps of the live London forecast, api.met.no/weatherapi/locationforecast/2.0/complete,
 * fetched 2026-10-18 07:35 UTC (trimmed to the fields read). The 23:00 step carries only a
 * 1-hour block and the 00:00 step only a 6-hour block: the hourly-to-6-hourly boundary.
 */
const FIRST = [
  { time: "2026-10-18T07:00:00Z", data: { instant: { details: { air_temperature: 8, wind_speed: 4.3, wind_from_direction: 2.9 } }, next_1_hours: { summary: { symbol_code: "clearsky_day" }, details: { precipitation_amount: 0 } }, next_6_hours: { summary: { symbol_code: "fair_day" }, details: { air_temperature_max: 14.4, air_temperature_min: 8.9, precipitation_amount: 0 } } } },
  { time: "2026-10-18T08:00:00Z", data: { instant: { details: { air_temperature: 8.9, wind_speed: 3.5, wind_from_direction: 4.2 } }, next_1_hours: { summary: { symbol_code: "clearsky_day" }, details: { precipitation_amount: 0 } }, next_6_hours: { summary: { symbol_code: "fair_day" }, details: { air_temperature_max: 14.4, air_temperature_min: 10.1, precipitation_amount: 0 } } } },
];
const BOUNDARY = [
  { time: "2026-10-20T23:00:00Z", data: { instant: { details: { air_temperature: 9.7, wind_speed: 4.2, wind_from_direction: 241.3 } }, next_1_hours: { summary: { symbol_code: "clearsky_night" }, details: { precipitation_amount: 0 } } } },
  { time: "2026-10-21T00:00:00Z", data: { instant: { details: { air_temperature: 8.9, wind_speed: 2.9, wind_from_direction: 237.9 } }, next_6_hours: { summary: { symbol_code: "lightrain" }, details: { air_temperature_max: 11.6, air_temperature_min: 8.4, precipitation_amount: 0.9 } } } },
  { time: "2026-10-21T06:00:00Z", data: { instant: { details: { air_temperature: 8.4, wind_speed: 1.8, wind_from_direction: 241.1 } }, next_6_hours: { summary: { symbol_code: "clearsky_day" }, details: { air_temperature_max: 14.6, air_temperature_min: 8, precipitation_amount: 0 } } } },
];
const feature = (timeseries: unknown[]) => ({ type: "Feature", properties: { timeseries } });

describe("parseMet", () => {
  test("converts wind from m/s and keeps the hourly block for an hourly step", () => {
    const [s0] = parseMet(feature(FIRST));
    assert.equal(s0?.time, "2026-10-18T07:00");
    assert.equal(s0?.hours, 1);
    assert.equal(s0?.wind_kmh, 15.5); // 4.3 m/s
    assert.equal(s0?.symbol, "clearsky_day", "the 1-hour symbol, not the 6-hour one");
    assert.equal(s0?.temp_min_c, 8);
  });

  test("switches to the 6-hour block where the steps become 6-hourly", () => {
    const [last1h, first6h] = parseMet(feature(BOUNDARY));
    assert.equal(last1h?.hours, 1);
    assert.equal(last1h?.precip_mm, 0);
    assert.equal(first6h?.hours, 6);
    assert.equal(first6h?.precip_mm, 0.9);
    assert.equal(first6h?.symbol, "lightrain");
    assert.equal(first6h?.temp_min_c, 8.4);
    assert.equal(first6h?.temp_max_c, 11.6);
  });

  test("gusts and precipitation probability absent are null, never zero", () => {
    const [s0] = parseMet(feature(FIRST));
    assert.equal(s0?.gust_kmh, null);
    assert.equal(s0?.precip_prob_pct, null);
  });

  test("an unexpected body is an empty series, not a crash", () => {
    assert.deepEqual(parseMet({}), []);
    assert.deepEqual(parseMet(null), []);
  });
});

describe("step selection", () => {
  const steps = parseMet(feature(BOUNDARY));
  test("a moment inside a 6-hour step is found in that step", () => {
    assert.equal(stepAt(steps, Date.parse("2026-10-21T03:30:00Z")), 1);
    assert.equal(stepAt(steps, Date.parse("2026-10-22T00:00:00Z")), -1);
  });
  test("covers the hours asked for and stops at a step missing what the answer needs", () => {
    const all = stepsFrom(steps, Date.parse("2026-10-20T23:00:00Z"), 7, () => true);
    assert.deepEqual(all.map((s) => s.hours), [1, 6]);
    const stopped = stepsFrom(steps, Date.parse("2026-10-20T23:00:00Z"), 24, (s) => s.symbol !== "lightrain");
    assert.equal(stopped.length, 1);
  });
});

describe("terms of use", () => {
  beforeEach(() => resetMetCache());

  test("coordinates are truncated to four decimals, as MET Norway requires", () => {
    assert.equal(coord(13.08279), 13.0827);
    assert.equal(coord(-74.00609), -74.006);
  });

  test("the request carries at most four decimals and an identifying User-Agent", async () => {
    const seen: Array<{ url: string; ua: string }> = [];
    const impl = (async (url: string, init?: RequestInit) => {
      seen.push({ url, ua: String((init?.headers as Record<string, string>)?.["user-agent"] ?? "") });
      return new Response(JSON.stringify(feature(FIRST)), { status: 200 });
    }) as unknown as typeof fetch;
    await metForecast(51.507219, -0.127586, 500, impl);
    assert.match(seen[0]!.url, /lat=51\.5072&lon=-0\.1275$/);
    assert.match(seen[0]!.ua, /livecert.*https:\/\//);
  });

  test("a forecast is not asked for again before it expires", async () => {
    let calls = 0;
    const impl = (async () => {
      calls++;
      return new Response(JSON.stringify(feature(FIRST)), { status: 200, headers: { expires: new Date(Date.now() + 600_000).toUTCString() } });
    }) as unknown as typeof fetch;
    await metForecast(51.5072, -0.1276, 500, impl);
    await metForecast(51.5072, -0.1276, 500, impl);
    assert.equal(calls, 1);
  });
});

describe("conditions", () => {
  test("the worst weather in the window names it", () => {
    assert.equal(conditionOfSymbols(["clearsky_day", "lightrain", "cloudy"]), "light rain");
    assert.equal(conditionOfSymbols(["rainshowersandthunder_day", "heavyrain"]), "thunderstorms");
    assert.equal(conditionOfSymbols(["lightsleet"]), "snow");
    assert.equal(conditionOfSymbols(["fair_night"]), "mostly clear");
    assert.equal(conditionOfSymbols(["partlycloudy_polartwilight"]), "cloudy");
    assert.equal(conditionOfSymbols([null]), "clear");
  });
  test("thunder is read from the symbol", () => {
    assert.equal(isThunder("heavyrainandthunder"), true);
    assert.equal(isThunder("heavyrain"), false);
    assert.equal(isThunder(null), false);
  });
});
