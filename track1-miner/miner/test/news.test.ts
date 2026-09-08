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
