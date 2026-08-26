import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractHostname, placeCandidates, extractWindThreshold, toKmh, asksForKnots } from "../src/extract";
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
