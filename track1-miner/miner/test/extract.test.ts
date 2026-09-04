import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sourceText, targetLanguage } from "../src/translate";
import { dateWindow, searchTopic } from "../src/papers";
import { extractHostname, placeCandidates, extractWindThreshold, toKmh, asksForKnots, extractCoords } from "../src/extract";
import { normalizeTarget } from "../src/ssl";

/**
 * These cover the failure mode that matters most competitively: Telegraph's
 * engine classifies a natural-language question and may hand the miner the raw
 * sentence. Answering HTTP 400 to a question we could obviously answer scores
 * zero, so free-text input must resolve — without loosening the parser enough
 * to salvage nonsense from a typo.
 */

describe("extractHostname", () => {
  test("finds a hostname inside a question", () => {
    assert.equal(
      extractHostname("Is the SSL certificate for expired.badssl.com valid?"),
      "expired.badssl.com",
    );
  });

  test("finds a hostname inside a URL in a sentence", () => {
    assert.equal(extractHostname("Is https://github.com secure?"), "github.com");
  });

  test("ignores a two-token fragment — that is a typo, not prose", () => {
    assert.equal(extractHostname("exa mple.com"), null);
  });

  test("does not mistake a version number for a host", () => {
    assert.equal(extractHostname("we shipped version 1.2.3 today"), null);
  });

  test("returns null when there is no host at all", () => {
    assert.equal(extractHostname("there is nothing here to find"), null);
  });
});

describe("normalizeTarget with free text", () => {
  const resolves: [string, string][] = [
    ["check ssl for github.com", "github.com"],
    ["Is the SSL certificate for expired.badssl.com valid?", "expired.badssl.com"],
    ["Is https://github.com secure?", "github.com"],
  ];
  for (const [input, host] of resolves) {
    test(`resolves ${JSON.stringify(input)}`, () => {
      assert.equal(normalizeTarget(input)?.host, host);
    });
  }

  // Clean input must keep its exact previous behaviour.
  for (const bad of ["", "   ", "not a domain", "example", "http://", "exa mple.com", "-.com"]) {
    test(`still rejects ${JSON.stringify(bad)}`, () => {
      assert.equal(normalizeTarget(bad), null);
    });
  }
});

describe("placeCandidates", () => {
  test("extracts a city from a question", () => {
    assert.ok(placeCandidates("Will there be a storm in Chennai in the next 48 hours?").includes("Chennai"));
  });

  test("extracts a multi-word city", () => {
    assert.ok(placeCandidates("storm risk for New York City today").includes("New York City"));
  });

  test("passes a bare place through unchanged", () => {
    assert.deepEqual(placeCandidates("Chennai"), ["Chennai"]);
  });

  test("passes lat,lon through untouched", () => {
    assert.deepEqual(placeCandidates("13.08,80.27"), ["13.08,80.27"]);
  });

  test("tries extracted candidates before the raw sentence — latency is scored", () => {
    const c = placeCandidates("Will there be a storm in Chennai in the next 48 hours?");
    assert.ok(c.indexOf("Chennai") < c.indexOf("Will there be a storm in Chennai in the next 48 hours?"));
  });
});

describe("wind thresholds", () => {
  test("reads an operational limit from a question", () => {
    assert.deepEqual(
      extractWindThreshold("flag any periods with sustained winds above 25 knots"),
      { value: 25, unit: "knots" },
    );
  });

  test("returns null when no limit is named", () => {
    assert.equal(extractWindThreshold("what is the wind speed"), null);
  });

  // The direction is easy to invert, and inverting it produced an answer claiming
  // 13.2-knot winds exceeded a 25-knot limit. A confident falsehood is worse than
  // no answer, so this is pinned.
  test("converts a threshold TO km/h, not from it", () => {
    assert.ok(Math.abs(toKmh(25, "knots") - 46.3) < 0.1);
    assert.ok(Math.abs(toKmh(30, "mph") - 48.28) < 0.1);
    assert.ok(Math.abs(toKmh(10, "ms") - 36) < 0.1);
    assert.equal(toKmh(40, "kmh"), 40);
  });

  test("detects that a question wants knots", () => {
    assert.equal(asksForKnots("winds above 25 knots"), true);
    assert.equal(asksForKnots("winds above 25 km/h"), false);
  });
});

describe("hemisphere coordinates", () => {
  // A real paid question wrote "39.6438° N, 104.8669° W" and we resolved nothing.
  test("reads degree-and-hemisphere notation", () => {
    assert.deepEqual(
      extractCoords("Cherry Creek Reservoir in Denver, Colorado (39.6438\u00b0 N, 104.8669\u00b0 W)"),
      { lat: 39.6438, lon: -104.8669 },
    );
  });

  // W is negative. Reading it as positive answers for China instead of Colorado.
  test("west and south are negative", () => {
    assert.equal(extractCoords("10\u00b0 S, 20\u00b0 W")?.lat, -10);
    assert.equal(extractCoords("10\u00b0 S, 20\u00b0 W")?.lon, -20);
  });

  test("east and north stay positive", () => {
    assert.deepEqual(extractCoords("35.6897\u00b0 N, 139.6922\u00b0 E"), { lat: 35.6897, lon: 139.6922 });
  });

  test("plain pairs still work", () => {
    assert.deepEqual(extractCoords("40.7128,-74.0060"), { lat: 40.7128, lon: -74.006 });
  });
});

