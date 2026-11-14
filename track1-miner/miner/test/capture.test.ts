import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { captureEnabled, dayKey, record } from "../src/capture";
import { handleRequest } from "../src/handler";

function get(url: string, ua = "telegraph-node/2"): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve) => {
    let status = 0;
    const req = { method: "GET", url, headers: { "user-agent": ua, "x-forwarded-for": "203.0.113.9", authorization: "Bearer secret" } } as unknown as IncomingMessage;
    const res = { writeHead(s: number) { status = s; }, end(b: string) { resolve({ status, body: JSON.parse(b) }); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

test("capture: off without a store, and a record keeps only what is documented", () => {
  delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL;
  assert.equal(captureEnabled(), false);
  const r = record("/sanctions-screen", new URLSearchParams("name=Hezbollah&query=Is%20Hezbollah%20sanctioned%3F"), 200,
    { verdict: "possible_match", answer: "Possible match: Hezbollah …", reason: "long reason", matched: true }, "telegraph-node/2", 1_000, 1_450);
  assert.deepEqual(r.params, { name: "Hezbollah", query: "Is Hezbollah sanctioned?" });
  assert.equal(r.verdict, "possible_match");
  assert.equal(r.answer, "Possible match: Hezbollah …", "the answer lead, not the whole reason");
  assert.equal(r.ms, 450);
  assert.equal(r.ua, "telegraph-node/2");
  assert.deepEqual(Object.keys(r).sort(), ["answer", "at", "error", "ms", "params", "path", "status", "ua", "verdict"], "no IP, cookie or header");
  assert.equal(dayKey("2026-11-08T19:30:00.000Z"), "capture:2026-11-08");
});

test("capture: with a store, each answer is pushed after it is sent, with no IP or authorisation", async (t) => {
  const real = globalThis.fetch;
  const sent: Array<{ url: string; body: string; auth: string }> = [];
  process.env.KV_REST_API_URL = "https://example-store.upstash.io";
  process.env.KV_REST_API_TOKEN = "test-token";
  globalThis.fetch = (async (url: string, init?: { body?: string; headers?: Record<string, string> }) => {
    if (String(url).startsWith("https://example-store.upstash.io")) {
      sent.push({ url: String(url), body: String(init?.body), auth: init?.headers?.authorization ?? "" });
      return new Response("[]", { status: 200 });
    }
    return real(url as never, init as never);
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = real; delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; });

  const r = await get("/code-review");
  assert.equal(r.body.error, "no_code", "the answer itself is unchanged by capture");
  await new Promise((done) => setTimeout(done, 20));
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.url, "https://example-store.upstash.io/pipeline");
  assert.equal(sent[0]!.auth, "Bearer test-token");
  const [[cmd, key, value], [exp, , ttl]] = JSON.parse(sent[0]!.body) as [[string, string, string], [string, string, string]];
  assert.equal(cmd, "LPUSH");
  assert.match(key, /^capture:\d{4}-\d{2}-\d{2}$/);
  assert.equal(exp, "EXPIRE");
  assert.equal(ttl, String(14 * 86_400));
  const rec = JSON.parse(value) as Record<string, unknown>;
  assert.equal(rec.path, "/code-review");
  assert.equal(rec.error, "no_code");
  assert.equal(rec.ua, "telegraph-node/2");
  assert.ok(!/203\.0\.113\.9|secret/.test(value), "no IP address or authorisation header is kept");
});

test("capture: a store that fails never changes the answer", async (t) => {
  const real = globalThis.fetch;
  process.env.KV_REST_API_URL = "https://example-store.upstash.io";
  process.env.KV_REST_API_TOKEN = "test-token";
  globalThis.fetch = (async (url: string, init?: unknown) => {
    if (String(url).startsWith("https://example-store.upstash.io")) throw new Error("store down");
    return real(url as never, init as never);
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = real; delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; });
  const r = await get("/generate");
  assert.equal(r.body.error, "no_prompt");
  await new Promise((done) => setTimeout(done, 20));
});
