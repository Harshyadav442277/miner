import { test } from "node:test";
import assert from "node:assert/strict";
import { blsReading, eurostatReading, indicatorsAsked, macroIndicators, macroRegion, yearAsked } from "../src/macro";

test("the statistics and the region are read from the question", () => {
  assert.deepEqual(indicatorsAsked("What was the latest US CPI year-over-year print, and what is the current federal funds target range?"), ["cpi", "policy_rate"]);
  assert.deepEqual(indicatorsAsked("What is US core inflation and unemployment?"), ["core_cpi", "unemployment"]);
  assert.deepEqual(indicatorsAsked("How fast did Japan's GDP grow last year?"), ["gdp_growth"]);
  assert.equal(macroRegion("What is the unemployment rate in Germany?"), "DE");
  assert.equal(macroRegion("Eurozone inflation"), "EA");
  assert.equal(macroRegion("What is the federal funds rate?"), "US");
  assert.equal(macroRegion("Inflation in the United Kingdom?"), "GB");
});

test("CPI is the change on the same month a year earlier; unemployment is the latest print", () => {
  const body = { Results: { series: [{ data: [
    { year: "2026", period: "M08", value: "334.980" }, { year: "2026", period: "M07", value: "334.0" },
    { year: "2025", period: "M13", value: "1" }, { year: "2025", period: "M08", value: "324.0" },
  ] }] } };
  assert.deepEqual(blsReading(body, true), { value: 3.4, period: "2026-08" });
  assert.deepEqual(blsReading(body, false), { value: 334.98, period: "2026-08" });
});

test("Eurostat's latest month is the newest one that carries a value", () => {
  const body = { value: { "0": 4, "1": 4 }, dimension: { time: { category: { index: { "2026-07": 0, "2026-08": 1, "2026-09": 2 } } } } };
  assert.deepEqual(eurostatReading(body), { value: 4, period: "2026-08" });
});

test("the CPI and fed funds question answers both, from BLS and the New York Fed", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    if (u.includes("api.bls.gov")) return Response.json({ Results: { series: [{ data: [{ year: "2026", period: "M08", value: "334.980" }, { year: "2025", period: "M08", value: "324.0" }] }] } });
    if (u.includes("newyorkfed")) return Response.json({ refRates: [{ effectiveDate: "2026-10-09", percentRate: 3.88, targetRateFrom: 3.75, targetRateTo: 4 }] });
    return new Response("", { status: 503 });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const r = await macroIndicators("What was the latest US CPI year-over-year print, and what is the current federal funds target range?");
  assert.equal(r.verdict, "reported");
  assert.equal(r.reason, "Consumer price inflation in the US was 3.4% year on year in August 2026 (US Bureau of Labor Statistics). " +
    "The federal funds target range is 3.75% to 4.00%; the effective rate was 3.88% on 2026-10-09 (Federal Reserve Bank of New York).");
  const india = await macroIndicators("What is India's policy rate?");
  assert.equal(india.verdict, "not_covered");
  assert.match(india.reason, /policy rate for India is not read here/);
});

test("a stated year is that year's World Bank annual value, from the parameter or 'in YYYY' (2026-11-08)", async (t) => {
  const original = globalThis.fetch;
  const asked: string[] = [];
  // Values as api.worldbank.org returned them on 2026-11-08.
  const WDI: Record<string, number> = { "US/FP.CPI.TOTL.ZG/2023": 4.11633838374487, "DE/SL.UEM.TOTL.ZS/2022": 3.137, "IN/NY.GDP.MKTP.KD.ZG/2021": 9.68959249191741 };
  globalThis.fetch = (async (url: string) => {
    const u = new URL(String(url));
    asked.push(u.hostname);
    const m = u.pathname.match(/country\/(\w+)\/indicator\/([\w.]+)/);
    const key = m ? `${m[1]}/${m[2]}/${u.searchParams.get("date")}` : "";
    if (u.hostname === "api.worldbank.org") {
      return Response.json(WDI[key] !== undefined ? [{ page: 1 }, [{ date: u.searchParams.get("date"), value: WDI[key] }]] : [{ page: 0 }, null]);
    }
    return new Response("", { status: 503 });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const us = await macroIndicators("", "inflation", "United States", "2023");
  assert.equal(us.verdict, "reported");
  assert.equal(us.year, 2023);
  assert.deepEqual([us.indicators[0]!.value, us.indicators[0]!.period, us.indicators[0]!.frequency], [4.1163, "2023", "annual"]);
  assert.match(us.reason, /^Consumer price inflation in the US was 4\.1% in 2023 \(World Bank/);
  const de = await macroIndicators("What was the unemployment of Germany in 2022?");
  assert.equal(de.indicators[0]!.value, 3.137);
  const india = await macroIndicators("What was the GDP growth of India in 2021?");
  assert.equal(india.indicators[0]!.value, 9.6896);
  assert.ok(!asked.some((h) => h !== "api.worldbank.org"), "no latest-print publisher is read for a past year");
  // A year with no published value is not covered, never the latest print in its place.
  const none = await macroIndicators("What was the unemployment of Germany in 2019?");
  assert.equal(none.verdict, "not_covered");
  assert.match(none.reason, /unemployment rate for Germany in 2019 has no annual World Bank figure/);
  // A past-year policy rate has no annual WDI series.
  assert.equal((await macroIndicators("What was the Fed funds rate in 2020?")).verdict, "not_covered");
});

test("the year is read from the parameter or the question, and a future year is ignored", () => {
  const now = new Date("2026-11-08T00:00:00Z");
  assert.equal(yearAsked("", "2023", now), 2023);
  assert.equal(yearAsked("What was the inflation of United States in 2023?", "", now), 2023);
  assert.equal(yearAsked("US unemployment for 2021", "", now), 2021);
  assert.equal(yearAsked("Will inflation fall in 2030?", "", now), null);
  assert.equal(yearAsked("What is the latest US CPI?", "", now), null);
});
