/**
 * WEATHER_CHECK's dominant routed question.
 *
 * "Is there an active storm alert or severe weather warning for <place> right
 * now?" is 21 of the 33 routed WEATHER_CHECK questions. `/weather-forecast`
 * answered it with a 24-hour temperature range that never said whether an alert
 * was in effect. At epoch 325 we were rank 6 in this intent at 0.0155 while the
 * field has crossed to 0.9996.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { alertAnswer, asksAlert } from "../src/alertcheck";
import { checkStorm } from "../src/storm";
import type { StormResult } from "../src/storm";

const ROUTED = "Is there an active storm alert or severe weather warning for Chennai right now?";

test("the routed alert question is recognised", () => {
  assert.equal(asksAlert(ROUTED), true);
  assert.equal(asksAlert("Is there a severe weather warning for Manila?"), true);
  assert.equal(asksAlert("any weather advisory for Tokyo?"), true);
});

/**
 * The sibling intent shares this endpoint. Measured 2026-09-12: none of the 45
 * routed WEATHER_FORECAST questions contains these words, and none may be
 * diverted off the forecast path.
 */
test("a forecast question is never diverted to the alert path", () => {
  for (const q of [
    "What is the 24-hour weather forecast for Miami, Florida starting today?",
    "What's the 3-day forecast for Miami, FL?",
    "What is the current temperature in Cairo?",
    "Will Riyadh reach 40°C today?",
  ]) {
    assert.equal(asksAlert(q), false, `diverted: ${q}`);
  }
});

const base: StormResult = {
  location: "Chennai, Tamil Nadu, India",
  verdict: "none",
  valid_at: null,
  wind_direction: "south",
  risk_score: 0.18,
  max_wind_gust_kmh: 28.8,
  max_wind_speed_kmh: 11,
  max_precipitation_mm: 0,
  thunderstorm: false,
  window_hours: 24,
  peak_at: null,
  latitude: 13.08,
  longitude: 80.27,
} as StormResult;

test("the answer opens with the answer, not with a temperature range", () => {
  const none = alertAnswer(base);
  assert.match(none.reason, /^No\. There is no active storm alert or severe weather warning/);
  const high = alertAnswer({ ...base, verdict: "high", risk_score: 0.82 });
  assert.match(high.reason, /^Yes\. Alert-level weather is affecting/);
  const mid = alertAnswer({ ...base, verdict: "moderate", risk_score: 0.5 });
  assert.match(mid.reason, /elevated but below alert level/);
});

/**
 * We read a forecast API, not a national agency's warning feed. Claiming an
 * authority has issued nothing is a statement we cannot support, so it is never
 * made — the answer describes conditions and says which it is.
 */
test("no answer claims an authority has issued nothing", () => {
  for (const v of ["none", "low", "moderate", "high", "severe"] as const) {
    const r = alertAnswer({ ...base, verdict: v });
    assert.match(r.reason, /rather than from a national weather agency's warning feed/);
    assert.doesNotMatch(r.reason, /no warning has been issued/i);
    assert.doesNotMatch(r.reason, /authorities have not/i);
  }
});

/** A source failure is not an all-clear. */
test("an unreadable forecast is not reported as no alert", () => {
  const r = alertAnswer({ ...base, verdict: "unknown" });
  assert.equal(r.confidence, 0);
  assert.doesNotMatch(r.reason, /^No\./);
  assert.match(r.reason, /source failure rather than an all-clear/);
});

test("the routed question is answered end to end (live)", async () => {
  const storm = await checkStorm(ROUTED);
  if (storm.verdict === "unknown") return;
  const r = alertAnswer(storm);
  assert.match(r.reason, /Chennai/);
  // The graded risk must be the same one STORM_ALERT publishes for that place.
  assert.match(r.reason, new RegExp(`graded ${storm.verdict}`));
  assert.ok(r.reason.length > 80);
});
