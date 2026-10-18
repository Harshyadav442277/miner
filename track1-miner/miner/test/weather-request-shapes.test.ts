/**
 * WEATHER_CHECK request shapes — the engine's placeholder values.
 *
 * The node builds our query string with an LLM, so a declared parameter it
 * cannot fill does not always arrive empty; sometimes it arrives as the word
 * "unknown". `firstValue` treats an empty string as absent and had no way to
 * treat that the same, so the placeholder was appended to the question and
 * geocoded. Verified against https://miner-wine.vercel.app on 2026-09-19, both
 * with `query=What is the current weather in Cairo?` alongside:
 *
 *   location=unknown  -> "The current weather in الجندي المجهول, 11759, مصر"
 *   location=N/A      -> "The current weather in Cairo, North Carolina, United States"
 *
 * Neither is the city the question named. This is the WEATHER_CHECK form of the
 * `chain=unknown` refusal ONCHAIN_TX_LOOKUP was losing 47 epochs to.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resetMetCache } from "../src/metno";
import { resetGeocodeCache } from "../src/weather-upstream";
import { hourStart, metBody, nominatimHit, isMet, json } from "./weather-fixtures";

/**
 * The geocoder answers with whatever name it was asked for, so the place the
 * answer names is exactly the string the route decided to look up. That is the
 * thing under test.
 */
function stub(): typeof fetch {
  return (async (url: string | URL | Request) => {
    const href = String(url);
    if (isMet(href)) return json(metBody(48, hourStart(), (i) => (i === 0 ? { temp: 23.4, windKmh: 3.6 } : {})));
    const name = new URL(href).searchParams.get("q") ?? "";
    return json(nominatimHit(name, 30.04, 31.23));
  }) as typeof fetch;
}

async function withStub(run: () => Promise<void>): Promise<void> {
  resetMetCache();
  resetGeocodeCache();
  const original = globalThis.fetch;
  globalThis.fetch = stub();
  try { await run(); } finally { globalThis.fetch = original; }
}

function request(params: Record<string, string>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url: `/weather-forecast?${new URLSearchParams(params)}` } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

const QUESTION = "What is the current weather in Cairo?";

test("a placeholder location cannot displace the city the question names", async () => {
  await withStub(async () => {
    // What the same question answers with no `location` at all. A placeholder
    // must not change it by one character.
    const baseline = String((await request({ query: QUESTION })).reason);
    assert.match(baseline, /Cairo/);
    for (const placeholder of ["unknown", "N/A", "none", "null", "undefined", "string", "not specified", "-", "?"]) {
      const body = await request({ location: placeholder, query: QUESTION });
      assert.equal(String(body.reason), baseline, `location=${placeholder} changed the subject`);
    }
  });
});

test("a real location is still read, including one that merely contains a placeholder word", async () => {
  await withStub(async () => {
    const plain = await request({ location: "Cairo", query: QUESTION });
    assert.match(String(plain.reason), /Cairo/);
    // "Unknown" is a real place in Indiana; only an exact match is dropped.
    const contains = await request({ location: "Unknown, Indiana", query: QUESTION });
    assert.match(String(contains.reason), /Unknown, Indiana/);
  });
});

test("a placeholder with no question left is still refused rather than geocoded", async () => {
  await withStub(async () => {
    const body = await request({ location: "unknown" });
    assert.equal(body.verdict, "unknown");
    assert.equal(body.error, "invalid_location");
  });
});
