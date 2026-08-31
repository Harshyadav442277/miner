import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getForecast } from "../src/forecast";

describe("getForecast (live)", () => {
  test("returns a plain-word condition and a temperature range", async () => {
    const r = await getForecast("London", 24);
    assert.ok(r.verdict && r.verdict !== "unknown", `got ${r.verdict}`);
    assert.ok(r.temp_min_c !== null && r.temp_max_c !== null);
    assert.ok(r.temp_max_c >= r.temp_min_c, "max should not be below min");
    assert.equal(r.window_hours, 24);
    assert.match(r.reason, /A 24-hour hourly weather forecast/);
    assert.match(r.reason, /temperature in Celsius/);
  });

  // hours=0 is the current hour, which is what our input_schema promises and what
  // a WEATHER_CHECK question asks for. A falsy-zero `||` in the route used to turn
  // it into the 24-hour default, so "what is it right now" got a day-long range.
  test("hours=0 collapses to the current hour, not the 24-hour default", async () => {
    const r = await getForecast("Tokyo", 0);
    assert.equal(r.window_hours, 1);
    assert.match(r.reason, /A 1-hour hourly weather forecast/);
    assert.doesNotMatch(r.reason, /24-hour/);
  });

  test("honours a custom window, stating both day and hour forms", async () => {
    const r = await getForecast("Tokyo", 48);
    assert.equal(r.window_hours, 48);
    assert.match(r.reason, /A 2-day \(48-hour\) hourly weather forecast/);
  });

  test("echoes a day-count request in day form, with precipitation probability", async () => {
    const r = await getForecast("Tokyo", 168, undefined, 7);
    assert.equal(r.window_hours, 168);
    assert.equal(r.hourly_count, 168);
    assert.equal(r.span_days, 7);
    assert.match(r.reason, /A 7-day \(168-hour\) hourly weather forecast/);
    if (r.precipitation_probability_max_pct !== null) {
      assert.match(r.reason, /precipitation probability of up to \d+%/);
      assert.ok(r.precipitation_probability_max_pct >= 0 && r.precipitation_probability_max_pct <= 100);
    }
  });

  test("clamps an absurd window rather than failing", async () => {
    const r = await getForecast("Paris", 100000);
    assert.equal(r.window_hours, 168);
  });

  test("an unresolvable place is 'unknown', not a crash", async () => {
    const r = await getForecast("Nowhereville XYZ123 QQQ", 24);
    assert.equal(r.verdict, "unknown");
    assert.match(r.reason, /No resolvable location/);
  });

  test("precipitation_hours never exceeds the window", async () => {
    const r = await getForecast("Mumbai", 24);
    assert.ok(r.precipitation_hours !== null && r.precipitation_hours <= 24);
  });
});
