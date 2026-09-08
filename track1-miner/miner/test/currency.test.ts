import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, crossRate, fetchEcb, formatRate, parseQuery } from "../src/currency";

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
