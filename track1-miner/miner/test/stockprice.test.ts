import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asksAboutStock, asksForecast, companyMatches, describeQuote, exchangeTime, lookupStockPrice, requestedDate, sessionOpen, writtenTicker,
  type ChartMeta,
} from "../src/stockprice";

test("a ticker written as one is read; a capitalised word in a name is not", () => {
  assert.equal(writtenTicker("What is the current share price of Apple (AAPL)?"), "AAPL");
  assert.equal(writtenTicker("price of $tsla today"), "TSLA");
  assert.equal(writtenTicker("NASDAQ: MSFT quote"), "MSFT");
  // "LIB" in a company name is not a written ticker.
  assert.equal(writtenTicker("Will LIB THERAPEUTICS stock rise?"), null);
});

test("the word after 'ticker' or 'symbol' is a ticker only when written in capitals (verifier, 2026-09-12)", () => {
  assert.equal(writtenTicker("What is the ticker for Tesla and its share price?"), null);
  assert.equal(writtenTicker("What is the stock symbol of Nvidia?"), null);
  assert.equal(writtenTicker("ticker NVDA price"), "NVDA");
  assert.equal(writtenTicker("Symbol: MSFT"), "MSFT");
});

test("a currency in parentheses is not a ticker", () => {
  assert.equal(writtenTicker("What is Apple share price (USD)?"), null);
  assert.equal(writtenTicker("Tesla (TSLA) price (USD)"), "TSLA");
});

test("a misrouted question with a place name is not a stock question", () => {
  assert.equal(asksAboutStock("What is the 24-hour weather forecast for Auckland?"), false);
  assert.equal(asksAboutStock("Will Eli Lilly stock rise?"), true);
  assert.equal(asksAboutStock("What did MSFT close at on 2026-09-10?"), true);
  assert.equal(asksAboutStock("What is the price of a flight to Auckland?"), false);
});

test("a misrouted weather question is refused without a network call", async () => {
  const r = await lookupStockPrice("What is the 24-hour weather forecast for Auckland?");
  assert.equal(r.error, "no_subject");
  assert.equal(r.verdict, "unknown");
});

test("a rise or fall question is recognised as a forecast request", () => {
  assert.equal(asksForecast("Will Eli Lilly stock rise?"), true);
  assert.equal(asksForecast("Will Fresenius Kabi stock drop?"), true);
  assert.equal(asksForecast("What is Apple's share price?"), false);
});

test("the listing must carry every word of the asked name", () => {
  assert.equal(companyMatches("Eli Lilly", "Eli Lilly and Company"), true);
  assert.equal(companyMatches("Bristol-Myers", "Bristol-Myers Squibb Company"), true);
  assert.equal(companyMatches("Sun Pharma", "Sun Pharmaceutical Industries Limited"), true);
  // The 2026-09-12 substitution this exists to stop.
  assert.equal(companyMatches("Fresenius Kabi", "Fresenius Medical Care AG"), false);
  assert.equal(companyMatches("Apple", "Applied Materials, Inc."), false);
});

test("an ISO date asks for a historical close", () => {
  assert.equal(requestedDate("What did MSFT close at on 2026-09-10?"), "2026-09-10");
  assert.equal(requestedDate("MSFT price now"), null);
});

const META: ChartMeta = {
  symbol: "AAPL", longName: "Apple Inc.", currency: "USD", fullExchangeName: "NasdaqGS",
  exchangeTimezoneName: "America/New_York", regularMarketPrice: 332.27, regularMarketTime: 1789156801,
  currentTradingPeriod: { regular: { start: 1789133400, end: 1789156800 } },
};

test("a quote outside the regular session is never called live", () => {
  const saturday = 1789236000; // 2026-09-12, a Saturday
  assert.equal(sessionOpen(META, saturday), false);
  const text = String(describeQuote(META, saturday));
  assert.match(text, /^Apple Inc\. \(AAPL\) last traded at 332\.27 USD on NasdaqGS at Fri 11 Sept? 2026 16:00 America\/New_York\./);
  assert.match(text, /not a live quote/);
});

test("a quote inside the regular session says the session is open", () => {
  const during = 1789140000;
  assert.equal(sessionOpen(META, during), true);
  assert.match(String(describeQuote(META, during)), /is trading at 332\.27 USD .* the regular session is open\./);
});

test("a missing session window is reported as unknown status, not as open", () => {
  const noWindow = { ...META, currentTradingPeriod: undefined };
  assert.equal(sessionOpen(noWindow, 1789140000), null);
  assert.match(String(describeQuote(noWindow, 1789140000)), /of unknown status/);
});

test("exchange time is rendered in the exchange's own zone", () => {
  assert.match(exchangeTime(1789156801, "America/New_York"), /16:00 America\/New_York$/);
  assert.match(exchangeTime(1789156801, "Not/AZone"), /UTC$/);
});

test("(live) a company name in the symbol parameter is resolved as a name, not used as a ticker", async () => {
  const r = await lookupStockPrice("What is its share price?", "Apple");
  if (r.error === "upstream_unavailable") return;
  assert.equal(r.ticker, "AAPL");
});

test("no subject is refused without a network call", async () => {
  for (const q of ["", "github.com"]) {
    const r = await lookupStockPrice(q);
    assert.equal(r.error, "no_subject");
  }
});

test("(live) Apple's price carries the exchange time and the session state", async () => {
  const r = await lookupStockPrice("What is the current share price of Apple (AAPL)?");
  if (r.error === "upstream_unavailable") return;
  assert.equal(r.verdict, "price");
  assert.match(r.reason, /Apple Inc\. \(AAPL\) (?:is trading at|last traded at) \d+\.\d{2} USD/);
  assert.match(r.reason, /America\/New_York/);
  assert.match(r.reason, /session is (?:open|closed now)/);
});

test("(live) a forecast question gets the price and an explicit no-forecast", async () => {
  const r = await lookupStockPrice("Will Eli Lilly stock rise?");
  if (r.error === "upstream_unavailable") return;
  assert.equal(r.verdict, "price");
  assert.match(r.reason, /\(LLY\)/);
  assert.match(r.reason, /no forecast is made/);
});

test("(live) an unlisted subsidiary is not answered with a sibling's price", async () => {
  const r = await lookupStockPrice("Will Fresenius Kabi stock drop?");
  if (r.error === "upstream_unavailable") return;
  assert.equal(r.verdict, "not_found");
  assert.doesNotMatch(r.reason, /last traded at/);
});
