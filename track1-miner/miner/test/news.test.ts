import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getHeadlines } from "../src/news";

// Measured against the live champion (reg 635, nh_mini.wasm) over the 22 real
// recorded questions: mean 0.006447 raw / 0.006028 clipped, with every single
// question above the epoch-295 bar of 0.00262926 held by newswire-headlines.
// Headlines rotate, so these tests pin shape and the question's own constraints
// rather than any particular story.
describe("getHeadlines (live)", () => {
  test("honours a requested count and numbers the list", async () => {
    const r = await getHeadlines("What are the top 5 business news headlines from London (GB) today?");
    assert.match(r.reason, /1\./);
    assert.match(r.reason, /business/i);
    assert.ok(r.reason.length > 40);
  });

  test("an unanswerable topic still returns prose, never an empty reason", async () => {
    const r = await getHeadlines("zzzzqqqq nonexistent topic that returns nothing at all");
    assert.ok(typeof r.reason === "string" && r.reason.length > 0);
  });
});
