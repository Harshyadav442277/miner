import { test } from "node:test";
import assert from "node:assert/strict";
import { extractIp, geolocate } from "../src/geo";
import { getHeadlines } from "../src/news";
import { lookupGame, parseTeams } from "../src/gameresult";
import { phraseScore } from "../src/sportsscore";

async function mocked(stub: typeof fetch, run: () => Promise<void>) {
  const previous = globalThis.fetch;
  globalThis.fetch = stub;
  try { await run(); } finally { globalThis.fetch = previous; }
}

test("compressed IPv6 is validated as a whole address, including loopback", async () => {
  for (const text of ["::1", "Where is ::1 located?", "Locate [::1]", "http://[::1]:8080/"]) {
    assert.equal(extractIp(text), "::1", text);
  }
  assert.equal(extractIp("Address ::ffff:192.0.2.7."), "::ffff:192.0.2.7");
  assert.equal(extractIp("2001:db8:0:0:0:0:0:1"), "2001:db8:0:0:0:0:0:1");
  for (const invalid of ["9999:9999::gggg", "2001::db8::1", "8.8.8.8.8", "prefix8.8.8.8", "1.2.3.999"]) {
    assert.equal(extractIp(invalid), null, invalid);
  }
  await mocked((async () => { throw new Error("special ranges must not call a provider"); }) as typeof fetch, async () => {
    assert.equal((await geolocate("Where is ::1 located?")).verdict, "loopback");
    assert.equal((await geolocate("::")).verdict, "reserved");
    assert.equal((await geolocate("0000:0000:0000:0000:0000:0000:0000:0001")).verdict, "loopback");
  });
});

test("headlines filter publication times and duplicate titles before applying a word count", async () => {
  const now = Date.now();
  const item = (title: string, age: number) => `<item><title>${title} - Example News</title><pubDate>${new Date(now-age).toUTCString()}</pubDate></item>`;
  const xml = `<rss><channel>${item("Spaceflight stale launch", 72*3600000)}${item("Spaceflight future launch", -86400000)}
    ${item("Spaceflight new launch", 10000)}${item("Spaceflight new launch", 20000)}${item("Spaceflight lunar mission", 30000)}
    ${item("Spaceflight orbital mission", 40000)}${item("Spaceflight extra mission", 50000)}</channel></rss>`;
  await mocked((async () => new Response(xml)) as typeof fetch, async () => {
    const r = await getHeadlines("Give three spaceflight news headlines published in the last 24 hours.", 6, 8000, "spaceflight");
    assert.equal(r.count, 3);
    assert.deepEqual(r.headlines.map(h => h.title), ["Spaceflight new launch", "Spaceflight lunar mission", "Spaceflight orbital mission"]);
    assert.match(r.reason, /last 24 hours/i);
    assert.doesNotMatch(r.reason, /stale|future|extra/);
  });
});

test("a headline shortfall never fills the requested window with old items", async () => {
  const xml = `<rss><channel><item><title>Spaceflight old story - Example News</title><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item></channel></rss>`;
  await mocked((async () => new Response(xml)) as typeof fetch, async () => {
    const r = await getHeadlines("Give 3 spaceflight headlines from the last 2 hours.", 6, 8000, "spaceflight");
    assert.equal(r.count, 0);
    assert.equal(r.verdict, "unknown");
    assert.match(r.reason, /last 2 hours/i);
  });
});

test("fixture names are separated before long competition and date suffixes are bounded", () => {
  assert.deepEqual(parseTeams("Who won Argentina vs France in the 2022 FIFA World Cup final on 2022-12-18?"), { a:"Argentina", b:"France" });
  assert.deepEqual(parseTeams("What was the Argentina vs France score in the 2022 FIFA World Cup final on 2022-12-18?"), { a:"Argentina", b:"France" });
  assert.deepEqual(parseTeams("Who won Manchester United versus Liverpool in the English Premier League on 2025-01-05?"), { a:"Manchester United", b:"Liverpool" });
  assert.equal(parseTeams("Who won the match?"), null);
});

test("a World Cup penalty shootout reports the actual winner and both score types", async () => {
  await mocked((async input => {
    const url = String(input);
    if (!url.includes("/soccer/fifa.world/scoreboard")) return Response.json({ events:[], event:[], teams:null });
    return Response.json({leagues:[{name:"FIFA World Cup"}],events:[{date:"2022-12-18T15:00Z",competitions:[{
      status:{type:{state:"post",completed:true,detail:"FT-Pens"}},
      competitors:[
        {homeAway:"home",score:"3",shootoutScore:4,winner:true,team:{displayName:"Argentina"}},
        {homeAway:"away",score:"3",shootoutScore:2,winner:false,team:{displayName:"France"}},
      ],
    }]}]});
  }) as typeof fetch, async () => {
    const r = await lookupGame("Who won Argentina vs France in the 2022 FIFA World Cup final on 2022-12-18?");
    assert.equal(r.verdict, "result");
    assert.equal(r.winner, "Argentina");
    assert.equal(r.home_score, 3);
    assert.match(r.reason, /4-2 on penalties/);
    assert.match(r.reason, /3-3/);
    assert.doesNotMatch(r.reason, /neither side won/);
    const score = phraseScore(r);
    assert.match(score.reason, /4-2 on penalties/);
    assert.doesNotMatch(score.reason, /most recent|No fixture between them is in progress/);
  });
});
