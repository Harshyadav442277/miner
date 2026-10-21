import { test } from "node:test";
import assert from "node:assert/strict";
import { geolocate } from "../src/geo";

test("an anycast address is not answered as one city (2026-10-21)", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    // What ip-api and ipinfo answered for 8.8.8.8 on 2026-10-21.
    if (u.includes("ip-api.com")) return Response.json({ status: "success", city: "Ashburn", regionName: "Virginia", country: "United States",
      countryCode: "US", lat: 39.03, lon: -77.5, timezone: "America/New_York", isp: "Google LLC", org: "Google Public DNS", as: "AS15169 Google LLC" });
    if (u.includes("ipinfo.io")) return Response.json({ ip: "8.8.8.8", city: "Mountain View", country: "US", org: "AS15169 Google LLC", anycast: true });
    return new Response("", { status: 404 });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const r = await geolocate("Where is 8.8.8.8 located, and which network owns it?");
  assert.equal(r.verdict, "anycast");
  assert.equal(r.anycast, true);
  assert.match(r.reason, /^The IP address 8\.8\.8\.8 is an anycast address operated by Google LLC \(AS15169\)/);
  assert.match(r.reason, /no single physical location/);
});
