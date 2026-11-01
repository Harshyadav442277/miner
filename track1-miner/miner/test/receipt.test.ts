import { test } from "node:test";
import assert from "node:assert/strict";
import { currentReceipt, noteRead, readsSoFar, recording, redact, replayFromCache, withReceipt } from "../src/receipt";
import { envelope } from "../src/envelope";

test("a credential-like query value and userinfo never reach a receipt", () => {
  assert.equal(redact("https://api.openalex.org/works?search=x&api_key=secret123&mailto=me%40x.com"),
    "https://api.openalex.org/works?search=x&api_key=REDACTED&mailto=REDACTED");
  assert.equal(redact("https://user:pass@example.com/a?token=t&q=1"), "https://example.com/a?token=REDACTED&q=1");
  assert.equal(redact("not a url"), "unparseable URL");
});

test("every fetch made while answering is recorded with its status, and only inside a context", async () => {
  const stub = (async (input: string | URL | Request) =>
    String(input).includes("down") ? Promise.reject(new Error("ECONNRESET")) : new Response("{}", { status: 200 })) as typeof fetch;
  const f = recording(stub);
  await f("https://outside.example/");
  const reads = await withReceipt(async () => {
    await f("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
    await f("https://down.example/x", { method: "post" }).catch(() => null);
    noteRead({ url: "tls://github.com:443", method: "TLS", status: null, result: "valid", started_at: "2026-10-26T00:00:00.000Z", ms: 5 });
    return readsSoFar();
  });
  assert.deepEqual(reads.map((r) => [r.url, r.method, r.status]), [
    ["https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", "GET", 200],
    ["https://down.example/x", "POST", null],
    ["tls://github.com:443", "TLS", null],
  ]);
  assert.ok(reads.every((r) => r.ms >= 0 && /^\d{4}-/.test(r.started_at)));
});

test("a receipt names the deployment, says when it came from the cache, and explains an empty read list", () => {
  withReceipt(() => {
    const empty = currentReceipt(new Date("2026-10-26T01:02:03Z"));
    assert.equal(empty.answered_at, "2026-10-26T01:02:03.000Z");
    assert.equal(empty.from_cache, false);
    assert.deepEqual(empty.upstream, []);
    assert.match(empty.note ?? "", /No upstream request was made/);
    assert.match(empty.id, /^[0-9a-f-]{36}$/);
    replayFromCache([{ url: "https://api.gleif.org/api/v1/lei-records", method: "GET", status: 200, started_at: "x", ms: 1 }]);
    const cached = currentReceipt();
    assert.equal(cached.from_cache, true);
    assert.equal(cached.upstream.length, 1);
    assert.equal(cached.note, undefined);
  });
});

test("the envelope puts the receipt last and leaves the route's fields alone", () => {
  const body = { verdict: "valid", reason: "It is valid. More.", confidence: 1 };
  const out = withReceipt(() => envelope(body, new Date("2026-10-26T00:00:00Z"), currentReceipt())) as Record<string, unknown>;
  assert.deepEqual(Object.keys(out), ["answer", "verdict", "reason", "confidence", "checked_at", "receipt"]);
  assert.equal(out.answer, "It is valid.");
  assert.deepEqual(Object.keys(envelope(body) as object), ["answer", "verdict", "reason", "confidence", "checked_at"]);
});
