import { test } from "node:test";
import assert from "node:assert/strict";
import { asksWillHappen, chat, cut, generateText, normaliseFindings, opening, parseObject, reviewCode, reviewVerdict, wordTarget } from "../src/genai";
import { resetPhraseState } from "../src/llm";

/** Groq answering with `content` for every call; restores fetch and the key after. */
async function withModel(content: string | null, run: (calls: Array<Record<string, unknown>>) => Promise<void>): Promise<void> {
  const real = globalThis.fetch;
  const calls: Array<Record<string, unknown>> = [];
  process.env.GROQ_API_KEY = "test-key";
  resetPhraseState();
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    calls.push(JSON.parse(init.body) as Record<string, unknown>);
    if (content === null) return new Response("{}", { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  }) as typeof fetch;
  try {
    await run(calls);
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
}

test("genai: helpers parse JSON, cut to 80 characters and read word targets", () => {
  assert.deepEqual(parseObject('noise {"a": 1} tail'), { a: 1 });
  assert.equal(parseObject("not json"), null);
  assert.equal(cut("short"), "short");
  const long = cut("The quick brown fox jumps over the lazy dog and keeps running far beyond the hill until night falls.");
  assert.ok(long.length <= 80, long);
  assert.equal(opening("First one. Second one."), "First one.");
  assert.equal(wordTarget("Write a 60-word product description"), 60);
  assert.equal(wordTarget("Summarise in 120 words"), 120);
  assert.equal(wordTarget("Write a haiku"), null);
  assert.equal(asksWillHappen("Will Bitcoin pass $200k in 2027?"), true);
  assert.equal(asksWillHappen("Why is the sky blue?"), false);
});

test("genai: a critical or high finding is never approved, and findings sort by severity", () => {
  const f = normaliseFindings([
    { severity: "low", issue: "naming" },
    { severity: "CRITICAL", line: 2, issue: "SQL injection", fix: "parameterise" },
    { severity: "bogus", issue: "x" },
    { severity: "high" },
  ]);
  assert.deepEqual(f.map((x) => x.severity), ["critical", "low", "info"]);
  assert.equal(f[0]!.line, 2);
  assert.equal(reviewVerdict("Approve", f), "Request changes");
  assert.equal(reviewVerdict("Approve", [{ severity: "medium", line: null, issue: "a", fix: "" }]), "Comment");
  assert.equal(reviewVerdict("nonsense", []), "Approve");
});

test("genai: chat serves brief, reply and a will-verdict from the model's JSON", async () => {
  await withModel(JSON.stringify({ brief: "Unlikely: no crewed Mars lander is scheduled before 2030 by any agency.", reply: "Unlikely: no crewed Mars lander is scheduled before 2030 by any agency. NASA's plans point to the late 2030s.", verdict: "Unlikely" }), async (calls) => {
    const a = await chat("Will humans land on Mars by 2030?");
    assert.equal(a.verdict, "Unlikely");
    assert.ok(String(a.brief).length <= 80);
    assert.match(String(a.reason), /^Unlikely: no crewed Mars lander/);
    assert.equal((calls[0]!.response_format as { type: string }).type, "json_object");
    assert.equal(calls[0]!.model, "openai/gpt-oss-120b");
  });
  await withModel(JSON.stringify({ brief: "Canberra is the capital of Australia.", reply: "Canberra is the capital of Australia.", verdict: null }), async () => {
    const a = await chat("", "What is the capital of Australia?");
    assert.equal(a.verdict, "answered");
    assert.equal(a.brief, "Canberra is the capital of Australia.");
  });
});

test("genai: no model answer is unknown, never invented; empty input is refused by name", async () => {
  await withModel(null, async () => {
    const a = await chat("Why is the sky blue?");
    assert.equal(a.verdict, "unknown");
    assert.equal(a.error, "upstream_unavailable");
    assert.equal(a.reply, null);
  });
  assert.equal((await reviewCode("")).error, "no_code");
  assert.equal((await reviewCode("https://github.com/x/y/pull/1")).error, "link_not_fetched");
  assert.equal((await generateText("  ")).error, "no_prompt");
});

test("genai: a review's verdict follows its findings and leads the answer", async () => {
  const model = { verdict: "Approve", summary: "The code is unsafe: it builds SQL from input.", findings: [
    { severity: "high", line: 4, issue: "Off-by-one: range(len(rows) + 1) reads past the end.", fix: "for row in rows:" },
    { severity: "critical", line: 2, issue: "SQL injection: uid is concatenated into the query.", fix: "Use a parameterised query." },
  ] };
  await withModel(JSON.stringify(model), async () => {
    const a = await reviewCode("", "def f(db, uid):\n  q = 'SELECT * FROM users WHERE id = ' + uid\n");
    assert.equal(a.verdict, "Request changes");
    assert.equal(a.finding_count, 2);
    assert.equal((a.findings as Array<{ severity: string }>)[0]!.severity, "critical");
    assert.match(String(a.reason), /^Request changes: The code is unsafe/);
  });
});

test("genai: long calls are budgeted by tokens and their rate limits never park the phrasing path", async () => {
  process.env.LLM_LONG_TOKENS_PER_MIN = "2500"; // one writing call (~2,000 tokens) fits, a second does not
  try {
    await withModel(JSON.stringify({ title: "", text: "One." }), async (calls) => {
      await generateText("", "Write one word.");
      const second = await generateText("", "Write two words.");
      assert.equal(second.error, "upstream_unavailable");
      assert.equal(calls.length, 1, "the capped call must not reach the model");
      const again = await generateText("", "Write one word."); // a cached answer is still served
      assert.equal(again.verdict, "generated");
    });
  } finally {
    delete process.env.LLM_LONG_TOKENS_PER_MIN;
  }
  // Every model answering 429 to a long call sets the long cooldown only.
  await withModel(null, async () => {
    await chat("Why is the sky blue?");
  });
  const { phrase } = await import("../src/llm");
  process.env.GROQ_API_KEY = "test-key";
  const real = globalThis.fetch;
  let rate = true;
  globalThis.fetch = (async () => (rate
    ? new Response("{}", { status: 429 })
    : new Response(JSON.stringify({ choices: [{ message: { content: "Phrased." } }] }), { status: 200 }))) as typeof fetch;
  try {
    await chat("Why is the sky blue?"); // trips the long cooldown
    rate = false;
    assert.equal(await phrase({ system: "s", user: "u" }), "Phrased.", "the phrasing path must not be parked by a long call");
    assert.equal((await chat("Why is grass green?")).error, "upstream_unavailable", "the long path is parked for its minute");
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
});

test("genai: generated text carries brief, word count and the requested count", async () => {
  const text = "Charge anywhere with sunlight. " + "Word ".repeat(55).trim() + ".";
  await withModel(JSON.stringify({ title: "", text }), async () => {
    const a = await generateText("", "Write a 60-word product description for a solar charger.");
    assert.equal(a.verdict, "generated");
    assert.equal(a.requested_words, 60);
    assert.equal(a.word_count, 59);
    assert.equal(a.brief, "Charge anywhere with sunlight.");
    assert.equal(a.reason, text);
  });
});
