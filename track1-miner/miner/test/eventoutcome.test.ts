import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asksPrediction, bestMatch, coverage, directionConflict, keywords, manifoldCandidates, names, namesEvent, numbers, polymarketCandidates, resolveEvent,
} from "../src/eventoutcome";

/** Trimmed from Gamma /public-search on 2026-09-12 ("Fed decision in September?"). */
const GAMMA = {
  events: [{
    title: "Fed decision in September?",
    markets: [
      { question: "Fed decreases interest rates by 50+ bps after September 2025 meeting?", closed: true, outcomes: "[\"Yes\", \"No\"]", outcomePrices: "[\"0\", \"1\"]", endDate: "2025-09-17T12:00:00Z" },
      { question: "Fed decreases interest rates by 25 bps after September 2025 meeting?", closed: true, outcomes: "[\"Yes\", \"No\"]", outcomePrices: "[\"1\", \"0\"]", endDate: "2025-09-17T12:00:00Z" },
      { question: "No change in Fed interest rates after September 2025 meeting?", closed: true, outcomes: "[\"Yes\", \"No\"]", outcomePrices: "[\"0\", \"1\"]", endDate: "2025-09-17T12:00:00Z" },
    ],
  }, {
    title: "Fed decision in October?",
    markets: [
      { question: "Fed decreases interest rates by 25 bps after October 2026 meeting?", closed: false, outcomes: "[\"Yes\", \"No\"]", outcomePrices: "[\"0.62\", \"0.38\"]", endDate: "2026-10-28T12:00:00Z" },
    ],
  }],
};

test("keywords drop boilerplate and fold synonyms, so 'cut' meets 'decreases'", () => {
  assert.deepEqual(keywords("Did the Fed cut rates? Resolve this market."), ["fed", "decrease", "rates"]);
  assert.deepEqual(keywords("Who won?"), ["win"]);
});

test("numbers are taken whole, so 25 is not found inside 2025", () => {
  assert.deepEqual(numbers("25 bps in 2025"), ["25", "2025"]);
  assert.deepEqual(numbers("no digits"), []);
});

test("a market missing a number the question names scores zero", () => {
  const q = "Did the Fed cut rates by 25 bps at its September 2025 meeting?";
  assert.equal(coverage(q, "Fed decreases interest rates by 50+ bps after September 2025 meeting?"), 0);
  assert.ok(coverage(q, "Fed decreases interest rates by 25 bps after September 2025 meeting?") >= 0.9);
});

test("every name in the question must be in the market: the Fed is not the ECB", () => {
  const q = "Did the Fed cut rates by 25 bps at its September 2025 meeting? Resolve this market.";
  assert.deepEqual(names(q), ["fed", "september"]);
  assert.deepEqual(names("did it rain"), []);
  // The live 2026-09-12 mis-settlement: seven of eight words matched, the central bank did not.
  assert.equal(coverage(q, "ECB Interest Rates: September 2025 Will the ECB announce a 25 bps decrease at the September meeting?"), 0);
  assert.ok(coverage("Did the Philadelphia Eagles win Super Bowl LIX?", "Super Bowl LIX: Will the Philadelphia Eagles win?") >= 0.9);
  // A market about someone else that merely mentions the fixture (live Gamma result, settled No).
  assert.equal(coverage("Did the Philadelphia Eagles win Super Bowl LIX?",
    "Will Rich Russo - Super Bowl LIX - Philadelphia Eagles vs. Kansas City Chiefs win Best Director for Sports at the 78th DGA Awards?"), 0);
});

test("Gamma settlement is read from closed plus a single outcome paying 1", () => {
  const c = polymarketCandidates(GAMMA);
  assert.equal(c.length, 4);
  assert.equal(c[1]?.settled, true);
  assert.equal(c[1]?.outcome, "Yes");
  assert.equal(c[3]?.settled, false);
  assert.equal(c[3]?.outcome, null);
  assert.deepEqual(polymarketCandidates({ events: [{ markets: [{ question: "x", closed: true, outcomes: "bad json" }] }] })[0]?.settled, false);
});

