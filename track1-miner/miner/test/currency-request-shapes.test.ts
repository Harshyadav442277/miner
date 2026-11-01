/**
 * CURRENCY_EXCHANGE request shapes — the spellings the engine's request-builder
 * writes, and the three-letter words that are not ISO 4217 codes.
 *
 * The node fills our parameters with an LLM, so what arrives is what a model
 * writes for "the currency being converted from", not what our manifest spells.
 * Three miners in this intent's own field declare `base` + `symbols`
 * (`fxex-frankfurter`, `-jpy`, `-hist`, read from their `yaml_url` on
 * 2026-09-19), which is the spelling the builder has seen most. Verified against
 * https://miner-wine.vercel.app the same day, on a USD/JPY question:
 *
 *   base=USD&symbols=JPY   -> "1 USD = 0.8726 EUR"          (the wrong pair)
 *   source=USD&target=JPY  -> "JPY and JPY are the same currency"
 *   currency_from/currency_to -> "this request named none"
 *   from=Dollar&to=Yen     -> "The USD to YEN exchange rate could not be retrieved"
 *
 * The last one is the value half: "YEN" is three uppercase letters, so it passed
 * the shape test the route used for an ISO code and then no feed had a rate for
 * it. Epoch 342's question was USD/JPY — `fxex-fawaz-*` leaked it with a 404 on
 * `/v1/currencies/JPY.json` — and we scored 2.098e-7 there while the one miner
 * that read the pair scored 0.9999.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCurrency } from "../src/currency";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";

/** The ECB's daily reference feed, with just enough of it to cross-rate. */
const ECB = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
<Cube><Cube time="2026-09-18">
<Cube currency="USD" rate="1.1460"/>
<Cube currency="JPY" rate="180.94"/>
<Cube currency="GBP" rate="0.8700"/>
</Cube></Cube></gesmes:Envelope>`;

async function withEcb(run: () => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    if (String(url).includes("eurofxref")) return new Response(ECB);
    throw new Error("no other feed is reachable in this test");
  }) as typeof fetch;
  try { await run(); } finally { globalThis.fetch = original; }
}

function request(params: Record<string, string>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url: `/convert?${new URLSearchParams(params)}` } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

test("a currency name resolves to its code before the three-letter shape is trusted", () => {
  assert.equal(normalizeCurrency("Yen"), "JPY");
  assert.equal(normalizeCurrency("YEN"), "JPY");
  assert.equal(normalizeCurrency("Dollar"), "USD");
  assert.equal(normalizeCurrency("US Dollar"), "USD");
  assert.equal(normalizeCurrency("Japanese Yen"), "JPY");
  assert.equal(normalizeCurrency("$"), "USD");
  assert.equal(normalizeCurrency("€"), "EUR");
  // A code that is not a currency word is still a code: the ECB and the market
  // feed know currencies this module has no English name for.
  assert.equal(normalizeCurrency("AED"), "AED");
  assert.equal(normalizeCurrency("usd"), "USD");
  assert.equal(normalizeCurrency("TRY"), "TRY");
  assert.equal(normalizeCurrency("USD."), "USD");
});

test("a placeholder or an unreadable value is not a currency", () => {
  for (const value of ["", "  ", "unknown", "N/A", "none", "null", "string", "XXX", "currency", "dollars and cents"]) {
    assert.equal(normalizeCurrency(value), null, `${value} was read as a currency`);
  }
});

test("every from/to spelling this intent's field uses reaches the same pair", async () => {
  await withEcb(async () => {
    const shapes: Array<Record<string, string>> = [
      { from: "USD", to: "JPY" },
      { base: "USD", quote: "JPY" },
      { base: "USD", symbols: "JPY" },
      { source: "USD", target: "JPY" },
      { from_currency: "USD", to_currency: "JPY" },
      { currency_from: "USD", currency_to: "JPY" },
      { source_currency: "USD", target_currency: "JPY" },
      { from: "Dollar", to: "Yen" },
      { from: "us dollars", to: "japanese yen" },
      { pair: "USD/JPY" },
    ];
    for (const shape of shapes) {
      const body = await request(shape);
      assert.equal(body.verdict, "rate", `${JSON.stringify(shape)} did not produce a rate`);
      assert.match(String(body.reason), /^1 USD = 157\.888 JPY/, JSON.stringify(shape));
    }
  });
});

test("a placeholder in one side falls back to the question rather than inverting the pair", async () => {
  await withEcb(async () => {
    const body = await request({ from: "unknown", to: "JPY", query: "What is the exchange rate from USD to JPY?" });
    assert.equal(body.verdict, "rate");
    assert.match(String(body.reason), /^1 USD = 157\.888 JPY/);
  });
});

test("one currency named is still one currency named", async () => {
  await withEcb(async () => {
    // The counter currency defaults, as it has since the three routed questions
    // of this shape were measured; what must not happen is the same code on
    // both sides because the other parameter was unreadable.
    const body = await request({ from: "USD", to: "not a currency" });
    assert.equal(body.verdict, "rate");
    assert.doesNotMatch(String(body.reason), /are the same currency/);
  });
});
