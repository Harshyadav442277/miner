import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyseSentiment, askedToneOf, asksSentiment, labelOf, scoreText, subjectNoun, suppliedText, tonesOf, wordList,
} from "../src/sentiment";
import { LEXICON, NEGATIONS } from "../src/sentiment-lexicon";

/**
 * No SENTIMENT_ANALYSIS question appeared in the explorer feed on 2026-09-12
 * (40 pages read), so the questions here are the canonical description's own
 * example and plainly labelled variants of it. Every regex in the module is
 * exercised with an input it must match and one it must not (G103: a missing
 * backslash leaves no control byte, so only behaviour catches it).
 */
const CANONICAL = "What's the sentiment of this review: 'The product broke after one day, terrible quality.'?";

test("the canonical example is negative, and names the words that made it so", () => {
  const r = analyseSentiment(CANONICAL);
  assert.equal(r.verdict, "negative");
  assert.match(r.reason, /^The sentiment of this review is negative\./);
  assert.match(r.reason, /terrible/);
  assert.match(r.reason, /broke/);
  assert.ok((r.compound ?? 0) < -0.5);
});

test("a single-quoted passage survives an apostrophe inside it", () => {
  assert.equal(suppliedText("Classify this: 'I can't log into my account.'"), "I can't log into my account.");
  assert.equal(suppliedText(CANONICAL), "The product broke after one day, terrible quality.");
  // Not quoted at all, and no colon: nothing is supplied.
  assert.equal(suppliedText("What is the sentiment"), "");
});

test("a labelled passage and a colon passage are both read", () => {
  assert.equal(suppliedText("Analyse the mood. Text: loved every minute of it"), "loved every minute of it");
  assert.equal(suppliedText("How does this sound: we will be late again"), "we will be late again");
  // A one-word quote is a term, not a passage.
  assert.equal(suppliedText("Is 'great' positive"), "");
});

test("a sentiment frame is told apart from the text itself", () => {
  assert.ok(asksSentiment("What is the emotional tone of this?"));
  assert.ok(asksSentiment("Is this review positive or negative?"));
  assert.ok(!asksSentiment("The package arrived on time."));
});

test("the passage's own name becomes the subject of the answer", () => {
  assert.equal(subjectNoun("What's the sentiment of this tweet: 'ok'"), "tweet");
  assert.equal(subjectNoun("sentiment of the following comment"), "comment");
  assert.equal(subjectNoun("How positive is it?"), "text");
});

test("negation within three words flips a word, and the answer shows the negation", () => {
  const plain = scoreText("The food was good");
  const negated = scoreText("The food was not good");
  assert.ok(plain.compound > 0);
  assert.ok(negated.compound < 0);
  assert.ok(negated.hits.some((h) => h.word === "not good"));
  // Four words back is out of reach.
  assert.ok(scoreText("not that the food was good").compound > 0);
  assert.ok(NEGATIONS.has("can't"));
});

test("negation stops at clause punctuation (verifier repros, 2026-09-13)", () => {
  for (const t of ["No problems, great service.", "No regrets, love it!", "No issues, works fine.", "No complaints, works perfectly.", "Terrible? No, it was wonderful."]) {
    const r = analyseSentiment(`What is the sentiment of this review: '${t}'`);
    assert.equal(r.verdict, "positive", `${t} -> ${r.reason}`);
    assert.doesNotMatch(r.reason, /not (?:great|love|works|wonderful)/, t);
  }
  // "No problems" is itself positive, and is shown as the text says it.
  assert.ok(scoreText("No problems, great service.").hits.some((h) => h.word === "no problems" && h.value > 0));
  // Without the comma the negation still reaches.
  assert.ok(scoreText("no great service").compound < 0);
});

test("\"can't recommend this enough\" is praise, and a negated tone word states no tone", () => {
  const r = analyseSentiment("What is the sentiment of this review: 'I can't recommend this enough, absolutely love it'");
  assert.equal(r.verdict, "positive");
  assert.doesNotMatch(r.reason, /not recommend/);
  assert.ok(scoreText("I can't recommend this").compound < 0);
  assert.deepEqual(tonesOf("I don't hate it"), []);
  assert.deepEqual(tonesOf("I hate it"), ["angry"]);
});

test("a single-quoted passage mid-question is read", () => {
  assert.equal(suppliedText("Classify the sentiment of the review 'The battery died after a week' as positive or negative"), "The battery died after a week");
  assert.equal(suppliedText("Is 'great' positive"), "");
});

test("a curly apostrophe negates like a straight one", () => {
  assert.ok(scoreText("I don’t like it").compound < 0);
});

