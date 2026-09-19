import { test } from "node:test";
import assert from "node:assert/strict";
import { phrase, resetPhraseState, sanitise } from "../src/llm";

/**
 * The generative transport, exercised entirely through an injected fetch. No
 * test here reaches api.groq.com, and the key used below is a fixture string
 * that exists only inside this file.
 */
const FAKE_KEY = "gsk_test_key_that_must_never_be_echoed";

interface Call { model: string; auth: string }

/** Run `fn` with a stubbed fetch and a key, restoring both afterwards. */
async function withGroq(
  stub: (url: string, init: RequestInit, call: Call) => Promise<Response>,
  fn: (calls: Call[]) => Promise<void>,
  key: string | null = FAKE_KEY,
): Promise<void> {
  const realFetch = globalThis.fetch;
  const realKey = process.env.GROQ_API_KEY;
  const realBudget = process.env.LLM_BUDGET_MS;
  const calls: Call[] = [];
  // null is "the variable is not set at all"; "" is "set but empty".
  if (key === null) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = key;
  resetPhraseState();
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    const body = JSON.parse(String(init.body ?? "{}")) as { model?: string };
    const call: Call = { model: body.model ?? "", auth: headers.authorization ?? "" };
    calls.push(call);
    return stub(String(input), init, call);
  }) as unknown as typeof globalThis.fetch;
  try {
    await fn(calls);
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = realKey;
    if (realBudget === undefined) delete process.env.LLM_BUDGET_MS;
    else process.env.LLM_BUDGET_MS = realBudget;
    resetPhraseState();
  }
}

const ok = (content: string): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

const REQ = { system: "You label a passage.", user: "Labels: a, b\nThis ticket: hello world" };

test("with no key the model is never reached and the answer is null", async () => {
  await withGroq(
    async () => { throw new Error("must not fetch"); },
    async (calls) => {
      assert.equal(await phrase(REQ), null);
      assert.equal(calls.length, 0);
    },
    null,
  );
});

test("an empty key is treated as no key", async () => {
  await withGroq(
    async () => { throw new Error("must not fetch"); },
    async (calls) => {
      assert.equal(await phrase(REQ), null);
      assert.equal(calls.length, 0);
    },
    "",
  );
});

test("a completion comes back sanitised, and the key rides only in the header", async () => {
  await withGroq(
    async () => ok("**billing** | The user wants to update their card."),
    async (calls) => {
      const out = await phrase(REQ);
      assert.equal(out, "billing | The user wants to update their card.");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.auth, `Bearer ${FAKE_KEY}`);
      assert.ok(!String(out).includes(FAKE_KEY));
    },
  );
});

test("a 429 moves to the next model rather than failing the call", async () => {
  await withGroq(
    async (_url, _init, call) =>
      (call.model === "openai/gpt-oss-20b" ? new Response("rate", { status: 429 }) : ok("billing | It is about a card.")),
    async (calls) => {
      assert.equal(await phrase(REQ), "billing | It is about a card.");
      assert.equal(calls.length, 2);
      assert.equal(calls[0]?.model, "openai/gpt-oss-20b");
      assert.notEqual(calls[1]?.model, calls[0]?.model);
    },
  );
});

test("a 500 is retried on the next model the same way", async () => {
  await withGroq(
    async (_url, _init, call) =>
      (call.model === "openai/gpt-oss-20b" ? new Response("boom", { status: 503 }) : ok("a | The passage is about a.")),
    async (calls) => {
      assert.equal(await phrase(REQ), "a | The passage is about a.");
      assert.equal(calls.length, 2);
    },
  );
});

test("every model rate-limited yields null, then a minute of silence", async () => {
  await withGroq(
    async () => new Response("rate", { status: 429 }),
    async (calls) => {
      assert.equal(await phrase(REQ), null);
      assert.equal(calls.length, 3, "all three models are tried once");
      // The cooldown means the next question does not spend three more 429s.
      assert.equal(await phrase({ ...REQ, user: "a different passage entirely" }), null);
      assert.equal(calls.length, 3);
    },
  );
});

test("a transport failure on every model yields null, not a throw", async () => {
  await withGroq(
    async () => { throw new Error(`connect ECONNREFUSED while sending ${FAKE_KEY}`); },
    async () => {
      const out = await phrase(REQ);
      assert.equal(out, null);
    },
  );
});

test("a timeout falls back inside the budget", async () => {
  process.env.LLM_BUDGET_MS = "1600";
  await withGroq(
    async (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        // Resolve only when the caller's own deadline fires, as a hung host does.
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    async (calls) => {
      const started = Date.now();
      const out = await phrase(REQ);
      const ms = Date.now() - started;
      assert.equal(out, null);
      assert.equal(calls.length, 1, "no second model is started without 1.5s left");
      assert.ok(ms < 2_600, `fell back in ${ms}ms, inside the 1600ms budget plus slack`);
    },
  );
});

test("the same question is answered from cache rather than asked twice", async () => {
  await withGroq(
    async () => ok("billing | The user wants to update their card."),
    async (calls) => {
      assert.equal(await phrase(REQ), "billing | The user wants to update their card.");
      assert.equal(await phrase(REQ), "billing | The user wants to update their card.");
      assert.equal(calls.length, 1);
      // A different passage is a different key.
      await phrase({ ...REQ, user: "Labels: a, b\nThis ticket: something else" });
      assert.equal(calls.length, 2);
    },
  );
});

test("an empty or refusing completion is not an answer", async () => {
  assert.equal(sanitise("   "), null);
  assert.equal(sanitise("I cannot determine the category from this text."), null);
  assert.equal(sanitise("As an AI language model, I do not have opinions."), null);
  await withGroq(
    async () => ok("I'm unable to help with that."),
    async () => { assert.equal(await phrase(REQ), null); },
  );
});

test("markdown is stripped and a long completion is capped at 90 words", async () => {
  assert.equal(sanitise("```\nbilling | x y z\n```"), null);
  assert.equal(sanitise("## Billing\n- The user **wants** a `refund`."), "Billing The user wants a refund.");
  const long = sanitise(`billing | ${"word ".repeat(200)}`);
  assert.ok(long && long.split(" ").length <= 90);
});

test("a malformed body is a fallback, not a crash", async () => {
  await withGroq(
    async () => new Response("not json at all", { status: 200 }),
    async () => { assert.equal(await phrase(REQ), null); },
  );
});
