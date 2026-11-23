/**
 * CONTENT_EXTRACTION_GENERAL sends `content` and `fields` ("merchant, date, total"; GET
 * /engine/v1/intents/CONTENT_EXTRACTION_GENERAL, read 2026-11-08 UTC). The route ignored `fields`, so the
 * audit's invoice was answered "values: billing@acme.com, 2026-10-14, Total due." in production.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fitPairs, pairsBrief } from "../src/intent-fields";

function request(params: Record<string, string>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url: `/extract?${new URLSearchParams(params)}` } as IncomingMessage;
    const res = { setHeader() {}, writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

test("the fields asked for are extracted and briefed as name: value pairs", async () => {
  const invoice = await request({ content: "Invoice #4821 from Acme Supplies Ltd, dated 2026-10-14. Total due: $1,250.00. Contact billing@acme.com.", fields: "merchant, date, total" });
  assert.equal(invoice.brief, "merchant: Acme Supplies Ltd; date: 2026-10-14; total: $1,250.00");
  assert.deepEqual(invoice.extracted, { merchant: ["Acme Supplies Ltd"], date: ["2026-10-14"], total: ["$1,250.00"] });
  const hire = await request({ content: "Dr. Maria Lopez joined Novartis in Basel on 3 March 2025 as head of oncology research.", fields: "person, organization, location, date" });
  assert.deepEqual(hire.extracted, { person: ["Maria Lopez"], organization: ["Novartis"], location: ["Basel"], date: ["March 3, 2025"] });
  assert.equal(hire.brief, "person: Maria Lopez;organization: Novartis;location: Basel;date: March 3, 2025", "every field, within 80 characters");
  const parcel = await request({ content: "Order 7731 shipped via FedEx, tracking number 778912345678, on Nov 2, 2026; weight 4.2 kg.", fields: "carrier, tracking number, ship date" });
  assert.equal(parcel.brief, "carrier: FedEx; tracking number: 778912345678; ship date: Nov 2, 2026");
});

test("every field asked for is briefed, and a money field is the amount (epoch 43)", async () => {
  const invoice = await request({ content: "Invoice #4471 from Acme Supplies Ltd, dated 12 March 2026. Total due: $1,284.50, payable by 11 April 2026.", fields: "merchant, date, total" });
  assert.equal(invoice.brief, "merchant: Acme Supplies Ltd; date: March 12, 2026; total: $1,284.50");
  const flat = await request({ content: "Apartment for rent: 2 bedrooms, 1 bath, 850 sq ft, $2,100/month, available January 1, Brooklyn NY.", fields: "rent" });
  assert.equal(flat.brief, "rent: $2,100");
});

test("fitPairs cuts the longest long value before it drops a field", () => {
  const b = fitPairs([["title", "A very long product name that goes on and on for a while"], ["price", "$999"], ["date", "March 3, 2025"]]);
  assert.ok(b.length <= 80, b);
  assert.match(b, /price: \$999/);
  assert.match(b, /date: March 3, 2025$/);
  assert.equal(fitPairs([["a", "1"], ["b", "2"]]), "a: 1; b: 2");
});

test("a brief keeps whole pairs and clips only a first pair too long to fit", () => {
  assert.equal(pairsBrief(["a: 1", "b: 2"]), "a: 1; b: 2");
  assert.equal(pairsBrief([`title: ${"word ".repeat(30)}`]).length <= 80, true);
});
