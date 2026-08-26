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
    ["localhost", "a public NAME resolving to loopback"],
    ["10.0.0.1", "RFC1918 10/8"],
    ["192.168.1.1", "RFC1918 192.168/16"],
    ["172.16.0.1", "RFC1918 172.16/12"],
    ["169.254.169.254", "cloud metadata endpoint"],
  ] as const;

  for (const [host, why] of blocked) {
    test(`blocks ${host} — ${why}`, async () => {
      const r = await assertPublicHost(host);
      assert.equal(r.allowed, false);
    });
  }

  test("allows a normal public host", async () => {
    const r = await assertPublicHost("github.com");
    assert.equal(r.allowed, true);
  });

  test("a name that does not resolve is refused, not crashed on", async () => {
    const r = await assertPublicHost("no-such-host-xyz123-telegraph.invalid");
    assert.equal(r.allowed, false);
  });
});
