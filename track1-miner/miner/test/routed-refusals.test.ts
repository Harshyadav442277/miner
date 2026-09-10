/**
 * Refusals found by replaying the questions the network actually routes.
 *
 * A refusal scores about 1e-11 where an answer can cross to 1.0, so a question
 * we decline is worth more than any amount of wording work. Every case here is
 * a verbatim routed question that production refused on 2026-09-10, taken from
 * `tools/routed-questions.json` and re-measured with
 * `node tools/replay-intents.mjs`. Each one fails on the previous build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { placeCandidates } from "../src/extract";
import { parseQuery } from "../src/currency";
import { resolvePlace } from "../src/storm";

const LAGOS_FORECAST =
  "What is the 24-hour weather forecast for Lagos Nigeria starting today, " +
  "including temperature, precipitation probability and wind?";
const LAGOS_STORM =
  "Is there an active storm alert or severe weather warning for lagos nigeria right now?";

/**
 * Open-Meteo's gazetteer searches a name, so "Lagos Nigeria" returns nothing
 * where "Lagos, Nigeria" and a bare "Lagos" both resolve. Six routed questions
 * across WEATHER_FORECAST, WEATHER_CHECK and STORM_ALERT arrive without the
 * comma; the candidate list has to supply it.
 */
test("routed refusal: a comma-free city-country question offers a resolvable candidate", () => {
  for (const question of [LAGOS_FORECAST, LAGOS_FORECAST.toLowerCase()]) {
    const candidates = placeCandidates(question).map((c) => c.toLowerCase());
    assert.ok(candidates.includes("lagos, nigeria"), `no comma form for ${JSON.stringify(question.slice(0, 40))}`);
    assert.ok(candidates.includes("lagos"), `no bare city for ${JSON.stringify(question.slice(0, 40))}`);
  }
});

/**
 * The lowercase storm question has no proper noun at all and its place sits
 * before a clause boundary, so the end-anchored locative match saw nothing and
 * the question produced an EMPTY candidate list — refused without one geocoder
 * call being made.
 */
test("routed refusal: an all-lowercase question still yields candidates", () => {
  const candidates = placeCandidates(LAGOS_STORM).map((c) => c.toLowerCase());
  assert.ok(candidates.length > 0, "no candidates at all");
  assert.ok(candidates.includes("lagos, nigeria"));
});

/** The cases the widened forms must not disturb. */
test("routed refusal: places that already resolved still lead their candidate list", () => {
  const houston = placeCandidates(
    "What is the 24-hour weather forecast for Houston, Texas starting today, including temperature and wind?",
  );
  assert.equal(houston[0], "Houston, Texas");

  // A bare "bangalore" resolves to Bangalore Town, Sindh, Pakistan, so peeling
  // the clock time off this question turns an honest refusal into a confident
  // answer about the wrong country. It must still never be offered.
  assert.ok(!placeCandidates("in bangalore tomorrow 9 am").includes("bangalore"));

  // A planet is not a resolvable location, and this is not a weather question.
  assert.ok(!placeCandidates("Which ocean is the deepest point on Earth found in?").includes("Earth"));
});

/**
 * The geocoder is tried once per candidate, and the widened forms make the list
 * longer. A per-candidate budget could therefore spend the route's whole 11 s
 * watchdog on geocoding alone and return a 504, which scores the same as a 400.
 */
test("routed refusal: the candidate sweep shares one deadline instead of one each", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 60));
    return new Response(JSON.stringify({ results: [] }), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const started = Date.now();
    const place = await resolvePlace(LAGOS_FORECAST, 200);
    assert.equal(place, null);
    assert.ok(Date.now() - started < 1_000, "the sweep outran its shared deadline");
    assert.ok(calls >= 1, "no candidate was tried at all");
  } finally {
    globalThis.fetch = original;
  }
});

/**
 * Three of the four routed CURRENCY_EXCHANGE questions name one currency. An
 * unqualified FX quote is against the US dollar, and against the euro when the
 * dollar is the one named.
 */
test("routed refusal: one named currency is quoted against the dollar", () => {
  assert.deepEqual(parseQuery("whats the fx rate of euro?"), { from: "EUR", to: "USD", amount: null });
  assert.deepEqual(parseQuery("what is fx rate of euro"), { from: "EUR", to: "USD", amount: null });
  assert.deepEqual(parseQuery("What is the dollar exchange rate?"), { from: "USD", to: "EUR", amount: null });
});

test("routed refusal: naming both currencies still decides direction, and naming none still refuses", () => {
  assert.deepEqual(parseQuery("What is 100 USD in EUR right now?"), { from: "USD", to: "EUR", amount: 100 });
  assert.deepEqual(parseQuery("How many yen is 1 dollar?"), { from: "USD", to: "JPY", amount: 1 });
  assert.deepEqual(parseQuery("convert 100 dollars to dollars"), { from: "USD", to: "USD", amount: 100 });
  assert.deepEqual(parseQuery("how is the weather"), { from: null, to: null, amount: null });
});
