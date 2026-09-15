import { test } from "node:test";
import assert from "node:assert/strict";
import { getFinancialData } from "../src/financial";
import {
  annualFacts, fiscalYearAsked, fiscalYearOf, knownCompany, metricAsked, type Fact,
} from "../src/fundamentals";

// Rank-loss report F8 (2026-09-15): "What was Apple's revenue in fiscal year
// 2024?" was answered with today's trading range.

const k = (start: string, end: string, val: number, fy: number, filed: string, form = "10-K", fp = "FY"): Fact =>
  ({ start, end, val, fy, fp, form, filed });

/** Trimmed from Apple's live companyconcept response (CIK 320193), fetched 2026-09-15. */
const APPLE_CONTRACT_REVENUE: Fact[] = [
  k("2022-09-25", "2023-09-30", 383285000000, 2023, "2023-11-03"),
  k("2022-09-25", "2023-09-30", 383285000000, 2025, "2025-10-31"),
  k("2024-03-31", "2024-06-29", 85777000000, 2024, "2024-08-02", "10-Q", "Q3"),
  k("2023-10-01", "2024-06-29", 296105000000, 2024, "2024-08-02", "10-Q", "Q3"),
  // A 10-K can carry a three-month figure ending on the same day as the year.
  k("2024-06-30", "2024-09-28", 94930000000, 2024, "2024-11-01"),
  k("2023-10-01", "2024-09-28", 391035000000, 2024, "2024-11-01"),
  // The FY2025 10-K restates FY2024 under fy=2025.
  k("2023-10-01", "2024-09-28", 391035000000, 2025, "2025-10-31"),
  k("2024-09-29", "2025-09-27", 416161000000, 2025, "2025-10-31"),
];
/** Apple stopped filing `Revenues` in 2018; a stale tag must not win the latest period. */
const APPLE_REVENUES: Fact[] = [k("2017-10-01", "2018-09-29", 265595000000, 2018, "2018-11-05")];

