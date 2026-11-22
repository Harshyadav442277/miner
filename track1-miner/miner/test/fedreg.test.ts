import { test } from "node:test";
import assert from "node:assert/strict";
import { frParse, frQuery } from "../src/fedreg";
import { frResult, frWindow } from "../src/fedreg-filings";
import { filingAsk, monitorFilings } from "../src/filings";
import { logParam, resultLine } from "../src/handler";

const NOW = new Date("2026-11-16T12:00:00Z");
const BODY = {
  count: 3,
  results: [{
    title: "Determination That OZEMPIC (Semaglutide) Solution Was Not Withdrawn From Sale for Reasons of Safety or Effectiveness",
    type: "Notice", publication_date: "2026-04-30", document_number: "2026-08421",
    agencies: [{ name: "Health and Human Services Department" }, { name: "Food and Drug Administration" }],
    html_url: "https://www.federalregister.gov/documents/2026/04/30/2026-08421/determination",
  }],
};

test("the Federal Register query searches the entity as a phrase inside the window", () => {
  const q = new URLSearchParams(frQuery('Oz"empic', "2025-11-16", null));
  assert.equal(q.get("conditions[term]"), '"Ozempic"');
  assert.equal(q.get("conditions[publication_date][gte]"), "2025-11-16");
  assert.equal(q.get("conditions[publication_date][lte]"), null);
  assert.equal(q.get("order"), "newest");
});

test("an API body that is not the documents shape is refused, never counted as 0", () => {
  assert.equal(frParse({ errors: ["bad"] }), null);
  assert.equal(frParse({ count: -1, results: [] }), null);
  assert.equal(frParse(BODY)?.count, 3);
  assert.deepEqual(frParse(BODY)?.documents[0]?.agencies, ["Health and Human Services Department", "Food and Drug Administration"]);
});

test("a product's count is the Federal Register documents in the period, and the answer says which register", () => {
  const ask = filingAsk("", "Ozempic", "", NOW, "last 12 months");
  const r = frResult(ask, { ...frParse(BODY)!, search_url: "https://www.federalregister.gov/documents/search?x" });
  assert.equal(r.filing_count, 3);
  assert.equal(r.register, "Federal Register");
  assert.equal(r.verdict, "filed");
  assert.equal(r.counted_since, "2025-11-16");
  assert.match(r.reason!, /^3 US Federal Register documents name Ozempic since 2025-11-16; the latest, Notice, Food and Drug Administration, published 2026-04-30/);
  assert.match(r.reason!, /No SEC registrant matching Ozempic was found by name/);
  assert.doesNotMatch(r.reason!, /is not an SEC registrant/);
  assert.equal(r.confidence, 0.7);
});

test("no period gives no count, and a fiscal year is read as its calendar year", () => {
  const latest = frResult(filingAsk("", "Ozempic", "", NOW, ""), { ...frParse(BODY)!, search_url: "u" });
  assert.equal(latest.filing_count, null);
  assert.match(latest.reason!, /^The latest US Federal Register document naming Ozempic is Notice/);
  assert.deepEqual(frWindow({ company: "X", form: null, since: null, latest: false, fiscal_year: 2025 }), { since: "2025-01-01", until: "2025-12-31" });
});

test("zero documents is a count of 0 with verdict not_filed", () => {
  const r = frResult(filingAsk("", "Zzyzx Widget", "", NOW, "last 30 days"), { count: 0, documents: [], search_url: "u" });
  assert.equal(r.filing_count, 0);
  assert.equal(r.verdict, "not_filed");
  assert.match(r.reason!, /^0 US Federal Register documents name Zzyzx Widget since 2026-10-17\./);
});

test("a non-registrant falls back to the Federal Register; when it is down the answer stays not_found with no count", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let frUp = true;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    if (u.includes("company_tickers.json")) return new Response(JSON.stringify(Object.fromEntries(
      Array.from({ length: 1_200 }, (_, i) => [i, { cik_str: 1_000 + i, ticker: `T${i}`, title: `Filer Number ${i} Inc` }]))));
    if (u.includes("federalregister.gov")) return frUp ? new Response(JSON.stringify(BODY)) : new Response("", { status: 503 });
    throw new Error(`unexpected ${u}`);
  }) as typeof globalThis.fetch;
  const up = await monitorFilings("How many regulatory filings mention Ozempic?", "Ozempic", "", NOW, "last 12 months");
  assert.equal(up.filing_count, 3);
  assert.equal(up.register, "Federal Register");
  frUp = false;
  const down = await monitorFilings("How many regulatory filings mention Ozempic?", "Ozempic", "", NOW, "last 12 months");
  assert.equal(down.verdict, "not_found");
  assert.equal(down.filing_count, null);
});

test("the request log keeps values only for route and short-list params", () => {
  assert.equal(logParam("chain", "Ethereum"), "chain=Ethereum");
  assert.equal(logParam("__path", "/gas-price"), "__path=/gas-price");
  assert.equal(logParam("record_type", "A;rm -rf"), "record_type=A_rm -rf");
  assert.equal(logParam("text", "my private note"), "text");
  assert.equal(logParam("name", " "), "name=EMPTY");
  assert.equal(logParam("symbol", "Bitcoin (BTC)"), "symbol=Bitcoin _BTC_");
  assert.equal(logParam("question", "my private question"), "question");
});

test("the result log names the verdict and the empty fields, never a value", () => {
  assert.equal(resultLine("/financial", { verdict: "financial_data", asset: "Apple Inc.", market_cap_usd: null, sources: [] }),
    "RES /financial verdict=financial_data empty=market_cap_usd,sources");
  assert.equal(resultLine("/x", { verdict: "unknown", error: "no_subject", answer: "secret text" }), "RES /x verdict=unknown error=no_subject");
});
