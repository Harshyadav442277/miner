import { test } from "node:test";
import assert from "node:assert/strict";
import { clearTickerCache, lookupCryptoPrice } from "../src/cryptoprice";

// Shapes recorded from Bitstamp's public API on 2026-10-24.
const TICK = (last: string, ts = "1792821540"): Record<string, string> =>
  ({ timestamp: ts, open: last, high: last, low: last, last, volume: "1312.71935272", vwap: last, bid: last, ask: last,
    side: "0", open_24: last, percent_change_24: "0.00", market_type: "SPOT" });
// What Bitstamp sends for an UNLISTED pair: 200 with every ticker, BTC/USD first.
const ALL = [{ ...TICK("80658.93"), pair: "BTC/USD", market: "BTC/USD" }, { ...TICK("72060.49"), pair: "BTC/EUR", market: "BTC/EUR" }];

function stub(t: { after: (fn: () => void) => void }, route: (u: string) => Response): string[] {
  const urls: string[] = [];
  clearTickerCache();
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => { urls.push(String(url)); return route(String(url)); }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  return urls;
}

const UNLICENSED = /coinbase|kraken|coingecko/i;

test("a direct pair answers from Bitstamp alone, with the trade time and the book", async (t) => {
  const urls = stub(t, (u) => (u.endsWith("/ticker/btcusd/") ? Response.json(TICK("80658.93")) : Response.json(ALL)));
  const r = await lookupCryptoPrice("What is the price of BTC right now?");
  assert.deepEqual(urls, ["https://www.bitstamp.net/api/v2/ticker/btcusd/"]);
  assert.equal(r.verdict, "price");
  assert.equal(r.price, 80658.93);
  assert.equal(r.source, "Bitstamp");
  assert.equal(r.price_at, new Date(1792821540 * 1000).toISOString());
  assert.equal(r.volume_24h, 1312.71935272);
  assert.match(r.reason, /^Bitcoin \(BTC\) is \$80,658\.93 USD, the last Bitstamp trade at \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC\./);
  assert.match(r.reason, /from one exchange/);
});

test("an unlisted pair's all-tickers reply is never read as the asset's price", async (t) => {
  // With LICENCE_GATE=on (a mainnet or commercial deployment) Coinbase, whose terms bar resale, is never called.
  process.env.LICENCE_GATE = "on";
  t.after(() => { delete process.env.LICENCE_GATE; });
  const urls = stub(t, () => Response.json(ALL));
  const r = await lookupCryptoPrice("What is the price of Wrapped Bitcoin?");
  assert.equal(r.verdict, "not_found");
  assert.equal(r.price, undefined);
  assert.match(r.reason, /Bitstamp lists no WBTC market/);
  assert.ok(!urls.some((u) => UNLICENSED.test(u)), urls.join(", "));
});

