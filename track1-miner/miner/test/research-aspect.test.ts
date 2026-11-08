import { test } from "node:test";
import assert from "node:assert/strict";
import { answerResearch, aspectOf, researchSubject } from "../src/research";

// "What are the main causes of antibiotic resistance?" was searched as "main causes antibiotic resistance" and
// answered no_evidence with no source (production, 2026-11-08).

test("the subject phrase is read apart from the aspect asked of it", () => {
  const a = (q: string) => aspectOf(researchSubject(q)!);
  assert.deepEqual(a("What are the main causes of antibiotic resistance?"), { phrase: "antibiotic resistance", aspect: ["causes", "drivers", "factors", "mechanisms"] });
  assert.equal(a("What are the risk factors for type 2 diabetes?")!.phrase, "type 2 diabetes");
  assert.deepEqual(a("What are the effects of intermittent fasting?")!.aspect, ["effects", "benefits", "outcomes"]);
  assert.equal(a("Will Nivolumab show improved bladder cancer outcomes?"), null);
  assert.equal(a("What are the causes of the decline of the bee population in industrial farming regions of Europe?"), null, "a long phrase is not a subject phrase");
});

const paper = (title: string, abstractText: string) => ({ title, authorString: "Salam MA, Al-Amin MY.", pubYear: "2023", abstractText, pubTypeList: { pubType: ["review"] } });

function stub(t: { after: (fn: () => void) => void }, epmc: (q: string) => unknown[]): string[] {
  const real = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = (async (u: string) => {
    const url = String(u);
    asked.push(url);
    if (url.includes("clinicaltrials.gov")) return new Response(JSON.stringify({ studies: [] }), { status: 200 });
    if (url.includes("europepmc")) return new Response(JSON.stringify({ resultList: { result: epmc(decodeURIComponent(url)) } }), { status: 200 });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = real; });
  return asked;
}

test("an aspect question is answered from papers whose titles name the phrase and the aspect", async (t) => {
  const asked = stub(t, (q) => q.includes('TITLE:"antibiotic resistance" AND TITLE:(causes OR drivers OR factors OR mechanisms)') && q.includes("PUB_TYPE:review")
    ? [paper("Antimicrobial Resistance: A Growing Serious Threat for Global Public Health",
      "Background text here. In conclusion, overuse and misuse of antibiotics in humans and animals drive antibiotic resistance worldwide.")]
    : []);
  const r = await answerResearch("What are the main causes of antibiotic resistance?");
  assert.equal(r.verdict, "evidence", r.reason);
  assert.match(r.reason, /concludes: overuse and misuse of antibiotics/);
  assert.equal(r.citations.length, 1);
  assert.ok(!asked.some((u) => /main(%20|\+)causes/.test(u)), "no index is searched for the scaffolding words");
});

test("when the cleaned phrase still finds nothing, the answer says what was searched", async (t) => {
  stub(t, () => []);
  const r = await answerResearch("What are the main causes of antibiotic resistance?");
  assert.equal(r.verdict, "no_evidence");
  assert.match(r.reason, /^No registered trial and no indexed publication on antibiotic resistance was found/);
  assert.match(r.reason, /titles name antibiotic resistance with causes, drivers, factors, mechanisms, and none was found/);
});
