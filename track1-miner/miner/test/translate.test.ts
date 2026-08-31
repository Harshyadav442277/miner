import { test } from "node:test";
import assert from "node:assert/strict";
import { translate, targetLanguage } from "../src/translate";

test("resolves ISO 639-1 codes the manifest invites (epoch-297 refusal)", () => {
  // miner.yaml: "by name or ISO 639-1 code, e.g. Spanish or fr". The handler
  // composes `Translate "..." into de.` when the engine fills a code, and
  // until 2026-08-31 that was refused — measured at 2.4e-11 live vs ~3.5e-10
  // for an answered translation under champion reg 2296.
  assert.equal(targetLanguage('Translate "Thank you very much for your help." into de.')?.code, "de");
  assert.equal(targetLanguage('Translate "Good morning" into fr.')?.code, "fr");
  assert.equal(targetLanguage('Translate "Good morning" into FR.')?.code, "fr");
  assert.equal(targetLanguage('Translate "Hello" into zh-CN.')?.code, "zh-CN");
  assert.equal(targetLanguage('Translate "Hello" into zh.')?.code, "zh-CN");
  assert.equal(targetLanguage('Translate "Hello" into ja.')?.code, "ja");
});

test("codes never outrank a language name found anywhere in the question", () => {
  // Names resolve first, byte-identical to the pre-code behaviour; the code
  // pass runs only where the old code refused.
  assert.equal(targetLanguage('Translate "Good morning" into French.')?.code, "fr");
  assert.equal(targetLanguage('Translate "Hello" into Mandarin Chinese.')?.code, "zh-CN");
  assert.equal(targetLanguage("Put this into German for me, not into de.")?.code, "de");
  // Still a refusal when nothing names a language.
  assert.equal(targetLanguage('Translate "Hello" please.'), null);
  assert.equal(targetLanguage('Translate "Hello" into denmark.'), null);
});

test("a code-shaped request reaches the provider with the right tl", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return new Response(JSON.stringify(["Vielen Dank für Ihre Hilfe."]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await translate('Translate "Thank you very much for your help." into de.');
    assert.equal(result.verdict, "translated");
    assert.equal(result.reason, "Vielen Dank für Ihre Hilfe.");
    assert.equal(result.target_code, "de");
    assert.match(urls[0]!, /tl=de/);
  } finally {
    globalThis.fetch = original;
  }
});

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