test("the clause after 'but' outweighs the clause before it", () => {
  const r = scoreText("The food was great but the service was painfully slow and the waiter was rude");
  assert.ok(r.compound < 0);
  assert.equal(analyseSentiment(`What sentiment does this comment express: "${"The food was great but the service was painfully slow and the waiter was rude."}"`).verdict, "negative");
});

test("boosters, capitals and exclamation marks intensify, never flip", () => {
  const base = scoreText("this is good").compound;
  assert.ok(scoreText("this is very good").compound > base);
  assert.ok(scoreText("this is GOOD").compound > base);
  assert.ok(scoreText("this is good!!!").compound > base);
  // All-caps text is shouting throughout, not emphasis on one word.
  assert.equal(scoreText("THIS IS GOOD").compound, scoreText("this is good").compound);
});

test("labels follow the VADER thresholds, and balanced strong wording is mixed", () => {
  assert.equal(labelOf(0.3, 2, 0), "positive");
  assert.equal(labelOf(-0.3, 0, -2), "negative");
  assert.equal(labelOf(0.01, 0.1, 0), "neutral");
  assert.equal(labelOf(0.02, 3, -2.8), "mixed");
  assert.equal(labelOf(0.5, 3, -1), "positive");
});

test("text with no opinion word is neutral and says why, with the list's limit", () => {
  const r = analyseSentiment("github.com");
  assert.equal(r.verdict, "neutral");
  assert.match(r.reason, /contains no word that carries positive or negative sentiment/);
  assert.match(r.reason, /word-list reading/);
});

test("a named tone is only reported when a word in the text states it", () => {
  assert.deepEqual(tonesOf("I am so frustrated, this is ridiculous"), ["frustrated"]);
  assert.deepEqual(tonesOf("The parcel arrived."), []);
});

test("a yes/no tone question is answered yes only on a stated tone", () => {
  assert.equal(askedToneOf("Is this ticket written in a frustrated tone? 'x'", "x"), "frustrated");
  assert.equal(askedToneOf("Does this sound happy? 'x'", "x"), "joyful");
  assert.equal(askedToneOf("What is the sentiment? 'x'", "x"), null);
  const yes = analyseSentiment("Is this ticket written in a frustrated tone? 'Nobody answered me, this is ridiculous.'");
  assert.match(yes.reason, /^Yes\. This ticket is written in a frustrated tone/);
  const cannot = analyseSentiment("Is this ticket written in a frustrated tone? 'I have asked three times and nobody has answered me.'");
  assert.match(cannot.reason, /cannot confirm one/);
});

test("no text is refused by name, never scored as neutral", () => {
  for (const q of ["", "   ", "What is the sentiment?"]) {
    const r = analyseSentiment(q);
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "no_text");
  }
});

test("the declared text parameter wins over the question", () => {
  assert.equal(analyseSentiment("What is the sentiment of this review?", "Absolutely wonderful, I love it").verdict, "positive");
});

/**
 * Found on the Vercel preview on 2026-09-13, after the lane's own tests and its
 * verifier had both passed: "The battery died after a week and support never
 * replied" was labelled POSITIVE, "carried by the word support". Three defects at
 * once — the noun "support" scored as praise, "died" was absent, and a negated
 * neutral verb had no valence for negation to flip.
 */
test("a failed product and an unanswered complaint read as negative", () => {
  const q = (t: string): string => `What is the sentiment of this review: '${t}'`;
  assert.equal(analyseSentiment(q("The battery died after a week and support never replied.")).verdict, "negative");
  assert.equal(analyseSentiment(q("The parcel never arrived.")).verdict, "negative");
  assert.equal(analyseSentiment(q("I emailed twice and nobody responded.")).verdict, "negative");
  // The noun alone carries no opinion either way.
  assert.equal(LEXICON.has("support"), false);
  assert.equal(analyseSentiment(q("Great support team, very helpful.")).verdict, "positive");
});

test("an expected action that did happen is a fact, not praise", () => {
  // Scoring these only under negation is the whole rule; un-negated they are zero.
  assert.equal(scoreText("The parcel arrived on Tuesday.").compound, 0);
  assert.equal(scoreText("Support replied within a day.").compound, 0);
  // And a negated opinion word is still flipped exactly once, not twice.
  assert.equal(analyseSentiment("What is the sentiment of this review: 'Never disappointed.'").verdict, "positive");
});

test("the lexicon is well formed", () => {
  assert.ok(LEXICON.size > 250);
  for (const [w, v] of LEXICON) {
    assert.match(w, /^[a-z]+$/, `bad key ${w}`);
    assert.ok(v >= -4 && v <= 4 && v !== 0, `bad valence ${w}=${v}`);
  }
  assert.equal(wordList(["a", "b", "c"]), "a, b and c");
});
