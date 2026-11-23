/**
 * The model may copy a CONTENT_EXTRACTION value out of the text but not invent one (extract-model.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { groundedValue, modelValuesFrom } from "../src/extract-model";

const flight = "Flight BA117 departs London Heathrow at 08:25 on 4 Dec 2026, arriving New York JFK at 11:10. Gate B42.";

test("a value every word of which is in the text is kept", () => {
  assert.equal(groundedValue("08:25", "departure time", flight), "08:25");
  assert.equal(groundedValue("B42", "gate", flight), "B42");
  assert.equal(groundedValue(["London Heathrow", "New York JFK"], "airports", flight), "London Heathrow, New York JFK");
});

test("a value the text does not bear out is refused", () => {
  assert.equal(groundedValue("Gatwick", "departure airport", flight), null);
  assert.equal(groundedValue("09:25", "departure time", flight), null);
  assert.equal(groundedValue("not stated", "terminal", flight), null);
  assert.equal(groundedValue(null, "terminal", flight), null);
});

test("a judgement field may name a label the text does not contain, in at most four words", () => {
  const review = "I absolutely loved this blender - smoothies in seconds! Only complaint is the noise. 4/5 stars.";
  assert.equal(groundedValue("positive", "sentiment", review), "positive");
  assert.equal(groundedValue("very positive but somewhat noisy overall", "sentiment", review), null);
  assert.equal(groundedValue("Philips", "brand", review), null);
});

test("a reply is read by field name, case-insensitively, and anything but the object asked for is refused", () => {
  const raw = '{"values": {"Gate": "B42", "flight number": "BA117", "terminal": null}}';
  assert.deepEqual(modelValuesFrom(raw, ["gate", "flight number", "terminal"], flight), ["B42", "BA117", null]);
  assert.equal(modelValuesFrom("Sure! The gate is B42.", ["gate"], flight), null);
  assert.equal(modelValuesFrom(null, ["gate"], flight), null);
});
