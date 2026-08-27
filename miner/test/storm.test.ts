import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolvePlace, checkStorm } from "../src/storm";

describe("resolvePlace (live)", () => {
  // Coordinates used to short-circuit with no lookup. They now cost one reverse
  // geocode so the answer can name the place a question is actually about — the
  // exact coordinates must still survive that, and the name must degrade to the
  // pair if the lookup fails.
  test("keeps exact coordinates and names the place", async () => {
    const p = await resolvePlace("13.08,80.27");
    assert.equal(p?.latitude, 13.08);
    assert.equal(p?.longitude, 80.27);
    assert.ok(typeof p?.name === "string" && p.name.length > 0);
  });

  test("rejects out-of-range coordinates", async () => {
    assert.equal(await resolvePlace("999,999"), null);
  });

  test("rejects empty input", async () => {
    assert.equal(await resolvePlace("   "), null);
  });

  test("geocodes a city name", async () => {
    const p = await resolvePlace("Chennai");
    assert.ok(p, "expected a result");
    assert.match(p.name, /Chennai/);
    assert.ok(Math.abs(p.latitude - 13.08) < 0.5);
  });

  test("returns null for nonsense", async () => {
    assert.equal(await resolvePlace("Nowhereville XYZ123 QQQ"), null);
  });
});

describe("checkStorm (live)", () => {
  test("returns a graded verdict for a real city", async () => {
    const r = await checkStorm("Chennai");
    assert.ok(["none", "low", "moderate", "high", "severe"].includes(r.verdict), `got ${r.verdict}`);
    assert.ok(r.max_wind_gust_kmh !== null && r.max_wind_gust_kmh >= 0);
    assert.equal(r.window_hours, 48);
    assert.ok(r.reason.length > 0);
    assert.ok(r.latitude !== null && r.longitude !== null);
  });

  // storm_expected was dropped: it restated verdict, and the response had to fit
  // Telegraph's prose-conversion size limit. risk_score and verdict must still
  // agree, since they are two views of one number.
  test("risk_score and verdict agree", async () => {
    const r = await checkStorm("Reykjavik");
    const bands: Record<string, [number, number]> = {
      none: [0, 0.2], low: [0.2, 0.4], moderate: [0.4, 0.65], high: [0.65, 0.85], severe: [0.85, 1.01],
    };
    const b = bands[r.verdict];
    if (b) assert.ok(r.risk_score >= b[0] && r.risk_score < b[1], `${r.verdict} vs ${r.risk_score}`);
  });

  test("an unresolvable place is 'unknown', not a crash", async () => {
    const r = await checkStorm("Nowhereville XYZ123 QQQ");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.risk_score, 0);
    assert.match(r.reason, /No resolvable location/);
  });

  test("peak_at falls inside the forecast window", async () => {
    const r = await checkStorm("London");
    assert.ok(r.peak_at, "expected a peak timestamp");
    const peak = new Date(r.peak_at).getTime();
    const now = Date.now();
    assert.ok(peak > now - 36e5 * 26 && peak < now + 36e5 * 50, `peak_at out of window: ${r.peak_at}`);
  });
});

describe("conversion budget", () => {
  // Telegraph converts a miner's JSON to prose before scoring it, and returns
  // nothing when the response is too large — our epoch-285 SSL answer was 862
  // bytes and converted to an empty string. Storm reached 1076 bytes with a
  // per-period breakdown that measured no better than leaving it out.
  test("a window answer stays within the conversion budget", async () => {
    const r = await checkStorm("storm risk at 37.7749,-122.4194 over the next 48 hours");
    assert.ok(JSON.stringify(r).length < 700, `${JSON.stringify(r).length} bytes`);
  });
});
