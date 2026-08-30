import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractIp, geolocate, specialRange, torExitNode } from "../src/geo";

describe("extractIp", () => {
  test("reads a bare IPv4", () => assert.equal(extractIp("8.8.8.8"), "8.8.8.8"));

  test("reads an IPv4 out of a question", () =>
    assert.equal(extractIp("Where is 1.1.1.1 located?"), "1.1.1.1"));

  test("reads a compressed IPv6", () =>
    assert.equal(extractIp("2606:4700:4700::1111"), "2606:4700:4700::1111"));

  test("rejects an octet above 255", () => assert.equal(extractIp("999.1.1.1"), null));

  test("returns null when there is no address", () => assert.equal(extractIp("not an ip"), null));
});

describe("specialRange", () => {
  test("classifies RFC 1918 private ranges", () => {
    for (const ip of ["192.168.1.10", "10.0.0.5", "172.16.0.1", "172.31.255.255"]) {
      const r = specialRange(ip);
      assert.equal(r?.verdict, "private", ip);
      assert.match(r!.reason, /RFC 1918/);
      assert.match(r!.reason, /Geographic location: none/);
      assert.match(r!.reason, /Abuse history: none/);
    }
  });

  test("classifies the TEST-NET documentation ranges by name", () => {
    const r1 = specialRange("192.0.2.1");
    assert.equal(r1?.verdict, "reserved");
    assert.match(r1!.reason, /TEST-NET-1 range \(192\.0\.2\.0\/24\)/);
    assert.match(r1!.reason, /documentation and examples/);
    assert.match(specialRange("198.51.100.7")!.reason, /TEST-NET-2/);
    assert.match(specialRange("203.0.113.9")!.reason, /TEST-NET-3/);
  });

  test("classifies loopback, link-local, CGNAT, multicast and reserved", () => {
    assert.equal(specialRange("127.0.0.1")?.verdict, "loopback");
    assert.equal(specialRange("169.254.10.10")?.verdict, "link_local");
    assert.equal(specialRange("100.64.0.1")?.verdict, "shared");
    assert.equal(specialRange("224.0.0.1")?.verdict, "multicast");
    assert.equal(specialRange("240.0.0.1")?.verdict, "reserved");
    assert.equal(specialRange("255.255.255.255")?.verdict, "broadcast");
    assert.equal(specialRange("0.1.2.3")?.verdict, "reserved");
    assert.equal(specialRange("198.18.0.1")?.verdict, "reserved");
  });

  test("classifies IPv6 special ranges", () => {
    assert.equal(specialRange("::1")?.verdict, "loopback");
    assert.equal(specialRange("fe80::1")?.verdict, "link_local");
    assert.equal(specialRange("fd12:3456::1")?.verdict, "private");
    assert.equal(specialRange("2001:db8::1")?.verdict, "reserved");
  });

  test("returns null for public addresses, including range-boundary neighbours", () => {
    for (const ip of ["8.8.8.8", "192.169.0.1", "172.32.0.1", "100.128.0.1", "198.20.0.1", "208.67.222.222", "2606:4700:4700::1111"]) {
      assert.equal(specialRange(ip), null, ip);
    }
  });
});

describe("geolocate on special ranges (offline)", () => {
  test("a private address is answered definitionally, not as a lookup failure", async () => {
    const r = await geolocate("192.168.1.10");
    assert.equal(r.verdict, "private");
    assert.equal(r.confidence, 1);
    assert.match(r.reason, /private internal network address/);
    assert.match(r.reason, /Geographic location: none/);
    assert.match(r.reason, /abuse/i);
    assert.doesNotMatch(r.reason, /could not be determined/);
  });

  test("a TEST-NET address names its range", async () => {
    const r = await geolocate("Can you check the abuse history and geographic location for IP address 192.0.2.1?");
    assert.equal(r.verdict, "reserved");
    assert.match(r.reason, /TEST-NET-1/);
  });
});

describe("torExitNode", () => {
  test("is null for IPv6, where DNSEL has no answers", async () => {
    assert.equal(await torExitNode("2606:4700:4700::1111"), null);
  });

  test("an unresolvable lookup maps to false, a timeout to null (live)", async () => {
    // 192.0.2.x never appears on the exit list; DNSEL answers NXDOMAIN.
    assert.equal(await torExitNode("192.0.2.55"), false);
    // A 1ms budget cannot complete: the check must fail open, claiming nothing.
    assert.equal(await torExitNode("8.8.8.8", 1), null);
  });
});

describe("geolocate (live)", () => {
  test("locates a well-known address", async () => {
    const r = await geolocate("8.8.8.8");
    assert.equal(r.country, "United States");
    assert.ok(r.latitude !== null && r.longitude !== null);
    assert.ok(r.confidence > 0);
  });

  // Reference answers open with the operator ("associated with Google LLC"),
  // and real questions ask for "country, city, and ISP information" — so the
  // operator leads and the place follows in the same sentence.
  test("the answer names the operator, the place, and the abuse clause", async () => {
    const r = await geolocate("8.8.8.8");
    assert.match(r.reason, /^The IP address 8\.8\.8\.8 is associated with /);
    assert.match(r.reason, /is located in /);
    assert.match(r.reason, /Regarding abuse history, /);
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
