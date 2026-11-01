/**
 * CVE_LOOKUP's last refusal class: a vulnerability named by product and type.
 *
 * "Will Forgejo fix RCE vulnerability?" and its "patch" variant are the two
 * routed questions left after `cvesurvey.ts` closed the year and severity
 * surveys. Both carry no CVE identifier and both were refused with "No CVE
 * identifier was supplied with this request."
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { keywordRequest, lookupByKeyword } from "../src/cvekeyword";

test("routed refusal: the product and the vulnerability class are both read", () => {
  for (const q of ["Will Forgejo fix RCE vulnerability?", "Will Forgejo patch RCE vulnerability?"]) {
    const r = keywordRequest(q);
    assert.ok(r, `not recognised: ${q}`);
    assert.equal(r.product, "Forgejo");
    assert.equal(r.klass, "remote code execution");
  }
});

/**
 * The guard that keeps a keyword search from inventing an answer. A search
 * always returns something, so both halves must be present before one runs.
 * "Will Apple patch the 'Deathray' vulnerability?" is a routed question about a
 * vulnerability that does not exist; answering it with whatever Apple CVE ranks
 * first would be the confidently-wrong failure.
 */
test("a question without a named vulnerability class never reaches the search", () => {
  assert.equal(keywordRequest("Will Apple patch the 'Deathray' vulnerability?"), null);
  assert.equal(keywordRequest("any critical vulnerabilities?"), null);
  assert.equal(keywordRequest("Is there a bug in Forgejo?"), null);
});

/** A real identifier has its own path and must not be diverted here. */
test("a question carrying a CVE identifier is left to the identifier path", () => {
  assert.equal(keywordRequest("What is CVE-2021-44228?"), null);
  assert.equal(keywordRequest("Is CVE-2021-44228 a remote code execution flaw?"), null);
});

test("other vulnerability classes are recognised", () => {
  assert.equal(keywordRequest("Does WordPress have an SQL injection flaw?")?.klass, "sql injection");
  assert.equal(keywordRequest("Jenkins path traversal vulnerability")?.klass, "path traversal");
  assert.equal(keywordRequest("Is there XSS in Grafana?")?.klass, "cross-site scripting");
});

test("the routed Forgejo question is answered from NVD (live)", async () => {
  const req = keywordRequest("Will Forgejo fix RCE vulnerability?");
  assert.ok(req);
  const r = await lookupByKeyword(req);
  if (r.verdict === "unknown") return; // NVD shedding is not a test failure
  assert.equal(r.verdict, "found");
  assert.match(String(r.cve_id), /^CVE-\d{4}-\d{4,}$/);
  assert.match(r.reason, /Forgejo/);
  // The question is future tense; the answer must report the record, not predict.
  assert.doesNotMatch(r.reason, /\bwill (?:be )?(?:fix|patch)/i);
});

/**
 * A result that does not name the product asked about is not an answer about
 * that product, however highly the search ranked it.
 */
test("a result that does not name the product is not used (live)", async () => {
  const r = await lookupByKeyword({ product: "Zzyzxqqnotaproduct", klass: "remote code execution" });
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "not_found");
  assert.equal(r.cve_id, null);
  // An absence in the database is not a claim that the product is secure.
  assert.match(r.reason, /not the same as the product being free of undisclosed flaws/);
});
