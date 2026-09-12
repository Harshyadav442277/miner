import { test } from "node:test";
import assert from "node:assert/strict";
import {
  candidateName, formatPrice, knownAsset, lookupCryptoPrice, quoteCurrency, requestedDate, testnetName,
} from "../src/cryptoprice";

test("majors are matched by name or ticker, never inside another word", () => {
  assert.equal(knownAsset("ethereum price today")?.symbol, "ETH");
  assert.equal(knownAsset("BTC price")?.symbol, "BTC");
  assert.equal(knownAsset("how much is USDC worth?")?.symbol, "USDC");
  assert.equal(knownAsset("What is the current price of Ethereum (ETH) in USD?")?.gecko, "ethereum");
  // Word boundaries: "dotted", "linked" and "method" name no asset.
  assert.equal(knownAsset("a dotted line linked to a method"), null);
  assert.equal(knownAsset("crypto price check"), null);
});

test("a major's name inside another coin's name is never that major (verifier, 2026-09-12)", () => {
  assert.equal(knownAsset("Bitcoin Cash price")?.symbol, "BCH");
  assert.equal(knownAsset("Ethereum Classic price in USD")?.symbol, "ETC");
  assert.equal(knownAsset("What is the price of Wrapped Bitcoin (WBTC)?")?.symbol, "WBTC");
  assert.equal(knownAsset("Bitcoin Gold price"), null);
  assert.equal(knownAsset("staked ETH price"), null);
  assert.equal(candidateName("Bitcoin Gold price"), "Bitcoin Gold");
});

test("the asset named first wins, and the quote clause is not the asset", () => {
  assert.equal(knownAsset("What is the price of ETH in BTC?")?.symbol, "ETH");
  assert.equal(quoteCurrency("What is the price of ETH in BTC?"), "BTC");
  assert.equal(knownAsset("Is it a good time to invest in bitcoin?")?.symbol, "BTC");
  assert.equal(knownAsset("price of SOL vs ETH")?.symbol, "SOL");
});

test("tickers that are English words match only in capitals", () => {
  assert.equal(knownAsset("Is it a good time to link my wallet?"), null);
  assert.equal(knownAsset("Send me the link to the price of PEPE"), null);
  assert.equal(candidateName("Send me the link to the price of PEPE"), "PEPE");
  assert.equal(knownAsset("LINK price")?.symbol, "LINK");
  assert.equal(knownAsset("connect the dot"), null);
});

test("a multi-word coin name is kept whole", () => {
  assert.equal(candidateName("What is the price of Shiba Inu?"), "Shiba Inu");
  assert.equal(candidateName("what is the Shiba Inu price"), "Shiba Inu");
  assert.equal(candidateName("price of the Pepe token today"), "Pepe");
});

test("more quote currencies are read, not silently replaced by USD", () => {
  assert.equal(quoteCurrency("bitcoin price in JPY"), "JPY");
  assert.equal(quoteCurrency("ETH price in rupees"), "INR");
});

test("a testnet is named as having no market price", () => {
  assert.equal(testnetName("ETH on Sepolia price"), "Sepolia");
  assert.equal(testnetName("What is the price of Base sepolia now?"), "Base sepolia");
  assert.match(String(testnetName("goerli ETH price")), /goerli/i);
  assert.equal(testnetName("What is the price of Base ETH now?"), null);
});

test("the quote currency defaults to USD and follows an explicit 'in EUR'", () => {
  assert.equal(quoteCurrency("price of bitcoin in EUR"), "EUR");
  assert.equal(quoteCurrency("ETH price in pounds"), "GBP");
  assert.equal(quoteCurrency("ETH price"), "USD");
  assert.equal(quoteCurrency("bitcoin in the news"), "USD");
});

test("an asset outside the table is taken from $TICKER or 'price of X', never from filler", () => {
  assert.equal(candidateName("What is the price of $PEPE?"), "PEPE");
  assert.equal(candidateName("price of Hyperliquid right now"), "Hyperliquid");
  assert.equal(candidateName("Bonk price"), "Bonk");
  assert.equal(candidateName("crypto price check"), null);
  assert.equal(candidateName("what is the current price"), null);
});

test("a historical date is read in ISO, named-month and 'yesterday' forms", () => {
  const now = new Date("2026-09-12T12:00:00Z");
  assert.equal(requestedDate("What was the price of Bitcoin on 2026-09-01?", now), "2026-09-01");
  assert.equal(requestedDate("ETH price on September 3, 2026", now), "2026-09-03");
  assert.equal(requestedDate("ETH price on 3rd September 2026", now), "2026-09-03");
  assert.equal(requestedDate("BTC price yesterday", now), "2026-09-11");
  assert.equal(requestedDate("BTC price now", now), null);
});

test("prices keep their meaningful digits", () => {
  assert.equal(formatPrice(77183.58, "USD"), "$77,183.58 USD");
  assert.equal(formatPrice(0.99986, "USD"), "$0.9999 USD");
  assert.equal(formatPrice(0.00001234, "USD"), "$0.00001234 USD");
  assert.equal(formatPrice(66543.7, "EUR"), "€66,543.70 EUR");
});

test("refusals that need no network are named, not guessed", async () => {
  const none = await lookupCryptoPrice("crypto price check");
  assert.equal(none.error, "no_subject");
  const empty = await lookupCryptoPrice("");
  assert.equal(empty.error, "no_subject");
  const host = await lookupCryptoPrice("github.com");
  assert.equal(host.error, "no_subject");
  const testnet = await lookupCryptoPrice("What is the price of Base sepolia now?");
  assert.equal(testnet.verdict, "no_market_price");
  assert.match(testnet.reason, /test network/);
});

test("a future date is declined as a prediction", async () => {
  const r = await lookupCryptoPrice("What will the price of Bitcoin be on 2030-01-01?", "", new Date("2026-09-12T00:00:00Z"));
  assert.equal(r.error, "future_date");
  assert.match(r.reason, /prediction/);
});

test("(live) the current BTC price carries a figure, a venue and a UTC time", async () => {
  const r = await lookupCryptoPrice("What is the price of BTC right now?");
  if (r.error === "upstream_unavailable") return;
  assert.equal(r.verdict, "price");
  assert.match(r.reason, /^Bitcoin \(BTC\) is \$[\d,]+\.\d{2} USD, /);
  assert.match(r.reason, /(Coinbase|Kraken|CoinGecko)/);
  assert.match(r.reason, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/);
  const n = Number(r.reason.match(/\$([\d,]+\.\d{2})/)?.[1]?.replace(/,/g, ""));
  assert.ok(n > 1000 && n < 10_000_000, `implausible BTC price ${n}`);
});

test("(live) USDC is priced against its peg", async () => {
  const r = await lookupCryptoPrice("is USDC price stable?");
  if (r.error === "upstream_unavailable") return;
  assert.equal(r.verdict, "price");
  assert.match(r.reason, /% from its \$1\.00 peg/);
});
