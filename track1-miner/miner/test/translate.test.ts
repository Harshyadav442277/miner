import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { translate, targetLanguage, sourceText, cleanTranslation } from "../src/translate";
import { resetPhraseState } from "../src/llm";

/** Groq's chat-completions answer carrying `content`. */
const completion = (content: string): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });

let originalFetch: typeof fetch;
let originalKey: string | undefined;
beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-not-real";
  resetPhraseState();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalKey;
});

/** Records what was sent to the model and replies with `content`. */
function model(content: string | ((body: Record<string, any>) => string)): Array<Record<string, any>> {
  const sent: Array<Record<string, any>> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    assert.match(String(input), /api\.groq\.com/);
    const body = JSON.parse(String(init?.body));
    sent.push(body);
    return completion(typeof content === "function" ? content(body) : content);
  }) as typeof fetch;
  return sent;
}

test("resolves ISO 639-1 codes the manifest invites (epoch-297 refusal)", () => {
  // miner.yaml: "by name or ISO 639-1 code, e.g. Spanish or fr". The handler
  // composes `Translate "..." into de.` when the engine fills a code.
  assert.equal(targetLanguage('Translate "Thank you very much for your help." into de.')?.code, "de");
  assert.equal(targetLanguage('Translate "Good morning" into fr.')?.code, "fr");
  assert.equal(targetLanguage('Translate "Good morning" into FR.')?.code, "fr");
  assert.equal(targetLanguage('Translate "Hello" into zh-CN.')?.code, "zh-CN");
  assert.equal(targetLanguage('Translate "Hello" into zh.')?.code, "zh-CN");
  assert.equal(targetLanguage('Translate "Hello" into ja.')?.code, "ja");
});

test("codes never outrank a language name found anywhere in the question", () => {
  assert.equal(targetLanguage('Translate "Good morning" into French.')?.code, "fr");
  assert.equal(targetLanguage('Translate "Hello" into Mandarin Chinese.')?.code, "zh-CN");
  assert.equal(targetLanguage("Put this into German for me, not into de.")?.code, "de");
  // Still a refusal when nothing names a language.
  assert.equal(targetLanguage('Translate "Hello" please.'), null);
  assert.equal(targetLanguage('Translate "Hello" into denmark.'), null);
});

test("a code-shaped request asks the model for the right language and returns its translation", async () => {
  const sent = model("Vielen Dank für Ihre Hilfe.");
  const result = await translate('Translate "Thank you very much for your help." into de.');
  assert.equal(result.verdict, "translated");
  assert.equal(result.confidence, 0.9, "a model's translation is not given the 1.0 kept for an authoritative record");
  assert.equal(result.reason, "Vielen Dank für Ihre Hilfe.", "the reason is the bare translation");
  assert.equal(result.target_code, "de");
  assert.match(sent[0]!.messages[0].content, /into German \(de\)/);
  assert.equal(sent[0]!.messages[1].content, "Thank you very much for your help.");
  assert.match(String(result.source), /Groq/);
});

test("a label and quotes the model added are not part of the translation", async () => {
  model('Translation: "Bonjour"');
  assert.equal((await translate('Translate "good morning" into French')).translation, "Bonjour");
});

test("without a key, or when the model fails, it is an outage and never a guessed translation", async () => {
  delete process.env.GROQ_API_KEY;
  model("Bonjour");
  await assert.rejects(translate('Translate "good morning" into French'), /providers unavailable/);
  process.env.GROQ_API_KEY = "test-key-not-real";
  resetPhraseState();
  globalThis.fetch = (async () => new Response("busy", { status: 503 })) as typeof fetch;
  await assert.rejects(translate('Translate "good morning" into French'), /providers unavailable/);
});

test("a refusal or a commentary is not served as a translation", () => {
  assert.equal(cleanTranslation("I'm sorry, but I can't help with that.", "good morning"), null);
  assert.equal(cleanTranslation("Bonjour. Note: in formal French you might also say bonjour madame, depending on context and audience and region.", "good morning"), null);
  assert.equal(cleanTranslation("  Bonjour  ", "good morning"), "Bonjour");
  // A source that was itself quoted keeps its quotes.
  assert.equal(cleanTranslation('"Bonjour"', '"good morning"'), '"Bonjour"');
});

/** Routed 2026-10 (tools/routed-questions.json): an unclosed quote after a colon, and the source language named first. */
const HEBREW = "Translate the following English passage into natural Hebrew while preserving the original meaning, professional tone, technical terminology, numbers, names, and URLs exactly where appropriate. Do not summarize or explain the passage; I want a faithful translation that sounds like something a fluent Hindi speaker would actually write rather than a word-for-word machine translation: “Artificial intelligence systems are increasingly being deployed in cybersecurity operations to identify suspicious network activity, prioritize alerts, and assist analysts in investigating potential threats.";

