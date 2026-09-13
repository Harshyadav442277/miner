import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getWeatherJson, geocodeFallback } from "../src/weather-upstream";

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

describe("geocodeFallback", () => {
  const nominatim = [
    { lat: "13.0836939", lon: "80.2701860", display_name: "Chennai Corporation, Chennai, Tamil Nadu, India" },
  ];

  test("resolves a place name to coordinates and a readable name", async () => {
    const { impl, calls } = scripted([json(nominatim)]);
    const hit = await geocodeFallback("Chennai", 500, impl);
    assert.ok(hit);
    assert.equal(hit.latitude, 13.0836939);
    assert.equal(hit.longitude, 80.270186);
    assert.equal(hit.name, "Chennai Corporation, Tamil Nadu, India");
    assert.match(calls[0] ?? "", /nominatim\.openstreetmap\.org/);
  });

  test("returns null rather than throwing when the fallback is also down", async () => {
    // The caller already has a primary failure to report; a second upstream
    // name in that refusal tells the buyer nothing they can act on.
    const { impl } = scripted([json({}, 503), json({}, 503)]);
    assert.equal(await geocodeFallback("Chennai", 500, impl), null);
  });

  test("returns null on an empty result set", async () => {
    const { impl } = scripted([json([])]);
    assert.equal(await geocodeFallback("nowhere at all", 500, impl), null);
  });

  test("refuses coordinates that are not on the globe", async () => {
    const { impl } = scripted([json([{ lat: "999", lon: "0", display_name: "Somewhere" }])]);
    assert.equal(await geocodeFallback("Somewhere", 500, impl), null);
  });

  test("keeps a short display name whole", async () => {
    const { impl } = scripted([json([{ lat: "1", lon: "2", display_name: "Tokyo, Japan" }])]);
    assert.equal((await geocodeFallback("Tokyo", 500, impl))?.name, "Tokyo, Japan");
  });
});
