import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getWeatherJson, getWeatherJsonWithExpiry, geocode, reverseGeocode, resetGeocodeCache } from "../src/weather-upstream";

/** A fetch stand-in that replays a scripted sequence and records the calls. */
function scripted(responses: Array<Response | Error>) {
  const calls: string[] = [];
  const impl = (async (url: string | URL) => {
    calls.push(String(url));
    const next = responses.shift();
    if (!next) throw new Error("no scripted response left");
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof fetch;
  return { impl, calls };
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("getWeatherJson", () => {
  test("returns the body without retrying when the upstream is healthy", async () => {
    const { impl, calls } = scripted([json({ current: { temperature_2m: 30 } })]);
    const body = await getWeatherJson("https://example.test/f", 500, impl);
    assert.deepEqual(body, { current: { temperature_2m: 30 } });
    assert.equal(calls.length, 1, "a healthy upstream must not be called twice");
  });

  test("retries once on a 5xx and returns the second answer", async () => {
    const { impl, calls } = scripted([json({}, 503), json({ hourly: { time: ["2026-09-13T07:00"] } })]);
    const body = await getWeatherJson("https://example.test/f", 500, impl);
    assert.deepEqual(body, { hourly: { time: ["2026-09-13T07:00"] } });
    assert.equal(calls.length, 2);
  });

  test("retries once on a network error", async () => {
    const { impl, calls } = scripted([new Error("socket hang up"), json({ ok: true })]);
    assert.deepEqual(await getWeatherJson("https://example.test/f", 500, impl), { ok: true });
    assert.equal(calls.length, 2);
  });

  test("retries a 429, which is transient however it looks", async () => {
    const { impl, calls } = scripted([json({}, 429), json({ ok: true })]);
    assert.deepEqual(await getWeatherJson("https://example.test/f", 500, impl), { ok: true });
    assert.equal(calls.length, 2);
  });

  test("does not retry a 4xx, which will fail identically", async () => {
    // Spending the caller's timeout budget on a request we know is malformed
    // takes time away from the answer without any chance of changing it.
    const { impl, calls } = scripted([json({}, 400), json({ ok: true })]);
    await assert.rejects(() => getWeatherJson("https://example.test/f", 500, impl), /upstream 400/);
    assert.equal(calls.length, 1);
  });

  test("throws when both attempts fail", async () => {
    const { impl, calls } = scripted([json({}, 502), json({}, 502)]);
    await assert.rejects(() => getWeatherJson("https://example.test/f", 500, impl), /upstream 502/);
    assert.equal(calls.length, 2);
  });
});

describe("geocode", () => {
  beforeEach(() => resetGeocodeCache());
  const nominatim = [
    { lat: "13.0836939", lon: "80.2701860", display_name: "Chennai Corporation, Chennai, Tamil Nadu, India" },
  ];

  test("resolves a place name to coordinates and a readable name", async () => {
    const { impl, calls } = scripted([json(nominatim)]);
    const hit = await geocode("Chennai", 500, impl);
    assert.ok(hit);
    assert.equal(hit.latitude, 13.0836939);
    assert.equal(hit.longitude, 80.270186);
    assert.equal(hit.name, "Chennai Corporation, Tamil Nadu, India");
    assert.match(calls[0] ?? "", /nominatim\.openstreetmap\.org/);
  });

  test("returns null rather than throwing when Nominatim is down", async () => {
    // The caller already has a primary failure to report; a second upstream
    // name in that refusal tells the buyer nothing they can act on.
    const { impl } = scripted([json({}, 503), json({}, 503)]);
    assert.equal(await geocode("Chennai", 500, impl), null);
  });

  test("returns null on an empty result set", async () => {
    const { impl } = scripted([json([])]);
    assert.equal(await geocode("nowhere at all", 500, impl), null);
  });

  test("refuses coordinates that are not on the globe", async () => {
    const { impl } = scripted([json([{ lat: "999", lon: "0", display_name: "Somewhere" }])]);
    assert.equal(await geocode("Somewhere", 500, impl), null);
  });

  test("keeps a short display name whole", async () => {
    const { impl } = scripted([json([{ lat: "1", lon: "2", display_name: "Tokyo, Japan" }])]);
    assert.equal((await geocode("Tokyo", 500, impl))?.name, "Tokyo, Japan");
  });

  test("a postcode component is not part of the name", async () => {
    for (const [display, want] of [
      ["Lagos, Lagos Island, Lagos State, 100242, Nigeria", "Lagos, Lagos State, Nigeria"],
      ["London, Greater London, England, SW1A 2AA, United Kingdom", "London, England, United Kingdom"],
      ["Paris, Île-de-France, France métropolitaine, 75001, France", "Paris, France métropolitaine, France"],
    ]) {
      resetGeocodeCache(); // each case is a fresh lookup, not a test of the one-per-second spacing
      const { impl } = scripted([json([{ lat: "6.45", lon: "3.39", display_name: display }])]);
      assert.equal((await geocode(String(display), 500, impl))?.name, want);
    }
  });
});

describe("Nominatim politeness and reverse lookup", () => {
  beforeEach(() => resetGeocodeCache());

  test("a place already resolved is answered from the cache, not asked again", async () => {
    // The usage policy asks callers to cache; a repeated question must not cost another request.
    const { impl, calls } = scripted([json([{ lat: "1", lon: "2", display_name: "Tokyo, Japan" }])]);
    await geocode("Tokyo", 500, impl);
    assert.equal((await geocode("Tokyo", 500, impl))?.name, "Tokyo, Japan");
    assert.equal(calls.length, 1);
  });

  test("a second lookup within a second waits its turn, and is skipped when it cannot fit its timeout", async () => {
    // Nominatim's usage policy: at most one request per second.
    const { impl, calls } = scripted([json([{ lat: "1", lon: "2", display_name: "A" }]), json([{ lat: "3", lon: "4", display_name: "B" }])]);
    await geocode("A", 500, impl);
    assert.equal(await geocode("B", 500, impl), null, "no slot inside a 500 ms budget");
    assert.equal(calls.length, 1);
    const t0 = Date.now();
    assert.equal((await geocode("B", 3000, impl))?.name, "B");
    const waited = Date.now() - t0;
    assert.ok(waited >= 400 && waited < 1500, `waited ${waited} ms: one slot, not one per skipped lookup`);
  });

  test("names the nearest place to a coordinate pair", async () => {
    const { impl, calls } = scripted([json({ address: { city: "Chennai", state: "Tamil Nadu", country: "India" } })]);
    assert.equal(await reverseGeocode(13.08, 80.27, 500, impl), "Chennai, Tamil Nadu, India");
    assert.match(calls[0] ?? "", /nominatim\.openstreetmap\.org\/reverse\?lat=13\.08&lon=80\.27/);
  });

  test("drops a state that only repeats the city", async () => {
    const { impl } = scripted([json({ address: { city: "New York", state: "New York", country: "United States" } })]);
    assert.equal(await reverseGeocode(40.71, -74, 500, impl), "New York, United States");
  });

  test("an unreachable reverse lookup is null, so the caller keeps the coordinates", async () => {
    const { impl } = scripted([json({}, 503), json({}, 503)]);
    assert.equal(await reverseGeocode(1, 2, 500, impl), null);
  });
});

describe("getWeatherJsonWithExpiry", () => {
  test("reports the upstream's Expires header, which MET Norway's terms say to honour", async () => {
    const expires = "Sun, 18 Oct 2026 08:06:43 GMT";
    const { impl } = scripted([new Response("{}", { status: 200, headers: { expires } })]);
    const r = await getWeatherJsonWithExpiry("https://example.test/f", 500, impl);
    assert.equal(r.expiresMs, Date.parse(expires));
  });

  test("no Expires header is null, not a guess", async () => {
    const { impl } = scripted([json({ ok: true })]);
    assert.equal((await getWeatherJsonWithExpiry("https://example.test/f", 500, impl)).expiresMs, null);
  });
});
