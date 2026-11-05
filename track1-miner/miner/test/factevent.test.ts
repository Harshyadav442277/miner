import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractClaim } from "../src/factcheck";
import { complementTokens, criticalKeys, eventSentence, listLike, quantitiesAgree, statesEvent } from "../src/factevent";
import { settleClaim } from "../src/factarticle";
import { extractSubject, sentencesOf, settle } from "../src/factsubject";
import { contentTokens } from "../src/factwords";

/**
 * FACT_CHECK against the claims paid callers sent on 2026-11-03 (GAPS G262), and false claims built from them.
 * Every sentence below is transcribed from the live Wikipedia article on 2026-11-05, as sentencesOf() splits it.
 */
const VENUS = [
  "Venus is the second planet from the Sun.",
  "Venus is one of the four terrestrial planets in the Solar System, meaning that it is a rocky body like Earth.",
  "From Earth, Venus is visible as a star-like point of light, appearing brighter than any other natural point of " +
    "light in the sky, as either the brightest \"morning star\" or \"evening star\".",
];
const KILIMANJARO = [
  "Mount Kilimanjaro () is a large dormant stratovolcano in Tanzania.",
  "It is the highest mountain in Africa and the highest free-standing mountain above sea level in the world, at " +
    "5,895 m (19,341 ft) above sea level and 4,900 m (16,100 ft) above its plateau base.",
  "Kilimanjaro is drained by a network of rivers and streams, especially on the wetter and more heavily eroded " +
    "southern side and primarily above 1,200 m (3,900 ft).",
];
const EIFFEL = [
  "The Eiffel Tower ( EYE-fəl; French: Tour Eiffel [tuʁ ɛfɛl] ) is a lattice tower on the Champ de Mars in Paris, France.",
  "The main structural work was completed at the end of March 1889 and, on 31 March, Eiffel celebrated by leading a " +
    "group of government officials, accompanied by representatives of the press, to the top of the tower.",
];
const CURIE_SHARED =
  "She shared the 1903 Nobel Prize in Physics with her husband, Pierre Curie, \"for their joint researches on the " +
  "radioactivity phenomena discovered by Professor Henri Becquerel\".";
const CURIE_AWARDS =
  "Awards and honours that she received include: Nobel Prize in Physics (1903, with her husband Pierre Curie and " +
  "Henri Becquerel) Davy Medal (1903, with Pierre) Matteucci Medal (1904, with Pierre) Actonian Prize (1907) Elliott " +
  "Cresson Medal (1909) Legion of Honour (1909, rejected) Nobel Prize in Chemistry (1911) Civil Order of Alfonso XII " +
  "(1919) Franklin Medal of the American Philosophical Society (1921) Order of the White Eagle (2018, posthumously)";
const GOLDEN_GATE = [
  "The bridge opened to the public on May 27, 1937, and has undergone various retrofits and other improvement " +
    "projects in the decades since.",
  "At the time of its opening in 1937, it was both the longest and the tallest suspension bridge in the world, titles " +
    "it held until it was overtaken by the 1964 Verrazzano–Narrows Bridge and the 1998 Akashi Kaikyo Bridge, respectively.",
];
const SYDNEY = ["The Sydney Opera House was formally opened by Queen Elizabeth II, on 20 October 1973."];
const IPHONE_SALES =
  "By Q4 2007, strong iPhone sales put Apple at second place among U.S. smartphone vendors, behind Research In " +
  "Motion and ahead of all Windows Mobile vendors.";
const BERLIN_ERECTED =
  "Speaking from a platform erected on the steps of Rathaus Schöneberg for an audience of 450,000 and straying from " +
  "the prepared script, he declared in his Ich bin ein Berliner speech the support of the United States for West " +
  "Germany and the people of West Berlin in particular.";

const verdict = (claim: string, sentences: string[]) =>
  settleClaim(claim, extractSubject(claim), sentences)?.verdict ?? null;

describe("the three wrong verdicts paid callers got (G262)", () => {
  test("Venus is not the largest planet: three of four key words are not support", () => {
    assert.equal(verdict("Venus is the largest planet in the Solar System.", VENUS), null);
    assert.equal(verdict("Venus is the second planet from the Sun.", VENUS), "supported");
  });

  test("a claim joined by 'and' is ruled out by its false half", () => {
    const r = settleClaim("The Eiffel Tower is located in Berlin and was completed in 1889.", "Eiffel Tower", EIFFEL);
    assert.equal(r?.verdict, "contradicted");
    assert.match(String(r?.evidence), /in Paris, France/);
  });

  test("Kilimanjaro: the lead's 'It is the highest mountain in Africa' supports it; the rivers sentence does not refute it", () => {
    const r = settleClaim("Mount Kilimanjaro is the tallest mountain in Africa at 5895 metres.", "Mount Kilimanjaro", KILIMANJARO);
    assert.equal(r?.verdict, "supported");
    assert.match(String(r?.evidence), /^It is the highest mountain in Africa/);
    assert.equal(verdict("Mount Kilimanjaro is the tallest mountain in Africa.", [KILIMANJARO[2] as string]), null);
  });
});

