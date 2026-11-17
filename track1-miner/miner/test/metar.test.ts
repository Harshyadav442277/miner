import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_KM, km, nearest } from "../src/metar";

const NOW = Date.parse("2026-11-17T10:10:00Z");
const at = (iso: string): number => Date.parse(iso) / 1000;
// Shapes as returned by aviationweather.gov on 2026-11-17 for a bbox around London.
const ROWS = [
  { icaoId: "EGWU", name: "Northolt, EN, GB", lat: 51.549, lon: -0.417, temp: 13, obsTime: at("2026-11-17T10:05:00Z") },
  { icaoId: "EGLL", name: "London/Heathrow Intl, EN, GB", lat: 51.477, lon: -0.461, temp: 12, obsTime: at("2026-11-17T09:50:00Z") },
  { icaoId: "EGLC", name: "London City Arpt, EN, GB", lat: 51.505, lon: 0.055, temp: 13, obsTime: at("2026-11-17T10:00:00Z") },
];

test("the nearest fresh station with a temperature is chosen, with its distance", () => {
  const o = nearest(ROWS, 51.507, -0.128, NOW); // central London
  assert.equal(o?.station, "EGLC");
  assert.equal(o?.temp_c, 13);
  assert.equal(o?.name, "London City Arpt");
  assert.equal(o?.observed_at, "2026-11-17T10:00:00.000Z");
  assert.ok(o!.distance_km >= 12 && o!.distance_km <= 14);
});

test("a stale, future-dated, temperature-less or distant report is never used", () => {
  const stale = [{ ...ROWS[2], obsTime: at("2026-11-17T07:59:00Z") }];
  assert.equal(nearest(stale, 51.507, -0.128, NOW), null);
  const future = [{ ...ROWS[2], obsTime: at("2026-11-17T11:00:00Z") }];
  assert.equal(nearest(future, 51.507, -0.128, NOW), null);
  assert.equal(nearest([{ ...ROWS[2], temp: null }], 51.507, -0.128, NOW), null);
  assert.equal(nearest(ROWS, 48.857, 2.352, NOW), null); // Paris: London stations are ~340 km away
  assert.ok(km(51.507, -0.128, 48.857, 2.352) > MAX_KM);
});

test("a body that is not a list of reports gives no observation", () => {
  assert.equal(nearest({ error: "bad" }, 51.5, -0.1, NOW), null);
  assert.equal(nearest(undefined, 51.5, -0.1, NOW), null);
});
