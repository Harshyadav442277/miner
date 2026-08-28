import { test } from "node:test";
import assert from "node:assert/strict";
import { translate } from "../src/translate";

test("uses MyMemory when it returns a translation", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ responseData: { translatedText: "Bonjour" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await translate('Translate "good morning" into French');
    assert.equal(result.translation, "Bonjour");
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("falls back when the shared MyMemory quota returns 429", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("mymemory")) return new Response("quota", { status: 429 });
    return new Response(JSON.stringify(["Bonjour"]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await translate('Translate "good morning" into French');
    assert.equal(result.translation, "Bonjour");
    assert.equal(urls.length, 2);
    assert.match(urls[1]!, /clients5\.google\.com/);
  } finally {
    globalThis.fetch = original;
  }
});

test("the quota fallback returns a real translation (live)", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("mymemory")) return new Response("quota", { status: 429 });
    return original(input, init);
  };
  try {
    const result = await translate('Translate "good morning" into French');
    assert.match(result.translation ?? "", /bonjour/i);
  } finally {
    globalThis.fetch = original;
  }
});
