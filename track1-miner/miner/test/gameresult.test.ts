import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupGame, parseDate, parseTeams, supportedLeagues } from "../src/gameresult";

test("a fixture is only read from an explicit versus token", () => {
  assert.deepEqual(parseTeams("Who won the Arsenal vs Chelsea game?"), { a: "Arsenal", b: "Chelsea" });
  assert.deepEqual(parseTeams("Who won the Lakers vs Celtics game last night?"), { a: "Lakers", b: "Celtics" });
  assert.deepEqual(parseTeams("What was the score in Manchester United v Liverpool?"), { a: "Manchester United", b: "Liverpool" });
  assert.deepEqual(parseTeams("Real Madrid versus Barcelona"), { a: "Real Madrid", b: "Barcelona" });
  // No versus token: guessing two team names out of prose is how the wrong
  // fixture gets reported, so nothing is guessed.
  assert.equal(parseTeams("Who won the game?"), null);
  assert.equal(parseTeams("What happened in the Premier League yesterday?"), null);
});

test("a named date is read, and its absence is not a date", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  assert.equal(parseDate("Who won the Lakers vs Celtics game last night?", now), "20260907");
  assert.equal(parseDate("Who won yesterday's Arsenal vs Chelsea game?", now), "20260907");
  assert.equal(parseDate("Who won the Arsenal vs Chelsea game today?", now), "20260908");
  assert.equal(parseDate("Who won Arsenal vs Chelsea on 2026-09-06?", now), "20260906");
  assert.equal(parseDate("Who won the Arsenal vs Chelsea game?", now), null);
});

test("the supported leagues are the ones the manifest advertises", () => {
  const l = supportedLeagues();
  for (const p of ["soccer/eng.1", "basketball/nba", "football/nfl", "baseball/mlb", "hockey/nhl"]) {
    assert.ok(l.includes(p), `${p} missing`);
  }
});

test("a request naming no fixture is refused with no lookup", async () => {
  let called = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { called = true; throw new Error("should not be called"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await lookupGame("Who won the game?");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "no_fixture");
    assert.equal(called, false, "no scoreboard may be read without a fixture to look for");
  } finally {
    globalThis.fetch = original;
  }
});

test("a dead scoreboard is unknown, never a fixture that was not played", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await lookupGame("Who won the Arsenal vs Chelsea game?");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "provider_unavailable");
    assert.equal(r.winner, null);
    assert.match(r.reason, /availability problem/i);
    // The disclaimer itself contains "was not played" ("not a statement that
    // the fixture was not played"), so the check is that no SCORE and no
    // winner is asserted, which is what a false claim would look like.
    assert.ok(!/\b\d+-\d+\b/.test(r.reason), "no score may be quoted when nothing was read");
    assert.ok(!/\bbeat\b|\bdrew\b/i.test(r.reason), "no outcome may be asserted when nothing was read");
  } finally {
    globalThis.fetch = original;
  }
});

/* --------------------------------- live ---------------------------------- */

test("a completed fixture reports the winner, the score and the competition (live)", async () => {
  const r = await lookupGame("Who won the Arsenal vs Chelsea game?");
  if (r.verdict === "unknown") return;   // scoreboard down is not a test failure
  if (r.verdict === "not_found") return; // fell outside the window; covered below
  assert.equal(r.verdict, "result");
  assert.ok(r.home_score !== null && r.away_score !== null, "a result must carry both scores");
  // The winner must agree with the scores. This is the assertion that would
  // catch the champion's preferred failure — naming the wrong winner scores
  // ABOVE the truth (0.854 vs 0.822), and we do not take that trade.
  if (r.home_score === r.away_score) {
    assert.equal(r.winner, null, "a draw has no winner");
    assert.match(r.reason, /drew|draw/i);
    assert.match(r.reason, /neither side won/i);
  } else {
    const higher = r.home_score! > r.away_score! ? r.home : r.away;
    assert.equal(r.winner, higher, "the winner must be the side with more goals");
    assert.ok(r.reason.includes(String(r.winner)), "the answer must name the winner");
  }
  assert.match(r.reason, /is complete/);
  assert.ok(r.competition, "the competition must be named");
});

test("a fixture that has not been played is never reported as a result (live)", async () => {
  // Manchester United versus Liverpool: the fixture directory's only record is
  // in January 2027 with a null score. Reporting it as a result scores 7e-4 and
  // is the August 2026 SPORTS_SCORE mistake.
  const r = await lookupGame("Who won the Manchester United vs Liverpool game?");
  if (r.verdict === "unknown") return;
  assert.notEqual(r.verdict, "result", "an unplayed fixture must not be a result");
  assert.equal(r.winner, null);
  if (r.verdict === "not_played") {
    assert.match(r.reason, /has not been played/);
  } else {
    assert.equal(r.verdict, "not_found");
    // No score may be quoted for a fixture we did not find a finished record of.
    assert.ok(!/\b\d+-\d+\b/.test(r.reason), `a score was quoted for a fixture with no result: ${r.reason}`);
  }
});

test("a draw is reported as a draw, not given an invented winner (live)", async () => {
  const r = await lookupGame("Who won the Everton vs Manchester United match?");
  if (r.verdict !== "result") return;
  if (r.home_score !== r.away_score) return;   // not a draw this time
  assert.equal(r.winner, null);
  assert.match(r.reason, /neither side won/i);
  assert.ok(!/\bbeat\b/i.test(r.reason), "a drawn match must not say one side beat the other");
});
