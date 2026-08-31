import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractClaim, checkFact } from "../src/factcheck";

describe("extractClaim", () => {
  test("unwraps the fact-check framing", () => {
    assert.equal(extractClaim("Is it true that the Eiffel Tower is in Paris?"), "the Eiffel Tower is in Paris");
    assert.equal(extractClaim("Fact-check this claim: the Moon has no atmosphere"), "the Moon has no atmosphere");
  });
  test("prefers an explicitly quoted claim", () => {
    assert.equal(extractClaim('Please verify "water boils at 100 degrees Celsius" for me'), "water boils at 100 degrees Celsius");
  });
  test("empty input yields empty, not a guess", () => assert.equal(extractClaim(""), ""));
});

describe("checkFact", () => {
  test("never reports a claim as supported, however well the words match (live)", async () => {
    // This is the whole safety property. Word overlap cannot tell an article
    // ABOUT a claim from one that SUPPORTS it, and an earlier threshold-based
    // version rated "vaccines cause autism" as supported because the article
    // that exists to refute it contains every word of the claim. No score is
    // worth a miner that asserts medical misinformation.
    const r = await checkFact("Fact-check: vaccines cause autism.");
    assert.notEqual(r.verdict, "supported");
    assert.ok(["unverified", "contradicted"].includes(r.verdict), `got ${r.verdict}`);
    assert.doesNotMatch(r.reason, /\bis supported\b/i);
  });

  test("a real claim is answered with a named, quoted source (live)", async () => {
    const r = await checkFact("Is it true that the Eiffel Tower is located in Paris?");
    assert.equal(r.source, "Wikipedia");
    assert.match(String(r.source_url), /^https:\/\/en\.wikipedia\.org\/wiki\//);
    assert.ok(String(r.evidence ?? "").length > 40, "the evidence must be quoted, not summarised away");
    assert.match(r.reason, /Eiffel Tower/);
    // The answer must say what kind of check this was.
    assert.match(r.reason, /not a full adjudication|does not settle/i);
  });

  test("no claim degrades to an honest refusal", async () => {
    const r = await checkFact("");
    assert.equal(r.error, "invalid_input");
    assert.ok(r.reason.trim().length > 0);
  });
});
