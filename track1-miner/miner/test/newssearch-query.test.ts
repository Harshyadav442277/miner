import { test } from "node:test";
import assert from "node:assert/strict";
import { extractSubject } from "../src/newssearch";
import { openGate } from "./licence-fixtures";

openGate("google-news");

// Routed NEWS_SEARCH questions, 2026-11-25.
test("a question's opening auxiliary is not part of its subject", () => {
  assert.equal(extractSubject("Will Piramal Critical launch Mitigo?"), "Piramal Critical launch Mitigo");
  assert.equal(extractSubject("Will Check Point disclose major breach?"), "Check Point disclose major breach");
  // Not a question: the name stays whole.
  assert.equal(extractSubject("Will Smith new film"), "Will Smith film");
});
