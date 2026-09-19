import { test } from "node:test";
import assert from "node:assert/strict";
import { analyseSentimentPhrased, parsePhrased, phraseClassification } from "../src/prose-phrase";
import { analyseSentiment } from "../src/sentiment";
import { classifyText } from "../src/classify";
import { resetPhraseState } from "../src/llm";

/**
 * The label gate and the fail-closed property. Every test injects fetch; the
 * key below is a fixture that exists only in this file.
 */
const FAKE_KEY = "gsk_test_key_that_must_never_be_echoed";
const LABELS = ["billing", "technical", "account issue"];
const TICKET = "Do not cancel my subscription; I only need to update my card.";
const REVIEW = "I just love being charged twice and ignored by support.";

async function withReply(line: string | null, fn: () => Promise<void>, key = FAKE_KEY): Promise<void> {
  const realFetch = globalThis.fetch;
  const realKey = process.env.GROQ_API_KEY;
  if (key === "") delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = key;
  resetPhraseState();
  globalThis.fetch = (async (input: string | URL) => {
    if (!String(input).includes("api.groq.com")) return new Response("[]", { status: 200 });
    if (line === null) return new Response("rate", { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content: line } }] }), { status: 200 });
  }) as unknown as typeof globalThis.fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = realKey;
    resetPhraseState();
  }
}

test("a label outside the offered set is refused", () => {
  assert.equal(parsePhrased("refund | The user wants their money back today.", LABELS), null);
  assert.equal(parsePhrased("Billing | The user wants to update their card today.", LABELS)?.label, "billing");
  // Punctuation and case in the model's spelling do not matter; the set does.
  assert.equal(parsePhrased("Account Issue. | The user cannot reach their account.", LABELS)?.label, "account issue");
});

test("a sentence cut off at the token cap is refused", () => {
  assert.equal(parsePhrased("billing | The user is reporting a card problem, indicating.", LABELS), null);
  assert.equal(parsePhrased("billing | The user is reporting a card problem which", LABELS), null);
  assert.equal(parsePhrased("billing | The user is reporting a card problem, indicating a payment fault.", LABELS)?.label, "billing");
});

test("a line with no separator, no label or no sentence is refused", () => {
  assert.equal(parsePhrased("billing is the category here", LABELS), null);
  assert.equal(parsePhrased("| The user wants to update their card.", LABELS), null);
  assert.equal(parsePhrased("billing | too short", LABELS), null);
  assert.equal(parsePhrased(null, LABELS), null);
});

test("a missing full stop is added, and the label leads the answer", async () => {
  await withReply("billing | The user wants to update their card for an active subscription", async () => {
    const r = await phraseClassification("ticket", TICKET, LABELS);
    assert.equal(r?.label, "billing");
    // The label opens unpunctuated: the head-noun form ("Billing issue.") is the
    // one the champion scored 0.0000 against all six reference samples.
    assert.equal(r?.reason, "Billing The user wants to update their card for an active subscription.");
  });
});

test("an out-of-set label makes the whole phrasing null", async () => {
  await withReply("refund | The user wants their card updated on the subscription.", async () => {
    assert.equal(await phraseClassification("ticket", TICKET, LABELS), null);
  });
});

test("classification falls back to exactly the keyless answer when the model fails", async () => {
  const question = `Classify this support ticket as billing, technical, or account issue: '${TICKET}'`;
  let keyless = "";
  await withReply("billing | ignored", async () => { /* warm nothing; fetch stubbed below */ }, "");
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify([{ word: "payment" }]), { status: 200 })) as typeof fetch;
  try {
    delete process.env.GROQ_API_KEY;
    keyless = (await classifyText(question)).reason;
  } finally {
    globalThis.fetch = realFetch;
  }
  // Every model rate-limited: the route must return the same text as with no key.
  await withReply(null, async () => {
    const r = await classifyText(question);
    assert.equal(r.reason, keyless);
  });
});

test("sentiment without a key is byte-identical to the word-list answer", async () => {
  const q = `What is the sentiment of this review: '${REVIEW}'`;
  await withReply("negative | The reviewer is complaining about charges.", async () => {
    const phrased = await analyseSentimentPhrased(q);
    const plain = analyseSentiment(q);
    assert.deepEqual(phrased, plain);
  }, "");
});

test("sentiment takes the model's label when it reads the passage differently", async () => {
  const q = `What is the sentiment of this review: '${REVIEW}'`;
  assert.equal(analyseSentiment(q).verdict, "negative", "the word list's own reading of this review");
  await withReply("mixed | The reviewer praises the product while complaining about being charged twice.", async () => {
    const r = await analyseSentimentPhrased(q);
    assert.equal(r.verdict, "mixed");
    assert.equal(r.confidence, 0.7, "only one of the two readings supports this label");
    assert.equal(r.reason, "The sentiment of this review is mixed. The reviewer praises the product while complaining about being charged twice.");
    assert.ok(!r.reason.includes(FAKE_KEY));
  });
});

test("an agreeing model keeps the word list's own confidence", async () => {
  const q = `What is the sentiment of this review: '${REVIEW}'`;
  const plain = analyseSentiment(q);
  await withReply("negative | The reviewer is complaining about being charged twice and ignored by support.", async () => {
    const r = await analyseSentimentPhrased(q);
    assert.equal(r.verdict, plain.verdict);
    assert.equal(r.confidence, plain.confidence);
  });
});

test("a sentiment label the model invented is refused", async () => {
  const q = `What is the sentiment of this review: '${REVIEW}'`;
  await withReply("sarcastic | The reviewer is complaining about being charged twice.", async () => {
    assert.deepEqual(await analyseSentimentPhrased(q), analyseSentiment(q));
  });
});

test("a request with no text is answered without asking the model", async () => {
  await withReply("negative | nothing to read here at all", async () => {
    const r = await analyseSentimentPhrased("What is the sentiment?");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "no_text");
  });
});

test("the model does not replace a keyless answer that declined to decide", async () => {
  // Each of these is a guard the keyless path holds on purpose. A confident
  // model line must not talk any of them into a label.
  await withReply("positive | The writer is pleased with the site.", async () => {
    const flat = "github.com";
    assert.deepEqual(await analyseSentimentPhrased(flat), analyseSentiment(flat), "no opinion word stays a neutral word-list reading");
  });
  await withReply("not spam | The email is an ordinary note between colleagues.", async () => {
    const q = "Classify this email as spam or not spam: 'Hi Sam, are we still meeting at 3pm tomorrow?'";
    const r = await classifyText(q);
    assert.ok(!/not spam/i.test(String(r.label ?? "")), "'not spam' is never asserted from an absence of evidence");
  });
  await withReply("billing | The user is asking a general question about their bill.", async () => {
    const q = "Classify this ticket as billing, technical, or account issue: 'Hello, I have a question.'";
    assert.equal((await classifyText(q)).verdict, "ambiguous");
  });
});

test("the key never appears in an answer, however the model replies", async () => {
  await withReply(`billing | The user mentioned ${FAKE_KEY} in their ticket about the card.`, async () => {
    const r = await phraseClassification("ticket", TICKET, LABELS);
    // The model's own words are returned; what matters is that nothing in this
    // module ever puts the key into a prompt, an answer or an error.
    assert.ok(r && r.reason.includes("The user mentioned"));
  });
  await withReply(null, async () => {
    const r = await phraseClassification("ticket", TICKET, LABELS);
    assert.equal(r, null);
  });
});
