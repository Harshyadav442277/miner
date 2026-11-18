import { test } from "node:test";
import assert from "node:assert/strict";
import { declaredSymbol } from "../src/financial";

test("a company or coin name in the declared symbol becomes its ticker (production misses, 2026-11-17)", () => {
  assert.equal(declaredSymbol("Apple"), "AAPL");
  assert.equal(declaredSymbol("Tesla"), "TSLA");
  assert.equal(declaredSymbol("NVIDIA"), "NVDA");
  assert.equal(declaredSymbol("TESLA"), "TSLA");
  assert.equal(declaredSymbol("Solana"), "SOL");
  assert.equal(declaredSymbol("Bitcoin"), "BTC");
});

test("a ticker stays a ticker", () => {
  assert.equal(declaredSymbol("AAPL"), "AAPL");
  assert.equal(declaredSymbol("aapl"), "AAPL");
  assert.equal(declaredSymbol("META"), "META");
  assert.equal(declaredSymbol("BTC"), "BTC");
  assert.equal(declaredSymbol(" msft "), "MSFT");
  assert.equal(declaredSymbol(""), "");
});
