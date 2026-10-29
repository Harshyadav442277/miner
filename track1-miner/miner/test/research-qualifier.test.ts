import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answerResearch, asksPoliticalDecision, contentKeys, namesAll, qualifierOf, researchConcepts, researchSubject, searchNames,
} from "../src/research";

// G200, audit 2026-10-21 and the 99 routed questions replayed 2026-10-26
// (docs/evidence/research-g200-2026-10-26/).

test("the qualifier is what the question asks about the name, without forecast words", () => {
  const q = (s: string): string[] => qualifierOf(researchSubject(s)!, searchNames(s));
  assert.deepEqual(q("Will Nivolumab show improved bladder cancer outcomes?"), ["bladder", "cancer"]);
  assert.deepEqual(q("Will Lepodisiran reduce coronary plaque?"), ["coronary", "plaque"]);
  assert.deepEqual(q("Will YESAFILI gain market share?"), []);
  assert.deepEqual(q("Will Glycotest HCC Panel outperform AFP?"), ["afp"]);
  assert.deepEqual(q("Will Semaglutide treat diabetic eye disease?"), ["diabetic", "eye"]);
});

test("names: a drug code first, and no bare company word", () => {
  assert.deepEqual(searchNames("Will Eli Lilly complete LY3537021 recruitment?")[0], "LY3537021");
  assert.ok(!searchNames("Will Inari Medical complete PERSEVERE study?").includes("Medical"));
  assert.ok(searchNames("Will Inari Medical complete PERSEVERE study?").includes("Inari"));
});

test("a qualifier matches whole, by its parts, or through a clinical word, and every word must match", () => {
  assert.ok(namesAll("Alpha (α)-Thalassemia", ["alpha-thalassemia"]));
  assert.ok(!namesAll("Beta-thalassemia", ["alpha-thalassemia"]));
  assert.ok(namesAll("Measurement of Ocular Blood Flow in Diabetic Patients", ["diabetic", "eye"]));
  assert.ok(!namesAll("Effect of Semaglutide on Healing of Foot Ulcers in Type 2 Diabetes", ["diabetic", "eye"]));
  assert.ok(!namesAll("Seyed et al.", ["eye"]), "a short word only at a word start");
});

test("a state's political decision is declined, a drug question is not", async () => {
  assert.ok(asksPoliticalDecision("Will Pakistan sanction Iran?"));
  assert.ok(asksPoliticalDecision("Will Pakistan mediate Houthi-Iran tensions?"));
  assert.ok(!asksPoliticalDecision("Will the FDA approve the drug for patients with cancer?"));
  const r = await answerResearch("Will Pakistan sanction Iran?");
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "out_of_scope");
  assert.deepEqual(r.trials, []);
});

test("a concept is matched by every content word, and research scaffolding is not a concept", () => {
  assert.deepEqual(researchConcepts("What does research say about creatine supplementation and cognition?").concepts,
    ["creatine supplementation", "cognition"]);
  assert.deepEqual(contentKeys("creatine supplementation"), ["creati", "supple"]);
});

test("a trial is chosen for the qualifier, named in its conditions, over the drug's other trials", async () => {
  const real = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = (async (u: string) => {
    const url = String(u);
    asked.push(url);
    if (url.includes("clinicaltrials.gov")) {
      const study = (id: string, title: string, conditions: string[]) => ({ protocolSection: {
        identificationModule: { nctId: id, briefTitle: title }, statusModule: { overallStatus: "RECRUITING" },
        designModule: { phases: ["PHASE2"] }, conditionsModule: { conditions },
      } });
      return new Response(JSON.stringify({ studies: [
        study("NCT00000001", "Nivolumab in Head and Neck Squamous Cell Carcinoma", ["Head and Neck Cancer"]),
        study("NCT00000002", "IPI-549 With Nivolumab in Advanced Urothelial Carcinoma", ["Bladder Cancer", "Urothelial Carcinoma"]),
      ] }), { status: 200 });
    }
    return new Response(JSON.stringify({ resultList: { result: [] } }), { status: 200 });
  }) as typeof fetch;
  try {
    const r = await answerResearch("Will Nivolumab show improved bladder cancer outcomes?");
    assert.equal(r.verdict, "evidence");
    assert.deepEqual(r.trials.map((t) => t.id), ["NCT00000002"]);
    assert.match(r.reason, /NCT00000002/);
    assert.ok(asked.some((u) => u.includes("clinicaltrials.gov") && /Nivolumab(%20|\+)bladder(%20|\+)cancer/.test(u)), "searched with the qualifier");
  } finally {
    globalThis.fetch = real;
  }
});
