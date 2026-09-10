import { test } from "node:test";
import assert from "node:assert/strict";
import { answerResearch, mentions, namedEntities, researchSubject, topicOf } from "../src/research";

/**
 * Every question quoted in this file is a real routed one, read from the
 * explorer's question feed on 2026-09-10. The intent's whole traffic is
 * forward-looking questions about drugs and trials, which is why the module
 * reports the record rather than predicting an outcome.
 */

test("the drug survives the auxiliary that opens the question", () => {
  // "Will Patisiran be approved" — a sentence-opening capital is usually
  // scaffolding, but not when the scaffolding word itself was just dropped.
  assert.ok(namedEntities("Will Patisiran be approved for pregnancy?").includes("Patisiran"));
  assert.ok(namedEntities("Will Brenipatide (LY3537031) complete Phase 2 trials?").includes("Brenipatide"));
  assert.ok(namedEntities("Will Depemokimab succeed in Phase 3?").includes("Depemokimab"));
});

test("a sentence-opening capital that is only scaffolding is not a subject", () => {
  // "Cite your sources." is the tail of the intent's own canonical example, and
  // it used to make the answer Wikipedia's article on citation.
  assert.ok(!namedEntities("What does the evidence say about fasting? Cite your sources.").includes("Cite"));
  assert.ok(!namedEntities("What does the evidence say about fasting?").includes("What"));
});

test("a multi-word proper noun is one name", () => {
  assert.ok(namedEntities("Will Planet Labs open more satellite feeds?").includes("Planet Labs"));
  assert.ok(namedEntities("Will Zenas BioPharma release ZB002 data?").includes("Zenas BioPharma"));
});

test("the sponsor and the drug are both candidates, in that order", () => {
  // Which one is right is settled by whether a source names it, not here.
  const e = namedEntities("Will Novartis' Ianalumab be approved?");
  assert.ok(e.includes("Novartis"));
  assert.ok(e.includes("Ianalumab"));
});

test("a coded trial name is read whole", () => {
  assert.ok(namedEntities("Was BIOSTREAM.HF trial successful?").includes("BIOSTREAM.HF"));
  assert.ok(namedEntities("Will GS-1206 show positive antitumor activity?").includes("GS-1206"));
});

/**
 * The relevance rule exists because of a measured failure. Asked about
 * ianalumab, the registry was queried for the SPONSOR and answered with a
 * terminated docetaxel study; Europe PMC answered with a paper on Chagas
 * disease. Both were citations and neither was about the subject.
 */
test("a source only counts when it names what was asked about", () => {
  assert.ok(mentions("A Study of Efficacy and Safety of Ianalumab in Patients", "Ianalumab"));
  assert.ok(!mentions("Safety of LBH589 Alone and in Combination With Docetaxel", "Novartis"));
  // A phrase is a topic: a title carrying most of its content words is about it.
  assert.ok(mentions("Effects of Intermittent Fasting on Health and Body Composition", "health effects intermittent fasting"));
  assert.ok(!mentions("Early-life colonization with Clostridioides difficile", "health effects intermittent fasting"));
});

test("question scaffolding is stripped from the searchable topic", () => {
  assert.equal(topicOf("What does the evidence say about the health effects of intermittent fasting"), "health effects intermittent fasting");
  assert.equal(topicOf("Winclove probiotic treat allergic rhinitis"), "Winclove probiotic allergic rhinitis");
});

test("a research question wrapped in an extraction request is still read", () => {
  // One routed question arrives as a CONTENT_EXTRACTION misroute. The text after
  // the colon is a genuine research question.
  const s = researchSubject(
    "Extract the dates, quantities, named entities and events from: Can asymmetry between two interacting networks change how they synchronize?",
  );
  assert.ok(s);
  assert.match(s as string, /^asymmetry between two interacting networks/);
  assert.doesNotMatch(s as string, /Extract/i);
});

test("an empty request is refused rather than searched", async () => {
  const r = await answerResearch("  ");
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "no_question");
});

test("a completed trial is not described as an undecided one (live)", async () => {
  const r = await answerResearch("Will Lepodisiran reduce coronary plaque?");
  assert.equal(r.verdict, "evidence");
  // Ranked by what was asked: a coronary-plaque study leads over a
  // liver-function one that the registry happened to list first.
  assert.match(r.reason, /Lepodisiran/);
  assert.match(r.reason, /NCT\d+/);
  // Nothing predicts the outcome.
  assert.doesNotMatch(r.reason, /\bwill be approved\b|\bis likely to\b|\bwe expect\b/i);
});

test("no source that names the subject is an absence in those indexes, not an absence of research (live)", async () => {
  const r = await answerResearch("Will Zzqxjjv Nnbbvvtt be approved?");
  assert.ok(["no_evidence", "evidence"].includes(r.verdict));
  if (r.verdict === "no_evidence") {
    assert.match(r.reason, /not proof that no work exists/);
    assert.match(r.reason, /ClinicalTrials\.gov and Europe PMC/);
  }
});
