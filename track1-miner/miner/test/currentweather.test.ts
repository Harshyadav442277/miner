import { test } from "node:test";
import assert from "node:assert/strict";
import { asksCurrentConditions, getCurrentConditions } from "../src/currentweather";
import { handleRequest } from "../src/handler";

test("present-tense questions ask for conditions now", () => {
  for (const q of [
    "What is the current temperature in Cairo?",
    "What is the weather in Tokyo right now?",
    "Is it raining in Paris now?",
    "What's the temperature in Lagos currently?",
    "How hot is it in Dubai at the moment?",
  ]) assert.equal(asksCurrentConditions(q), true, q);
});

test("any forward-looking word keeps a question a forecast", () => {
  for (const q of [
    "What is the weather forecast for London over the next 24 hours?",
    "What is the weather now and tomorrow in Berlin?",
    "Current forecast for Chennai for the next three days",
    "Will it rain in Paris now?",
    "What will the temperature be in Cairo in 6 hours?",
    "What is the weather in Tokyo?",
  ]) assert.equal(asksCurrentConditions(q), false, q);
  // \bnow\b must not fire inside another word (the G103 class: test a near miss).
  assert.equal(asksCurrentConditions("How much snow fell in Oslo?"), false);
  assert.equal(asksCurrentConditions("Do you know the weather in Oslo?"), false);
});

/**
 * The production answer on 2026-09-13: "What is the current temperature in
 * Cairo?" got "A 24-hour hourly weather forecast for Cairo ... from 22.8°C to
 * 36.5°C". True numbers, and none of them the current temperature.
 */
test("a current-temperature question leads with a current reading (live)", async () => {
  let r;
  try { r = await getCurrentConditions("What is the current temperature in Cairo?"); }
  catch { return; } // Open-Meteo outage: the route reports it as one.
  if (r.verdict === "unknown") return;
  assert.match(r.reason, /^The current temperature in Cairo[^.]* is -?\d+(?:\.\d)?°C/);
  assert.doesNotMatch(r.reason, /24-hour|hourly weather forecast|from -?\d+(?:\.\d)?°C to/);
  assert.match(r.reason, /as of \d{2}:\d{2} UTC on \d{4}-\d{2}-\d{2}/);
  assert.equal(r.temp_min_c, r.temp_max_c);
});

test("a weather-now question names the condition first (live)", async () => {
  let r;
  try { r = await getCurrentConditions("What is the weather in Tokyo right now?"); }
  catch { return; }
  if (r.verdict === "unknown") return;
  assert.match(r.reason, /^The current weather in Tokyo[^.]* is [a-z ]+ at -?\d+(?:\.\d)?°C/);
});

/** Through the real route, so the dispatch itself is covered, not only the module. */
function call(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve) => {
    let raw = "";
    const res = {
      statusCode: 200,
      setHeader() {}, getHeader() { return undefined; }, writeHead(s: number) { this.statusCode = s; return this; },
      write(c: string) { raw += c; return true; },
      end(c?: string) { if (c) raw += c; resolve({ status: this.statusCode, body: JSON.parse(raw || "{}") }); },
      on() { return this; }, once() { return this; },
      headersSent: false,
    };
    handleRequest({ method: "GET", url: path, headers: { host: "localhost" } } as never, res as never);
  });
}

test("the route sends a present-tense question to the current reading (live)", async () => {
  const { status, body } = await call("/weather-forecast?query=What%20is%20the%20current%20temperature%20in%20Cairo%3F");
  assert.equal(status, 200);
  if (body.error) return; // upstream outage, honestly reported
  assert.match(String(body.reason), /^The current temperature in Cairo/);
});

test("a forecast question still gets the forecast (live)", async () => {
  const { status, body } = await call("/weather-forecast?query=What%20is%20the%20weather%20forecast%20for%20London%20over%20the%20next%2024%20hours%3F");
  assert.equal(status, 200);
  if (body.error) return;
  assert.match(String(body.reason), /hourly weather forecast for London/);
});
