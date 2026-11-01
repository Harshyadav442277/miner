import { test } from "node:test";
import assert from "node:assert/strict";
import { affectedVersions, cveId, lookupCve, malformedCveId, pickSeverity } from "../src/cve";

test("cveId reads an identifier from prose and normalises case", () => {
  assert.equal(cveId("what about cve-2024-3094?"), "CVE-2024-3094");
  assert.equal(cveId("CVE-2021-44228"), "CVE-2021-44228");
  // Sequence numbers are not fixed-width; five and seven digits are both real.
  assert.equal(cveId("CVE-2023-1234567"), "CVE-2023-1234567");
  assert.equal(cveId("no identifier here"), null);
});

test("malformedCveId separates a truncated identifier from none at all", () => {
  assert.equal(malformedCveId("tell me about CVE-2024"), "CVE-2024");
  assert.equal(malformedCveId("CVE-2024-3094"), null);
  assert.equal(malformedCveId("what is a buffer overflow?"), null);
});

test("pickSeverity prefers the newest CVSS version, then the primary source", () => {
  const picked = pickSeverity({
    cvssMetricV2: [{ type: "Primary", source: "nvd@nist.gov", cvssData: { baseScore: 9.3, baseSeverity: "HIGH", version: "2.0" } }],
    cvssMetricV31: [
      { type: "Secondary", source: "cna@example.com", cvssData: { baseScore: 8.1, baseSeverity: "HIGH", version: "3.1" } },
      { type: "Primary", source: "nvd@nist.gov", cvssData: { baseScore: 10, baseSeverity: "CRITICAL", version: "3.1" } },
    ],
  });
  // v3.1 beats v2.0 even though the v2 entry is Primary and comes first.
  assert.deepEqual(picked, { score: 10, severity: "CRITICAL", version: "3.1", source: "NVD", primary: true });
});

test("pickSeverity returns null rather than inventing a score", () => {
  assert.equal(pickSeverity(undefined), null);
  assert.equal(pickSeverity({}), null);
  // An entry with a vector but no base score is not a severity.
  assert.equal(pickSeverity({ cvssMetricV31: [{ type: "Primary", cvssData: { version: "3.1" } }] }), null);
});

test("affectedVersions renders exact versions", () => {
  const cfg = [{ nodes: [{ cpeMatch: [
    { vulnerable: true, criteria: "cpe:2.3:a:tukaani:xz:5.6.0:*:*:*:*:*:*:*" },
    { vulnerable: true, criteria: "cpe:2.3:a:tukaani:xz:5.6.1:*:*:*:*:*:*:*" },
  ] }] }];
  const r = affectedVersions(cfg, "Malicious code was discovered in the upstream tarballs of xz.");
  assert.equal(r.product, "tukaani xz");
  assert.equal(r.versions, "5.6.0 and 5.6.1");
  assert.equal(r.otherProducts, 0);
});

test("affectedVersions renders half-open ranges with their bound sense", () => {
  const cfg = [{ nodes: [{ cpeMatch: [
    { vulnerable: true, criteria: "cpe:2.3:a:apache:log4j:*:*:*:*:*:*:*:*", versionStartIncluding: "2.0.1", versionEndExcluding: "2.3.1" },
    { vulnerable: true, criteria: "cpe:2.3:a:apache:log4j:*:*:*:*:*:*:*:*", versionStartExcluding: "2.4.0", versionEndIncluding: "2.12.2" },
  ] }] }];
  const r = affectedVersions(cfg, "Apache Log4j2 JNDI features do not protect against attacker controlled LDAP.");
  assert.equal(r.product, "apache log4j");
  assert.match(r.versions, /from 2\.0\.1 up to but not including 2\.3\.1/);
  assert.match(r.versions, /after 2\.4\.0 up to and including 2\.12\.2/);
});

test("affectedVersions picks the product the description names, not the commonest", () => {
  // Six Siemens entries against one Apache entry: the record is about Log4j,
  // and naming a bundling appliance instead would be true but not an answer.
  const cpeMatch = [
    { vulnerable: true, criteria: "cpe:2.3:a:apache:log4j:2.14.1:*:*:*:*:*:*:*" },
    ...Array.from({ length: 6 }, (_, i) => ({
      vulnerable: true, criteria: `cpe:2.3:o:siemens:appliance_${i}_firmware:*:*:*:*:*:*:*:*`, versionEndExcluding: "2.7.0",
    })),
  ];
  const r = affectedVersions([{ nodes: [{ cpeMatch }] }], "Apache Log4j2 JNDI features are vulnerable.");
  assert.equal(r.product, "apache log4j");
  assert.equal(r.otherProducts, 6);
});

test("affectedVersions reports nothing rather than guessing when there is no configuration", () => {
  assert.deepEqual(affectedVersions(undefined, "some description"), { product: null, versions: "", otherProducts: 0 });
  assert.deepEqual(affectedVersions([], ""), { product: null, versions: "", otherProducts: 0 });
});

test("a real record carries severity, score and affected versions (live)", async () => {
  const r = await lookupCve("CVE-2024-3094");
  if (r.error) return; // NVD rate-limited or down; the honest branch, not a failure.
  assert.equal(r.verdict, "critical");
  // The canonical tokens the scorer was measured to need.
  assert.match(r.reason, /CRITICAL/);
  assert.match(r.reason, /CVSS 3\.1 base score of 10\.0/);
  if (r.reason.includes("Source: CVE Program record")) {
    // An NVD outage now yields the assigning CNA's independently attributed
    // record. Do not demand NVD attribution for data obtained from that source.
    assert.match(r.reason, /Affected: xz 5\.6\.0, 5\.6\.1\./);
    assert.match(r.reason, /Source: CVE Program record from redhat\./);
  } else {
    assert.match(r.reason, /5\.6\.0 and 5\.6\.1/);
    assert.match(r.reason, /assigned by NVD/);
  }
  // The measured trims: neither tail may come back without re-measuring.
  assert.ok(!/CWE-/.test(r.reason), "CWE tail costs a ground-truth register");
  assert.ok(!/Published \d{4}-/.test(r.reason), "publication-date tail costs a ground-truth register");
});

test("an unpublished identifier is not_found, with no invented severity (live)", async () => {
  const r = await lookupCve("CVE-2099-99999");
  if (r.error) return;
  assert.equal(r.verdict, "not_found");
  assert.ok(!/CRITICAL|HIGH|MEDIUM|LOW/.test(r.reason), "a missing record must not be given a severity");
  assert.ok(!/base score of \d/.test(r.reason), "a missing record must not be given a CVSS score");
});
