import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeTarget, checkCertificate } from "../src/ssl";

describe("normalizeTarget", () => {
  test("accepts a bare hostname", () => {
    assert.deepEqual(normalizeTarget("example.com"), { host: "example.com", port: 443 });
  });

  test("strips scheme and path from a full URL", () => {
    assert.deepEqual(normalizeTarget("https://example.com/a/b?c=d"), { host: "example.com", port: 443 });
  });

  test("carries an explicit port through", () => {
    assert.deepEqual(normalizeTarget("example.com:8443"), { host: "example.com", port: 8443 });
  });

  test("takes the port from a URL", () => {
    assert.deepEqual(normalizeTarget("https://example.com:8443/x"), { host: "example.com", port: 8443 });
  });

  test("lowercases", () => {
    assert.deepEqual(normalizeTarget("EXAMPLE.COM"), { host: "example.com", port: 443 });
  });

  test("accepts a bare IPv4", () => {
    assert.deepEqual(normalizeTarget("1.1.1.1"), { host: "1.1.1.1", port: 443 });
  });

  test("accepts subdomains", () => {
    assert.deepEqual(normalizeTarget("a.b.example.com"), { host: "a.b.example.com", port: 443 });
  });

  for (const bad of ["", "   ", "not a domain", "example", "http://", "exa mple.com", "-.com"]) {
    test(`rejects ${JSON.stringify(bad)}`, () => {
      assert.equal(normalizeTarget(bad), null);
    });
  }

  test("rejects an out-of-range port", () => {
    assert.equal(normalizeTarget("example.com:99999"), null);
  });
});

/**
 * Live checks against badssl.com, the canonical TLS test suite. These need
 * network access; they are the tests that actually prove the verdict logic,
 * so they are not mocked.
 */
describe("checkCertificate (live)", { concurrency: 4 }, () => {
  const cases: Array<[string, string]> = [
    ["github.com", "valid"],
    ["expired.badssl.com", "expired"],
    ["self-signed.badssl.com", "self_signed"],
    ["wrong.host.badssl.com", "hostname_mismatch"],
    ["untrusted-root.badssl.com", "untrusted"],
  ];

  for (const [host, expected] of cases) {
    test(`${host} -> ${expected}`, async () => {
      const r = await checkCertificate(host, 443, 12_000);
      assert.equal(r.verdict, expected, `got ${r.verdict}: ${r.reason}`);
      assert.equal(r.domain, host);
      assert.ok(r.reason.length > 0);
      assert.ok(r.checked_at.endsWith("Z"));
    });
  }

  test("a domain that does not resolve is unreachable, not a crash", async () => {
    const r = await checkCertificate("no-such-host-xyz123-telegraph.invalid", 443, 8000);
    assert.equal(r.verdict, "unreachable");
    assert.equal(r.valid, false);
    assert.equal(r.issuer, null);
  });

  test("valid certificates report a positive days_remaining", async () => {
    const r = await checkCertificate("github.com", 443, 12_000);
    assert.ok(r.days_remaining !== null && r.days_remaining > 0, `days_remaining=${r.days_remaining}`);
    // trusted/hostname_match were dropped as separate fields: they duplicated
    // what verdict already says, and the response had to fit Telegraph's prose
    // conversion budget. verdict is the single source of truth.
    assert.equal(r.verdict, "valid");
    assert.equal(r.valid, true);
    assert.match(r.reason, /trusted/i);
    assert.match(r.reason, /Hostname validation passes/i);
  });

  test("expired certificates report a negative days_remaining", async () => {
    const r = await checkCertificate("expired.badssl.com", 443, 12_000);
    assert.ok(r.days_remaining !== null && r.days_remaining < 0, `days_remaining=${r.days_remaining}`);
    assert.equal(r.verdict, "expired");
    assert.equal(r.valid, false);
  });
});

describe("conversion budget", () => {
  // Telegraph converts a miner's JSON to prose before scoring it, and that
  // conversion produced NOTHING when our response reached 862 bytes in epoch 285
  // — every miner whose conversion succeeded was under ~430. This pins the
  // response small so the sentence that actually gets scored reaches the scorer.
  test("a reachable answer stays within the conversion budget", async () => {
    const r = await checkCertificate("github.com", 443, 12_000);
    assert.ok(JSON.stringify(r).length < 650, `${JSON.stringify(r).length} bytes`);
  });

  test("an unreachable answer stays within the conversion budget", async () => {
    const r = await checkCertificate("no-such-host-xyz123-telegraph.invalid", 443, 8_000);
    assert.ok(JSON.stringify(r).length < 650, `${JSON.stringify(r).length} bytes`);
  });
});
