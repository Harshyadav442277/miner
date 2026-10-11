import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getFinancialData } from "../src/financial";
import { handleRequest } from "../src/handler";

const SOL_MARKET = [{
  id: "solana", symbol: "sol", name: "Solana", current_price: 109.46, market_cap: 64477502878,
  fully_diluted_valuation: 69572533039, total_volume: 1526378264, high_24h: 110.63, low_24h: 108.97,
  price_change_percentage_24h: -0.1842, circulating_supply: 589051411.77, last_updated: "2026-10-11T04:37:44.000Z",
}];

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Routes fetch by URL substring; anything unrouted fails, and every URL asked for is recorded. */
async function withFetch<T>(routes: Array<[string, () => Response]>, fn: (asked: string[]) => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const u = String(input instanceof Request ? input.url : input);
    asked.push(u);
    const hit = routes.find(([part]) => u.includes(part));
    if (!hit) throw new Error(`unrouted ${u}`);
    return hit[1]();
  }) as typeof globalThis.fetch;
  try {
    return await fn(asked);
  } finally {
    globalThis.fetch = original;
  }
}

test("a coin named in words gets its market cap and dollar volume, with fields", async () => {
  await withFetch([["api.coingecko.com/api/v3/coins/markets", () => json(SOL_MARKET)]], async () => {
    const r = await getFinancialData("What is the market cap and 24h volume of Solana?");
    assert.equal(r.verdict, "financial_data");
    assert.equal(r.subject, "coin");
    assert.match(r.reason, /market capitalisation of \$64,477,502,878 \(\$64\.48 billion\)/);
    assert.match(r.reason, /24-hour trading volume of \$1,526,378,264/);
    assert.doesNotMatch(r.reason, /shares/);
    assert.equal(r.data?.market_cap, 64477502878);
    assert.equal(r.data?.volume_24h, 1526378264);
    assert.equal(r.data?.source, "coingecko");
  });
});

test("'etc' after a company is not Ethereum Classic", async () => {
  await withFetch([], async (asked) => {
    await getFinancialData("What is Apple's revenue, P/E, etc?");
    assert.ok(!asked.some((u) => u.includes("coingecko")), asked.join("\n"));
  });
});

test("the Yahoo fallback reports a coin's volume in dollars and says the market cap was not retrieved", async () => {
  await withFetch([
    ["api.coingecko.com", () => json({ status: { error_code: 429 } }, 429)],
    ["finance/search", () => json({ quotes: [{ symbol: "SOL-USD", quoteType: "CRYPTOCURRENCY", shortname: "Solana USD" }] })],
    ["finance/chart/SOL-USD", () => json({ chart: { result: [{ meta: {
      instrumentType: "CRYPTOCURRENCY", currency: "USD", longName: "Solana USD", regularMarketPrice: 109.47,
      chartPreviousClose: 116.22, regularMarketDayHigh: 110.13, regularMarketDayLow: 109.08,
      regularMarketVolume: 1311341568, fiftyTwoWeekHigh: 211.11, fiftyTwoWeekLow: 60.41, regularMarketTime: 1791600000,
    } }] } })],
  ], async () => {
    const r = await getFinancialData("What is the market cap and 24h volume of Solana?");
    assert.equal(r.verdict, "financial_data");
    assert.match(r.reason, /24-hour trading volume of \$1,311,341,568/);
    assert.doesNotMatch(r.reason, /shares/);
    assert.match(r.reason, /market capitalisation was not retrieved/);
    assert.equal(r.data?.volume_unit, "USD");
  });
});

test("an equity keeps its share volume", async () => {
  await withFetch([
    ["finance/chart/TSLA", () => json({ chart: { result: [{ meta: {
      instrumentType: "EQUITY", currency: "USD", longName: "Tesla, Inc.", regularMarketPrice: 250,
      chartPreviousClose: 245, regularMarketDayHigh: 252, regularMarketDayLow: 244, regularMarketVolume: 90000000,
      fiftyTwoWeekHigh: 300, fiftyTwoWeekLow: 150,
    } }] } })],
  ], async () => {
    const r = await getFinancialData("Give me the market data for TSLA");
    assert.match(r.reason, /volume of 90,000,000 shares/);
    assert.equal(r.data?.volume_unit, "shares");
    assert.equal(r.subject, "equity");
  });
});

function get(path: string): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url: path } as IncomingMessage;
    const res = {
      writeHead() {},
      end(payload?: unknown) { resolve(JSON.parse(String(payload)) as Record<string, unknown>); },
    } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

test("/financial returns the figures as fields alongside the prose", async () => {
  await withFetch([["api.coingecko.com/api/v3/coins/markets", () => json(SOL_MARKET)]], async () => {
    const body = await get(`/financial?query=${encodeURIComponent("Market cap and volume of Solana for the fields test")}`);
    assert.equal(body.verdict, "financial_data");
    assert.equal(body.subject, "coin");
    assert.equal((body.data as Record<string, unknown>).market_cap, 64477502878);
    assert.doesNotMatch(String(body.reason), /^(?:Regarding|Here is)\b/);
  });
});
