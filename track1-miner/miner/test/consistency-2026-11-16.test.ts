import { test } from "node:test";
import assert from "node:assert/strict";
import { agreeingTones, analyseSentimentPhrased, labelScore, scoreFits } from "../src/prose-phrase";
import { scoredFields } from "../src/intent-fields";
import { isRelevant, subjectNames } from "../src/newssearch";

test("news: a subject that names something needs that name in the headline", () => {
  assert.deepEqual(subjectNames("Tesla recall"), ["tesla"]);
  assert.deepEqual(subjectNames("Nvidia earnings"), ["nvidia"]);
  assert.deepEqual(subjectNames("SpaceX Starship"), [], "all capitalised: no single name is demanded");
  assert.deepEqual(subjectNames("interest rate decision"), []);
  const nio = { title: "Nio warns owners of 'airbag recall' scam texts as other automakers issue similar alerts", source: "CnEVPost", published: null };
  const tesla = { title: "Tesla recalls 50,000 Cybertrucks over loose trim panel", source: "Reuters", published: null };
  assert.equal(isRelevant(nio, ["tesla", "recall"], [], ["tesla"]), false, "production 2026-11-15 served this for Tesla recall");
  assert.equal(isRelevant(tesla, ["tesla", "recall"], [], ["tesla"]), true);
  assert.equal(isRelevant(nio, ["tesla", "recall"]), true, "without names the old rule is unchanged");
});
import { resetPhraseState } from "../src/llm";

test("labelScore: the model's score when it fits the label, else the word list's, else the label's midpoint", () => {
  assert.equal(labelScore("positive", 0.8, 0), 0.8);
  assert.equal(labelScore("positive", null, 0), 0.6, "production 2026-11-15: Positive with score 0");
  assert.equal(labelScore("positive", -0.4, 0.55), 0.55);
  assert.equal(labelScore("negative", 0.3, -0.7579), -0.7579);
  assert.equal(labelScore("neutral", 0.9, 0.02), 0.02);
  assert.equal(labelScore("mixed", null, -0.5023), -0.5023);
  assert.equal(labelScore("mixed", 0.1, -0.9), 0.1);
  assert.equal(labelScore("mixed", null, -0.9), 0);
  assert.equal(scoreFits("positive", 1.2), false);
  assert.equal(scoreFits("neutral", Number.NaN), false);
});

test("agreeingTones: a tone that contradicts the label is dropped", () => {
  assert.deepEqual(agreeingTones("positive", ["frustrated", "joyful"]), ["joyful"]);
  assert.deepEqual(agreeingTones("negative", ["grateful", "angry"]), ["angry"]);
  assert.deepEqual(agreeingTones("neutral", ["worried"]), []);
  assert.deepEqual(agreeingTones("mixed", ["worried", "grateful"]), ["worried", "grateful"]);
});

test("a five-star review is served Positive with a positive score and no frustrated tone", async () => {
  const real = globalThis.fetch;
  process.env.GROQ_API_KEY = "test-key-not-real";
  resetPhraseState();
  globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content:
    JSON.stringify({ sentiment: "Positive", score: 0.85, reason: "The writer gives five stars and would buy again." }) } }] }), { status: 200 })) as unknown as typeof fetch;
  try {
    const r = await analyseSentimentPhrased("", "Five stars, would buy again without hesitation.");
    assert.equal(r.verdict, "positive");
    assert.equal(r.score, 0.85);
    assert.ok(!(r.tones ?? []).includes("frustrated"), JSON.stringify(r.tones));
    const f = scoredFields("/sentiment", r);
    assert.equal(f.sentiment, "Positive");
    assert.equal(f.score, undefined, "the route's own score is served, not the word list's compound");
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
});

test("storm: risk_level is the stated grade, precipitation the window's total, window as asked", () => {
  const miami = scoredFields("/storm-alert", { verdict: "low", risk_score: 0.27, window_hours: 48, requested_window_hours: 48,
    max_precipitation_mm: 2.1, total_precipitation_mm: 6.4, max_wind_gust_kmh: null });
  assert.equal(miami.risk_level, "LOW", "production 2026-11-15 served MODERATE beside 'graded low'");
  assert.equal(miami.precipitation_mm, 6.4);
  assert.equal(miami.window, "48 hours");
  const manila = scoredFields("/storm-alert", { verdict: "none", risk_score: 0.16, window_hours: 76, requested_window_hours: 72 });
  assert.equal(manila.window, "72 hours (forecast steps cover 76 hours)");
  assert.equal(manila.risk_level, "LOW");
  assert.equal(scoredFields("/storm-alert", { verdict: "moderate", risk_score: 0.45, window_hours: 24 }).window, "24 hours");
  assert.equal(scoredFields("/storm-alert", { verdict: "unknown", risk_score: 0 }).risk_level, null);
});
