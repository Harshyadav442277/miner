import { test } from "node:test";
import assert from "node:assert/strict";
import { notAnFxQuestion } from "../src/currency";

test("a commodity price or a forecast routed to /convert is declined, not converted (2026-10-21)", () => {
  assert.match(notAnFxQuestion("Will European gas prices exceed 80 euros?") ?? "", /price of gas, not an exchange rate/);
  assert.match(notAnFxQuestion("Will the price of gold pass 3000 dollars?") ?? "", /not an exchange rate/);
  // The routed FX questions from tools/routed-questions.json still convert.
  for (const q of ["what's the usd to inr", "whats the fx rate of euro?", "Convert 250 GBP to JPY", "Will the euro strengthen against the dollar?"]) {
    assert.equal(notAnFxQuestion(q), null, q);
  }
});
