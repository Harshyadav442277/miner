import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { restateRequest, withRestatement, isAnswered } from "../src/restate";

describe("restateRequest", () => {
  test("strips the asking and the imperative verb, leaving a noun phrase", () => {
    const r = restateRequest(
      "Can you provide a 7-day weather forecast for Tokyo, Japan starting from next Monday?",
    );
    assert.equal(r.phrase, "a 7-day weather forecast for Tokyo, Japan starting from next Monday");
    assert.equal(r.nounPhrase, true);
  });

  test("keeps the verb when no determiner follows it", () => {
    // 'Here is translate "Good morning" into French' is not English; this must
    // fall through to the neutral opener instead.
    const r = restateRequest('Translate "Good morning" into French.');
    assert.equal(r.nounPhrase, false);
    assert.match(r.phrase, /^translate "Good morning" into French$/);
  });

  test("handles the other lead-ins", () => {
    assert.equal(
      restateRequest("Please give me the current TLS certificate status for example.com").phrase,
      "the current TLS certificate status for example.com",
    );
    assert.deepEqual(restateRequest("I need you to check the storm risk for Chennai today"), {
      phrase: "the storm risk for Chennai today",
      nounPhrase: true,
    });
  });

  test("declines anything that is not a sentence", () => {
    // The engine fills only declared parameters, so these are the real shapes a
    // route sees when no question text arrives.
    for (const q of ["", "   ", "github.com", "8.8.8.8", "35.6897,139.6922", "Tokyo"]) {
      assert.equal(restateRequest(q).phrase, "", `expected no restatement for ${JSON.stringify(q)}`);
    }
  });

  test("caps a runaway question at 60 words", () => {
    const long = `Can you provide a forecast ${"detail ".repeat(200)}?`;
    assert.equal(restateRequest(long).phrase.split(" ").length, 60);
  });
});

describe("withRestatement", () => {
  const q = "Can you provide a 7-day weather forecast for Tokyo, Japan?";

  test("introduces an answer we produced", () => {
    assert.equal(
      withRestatement(q, "A 7-day forecast: 20C to 32C.", true),
      "Here is a 7-day weather forecast for Tokyo, Japan: A 7-day forecast: 20C to 32C.",
    );
  });

  test("does not promise data on an answer we could not produce", () => {
    const out = withRestatement(q, "No forecast data was available.", false);
    assert.ok(out.startsWith("Regarding a 7-day weather forecast"), out);
    assert.ok(!out.includes("Here is"));
  });

  test("never stacks a second restatement", () => {
    const once = withRestatement(q, "A 7-day forecast: 20C to 32C.", true);
    assert.equal(withRestatement(q, once, true), once);
  });

  test("still restates when the answer merely opens with the question's own words", () => {
    // This shipped broken once. `ssl.ts` opens with "The TLS/SSL certificate
    // configuration for <domain> is valid", the question asks for exactly that,
    // and a prefix-only stack guard matched the first 40 characters and dropped
    // the restatement from every SSL answer in production.
    const sslQ =
      "Can you analyze the TLS/SSL certificate configuration for api.github.com to verify its validity?";
    const sslReason = "The TLS/SSL certificate configuration for api.github.com is valid.";
    const out = withRestatement(sslQ, sslReason, true);
    assert.ok(out.startsWith("Here is the TLS/SSL certificate configuration for api.github.com"), out);
    assert.ok(out.endsWith(sslReason), out);
  });

  test("passes the answer through untouched when there is no question", () => {
    const reason = "The TLS/SSL certificate for github.com is valid.";
    assert.equal(withRestatement("github.com", reason, true), reason);
    assert.equal(withRestatement("", reason, true), reason);
  });

  test("passes an empty answer through rather than answering with a restatement", () => {
    assert.equal(withRestatement(q, "", true), "");
  });
});

describe("isAnswered", () => {
  test("an error field or zero confidence means we did not answer", () => {
    assert.equal(isAnswered({ error: "invalid_domain", reason: "x" }), false);
    assert.equal(isAnswered({ confidence: 0, reason: "x" }), false);
    assert.equal(isAnswered({ confidence: 1, reason: "x" }), true);
    assert.equal(isAnswered({ reason: "x" }), true);
  });
});
