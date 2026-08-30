import { test } from "node:test";
import assert from "node:assert/strict";
import { translate } from "../src/translate";

test("uses Google first when it returns a translation", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return new Response(JSON.stringify(["Bonjour"]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await translate('Translate "good morning" into French');
    assert.equal(result.translation, "Bonjour");
    assert.equal(urls.length, 1);
    assert.match(urls[0]!, /clients5\.google\.com/);
    // The reason IS the translation — the recorded ground truths are bare
    // translations and any wrapping measured as dilution. Provenance is a field.
    assert.equal(result.reason, "Bonjour");
    assert.equal(result.source, "Google Translate");
  } finally {
    globalThis.fetch = original;
  }
});

test("falls back to MyMemory when Google does not answer", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("clients5.google.com")) return new Response("nope", { status: 500 });
    return new Response(JSON.stringify({ responseData: { translatedText: "Bonjour" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await translate('Translate "good morning" into French');
    assert.equal(result.translation, "Bonjour");
    assert.equal(urls.length, 2);
    assert.match(urls[1]!, /mymemory/);
    assert.equal(result.source, "MyMemory");
  } finally {
    globalThis.fetch = original;
  }
});

test("the fallback returns a real translation (live)", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("clients5.google.com")) return new Response("nope", { status: 500 });
    return original(input, init);
  };
  try {
    const result = await translate('Translate "good morning" into French');
    assert.match(result.translation ?? "", /bonjour/i);
  } finally {
    globalThis.fetch = original;
  }
});
