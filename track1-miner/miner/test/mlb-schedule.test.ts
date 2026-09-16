import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupGame } from "../src/gameresult";

async function mocked(stub: typeof fetch, run: () => Promise<void>) {
  const previous = globalThis.fetch;
  globalThis.fetch = stub;
  try { await run(); } finally { globalThis.fetch = previous; }
}

const mlbGame = {
  gameDate: "2026-09-16T00:40:00Z",
  status: { abstractGameState: "Final", detailedState: "Final" },
  teams: {
    away: { score: 3, isWinner: false, team: { id: 135, name: "San Diego Padres" } },
    home: { score: 9, isWinner: true, team: { id: 115, name: "Colorado Rockies" } },
  },
};

test("an MLB result is answered from MLB's schedule when ESPN refuses the host (G84)", async () => {
  const urls: string[] = [];
  await mocked((async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("thesportsdb.com/api/v1/json/3/searchteams.php")) {
      return Response.json({ teams: [{ strTeam: "San Diego Padres", strLeague: "MLB" }] });
    }
    if (url.includes("site.api.espn.com")) return new Response("blocked", { status: 403 });
    if (url.includes("statsapi.mlb.com/api/v1/schedule")) {
      assert.match(url, /startDate=\d{4}-\d{2}-\d{2}&endDate=\d{4}-\d{2}-\d{2}/);
      return Response.json({ dates: [{ date: "2026-09-15", games: [mlbGame] }] });
    }
    return Response.json({ event: null, events: null, teams: null });
  }) as typeof fetch, async () => {
    const r = await lookupGame("Did the Padres beat the Rockies yesterday?", new Date("2026-09-16T12:00:00Z"));
    assert.equal(r.verdict, "result");
    assert.equal(r.winner, "Colorado Rockies");
    assert.equal(r.home_score, 9);
    assert.equal(r.away_score, 3);
    assert.match(r.reason, /Colorado Rockies beat San Diego Padres 9-3 in the Major League Baseball/);
    assert.ok(urls.some((u) => u.includes("statsapi.mlb.com")), "MLB schedule was consulted");
  });
});

test("the MLB schedule is not consulted for other sports", async () => {
  const urls: string[] = [];
  await mocked((async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("searchteams.php")) return Response.json({ teams: [{ strTeam: "Arsenal", strLeague: "English Premier League" }] });
    return Response.json({ events: [], leagues: [{ name: "English Premier League" }], event: null, teams: null });
  }) as typeof fetch, async () => {
    await lookupGame("Who won Arsenal vs Chelsea?", new Date("2026-09-16T12:00:00Z"));
    assert.ok(!urls.some((u) => u.includes("statsapi.mlb.com")));
  });
});
