import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifiedText, classifyText, contentWords, keylessLabelHolds, KEYLESS_ONLY_MARGIN, parseLabels, placement, scoreLabels, splitLabels, stem, textWords,
} from "../src/classify";

/**
 * No TEXT_CLASSIFICATION question appeared in the explorer feed on 2026-09-12,
 * so these use the canonical description's example and label sets of other
 * shapes. Offline tests inject neighbourhoods; live ones reach Datamuse.
 */
const TICKET = "Classify this support ticket as billing, technical, or account issue: 'I can't log into my account.'";
const ARTICLE = "Assign this article to one of these categories: world news, business and finance, science and technology, sport. " +
  "Text: 'Researchers have sequenced the genome of a 40,000-year-old mammoth using a new extraction method.'";

test("labels are read from 'as A, B, or C:'", () => {
  assert.deepEqual(parseLabels(TICKET), ["billing", "technical", "account issue"]);
});

test("'and' inside a label is kept, a list separator is not", () => {
  assert.deepEqual(parseLabels(ARTICLE), ["world news", "business and finance", "science and technology", "sport"]);
  assert.deepEqual(parseLabels("Labels: spam, ham, and promotions."), ["spam", "ham", "promotions"]);
});

test("'belong to:' and 'into' phrasings are read", () => {
  assert.deepEqual(parseLabels("What category does this review belong to: quality, shipping, or price? 'Late.'"), ["quality", "shipping", "price"]);
  assert.deepEqual(parseLabels("Categorize this headline into politics, sports, technology or health: 'x y'"), ["politics", "sports", "technology", "health"]);
});

test("a declared labels parameter is split the same way, and a single label is not a set", async () => {
  assert.deepEqual(splitLabels("billing, technical, or account issue"), ["billing", "technical", "account issue"]);
  assert.deepEqual(splitLabels("billing"), []);
  const r = await classifyText("Classify this ticket.", "The delivery was great", "positive, negative");
  assert.equal(r.label, "positive");
});

test("a question without a label set yields none, so nothing is guessed", () => {
  assert.deepEqual(parseLabels("Classify this as important: 'x'"), []);
  assert.deepEqual(parseLabels("github.com"), []);
  assert.deepEqual(parseLabels("What's the sentiment of this review?"), []);
});

test("the passage is the declared parameter, else the quoted text", () => {
  assert.equal(classifiedText(TICKET), "I can't log into my account.");
  assert.equal(classifiedText(TICKET, "refund please"), "refund please");
});

test("stemming meets inflections and leaves short roots alone", () => {
  assert.equal(stem("accounts"), stem("account"));
  assert.equal(stem("logging"), stem("log"));
  assert.notEqual(stem("science"), stem("sport"));
});

test("generic label words give way to the specific one", () => {
  assert.deepEqual(contentWords("account issue"), ["account"]);
  assert.deepEqual(contentWords("science and technology"), ["science", "technology"]);
  assert.deepEqual(contentWords("issue"), ["issue"]);
});

test("stop words and contractions are not topic words", () => {
  assert.deepEqual(textWords("I can't log into my account."), ["log", "account"]);
  assert.deepEqual(textWords("the and 2024"), []);
});

test("the label word itself outweighs a neighbour of another label", () => {
  const fwd = new Map([["billing", ["accounting", "invoice"]], ["technical", ["technology"]], ["account", ["ledger"]]]);
  const ranked = scoreLabels("I can't log into my account.", ["billing", "technical", "account issue"], fwd);
  assert.equal(ranked[0]?.label, "account issue");
  // "account" itself, and "log" as an account cue (report F2 added the cues).
  assert.equal(ranked[0]?.direct, 2);
  assert.ok((ranked[0]?.score ?? 0) > (ranked[1]?.score ?? 0));
});

