import { test } from "node:test";
import assert from "node:assert/strict";
import { urlhausLists } from "../src/urlscan-net";

test("concurrent scans share downloads, retry after an outage, and reuse successful feeds", async () => {
  const original = globalThis.fetch;
  let reads = 0;
  let failing = true;
  globalThis.fetch = (async (input: string | URL | Request) => {
    reads++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (failing) return new Response("outage", { status: 503 });
    return new Response(String(input).includes("hostfile")
      ? "127.0.0.1 bad.example\n"
      : "https://bad.example/malware\n");
  }) as typeof fetch;
  try {
    const failures = await Promise.all(Array.from({ length: 12 }, () => urlhausLists()));
    assert.ok(failures.every((result) => result === "unavailable"));
    assert.equal(reads, 2, "one pair of feeds for all waiting scans");
    failing = false;
    // Let both reads from the failed batch settle before beginning recovery.
    await new Promise((resolve) => setTimeout(resolve, 15));
    const recovered = await Promise.all(Array.from({ length: 12 }, () => urlhausLists()));
    assert.equal(reads, 4, "a failed batch must not prevent the next read");
    for (const result of recovered) {
      assert.notEqual(result, "unavailable");
      if (result !== "unavailable") {
        assert.ok(result.hosts.has("bad.example"));
        assert.ok(result.urls.has("https://bad.example/malware"));
      }
    }
    assert.equal(await urlhausLists(), recovered[0]);
    assert.equal(reads, 4, "completed feeds are reused without another download");
  } finally {
    globalThis.fetch = original;
  }
});
