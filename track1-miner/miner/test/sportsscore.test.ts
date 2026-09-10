import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTeams } from "../src/gameresult";
import type { GameResult } from "../src/gameresult";
import { phraseScore } from "../src/sportsscore";

const base: GameResult = {
  home: "Los Angeles Lakers", away: "Boston Celtics",
  home_score: 102, away_score: 98, winner: "Los Angeles Lakers",
  competition: "NBA", played_at: "2026-09-10T02:00:00Z",
  verdict: "result", confidence: 0.95, reason: "",
};

test("a live score leads with the numbers and is never called a final result", () => {
  const r = phraseScore({
    ...base, verdict: "in_progress", winner: null,
    reason: "… is still in progress (4:21 - 4th Quarter), so it has no final result yet. …",
  });
  assert.equal(r.verdict, "live_score");
  assert.equal(r.in_progress, true);
  // The score opens the sentence: roughly 32 words are scored and this is the
  // question's whole subject.
  assert.match(r.reason, /^Los Angeles Lakers 102, Boston Celtics 98/);
  assert.match(r.reason, /4:21 - 4th Quarter/);
  assert.match(r.reason, /not a final result/);
});

test("a finished fixture is the most recent score, and says it is not live", () => {
  const r = phraseScore(base);
  assert.equal(r.verdict, "final_score");
  assert.equal(r.in_progress, false);
  assert.match(r.reason, /^Los Angeles Lakers 102, Boston Celtics 98/);
  assert.match(r.reason, /most recent score rather than a live one/);
});

test("the winner is never named, because that is the other intent's question", () => {
  // The canonical description separates the two by name. Answering "who won"
  // here answers a question that was not asked.
  for (const v of ["result", "in_progress"] as const) {
    const r = phraseScore({ ...base, verdict: v, reason: "still in progress (Q3)" });
    assert.doesNotMatch(r.reason, /\bbeat\b|\bwon\b|\bwinner\b/i);
  }
});

test("a fixture that has not started has no score, and none is invented", () => {
  const r = phraseScore({
    ...base, verdict: "not_played", home_score: null, away_score: null, winner: null, reason: "",
  });
  assert.equal(r.verdict, "not_played");
  assert.equal(r.home_score, null);
  assert.match(r.reason, /has no score yet/);
  assert.match(r.reason, /none has been invented/);
});

test("no fixture in the request is refused rather than guessed", () => {
  const r = phraseScore({
    ...base, home: null, away: null, home_score: null, away_score: null,
    competition: null, played_at: null, winner: null,
    verdict: "unknown", confidence: 0, reason: "", error: "no_fixture",
  });
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "no_fixture");
  assert.match(r.reason, /no guess was made/);
});

test("a fixture found with an unreadable score reports no score, not a zero", () => {
  const r = phraseScore({ ...base, verdict: "not_found", home_score: null, away_score: null, reason: "" });
  assert.equal(r.verdict, "not_found");
  assert.match(r.reason, /No score could be found/);
  assert.doesNotMatch(r.reason, /\b0\b/);
});

/**
 * The parser is shared with GAME_RESULT, and it was tuned entirely on "who won"
 * phrasings. Asked the SPORTS_SCORE canonical question it produced team A
 * "What's current score" and team B "Red Sox right now", then honestly reported
 * no such fixture — a refusal caused by the question's own wording.
 */
test("live-score phrasings parse to the two teams and nothing else", () => {
  assert.deepEqual(
    parseTeams("What's the current score in the Lakers vs Celtics game right now?"),
    { a: "Lakers", b: "Celtics" },
  );
  assert.deepEqual(
    parseTeams("What is the score in the Arsenal vs Chelsea match?"),
    { a: "Arsenal", b: "Chelsea" },
  );
  assert.deepEqual(
    parseTeams("Current score Manchester City vs Liverpool"),
    { a: "Manchester City", b: "Liverpool" },
  );
  assert.deepEqual(parseTeams("Live score for Real Madrid vs Barcelona"), { a: "Real Madrid", b: "Barcelona" });
  assert.deepEqual(parseTeams("Yankees vs Red Sox score so far"), { a: "Yankees", b: "Red Sox" });
});

test("result phrasings still parse, because the parser is shared", () => {
  assert.deepEqual(parseTeams("Who won the Lakers vs Celtics game last night?"), { a: "Lakers", b: "Celtics" });
  assert.deepEqual(
    parseTeams("What was the final score of Manchester United vs Liverpool?"),
    { a: "Manchester United", b: "Liverpool" },
  );
  assert.deepEqual(parseTeams("Arsenal vs Chelsea"), { a: "Arsenal", b: "Chelsea" });
  assert.deepEqual(parseTeams("Who won the Arsenal against Chelsea match?"), { a: "Arsenal", b: "Chelsea" });
  // A bare "who" used to survive into the home side.
  assert.deepEqual(parseTeams("Who beat who in Yankees vs Red Sox?"), { a: "Yankees", b: "Red Sox" });
});