test("shared neighbours alone never count as direct support", () => {
  const fwd = new Map([["account", ["a1", "a2", "a3"]]]);
  const rev = new Map([["crashes", ["a1", "a2", "a3"]]]);
  const [r] = scoreLabels("crashes", ["account issue"], fwd, rev);
  assert.equal(r?.score, 0.5);
  assert.equal(r?.direct, 0);
});

test("the answer sentence fits the label", () => {
  assert.equal(placement("ticket", "account issue"), "This ticket is an account issue.");
  assert.equal(placement("ticket", "billing issue"), "This ticket is a billing issue.");
  assert.equal(placement("email", "spam"), "This email is spam.");
  assert.equal(placement("article", "sport"), "This article belongs to the sport category.");
});

test("missing labels and missing text are refused by name", async () => {
  assert.equal((await classifyText("github.com")).error, "no_labels");
  assert.equal((await classifyText("")).error, "no_labels");
  assert.equal((await classifyText("Classify this as billing, technical, or account issue")).error, "no_text");
});

test("sentiment label sets go to the sentiment scorer, with no network", async () => {
  const r = await classifyText("Classify the following text as positive, negative, or neutral: 'The delivery arrived three days late and the box was crushed.'");
  assert.equal(r.label, "negative");
  assert.match(r.reason, /^Negative\. This text is negative: The delivery arrived three days late and the box was crushed\./);
});

test("a relatedness outage is reported as an outage, not as an ambiguous text", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("offline"); }) as typeof fetch;
  try {
    const r = await classifyText("Classify this ticket as billing, technical, or account issue: 'The screen stays blank.'");
    assert.equal(r.error, "upstream_unavailable");
    assert.match(r.reason, /source outage/);
    // A direct label-word match still answers during the outage, and says how.
    const direct = await classifyText(TICKET);
    assert.equal(direct.label, "account issue");
    assert.match(direct.reason, /did not respond/);
  } finally {
    globalThis.fetch = real;
  }
});

