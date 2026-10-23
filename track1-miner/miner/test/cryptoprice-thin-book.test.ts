import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupCryptoPrice } from "../src/cryptoprice";

test("a venue book more than 2% from the aggregate does not lead the answer (2026-10-21)", async (t) => {
  // The figures production read for SOL in INR at 08:29 UTC on 2026-10-21.
  const now = new Date("2026-10-21T08:29:30Z");
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    if (u.includes("coinbase.com")) return Response.json({ price: "10723.59", time: "2026-10-21T08:12:26.014Z" });
    if (u.includes("kraken.com")) return Response.json({ result: {} });
    return Response.json({ solana: { inr: 10085.08, last_updated_at: Math.floor(now.getTime() / 1000) } });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const r = await lookupCryptoPrice("What is the price of Solana in INR?", "", now);
  assert.equal(r.price, 10085.08);
  assert.equal(r.source, "CoinGecko");
  assert.match(r.reason, /^Solana \(SOL\) is 10,085\.08 INR, the CoinGecko aggregate/);
  assert.match(r.reason, /Coinbase's SOL-INR book.*10,723\.59 INR, 6\.3% away/);
});
