import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/handler";
import { SOURCES } from "../src/sources";

// The production default: every barred source's gate is closed (GAPS G208).
// No openGate here, and each test file runs in its own process.
const BARRED = new Set(SOURCES.filter((s) => s.status === "barred").flatMap((s) => s.hosts));

function get(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

/** Every upstream answers 500, and every URL asked for is recorded. */
function record(t: { after: (fn: () => void) => void }): string[] {
  const urls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => { urls.push(String(url)); return new Response("", { status: 500 }); }) as typeof fetch;
  t.after(() => { globalThis.fetch = original; });
  return urls;
}

const barredCalls = (urls: string[]): string[] => urls.filter((u) => BARRED.has(new URL(u).hostname));

const REFUSED: Array<[string, string]> = [
  ["/ip-geolocate?query=8.8.8.8", "IP geolocation"],
  ["/headlines?query=technology%20news%20today", "headlines"],
  ["/news-search?query=Federal%20Reserve%20rate%20decision%20this%20week", "news search"],
  ["/stock-price?query=What%20is%20Apple%20(AAPL)%20trading%20at%3F", "share price"],
  ["/financial?query=What%20is%20Bitcoin%27s%20market%20cap%3F", "coin market statistics"],
  ["/financial?query=Apple%20(AAPL)%20trading%20volume%20today", "equity trading data"],
];

for (const [url, what] of REFUSED) {
  test(`${what} answers not_licensed and calls no barred source`, async (t) => {
    const urls = record(t);
    const body = await get(url);
    assert.equal(body.error, "not_licensed", `${url}: ${String(body.reason)}`);
    assert.match(String(body.reason), /does not license its data for resale, and this is a paid service/);
    assert.deepEqual(barredCalls(urls), []);
    const lic = body.licensing as { upstreams: Array<{ status: string; called?: boolean }> };
    for (const u of lic.upstreams) if (u.status === "barred") assert.equal(u.called, false, "a barred upstream is listed as not called");
  });
}

test("a reserved IP range is still answered: it needs no provider", async (t) => {
  const urls = record(t);
  const body = await get("/ip-geolocate?query=10.0.0.1");
  assert.notEqual(body.error, "not_licensed");
  assert.equal(urls.length, 0);
});

test("web search never calls Google News and never says news was searched", async (t) => {
  const urls = record(t);
  const body = await get("/web-search?query=What%20is%20the%20latest%20news%20about%20the%20Artemis%20programme%3F");
  assert.deepEqual(barredCalls(urls), []);
  assert.ok(!/found in Google News|Source: Google News/.test(String(body.reason)), String(body.reason));
});

test("token holders resolve through the explorer, never GeckoTerminal", async (t) => {
  const urls = record(t);
  await get("/token-holders?query=How%20many%20addresses%20hold%20USDC%20on%20Base%3F");
  assert.deepEqual(barredCalls(urls), []);
  assert.ok(urls.some((u) => u.includes("base.blockscout.com")), urls.join(", "));
});

test("an event outcome searches Polymarket only, never Manifold", async (t) => {
  const urls = record(t);
  const body = await get("/event-outcome?query=Did%20the%20Fed%20cut%20rates%20at%20its%20September%202025%20meeting%3F");
  assert.deepEqual(barredCalls(urls), []);
  assert.ok(urls.some((u) => u.includes("polymarket.com")), urls.join(", "));
  assert.ok(!/Manifold/.test(String(body.reason)), String(body.reason));
});

test("every endpoint listed as serving nothing refuses, and is reported barred", async (t) => {
  const { SERVES_NOTHING, endpointStatus } = await import("../src/sources");
  const urls = record(t);
  for (const path of SERVES_NOTHING) {
    const body = await get(`${path}?query=${encodeURIComponent("What is the latest on Apple (AAPL) today?")}`);
    assert.equal(body.error, "not_licensed", path);
    assert.equal(endpointStatus(path), "barred", path);
  }
  assert.deepEqual(barredCalls(urls), []);
});
