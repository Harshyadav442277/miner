import { test } from "node:test";
import assert from "node:assert/strict";
import { answerQuestion, bestSentence, citedEverywhere, normaliseCitations, sentences, subjectPhrase, suppliedContext, type Source } from "../src/qa";

test("a supplied passage and its question are told apart", () => {
  const r = suppliedContext("Based on the following text: The Treaty of Westphalia was signed in 1648, ending the Thirty Years War. It established state sovereignty. When did the war end?");
  assert.equal(r?.question, "When did the war end?");
  assert.match(r!.context, /^The Treaty of Westphalia/);
  assert.equal(suppliedContext("Context: Mars has two moons, Phobos and Deimos, both small.\nQuestion: How many moons does Mars have?")?.question, "How many moons does Mars have?");
  assert.equal(suppliedContext("Who is the CEO of Microsoft?"), null);
});

test("sentences do not break at initials, and citations are normalised", () => {
  assert.deepEqual(sentences("He succeeded John W. Thompson in 2021. He studied in Mangalore."), ["He succeeded John W. Thompson in 2021.", "He studied in Mangalore."]);
  assert.equal(normaliseCitations("Mars has two moons【1】."), "Mars has two moons[1].");
  assert.equal(normaliseCitations("Satya Nadella is the CEO of Microsoft. [2]"), "Satya Nadella is the CEO of Microsoft [2].");
});

test("a reply is kept only when every claim cites a source that exists", () => {
  assert.equal(citedEverywhere("Mars has two moons [1]. They are small [1][2].", 2), true);
  assert.equal(citedEverywhere("Mars has two moons [1]. They are small.", 2), false);
  assert.equal(citedEverywhere("Mars has two moons [3].", 2), false);
  assert.equal(citedEverywhere("The sources do not say.", 2), true);
  assert.equal(citedEverywhere("Qatar hosted it [1]. The sources do not say who won.", 1), true);
  assert.equal(citedEverywhere("The sources do not say who won.", 1), false, "a reply with no cited claim is not an answer");
});

const src = (n: number, title: string, text: string): Source => ({ n, title, url: null, kind: "Wikipedia", text });

test("the extractive answer needs the question's numbers and half its words", () => {
  const sources = [src(1, "2030 FIFA World Cup", "The 2030 FIFA World Cup is scheduled to be the 24th FIFA World Cup."),
    src(2, "2022 FIFA World Cup", "Argentina won the 2022 FIFA World Cup final against France in Qatar.")];
  assert.equal(bestSentence("Who won the 2022 FIFA World Cup?", sources)?.n, 2);
  assert.equal(bestSentence("Who won the 2022 FIFA World Cup?", [sources[0]!]), null);
  assert.equal(subjectPhrase("Who won the 2022 FIFA World Cup and where was it held?"), "2022 FIFA World Cup");
  assert.equal(subjectPhrase("Who is the current CEO of Microsoft?"), null);
});

test("without a model key the answer is a quoted, cited source sentence", async (t) => {
  const key = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ query: { pages: {
    "1": { title: "Moons of Mars", index: 1, fullurl: "https://en.wikipedia.org/wiki/Moons_of_Mars", extract: "Mars has two natural moons, Phobos and Deimos. Both are small and irregular." },
  } } })) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; if (key !== undefined) process.env.GROQ_API_KEY = key; });
  const r = await answerQuestion("How many moons does Mars have?");
  assert.equal(r.verdict, "answered");
  assert.equal(r.method, "extracted_from_sources");
  assert.equal(r.reason, `From Wikipedia's "Moons of Mars": "Mars has two natural moons, Phobos and Deimos." [1] This sentence is quoted from the source, not phrased.`);
  assert.equal(r.citations?.[0]?.url, "https://en.wikipedia.org/wiki/Moons_of_Mars");
});
