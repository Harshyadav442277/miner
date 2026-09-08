import { test } from "node:test";
import assert from "node:assert/strict";
import { translate, targetLanguage, sourceText, usableMyMemoryText } from "../src/translate";

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

test("the fallback returns a real translation (live)", async (t) => {
  // MyMemory limits anonymous use per source IP and per day. GitHub's runners
  // share their egress addresses with everyone else on GitHub, so from CI the
  // provider itself is sometimes exhausted — it failed the scheduled uptime run
  // twice on 2026-09-07/08 while production, which never reached the fallback,
  // was fine (GAPS G80). A third party's quota is not this miner's defect, and
  // an alarm that fires on it hides the outages the alarm exists for. So probe
  // the provider first and skip, saying why, when it is the one refusing.
  const probe = await fetch("https://api.mymemory.translated.net/get?q=good%20morning&langpair=en|fr", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  type MemoryBody = { responseData?: { translatedText?: string }; responseStatus?: number | string } | null;
  const body = (probe && probe.ok ? await probe.json().catch(() => null) : null) as MemoryBody;
  if (!usableMyMemoryText(body)) {
    t.skip(`MyMemory unavailable from this address (HTTP ${probe?.status ?? "none"}, ${JSON.stringify(body?.responseData?.translatedText ?? body?.responseStatus ?? null)})`);
    return;
  }
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

test("an exhausted MyMemory quota is not served as a translation", async () => {
  // The provider answers HTTP 200 with the warning in the translation field.
  const quota = {
    responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY. NEXT AVAILABLE IN 12 HOURS" },
    quotaFinished: true,
    responseStatus: 429,
  };
  assert.equal(usableMyMemoryText(quota), null);
  assert.equal(usableMyMemoryText({ responseData: { translatedText: "Bonjour" }, responseStatus: 200, quotaFinished: false }), "Bonjour");
  assert.equal(usableMyMemoryText({ responseData: { translatedText: "Bonjour" }, responseStatus: "403" }), null);
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).includes("clients5.google.com")) return new Response("nope", { status: 500 });
    return new Response(JSON.stringify(quota), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    await assert.rejects(translate('Translate "good morning" into French'), /providers unavailable/);
  } finally {
    globalThis.fetch = original;
  }
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

test("the quoted and inline forms still win where they exist", () => {
  assert.equal(sourceText('translate "testing" into chinese'), "testing");
  assert.equal(sourceText("Translate (i love my country) to kannada"), "(i love my country)");
  assert.equal(sourceText("translate"), null);
});
