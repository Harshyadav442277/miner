import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { assertPublicHost } from "../src/guard";

/**
 * /ssl-check opens a TCP connection to a hostname supplied by an untrusted
 * caller. Without this guard the miner is an SSRF primitive — a way to probe
 * private ranges and cloud metadata from our infrastructure.
 */
describe("assertPublicHost", () => {
  const blocked = [
    ["127.0.0.1", "loopback literal"],
    ["10.0.0.1", "RFC1918 10/8"],
    ["192.168.1.1", "RFC1918 192.168/16"],
    ["172.16.0.1", "RFC1918 172.16/12"],
    ["169.254.169.254", "cloud metadata endpoint"],
    ["::1", "IPv6 loopback"],
    ["::ffff:7f00:1", "hexadecimal IPv4-mapped loopback"],
    ["::ffff:10.0.0.1", "dotted IPv4-mapped private address"],
    ["fc00::1", "IPv6 unique-local address"],
    ["fe80::1", "IPv6 link-local address"],
  ] as const;

  for (const [host, why] of blocked) {
    test(`blocks ${host} — ${why}`, async () => {
      const r = await assertPublicHost(host);
      assert.equal(r.allowed, false);
    });
  }

  test("blocks a name resolving to loopback (live)", async () => {
    const r = await assertPublicHost("localhost");
    assert.equal(r.allowed, false);
  });

  test("allows a normal public host (live)", async () => {
    const r = await assertPublicHost("github.com");
    assert.equal(r.allowed, true);
  });

  test("a name that does not resolve is refused, not crashed on (live)", async () => {
    const r = await assertPublicHost("no-such-host-xyz123-telegraph.invalid");
    assert.equal(r.allowed, false);
  });
});
