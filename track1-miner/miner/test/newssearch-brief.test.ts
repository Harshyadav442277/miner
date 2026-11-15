import { test } from "node:test";
import assert from "node:assert/strict";
import { briefFrom, searchNews } from "../src/newssearch";
import { scoredFields } from "../src/intent-fields";
import { resetPhraseState } from "../src/llm";

const brief = (b: string): string => JSON.stringify({ brief: b });

test("briefFrom: one whole sentence of at most 80 characters, never an ellipsis", () => {
  assert.equal(briefFrom(brief("SpaceX launched Starship again and caught the booster")), "SpaceX launched Starship again and caught the booster.");
  const long = briefFrom(brief("SpaceX launched its Starship rocket on another test flight from Texas, and the booster was caught by the tower arms again."));
  assert.ok(long && long.length <= 80 && long.endsWith(".") && !long.includes("…"), String(long));
  assert.equal(briefFrom(brief("SpaceX launched Starship again…")), null);
  assert.equal(briefFrom(brief("Starship launched.")), null, "under four words says nothing");
  assert.equal(briefFrom("no json"), null);
  assert.equal(briefFrom(null), null);
});

test("the mapper keeps the route's brief, and falls back to the top headline without one", () => {
  const articles = [{ title: "SpaceX Starship Launch", source: "TelegraphHerald.com", published: null }];
  assert.equal(scoredFields("/news-search", { verdict: "articles", articles, count: 1, brief: "SpaceX flew Starship again this week." }).brief, undefined,
    "a field the route sets is left as it is");
  assert.equal(scoredFields("/news-search", { verdict: "articles", articles, count: 1 }).brief, "SpaceX Starship Launch (TelegraphHerald.com)");
});

const day = (d: number): string => new Date(Date.now() - d * 86_400_000).toUTCString();
const RSS = `<?xml version="1.0"?><rss><channel>
<item><title>SpaceX Starship flies again from Starbase - Reuters</title><link>https://news.google.com/a</link><pubDate>${day(1)}</pubDate><source url="https://reuters.com">Reuters</source></item>
<item><title>SpaceX Starship booster caught by tower - AP News</title><link>https://news.google.com/b</link><pubDate>${day(2)}</pubDate><source url="https://apnews.com">AP News</source></item>
<item><title>What the SpaceX Starship flight means for NASA - The Verge</title><link>https://news.google.com/c</link><pubDate>${day(3)}</pubDate><source url="https://theverge.com">The Verge</source></item>
<item><title>SpaceX Starship launch watch party draws crowds - KENS5</title><link>https://news.google.com/d</link><pubDate>${day(4)}</pubDate><source url="https://kens5.com">KENS5</source></item>
</channel></rss>`;

test("searchNews: the model writes the brief from the top three headlines, passed as JSON data", async () => {
  const real = globalThis.fetch;
  const groq: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  process.env.GROQ_API_KEY = "test-key-not-real";
  resetPhraseState();
  globalThis.fetch = (async (input: string | URL, init?: { body?: string }) => {
    if (String(input).includes("api.groq.com")) {
      groq.push(JSON.parse(init!.body!));
      return new Response(JSON.stringify({ choices: [{ message: { content: brief("SpaceX flew Starship again and caught its booster.") } }] }), { status: 200 });
    }
    return new Response(RSS, { status: 200, headers: { "content-type": "application/rss+xml" } });
  }) as unknown as typeof fetch;
  try {
    const r = await searchNews("SpaceX Starship launch");
    assert.equal(r.verdict, "articles");
    assert.equal(r.brief, "SpaceX flew Starship again and caught its booster.");
    assert.equal(scoredFields("/news-search", r).brief, undefined, "the route's own brief is served");
    const sent = JSON.parse(groq[0]!.messages[1]!.content) as { request: string; headlines: Array<{ title: string; source: string | null }> };
    assert.equal(sent.request, "SpaceX Starship launch");
    assert.equal(sent.headlines.length, 3);
    assert.ok(sent.headlines.every((h) => h.title && h.source), JSON.stringify(sent.headlines));
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
});

test("searchNews without a key: no brief field, so the top headline is served as before", async () => {
  const real = globalThis.fetch;
  delete process.env.GROQ_API_KEY;
  globalThis.fetch = (async () => new Response(RSS, { status: 200 })) as unknown as typeof fetch;
  try {
    const r = await searchNews("SpaceX Starship launch");
    assert.equal(r.verdict, "articles");
    assert.equal(r.brief, undefined);
    assert.match(String(scoredFields("/news-search", r).brief), /SpaceX Starship/);
  } finally {
    globalThis.fetch = real;
  }
});
