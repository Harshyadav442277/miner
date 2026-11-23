import { test } from "node:test";
import assert from "node:assert/strict";
import { researchBrief } from "../src/answer-brief";
import { resetPhraseState } from "../src/llm";

async function withModel(reply: string | null, fn: (sent: Array<{ question: string; evidence: string }>) => Promise<void>): Promise<void> {
  const real = globalThis.fetch;
  const sent: Array<{ question: string; evidence: string }> = [];
  process.env.GROQ_API_KEY = "test-key-not-real";
  resetPhraseState();
  globalThis.fetch = (async (input: string | URL, init?: { body?: string }) => {
    if (!String(input).includes("api.groq.com")) throw new Error(`unrouted ${String(input)}`);
    const body = JSON.parse(init!.body!) as { messages: Array<{ content: string }> };
    sent.push(JSON.parse(body.messages[1]!.content));
    return reply === null ? new Response("{}", { status: 503 }) : new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  try {
    await fn(sent);
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
}

test("a research brief is one sentence that answers the question, from the evidence passed as data", async () => {
  await withModel(JSON.stringify({ brief: "Regular exercise modestly reduces depressive symptoms" }), async (sent) => {
    const b = await researchBrief("Does regular exercise reduce depression symptoms?", "Across two studies: \"exercise reduced depressive symptoms\" (PMID 1).");
    assert.equal(b, "Regular exercise modestly reduces depressive symptoms.");
    assert.ok(b!.length <= 80);
    assert.equal(sent[0]!.question, "Does regular exercise reduce depression symptoms?");
    assert.match(sent[0]!.evidence, /PMID 1/);
  });
});

test("no model answer, or an ellipsis, leaves the route's own brief", async () => {
  await withModel(null, async () => {
    assert.equal(await researchBrief("Does vitamin D prevent colds?", "none"), null);
  });
  await withModel(JSON.stringify({ brief: "Vitamin D may help…" }), async () => {
    assert.equal(await researchBrief("Does vitamin D prevent colds?", "none"), null);
  });
  assert.equal(await researchBrief("  ", "x"), null);
});

test("with no study found, the brief comes from general knowledge and the model is told none was retrieved", async () => {
  await withModel(JSON.stringify({ brief: "Regular exercise reduces symptoms of depression in most adults" }), async (sent) => {
    const b = await researchBrief("Does regular exercise reduce depression symptoms?", "No quotable study was found.", undefined, false);
    assert.equal(b, "Regular exercise reduces symptoms of depression in most adults.");
    assert.equal((sent[0] as { evidence?: string }).evidence, undefined, "no evidence is passed when none was found");
  });
});

test("every research verdict that found or failed to find a study gets the model brief, an outage too; other errors do not", async () => {
  const { withResearchBrief } = await import("../src/handler");
  await withModel(JSON.stringify({ brief: "Intermittent fasting has not been shown to slow human ageing" }), async () => {
    for (const verdict of ["evidence", "synthesis", "single_source", "papers", "no_sources", "no_evidence"]) {
      const r = await withResearchBrief("Does intermittent fasting slow ageing in humans?")({ verdict, reason: "x" });
      assert.equal(r.brief, "Intermittent fasting has not been shown to slow human ageing.", verdict);
    }
    // Europe PMC timed out and the scored brief was the outage sentence (2026-11-23).
    const down = await withResearchBrief("Does intermittent fasting slow ageing in humans?")({ verdict: "unavailable", reason: "x", error: "upstream_unavailable" });
    assert.equal(down.brief, "Intermittent fasting has not been shown to slow human ageing.");
    assert.match(String(down.brief_basis), /did not answer/);
    const bad = await withResearchBrief("q")({ verdict: "unknown", reason: "x", error: "no_question" });
    assert.equal(bad.brief, undefined);
  });
});
