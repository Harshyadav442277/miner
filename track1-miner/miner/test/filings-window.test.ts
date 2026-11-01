import { test } from "node:test";
import assert from "node:assert/strict";
import { filingAsk, monitorFilings } from "../src/filings";

// Its own file: resolveCik caches the ticker list per process.
test("a named fiscal year and 'this month' bound the answer, not the latest filing of any date (2026-10-21)", async (t) => {
  // Apple's filing index as read on 2026-10-21: the FY2025 10-K and a
  // September 8-K, nothing for fiscal 2026 and nothing in October.
  const now = new Date("2026-10-21T08:00:00Z");
  assert.equal(filingAsk("Has Apple filed its 10-K for fiscal 2026?", "", "", now).fiscal_year, 2026);
  assert.equal(filingAsk("Has Nvidia filed an 8-K this month?", "", "", now).since, "2026-10-01");
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    if (u.endsWith("company_tickers.json")) {
      return Response.json(Object.fromEntries(Array.from({ length: 1_001 }, (_, i) => [String(i), i === 0
        ? { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." } : { cik_str: 9_000_000 + i, ticker: `X${i}`, title: `Filler Holdings ${i}` }])));
    }
    if (u.includes("/submissions/")) {
      return Response.json({ name: "Apple Inc.", tickers: ["AAPL"], filings: { recent: {
        form: ["8-K", "10-K"], filingDate: ["2026-09-03", "2025-10-31"], acceptanceDateTime: ["2026-09-03T20:30:00.000Z", "2025-10-31T14:01:00.000Z"],
        accessionNumber: ["0000320193-26-000090", "0000320193-25-000079"], reportDate: ["2026-09-02", "2025-09-27"], items: ["8.01", ""],
        primaryDocument: ["aapl-20260902.htm", "aapl-20250927.htm"],
      } } });
    }
    return Response.json({ units: { USD: [] } });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });

  const fy = await monitorFilings("Has Apple filed its 10-K for fiscal 2026?", "", "", now);
  assert.equal(fy.verdict, "not_filed");
  assert.match(fy.reason, /^No: Apple Inc\. has filed no 10-K for fiscal 2026/);
  assert.match(fy.reason, /last one was filed on 2025-10-31 for the period ended 2025-09-27/);
  const month = await monitorFilings("Has Apple filed an 8-K this month?", "", "", now);
  assert.equal(month.verdict, "not_filed");
  assert.match(month.reason, /since 2026-10-01/);
  const prior = await monitorFilings("Has Apple filed its 10-K for fiscal 2025?", "", "", now);
  assert.equal(prior.verdict, "filed");
});
