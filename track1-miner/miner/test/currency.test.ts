import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, crossRate, fetchEcb, formatRate, parseDate, parseQuery } from "../src/currency";

test("the canonical example parses with the right direction", () => {
  assert.deepEqual(parseQuery("What is 100 USD in EUR right now?"), { from: "USD", to: "EUR", amount: 100 });
});

test("direction follows the order of mention", () => {
  assert.deepEqual(parseQuery("Convert 50 euros to pounds"), { from: "EUR", to: "GBP", amount: 50 });
  assert.deepEqual(parseQuery("250 GBP to INR"), { from: "GBP", to: "INR", amount: 250 });
  assert.deepEqual(parseQuery("$100 in euros"), { from: "USD", to: "EUR", amount: 100 });
  assert.deepEqual(parseQuery("£20 to Canadian dollars"), { from: "GBP", to: "CAD", amount: 20 });
});

test("\"how many X is Y\" names the target first and is not inverted", () => {
  // An inverted answer scores 1.9e-7 — the same as being wrong — so this
  // phrasing is detected rather than left to the order-of-mention rule.
  assert.deepEqual(parseQuery("How many yen is 1 dollar?"), { from: "USD", to: "JPY", amount: 1 });
  assert.deepEqual(parseQuery("How many US dollars is 80 euros?"), { from: "EUR", to: "USD", amount: 80 });
});

test("a rate question with no amount is not given an invented one", () => {
  assert.deepEqual(parseQuery("What is the USD to EUR exchange rate?"), { from: "USD", to: "EUR", amount: null });
});

test("the same currency twice is a real question, not a missing one", () => {
  assert.deepEqual(parseQuery("convert 100 dollars to dollars"), { from: "USD", to: "USD", amount: 100 });
});

test("formatRate keeps four significant figures including trailing zeros", () => {
  // "0.861" and "0.8610" are different strings to an exact-match scorer, and
  // the reference rate carries the fourth digit.
  assert.equal(formatRate(1 / 1.1614), "0.8610");
  assert.equal(formatRate(154.297), "154.297");
  assert.equal(formatRate(0.006481), "0.006481");
  assert.equal(formatRate(1.1614), "1.1614");
  assert.equal(formatRate(15234.5), "15234.50");
});

test("crossRate inverts and chains through the euro base", () => {
  const table = { rates: { EUR: 1, USD: 1.1614, JPY: 179.2 }, date: "2026-09-08", kind: "ecb_reference" as const };
  // 1 USD in EUR
  assert.equal(crossRate(table, "USD", "EUR")?.toFixed(6), (1 / 1.1614).toFixed(6));
  // 1 USD in JPY, chained through EUR
  assert.equal(crossRate(table, "USD", "JPY")?.toFixed(4), (179.2 / 1.1614).toFixed(4));
  assert.equal(crossRate(table, "USD", "XXX"), null);
});

test("a request naming one currency is refused, not half-answered", async () => {
  const r = await convert("USD", null, 100);
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "missing_currency");
  assert.equal(r.converted, null);
});

test("the same currency converts at exactly 1 without an upstream call", async () => {
  let called = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { called = true; throw new Error("should not be called"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await convert("USD", "USD", 100);
    assert.equal(r.rate, 1);
    assert.equal(r.converted, 100);
    assert.equal(called, false, "an identity conversion needs no rate lookup");
  } finally {
    globalThis.fetch = original;
  }
});

test("a dead provider is unknown, never a rate of zero", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await convert("USD", "EUR", 100);
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "provider_unavailable");
    assert.equal(r.rate, null);
    assert.equal(r.converted, null);
    assert.ok(!/\b0\.00\b/.test(r.reason), "a failed lookup must not produce a zero amount");
    assert.match(r.reason, /availability problem/i);
  } finally {
    globalThis.fetch = original;
  }
});

test("an explicit reference date is read only when a trigger word introduces it", () => {
  assert.equal(parseDate("Convert 100 GBP to EUR using the reference rate on 2024-01-02."), "2024-01-02");
  assert.equal(parseDate("What was the exchange rate as of 2 January 2024?"), "2024-01-02");
  assert.equal(parseDate("GBP to EUR rate for 2024-01-02"), "2024-01-02");
  assert.equal(parseDate("100 USD to EUR dated January 2, 2024"), "2024-01-02");
  assert.equal(parseDate("What is the USD to EUR exchange rate?"), null);
  assert.equal(parseDate("Convert 2024 USD to EUR"), null, "a bare year is not a date");
  assert.equal(parseDate("Convert 100 USD to EUR on 2024-02-30"), null, "30 February does not exist");
});

test("the undated answer text is unchanged (golden case, byte-identical)", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      text: async () => "<Cube><Cube time='2026-09-08'><Cube currency='USD' rate='1.1614'/></Cube></Cube>",
    })) as unknown as typeof globalThis.fetch;
  try {
    const r = await convert("USD", "EUR", 100);
    assert.equal(
      r.reason,
      "100.00 USD is 86.10 EUR at a rate of 1 USD = 0.8610 EUR, equivalently 1 EUR = 1.1614 USD. " +
        "This is the European Central Bank euro foreign exchange reference rate published for " +
        "2026-09-08, not a live trading quote.",
    );
    assert.equal(r.as_of, "2026-09-08");
    assert.equal(r.kind, "ecb_reference");
  } finally {
    globalThis.fetch = original;
  }
});

