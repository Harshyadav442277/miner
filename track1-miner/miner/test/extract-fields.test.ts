/**
 * CONTENT_EXTRACTION_GENERAL sends `content` and `fields` ("merchant, date, total"; GET
 * /engine/v1/intents/CONTENT_EXTRACTION_GENERAL, read 2026-11-08 UTC). The route ignored `fields`, so the
 * audit's invoice was answered "values: billing@acme.com, 2026-10-14, Total due." in production.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";
import { pairsBrief } from "../src/intent-fields";

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
  assert.equal(hire.brief, "person: Maria Lopez; organization: Novartis; location: Basel", "whole pairs only, within 80 characters");
  const parcel = await request({ content: "Order 7731 shipped via FedEx, tracking number 778912345678, on Nov 2, 2026; weight 4.2 kg.", fields: "carrier, tracking number, ship date" });
  assert.equal(parcel.brief, "carrier: FedEx; tracking number: 778912345678; ship date: Nov 2, 2026");
});

test("a brief keeps whole pairs and clips only a first pair too long to fit", () => {
  assert.equal(pairsBrief(["a: 1", "b: 2"]), "a: 1; b: 2");
  assert.equal(pairsBrief([`title: ${"word ".repeat(30)}`]).length <= 80, true);
});
