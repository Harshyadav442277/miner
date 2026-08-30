import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/handler";

function healthRequest(query: string): { req: IncomingMessage; res: ServerResponse } {
  const req = { method: "GET", url: `/health?query=${encodeURIComponent(query)}` } as IncomingMessage;
  const res = { writeHead() {}, end() {} } as unknown as ServerResponse;
  return { req, res };
}

test("request logging is off by default", () => {
  const prior = process.env.LOG_QUERY;
  const original = process.stdout.write;
  let logged = "";
  delete process.env.LOG_QUERY;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    logged += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    const { req, res } = healthRequest("private text");
    handleRequest(req, res);
    assert.equal(logged, "");
  } finally {
    process.stdout.write = original;
    if (prior === undefined) delete process.env.LOG_QUERY;
    else process.env.LOG_QUERY = prior;
  }
});

test("opt-in logging records parameter names, never values", () => {
  const prior = process.env.LOG_QUERY;
  const original = process.stdout.write;
  let logged = "";
  process.env.LOG_QUERY = "on";
  process.stdout.write = ((chunk: string | Uint8Array) => {
    logged += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    const { req, res } = healthRequest("private text");
    handleRequest(req, res);
    assert.match(logged, /health.*query/);
    assert.doesNotMatch(logged, /private|text/);
  } finally {
    process.stdout.write = original;
    if (prior === undefined) delete process.env.LOG_QUERY;
    else process.env.LOG_QUERY = prior;
  }
});

test("/translate answers with the bare translation, unrestated", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(["Бонжур"]), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof globalThis.fetch;
  try {
    const body = await new Promise<Record<string, unknown>>((resolve) => {
      const req = {
        method: "GET",
        url: `/translate?query=${encodeURIComponent('Translate "good morning" into Russian.')}`,
      } as IncomingMessage;
      const res = {
        writeHead() {},
        end(payload?: unknown) {
          resolve(JSON.parse(String(payload)) as Record<string, unknown>);
        },
      } as unknown as ServerResponse;
      handleRequest(req, res);
    });
    // The recorded ground truths are bare translations; any restatement or
    // provenance prose around a non-Latin translation measured as dilution.
    assert.equal(body.reason, "Бонжур");
    assert.equal(body.source, "Google Translate");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