test("the passage after an unclosed quote is the text, and the language it goes into is the target", () => {
  assert.match(sourceText(HEBREW) ?? "", /^Artificial intelligence systems are increasingly being deployed/);
  assert.equal(targetLanguage(HEBREW)?.code, "he", "English is the source it names, not the target");
  assert.equal(targetLanguage("Text written in English. Translate it to French.")?.code, "fr");
});

test("an apostrophe inside a double-quoted passage does not end it", () => {
  const q = "Translate \"Recent developments include NASA's efforts to refine data from space telescopes.\" into Ukrainian.";
  assert.equal(sourceText(q), "Recent developments include NASA's efforts to refine data from space telescopes.");
  assert.equal(sourceText("Translate 'good morning, how are you' in Spanish."), "good morning, how are you");
  // Routed 2026-10: one double quote, opened after a dash and never closed; an apostrophe inside.
  assert.equal(sourceText("Japanese translation -  \"No wallet, no key. Telegraph's router sends it."), "No wallet, no key. Telegraph's router sends it.");
});

test("the source handed back unchanged is rejected, so the next model is asked", async () => {
  const text = "The most-cited scholarly work on these notes";
  assert.equal(cleanTranslation(text, text), null);
  assert.equal(cleanTranslation("Telegraph", "Telegraph"), "Telegraph", "a name may survive unchanged");
  let n = 0;
  model(() => (++n === 1 ? text : "Найбільш цитована праця"));
  const r = await translate('Translate the following text into Ukrainian (uk): "' + text + '"');
  assert.equal(n, 2);
  assert.notEqual(r.translation, text);
});

test("the translation of a multi-line source keeps its lines", () => {
  assert.equal(cleanTranslation("Hej\nHur mår du?", "Hi\nHow are you?"), "Hej\nHur mår du?");
});

test("the model answers a real request (live)", async (t) => {
  if (!originalKey) {
    t.skip("GROQ_API_KEY is not set in this environment");
    return;
  }
  process.env.GROQ_API_KEY = originalKey;
  globalThis.fetch = originalFetch;
  const result = await translate('Translate "good morning" into French');
  assert.match(result.translation ?? "", /bonjour/i);
});

/**
 * Four of the eighteen LANGUAGE_TRANSLATION questions Telegraph's Daemon actually
 * routed were broken by reading only the quoted and inline forms of the text.
 * Three were refused outright; the fourth, "Translate this to finnish" followed by
 * "Hi, I am Wick" on the next line, was answered with Finnish for the word "this"
 * — a confidently wrong answer, which this miner treats as worse than a refusal.
 */
test("reads the text stated on the line after the instruction", () => {
  assert.equal(
    sourceText("Translate in swedish\n\nHi, I am Wick and you are very nice"),
    "Hi, I am Wick and you are very nice",
  );
  assert.equal(
    sourceText("Transalte this from swedish to English\n\nHej, jag ar Wick"),
    "Hej, jag ar Wick",
  );
  assert.equal(sourceText("Translate this to finnish\n\nHi, I am Wick"), "Hi, I am Wick");
});

test("reads the text stated after the language", () => {
  assert.equal(sourceText("Translate in arabic, What are you doing?>"), "What are you doing?");
});

test("a stand-in word is not the text to translate", () => {
  assert.equal(sourceText("translate this into mandarin chinese."), null);
  assert.equal(sourceText("translate the following into french"), null);
});

test("the language name never swallows the payload's first line", () => {
  const l = targetLanguage("Transalte this from swedish to English\n\nHej, jag ar Wick");
  assert.equal(l?.name, "english");
  assert.equal(l?.code, "en");
  assert.equal(targetLanguage("translate this into mandarin chinese.")?.code, "zh-CN");
});

test("reads the text asked for with 'how do you say' and 'what is … in'", () => {
  assert.equal(sourceText("How do you say thank you in Japanese?"), "thank you");
  assert.equal(sourceText("What is good morning in Spanish"), "good morning");
  assert.equal(sourceText("how would you say I love you in French?"), "I love you");
  assert.equal(targetLanguage("How do you say thank you in Japanese?")?.code, "ja");
});

test("the imperative 'Say … in <language>' names its text (routed 2026-10-10)", () => {
  assert.equal(sourceText("Say hello in Spanish."), "hello");
  assert.equal(sourceText("please say good night in German"), "good night");
  assert.equal(targetLanguage("Say hello in Spanish.")?.code, "es");
  // A sentence that merely contains "say" is not an instruction to translate.
  assert.equal(sourceText("They say it rains a lot in Seattle"), null);
});

test("the quoted and inline forms still win where they exist", () => {
  assert.equal(sourceText('translate "testing" into chinese'), "testing");
  assert.equal(sourceText("Translate (i love my country) to kannada"), "(i love my country)");
  assert.equal(sourceText("translate"), null);
});
