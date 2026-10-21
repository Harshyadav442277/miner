import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { lookupPlace, foldPlace } from "../src/places";
import { PLACE_ROWS } from "../src/places-data";
import { resolvePlace } from "../src/storm";
import { resetGeocodeCache, placeCredit } from "../src/weather-upstream";

const near = (hit: { latitude: number; longitude: number } | null, lat: number, lon: number) =>
  hit !== null && Math.abs(hit.latitude - lat) < 0.5 && Math.abs(hit.longitude - lon) < 0.5;

describe("built-in places table", () => {
  test("the generated table is populated and every row is on the globe", () => {
    assert.ok(PLACE_ROWS.length > 1000, `only ${PLACE_ROWS.length} rows`);
    for (const [name, , , iso2, lat, lon] of PLACE_ROWS) {
      assert.ok(name && /^[A-Z]{2}$/.test(iso2), name);
      assert.ok(Math.abs(lat) <= 90 && Math.abs(lon) <= 180, name);
    }
  });

  test("folds case, accents and spacing into one key", () => {
    assert.equal(foldPlace("  Reykjavík "), "reykjavik");
    assert.equal(foldPlace("Lagos , Nigeria"), "lagos,nigeria");
  });

  test("answers the cities routed questions ask about most", () => {
    assert.ok(near(lookupPlace("Chennai"), 13.08, 80.27));
    assert.ok(near(lookupPlace("lagos, nigeria"), 6.45, 3.39));
    assert.ok(near(lookupPlace("Houston, Texas"), 29.76, -95.37));
    assert.ok(near(lookupPlace("Tokyo, Japan"), 35.68, 139.69));
    assert.ok(near(lookupPlace("Reykjavik"), 64.15, -21.94));
    assert.ok(near(lookupPlace("Miami, FL"), 25.77, -80.19));
    assert.match(lookupPlace("Chennai")?.name ?? "", /Chennai, Tamil Nadu, India/);
  });

  test("a qualifier picks between places of one name", () => {
    assert.ok(near(lookupPlace("London"), 51.5, -0.12));
    assert.ok(near(lookupPlace("London, UK"), 51.5, -0.12));
    assert.ok(near(lookupPlace("London, Ontario"), 42.98, -81.24));
  });

  test("a qualifier the entry does not match is not answered, so Nominatim decides", () => {
    assert.equal(lookupPlace("Paris, Texas"), null);
    assert.equal(lookupPlace("Chennai, Kerala"), null);
  });

  test("a bare name shared with a comparable city is not answered", () => {
    // Valencia, Venezuela and Valencia, Spain are within 5x of each other.
    assert.equal(lookupPlace("Valencia"), null);
    assert.ok(near(lookupPlace("Valencia, Venezuela"), 10.16, -68.0));
  });

  test("unknown places and non-places are not answered", () => {
    assert.equal(lookupPlace("Gujranwala Cantonment"), null);
    assert.equal(lookupPlace("Strait of Malacca"), null);
    assert.equal(lookupPlace(""), null);
  });
});

describe("resolvePlace uses the table before the network", () => {
  test("a routed storm question for a table city makes no request", async () => {
    resetGeocodeCache();
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      throw new Error("no network in this test");
    }) as typeof fetch;
    try {
      const place = await resolvePlace(
        "Is there an active storm alert or severe weather warning for Lisbon, Portugal right now?",
        500,
      );
      assert.ok(near(place, 38.72, -9.14), JSON.stringify(place));
      assert.equal(calls, 0);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("a name the table does not know is not answered by a fragment of it", async () => {
    // "Strait of Malacca" is a sea; the city of Malacca is a different place.
    resetGeocodeCache();
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("[]", { status: 200 });
    }) as typeof fetch;
    try {
      // Null, or an outage once the one-per-second spacing runs out of budget; never the city.
      const place = await resolvePlace("What could be the possible temperature in Strait of Malacca", 3000).catch(() => null);
      assert.equal(place, null);
      assert.ok(calls > 0, "the geocoder, not the table, decides");
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("a qualified miss goes to the geocoder instead of a later bare candidate", async () => {
    resetGeocodeCache();
    const realFetch = globalThis.fetch;
    const asked: string[] = [];
    globalThis.fetch = (async (url: string | URL) => {
      asked.push(decodeURIComponent(String(url)));
      return new Response(JSON.stringify([{ lat: "33.66", lon: "-95.55", display_name: "Paris, Lamar County, Texas, United States" }]), {
        status: 200,
      });
    }) as typeof fetch;
    try {
      const place = await resolvePlace("Paris, Texas", 3000);
      assert.ok(near(place, 33.66, -95.55), JSON.stringify(place));
      assert.match(asked[0] ?? "", /nominatim/);
      // OpenStreetMap supplied it, so the answer credits OpenStreetMap; a table answer credits nobody.
      assert.equal(placeCredit(place!), "; place from © OpenStreetMap contributors (ODbL)");
      assert.equal(placeCredit(lookupPlace("Chennai")!), "");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
