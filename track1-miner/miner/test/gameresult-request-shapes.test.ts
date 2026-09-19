/**
 * GAME_RESULT request shapes — the side parameters, and the question that names
 * one team rather than a fixture.
 *
 * `sportwire-game-result` declares exactly one subject parameter, `team`
 * singular, with the worked example "Who won the Knicks game?" (its `yaml_url`,
 * read 2026-09-19). It crossed this intent at 0.984 in epoch 342 while we
 * scored 2.2e-3. Against https://miner-wine.vercel.app the same day, every
 * shape of that question was refused with "No fixture could be identified in
 * this request": `team=Lakers`, `team1=Lakers` alone, `teams=Lakers vs
 * Celtics`, `team_1`/`team_2`, `teamA`/`teamB`, `home_team`/`away_team`,
 * `match=`, `event=`, and the prose form with no parameters at all.
 *
 * Reading one team is not the guess `parseTeams` refuses to make. That refusal
 * is about inventing a second side, which answers about a fixture nobody asked
 * about; one named team identifies its own most recent finished game. The two
 * guards that keep it honest are pinned below: a name that more than one league
 * answers for is refused, and prose that names no team still is.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupGame, parseTeam, parseTeams } from "../src/gameresult";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";

const DAY = new Date().toISOString().slice(0, 10);

/** One finished NBA fixture, on whichever scoreboard path is asked for. */
function scoreboard(home: string, away: string, hs: number, as: number): unknown {
  return {
    leagues: [{ name: "NBA" }],
    events: [{
      date: `${DAY}T02:00Z`,
      competitions: [{
        competitors: [
          { homeAway: "home", score: String(hs), team: { displayName: home, shortDisplayName: home.split(" ").pop(), abbreviation: "" } },
          { homeAway: "away", score: String(as), team: { displayName: away, shortDisplayName: away.split(" ").pop(), abbreviation: "" } },
        ],
        status: { type: { state: "post", completed: true, detail: "Final" } },
      }],
    }],
  };
}

const json = (value: unknown): Response =>
  new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });

/** ESPN answers for `paths`; everything else is empty. The directory says nothing. */
function espn(paths: string[], body: unknown): typeof fetch {
  return (async (url: string | URL | Request) => {
    const href = String(url);
    if (href.includes("thesportsdb")) return json({ teams: null, event: null });
    if (paths.some((p) => href.includes(p))) return json(body);
    return json({ events: [] });
  }) as typeof fetch;
}

async function withFetch(stub: typeof fetch, run: () => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try { await run(); } finally { globalThis.fetch = original; }
}

function request(params: Record<string, string>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url: `/game-result?${new URLSearchParams(params)}` } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

test("one team is read from the question only when the question names one", () => {
  assert.equal(parseTeam("Who won the Knicks game?"), "Knicks");
  assert.equal(parseTeam("Who won the Los Angeles Lakers game?"), "Los Angeles Lakers");
  assert.equal(parseTeam("What was the final score of the Yankees game?"), "Yankees");
  assert.equal(parseTeam("Arsenal's last result"), "Arsenal");
  assert.equal(parseTeam("Did the Padres win?"), "Padres");
  // A fixture is a fixture; the two-sided parser owns it.
  assert.equal(parseTeam("Who won the Lakers vs Celtics game?"), null);
  assert.ok(parseTeams("Who won the Lakers vs Celtics game?"));
  // Nothing to name.
  for (const q of ["who won", "who won the game?", "what was the score?", "the final result", ""]) {
    assert.equal(parseTeam(q), null, `${q} produced a team`);
  }
});

test("every side-parameter spelling reaches the same fixture", async () => {
  await withFetch(espn(["basketball/nba"], scoreboard("Los Angeles Lakers", "Boston Celtics", 110, 104)), async () => {
    const shapes: Array<Record<string, string>> = [
      { team1: "Lakers", team2: "Celtics" },
      { team_1: "Lakers", team_2: "Celtics" },
      { teamA: "Lakers", teamB: "Celtics" },
      { home_team: "Lakers", away_team: "Celtics" },
      { home: "Lakers", away: "Celtics" },
      { team_a: "Lakers", team_b: "Celtics" },
      { teams: "Lakers vs Celtics" },
      { match: "Lakers vs Celtics" },
      { fixture: "Lakers vs Celtics" },
      { event: "Lakers vs Celtics" },
    ];
    for (const shape of shapes) {
      const body = await request({ ...shape, query: "Who won?" });
      assert.equal(body.verdict, "result", JSON.stringify(shape));
      assert.match(String(body.reason), /Los Angeles Lakers beat Boston Celtics 110-104/, JSON.stringify(shape));
    }
  });
});

test("one named side is answered with that team's most recent finished game", async () => {
  await withFetch(espn(["basketball/nba"], scoreboard("Los Angeles Lakers", "Boston Celtics", 110, 104)), async () => {
    const shapes: Array<Record<string, string>> = [{ team: "Lakers" }, { team1: "Lakers" }, { club: "Lakers" }];
    for (const shape of shapes) {
      const body = await request(shape);
      assert.equal(body.verdict, "result", JSON.stringify(shape));
      assert.match(String(body.reason), /Los Angeles Lakers beat Boston Celtics 110-104/, JSON.stringify(shape));
    }
    const prose = await request({ query: "Who won the Lakers game?" });
    assert.equal(prose.verdict, "result");
    assert.match(String(prose.reason), /Los Angeles Lakers beat Boston Celtics 110-104/);
  });
});

test("a name more than one league answers for is refused rather than guessed", async () => {
  // "Rangers" is a team in both probes; with no league named there is nothing
  // to tell the hockey one from the baseball one.
  const both = espn(["hockey/nhl"], scoreboard("New York Rangers", "Boston Bruins", 4, 2));
  const ambiguous: typeof fetch = (async (url: string | URL | Request) => {
    const href = String(url);
    if (href.includes("baseball/mlb") && href.includes("espn")) {
      return json(scoreboard("Texas Rangers", "Houston Astros", 6, 3));
    }
    return both(url as string);
  }) as typeof fetch;
  await withFetch(ambiguous, async () => {
    const r = await lookupGame("Who won the Rangers game?");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "ambiguous_team");
  });
});

test("naming the league resolves the same ambiguous name", async () => {
  await withFetch(espn(["hockey/nhl"], scoreboard("New York Rangers", "Boston Bruins", 4, 2)), async () => {
    const r = await lookupGame("Who won the Rangers game in the NHL?");
    assert.equal(r.verdict, "result");
    assert.equal(r.winner, "New York Rangers");
  });
});

test("a request naming no team at all is still refused", async () => {
  await withFetch(espn([], null), async () => {
    const body = await request({ query: "Who won the game last night?" });
    assert.equal(body.verdict, "unknown");
    assert.equal(body.error, "no_fixture");
  });
});

test("a placeholder side is not a team", async () => {
  await withFetch(espn([], null), async () => {
    const body = await request({ team1: "unknown", team2: "N/A" });
    assert.equal(body.error, "no_fixture");
  });
});

test("one named side that played nothing says so without inventing an opponent", async () => {
  await withFetch(espn([], null), async () => {
    const r = await lookupGame("Who won the Knicks game?");
    assert.equal(r.verdict, "not_found");
    assert.match(r.reason, /No completed Knicks fixture could be found/);
    assert.doesNotMatch(r.reason, /versus\s*\./);
  });
});