async function datamuseUp(): Promise<boolean> {
  try {
    const r = await fetch("https://api.datamuse.com/words?ml=billing&max=1", { signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch { return false; }
}

test("(live) the canonical ticket is an account issue", async () => {
  if (!(await datamuseUp())) return;
  const r = await classifyText(TICKET);
  assert.equal(r.label, "account issue");
  assert.match(r.reason, /^Account issue\. This support ticket is an account issue: I can't log into my account\. The words /);
});

test("(live) a genome paper is science and technology, not guessed from shared words", async () => {
  if (!(await datamuseUp())) return;
  const r = await classifyText(ARTICLE);
  assert.equal(r.label, "science and technology");
});

test("a sentiment label set reads a passage quoted mid-question, with no network", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("must not fetch"); }) as typeof fetch;
  try {
    const r = await classifyText("Classify the sentiment of the review 'The battery died after a week and the screen broke' as positive or negative");
    assert.equal(r.verdict, "classified");
    assert.equal(r.label, "negative");
    const none = await classifyText("Classify this as positive or negative");
    assert.match(none.reason, /classify as positive or negative\./);
  } finally {
    globalThis.fetch = real;
  }
});

test("(live) spam or not spam never picks 'not spam' from an absence", async () => {
  if (!(await datamuseUp())) return;
  const r = await classifyText("Classify this email as spam or not spam: 'Hi Sam, are we still meeting at 3pm tomorrow?'");
  assert.notEqual(r.label, "not spam");
});

// Rank-loss report F2 (2026-09-15): both came back ambiguous from production.
test("an ordinary billing complaint is billing, even when the index relates its words to account too", async () => {
  const real = globalThis.fetch;
  // The index outage path counts only direct evidence, which is exactly what a cue is.
  globalThis.fetch = (async () => { throw new Error("offline"); }) as typeof fetch;
  try {
    const r = await classifyText('Classify this ticket as billing, technical, or account issue: "I was charged twice on my invoice."');
    assert.equal(r.label, "billing");
    const s = await classifyText("What category does this review belong to: quality, shipping, or price? 'The package took three weeks to arrive.'");
    assert.equal(s.label, "shipping");
  } finally {
    globalThis.fetch = real;
  }
  const account = new Map([["account", ["invoice", "charge", "statement"]], ["billing", ["invoice", "charge"]]]);
  const ranked = scoreLabels("I was charged twice on my invoice.", ["billing", "technical", "account issue"], account);
  assert.equal(ranked[0]?.label, "billing");
  assert.ok(ranked[0]!.score >= (ranked[1]?.score ?? 0) * 1.5, JSON.stringify(ranked));
});

test("evidence after a long unrelated opening is still scored", () => {
  const text = "Hello team, I hope everyone had a lovely weekend at the lake with family and friends and the weather held up nicely. " +
    "Anyway, I noticed my card was charged twice for last month and I need a refund.";
  assert.equal(scoreLabels(text, ["billing", "technical", "account issue"], new Map())[0]?.label, "billing");
});

test("a head noun shared by the label list is spoken with every label", () => {
  const labels = ["billing", "technical", "account issue"];
  assert.equal(placement("ticket", "billing", labels), "This ticket is a billing issue.");
  assert.equal(placement("ticket", "account issue", labels), "This ticket is an account issue.");
  assert.equal(placement("review", "shipping", ["quality", "shipping", "price"]), "This review belongs to the shipping category.");
});

test("with a model configured, the word list labels alone only on a strong margin (G244)", () => {
  assert.equal(keylessLabelHolds(1.6, false), true, "no model: the keyless rule is unchanged");
  assert.equal(keylessLabelHolds(1.6, true), false, "model expected, weak margin: ambiguous");
  assert.equal(keylessLabelHolds(KEYLESS_ONLY_MARGIN, true), true, "model expected, strong margin: labelled");
});

test("(live) a missed model reading on a weak lean answers ambiguous, not a guess (G244)", async () => {
  if (!(await datamuseUp())) return;
  const real = globalThis.fetch;
  const key = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-model-unreachable";
  // The relatedness index answers for real; the model endpoint fails, as a missed deadline does.
  globalThis.fetch = (async (u: string | URL | Request, init?: RequestInit) =>
    String(u).includes("groq.com") ? new Response("unavailable", { status: 503 }) : real(u, init)) as typeof fetch;
  try {
    const r = await classifyText("Classify this field report as hardware fault, software fault, or operator error: 'The drone's left motor overheated and the propeller stopped spinning.'");
    assert.notEqual(r.label, "operator error");
    if (r.verdict === "ambiguous") assert.match(r.reason, /too weakly to choose a label/);
  } finally {
    globalThis.fetch = real;
    if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key;
  }
});

test("an ambiguous answer given because the model answered 429 is marked degraded, so it is not cached (2026-11-08)", async () => {
  const real = globalThis.fetch;
  const key = process.env.GROQ_API_KEY;
  const { resetPhraseState } = await import("../src/llm");
  // Groq refuses for rate on both fast models; Datamuse knows none of the words.
  globalThis.fetch = (async (u: string | URL | Request) =>
    String(u).includes("groq.com") ? new Response("{}", { status: 429 }) : Response.json([])) as typeof fetch;
  const ASK = "Classify this text as politics, sport or science: 'Quarterly zorbling of the flimflam resumed.'";
  try {
    process.env.GROQ_API_KEY = "test-key";
    resetPhraseState();
    const r = await classifyText(ASK);
    assert.equal(r.verdict, "ambiguous");
    assert.equal(r.label, null);
    assert.equal(r.error, "degraded");
    // Without a key the same answer is the keyless one, and stays cacheable.
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
    const k = await classifyText(ASK);
    assert.equal(k.verdict, "ambiguous");
    assert.equal(k.error, undefined);
  } finally {
    globalThis.fetch = real;
    if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key;
    resetPhraseState();
  }
});