describe("time words are not places", () => {
  // "next Monday" geocoded to Munday, a real town, and produced a confident
  // forecast for the wrong continent while the question named New York City.
  test("a weekday does not become the location", () => {
    const c = placeCandidates(
      "7-day weather forecast with hourly temperature and precipitation details for New York City starting next Monday",
    );
    assert.ok(c.includes("New York City"));
    assert.ok(!c.some((x) => /monday/i.test(x)));
  });

  test("a month name does not become the location", () => {
    const c = placeCandidates("forecast for Chennai starting September 1");
    assert.ok(!c.some((x) => x.trim().toLowerCase() === "september"));
  });

  test("relative days do not become the location", () => {
    const c = placeCandidates("storm risk in Chennai tomorrow");
    assert.ok(c.includes("Chennai"));
    assert.ok(!c.some((x) => x.trim().toLowerCase() === "tomorrow"));
  });
});

describe("translation", () => {
  test("reads the quoted text and the target language", () => {
    const q = 'Translate "See you tomorrow morning." into Russian.';
    assert.equal(sourceText(q), "See you tomorrow morning.");
    assert.equal(targetLanguage(q)?.code, "ru");
  });

  test("handles a two-word language name", () => {
    assert.equal(targetLanguage('Translate "Hello" into Mandarin Chinese.')?.code, "zh-CN");
  });

  test("returns null when no language is named", () => {
    assert.equal(targetLanguage('Translate "Hello" please.'), null);
  });
});

describe("academic search parsing", () => {
  test("reads a month-range window", () => {
    const w = dateWindow("published between January 2023 and June 2026 that discuss blockchain");
    assert.equal(w.from, "2023-01-01");
    assert.equal(w.to, "2026-06-30");
  });

  test("reads a bare year", () => {
    assert.equal(dateWindow("all papers published in 2024 that discuss X").from, "2024-01-01");
  });

  test("strips the search scaffolding from the topic", () => {
    assert.equal(
      searchTopic("Find all papers published in 2024 that discuss machine learning applications in renewable energy systems, returning the paper title"),
      "machine learning applications in renewable energy systems",
    );
  });

  test("a bare topic with no scaffolding is the topic", () => {
    assert.equal(searchTopic("zero knowledge proofs"), "zero knowledge proofs");
  });

  test("a date clause is not part of the topic", () => {
    assert.equal(
      searchTopic("What are the most cited papers about transformer models published since 2023?"),
      "transformer models",
    );
  });

  test("scaffolding words are stripped when no pattern matches", () => {
    assert.equal(
      searchTopic("Find recent peer-reviewed papers quantum error correction"),
      "recent quantum error correction",
    );
  });

  test("reads a since-year window as open-ended", () => {
    const w = dateWindow("papers about transformer models published since 2023");
    assert.equal(w.from, "2023-01-01");
    assert.equal(w.to, null);
  });

  test("reads a bare year pair", () => {
    const w = dateWindow("research between 2019 and 2022 on batteries");
    assert.equal(w.from, "2019-01-01");
    assert.equal(w.to, "2022-12-31");
  });
});

/**
 * Every question here was routed to WEATHER_CHECK by Telegraph's own Daemon and
 * refused by this miner with `verdict: unknown`. They are 14 of the 50 distinct
 * WEATHER_CHECK questions in the explorer's routed feed, plus the greeting and
 * misspelling shapes. Two causes, both in candidate extraction rather than in the
 * geocoder: a proper-noun run is matched greedily, so "Will Riyadh …" yielded the
 * single run "Will Riyadh" and the stop-word filter — which compares whole runs —
 * kept it; and a lowercase place after a preposition was never a candidate at all.
 */
describe("places the Daemon actually routes", () => {
  test("a Will-<City> question yields the city", () => {
    for (const [q, city] of [
      ["Will Riyadh issue heat warning?", "Riyadh"],
      ["Will Dubai experience extreme heat today?", "Dubai"],
      ["Will Tehran experience extreme heat over 40°C?", "Tehran"],
    ] as const) {
      assert.ok(placeCandidates(q).includes(city), `${q} -> ${JSON.stringify(placeCandidates(q))}`);
    }
  });

  test("a lowercase place after a preposition is a candidate", () => {
    for (const [q, city] of [
      ["hows weather in lahore", "lahore"],
      ["hows weather in vehari", "vehari"],
      ["HI whats the weather in lahore?", "lahore"],
      ["Whast the weather in gujranwala>?", "gujranwala"],
    ] as const) {
      assert.ok(placeCandidates(q).includes(city), `${q} -> ${JSON.stringify(placeCandidates(q))}`);
    }
  });

  test("a measurement is not offered as a place", () => {
    assert.ok(!placeCandidates("Will Tehran experience extreme heat over 40°C?").some((c) => /^\d/.test(c)));
  });

  test("questions that name no place still yield none", () => {
    // Answering these with weather somewhere is the confidently-wrong failure
    // this miner refuses; "Earth" used to geocode and be answered.
    for (const q of [
      "Will upper stage impact the moon on August 5?",
      "Which ocean is the deepest point on Earth found in?",
    ]) {
      const c = placeCandidates(q).filter((x) => x !== q && !q.startsWith(x));
      assert.deepEqual(c, [], `${q} -> ${JSON.stringify(placeCandidates(q))}`);
    }
  });
});
