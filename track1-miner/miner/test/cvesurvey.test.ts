import { test } from "node:test";
import assert from "node:assert/strict";
import { baseScore, inBand, surveyRequest, windowFor } from "../src/cvesurvey";

const NOW = new Date("2026-09-11T00:00:00Z");

/**
 * Every question quoted here is a real routed one, replayed against production
 * on 2026-09-11, and every one was refused into the 1e-11 band before this
 * module existed.
 */
test("the six refused survey questions are all recognised", () => {
  assert.deepEqual(surveyRequest("CVE", NOW), { year: null, severity: null });
  assert.deepEqual(surveyRequest("CVE 2015", NOW), { year: 2015, severity: null });
  assert.deepEqual(surveyRequest("Look up for latest CVEs", NOW), { year: null, severity: null });
  assert.deepEqual(surveyRequest("CVEs 2010 high priority", NOW), { year: 2010, severity: "HIGH" });
  // "Criticial" is the spelling two routed questions actually use. Matching only
  // the correct one would leave the commonest phrasing refused (the G94 shape).
  assert.deepEqual(surveyRequest("Criticial CVE 2025", NOW), { year: 2025, severity: "CRITICAL" });
  assert.deepEqual(surveyRequest("Criticial CVE 2026", NOW), { year: 2026, severity: "CRITICAL" });
});

test("a complete identifier is a lookup and never a survey", () => {
  assert.equal(surveyRequest("CVE-2021-44228 severity?", NOW), null);
  assert.equal(surveyRequest("What is the CVSS score of CVE-2024-3094?", NOW), null);
});

test("a sentence without the subject word cannot capture the route", () => {
  assert.equal(surveyRequest("what is the weather in 2015", NOW), null);
  assert.equal(surveyRequest("Will Methotrexate receive new warning labels?", NOW), null);
  // The subject word alone, with nothing to survey by, is still not a survey.
  assert.equal(surveyRequest("how do vulnerability scores work", NOW), null);
});

test("an implausible year leaves nothing to survey, so it is not a survey", () => {
  // With the year discarded there is no severity, no "latest" and no bare "CVE"
  // left, so the request falls through to the identifier-format refusal, which
  // is the answer that actually helps.
  assert.equal(surveyRequest("CVE 1823", NOW), null);
  // A future year has no published record yet.
  assert.equal(surveyRequest("CVE 2030", NOW), null);
  // But an implausible year alongside a real filter still surveys, on the filter.
  assert.deepEqual(surveyRequest("critical CVE 2030", NOW), { year: null, severity: "CRITICAL" });
});

/**
 * NVD caps a published-date range at 120 days — a full-year range returns HTTP
 * 404, verified 2026-09-11 — so every window this builds has to fit inside it.
 */
test("every window is inside NVD's 120-day cap", () => {
  for (const y of [null, 2010, 2015, 2025, 2026]) {
    const { start, end } = windowFor(y, NOW);
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    assert.ok(days <= 120, `${y}: window is ${days} days`);
    assert.ok(days > 0, `${y}: window is empty`);
  }
});

test("a window never runs past now, so the current year is not read into the future", () => {
  const { end } = windowFor(2026, NOW);
  assert.ok(end.getTime() <= NOW.getTime());
  const past = windowFor(2015, NOW);
  assert.equal(past.end.toISOString().slice(0, 10), "2015-12-31");
});

/**
 * NVD's own severity filter does not filter: `cvssV3Severity=CRITICAL` returned
 * records scoring 7.3, which is HIGH. Bands are therefore applied to the score
 * this module parsed, and this test is what stops a "critical" list of 7.3s.
 */
test("bands are applied to the parsed score, not to NVD's flag", () => {
  assert.equal(inBand(7.3, "CRITICAL"), false);
  assert.equal(inBand(9.0, "CRITICAL"), true);
  assert.equal(inBand(10.0, "CRITICAL"), true);
  assert.equal(inBand(7.3, "HIGH"), true);
  assert.equal(inBand(6.9, "HIGH"), false);
  assert.equal(inBand(4.0, "MEDIUM"), true);
  assert.equal(inBand(3.9, "LOW"), true);
  // No severity asked for means no filtering.
  assert.equal(inBand(1.0, null), true);
  // A record with no score cannot be claimed to be in a band.
  assert.equal(inBand(null, "CRITICAL"), false);
  assert.equal(inBand(null, null), true);
});

test("the highest score across metric versions is the one read", () => {
  assert.equal(baseScore({ metrics: { cvssMetricV31: [{ cvssData: { baseScore: 7.3 } }] } }), 7.3);
  assert.equal(
    baseScore({ metrics: { cvssMetricV2: [{ cvssData: { baseScore: 5.0 } }], cvssMetricV31: [{ cvssData: { baseScore: 9.8 } }] } }),
    9.8,
  );
  assert.equal(baseScore({ metrics: {} }), null);
  assert.equal(baseScore(undefined), null);
});
