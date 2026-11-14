import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/handler";
import { resetPhraseState } from "../src/llm";

function get(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

test("a code review is cached by the exact code: two snippets differing only in case get their own review", async (t) => {
  const real = globalThis.fetch;
  process.env.GROQ_API_KEY = "test-key";
  resetPhraseState();
  let calls = 0;
  // The model's summary quotes the code it was sent, so a review served for the wrong snippet shows.
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    calls++;
    const code = (JSON.parse(init.body) as { messages: Array<{ content: string }> }).messages[1]!.content;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ verdict: "Comment", summary: `Reviewed: ${code}`, findings: [] }) } }] }), { status: 200 });
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = real; delete process.env.GROQ_API_KEY; resetPhraseState(); });

  const lower = await get(`/code-review?code=${encodeURIComponent("x = uid")}`);
  const upper = await get(`/code-review?code=${encodeURIComponent("x = UID")}`);
  assert.match(String(lower.summary), /x = uid$/);
  assert.match(String(upper.summary), /x = UID$/);
  assert.equal(calls, 2);
  const again = await get(`/code-review?code=${encodeURIComponent("x = uid")}`);
  assert.match(String(again.summary), /x = uid$/);
  assert.equal(calls, 2, "the identical snippet is served from the cache");

  // A "|" in the input once let code "a|" + query "b" share a key with code "a" + query "|b".
  const piped = await get(`/code-review?code=${encodeURIComponent("a|")}&query=b`);
  const shifted = await get(`/code-review?code=a&query=${encodeURIComponent("|b")}`);
  assert.match(String(piped.summary), /Reviewed: a\|$/);
  assert.match(String(shifted.summary), /Reviewed: a$/);
  assert.equal(calls, 4);
});
