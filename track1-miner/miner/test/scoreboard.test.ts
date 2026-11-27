/**
 * Sports results from ESPN's scoreboards for EVENT_OUTCOME (scoreboard.ts). Fixtures are the shapes ESPN served on
 * 2026-11-27 for La Liga on 2026-02-21 and the NFL on 2026-11-26; offline.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { askedDate, gamesFrom, pickGame, type Game } from "../src/scoreboard";
import { fromGame } from "../src/eventoutcome";

const team = (displayName: string, shortDisplayName: string, abbreviation: string, score: string, winner: boolean) =>
  ({ score, winner, team: { displayName, shortDisplayName, abbreviation } });
const event = (id: string, date: string, completed: boolean, a: ReturnType<typeof team>, b: ReturnType<typeof team>) =>
  ({ id, date, status: { type: { name: completed ? "STATUS_FINAL" : "STATUS_SCHEDULED", completed } }, competitions: [{ competitors: [a, b] }] });

const laliga: Game[] = gamesFrom("soccer/esp.1", { events: [
  event("1", "2026-02-21T17:30Z", true, team("Osasuna", "Osasuna", "OSA", "2", true), team("Real Madrid", "Real Madrid", "RMA", "1", false)),
  event("2", "2026-02-21T20:00Z", true, team("Atlético Madrid", "Atlético", "ATM", "4", true), team("Espanyol", "Espanyol", "ESP", "2", false)),
  event("3", "2026-02-21T13:00Z", true, team("Real Sociedad", "Real Sociedad", "RSO", "3", false), team("Real Oviedo", "Real Oviedo", "OVI", "3", false)),
] });
const nfl: Game[] = gamesFrom("football/nfl", { events: [
  event("4", "2026-11-26T18:00Z", true, team("Detroit Lions", "Lions", "DET", "35", false), team("Chicago Bears", "Bears", "CHI", "39", true)),
  event("5", "2026-11-30T18:00Z", false, team("Miami Heat", "Heat", "MIA", "", false), team("Boston Celtics", "Celtics", "BOS", "", false)),
] });

test("the routed La Liga question: Atlético won, answered Yes from the scoreboard", () => {
  const q = "Will Club Atltico de Madrid win on 2026-02-21?";
  assert.equal(askedDate(q), "20260221");
  const g = pickGame(q, laliga, "2026-02-21");
  assert.equal(g?.id, "2", "Atlético, not Real Madrid, despite both being Madrid");
  const r = fromGame(q, g!);
  assert.deepEqual([r.verdict, r.outcome, r.winner], ["resolved", "Yes", "Atlético Madrid"]);
  assert.match(r.reason, /^Yes: Atlético Madrid beat Espanyol 4–2 on 2026-02-21 .*ESPN/);
  assert.equal(fromGame("Will Real Madrid win on 2026-02-21?", pickGame("Will Real Madrid win on 2026-02-21?", laliga, "2026-02-21")!).outcome, "No");
  assert.equal(fromGame("Did Real Sociedad vs Real Oviedo end in a draw?", pickGame("Did Real Sociedad vs Real Oviedo end in a draw?", laliga, null)!).outcome, "Yes");
});

test("a final score question names the winner; one-word nicknames need both teams", () => {
  const q = "What was the final score of Bears vs Lions?";
  const g = pickGame(q, nfl, "2026-11-27");
  assert.equal(g?.id, "4");
  const r = fromGame(q, g!);
  assert.deepEqual([r.outcome, r.winner], ["Chicago Bears", "Chicago Bears"]);
  assert.match(r.reason, /Chicago Bears beat Detroit Lions 39–35/);
  assert.equal(pickGame("Will heat waves hit Europe in 2026?", nfl, null), null, "a lone nickname is not a team");
  assert.equal(pickGame("Will the Fed cut rates in December 2026?", [...laliga, ...nfl], null), null);
});

test("an unfinished game is unresolved and nothing is predicted; dates read in words", () => {
  const g = pickGame("Will the Miami Heat beat the Boston Celtics?", nfl, null)!;
  const r = fromGame("Will the Miami Heat beat the Boston Celtics?", g);
  assert.deepEqual([r.verdict, r.outcome], ["unresolved", null]);
  assert.equal(askedDate("Did Arsenal win on February 21, 2026?"), "20260221");
  assert.equal(askedDate("Did Arsenal win on 21st February 2026?"), "20260221");
  assert.equal(askedDate("Did Arsenal win last night?"), null);
});
