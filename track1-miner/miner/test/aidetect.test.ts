import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { detectAiText, extractPassage } from "../src/aidetect";

const AI_ISH =
  "In today's world, artificial intelligence plays a crucial role in modern business. " +
  "Furthermore, it is important to note that organisations must adapt to remain competitive. " +
  "Moreover, the adoption of these systems continues to accelerate across every sector. " +
  "In conclusion, the future of work will be shaped by these technologies in profound ways.";

const HUMAN_ISH =
  "I spent most of Saturday trying to get the old lathe running again. Turned out the belt had " +
  "perished. Anyway, three hours and a lot of swearing later it spins true, which is more than " +
  "I can say for me. Next weekend I might even cut something with it, assuming the chuck behaves.";

describe("extractPassage", () => {
  test("prefers a quoted passage", () => {
    assert.equal(extractPassage(`Is this AI? "${AI_ISH}"`), AI_ISH);
  });

  test("takes the body after a labelled colon", () => {
    assert.equal(extractPassage(`Analyse the following text: ${AI_ISH}`), AI_ISH);
  });

  test("refuses a bare question with nothing to analyse", () => {
    // The only question ever observed routed to this intent looks like this —
    // it is not an authorship task at all, and pretending otherwise is how the
    // incumbent ends up asserting "human_written" at 0.99987 confidence.
    assert.equal(extractPassage("Was the AI copyright notice against Luanti valid?"), "");
  });

  test("accepts a long bare passage with no wrapper", () => {
    assert.equal(extractPassage(HUMAN_ISH), HUMAN_ISH);
  });
});

describe("detectAiText", () => {
  test("formulaic, even-length prose leans machine", () => {
    const r = detectAiText(AI_ISH);
    assert.equal(r.verdict, "likely_ai");
    assert.ok(r.formulaic_markers.length >= 2, JSON.stringify(r.formulaic_markers));
  });

  test("bursty, idiosyncratic prose leans human", () => {
    const r = detectAiText(HUMAN_ISH);
    assert.equal(r.verdict, "likely_human");
  });

  test("confidence never exceeds 0.6, whatever the text", () => {
    // The method does not support a stronger claim. A detector reporting 0.99 is
    // overclaiming, and this one must never grow into that.
    for (const t of [AI_ISH, HUMAN_ISH, AI_ISH + HUMAN_ISH]) {
      assert.ok(detectAiText(t).confidence <= 0.6, `confidence ${detectAiText(t).confidence}`);
    }
  });

  test("reports the measurements it actually made", () => {
    const r = detectAiText(AI_ISH);
    assert.equal(typeof r.mean_sentence_words, "number");
    assert.equal(typeof r.sentence_length_stdev, "number");
    assert.equal(typeof r.type_token_ratio, "number");
    assert.match(r.reason, /type-token ratio/);
    assert.match(r.reason, /not reliable enough to treat as proof/);
  });

  test("no analysable text is an honest answer carrying prose", () => {
    const r = detectAiText("Was the AI copyright notice against Luanti valid?");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "invalid_input");
    // A bare label converts to nothing and scores ~0; the prose is what is scored.
    assert.ok(r.reason.length > 120);
    assert.match(r.reason, /No text long enough to analyse/);
  });
});
