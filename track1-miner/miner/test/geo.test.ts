import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractIp, geolocate } from "../src/geo";

describe("extractIp", () => {
  test("reads a bare IPv4", () => assert.equal(extractIp("8.8.8.8"), "8.8.8.8"));

  test("reads an IPv4 out of a question", () =>
    assert.equal(extractIp("Where is 1.1.1.1 located?"), "1.1.1.1"));

  test("reads a compressed IPv6", () =>
    assert.equal(extractIp("2606:4700:4700::1111"), "2606:4700:4700::1111"));

  test("rejects an octet above 255", () => assert.equal(extractIp("999.1.1.1"), null));

  test("returns null when there is no address", () => assert.equal(extractIp("not an ip"), null));
});

describe("geolocate (live)", () => {
  test("locates a well-known address", async () => {
    const r = await geolocate("8.8.8.8");
    assert.equal(r.country, "United States");
    assert.ok(r.latitude !== null && r.longitude !== null);
    assert.ok(r.confidence > 0);
  });

  // This test previously asserted the opposite — that network context stayed out
  // of the prose — on the theory that terser answers score better. Measuring
  // against the live champion disproved that, and real questions ask for
  // "country, city, and ISP information", so the operator belongs in the answer.
  test("the answer names the place and the network operator", async () => {
    const r = await geolocate("8.8.8.8");
    assert.match(r.reason, /^The IP address 8\.8\.8\.8 is located in /);
    assert.match(r.reason, /operated by /i);
  });

  test("coordinates stay in fields — nobody asked for them in prose", async () => {
    const r = await geolocate("8.8.8.8");
    assert.ok(r.latitude !== null);
    assert.doesNotMatch(r.reason, /-?\d+\.\d{3,}/);
  });

  test("unparseable input degrades to a shaped answer, not a crash", async () => {
    const r = await geolocate("not an ip");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.confidence, 0);
    assert.ok(r.reason.length > 0);
  });
});
