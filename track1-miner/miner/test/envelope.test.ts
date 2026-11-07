import { test } from "node:test";
import assert from "node:assert/strict";
import { envelope, leadSentence } from "../src/envelope";

test("the lead sentence ends at the first full stop that ends a sentence", () => {
  assert.equal(
    leadSentence("The TLS certificate for github.com is valid. It expires on 2026-11-29."),
    "The TLS certificate for github.com is valid.",
  );
  assert.equal(leadSentence("ETH is 2,412.55 USD. This is a live quote."), "ETH is 2,412.55 USD.");
  assert.equal(
    leadSentence("Revenue rose, e.g. in the U.S. and Europe, by 4.2%. Source: 10-K."),
    "Revenue rose, e.g. in the U.S. and Europe, by 4.2%.",
  );
  assert.equal(leadSentence("Paper by J. Smith (2024) found it. Next."), "Paper by J. Smith (2024) found it.");
  assert.equal(leadSentence("Is it raining? No, it is dry in London."), "Is it raining?");
  assert.equal(leadSentence("Бонжур"), "Бонжур");
  assert.equal(leadSentence('He said "stop." Then left.'), 'He said "stop."');
});

test("a numbered list stays in the sentence that introduced it (audit replay 2026-11-04)", () => {
  assert.equal(
    leadSentence("Here are 2 papers on X: 1) A by B (2026), cited 0 times. 2) C by D (2025), cited 3 times. Source: OpenAlex."),
    "Here are 2 papers on X: 1) A by B (2026), cited 0 times. 2) C by D (2025), cited 3 times.",
  );
  assert.equal(leadSentence("Revenue was 4 USD. 2024 was a weak year."), "Revenue was 4 USD.");
  // "1. 2." numbering, as /headlines writes it: the answer was "… are: 1." (2026-11-07).
  assert.equal(
    leadSentence("The top headlines, as of November 7, 2026, are: 1. Solar at 25 (MyChesCo, 2026-11-07). 2. AI rules (TRT World, 2026-11-07). Source: Google News."),
    "The top headlines, as of November 7, 2026, are: 1. Solar at 25 (MyChesCo, 2026-11-07). 2. AI rules (TRT World, 2026-11-07).",
  );
});

test("the envelope puts answer first, keeps every field and always dates the answer", () => {
  const now = new Date("2026-10-13T19:00:00Z");
  const out = envelope({ verdict: "valid", confidence: 1, reason: "It is valid. More detail.", issuer: "X" }, now) as Record<string, unknown>;
  assert.deepEqual(Object.keys(out), ["answer", "verdict", "confidence", "reason", "issuer", "checked_at"]);
  assert.equal(out.answer, "It is valid.");
  assert.equal(out.checked_at, "2026-10-13T19:00:00.000Z");
  const own = envelope({ reason: "A.", checked_at: "2026-01-01T00:00:00.000Z" }, now) as Record<string, unknown>;
  assert.equal(own.checked_at, "2026-01-01T00:00:00.000Z");
  assert.equal(envelope("plain"), "plain");
  assert.deepEqual(envelope([1]), [1]);
});

test("the lead sentence stays linear on caller text full of initials", () => {
  const hostile = "A. ".repeat(200_000);
  const t = Date.now();
  assert.equal(leadSentence(hostile), hostile.trim());
  assert.ok(Date.now() - t < 500, `took ${Date.now() - t} ms`);
});
