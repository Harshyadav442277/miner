import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/handler";

function get(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url } as IncomingMessage;
    const res = { writeHead() {}, end(body: string) { resolve(JSON.parse(body)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

function noNetwork(t: { after: (fn: () => void) => void }, route?: (u: string) => Response): void {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    if (route) return route(String(url));
    throw new Error(`no network in this test: ${String(url)}`);
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = original; });
}

test("/sources serves the ledger without any outbound call", async (t) => {
  noNetwork(t);
  const body = await get("/sources");
  const sources = body.sources as Array<{ id: string; status: string; terms: string }>;
  assert.ok(sources.length > 40);
  assert.equal(sources.find((s) => s.id === "yahoo")?.status, "barred");
  const endpoints = body.endpoints as Record<string, { status: string; sources: string[] }>;
  assert.equal(endpoints["/stock-price"]?.status, "barred");
  assert.equal(endpoints["/ssl-check"]?.status, "licensed", "a TLS check reads the target itself, no third-party data");
  assert.ok(Object.keys(body.statuses as object).includes("unread"));
});

test("an answer carries its endpoint's licensing, after the route's own fields", async (t) => {
  const ecb = "<Cube><Cube time='2026-10-23'><Cube currency='USD' rate='1.1600'/></Cube></Cube>";
  noNetwork(t, (u) => (u.includes("ecb.europa.eu") ? new Response(ecb) : new Response("", { status: 500 })));
  const body = await get("/convert?from=USD&to=EUR&amount=100");
  assert.equal(body.verdict, "converted");
  const lic = body.licensing as { endpoint_status: string; upstreams: Array<{ source: string; status: string }>; notices?: string[]; ledger: string };
  assert.equal(lic.ledger, "/sources");
  assert.deepEqual(lic.upstreams.map((u) => u.source).sort(), ["European Central Bank", "Frankfurter"]);
  assert.equal(lic.endpoint_status, "licensed", "the ECB's condition is met by the notice and the computed-rate sentence");
  assert.deepEqual(lic.notices, ["European Central Bank data are available free of charge at https://www.ecb.europa.eu."]);
  assert.match(String(body.reason), /computed from them/);
  assert.equal(Object.keys(body).at(-1), "licensing");
});

test("a CVE answer carries the NVD and MITRE notices their terms ask for", async (t) => {
  noNetwork(t);
  const body = await get("/cve?query=CVE-2021-44228");
  const notices = (body.licensing as { notices?: string[] }).notices ?? [];
  assert.ok(notices.includes("This product uses the NVD API but is not endorsed or certified by the NVD."), notices.join(" | "));
  assert.ok(notices.some((n) => n.startsWith("CVE content is copyright 1999-2026 The MITRE Corporation")), notices.join(" | "));
});

test("an endpoint whose upstreams set no condition carries no notices field", async (t) => {
  noNetwork(t);
  const body = await get("/ssl-check");
  const lic = body.licensing as Record<string, unknown>;
  assert.equal(lic.endpoint_status, "licensed");
  assert.equal("notices" in lic, false);
});