const YAHOO_META = {
  chart: { result: [{ meta: {
    longName: "Apple Inc.", currency: "USD", regularMarketPrice: 230, chartPreviousClose: 228,
    regularMarketDayHigh: 231, regularMarketDayLow: 227, regularMarketVolume: 1000,
    fiftyTwoWeekHigh: 260, fiftyTwoWeekLow: 170,
  } }] },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const concept = (facts: Fact[]) => json({ units: { USD: facts } });

async function withFetch<T>(route: (url: string) => Response | Promise<Response>, run: (seen: string[]) => Promise<T>): Promise<T> {
  const real = globalThis.fetch;
  const seen: string[] = [];
  globalThis.fetch = (async (u: string) => {
    seen.push(String(u));
    return route(String(u));
  }) as typeof fetch;
  try {
    return await run(seen);
  } finally {
    globalThis.fetch = real;
  }
}

/** SEC for Apple from the fixtures; everything else 404. */
function appleSec(url: string): Response {
  if (url.includes("CIK0000320193/us-gaap/RevenueFromContractWithCustomerExcludingAssessedTax")) return concept(APPLE_CONTRACT_REVENUE);
  if (url.includes("CIK0000320193/us-gaap/Revenues.json")) return concept(APPLE_REVENUES);
  if (url.includes("query1.finance.yahoo.com/v8/finance/chart")) return json(YAHOO_META);
  return json({}, 404);
}

test("a metric, a company and a fiscal year are read from the question", () => {
  assert.equal(metricAsked("What was Apple's revenue in fiscal year 2024?")?.label, "revenue");
  assert.equal(metricAsked("What is NVIDIA's diluted EPS?")?.label, "diluted earnings per share");
  assert.equal(metricAsked("Microsoft operating income")?.label, "operating income");
  assert.equal(metricAsked("What is Apple's current stock price?"), null);
  assert.equal(metricAsked("When is Apple's next earnings call?"), null);
  assert.equal(knownCompany("What is NVIDIA's diluted EPS?"), "NVDA");
  assert.equal(knownCompany("Tesla revenue growth last year"), "TSLA");
  assert.equal(knownCompany("revenue from visa applications"), null);
  assert.equal(fiscalYearAsked("fiscal year 2024"), 2024);
  assert.equal(fiscalYearAsked("net income for fiscal 2025"), 2025);
  assert.equal(fiscalYearAsked("FY24 revenue"), 2024);
  assert.equal(fiscalYearAsked("revenue last year"), null);
  assert.equal(fiscalYearOf("2024-09-28"), 2024);
  assert.equal(fiscalYearOf("2025-01-26"), 2025);
  assert.equal(fiscalYearOf("2021-01-02"), 2020);
});

test("annual facts drop 10-Q and three-month figures, and keep the latest filing per period", () => {
  const a = annualFacts(APPLE_CONTRACT_REVENUE);
  assert.deepEqual(a.map((f) => [f.end, f.val, f.fy]), [
    ["2023-09-30", 383285000000, 2025],
    ["2024-09-28", 391035000000, 2025],
    ["2025-09-27", 416161000000, 2025],
  ]);
});

test("Apple's fiscal 2024 revenue is the period ending 28 September 2024, despite the FY2025 restatement", async () => {
  await withFetch(appleSec, async (seen) => {
    const r = await getFinancialData("What was Apple's revenue in fiscal year 2024?");
    assert.equal(r.reason, "Apple Inc. reported revenue of $391.04 billion for fiscal year 2024, which ended 28 September 2024, according to its 10-K filed with the SEC.");
    assert.equal(r.verdict, "financial_data");
    assert.equal(r.confidence, 0.9);
    assert.equal(r.fundamentals?.value, 391035000000);
    assert.equal(r.fundamentals?.period_end, "2024-09-28");
    assert.equal(r.fundamentals?.form, "10-K");
    assert.equal(r.fundamentals?.unit, "USD");
    assert.equal(r.fundamentals?.source, "SEC EDGAR XBRL");
    // No search and no quote were needed for an embedded company.
    assert.ok(!seen.some((u) => u.includes("yahoo")));
    assert.ok(seen.every((u) => !u.includes("@") && !u.includes("company_tickers")));

    const fy25 = await getFinancialData("Apple revenue FY2025");
    assert.match(fy25.reason, /^Apple Inc\. reported revenue of \$416\.16 billion for fiscal year 2025, which ended 27 September 2025/);
  });
});

test("with no year named, the most recent annual period is answered and named", async () => {
  await withFetch(appleSec, async () => {
    const r = await getFinancialData("What is Apple's revenue?");
    assert.equal(r.fundamentals?.period_end, "2025-09-27");
    assert.match(r.reason, /\$416\.16 billion for fiscal year 2025, which ended 27 September 2025/);
  });
});

test("revenue growth states both years and the year-over-year change", async () => {
  await withFetch(appleSec, async () => {
    const r = await getFinancialData("What was Apple's revenue growth?");
    assert.match(r.reason, /\$416\.16 billion for fiscal year 2025, which ended 27 September 2025, up 6\.43% from \$391\.04 billion in fiscal year 2024/);
    assert.equal(r.fundamentals?.prior_value, 391035000000);
    assert.equal(r.fundamentals?.growth_pct, 6.43);
  });
});

test("a P/E asked alongside revenue growth is still named as not retrieved", async () => {
  await withFetch(appleSec, async () => {
    const r = await getFinancialData("What is Apple's P/E ratio and revenue growth this quarter?");
    assert.match(r.reason, /up 6\.43%/);
    assert.match(r.reason, /The price-to-earnings ratio was not retrieved\./);
    assert.match(r.reason, /Quarterly figures were not retrieved/);
  });
});

test("a net loss is worded as a loss, and a year not yet filed is not an absence of revenue", async () => {
  const loss = [k("2024-01-01", "2024-12-31", -5_250_000_000, 2024, "2025-02-20")];
  await withFetch((u) => (u.includes("CIK0000037996/us-gaap/NetIncomeLoss") ? concept(loss) : json({}, 404)), async () => {
    const r = await getFinancialData("What was Ford's net income in 2024?");
    assert.match(r.reason, /^Ford Motor Company reported net loss of \$5\.25 billion for fiscal year 2024/);
    const later = await getFinancialData("What was Ford's net income in 2030?");
    assert.equal(later.verdict, "not_found");
    assert.match(later.reason, /^No 10-K filed with the SEC reports Ford Motor Company's net income for fiscal year 2030; the most recent annual figure is -\$5\.25 billion/);
  });
});

test("an unknown company falls through to the existing behaviour", async () => {
  await withFetch((u) => (u.includes("finance/search") ? json({ quotes: [] }) : json({}, 404)), async (seen) => {
    const r = await getFinancialData("What was Zepbound's revenue in 2024?");
    assert.equal(r.error, "no_subject");
    assert.ok(!seen.some((x) => x.includes("sec.gov")));
  });
  // Resolved by search, but not an SEC filer: the market-data answer, unchanged.
  const rows = Object.fromEntries(Array.from({ length: 1200 }, (_, i) => [String(i), { cik_str: i + 1, ticker: `T${i}`, title: `Co ${i}` }]));
  await withFetch((u) => {
    if (u.includes("finance/search")) return json({ quotes: [{ symbol: "SDZ.SW", quoteType: "EQUITY", shortname: "SANDOZ GROUP N" }] });
    if (u.includes("company_tickers.json")) return json(rows);
    if (u.includes("finance/chart")) return json(YAHOO_META);
    return json({}, 404);
  }, async () => {
    const r = await getFinancialData("Will Sandoz's Fidaxomicin sales exceed expectations?");
    assert.equal(r.fundamentals, undefined);
    assert.match(r.reason, /day range/);
  });
});

test("an SEC 403 or timeout gives the honest market-data answer, never a claimed absence", async () => {
  for (const failure of ["403", "timeout"]) {
    await withFetch((u) => {
      if (u.includes("sec.gov")) {
        if (failure === "403") return json({}, 403);
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      }
      return appleSec(u);
    }, async () => {
      const r = await getFinancialData("What was Apple's revenue in fiscal year 2024?");
      assert.equal(r.fundamentals, undefined);
      assert.match(r.reason, /day range/);
      assert.match(r.reason, /The revenue was not retrieved because SEC EDGAR, the source for company filings, did not respond\. This is an availability problem/);
      assert.ok(!/391/.test(r.reason));
    });
  }
  // Both sources down stays the existing provider_unavailable answer.
  await withFetch(() => { throw new Error("network down"); }, async () => {
    const r = await getFinancialData("What was Apple's revenue in fiscal year 2024?");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "provider_unavailable");
  });
});

/* --------------------------------- live ---------------------------------- */

test("Apple's fiscal 2024 revenue from SEC EDGAR (live)", async () => {
  const r = await getFinancialData("What was Apple's revenue in fiscal year 2024?");
  if (!r.fundamentals) return; // an SEC outage is not a failure of this code
  assert.equal(r.fundamentals.value, 391035000000);
  assert.equal(r.fundamentals.period_end, "2024-09-28");
  assert.match(r.reason, /\$391\.04 billion for fiscal year 2024, which ended 28 September 2024/);
});
