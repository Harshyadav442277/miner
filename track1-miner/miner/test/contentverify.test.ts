import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { bestSource, digestParam, suppliedDigest, verifyContent } from "../src/contentverify";
import { doubleQuoted, normWords, plainWords, quotedSpans, unmatchedWindows, wordDiff } from "../src/contentverify-text";

const CLAUSE = "The Supplier shall indemnify the Buyer against all losses arising from defective goods.";
const PREAMBLE = "We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America.";

test("supplied content is read from single quotes, double quotes, or after a colon", () => {
  assert.deepEqual(quotedSpans(`Here's a copy of a contract clause: '${CLAUSE}'. Is this the original wording?`), [CLAUSE]);
  assert.deepEqual(quotedSpans(`Is this unaltered? "${CLAUSE}"`), [CLAUSE]);
  const colon = quotedSpans(`Here is the text of a press release: ${CLAUSE} More words follow here. Is this genuine?`);
  assert.match(colon[0] ?? "", /^The Supplier shall/);
  // Non-matches: an apostrophe inside a word opens nothing, and short quotes are not content.
  assert.deepEqual(quotedSpans("Here's the company's plan, isn't it?"), []);
  assert.deepEqual(quotedSpans(`Is "hello" real?`), []);
});

test("two versions are compared word by word and the changes named", () => {
  const d = wordDiff(CLAUSE, CLAUSE.replace("shall", "may").replace(" all ", " some "));
  assert.deepEqual(d, ['"shall" became "may"', '"all" became "some"']);
  assert.deepEqual(wordDiff(CLAUSE, CLAUSE), []);
  assert.deepEqual(wordDiff("a b c", "a c"), ['"b" was removed']);
  assert.deepEqual(wordDiff("a c", "a b c"), ['"b" was added']);
});

test("wikitext is reduced to words, keeping template content and link labels", () => {
  assert.deepEqual(plainWords("{{sc|We the People}} of the [[United States|United States]], ''in'' Order<ref name=\"a\"/>"),
    ["we", "the", "people", "of", "the", "united", "states", "in", "order"]);
  assert.deepEqual(plainWords("{{bare}} [[Link]]"), ["link"]);
  assert.deepEqual(normWords("'We the company's"), ["we", "the", "company's"]);
});

test("overlapping windows catch an edit that sampled runs step over", () => {
  const source = normWords(PREAMBLE);
  assert.deepEqual(unmatchedWindows(normWords(PREAMBLE), source), []);
  const edited = normWords(PREAMBLE.replace("insure domestic Tranquility", "guarantee national Security"));
  const missing = unmatchedWindows(edited, source);
  assert.ok(missing.length > 0);
  assert.ok(missing.some((w) => w.includes("guarantee")));
  assert.deepEqual(unmatchedWindows(["too", "short"], source), []);
});

test("a supplied digest is recognised by algorithm, and a bare hex string is not", () => {
  const hex = createHash("sha256").update(CLAUSE, "utf8").digest("hex");
  assert.deepEqual(suppliedDigest(`SHA-256: ${hex}`), { algo: "sha256", hex });
  assert.equal(suppliedDigest(`md5 ${"a".repeat(32)}`)?.algo, "md5");
  assert.equal(suppliedDigest(`no algorithm named ${hex}`), null);
  assert.equal(suppliedDigest("sha256 but no digest"), null);
});

const DEFINED = 'The "Supplier" shall indemnify the "Buyer" against all losses arising from any breach.';

test("structured parameters are used as given, including inner quoted defined terms", async () => {
  const hex = createHash("sha256").update(CLAUSE, "utf8").digest("hex");
  assert.deepEqual(digestParam(hex), { algo: "sha256", hex });
  assert.equal(digestParam("abc"), null);
  assert.equal(digestParam("z".repeat(64)), null);
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("must not be called"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await verifyContent("Has it been altered?", { content: CLAUSE.replace("shall", "may"), original: CLAUSE });
    assert.match(r.reason, /"shall" became "may"/);
    assert.equal((await verifyContent("", { content: CLAUSE, digest: hex })).verdict, "unaltered");
    // Verifier repro, 2026-09-13: a clause with quoted defined terms and its TRUE digest was called altered.
    const h = createHash("sha256").update(DEFINED, "utf8").digest("hex");
    const ok = await verifyContent("Is this clause unaltered?", { content: DEFINED, digest: h });
    assert.equal(ok.verdict, "unaltered");
    assert.match(ok.reason, new RegExp(h));
    const edited = await verifyContent("Is this clause unaltered?", { content: DEFINED.replace("shall", "may"), digest: h });
    assert.equal(edited.verdict, "altered");
    const two = await verifyContent("Altered?", { content: DEFINED.replace('"Buyer"', '"Purchaser"'), original: DEFINED });
    assert.equal(two.verdict, "altered");
    assert.match(two.reason, /became/);
  } finally {
    globalThis.fetch = original;
  }
});

