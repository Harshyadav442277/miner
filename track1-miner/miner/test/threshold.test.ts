import { test } from "node:test";
import assert from "node:assert/strict";
import { temperatureThreshold, thresholdSentence } from "../src/threshold";

test("reads above and below thresholds in Celsius and Fahrenheit", () => {
  assert.deepEqual(temperatureThreshold("Will Riyadh reach 40°C today?"), { direction: "above", celsius: 40, asked: "40°C" });
  assert.equal(temperatureThreshold("Will Dubai exceed 40 degrees C on Friday?")?.celsius, 40);
  assert.equal(temperatureThreshold("Will Phoenix go above 100°F tomorrow?")?.asked, "100°F");
  assert.ok(Math.abs(temperatureThreshold("Will Phoenix go above 100°F tomorrow?")!.celsius - 37.78) < 0.01);
  assert.equal(temperatureThreshold("Will Moscow drop below -10°C this week?")?.direction, "below");
  assert.equal(temperatureThreshold("Will Moscow drop below -10°C this week?")?.celsius, -10);
  assert.equal(temperatureThreshold("What is the forecast for Osaka?"), null);
  assert.equal(temperatureThreshold("Will it rain more than 10 mm in Mumbai?"), null);
});

test("answers yes or no first, from the forecast's own range", () => {
  const t = temperatureThreshold("Will Riyadh reach 40°C today?")!;
  assert.equal(
    thresholdSentence(t, "Riyadh", "the next 24 hours", 21.3, 32.8),
    "No: the forecast high for Riyadh over the next 24 hours is 32.8°C, below 40°C.",
  );
  assert.match(thresholdSentence(t, "Riyadh", "the next 24 hours", 30, 41.2)!, /^Yes: .* 41\.2°C, which reaches 40°C\.$/);
  const cold = temperatureThreshold("Will Moscow drop below -10°C this week?")!;
  assert.match(thresholdSentence(cold, "Moscow", "the next 7 days", -12.5, -2)!, /^Yes: the forecast low .* -12\.5°C, below -10°C\.$/);
  assert.equal(thresholdSentence(t, "Riyadh", "the next 24 hours", null, null), null);
});
