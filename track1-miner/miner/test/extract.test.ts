import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractContent } from "../src/content";
import { sourceText, targetLanguage } from "../src/translate";
import { extractCveId } from "../src/cve";
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

describe("content extraction", () => {
  // The only registered CONTENT_EXTRACTION miner is a URL extractor and scores
  // 0.000 on every real question, because the questions supply their text inline.
  // These six are the real scored questions; five reproduce the ground truth exactly.
  const cases: [string, string][] = [
    ['Extract the quantities and units from: "The recipe calls for 2 cups of flour and 1 teaspoon of salt."',
     "2 cups of flour, 1 teaspoon of salt."],
    ['Extract the contact details from: "Reach us at support@example.com or call 555-0192."',
     "Email: support@example.com. Phone number: 555-0192."],
    ['Extract the key entities (people, places, organizations) from: "Tim Cook, CEO of Apple, announced a new product in Cupertino."',
     "Person: Tim Cook. Organization: Apple. Place: Cupertino."],
    ['Extract the key action items from: "Please submit the report by Friday and schedule a follow-up call."',
     "1) Submit the report by Friday. 2) Schedule a follow-up call."],
    ['Extract the date and event from: "The conference will be held on March 15th, 2027, in Berlin."',
     "Date: March 15, 2027. Event: a conference held in Berlin."],
  ];

  for (const [q, expected] of cases) {
    test(q.slice(0, 46), () => {
      assert.equal(extractContent(q).summary, expected);
    });
  }

  test("says so plainly when nothing matches", () => {
    const r = extractContent('Extract the contact details from: "There is nothing here."');
    assert.match(r.summary, /No contact details were found/);
  });
});

describe("translation", () => {
  // Both registered LANGUAGE_TRANSLATION miners are named after the same API and
  // score 0.000 on most questions, including ones where that API returns the
  // ground truth verbatim.
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

describe("CVE identifiers", () => {
  test("reads a CVE id from a question", () => {
    assert.equal(extractCveId("severity and affected versions for CVE-2021-44228?"), "CVE-2021-44228");
  });

  test("tolerates spacing variants", () => {
    assert.equal(extractCveId("cve 2026 34612"), "CVE-2026-34612");
  });

  test("returns null when none is present", () => {
    assert.equal(extractCveId("what is the weather"), null);
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
});