test("the right market in a mutually exclusive event is chosen, and its settlement read", () => {
  const best = bestMatch("Did the Fed cut rates by 25 bps at its September 2025 meeting? Resolve this market.", polymarketCandidates(GAMMA));
  assert.equal(best?.c.question, "Fed decreases interest rates by 25 bps after September 2025 meeting?");
  assert.equal(best?.c.outcome, "Yes");
});

test("a hold question never settles against a cut market (verifier, 2026-09-12)", () => {
  const c = polymarketCandidates(GAMMA);
  for (const q of ["Did the Fed hold rates steady at its September 2025 meeting?", "Did the Fed keep rates unchanged at its September 2025 meeting?"]) {
    assert.equal(directionConflict(q, "Fed decreases interest rates by 25 bps after September 2025 meeting?"), true, q);
    const best = bestMatch(q, c);
    assert.equal(best?.c.question, "No change in Fed interest rates after September 2025 meeting?", q);
    assert.equal(best?.c.outcome, "No", q);
  }
  // A cut question is not matched to the no-change market either.
  assert.equal(coverage("Did the Fed cut rates at its September 2025 meeting?", "No change in Fed interest rates after September 2025 meeting?"), 0);
  assert.equal(directionConflict("Did the Eagles win Super Bowl LIX?", "Super Bowl LIX: Will the Eagles win?"), false);
});

test("an unsettled market is matched as unsettled, and a wrong year matches nothing", () => {
  const open = bestMatch("Will the Fed cut by 25 bps at the October 2026 meeting?", polymarketCandidates(GAMMA));
  assert.equal(open?.c.settled, false);
  assert.equal(bestMatch("Did the Fed cut by 25 bps in September 2024?", polymarketCandidates(GAMMA)), null);
});

test("Manifold binary markets are read; YES and NO are the only settlements", () => {
  const c = manifoldCandidates([
    { question: "Will X happen in 2025?", outcomeType: "BINARY", isResolved: true, resolution: "YES", closeTime: 1735689600000 },
    { question: "Will Y happen?", outcomeType: "BINARY", isResolved: true, resolution: "MKT" },
    { question: "Who wins Z?", outcomeType: "MULTIPLE_CHOICE", isResolved: true, resolution: "abc" },
  ]);
  assert.equal(c.length, 2);
  assert.equal(c[0]?.outcome, "Yes");
  assert.equal(c[1]?.settled, false);
});

test("a prediction or opinion request is recognised", () => {
  assert.equal(asksPrediction("Who do you think will win the election?"), true);
  assert.equal(asksPrediction("What are the odds of a Fed cut?"), true);
  assert.equal(asksPrediction("Did the Fed cut rates in September 2025?"), false);
});

test("an event must be named: a capitalised name after the first word, or a number", () => {
  assert.equal(namesEvent("Did the Fed cut rates?"), true);
  assert.equal(namesEvent("Did flight UA328 land on time?"), true);
  assert.equal(namesEvent("who won the election"), false);
  assert.equal(namesEvent("Who won the election?"), false);
});

test("predictions and unnamed events are refused without searching", async () => {
  const p = await resolveEvent("Who do you think will win the election?");
  assert.equal(p.error, "prediction_requested");
  for (const q of ["", "github.com", "who won the election"]) {
    const r = await resolveEvent(q);
    assert.equal(r.error, "no_event", q);
  }
});

test("(live) an answer never reports odds as an outcome", async () => {
  const r = await resolveEvent("Did the Fed cut rates by 25 bps at its September 2025 meeting? Resolve this market.");
  if (r.verdict === "unknown") return;
  if (r.verdict === "resolved") assert.match(r.reason, /^Resolved (Yes|No): /);
  assert.doesNotMatch(r.reason, /\d+(\.\d+)?%|probability/i);
});
