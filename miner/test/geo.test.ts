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

  test("the answer sentence names the address and the place, and stops", async () => {
    const r = await geolocate("8.8.8.8");
    assert.match(r.reason, /^The IP address 8\.8\.8\.8 is located in .+\.$/);
    // Network context belongs in fields, not in the scored prose.
    assert.doesNotMatch(r.reason, /\bAS\d+/);
  });

  test("unparseable input degrades to a shaped answer, not a crash", async () => {
    const r = await geolocate("not an ip");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.confidence, 0);
    assert.ok(r.reason.length > 0);
  });
});
