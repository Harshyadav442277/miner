import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getFinancialData, pickCoin } from "../src/financial";
import { handleRequest } from "../src/handler";
import { openGate } from "./licence-fixtures";

// These tests cover code kept behind its licence gate (GAPS G230).
openGate("yahoo");
openGate("coingecko");

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

test("a coin CoinGecko refuses is read from CoinPaprika, never from the stock search (2026-11-22)", async () => {
  await withFetch([
    ["api.coingecko.com", () => json({ status: { error_code: 429 } }, 429)],
    ["coinpaprika.com/v1/search", () => json({ currencies: [{ id: "sol-solana", name: "Solana", symbol: "SOL", rank: 7 }] })],
    ["coinpaprika.com/v1/tickers/sol-solana", () => json({ last_updated: "2026-11-22T13:00:00Z", quotes: { USD: { price: 109.47, market_cap: 59_000_000_000, volume_24h: 1_311_341_568, percent_change_24h: -5.8 } } })],
  ], async (asked) => {
    const r = await getFinancialData("What is the market cap and 24h volume of Solana?");
    assert.equal(r.verdict, "financial_data");
    assert.equal(r.subject, "coin");
    assert.equal(r.data?.market_cap, 59_000_000_000);
    assert.equal(r.data?.source, "coinpaprika");
    assert.match(r.reason, /24-hour trading volume of \$1,311,341,568/);
    assert.ok(!asked.some((u) => u.includes("finance/search")), "no stock search for a named coin");
  });
});

test("a named coin with every market source down is unknown, not a Bitcoin ETF (2026-11-22)", async () => {
  await withFetch([
    ["api.coingecko.com", () => json({}, 429)],
    ["coinpaprika.com", () => json({ type: "payment_required" }, 402)],
    ["finance/search", () => json({ quotes: [{ symbol: "BITB", quoteType: "ETF", shortname: "Bitwise Bitcoin ETF" }] })],
  ], async () => {
    const r = await getFinancialData("Bitcoin (BTC)", "", "Bitcoin (BTC)");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "provider_unavailable");
    assert.equal(r.name, "Bitcoin");
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

test("a coin search hit counts only when it is a top-300 coin named as asked", () => {
  assert.equal(pickCoin("TRON", [{ id: "tron", name: "TRON", symbol: "trx", market_cap_rank: 8 }])?.gecko, "tron");
  assert.equal(pickCoin("Toncoin", [{ id: "the-open-network", name: "Gram (prev. Toncoin)", symbol: "gram", market_cap_rank: 31 }])?.symbol, "GRAM");
  assert.equal(pickCoin("SHIB", [{ id: "shiba-inu", name: "Shiba Inu", symbol: "shib", market_cap_rank: 39 }])?.name, "Shiba Inu");
  assert.equal(pickCoin("META", [{ id: "meta-2-2", name: "MetaDAO", symbol: "META", market_cap_rank: 302 }]), null);
  assert.equal(pickCoin("Apple", [{ id: "apple-xstock", name: "Apple xStock", symbol: "AAPLX", market_cap_rank: 967 }]), null);
  assert.equal(pickCoin("Polygon", [{ id: "x", name: "Index Coop (Polygon)", symbol: "X", market_cap_rank: 4046 }]), null);
});

test("a 2010 SEC share count is not priced today; Nasdaq's market cap is used (Visa, 2026-11-22)", async () => {
  await withFetch([
    ["finance/chart/V", () => json({ chart: { result: [{ meta: { instrumentType: "EQUITY", currency: "USD", longName: "Visa Inc.", regularMarketPrice: 340,
      chartPreviousClose: 338, regularMarketDayHigh: 342, regularMarketDayLow: 336, regularMarketVolume: 5_000_000, fiftyTwoWeekHigh: 360, fiftyTwoWeekLow: 280 } }] } })],
    ["EntityCommonStockSharesOutstanding", () => json({ units: { shares: [{ val: 469_280_842, end: "2010-01-27", filed: "2010-02-03", form: "10-Q", accn: "a1" }] } })],
    ["api.nasdaq.com/api/quote/V/summary", () => json({ data: { summaryData: { MarketCap: { label: "Market Cap", value: "725,306,134,389" } } } })],
  ], async (asked) => {
    const r = await getFinancialData("Visa", "", "Visa");
    assert.equal(r.data?.market_cap, 725_306_134_389);
    assert.match(r.reason, /Nasdaq/);
    assert.ok(!asked.some((u) => u.includes("coingecko")), "a known company is not searched as a coin");
  });
});

test("a coin search hit says how it matched and its rank", () => {
  assert.deepEqual(pickCoin("TRON", [{ id: "tron", name: "TRON", symbol: "trx", market_cap_rank: 8 }]), { name: "TRON", symbol: "TRX", gecko: "tron", by: "name", rank: 8 });
  assert.equal(pickCoin("shib", [{ id: "shiba-inu", name: "Shiba Inu", symbol: "shib", market_cap_rank: 39 }])?.by, "symbol");
});

test("with Nasdaq failing, the market cap is approximated from SEC diluted shares (GAPS G353)", async () => {
  await withFetch([
    ["finance/chart/GOOGL", () => json({ chart: { result: [{ meta: { instrumentType: "EQUITY", currency: "USD", longName: "Alphabet Inc.", regularMarketPrice: 265,
      chartPreviousClose: 260, regularMarketDayHigh: 266, regularMarketDayLow: 259, regularMarketVolume: 30_000_000, fiftyTwoWeekHigh: 300, fiftyTwoWeekLow: 150 } }] } })],
    ["EntityCommonStockSharesOutstanding", () => json({ units: {} })],
    ["api.nasdaq.com", () => json({ data: null, status: { rCode: 200, bCodeMessage: [{ code: 3004, errorMessage: "Error while calling vendor" }] } })],
    ["WeightedAverageNumberOfDilutedSharesOutstanding", () => json({ units: { shares: [
      { val: 12_368_000_000, end: new Date(Date.now() - 50 * 86_400_000).toISOString().slice(0, 10), form: "10-Q", filed: "2026-10-29", accn: "q" },
      { val: 12_900_000_000, end: "2025-09-30", form: "10-Q", filed: "2025-10-29", accn: "old" },
    ] } })],
  ], async () => {
    const r = await getFinancialData("Alphabet", "", "Alphabet");
    assert.equal(r.data?.market_cap, 12_368_000_000 * 265);
    assert.match(r.reason, /approximated from 12,368,000,000 diluted weighted-average shares/);
  });
});

test("/financial reads the intent's own `asset` field (asset=BTC answered no_subject, production 2026-11-25)", async () => {
  const BTC_MARKET = [{ ...SOL_MARKET[0], id: "bitcoin", symbol: "btc", name: "Bitcoin", market_cap: 1_204_617_235_375, total_volume: 34_581_864_142 }];
  await withFetch([["api.coingecko.com/api/v3/coins/markets", () => json(BTC_MARKET)]], async () => {
    const body = await get("/financial?asset=BTC");
    assert.equal(body.verdict, "financial_data");
    assert.equal(body.name, "Bitcoin");
    assert.equal(body.market_cap_usd, 1_204_617_235_375);
  });
});