test("a pair Bitstamp does not list is quoted from Coinbase's spot price, and named as such (2026-11-08)", async (t) => {
  // PEPE, TON and HYPE answered price_usd null with Bitstamp alone; Coinbase's shape as read on 2026-11-08.
  const urls = stub(t, (u) => {
    if (u.includes("bitstamp.net")) return Response.json(ALL);
    if (u === "https://api.coinbase.com/v2/prices/PEPE-USD/spot") return Response.json({ data: { amount: "0.00000506", base: "PEPE", currency: "USD" } });
    if (u.includes("api.coinbase.com")) return Response.json({ error: "rpc error: code = NotFound desc = not found", code: 5 }, { status: 404 });
    return new Response("unexpected", { status: 500 });
  });
  const r = await lookupCryptoPrice("What is the price of $PEPE?");
  assert.equal(r.verdict, "price");
  assert.equal(r.price, 0.00000506);
  assert.equal(r.source, "Coinbase");
  assert.equal(r.bid, undefined, "a spot price has no book");
  assert.match(r.reason, /^PEPE is \$0\.000005060 USD, Coinbase's spot price read at \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC\./);
  assert.deepEqual(urls, ["https://www.bitstamp.net/api/v2/ticker/pepeusd/", "https://api.coinbase.com/v2/prices/PEPE-USD/spot"]);
  // The handler sends `symbol=PEPE` with no question as the bare ticker; it answered "No cryptocurrency was named".
  const bare = await lookupCryptoPrice("PEPE");
  assert.equal(bare.verdict, "price");
  assert.equal(bare.symbol, "PEPE");
  const none = await lookupCryptoPrice("What is the price of $ZZZQ?");
  assert.equal(none.verdict, "not_found");
  assert.match(none.reason, /^Neither Bitstamp nor Coinbase lists a ZZZQ market/);
});

test("a fiat quote Bitstamp does not list is derived from the USD pair and the blended FX rate, and says so", async (t) => {
  const urls = stub(t, (u) => {
    if (u.endsWith("/ticker/solinr/")) return Response.json(ALL);
    if (u.endsWith("/ticker/solusd/")) return Response.json(TICK("180.00"));
    if (u === "https://api.frankfurter.dev/v2/rate/USD/INR") return Response.json({ date: "2026-10-23", base: "USD", quote: "INR", rate: 88.5 });
    return new Response("unexpected", { status: 500 });
  });
  const r = await lookupCryptoPrice("What is the price of Solana in INR?");
  assert.equal(r.verdict, "price");
  assert.equal(r.price, 180 * 88.5);
  assert.equal(r.usd_price, 180);
  assert.equal(r.fx_rate, 88.5);
  assert.equal(r.fx_as_of, "2026-10-23");
  assert.equal(r.source, "Bitstamp, Frankfurter");
  assert.match(r.reason, /^Solana \(SOL\) is about 15,930\.00 INR: Bitstamp's last SOL-USD trade at .* was \$180\.00 USD, converted at 1 USD = 88\.5000 INR, Frankfurter's blended central-bank rate whose newest contributing rate is dated 2026-10-23\. Bitstamp does not quote SOL in INR\./);
  assert.ok(!urls.some((u) => UNLICENSED.test(u) || u.includes("er-api")), urls.join(", "));
  assert.ok(!urls.some((u) => u.endsWith("/ticker/solinr/")), "INR is never a Bitstamp quote, so the direct pair is not fetched");
});

test("a crypto quote with no direct pair is the ratio of two Bitstamp USD pairs", async (t) => {
  stub(t, (u) => {
    if (u.endsWith("/ticker/dogebtc/")) return Response.json(ALL);
    if (u.endsWith("/ticker/dogeusd/")) return Response.json(TICK("0.2000", "1792821500"));
    if (u.endsWith("/ticker/btcusd/")) return Response.json(TICK("80000.00", "1792821540"));
    return new Response("unexpected", { status: 500 });
  });
  const r = await lookupCryptoPrice("What is the price of Dogecoin in BTC?");
  assert.equal(r.verdict, "price");
  assert.equal(r.price, 0.2 / 80000);
  assert.match(r.reason, /derived from Bitstamp's last DOGE-USD trade \(\$0\.2000 USD\) and BTC-USD trade \(\$80,000\.00 USD\), the older of the two at /);
  assert.match(r.reason, new RegExp(new Date(1792821500 * 1000).toISOString().slice(0, 19).replace("T", " ")));
});

test("the bot wall's 503 HTML page is an outage, not a price and not 'unlisted'", async (t) => {
  stub(t, () => new Response("<html>Request unsuccessful. Incapsula incident ID</html>", { status: 503 }));
  const r = await lookupCryptoPrice("price of ETH");
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "upstream_unavailable");
});

test("an outside-the-table name is not guessed into a ticker; a $TICKER is checked on Bitstamp", async (t) => {
  const urls = stub(t, (u) => (u.endsWith("/ticker/pepeusd/") ? Response.json(TICK("0.00001234")) : Response.json(ALL)));
  const name = await lookupCryptoPrice("What is the price of Shiba Inu?");
  assert.equal(name.verdict, "not_found");
  assert.match(name.reason, /looked up by ticker only/);
  assert.equal(urls.length, 0, "a multi-word name needs no network call");
  const sym = await lookupCryptoPrice("What is $PEPE trading at?");
  assert.equal(sym.verdict, "price");
  assert.match(sym.reason, /^PEPE is \$0\.00001234 USD, the last Bitstamp trade/);
});

test("a past day uses Bitstamp's daily candle only when its timestamp is that day", async (t) => {
  const start = Date.parse("2024-01-01T00:00:00Z") / 1000;
  let reply = { timestamp: String(start), open: "42258.00", close: "44187.00" };
  stub(t, (u) => {
    if (u.includes("/ohlc/btcusd/") && u.includes(`start=${start}`)) return Response.json({ data: { pair: "BTC/USD", ohlc: [reply] } });
    if (u.includes("/ohlc/")) return new Response("", { status: 404 });
    return new Response("unexpected", { status: 500 });
  });
  const now = new Date("2026-10-24T00:00:00Z");
  const r = await lookupCryptoPrice("What was the price of Bitcoin on 2024-01-01?", "", now);
  assert.equal(r.verdict, "historical_price");
  assert.equal(r.open, 42258);
  assert.equal(r.close, 44187);
  assert.match(r.reason, /^On 2024-01-01, Bitcoin \(BTC\) opened at \$42,258\.00 USD and closed at \$44,187\.00 USD on Bitstamp for the UTC day\./);
  // Bitstamp returns the latest candle when the requested day has none.
  reply = { timestamp: "1792800000", open: "81076.46", close: "80632.43" };
  const wrong = await lookupCryptoPrice("What was the price of Bitcoin on 2024-01-01?", "", now);
  assert.equal(wrong.error, "upstream_unavailable");
  assert.equal(wrong.open, undefined);
  const unlisted = await lookupCryptoPrice("What was the price of Wrapped Bitcoin on 2024-01-01?", "", now);
  assert.equal(unlisted.verdict, "not_found");
});

test("a pair read in the last 10 s is reused, and an outage is not cached", async (t) => {
  let wall = true;
  const urls = stub(t, () => (wall ? new Response("<html>Incapsula</html>", { status: 503 }) : Response.json(TICK("2100.00"))));
  assert.equal((await lookupCryptoPrice("price of ETH")).error, "upstream_unavailable");
  wall = false;
  assert.equal((await lookupCryptoPrice("price of ETH")).price, 2100, "the 503 must not be remembered");
  assert.equal((await lookupCryptoPrice("What is ETH worth?")).price, 2100);
  // The outage also tries the Coinbase fallback once; neither 503 is remembered.
  const bitstamp = urls.filter((u) => u.includes("bitstamp.net"));
  assert.equal(bitstamp.length, 2, `the third question should be served from the cache: ${urls.join(", ")}`);
});
