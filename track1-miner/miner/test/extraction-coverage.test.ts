import { test } from "node:test";
import assert from "node:assert/strict";
import { extractContent } from "../src/content";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";

test("extraction follows the requested field rather than keywords in the payload", () => {
  const r = extractContent('Extract dates from: "Email sam@example.com before March 12, 2026."');
  assert.deepEqual(r.fields.dates, ["March 12, 2026"]);
  assert.doesNotMatch(r.summary, /No date/);
});

test("all explicitly requested extraction categories are returned", () => {
  const r = extractContent('Extract email addresses and dates from: "Email sam@example.com before March 12, 2026."');
  assert.deepEqual(r.fields.emails, ["sam@example.com"]);
  assert.deepEqual(r.fields.dates, ["March 12, 2026"]);
});

test("apostrophes inside a quoted payload do not cut off the rest of the data", () => {
  const r = extractContent('Extract contact details from: "We\'ll contact O\'Connor at sam@example.com or pat@example.com."');
  assert.deepEqual(r.fields.emails, ["sam@example.com", "pat@example.com"]);
});

test("currency extraction preserves thousands and decimal cents", () => {
  const r = extractContent('Extract numeric values from: "Revenue was $1,234.56 and expenses were $7,890.12."');
  assert.deepEqual(r.fields.values, ["$1,234.56", "$7,890.12"]);
});

test("a month followed only by a year does not invent a day", () => {
  const r = extractContent('Extract dates from: "The project began in March 2026."');
  assert.ok(!r.fields.dates?.includes("March 20"));
});

test("structured extraction text is authoritative even when the instruction quotes a field label", async () => {
  const body = await new Promise<Record<string, any>>(resolve => {
    const params = new URLSearchParams({ query: 'Extract the "contact details" from this text.', text: "Email sam@example.com by March 12, 2026." });
    const req = { method: "GET", url: `/extract?${params}` } as IncomingMessage;
    const res = { writeHead() {}, end(payload: string) { resolve(JSON.parse(payload)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
  assert.deepEqual(body.extracted.emails, ["sam@example.com"]);
});