describe("false claims built from the same articles", () => {
  test("a figure the sentence gives for something else is not support", () => {
    assert.equal(verdict("Mount Kilimanjaro is the tallest mountain in Africa at 4900 metres.", KILIMANJARO), null);
  });

  test("a class is what the copula puts the subject in", () => {
    const r = settleClaim("Mount Kilimanjaro is a river.", "Mount Kilimanjaro", KILIMANJARO);
    assert.equal(r?.verdict, "contradicted");
    assert.match(String(r?.evidence), /highest mountain/);
  });

  test("a list of awards is not a statement of one", () => {
    const sentences = ["Marie Curie was a Polish and naturalised-French physicist and chemist.", CURIE_SHARED, CURIE_AWARDS];
    assert.equal(verdict("Marie Curie won the Nobel Prize in Physics in 1903.", sentences), "supported");
    assert.equal(verdict("Marie Curie won the Nobel Prize in Chemistry in 1903.", sentences), null);
    assert.equal(listLike(CURIE_AWARDS), true);
    assert.equal(listLike(EIFFEL[0] as string), false);
  });

  test("an event verb must be the subject's: sales, or a platform erected, are not a release or a building", () => {
    assert.equal(statesEvent("The first iPhone was released by Apple in 2007.", "first iPhone", IPHONE_SALES), false);
    assert.equal(statesEvent("The Berlin Wall was built by the United States.", "Berlin Wall", BERLIN_ERECTED), false);
    assert.equal(verdict("The Berlin Wall was built by the United States.", [BERLIN_ERECTED]), null);
  });
});

describe("dated events (eventSentence)", () => {
  test("'The bridge opened ... May 27, 1937' states the opening, in the claimed year only", () => {
    assert.equal(eventSentence("The Golden Gate Bridge opened in 1937.", "Golden Gate Bridge", GOLDEN_GATE), 0);
    assert.equal(eventSentence("The Golden Gate Bridge opened in 1964.", "Golden Gate Bridge", GOLDEN_GATE), -1);
    assert.equal(verdict("The Golden Gate Bridge opened in 1937.", GOLDEN_GATE), "supported");
  });

  test("an adverb and the opener between the verb and the date", () => {
    assert.equal(eventSentence("The Sydney Opera House opened in 1973.", "Sydney Opera House", SYDNEY), 0);
    assert.equal(eventSentence("The Sydney Opera House opened in 1957.", "Sydney Opera House", SYDNEY), -1);
  });
});

describe("the word layer", () => {
  test("a supporting sentence must carry the claim's names, numbers and superlatives", () => {
    assert.deepEqual(criticalKeys("Venus is the largest planet in the Solar System.", new Set(["venu"])).sort(), ["largest", "system"]);
    assert.deepEqual(criticalKeys("Facebook was founded by Mark Zuckerberg in 2004.", new Set(["facebook"])).sort(), ["2004", "zuckerberg"]);
    assert.ok(criticalKeys("Mount Kilimanjaro is the tallest mountain in Africa", new Set(["mount", "kilimanjaro"])).includes("highest"));
  });

  test("thousands separators do not split a figure", () => {
    assert.ok(contentTokens("at 5,895 m (19,341 ft)").includes("5895"));
    assert.equal(quantitiesAgree("at 5895 metres", KILIMANJARO[1] as string), true);
    assert.equal(quantitiesAgree("at 4900 metres", KILIMANJARO[1] as string), false);
  });

  test("the complement of a copula, and none for a passive", () => {
    assert.ok(complementTokens("Sharks are a group of elasmobranch cartilaginous fishes characterized by a ribless endoskeleton", new Set(["shark"])).includes("fish"));
    assert.ok(complementTokens("Bats (order Chiroptera ) are winged mammals, the only mammals", new Set(["bat"])).includes("mammal"));
    assert.deepEqual(complementTokens(KILIMANJARO[2] as string, new Set(["kilimanjaro"])), []);
    assert.deepEqual(complementTokens(VENUS[2] as string, new Set(["venu"])), ["visibl"]);
  });

  test("sentences open on 'iPhone', and an article ends at its link lists", () => {
    const s = sentencesOf("The device was announced in January 2007 by Apple. iPhone OS 2 was released on July 11, 2008.\n\n== See also ==\nApple Newton History of iPhone Official website (archived June 29, 2007)");
    assert.equal(s.length, 2);
    assert.match(s[1] as string, /^iPhone OS 2/);
  });
});

describe("the claim and its subject", () => {
  test("a title quoted inside a claim stays part of the claim", () => {
    const claim = 'The transformer architecture was introduced in 2017 in the paper "Attention Is All You Need".';
    assert.equal(extractClaim(claim), claim);
    assert.equal(extractClaim('Please verify "water boils at 100 degrees Celsius" for me'), "water boils at 100 degrees Celsius");
  });

  test("a quoted title opening the claim is its subject", () => {
    assert.equal(extractSubject('"Attention Is All You Need" is a research paper published in 2017 by researchers at Google.'), "Attention Is All You Need");
    assert.equal(extractSubject("The Golden Gate Bridge opened in 1937."), "Golden Gate Bridge");
  });

  test("settle() itself is unchanged for a one-part claim", () => {
    assert.equal(settle("Venus is the second planet from the Sun.", "Venus", VENUS)?.verdict, "supported");
  });
});
