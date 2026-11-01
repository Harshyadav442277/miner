import { test } from "node:test";
import assert from "node:assert/strict";
import { extractWrittenStart, resolveDateRequest } from "../src/extract";

test("a written date is read even when another word-number pair comes first (2026-10-21)", () => {
  const now = new Date("2026-10-21T08:00:00Z");
  assert.equal(extractWrittenStart("Will Dubai exceed 40°C on September 13?", now), "2026-09-13T00:00:00.000Z");
  assert.equal(extractWrittenStart("Will Riyadh hit 45 degrees on 2 November?", now), "2026-11-02T00:00:00.000Z");
});

test("this weekend is Saturday and Sunday, not the next 24 hours (2026-10-21)", () => {
  const r = resolveDateRequest("Should someone in Cape Town plan around rain this weekend or not?");
  assert.ok(r);
  const start = new Date(r.startIso);
  const today = new Date().getUTCDay();
  if (today !== 0 && today !== 6) {
    assert.equal(start.getUTCDay(), 6);
    assert.equal(r.hours, 48);
  } else {
    assert.ok(r.hours! <= 48);
  }
});
