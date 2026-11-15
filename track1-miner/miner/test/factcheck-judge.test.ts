import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFact, coarse, parseJudged } from "../src/factcheck";
import { scoredFields } from "../src/intent-fields";
import { resetPhraseState } from "../src/llm";

const EVIDENCE = "Extensive investigation into vaccines and autism has shown that there is no relationship between the two, causal or otherwise.";
const judged = (o: Record<string, unknown>): string => JSON.stringify(o);

test("parseJudged: one of seven ratings; a quote must be in the evidence; evidence basis needs that quote", () => {
  const ok = parseJudged(judged({ rating: "False", basis: "evidence", quote: "there is no relationship between the two, causal or otherwise.",
    reasoning: "Research has found no link between vaccines and autism" }), EVIDENCE);
  assert.deepEqual(ok, { rating: "False", basis: "evidence", quote: "there is no relationship between the two, causal or otherwise.",
    reasoning: "Research has found no link between vaccines and autism." });
  const invented = parseJudged(judged({ rating: "False", basis: "evidence", quote: "Vaccines have been proven safe in every trial ever run.", reasoning: "x" }), EVIDENCE);
  assert.equal(invented?.quote, null, "a sentence the source does not contain is never cited");
  assert.equal(invented?.basis, "knowledge");
  assert.equal(invented?.reasoning, null);
  assert.equal(parseJudged(judged({ rating: "mostly true", basis: "knowledge", quote: "" }), EVIDENCE)?.rating, "Mostly True");
  assert.equal(parseJudged(judged({ rating: "Partly true", basis: "evidence" }), EVIDENCE), null);
  assert.equal(parseJudged("not json", EVIDENCE), null);
});

test("coarse: the route's three-way verdict for each rating", () => {
  assert.equal(coarse("True"), "supported");
  assert.equal(coarse("Mostly True"), "supported");
  assert.equal(coarse("Misleading"), "contradicted");
  assert.equal(coarse("Mostly False"), "contradicted");
  assert.equal(coarse("Mixed"), "unverified");
  assert.equal(coarse("Unverified"), "unverified");
});

test("the mapper serves the model's rating as the schema verdict, else the word rules' mapping", () => {
  const rated = scoredFields("/fact-check", { verdict: "contradicted", rating: "Misleading", reason: "Misleading. Edison improved an existing design." });
  assert.equal(rated.verdict, "Misleading");
  assert.equal(rated.verdict_detail, "contradicted");
  const plain = scoredFields("/fact-check", { verdict: "unverified", reason: "The claim was checked." });
  assert.equal(plain.verdict, "Unverified");
  assert.match(String(plain.reason), /^Unverified\. /);
});

/** Wikipedia and Groq stubbed; returns the Groq request bodies. */
async function withStubs(groqReply: string | null, run: (groq: Array<{ messages: Array<{ role: string; content: string }> }>) => Promise<void>, key = true): Promise<void> {
  const real = globalThis.fetch;
  const groq: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  if (key) process.env.GROQ_API_KEY = "test-key-not-real";
  else delete process.env.GROQ_API_KEY;
  resetPhraseState();
  globalThis.fetch = (async (input: string | URL, init?: { body?: string }) => {
    const u = String(input);
    const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
    if (u.includes("api.groq.com")) {
      groq.push(JSON.parse(init!.body!));
      return groqReply === null ? new Response("rate", { status: 429 }) : json({ choices: [{ message: { content: groqReply } }] });
    }
    if (u.includes("list=search")) return json({ query: { search: [{ title: "Vaccines and autism", snippet: "vaccines autism" }] } });
    if (u.includes("/page/summary/")) return json({ extract: EVIDENCE });
    return json({});
  }) as unknown as typeof fetch;
  try {
    await run(groq);
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
}

test("checkFact: the model rates the claim against the retrieved evidence, passed as JSON data, and cites it", async () => {
  await withStubs(judged({ rating: "False", basis: "evidence", quote: "there is no relationship between the two, causal or otherwise.",
    reasoning: "Studies of vaccines and autism found no link between them." }), async (groq) => {
    const r = await checkFact("Vaccines cause autism.");
    assert.equal(r.verdict, "contradicted");
    assert.equal(r.rating, "False");
    assert.equal(r.rating_basis, "evidence");
    assert.equal(r.confidence, 0.85);
    assert.match(r.reason, /^False\. Studies of vaccines and autism found no link between them\. According to Wikipedia's article "Vaccines and autism": "there is no relationship/);
    assert.ok(!("evidence_full" in r) && !("title" in r), "internal fields are not served");
    const sent = JSON.parse(groq[0]!.messages[1]!.content) as { claim: string; article: string; evidence: string };
    assert.deepEqual(sent, { claim: "Vaccines cause autism.", article: "Vaccines and autism", evidence: EVIDENCE });
    assert.equal(scoredFields("/fact-check", r).verdict, "False");
  });
});

test("checkFact: a knowledge-based rating says so, at lower confidence", async () => {
  await withStubs(judged({ rating: "True", basis: "evidence", quote: "", reasoning: "Water boils at 100 degrees Celsius at standard sea-level pressure." }), async () => {
    const r = await checkFact("Water boils at 100 degrees Celsius at sea level.");
    assert.equal(r.rating, "True");
    assert.equal(r.rating_basis, "knowledge", "no quote from the source, so the basis is knowledge");
    assert.equal(r.confidence, 0.65);
    assert.match(r.reason, /does not state it; this rating rests on well-established knowledge\./);
    // The stub's only article does not match this claim, so no article is consulted and the model is the source.
    assert.deepEqual(scoredFields("/fact-check", r).sources, ["Groq-hosted language model (general knowledge)"]);
  });
});

test("checkFact: without a model answer the word-rule answer is served unchanged", async () => {
  let keyless: unknown;
  await withStubs(null, async () => { keyless = await checkFact("Vaccines cause autism."); }, false);
  await withStubs(null, async (groq) => {
    const r = await checkFact("Vaccines cause autism.");
    assert.ok(groq.length >= 1, "the model was asked");
    const strip = (x: unknown) => ({ ...(x as Record<string, unknown>), checked_at: "" });
    assert.deepEqual(strip(r), strip(keyless));
    assert.equal(r.rating, undefined);
  });
});