test("a double-quoted span keeps inner quoted terms, and separate quotes stay separate", () => {
  assert.deepEqual(quotedSpans(`Is this unaltered? "${DEFINED}" SHA-256: abc`), [DEFINED]);
  assert.deepEqual(doubleQuoted(`Original: "${DEFINED}" Copy: "${CLAUSE}" ok`), [DEFINED, CLAUSE]);
  assert.deepEqual(doubleQuoted(`Payments to "Supplier", then more text follows here.`), ["Supplier"]);
  assert.deepEqual(doubleQuoted("no quotes"), []);
});

test("the candidate source is the one holding most runs, Wikisource on a tie", () => {
  const b = bestSource([
    { wiki: "Wikipedia", phrase: "p1", titles: ["A", "B"] },
    { wiki: "Wikipedia", phrase: "p2", titles: ["B"] },
    { wiki: "Wikisource", phrase: "p1", titles: ["C"] },
    { wiki: "Wikisource", phrase: "p2", titles: ["C"] },
  ]);
  assert.deepEqual(b, { wiki: "Wikisource", title: "C", hits: 2 });
  assert.equal(bestSource([]), null);
});

test("digest, two-version and refusal paths answer without any network call", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("must not be called"); }) as unknown as typeof globalThis.fetch;
  try {
    const hex = createHash("sha256").update(CLAUSE, "utf8").digest("hex");
    const ok = await verifyContent(`Is this text unaltered? "${CLAUSE}" Its published SHA-256 is ${hex}.`);
    assert.equal(ok.verdict, "unaltered");
    assert.match(ok.reason, /^Yes, .*matches/);
    const bad = await verifyContent(`Is this text unaltered? "${CLAUSE}" Its published SHA-256 is ${"0".repeat(64)}.`);
    assert.equal(bad.verdict, "altered");
    const two = await verifyContent(`Original: "${CLAUSE}" Copy: "${CLAUSE.replace("shall", "may")}" Altered?`);
    assert.equal(two.verdict, "altered");
    assert.match(two.reason, /"shall" became "may"/);
    assert.equal((await verifyContent("Is this image a deepfake? https://example.com/a.jpg")).verdict, "out_of_scope");
    assert.equal((await verifyContent("")).error, "no_content");
    assert.equal((await verifyContent("github.com")).error, "no_content");
  } finally {
    globalThis.fetch = original;
  }
});

test("an index outage is reported as an outage, never as tampering or as genuine", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await verifyContent(`Here's the text of a press release: '${PREAMBLE}'. Is this genuine?`);
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "upstream_unavailable");
    assert.doesNotMatch(r.reason, /altered:|^Yes/);
  } finally {
    globalThis.fetch = original;
  }
});

test("one index down and the other empty is an outage, not an absence in both", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    if (String(input).includes("wikisource")) throw new Error("wikisource down");
    return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
  }) as unknown as typeof globalThis.fetch;
  try {
    const r = await verifyContent(`Here's a copy of a contract clause: '${CLAUSE}' Is this the original wording?`);
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "upstream_unavailable");
    assert.match(r.reason, /Wikisource did not answer/);
    assert.doesNotMatch(r.reason, /appears verbatim in Wikisource or Wikipedia/);
  } finally {
    globalThis.fetch = original;
  }
});

test("the genuine preamble matches and an edited one is located (live)", async () => {
  const genuine = await verifyContent(`Here's a copy of the preamble: '${PREAMBLE}'. Is this the original wording?`);
  if (genuine.verdict === "unknown") return;
  assert.equal(genuine.verdict, "matches_published_source");
  const edited = await verifyContent(`Here's a copy of the preamble: '${PREAMBLE.replace("insure domestic Tranquility", "guarantee national Security")}'. Has it been altered?`);
  if (edited.verdict === "unknown") return;
  assert.equal(edited.verdict, "differs_from_published_source");
  assert.match(edited.reason, /guarantee/);
});
