import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asksFundamentals, companyName, contractAddress, explicitTicker, getFinancialData, resolveNetwork,
} from "../src/financial";

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

test("a contract address makes it a token question, with its chain", () => {
  const q = `Give the market cap and 24h trading volume for token ${USDC_BASE} on base.`;
  assert.equal(contractAddress(q), USDC_BASE);
  assert.equal(resolveNetwork(q)?.label, "base");
});

test("Ethereum is matched last so it cannot capture another chain's question", () => {
  // `\beth\b` is the native asset on every L2 in this map.
  assert.equal(resolveNetwork("volume for this token on base, paid in ETH")?.label, "base");
  assert.equal(resolveNetwork("market cap on arbitrum")?.label, "arbitrum");
  assert.equal(resolveNetwork("market cap on ethereum")?.label, "ethereum");
});

test("an explicit ticker is read, and ordinary English is not mistaken for one", () => {
  assert.equal(explicitTicker("Give me the market data for TSLA"), "TSLA");
  assert.equal(explicitTicker("what about $NVDA"), "NVDA");
  // "What", "IS", "PE", "24H" are not tickers.
  assert.equal(explicitTicker("What IS the PE ratio"), null);
});

test("a company name is read for the search fallback", () => {
  assert.equal(companyName("What is Apple's P/E ratio and revenue growth this quarter?"), "Apple");
  assert.equal(companyName("What are the financial statistics for Microsoft?"), "Microsoft");
});

test("fundamentals asked for are identified so their absence can be stated", () => {
  const f = asksFundamentals("What is Apple's P/E ratio and revenue growth this quarter?");
  assert.ok(f.includes("price-to-earnings ratio"));
  assert.ok(f.includes("revenue growth"));
  assert.deepEqual(asksFundamentals("give me the day range"), []);
});

test("a request naming no subject is refused rather than guessed at", async () => {
  const r = await getFinancialData("market data please");
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "no_subject");
});

test("a dead provider is unknown, never zero figures", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await getFinancialData(`market cap for ${USDC_BASE} on base`);
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "provider_unavailable");
    assert.match(r.reason, /availability problem/i);
    assert.ok(!/\$0\b/.test(r.reason));
  } finally {
    globalThis.fetch = original;
  }
});

/* --------------------------------- live ---------------------------------- */

test("a token answer carries statistics beyond a single price (live)", async () => {
  // The intent is explicitly "beyond a single quoted price" — a bare price is
  // the WRONG answer here even when it is the right number.
  const r = await getFinancialData(`Give the market cap and 24h trading volume for token ${USDC_BASE} on base.`);
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "financial_data");
  assert.equal(r.subject, "token");
  assert.match(r.reason, /market capitalisation of \$[\d,]+/);
  assert.match(r.reason, /24-hour trading volume of \$[\d,]+/);
  assert.match(r.reason, /not a single quoted price/);
});

test("an equity answer carries market statistics, and names what it could not get (live)", async () => {
  const r = await getFinancialData("What is Apple's P/E ratio and revenue growth this quarter?");
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "financial_data");
  assert.equal(r.subject, "equity");
  assert.match(r.reason, /Apple/);
  assert.match(r.reason, /52-week range/);
  // Fundamentals are behind an authenticated endpoint. The answer must say the
  // ratio was not retrieved rather than let the market data read as one.
  assert.match(r.reason, /price-to-earnings ratio/);
  assert.match(r.reason, /not retrieved|not available/i);
});

test("a company named in prose resolves to its ticker (live)", async () => {
  const r = await getFinancialData("What are the financial statistics for Microsoft?");
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "financial_data");
  assert.match(r.reason, /MSFT/);
});
