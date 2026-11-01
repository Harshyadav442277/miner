import { test } from "node:test";
import assert from "node:assert/strict";
import { blsReading, eurostatReading, indicatorsAsked, macroIndicators, macroRegion } from "../src/macro";

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
