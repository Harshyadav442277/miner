/**
 * URL_SCAN request shapes — a URL that arrived percent-encoded, and the
 * parameter names the request-builder writes for it.
 *
 * Verified against https://miner-wine.vercel.app on 2026-09-19:
 *
 *   url=https%3A%2F%2Fexample.com  -> "The safety of https://2fexample.com/ could not be judged"
 *   website= / target= / target_url= -> "No URL was supplied with this request"
 *
 * The first is the worse one. The value had no literal `://`, so the scheme
 * pattern missed and the bare-host pattern matched `2Fexample.com` out of
 * `%2Fexample.com` — a verdict about a host nobody asked about. That the node
 * does send oddly encoded URLs is visible in every epoch of this intent's
 * scores: eleven `urlscan-*` miners are answered `400 Expected "\\" but "/"
 * found` by their upstream, epoch after epoch.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractUrl } from "../src/urlscan";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";

test("a percent-encoded scheme is decoded rather than read as a host", () => {
  assert.equal(extractUrl("https%3A%2F%2Fexample.com")?.href, "https://example.com/");
  assert.equal(extractUrl("https%3A%2F%2Fexample.com%2Foffer")?.href, "https://example.com/offer");
  assert.equal(extractUrl("http%3A%2F%2Famaz0n-login.ru")?.href, "http://amaz0n-login.ru/");
  // Encoded twice, which is what an already-encoded URL becomes on the way in.
  assert.equal(extractUrl("https%253A%252F%252Fexample.com")?.href, "https://example.com/");
});

test("a plain URL is untouched, including one with escapes in its path", () => {
  assert.equal(extractUrl("https://example.com")?.href, "https://example.com/");
  assert.equal(extractUrl("https://example.com/a%20b")?.href, "https://example.com/a%20b");
  assert.equal(extractUrl("Is https://arxiv.org/abs/2609.10365 safe to visit?")?.href,
    "https://arxiv.org/abs/2609.10365");
  assert.equal(extractUrl("example.com")?.href, "https://example.com/");
});

test("nothing that is not a URL becomes one through decoding", () => {
  assert.equal(extractUrl("website safety check"), null);
  assert.equal(extractUrl("is this real"), null);
  assert.equal(extractUrl("100%25 safe?"), null);
});

function request(params: Record<string, string>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url: `/url-scan?${new URLSearchParams(params)}` } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

/**
 * Every outbound read stubbed, and the subject is a PRIVATE `http://` address
 * literal on purpose. An address literal skips the two resolver lookups, plain
 * HTTP skips the TLS handshake, and a private address is refused by the guard
 * before the redirect walk opens a socket — none of those three go through
 * `fetch`, so without all of this a unit test would depend on the live
 * internet. What is under test is which parameter the route read, and the
 * answer names the URL whatever the verdict turns out to be.
 */
function stub(): typeof fetch {
  return (async (url: string | URL | Request) => {
    if (String(url).includes("urlhaus")) return new Response(JSON.stringify({ query_status: "no_results" }));
    return new Response("", { status: 404 });
  }) as typeof fetch;
}

async function withStub(run: () => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = stub();
  try { await run(); } finally { globalThis.fetch = original; }
}

test("every parameter name the builder writes for a URL reaches the scanner", async () => {
  await withStub(async () => {
    for (const name of ["url", "link", "domain", "host", "website", "target", "target_url", "site", "page"]) {
      const body = await request({ [name]: "http://10.0.0.1/probe" });
      assert.notEqual(body.error, "no_url", `${name}= was not read`);
      assert.match(String(body.reason), /10\.0\.0\.1\/probe/, `${name}= lost the host`);
    }
  });
});

test("a placeholder URL falls back to the question rather than being scanned", async () => {
  await withStub(async () => {
    const body = await request({ url: "unknown", query: "Is http://10.0.0.1/probe safe to visit?" });
    assert.notEqual(body.error, "no_url");
    assert.match(String(body.reason), /10\.0\.0\.1\/probe/);
    assert.doesNotMatch(String(body.reason), /unknown/);
  });
});

test("no URL anywhere is still refused rather than invented", async () => {
  await withStub(async () => {
    const body = await request({ query: "website safety check" });
    assert.equal(body.error, "no_url");
  });
});
