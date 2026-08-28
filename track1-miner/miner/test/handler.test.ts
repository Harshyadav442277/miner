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
