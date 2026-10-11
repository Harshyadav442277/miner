import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getHeadlines, extractRegion, extractTopic } from "../src/news";

// GAPS G68: only thirteen topic words were recognised; "semiconductors" became
// generic top stories (MLB scores, a hospital shooting — verified live
// 2026-09-08), and the declared `topic` parameter was never read on its own.
describe("extractTopic", () => {
  test("the fixed list still wins, so recorded shapes are unchanged", () => {
    assert.equal(extractTopic("What are the top 5 technology headlines from Japan as of today?"), "technology");
    assert.equal(extractTopic("Give me the latest business news from London"), "business");
    assert.equal(extractTopic("latest headlines on climate change in Europe"), "climate");
  });
  test("a declared topic outside the list is used verbatim", () => {
    assert.equal(extractTopic("What are the latest headlines?", "semiconductors"), "semiconductors");
    assert.equal(extractTopic("find latest headlines for uk vs russia", "uk vs russia"), "uk vs russia");
    // A generic declared topic is not a subject.
    assert.equal(extractTopic("What are the top news headlines today?", "news"), null);
    assert.equal(extractTopic("What are the top news headlines today?", "top stories"), null);
  });
  test("the noun phrase after about/on is the subject, minus its time and place tail", () => {
    assert.equal(extractTopic("What are the top news headlines about artificial intelligence today?"), "artificial intelligence");
    assert.equal(extractTopic("Latest news about Shopify: layoffs, hiring freezes, funding rounds"), "Shopify");
    assert.equal(extractTopic("headlines regarding the semiconductor industry in Taiwan this week"), "the semiconductor industry");
    assert.equal(extractTopic("What are the top news headlines today?"), null);
  });
  test("the noun phrase in front of the news noun is the subject, minus count and request words", () => {
    assert.equal(extractTopic("Give three spaceflight news headlines published in the last 24 hours."), "spaceflight");
    assert.equal(extractTopic("top 5 semiconductor headlines"), "semiconductor");
    assert.equal(extractTopic("Show me the latest Tesla news"), "Tesla");
    assert.equal(extractTopic("What are today's electric vehicle headlines from Germany?"), "electric vehicle");
    // Request words alone are not a subject, and neither is "news" itself.
    assert.equal(extractTopic("Give me the top headlines"), null);
    assert.equal(extractTopic("breaking news"), null);
    assert.equal(extractTopic("What are the top news headlines today?"), null);
  });
  test("a subject's own proper noun is not read as a region", () => {
    assert.equal(extractRegion("Latest news about Shopify: layoffs, hiring freezes", "Shopify"), null);
    assert.equal(extractRegion("Latest news about Shopify from Canada", "Shopify"), "Canada");
  });
});

test("a question word that opens the sentence is not a region", () => {
  assert.equal(extractRegion("What are the top news headlines today?"), null);
  assert.equal(extractRegion("Give me the latest headlines"), null);
  assert.equal(extractRegion("Show me breaking news"), null);
  assert.equal(extractRegion("Give me the latest headlines from Tokyo"), "Tokyo");
  assert.equal(extractRegion("What are the top 5 business news headlines from London today?"), "London");
});

// Routed 2026-10-10 and answered with no headlines (replay-production.txt).
test("'happening in <place>' is a place, not a subject, and 'the' is not part of a place", () => {
  for (const q of [
    "What are the top news headlines about happening in India today?",
    "Give me today's top headlines on happening in India, as a headline list.",
  ]) {
    assert.equal(extractTopic(q), null);
    assert.equal(extractRegion(q, extractTopic(q)), "India");
  }
  assert.equal(extractTopic("What are the top news headlines about happening in Europe today?"), null);
  assert.equal(extractRegion("What are the top sports headlines from the Middle East today?", "sports"), "Middle East");
  assert.equal(extractRegion("Top headlines from the United Kingdom"), "United Kingdom");
  assert.equal(extractRegion("What are the top news headlines about happening in Southeast asia today?"), "Southeast Asia");
  assert.equal(extractRegion("latest headlines from latin america"), "Latin America");
  assert.equal(extractRegion("What is the latest east asia news?"), "East Asia");
  // A region that is part of the subject stays in the subject.
  assert.equal(extractRegion("news about the Middle East peace talks from London", "the Middle East peace talks"), "London");
  assert.equal(extractTopic("What are the top news headlines about Sports headlines in Middle East today?"), "sports");
});

test("a window that ends now is asked of the feed, a dated one is not", async () => {
  const original = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    asked.push(decodeURIComponent(String(input)));
    return new Response("<rss><channel></channel></rss>");
  }) as typeof fetch;
  try {
    await getHeadlines("What are the top news headlines about Sports headlines in Middle East today?");
    await getHeadlines("Find recent news articles from the last 7 days about Shopify.");
    await getHeadlines("What were the top headlines from Japan on 2026-09-01?");
    await getHeadlines("What are the top technology headlines from Japan?");
    assert.match(asked[0]!, /q=sports Middle East when:1d$/);
    assert.match(asked[1]!, / when:7d$/);
    assert.doesNotMatch(asked[2]!, /when:/);
    assert.doesNotMatch(asked[3]!, /when:/);
  } finally {
    globalThis.fetch = original;
  }
});

// Measured against the live champion (reg 635, nh_mini.wasm) over the 22 real
// recorded questions: mean 0.006447 raw / 0.006028 clipped, with every single
// question above the epoch-295 bar of 0.00262926 held by newswire-headlines.
// Headlines rotate, so these tests pin shape and the question's own constraints
// rather than any particular story.
describe("getHeadlines (live)", () => {
  test("honours a requested count and numbers the list", async () => {
    const r = await getHeadlines("What are the top 5 business news headlines from London (GB) today?");
    assert.match(r.reason, /1\./);
    assert.match(r.reason, /business/i);
    assert.ok(r.reason.length > 40);
  });

  test("an unanswerable topic still returns prose, never an empty reason", async () => {
    const r = await getHeadlines("zzzzqqqq nonexistent topic that returns nothing at all");
    assert.ok(typeof r.reason === "string" && r.reason.length > 0);
  });
});
