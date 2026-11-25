import { test } from "node:test";
import assert from "node:assert/strict";
import { webSearch } from "../src/websearch";
import { openGate } from "./licence-fixtures";

openGate("google-news");

// Production, 2026-11-26: the answer was the Wikipedia sentence, which does not address the question.
test("with only background found, a labelled knowledge answer to the question leads", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("news.google.com")) return new Response("<rss><channel></channel></rss>", { status: 200 });
    if (url.includes("page/summary/Capivasertib")) {
      return new Response(JSON.stringify({ title: "Capivasertib", extract: "Capivasertib, sold under the brand name Truqap, is an anti-cancer medication used for the treatment of breast cancer." }), { status: 200 });
    }
    if (url.includes("api.groq.com")) {
      const content = JSON.stringify({ brief: "No report says capivasertib deaths will exceed 100.", basis: "knowledge" });
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof globalThis.fetch;
  process.env.GROQ_API_KEY = "test-key";
  const { resetPhraseState } = await import("../src/llm");
  resetPhraseState();
  try {
    const r = await webSearch("Will Capivasertib deaths exceed 100?");
    assert.equal(r.verdict, "answered");
    assert.match(r.reason, /^No report says capivasertib deaths will exceed 100\. That is from general knowledge, not from this search\. According to Wikipedia: Capivasertib, sold under/);
    assert.deepEqual(r.sources, ["https://en.wikipedia.org/wiki/Capivasertib"]);
  } finally {
    globalThis.fetch = original;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
});
