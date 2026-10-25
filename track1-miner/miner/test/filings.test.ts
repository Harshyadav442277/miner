import { test } from "node:test";
import assert from "node:assert/strict";
import { figuresFor, filingAsk, monitorFilings, usdFacts } from "../src/filings";

const NOW = new Date("2026-10-14T00:00:00Z");

test("the issuer, form and window are read from the question", () => {
  assert.deepEqual(filingAsk("Has Tesla filed its latest 10-Q on SEC EDGAR, on what date was it accepted?", "", "", NOW),
    { company: "Tesla", form: "10-Q", since: null, latest: true });
  assert.deepEqual(filingAsk("Did Apple file an 8-K in the last 30 days?", "", "", NOW),
    { company: "Apple", form: "8-K", since: "2026-09-14", latest: false });
  assert.equal(filingAsk("Has NVIDIA filed its annual report?", "", "", NOW).form, "10-K");
  assert.equal(filingAsk("What is Microsoft's most recent filing?", "", "", NOW).company, "Microsoft");
  assert.equal(filingAsk("anything", "AAPL", "10-k/a", NOW).form, "10-K/A");
});

// Tesla's GrossProfit facts as tagged in its Q2 2026 10-Q (accession 0001628280-26-049270, read 2026-10-14).
const ACC = "0001628280-26-049270";
const fact = (start: string, end: string, val: number, accn = ACC) => ({ start, end, val, accn });
const TESLA = {
  Revenues: [fact("2026-01-01", "2026-06-30", 50_000_000_000), fact("2026-04-01", "2026-06-30", 28_240_000_000), fact("2025-04-01", "2025-06-30", 22_500_000_000)],
  GrossProfit: [fact("2026-01-01", "2026-06-30", 9_471_000_000), fact("2026-04-01", "2026-06-30", 4_751_000_000), fact("2025-04-01", "2025-06-30", 3_878_000_000),
    fact("2026-04-01", "2026-06-30", 1, "0000000000-00-000000")],
  NetIncomeLoss: [fact("2026-04-01", "2026-06-30", 1_110_000_000)],
};

test("the filing's own quarter is picked over its year-to-date figure and other filings' facts", () => {
  const r = figuresFor(TESLA, ACC, "2026-06-30")!;
  assert.equal(r.current.period_start, "2026-04-01");
  assert.equal(r.current.revenue, 28_240_000_000);
  assert.equal(r.current.gross_margin_pct, 16.8);
  assert.equal(r.current.net_income, 1_110_000_000);
  assert.equal(r.prior!.gross_margin_pct, 17.2);
});

test("a 52/53-week year still finds the year-earlier comparison", () => {
  const nv = {
    Revenues: [fact("2025-01-27", "2026-01-25", 215_940_000_000, "N"), fact("2024-01-29", "2025-01-26", 130_500_000_000, "N")],
    GrossProfit: [fact("2025-01-27", "2026-01-25", 153_530_000_000, "N"), fact("2024-01-29", "2025-01-26", 97_860_000_000, "N")],
  };
  const r = figuresFor(nv, "N", "2026-01-25")!;
  assert.equal(r.current.gross_margin_pct, 71.1);
  assert.equal(r.prior!.period_end, "2025-01-26");
});

test("a filed 10-Q answers its date, acceptance time, accession, link and margin from the filing", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    if (u.endsWith("company_tickers.json")) {
      return Response.json(Object.fromEntries(Array.from({ length: 1_001 }, (_, i) => [String(i), i === 0
        ? { cik_str: 1318605, ticker: "TSLA", title: "Tesla, Inc." } : { cik_str: 9_000_000 + i, ticker: `X${i}`, title: `Filler Holdings ${i}` }])));
    }
    if (u.includes("/submissions/")) {
      return Response.json({ name: "Tesla, Inc.", tickers: ["TSLA"], filings: { recent: {
        form: ["8-K", "10-Q"], filingDate: ["2026-10-02", "2026-07-23"], acceptanceDateTime: ["2026-10-02T13:04:26.000Z", "2026-07-23T01:02:31.000Z"],
        accessionNumber: ["0001628280-26-064366", ACC], reportDate: ["2026-10-02", "2026-06-30"], items: ["2.02,9.01", ""],
        primaryDocument: ["tsla-20261002.htm", "tsla-20260630.htm"],
      } } });
    }
    const tag = u.match(/us-gaap\/(\w+)\.json/)?.[1] ?? "";
    return Response.json({ units: { USD: (TESLA as Record<string, unknown>)[tag] ?? [] } });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });

  const r = await monitorFilings("Has Tesla filed its latest 10-Q on SEC EDGAR, on what date was it accepted, and what did it disclose about margins?", "", "", NOW);
  assert.equal(r.verdict, "filed");
  assert.equal(r.filing!.accession, ACC);
  assert.match(r.reason, /^Yes: Tesla, Inc\.'s latest 10-Q was filed on 2026-07-23 and accepted by EDGAR at 01:02 UTC, for the period ended 2026-06-30/);
  assert.match(r.reason, /a gross margin of 16\.8% against 17\.2% a year earlier/);
  assert.match(r.reason, /tsla-20260630\.htm/);

  const eightK = await monitorFilings("Did Tesla file an 8-K in the last 30 days?", "", "", NOW);
  assert.equal(eightK.verdict, "filed");
  assert.match(eightK.reason, /^Yes: Tesla, Inc\. has filed an 8-K since 2026-09-14/);
  assert.match(eightK.reason, /item 2\.02 \(Results of Operations and Financial Condition\)/);

  const none = await monitorFilings("Has Tesla filed a 10-K since 2026-09-01?", "", "", NOW);
  assert.equal(none.verdict, "not_filed");
});

// G210, 2026-10-25: SEC answered Coca-Cola's Revenues concept with "USD": {} and the
// route crashed, reporting the provider as down.
test("a concept whose USD facts are not a list has no facts, rather than crashing", () => {
  assert.deepEqual(usdFacts({ units: { USD: {} } }), []);
  assert.deepEqual(usdFacts({ units: {} }), []);
  assert.deepEqual(usdFacts(null), []);
  const facts = [{ end: "2025-12-31", val: 1, accn: "a" }];
  assert.deepEqual(usdFacts({ units: { USD: facts } }), facts);
});