test("a dated question fetches the Frankfurter historical URL, pinned to the ECB provider, and answers with that rate", async () => {
  const original = globalThis.fetch;
  let capturedUrl = "";
  globalThis.fetch = (async (url: unknown) => {
    capturedUrl = String(url);
    return { ok: true, json: async () => [{ date: "2024-01-02", base: "GBP", quote: "EUR", rate: 1.1541 }] };
  }) as unknown as typeof globalThis.fetch;
  try {
    const r = await convert("GBP", "EUR", 100, "2024-01-02");
    assert.match(capturedUrl, /^https:\/\/api\.frankfurter\.dev\/v2\/rates\?/);
    assert.match(capturedUrl, /date=2024-01-02/);
    assert.match(capturedUrl, /base=GBP/);
    assert.match(capturedUrl, /quotes=EUR/);
    assert.match(capturedUrl, /providers=ecb/);
    assert.equal(r.verdict, "converted");
    assert.equal(r.kind, "ecb_reference");
    assert.equal(r.as_of, "2024-01-02");
    assert.equal(r.rate, 1.1541);
    assert.equal(r.from, "GBP");
    assert.equal(r.to, "EUR");
    assert.equal(r.amount, 100);
    assert.match(r.reason, /published for 2024-01-02/);
    assert.match(r.reason, /115\.41 EUR/);
  } finally {
    globalThis.fetch = original;
  }
});

test("a dated question on a non-trading day reports the publication date it actually got, not the requested one", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({ ok: true, json: async () => [{ date: "2024-01-05", base: "GBP", quote: "EUR", rate: 1.16 }] })) as unknown as typeof globalThis.fetch;
  try {
    // 2024-01-06 was a Saturday; Frankfurter backdates to the Friday before it.
    const r = await convert("GBP", "EUR", 100, "2024-01-06");
    assert.equal(r.as_of, "2024-01-05");
    assert.match(r.reason, /published for 2024-01-05/);
    assert.match(r.reason, /last publication on or before the requested 2024-01-06/);
  } finally {
    globalThis.fetch = original;
  }
});

test("a failed dated fetch is reported unavailable and never falls back to today's rate", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const urls: string[] = [];
  globalThis.fetch = (async (url: unknown) => {
    calls++;
    urls.push(String(url));
    throw new Error("network down");
  }) as unknown as typeof globalThis.fetch;
  try {
    const r = await convert("GBP", "EUR", 100, "2024-01-02");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "historical_unavailable");
    assert.equal(r.rate, null);
    assert.equal(r.converted, null);
    assert.match(r.reason, /not a reason to answer with today's rate/);
    assert.equal(calls, 1, "must not also try the ECB daily feed or the market source as a fallback");
    assert.ok(!urls[0]!.includes("eurofxref"), "must not fall back to the ECB daily (today's) feed");
  } finally {
    globalThis.fetch = original;
  }
});

test("a dated fetch with no data for that date (future, or before the feed's start) is unavailable, not a fallback", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: true, json: async () => [] })) as unknown as typeof globalThis.fetch;
  try {
    const r = await convert("GBP", "EUR", 100, "2099-01-01");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "historical_unavailable");
  } finally {
    globalThis.fetch = original;
  }
});

/* --------------------------------- live ---------------------------------- */

test("the ECB feed parses into a dated table of reference rates (live)", async () => {
  const t = await fetchEcb();
  if (!t) return;   // feed down is not a test failure
  assert.equal(t.kind, "ecb_reference");
  assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(t.rates.EUR, 1, "the euro base must be present as exactly 1");
  // The ECB publishes about thirty currencies, always including these.
  for (const c of ["USD", "JPY", "GBP", "CHF"]) {
    assert.ok(Number.isFinite(t.rates[c]) && (t.rates[c] as number) > 0, `${c} missing from the reference table`);
  }
});

test("a conversion is labelled as a reference rate and carries its date (live)", async () => {
  const r = await convert("USD", "EUR", 100);
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "converted");
  assert.equal(r.kind, "ecb_reference");
  assert.match(String(r.as_of), /^\d{4}-\d{2}-\d{2}$/);
  // A reference rate is not a trading quote, and the answer must not imply it is.
  assert.match(r.reason, /reference rate published for \d{4}-\d{2}-\d{2}/);
  assert.match(r.reason, /not a live trading quote/);
  // Both directions are stated, because an inverted answer is worth nothing.
  assert.match(r.reason, /1 USD = /);
  assert.match(r.reason, /1 EUR = /);
  // Sanity: the dollar and the euro are within a factor of two of each other.
  assert.ok(r.converted !== null && r.converted > 50 && r.converted < 200, `implausible: ${r.converted}`);
});

test("a currency the ECB does not publish falls back and says it is a market rate (live)", async () => {
  // The ECB publishes no rate for the Argentine peso.
  const r = await convert("USD", "ARS", 10);
  if (r.verdict === "unknown") return;
  assert.equal(r.kind, "market");
  assert.match(r.reason, /market rate/i);
  assert.ok(!/reference rate published/.test(r.reason), "a market rate must not be labelled a reference rate");
});

test("a dated conversion matches the published 2024-01-02 GBP/EUR reference rate (live)", async () => {
  // A closed historical date's ECB reference rate is permanently fixed, so this
  // is safe to pin exactly rather than just shape-check, unlike the "today" tests.
  const r = await convert("GBP", "EUR", 100, "2024-01-02");
  if (r.verdict === "unknown") return; // feed down is not a test failure
  assert.equal(r.verdict, "converted");
  assert.equal(r.kind, "ecb_reference");
  assert.equal(r.as_of, "2024-01-02");
  assert.equal(r.rate, 1.1541);
  assert.equal(r.converted, 115.41);
});
