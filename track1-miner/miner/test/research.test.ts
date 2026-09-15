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
  const started = Date.now();
  const r = await answerResearch("Will Zzqxjjv Nnbbvvtt be approved?");
  // A name neither index holds is the worst case for latency, and it used to
  // cost one full upstream timeout PER candidate term — 23 seconds against a
  // route watchdog of 11, which turned an honest "no evidence" into an outage.
  assert.ok(Date.now() - started < 11_000, `took ${Date.now() - started}ms, over the route watchdog`);
  // Three honest outcomes, and an index outage is one of them.
  assert.ok(["no_evidence", "evidence", "unavailable"].includes(r.verdict), `verdict ${r.verdict}`);
  if (r.verdict === "no_evidence") {
    assert.match(r.reason, /not proof that no work exists/);
    assert.match(r.reason, /ClinicalTrials\.gov and Europe PMC/);
  }
  if (r.verdict === "unavailable") {
    assert.match(r.reason, /source outage rather than an absence of research/);
  }
});

// Rank-loss report F7 (2026-09-15): answered no_evidence from the biomedical indexes.
test("a comparison outside medicine is answered from each side's encyclopedia article", async () => {
  const { answerResearch, comparedSubjects } = await import("../src/research");
  assert.deepEqual(comparedSubjects("What are the main differences between proof of work and proof of stake? Cite sources."), ["proof of work", "proof of stake"]);
  assert.deepEqual(comparedSubjects("React vs Vue for a small app"), ["React", "Vue for a small app"]);
  assert.equal(comparedSubjects("Will Lepodisiran reduce coronary plaque?"), null);
  const real = globalThis.fetch;
  globalThis.fetch = (async (u: string) => {
    const url = String(u);
    if (url.includes("search/title")) {
      const q = new URL(url).searchParams.get("q") ?? "";
      const title = q.charAt(0).toUpperCase() + q.slice(1);
      return new Response(JSON.stringify({ pages: [{ key: title.replace(/ /g, "_"), title }] }), { status: 200 });
    }
    if (url.includes("page/summary/Proof_of_work")) return new Response(JSON.stringify({ title: "Proof of work", extract: "Proof of work is a form of cryptographic proof. More." }), { status: 200 });
    if (url.includes("page/summary/Proof_of_stake")) return new Response(JSON.stringify({ title: "Proof of stake", extract: "Proof-of-stake protocols select validators in proportion to their holdings. More." }), { status: 200 });
    return new Response("{}", { status: 503 });
  }) as typeof fetch;
  try {
    const r = await answerResearch("What are the main differences between proof of work and proof of stake? Cite sources.");
    assert.equal(r.verdict, "evidence");
    assert.equal(r.reason, 'Proof of work: Proof of work is a form of cryptographic proof. Proof of stake: Proof-of-stake protocols select validators in proportion to their holdings. Sources: Wikipedia, "Proof of work" and "Proof of stake".');
  } finally {
    globalThis.fetch = real;
  }
});

// The node's own RESEARCH_QUERY cases (2026-09-15, from another miner's failure_reason).
test("a clinical-evidence question is split into the concepts it combines", async () => {
  const { researchConcepts } = await import("../src/research");
  assert.deepEqual(researchConcepts("What are the current recommendations for managing type 2 diabetes in patients with chronic kidney disease?"),
    { concepts: ["type 2 diabetes", "chronic kidney disease"], guidance: true, recent: true });
  assert.deepEqual(researchConcepts("What are the most recent findings regarding the efficacy of CRISPR-Cas9 gene editing for treating Huntington's disease?").concepts,
    ["CRISPR-Cas9", "Huntington disease"]);
  assert.deepEqual(researchConcepts("Most recent research findings on CRISPR-Cas9 efficacy for Duchenne muscular dystrophy in human clinical trials").concepts,
    ["CRISPR-Cas9", "Duchenne muscular dystrophy"]);
  assert.equal(researchConcepts("Will Novartis' Ianalumab be approved?").concepts.length, 1);
});

test("concept literature leads with a source covering every concept and quotes its conclusion", async () => {
  const { answerResearch } = await import("../src/research");
  const real = globalThis.fetch;
  globalThis.fetch = (async (u: string) => {
    const url = decodeURIComponent(String(u));
    if (url.includes("europepmc") && url.includes('"type 2 diabetes" AND "chronic kidney disease"')) {
      return new Response(JSON.stringify({ resultList: { result: [
        { title: "Pharmacist prescribing letter.", authorString: "Sheffield M, X Y.", pubYear: "2026", abstractText: "A study of diabetes and kidney disease in pharmacies. Implementation is underway.", pubTypeList: { pubType: ["Journal Article"] } },
        { title: "Roles of SGLT2 inhibitors in chronic kidney disease with type 2 diabetes: a consensus.", authorString: "Handelsman Y, Z W.", pubYear: "2026", abstractText: "Background text. Conclusions: SGLT2 inhibitors should be prioritised as foundational therapy to reduce cardiorenal risk.", pubTypeList: { pubType: ["Consensus Statement"] } },
      ] } }), { status: 200 });
    }
    if (url.includes("europepmc")) return new Response(JSON.stringify({ resultList: { result: [] } }), { status: 200 });
    if (url.includes("clinicaltrials")) return new Response(JSON.stringify({ studies: [] }), { status: 200 });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  try {
    const r = await answerResearch("What are the current recommendations for managing type 2 diabetes in patients with chronic kidney disease?");
    assert.equal(r.verdict, "evidence");
    assert.match(r.reason, /^"Roles of SGLT2 inhibitors in chronic kidney disease with type 2 diabetes: a consensus" \(Handelsman Y et al\., 2026\) concludes: SGLT2 inhibitors should be prioritised/);
  } finally {
    globalThis.fetch = real;
  }
});
