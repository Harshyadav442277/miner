import { test } from "node:test";
import assert from "node:assert/strict";
import { chat, chatSystem, clauseBrief } from "../src/genai";
import { resetPhraseState } from "../src/llm";

const NOW = new Date("2026-11-14T09:00:00Z");

/** Groq answering each call with the next of `contents` (the last repeats); restores fetch and the key after. */
async function withReplies(contents: string[], run: (calls: Array<{ messages: Array<{ role: string; content: string }> }>) => Promise<void>): Promise<void> {
  const real = globalThis.fetch;
  const calls: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  process.env.GROQ_API_KEY = "test-key";
  resetPhraseState();
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    calls.push(JSON.parse(init.body));
    const content = contents[Math.min(calls.length - 1, contents.length - 1)]!;
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

const LONG_BRIEF = "Uncertain: While NASA's Artemis program and private initiatives aim for Mars, no crewed landing date is confirmed by any agency yet.";
const FORECAST = JSON.stringify({ verdict: "Uncertain", brief: LONG_BRIEF,
  reply: `${LONG_BRIEF} SpaceX targets uncrewed Starship flights first. NASA's crewed plans point to the late 2030s.` });

test("genai-brief: clauseBrief keeps a complete clause in 80 characters, never an ellipsis", () => {
  const short = "Canberra is the capital of Australia.";
  assert.equal(clauseBrief(short), short);
  // A comma boundary: the clause before it, ended as a sentence.
  assert.equal(clauseBrief("Bitcoin traded near its record high this week, as spot ETF inflows rose sharply while miners sold coins."),
    "Bitcoin traded near its record high this week.");
  // Production 2026-11-14: the concession is dropped and the verdict kept, rather than serving "While ... Mars…".
  const mars = clauseBrief("Uncertain: While NASA's Artemis program and private initiatives aim for Mars, no crewed landing date is confirmed.");
  assert.equal(mars, "Uncertain: no crewed landing date is confirmed.");
  // No boundary at all: a whole-word cut, not ending on a dangling word, with a full stop.
  const words = clauseBrief("Photosynthesis converts light energy into chemical energy stored in glucose molecules inside the chloroplasts of plant cells");
  assert.ok(words.length <= 80 && words.endsWith(".") && !words.includes("…"), words);
  assert.doesNotMatch(words, /\s(?:of|in|the)\.$/);
  // An "If" clause alone is not the answer: that comma is not taken.
  const cond = clauseBrief("If the central bank raises rates again next quarter, mortgage costs will climb for most households in the region.");
  assert.ok(cond.length <= 80 && cond.endsWith(".") && !cond.includes("…"), cond);
  assert.notEqual(cond, "If the central bank raises rates again next quarter.");
});

test("genai-brief: the system prompt carries today's date", async () => {
  assert.match(chatSystem(NOW), /Today is 14 November 2026 \(UTC\)\./);
  await withReplies([JSON.stringify({ brief: "Canberra is the capital of Australia.", reply: "Canberra is the capital of Australia.", verdict: null })], async (calls) => {
    await chat("What is the capital of Australia?", "", NOW);
    assert.match(calls[0]!.messages[0]!.content, /Today is 14 November 2026 \(UTC\)\. Never state a different current year\./);
    assert.doesNotMatch(calls[0]!.messages[0]!.content, /as of 2024/);
  });
});

test("genai-brief: a good model brief makes no second call", async () => {
  await withReplies([JSON.stringify({ brief: "Canberra is the capital of Australia.", reply: "Canberra is the capital of Australia. It was chosen in 1908.", verdict: null })], async (calls) => {
    const a = await chat("What is the capital of Australia?", "", NOW);
    assert.equal(a.brief, "Canberra is the capital of Australia.");
    assert.equal(calls.length, 1);
  });
});

test("genai-brief: a long brief and long first sentence get one rewrite, served when it fits", async () => {
  const fixed = "Uncertain: no crewed Mars landing date is confirmed yet.";
  await withReplies([FORECAST, fixed], async (calls) => {
    const a = await chat("Will humans land on Mars by 2030?", "", NOW);
    assert.equal(calls.length, 2);
    assert.equal(calls[1]!.messages[0]!.content.startsWith("Rewrite the answer below as ONE complete plain sentence"), true);
    assert.match(calls[1]!.messages[1]!.content, /^Question: Will humans land on Mars by 2030\?\nAnswer: Uncertain: While NASA's/);
    assert.match(calls[1]!.messages[1]!.content, /SpaceX targets uncrewed Starship flights first\.$/);
    assert.equal(a.brief, fixed);
    assert.equal(a.verdict, "Uncertain");
  });
});

test("genai-brief: an unusable rewrite falls back to a clause cut, never an ellipsis", async () => {
  for (const bad of [`${"Uncertain: a crewed landing depends on funding, Starship tests and many other things ".repeat(2)}.`, "", "Uncertain: no crewed Mars landing date is confirmed…"]) {
    await withReplies([FORECAST, bad], async (calls) => {
      const a = await chat("Will humans land on Mars by 2030?", "", NOW);
      const brief = String(a.brief);
      assert.ok(calls.length >= 2, "a rewrite was asked for");
      assert.ok(brief.length <= 80, brief);
      assert.ok(!brief.includes("…") && brief.endsWith("."), brief);
      assert.match(brief, /^Uncertain: /);
      assert.equal(brief, "Uncertain: no crewed landing date is confirmed by any agency yet.");
    });
  }
});
