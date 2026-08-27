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
    assert.match(r.reason, /next 24 hours/);
  });

  test("honours a custom window", async () => {
    const r = await getForecast("Tokyo", 48);
    assert.equal(r.window_hours, 48);
    assert.match(r.reason, /next 48 hours/);
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
