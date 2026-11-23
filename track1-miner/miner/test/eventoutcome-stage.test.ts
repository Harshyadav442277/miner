/**
 * Event matching rejects another stage of the same competition, and reads "Federal Reserve" as Polymarket's "Fed"
 * (production probes, 2026-11-23).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { coverage, foldCountries, stageConflict } from "../src/eventoutcome";

test("a market about another stage of the competition is not the event asked about", () => {
  const q = "Did Real Madrid win the 2024 UEFA Champions League final?";
  assert.equal(stageConflict(q, "Will Real Madrid advance to the Round of 16 in the 2024-25 UEFA Champions League?"), true);
  assert.equal(coverage(q, "Will Real Madrid advance to the Round of 16 in the 2024-25 UEFA Champions League?"), 0);
  assert.equal(stageConflict("Did Real Madrid win the 2024 Champions League?", "Will Real Madrid win the 2024 Champions League final?"), false);
  assert.equal(stageConflict(q, "Will Real Madrid win the 2024 UEFA Champions League final?"), false);
});

test("the Federal Reserve and the FOMC are the Fed", () => {
  assert.equal(foldCountries("Did the Federal Reserve cut rates?"), "Did the Fed cut rates?");
  assert.equal(foldCountries("Did the FOMC hold?"), "Did the Fed hold?");
  assert.ok(coverage("Did the Federal Reserve cut interest rates in September 2024?", "Fed decreases interest rates by 50 bps after September 2024 meeting?") > 0.7);
});
