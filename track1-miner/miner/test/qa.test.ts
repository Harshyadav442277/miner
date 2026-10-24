import { test } from "node:test";
import assert from "node:assert/strict";
import { answerQuestion, bestSentence, citedEverywhere, clip, normaliseCitations, sentences, subjectPhrase, suppliedContext, titleFit, type Source } from "../src/qa";

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

test("the extractive answer prefers the sentence of the kind asked for", () => {
  const mars = [src(1, "Moons of Mars", "The two moons of Mars are Phobos and Deimos. They are irregular in shape. " +
    "Two major hypotheses have emerged as to the origin of the moons: the first suggests that they originated from Mars itself.")];
  assert.equal(bestSentence("How many moons does Mars have?", mars)?.sentence, "The two moons of Mars are Phobos and Deimos.");
});

test("the extractive answer needs the question's numbers and half its words", () => {
  const sources = [src(1, "2030 FIFA World Cup", "The 2030 FIFA World Cup is scheduled to be the 24th FIFA World Cup."),
    src(2, "2022 FIFA World Cup", "Argentina won the 2022 FIFA World Cup final against France in Qatar.")];
  assert.equal(bestSentence("Who won the 2022 FIFA World Cup?", sources)?.n, 2);
  assert.equal(bestSentence("Who won the 2022 FIFA World Cup?", [sources[0]!]), null);
  assert.equal(subjectPhrase("Who won the 2022 FIFA World Cup and where was it held?"), "2022 FIFA World Cup");
  assert.equal(subjectPhrase("Who is the current CEO of Microsoft?"), null);
});

// G207, 2026-10-23: with no model, Wikipedia's first hit was quoted even when it
// was a film, a band or a different subject sharing the question's words.
test("the extractive answer quotes the article about the subject, not a title collision", () => {
  const pride = [src(1, "Pride and Prejudice and Zombies (film)", "Pride and Prejudice and Zombies is a 2016 action comedy horror film based on Seth Grahame-Smith's 2009 novel, which parodies the 1813 novel Pride and Prejudice by Jane Austen."),
    src(2, "Pride and Prejudice", "Pride and Prejudice is a novel by English author Jane Austen.")];
  assert.equal(bestSentence("Who wrote Pride and Prejudice?", pride)?.n, 2);
  const canada = [src(1, "Capital punishment in Canada", "Capital punishment in Canada dates to Canada's earliest history."),
    src(2, "Ottawa", "Ottawa is the capital city of Canada.")];
  assert.equal(bestSentence("What is the capital of Canada?", canada)?.n, 2);
  const seasons = [src(1, "The Four Seasons (band)", "The Four Seasons were an American pop and rock band formed in 1960 in Newark, New Jersey."),
    src(2, "The Four Seasons (Vivaldi)", "The Four Seasons is a group of four violin concerti by Italian composer Antonio Vivaldi.")];
  assert.equal(bestSentence("Who composed The Four Seasons?", seasons)?.n, 2);
  // A question about the film keeps the film.
  assert.equal(bestSentence("Who starred in the film The Four Seasons?", [src(1, "The Four Seasons (1981 film)", "The Four Seasons is a 1981 American comedy film starring Alan Alda."), seasons[1]!])?.n, 1);
});

test("a title never outweighs a word, and a tie goes to the shorter sentence", () => {
  const canada = [src(1, "Canada", "Canada is a country in North America."), src(2, "Ottawa", "Ottawa is the capital city of Canada.")];
  assert.equal(bestSentence("What is the capital of Canada?", canada)?.n, 2);
  const act = [src(1, "Australian Capital Territory", "The Australian Capital Territory, known as the Federal Capital Territory until 1938, is an internal territory of Australia."),
    src(2, "Canberra", "Canberra is the capital city of Australia.")];
  assert.equal(bestSentence("What is the capital of Australia?", act)?.sentence, "Canberra is the capital city of Australia.");
  assert.equal(titleFit("Who wrote Pride and Prejudice?", "Pride and Prejudice"), 1);
  assert.equal(titleFit("Who wrote Pride and Prejudice?", "Pride & Prejudice (2005 film)"), 0);
  assert.equal(titleFit("What is the tallest mountain?", "List of tallest people"), -1);
});

test("matching meets a word's other forms", () => {
  const mona = [src(1, "Two–Mona Lisa theory", "Historians proposed that Leonardo painted two versions of the Mona Lisa, one of them lost."),
    src(2, "Mona Lisa", "The Mona Lisa is a half-length portrait painting by the Italian artist Leonardo da Vinci.")];
  assert.equal(bestSentence("Who painted the Mona Lisa?", mona)?.n, 2);
});

test("an extract is cut at a sentence end, never mid-word", () => {
  const text = "The Mona Lisa is a portrait by Leonardo da Vinci. It hangs in the Louvre. The Mona Lisa is one of the most valuable paintings in the world.";
  assert.equal(clip(text, 80), "The Mona Lisa is a portrait by Leonardo da Vinci. It hangs in the Louvre.");
  assert.equal(clip(text, 500), text);
  assert.equal(clip("x".repeat(50), 20), "x".repeat(20));
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

test("context parsing stays fast on long, hostile passages", () => {
  const t = Date.now();
  suppliedContext(`Based on the following text: ${"a ".repeat(3_000)}`);
  suppliedContext(`Context: ${" \n".repeat(3_000)}`);
  suppliedContext(`${"x? ".repeat(2_000)}`);
  assert.ok(Date.now() - t < 200, `took ${Date.now() - t} ms`);
  assert.equal(suppliedContext("What did it say?\nContext: Mars has two moons, Phobos and Deimos, both small and irregular.")?.question, "What did it say?");
});
