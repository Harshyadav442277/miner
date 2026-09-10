import { test } from "node:test";
import assert from "node:assert/strict";
import { isRelevant, searchNews } from "../src/newssearch";

const article = (title: string, source = "Reuters") => ({ title, source, published: null });
test("a company name is not a substring inside an unrelated word", () => {
  assert.equal(isRelevant(article("Pineapple harvest breaks records"), ["apple"]), false);
  assert.equal(isRelevant(article("Meta unveils new model"), ["meta"]), true);
  assert.equal(isRelevant(article("Metal prices rise"), ["meta"]), false);
});
test("a publisher name alone does not make an article about the publisher", () => {
  assert.equal(isRelevant(article("Local flood closes railway", "BBC News"), ["bbc"], ["bbc"]), false);
  assert.equal(isRelevant(article("BBC announces annual results", "Reuters"), ["bbc"], ["bbc"]), true);
});
test("headline relevance retains possessives, plurals, and accented names", () => {
  assert.equal(isRelevant(article("Apple’s new phone launches"), ["apple"]), true);
  assert.equal(isRelevant(article("Semiconductors drive export growth"), ["semiconductor"]), true);
  assert.equal(isRelevant(article("Pokémon company announces new game"), ["pokemon"]), true);
});
test("future-dated news is not evidence of coverage in the past day", async () => {
  const original = globalThis.fetch;
  const future = new Date(Date.now() + 86_400_000).toUTCString();
  const recent = new Date(Date.now() - 60_000).toUTCString();
  globalThis.fetch = (async () => new Response(`<rss><channel>
    <item><title>Apple future announcement - Reuters</title><pubDate>${future}</pubDate></item>
    <item><title>Apple launches new device - Reuters</title><pubDate>${recent}</pubDate></item>
    </channel></rss>`)) as typeof fetch;
  try {
    const r = await searchNews("", "Apple", 1);
    assert.equal(r.count, 1);
    assert.equal(r.articles[0]?.title, "Apple launches new device");
  } finally { globalThis.fetch = original; }
});
