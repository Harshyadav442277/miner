import { test } from "node:test";
import assert from "node:assert/strict";
import { filingAsk, monitorFilings, namedPeriod } from "../src/filings";

// Its own file: resolveCik caches the ticker list per process. filing_count was null for the period "2025",
// "FY2025" and "Q3 2025" on 2026-11-08: only relative phrases ("last 12 months") were read as a window.

test("a bare year, a fiscal year and a quarter are read as windows", () => {
  const now = new Date("2026-11-08T00:00:00Z");
  assert.deepEqual(namedPeriod("2025", true), { since: "2025-01-01", until: "2025-12-31" });
  assert.deepEqual(namedPeriod("Q3 2025", true), { since: "2025-07-01", until: "2025-09-30" });
  assert.deepEqual(namedPeriod("2025 Q4", true), { since: "2025-10-01", until: "2025-12-31" });
  assert.deepEqual(namedPeriod("the second quarter of 2026", true), { since: "2026-04-01", until: "2026-06-30" });
  assert.deepEqual(namedPeriod("FY2025", true), { fiscal_year: 2025 });
  assert.equal(namedPeriod("Apple's 2025 10-K", false), null, "a year in a question needs a preposition");
  assert.deepEqual(namedPeriod("How many filings did Apple make in 2025?", false), { since: "2025-01-01", until: "2025-12-31" });
  assert.equal(namedPeriod("since 2025-03-01", false), null, "a date is not a year");
  const a = filingAsk("How many filings did Apple make?", "", "", now, "2025");
  assert.deepEqual([a.since, a.until, a.latest], ["2025-01-01", "2025-12-31", false]);
  assert.equal(filingAsk("How many filings did Apple make?", "", "", now, "FY2025").fiscal_year, 2025);
  assert.equal(filingAsk("How many filings did Apple make?", "", "", now, "last 12 months").until, undefined, "a relative window runs to now");
});

test("filing_count counts the filings inside a closed window", async (t) => {
  const now = new Date("2026-11-08T00:00:00Z");
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    if (u.endsWith("company_tickers.json")) {
      return Response.json(Object.fromEntries(Array.from({ length: 1_001 }, (_, i) => [String(i), i === 0
        ? { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." } : { cik_str: 9_000_000 + i, ticker: `X${i}`, title: `Filler Holdings ${i}` }])));
    }
    if (u.includes("/submissions/")) {
      const rows = [["8-K", "2026-01-29", "2026-01-29"], ["10-K", "2025-10-31", "2025-09-27"], ["4", "2025-10-02", ""],
        ["8-K", "2025-07-31", "2025-07-31"], ["10-Q", "2025-08-01", "2025-06-28"], ["10-Q", "2025-05-02", "2025-03-29"], ["10-K", "2024-11-01", "2024-09-28"]];
      return Response.json({ name: "Apple Inc.", tickers: ["AAPL"], filings: { recent: {
        form: rows.map((r) => r[0]), filingDate: rows.map((r) => r[1]), acceptanceDateTime: rows.map((r) => `${r[1]}T20:30:00.000Z`),
        accessionNumber: rows.map((_, i) => `0000320193-25-0000${i}`), reportDate: rows.map((r) => r[2]), items: rows.map(() => ""),
        primaryDocument: rows.map((_, i) => `d${i}.htm`),
      } } });
    }
    return Response.json({ units: { USD: [] } });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });

  const year = await monitorFilings("How many filings did Apple make?", "", "", now, "2025");
  assert.equal(year.filing_count, 5, "every form filed in 2025, not 2024's 10-K or 2026's 8-K");
  assert.equal(year.counted_since, "2025-01-01");
  assert.equal(year.counted_until, "2025-12-31");
  assert.match(year.reason, /^Apple Inc\. has made 5 EDGAR filings between 2025-01-01 and 2025-12-31/);
  const q3 = await monitorFilings("How many filings did Apple make?", "", "", now, "Q3 2025");
  assert.equal(q3.filing_count, 2, "the July 8-K and the August 10-Q");
  const fy = await monitorFilings("How many filings did Apple make?", "", "", now, "FY2025");
  assert.equal(fy.filing_count, 4, "the filings whose period ends in 2025; the Form 4 states none");
  const tenQ = await monitorFilings("How many 10-Q filings did Apple make in 2025?", "", "", now);
  assert.equal(tenQ.filing_count, 2);
});
