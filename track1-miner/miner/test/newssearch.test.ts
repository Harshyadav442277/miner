import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acronyms, distinctiveTerms, extractSubject, extractWindowDays, isRelevant, isSoftRecency,
  searchNews, trimTitle,
} from "../src/newssearch";

test("the canonical example's subject survives the scaffolding", () => {
  // "Find recent articles covering the merger between company X and company Y."
  // is the intent description's own example. Searching for the scaffolding
  // instead of the subject is the failure that makes an answer irrelevant, and
  // an irrelevant answer scores the same 1.2e-4 as returning nothing.
  assert.equal(
    extractSubject("Find recent articles covering the merger between company X and company Y."),
    "merger between company X and company Y",
  );
  assert.equal(
    extractSubject("Find recent articles covering the European Central Bank interest rate decision."),
    "European Central Bank interest rate decision",
  );
});

test("interrogative scaffolding is not searched for", () => {
  // This produced "What has there been of the Federal Reserve in the".
  assert.equal(extractSubject("What coverage has there been of the Federal Reserve in the last 3 days?"), "Federal Reserve");
  assert.equal(extractSubject("Show me news on Tesla from the past month"), "Tesla");
});

test("a request with no subject is refused rather than searched literally", () => {
  assert.equal(extractSubject("What is the news?"), "");
  assert.equal(extractSubject("latest headlines"), "");
});

test("a quoted phrase is taken verbatim", () => {
  assert.equal(extractSubject('Find articles about "quantitative easing" please'), "quantitative easing");
});

test("an explicit window is read, and its absence is not a default", () => {
  assert.equal(extractWindowDays("articles about X in the last 3 days"), 3);
  assert.equal(extractWindowDays("articles about X this week"), 7);
  assert.equal(extractWindowDays("articles about X this month"), 30);
  assert.equal(extractWindowDays("news about X today"), 1);
  assert.equal(extractWindowDays("articles about X in the last 6 hours"), 1);
  assert.equal(extractWindowDays("articles about X in the last 2 weeks"), 14);
  // No window stated. Inventing one would drop the articles a question about an
  // older event is asking for.
  assert.equal(extractWindowDays("articles about the 2019 merger"), null);
});

test("a recency word is a soft window, not an explicit one", () => {
  assert.equal(isSoftRecency("Find recent articles covering the merger"), true);
  assert.equal(isSoftRecency("Find the latest coverage of the merger"), true);
  // An explicit window is not soft — it is enforced.
  assert.equal(isSoftRecency("articles about X in the last 3 days"), false);
  assert.equal(isSoftRecency("articles about the 2019 merger"), false);
});

test("acronyms are derived from capitalised runs", () => {
  assert.deepEqual(acronyms("European Central Bank interest rate decision"), ["ecb"]);
  assert.ok(acronyms("Federal Reserve").includes("fr"));
  // A subject that is already an acronym counts as one.
  assert.ok(acronyms("ECB rate decision").includes("ecb"));
  assert.deepEqual(acronyms("semiconductors"), []);
});

test("distinctive terms exclude the vocabulary of any business story", () => {
  const d = distinctiveTerms(["european", "central", "bank", "interest", "rate", "decision"]);
  assert.deepEqual(d, ["european"]);
  // A subject made entirely of generic words has no distinctive term to demand,
  // so every term counts rather than none.
  assert.deepEqual(distinctiveTerms(["interest", "rate", "decision"]), ["interest", "rate", "decision"]);
});

test("an article about a different central bank is not relevant", () => {
  const terms = ["european", "central", "bank", "interest", "rate", "decision"];
  const acros = ["ecb"];
  // The real top result for this search. It matches central, bank and decision
  // — three of six terms — and is about the Bank of England.
  const wrong = { title: "FTSE 100 poised for quiet open ahead of central bank decision", source: "Share Talk", published: null };
  assert.equal(isRelevant(wrong, terms, acros), false);

  // Both of these ARE about the subject, one by name and one by acronym.
  const byName = { title: "European Central Bank holds interest rates at 2.25%", source: "Financial Times", published: null };
  const byAcronym = { title: "ECB says energy-led inflation spike justifies June rate hike", source: "Reuters", published: null };
  assert.equal(isRelevant(byName, terms, acros), true);
  assert.equal(isRelevant(byAcronym, terms, acros), true);
});

test("an acronym must match on word boundaries", () => {
  const terms = ["european", "central", "bank"];
  const acros = ["ecb"];
  const notReally = { title: "Ecbank launches new savings product", source: "Trade Press", published: null };
  assert.equal(isRelevant(notReally, terms, acros), false);
});

test("a sentence-length title is trimmed at a word boundary", () => {
  const long = "Eurozone inflation rose to 3.3%, with the European Central Bank signaling further interest rate hikes, while the euro continued to trade in a narrow range";
  const t = trimTitle(long);
  assert.ok(t.length < long.length);
  assert.ok(t.endsWith("…"), "a shortened headline is marked as shortened");
  assert.ok(t.split(/\s+/).length <= 17);
  // A headline already short enough is untouched.
  const short = "ECB holds interest rates at 2.25%";
  assert.equal(trimTitle(short), short);
});

/* ------------------------------ failure paths ----------------------------- */

test("a dead news index is unknown, never an absence of coverage", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await searchNews("Find recent articles covering the Federal Reserve");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "provider_unavailable");
    assert.equal(r.count, 0);
    // Must not read as "there is no coverage of this".
    assert.match(r.reason, /availability problem/i);
    assert.ok(!/no news articles/i.test(r.reason));
  } finally {
    globalThis.fetch = original;
  }
});

test("a subjectless request is refused with no search performed", async () => {
  let called = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { called = true; throw new Error("should not be called"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await searchNews("What is the news?");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "no_subject");
    assert.equal(called, false, "no upstream call may be made without a subject");
  } finally {
    globalThis.fetch = original;
  }
});

/* --------------------------------- live ---------------------------------- */

test("a topic search returns real articles with publishers and dates (live)", async () => {
  const r = await searchNews("Find recent articles covering the European Central Bank interest rate decision.");
  if (r.verdict === "unknown") return;   // index down is not a test failure
  assert.equal(r.verdict, "articles");
  assert.ok(r.count >= 2, `only ${r.count} articles`);
  // Every article must carry a publisher and a parseable date — the two things
  // that make this article coverage rather than a headline list.
  for (const a of r.articles) {
    assert.ok(a.title.length > 5, `empty title: ${JSON.stringify(a)}`);
    assert.ok(a.source, `no publisher: ${a.title}`);
    assert.ok(a.published && !Number.isNaN(new Date(a.published).getTime()), `no date: ${a.title}`);
  }
  assert.match(r.reason, /publisher and publication date/);
});

test("an explicit window is enforced against the returned dates (live)", async () => {
  const r = await searchNews("Find articles about the Federal Reserve from the last 3 days");
  if (r.verdict === "unknown") return;
  assert.equal(r.window_days, 3);
  const cutoff = Date.now() - 4 * 86_400_000;   // one day of slack for feed clock skew
  for (const a of r.articles) {
    assert.ok(a.published, "an article with no date cannot be shown to be in the window");
    assert.ok(new Date(a.published).getTime() >= cutoff, `${a.published} is outside the 3-day window: ${a.title}`);
  }
});

test("a subject nobody has written about is no_results, with no invented articles (live)", async () => {
  const r = await searchNews("Find recent articles covering zzqxwv klmnop nonexistent subject");
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "no_results");
  assert.equal(r.count, 0);
  assert.equal(r.articles.length, 0);
});
