import { test } from "node:test";
import assert from "node:assert/strict";
import { booleanQuery, extractSubject, searchNews } from "../src/newssearch";
import { openGate } from "./licence-fixtures";

openGate("google-news");

// Routed NEWS_SEARCH questions, 2026-11-25.
test("a question's opening auxiliary is not part of its subject", () => {
  assert.equal(extractSubject("Will Piramal Critical launch Mitigo?"), "Piramal Critical launch Mitigo");
  assert.equal(extractSubject("Will Check Point disclose major breach?"), "Check Point disclose major breach");
  // Not a question: the name stays whole.
  assert.equal(extractSubject("Will Smith new film"), "Will Smith film");
});

test("an OR query keeps its entity and its operators", () => {
  assert.deepEqual(booleanQuery('"Siemens AG" fraud OR dispute OR lawsuit OR recall OR scam'), {
    entity: "Siemens AG", query: '"Siemens AG" fraud OR dispute OR lawsuit OR recall OR scam',
    terms: ["fraud", "dispute", "lawsuit", "recall", "scam"],
  });
  assert.equal(booleanQuery("Helio Fintech Ltd United Kingdom dissolved OR liquidation OR shell company OR fraud")?.entity, "Helio Fintech Ltd");
  assert.equal(booleanQuery("Latest news on the Fed or the ECB"), null);
});

const item = (title: string, day: string): string =>
  `<item><title>${title}</title><link>https://news.google.com/rss/articles/x</link><pubDate>${day}</pubDate></item>`;

test("an OR query is searched whole, and every article must name the entity", async () => {
  const real = globalThis.fetch;
  let searched = "";
  globalThis.fetch = (async (u: string) => {
    searched = new URL(String(u)).searchParams.get("q") ?? "";
    return new Response(`<rss><channel>${[
      item("Federal Court rules Siemens controls related-entity documents - Australasian Lawyer", "Tue, 21 Apr 2026 08:00:00 GMT"),
      item("Lawsuit over recall at an unrelated carmaker - Example News", "Tue, 24 Nov 2026 08:00:00 GMT"),
    ].join("")}</channel></rss>`, { status: 200 });
  }) as typeof fetch;
  try {
    const r = await searchNews('"Siemens AG" fraud OR dispute OR lawsuit OR recall OR scam');
    assert.equal(searched, '"Siemens AG" fraud OR dispute OR lawsuit OR recall OR scam');
    assert.equal(r.verdict, "articles");
    assert.equal(r.subject, "Siemens AG");
    assert.deepEqual(r.articles.map((a) => a.source), ["Australasian Lawyer"]);
    assert.match(r.reason, /^Recent coverage of Siemens AG \(fraud, dispute, lawsuit, recall, scam\) includes: "Federal Court rules Siemens/);
  } finally {
    globalThis.fetch = real;
  }
});
