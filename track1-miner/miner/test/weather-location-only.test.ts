/**
 * WEATHER_CHECK_TEMPERATURE's whole request is `location` (GET /engine/v1/intents/WEATHER_CHECK_TEMPERATURE,
 * read 2026-11-08 UTC). Sent alone, it was answered with a 24-hour range, so temperature_c was null.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resetMetCache } from "../src/metno";
import { resetGeocodeCache } from "../src/weather-upstream";
import { hourStart, metBody, nominatimHit, isMet, json } from "./weather-fixtures";

async function withStub(run: () => Promise<void>): Promise<void> {
  resetMetCache();
  resetGeocodeCache();
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    const href = String(url);
    if (isMet(href)) return json(metBody(48, hourStart(), (i) => (i === 0 ? { temp: 23.4 } : {})));
    return json(nominatimHit(new URL(href).searchParams.get("q") ?? "", 6.45, 3.39));
  }) as typeof fetch;
  try { await run(); } finally { globalThis.fetch = original; }
}

function request(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url: `${path}?${new URLSearchParams(params)}` } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

test("a location and nothing else is the temperature now", async () => {
  await withStub(async () => {
    const now = await request("/weather-forecast", { location: "Lagos" });
    assert.equal(now.window_hours, 0);
    assert.equal(now.temperature_c, 23.4);
    const range = await request("/weather-forecast", { location: "Ibadan", hours: "24" });
    assert.equal(range.window_hours, 24, "a window still asks for a forecast");
    assert.equal(range.temperature_c, null);
    const forecast = await request("/weather-forecast", { location: "Abuja", query: "Weather forecast for Abuja" });
    assert.notEqual(forecast.window_hours, 0, "a forecast question with no window is still a forecast");
  });
});
