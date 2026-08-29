import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { extractCveId, lookupCve } from "../src/cve";

describe("extractCveId", () => {
  test("reads a CVE id from a question", () => {
    assert.equal(extractCveId("severity and affected versions for CVE-2021-44228?"), "CVE-2021-44228");
  });
  test("tolerates spacing variants", () => {
    assert.equal(extractCveId("cve 2026 34612"), "CVE-2026-34612");
  });
  test("returns null when none is present", () => {
    assert.equal(extractCveId("what is the weather"), null);
  });
});

describe("lookupCve (live)", () => {
  test("answers Log4Shell with score, severity and KEV status", async () => {
    const r = await lookupCve("What is the CVSS score for CVE-2021-44228?");
    assert.equal(r.cve_id, "CVE-2021-44228");
    assert.equal(r.cvss_score, 10);
    assert.equal(r.known_exploited, true);
    assert.match(r.reason, /10/);
    assert.match(r.reason, /[Cc]ritical/);
  });
});
