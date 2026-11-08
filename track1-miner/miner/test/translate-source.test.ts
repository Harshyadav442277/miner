import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceLanguage, translate } from "../src/translate";
import { scoredFields } from "../src/intent-fields";
import { groqReply, withGroqKey } from "./groq-fixtures";

// LANGUAGE_TRANSLATION_GENERAL's response format names `source_language` (GET
// /engine/v1/intents/LANGUAGE_TRANSLATION_GENERAL, read 2026-11-08 UTC); the answer never carried it.

test("the source language is the one stated, else the one the text shows, else nothing", () => {
  assert.deepEqual(sourceLanguage("Translate this from Swedish to English\n\nHej, jag heter Wick", "Hej, jag heter Wick"),
    { name: "swedish", code: "sv", basis: "stated" });
  assert.equal(sourceLanguage("Translate the following English passage into natural Hebrew: \"Hi there\"", "Hi there")!.basis, "stated");
  assert.equal(sourceLanguage("Translate \"x y\" into French", "x y", "de")!.name, "german", "the parameter, by code");
  assert.deepEqual(sourceLanguage("Translate \"Καλημέρα\" into English", "Καλημέρα"), { name: "greek", code: "el", basis: "detected from the script" });
  assert.equal(sourceLanguage("Translate \"Good morning, how are you?\" into French", "Good morning, how are you?")!.name, "english");
  assert.equal(sourceLanguage("Translate \"Hola, cómo estás\" into French", "Hola, cómo estás"), null, "no guess");
  assert.equal(sourceLanguage("Translate \"你好\" into English", "你好"), null, "Han alone may be Chinese or Japanese");
  assert.equal(sourceLanguage("Translate \"the French word for cat\" into German", "the French word for cat")!.name, "english",
    "a language named inside the text is not a statement about it");
});

test("a translation carries its source language, and its brief is the translation", async (t) => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => groqReply("Bonjour, comment allez-vous ?")) as typeof fetch;
  t.after(() => { globalThis.fetch = real; });
  const r = await withGroqKey(() => translate("Translate \"Good morning, how are you?\" into French."));
  assert.equal(r.source_language, "English");
  assert.equal(r.source_code, "en");
  assert.equal(r.source_language_basis, "detected from common English words");
  assert.equal(scoredFields("/translate", r).brief, "Bonjour, comment allez-vous ?");
});
